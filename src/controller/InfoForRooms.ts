import { InsightDataset, InsightDatasetKind } from "./IInsightFacade";

export class Room {
	public readonly fullname: string; // Full name of the building
	public readonly shortname: string; // Short name or code for the building
	public readonly address: string; // Address of the building
	public readonly name: string; // Unique identifier for the room, combining building code and room number
	public readonly number: string; // Room number within the building
	public readonly seats: number; // Number of seats available in the room
	public readonly type: string; // Type of room (e.g., classroom, lab)
	public readonly furniture: string; // Type of furniture available in the room
	public readonly href: string; // Relative URL link to the room's webpage
	public readonly lat: number; // Latitude for the room's location
	public readonly lon: number; // Longitude for the room's location

	// Constructor to initialize all properties of Room from a roomData object
	constructor(roomData: any) {
		this.fullname = roomData.fullname;
		this.shortname = roomData.shortname;
		this.address = roomData.address;
		this.name = roomData.name;
		this.number = roomData.number;
		this.seats = roomData.seats;
		this.type = roomData.type;
		this.furniture = roomData.furniture;
		this.href = roomData.href;
		this.lat = roomData.lat;
		this.lon = roomData.lon;
	}
}

export default class InfoForRooms {
	public idOfZipDatafile: string; // Identifier for the dataset (usually the zip file ID)
	public listOfRooms: Room[]; // Array of Room objects for each room in the dataset
	public insightDataset: InsightDataset; // Metadata about the dataset including ID, row count, and dataset kind

	// Constructor to initialize InfoForRooms with the dataset ID and an array of room data
	constructor(id: string, roomsArray: any[]) {
		this.idOfZipDatafile = id;
		this.listOfRooms = roomsArray.map((roomData) => new Room(roomData));
		this.insightDataset = {
			id: id,
			numRows: this.listOfRooms.length,
			kind: InsightDatasetKind.Rooms,
		};
	}
}
