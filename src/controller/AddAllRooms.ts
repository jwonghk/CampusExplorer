import { InsightError } from "./IInsightFacade";
import InsightFacade from "./InsightFacade";
import JSZip from "jszip";
import * as parse5 from "parse5";
import InfoForRooms from "./InfoForRooms";
import * as http from "http";

interface RoomDetailRefs {
	roomNumberRef: (value: string) => void;
	roomHrefRef: (value: string) => void;
	roomSeatsRef: (value: number) => void;
	roomFurnitureRef: (value: string) => void;
	roomTypeRef: (value: string) => void;
}

export class AddAllRooms {
	private insightFacade: InsightFacade;

	constructor(insightFacade: InsightFacade) {
		this.insightFacade = insightFacade;
	}

	// Unzips the provided content and parses the index file to process all rooms.
	public async AddAllRooms(id: string, content: string): Promise<void> {
		const zip = new JSZip();
		let loadedZip: JSZip;

		try {
			loadedZip = await zip.loadAsync(content, { base64: true });
		} catch (err) {
			throw new InsightError("Error loading zip file: " + err);
		}

		const indexFile = loadedZip.file("index.htm");
		if (!indexFile) {
			throw new InsightError("index.htm not found");
		}

		let indexContent: string;
		try {
			indexContent = await indexFile.async("text");
		} catch (err) {
			throw new InsightError("Error reading index.htm: " + err);
		}

		let rooms: any[];
		try {
			rooms = await this.processIndexFile(loadedZip, indexContent);
		} catch (err: any) {
			throw new InsightError("Error processing rooms: " + err.message);
		}

		if (rooms.length === 0) {
			throw new InsightError("No valid rooms were added!");
		}
		const roomsData = new InfoForRooms(id, rooms);
		this.insightFacade.dataIDmap.set(id, roomsData);
		this.insightFacade.datasetNameIDList.push(id);
	}

	// Parses the index file to find building entries, processes each building for room details.
	private async processIndexFile(loadedZip: JSZip, indexContent: string): Promise<any[]> {
		const indexDoc = parse5.parse(indexContent);
		const buildingEntries = this.findBuildingEntries(indexDoc);

		if (!buildingEntries || buildingEntries.length === 0) {
			throw new InsightError("No valid building entries found");
		}

		const roomPromises = buildingEntries.map(async (entry) => await this.processBuildingEntry(loadedZip, entry));
		const roomsArrays = await Promise.all(roomPromises);
		return roomsArrays.flat();
	}

	// Locates and returns all building entries in the HTML document.
	private findBuildingEntries(document: any): any[] {
		const tbody = this.findNode(document, "tbody");
		if (!tbody) {
			throw new InsightError("Building table body not found");
		}

		const buildingEntries: any[] = [];
		const rows = this.findAllChildNodes(tbody, "tr");

		for (const row of rows) {
			const buildingInfo = this.extractBuildingInfo(row);
			if (buildingInfo) {
				buildingEntries.push(buildingInfo);
			}
		}
		return buildingEntries;
	}

	// Extracts and returns building information (name, address, link) from a table row.
	private extractBuildingInfo(row: any): any | null {
		const cells = this.findAllChildNodes(row, "td");
		let shortName = "";
		let fullName = "";
		let address = "";
		let link = "";

		for (const cell of cells) {
			if (this.hasClass(cell, "views-field-field-building-code")) {
				shortName = this.getTextFromNode(cell).trim();
			} else if (this.hasClass(cell, "views-field-title")) {
				fullName = this.getTextFromNode(cell).trim();
				const linkNode = this.findNode(cell, "a");
				const hrefAttr = linkNode?.attrs?.find((attr: any) => attr.name === "href");
				if (hrefAttr) {
					link = hrefAttr.value.replace("./", "");
				}
			} else if (this.hasClass(cell, "views-field-field-building-address")) {
				address = this.getTextFromNode(cell).trim();
			}
		}

		if (shortName && fullName && address && link) {
			return { shortName, fullName, address, link };
		}
		return null;
	}

	// Processes a building entry by extracting rooms and fetching geolocation data.
	private async processBuildingEntry(loadedZip: JSZip, entry: any): Promise<any[]> {
		const buildingFile = loadedZip.file(entry.link);
		if (!buildingFile) {
			return []; // Skip buildings without valid files
		}
		const content = await buildingFile.async("text");
		const document = parse5.parse(content);
		const rooms = this.extractRooms(document, entry);

		// Fetch geolocation for the building
		try {
			const geoResponse = await this.fetchGeolocation(entry.address, "213");
			if (geoResponse.lat === null || geoResponse.lon === null) {
				throw new InsightError(`Incomplete geolocation data for address: ${entry.address}`);
			}

			rooms.forEach((room) => {
				room.lat = geoResponse.lat;
				room.lon = geoResponse.lon;
			});
		} catch (err) {
			throw new InsightError(`Error fetching geolocation for address ${entry.address}: ${err}`);
		}

		return rooms;
	}

	// Extracts room details from the document and returns an array of rooms.
	private extractRooms(document: any, buildingInfo: any): any[] {
		const tbody = this.findNode(document, "tbody");
		if (!tbody) {
			return [];
		}
		const rooms: any[] = [];
		const rows = this.findAllChildNodes(tbody, "tr");

		for (const row of rows) {
			const room = this.extractRoomInfo(row, buildingInfo);
			if (room) {
				rooms.push(room);
			}
		}
		return rooms;
	}

	// Extracts specific room information from a table row, including number, seats, and type.
	private extractRoomInfo(row: any, buildingInfo: any): any | null {
		const cells = this.findAllChildNodes(row, "td");
		let roomNumber = "";
		let roomSeats = 0;
		let roomFurniture = "";
		let roomType = "";
		let roomHref = "";

		for (const cell of cells) {
			this.extractRoomDetails(cell, {
				roomNumberRef: (value: string) => (roomNumber = value),
				roomHrefRef: (value: string) => (roomHref = value),
				roomSeatsRef: (value: number) => (roomSeats = value),
				roomFurnitureRef: (value: string) => (roomFurniture = value),
				roomTypeRef: (value: string) => (roomType = value),
			});
		}

		if (roomNumber && !isNaN(roomSeats) && roomFurniture) {
			// Provide default value for roomType if missing
			if (!roomType) {
				roomType = "Unknown";
			}
			return {
				fullname: buildingInfo.fullName,
				shortname: buildingInfo.shortName,
				address: buildingInfo.address,
				name: buildingInfo.shortName + "_" + roomNumber,
				number: roomNumber,
				seats: roomSeats,
				type: roomType,
				furniture: roomFurniture,
				href: roomHref,
			};
		} else {
			return null;
		}
	}

	// Extracts room details from a table cell and populates references for room attributes.
	private extractRoomDetails(cell: any, refs: RoomDetailRefs): void {
		if (this.hasClass(cell, "views-field-field-room-number")) {
			const linkNode = this.findNode(cell, "a");
			if (linkNode) {
				const roomNumber = this.getTextFromNode(linkNode).trim();
				refs.roomNumberRef(roomNumber);
				const hrefAttr = linkNode.attrs?.find((attr: any) => attr.name === "href");
				if (hrefAttr) {
					refs.roomHrefRef(hrefAttr.value);
				}
			}
		} else if (this.hasClass(cell, "views-field-field-room-capacity")) {
			const seatsText = this.getTextFromNode(cell).trim();
			const roomSeats = parseInt(seatsText, 10);
			refs.roomSeatsRef(roomSeats);
		} else if (this.hasClass(cell, "views-field-field-room-furniture")) {
			const roomFurniture = this.getTextFromNode(cell).trim();
			refs.roomFurnitureRef(roomFurniture);
		} else if (this.hasClass(cell, "views-field-field-room-type")) {
			const roomType = this.getTextFromNode(cell).trim();
			refs.roomTypeRef(roomType);
		}
	}

	// Recursively searches for and returns the first child node with the specified name.
	private findNode(node: any, nodeName: string): any | null {
		if (node.nodeName === nodeName) {
			return node;
		}
		if (!node.childNodes) {
			return null;
		}
		for (const child of node.childNodes) {
			const found = this.findNode(child, nodeName);
			if (found) {
				return found;
			}
		}
		return null;
	}

	// Recursively finds and returns all child nodes with the specified name.
	private findAllChildNodes(node: any, nodeName: string): any[] {
		const result: any[] = [];
		if (!node.childNodes) {
			return result;
		}
		for (const child of node.childNodes) {
			if (child.nodeName === nodeName) {
				result.push(child);
			} else {
				result.push(...this.findAllChildNodes(child, nodeName));
			}
		}
		return result;
	}

	// Checks if a node contains a specified class name.
	private hasClass(node: any, className: string): boolean {
		const classAttr = node.attrs?.find((attr: any) => attr.name === "class");
		if (classAttr) {
			const classes = classAttr.value.split(" ");
			return classes.includes(className);
		}
		return false;
	}

	// Extracts and returns all text content from a node and its children.
	private getTextFromNode(node: any): string {
		let text = "";
		if (node.nodeName === "#text") {
			text += node.value;
		}
		if (node.childNodes) {
			for (const child of node.childNodes) {
				text += this.getTextFromNode(child);
			}
		}
		return text;
	}

	private async fetchGeolocation(
		address: string,
		teamNumber: string
	): Promise<{ lat?: number; lon?: number; error?: string }> {
		const encodedAddress = encodeURIComponent(address);
		const url = `http://cs310.students.cs.ubc.ca:11316/api/v1/project_team${teamNumber}/${encodedAddress}`;

		return new Promise((resolve: any, reject: any) => {
			http
				.get(url, (response) => {
					let data = "";
					response.on("data", (chunk) => (data += chunk));
					response.on("end", () => resolve(JSON.parse(data)));
				})
				.on("error", (err) => reject(new Error(`Failed to fetch geolocation: ${err.message}`)));
		});
	}
}
