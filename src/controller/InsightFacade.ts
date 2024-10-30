import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "./IInsightFacade";
import InforForCourses from "./InforForCourses";
import InfoForRooms, { Room } from "./InfoForRooms";
import { Section } from "./InforForCourses";
import { AddAllCourses } from "./AddAllCourses";
import { AddAllRooms } from "./AddAllRooms";
import { validateQueryStructure } from "../queryEngine/QueryValidator";
import { parseQuery } from "../queryEngine/QueryParser";
import { executeQuery } from "../queryEngine/QueryExecutor";

import * as fs from "fs-extra";
import * as path from "path";

const DATA_DIR = path.join(__dirname, "../../data");
const MAX_QUERY_SIZE = 5000;

export default class InsightFacade implements IInsightFacade {
	public datasetNameIDList: string[];
	public dataIDmap: Map<string, InforForCourses | InfoForRooms>;

	constructor() {
		this.dataIDmap = new Map<string, InforForCourses | InfoForRooms>();
		this.datasetNameIDList = [];
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		await this.checkConditionsForAdding(id);

		try {
			const dataDir = "data";
			await fs.ensureDir(dataDir);

			if (kind === InsightDatasetKind.Sections) {
				const courses = new AddAllCourses(this);
				await courses.AddAllCourse(id, content);
			} else if (kind === InsightDatasetKind.Rooms) {
				const rooms = new AddAllRooms(this);
				await rooms.AddAllRooms(id, content);
			} else {
				throw new InsightError(`Unsupported dataset kind: ${kind}`);
			}

			const jsonFormat = JSON.stringify(this.dataIDmap.get(id));
			await this.writeToPersistent(id, jsonFormat);
			return this.datasetNameIDList;
		} catch (error: any) {
			throw new InsightError("Error while adding dataset: " + error.message);
		}
	}

	public async checkConditionsForAdding(id: string): Promise<void> {
		if (id.includes(" ") || id.includes("_") || id.trim() === "") {
			throw new InsightError("Data ID contains space(s), underscore(s), or is empty");
		}

		const filePath = path.join(DATA_DIR, `${id}.json`);
		const exists = await fs.pathExists(filePath);
		if (exists || this.datasetNameIDList.includes(id)) {
			throw new InsightError("Data ID already exists");
		}
	}

	private async writeToPersistent(id: string, jsonData: string): Promise<void> {
		try {
			const filePath = path.join(DATA_DIR, id + ".json");
			await fs.writeFile(filePath, jsonData);
		} catch (err: any) {
			throw new InsightError("Error writing dataset to disk: " + err.message);
		}
	}

	public async removeDataset(id: string): Promise<string> {
		if (!id || id.includes("_") || id.trim() === "") {
			throw new InsightError("Invalid dataset ID");
		}

		const filePath = path.join(DATA_DIR, `${id}.json`);

		const exists = await fs.pathExists(filePath);
		if (!exists) {
			throw new NotFoundError(`Dataset with id ${id} not found`);
		}

		try {
			await fs.remove(filePath);
			this.dataIDmap.delete(id);
			const index = this.datasetNameIDList.indexOf(id);
			if (index > -1) {
				this.datasetNameIDList.splice(index, 1);
			}
			return id;
		} catch (err: any) {
			throw new InsightError(`Failed to remove dataset: ${err.message}`);
		}
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		try {
			if (typeof query !== "object" || query === null || Array.isArray(query)) {
				throw new InsightError("Query must be a non-null object");
			}

			validateQueryStructure(query);
			const queryAST = parseQuery(query);

			const datasetIds = queryAST.datasetIds;
			if (datasetIds.size !== 1) {
				throw new InsightError("Query must reference exactly one dataset");
			}

			const datasetId = Array.from(datasetIds)[0];
			const datasetInfo = await this.loadDataset(datasetId);

			let dataset: any[];
			if (datasetInfo instanceof InforForCourses) {
				dataset = datasetInfo.listOfSections;
			} else if (datasetInfo instanceof InfoForRooms) {
				dataset = datasetInfo.listOfRooms;
			} else {
				throw new InsightError("Unknown dataset type");
			}

			const results = await executeQuery(queryAST, dataset);

			if (results.length > MAX_QUERY_SIZE) {
				throw new ResultTooLargeError("Query results exceed 5000 entries");
			}

			return results;
		} catch (err: any) {
			if (err instanceof ResultTooLargeError) {
				throw err;
			}
			throw new InsightError(err.message);
		}
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		const datasets: InsightDataset[] = [];

		try {
			const exists = await fs.pathExists(DATA_DIR);
			if (exists) {
				const files: string[] = await fs.readdir(DATA_DIR);

				const readPromises = files
					.filter((file: string) => file.endsWith(".json"))
					.map(async (file: string) => {
						const filePath = path.join(DATA_DIR, file);
						try {
							const content = await fs.readFile(filePath, "utf8");
							const parsedData = JSON.parse(content);
							if (parsedData?.insightDataset) {
								datasets.push(parsedData.insightDataset);
							} else {
								throw new InsightError(`Invalid dataset format in file: ${file}`);
							}
						} catch (err: any) {
							throw new InsightError(`Failed to list dataset: ${err.message}`);
						}
					});
				await Promise.all(readPromises);
			}
		} catch (err: any) {
			throw new InsightError(`Failed to access data directory: ${err.message}`);
		}

		return datasets;
	}

	// Start ChatGPT
	private async readDatasetFromDisk(id: string): Promise<InforForCourses | InfoForRooms> {
		try {
			const filePath = path.join(DATA_DIR, `${id}.json`);
			if (!(await fs.pathExists(filePath))) {
				throw new InsightError(`Dataset ${id} not found`);
			}

			const content = await fs.readFile(filePath, "utf8");
			const parsedData = JSON.parse(content);

			if (!parsedData?.insightDataset) {
				throw new InsightError(`Dataset ${id} is malformed`);
			}

			if (parsedData.insightDataset.kind === InsightDatasetKind.Sections) {
				const inforForCourses = new InforForCourses(id, []);
				parsedData.listOfSections.forEach((sectionData: any) => {
					inforForCourses.listOfSections.push(new Section(sectionData));
				});
				inforForCourses.insightDataset = parsedData.insightDataset;
				return inforForCourses;
			} else if (parsedData.insightDataset.kind === InsightDatasetKind.Rooms) {
				const infoForRooms = new InfoForRooms(id, []);
				parsedData.listOfRooms.forEach((roomData: any) => {
					infoForRooms.listOfRooms.push(new Room(roomData));
				});
				infoForRooms.insightDataset = parsedData.insightDataset;
				return infoForRooms;
			} else {
				throw new InsightError(`Unknown dataset kind for dataset ${id}`);
			}
		} catch (err: any) {
			throw err instanceof SyntaxError
				? new InsightError(`Dataset ${id} is not valid JSON`)
				: new InsightError(`Error reading dataset ${id}: ${err.message}`);
		}
	}
	// End ChatGPT

	private async loadDataset(id: string): Promise<InforForCourses | InfoForRooms> {
		if (this.dataIDmap.has(id)) {
			return this.dataIDmap.get(id)!;
		} else {
			const datasetInfo = await this.readDatasetFromDisk(id);
			this.dataIDmap.set(id, datasetInfo);
			return datasetInfo;
		}
	}
}
