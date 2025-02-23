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

	// Constructor to initialize AddAllRooms with a reference to InsightFacade
	constructor(insightFacade: InsightFacade) {
		this.insightFacade = insightFacade;
	}

	// Main method to add all rooms from a zip file given an ID and base64 content
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

	// Processes the index file and extracts room data for each building
	private async processIndexFile(loadedZip: JSZip, indexContent: string): Promise<any[]> {
		const indexDoc = parse5.parse(indexContent);
		const buildingTable = this.findBuildingTable(indexDoc);
		if (!buildingTable) {
			throw new InsightError("No valid building table found");
		}

		const buildingEntries = this.extractBuildingEntries(buildingTable);
		if (!buildingEntries || buildingEntries.length === 0) {
			throw new InsightError("No valid building entries found");
		}

		const roomPromises = buildingEntries.map(async (entry) => await this.processBuildingEntry(loadedZip, entry));
		const roomsArrays = await Promise.all(roomPromises);
		return roomsArrays.flat();
	}

	// Searches for and returns the table containing building information
	private findBuildingTable(document: any): any | null {
		const tables = this.findAllChildNodes(document, "table");
		for (const table of tables) {
			const tds = this.findAllChildNodes(table, "td");
			for (const td of tds) {
				if (this.hasClass(td, "views-field-field-building-code")) {
					return table;
				}
			}
		}
		return null;
	}

	// Extracts building entries from the provided building table
	private extractBuildingEntries(table: any): any[] {
		const tbody = this.findNode(table, "tbody");
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

	// Extracts building information (name, address, link) from a row in the building table
	private extractBuildingInfo(row: any): any | null {
		const cells = this.findAllChildNodes(row, "td");
		let shortName = "",
			fullName = "",
			address = "",
			link = "";

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

	// Processes individual building entry to extract rooms and adds geolocation information
	private async processBuildingEntry(loadedZip: JSZip, entry: any): Promise<any[]> {
		const buildingFile = loadedZip.file(entry.link);
		if (!buildingFile) {
			return [];
		}
		const content = await buildingFile.async("text");
		const document = parse5.parse(content);
		const rooms = this.extractRooms(document, entry);

		try {
			const geoResponse = await this.fetchGeolocation(entry.address, "213");
			if (geoResponse.lat === undefined || geoResponse.lon === undefined) {
				return [];
			}
			rooms.forEach((room) => {
				room.lat = geoResponse.lat;
				room.lon = geoResponse.lon;
			});
		} catch (_err) {
			return [];
		}
		return rooms;
	}

	// Extracts rooms from the parsed HTML document for a given building
	private extractRooms(document: any, buildingInfo: any): any[] {
		const roomTable = this.findRoomTable(document);
		if (!roomTable) {
			return [];
		}

		const tbody = this.findNode(roomTable, "tbody");
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

	// Searches for and returns the table containing room details
	private findRoomTable(document: any): any | null {
		const tables = this.findAllChildNodes(document, "table");
		for (const table of tables) {
			const tds = this.findAllChildNodes(table, "td");
			for (const td of tds) {
				if (this.hasClass(td, "views-field-field-room-number")) {
					return table;
				}
			}
		}
		return null;
	}

	// Extracts individual room information such as number, seats, furniture, type, and link
	private extractRoomInfo(row: any, buildingInfo: any): any | null {
		const cells = this.findAllChildNodes(row, "td");
		let roomNumber = "",
			roomSeats = 0,
			roomFurniture = "",
			roomType = "",
			roomHref = "";

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
		}
		return null;
	}

	// Extracts specific room details such as number, seats, furniture, and type from each cell
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

	// Searches for a node with a given nodeName, returns the first matching node
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

	// Recursively finds and returns all child nodes with the specified node name
	private findAllChildNodes(node: any, nodeName: string): any[] {
		const result: any[] = [];
		if (node.nodeName === nodeName) {
			result.push(node);
		}
		if (node.childNodes) {
			for (const child of node.childNodes) {
				result.push(...this.findAllChildNodes(child, nodeName));
			}
		}
		return result;
	}

	// Checks if the given node has a specific class name
	private hasClass(node: any, className: string): boolean {
		const classAttr = node.attrs?.find((attr: any) => attr.name === "class");
		if (classAttr) {
			const classes = classAttr.value.split(" ");
			return classes.includes(className);
		}
		return false;
	}

	// Recursively extracts text content from a node
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

	// Fetches geolocation data for a given address using an external API
	private async fetchGeolocation(
		address: string,
		teamNumber: string
	): Promise<{ lat?: number; lon?: number; error?: string }> {
		const url = `http://cs310.students.cs.ubc.ca:11316/api/v1/project_team${teamNumber}/${encodeURIComponent(address)}`;

		return new Promise((resolve, reject) => {
			http
				.get(url, (response) => {
					let data = "";
					response
						.on("data", (chunk) => (data += chunk))
						.on("end", () => {
							try {
								const geoResponse = JSON.parse(data);
								if (geoResponse.error) {
									reject(new Error(geoResponse.error));
								} else {
									resolve(geoResponse);
								}
							} catch (err) {
								reject(new Error(`Failed to parse geolocation response: ${err}`));
							}
						});
				})
				.on("error", (err) => reject(new Error(`Failed to fetch geolocation: ${err.message}`)));
		});
	}
}
