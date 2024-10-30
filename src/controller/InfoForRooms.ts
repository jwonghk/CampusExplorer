import { InsightDataset, InsightDatasetKind } from "./IInsightFacade";

export class Room {
	public readonly fullname: string;
	public readonly shortname: string;
	public readonly address: string;
	public readonly name: string;
	public readonly number: string;
	public readonly seats: number;
	public readonly type: string;
	public readonly furniture: string;
	public readonly href: string;
	public readonly lat: number;
	public readonly lon: number;

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
	public idOfZipDatafile: string;
	public listOfRooms: Room[];
	public insightDataset: InsightDataset;

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
