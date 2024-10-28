// InsightFacade.ts

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
import { Section } from "./InforForCourses";
import { AddAllCourses } from "./AddAllCourses";
import { validateQueryStructure } from "../queryEngine/QueryValidator";
import { parseQuery } from "../queryEngine/QueryParser";
import { executeQuery } from "../queryEngine/QueryExecutor";

const fs = require("fs-extra");
import * as path from "path";

const DATA_DIR = path.join(__dirname, "../../data");
const MAX_QUERY_SIZE = 5000;

export default class InsightFacade implements IInsightFacade {
	public datasetNameIDList: string[];
	public dataIDmap: Map<string, InforForCourses>;

	constructor() {
		this.dataIDmap = new Map<string, InforForCourses>();
		this.datasetNameIDList = [];
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		await this.checkConditionsForAdding(id, kind);

		try {
			const dataDir = "data";
			await fs.ensureDir(dataDir);

			const courses = new AddAllCourses(this);
			await courses.AddAllCourse(id, content);

			const jsonFormat = JSON.stringify(this.dataIDmap.get(id));
			await this.writeToPersistent(id, jsonFormat);
			return this.datasetNameIDList;
		} catch (error: any) {
			throw new InsightError("Error while adding dataset: " + error.message);
		}
	}

	public async checkConditionsForAdding(id: string, kind: InsightDatasetKind): Promise<void> {
		if (id.includes(" ") || id.includes("_") || id.trim() === "") {
			throw new InsightError("Data ID contains space(s), underscore(s), or is empty");
		} else if (kind === InsightDatasetKind.Rooms) {
			throw new InsightError("InsightDatasetKind 'Rooms' is not supported yet");
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
			const dataset = datasetInfo.listOfSections;

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

	private async readDatasetFromDisk(id: string): Promise<InforForCourses> {
		try {
			const filePath = path.join(DATA_DIR, `${id}.json`);
			if (!(await fs.pathExists(filePath))) {
				throw new InsightError(`Dataset ${id} not found`);
			}

			const content = await fs.readFile(filePath, "utf8");
			const parsedData = JSON.parse(content);

			if (!parsedData || !Array.isArray(parsedData.listOfSections)) {
				throw new InsightError(`Dataset ${id} is malformed`);
			}

			const inforForCourses = new InforForCourses(id, []);
			function mapSections(sectionsData: any[]): Section[] {
				return sectionsData.map((sectionData) => new Section(sectionData));
			}

			inforForCourses.listOfSections = mapSections(parsedData.listOfSections);
			inforForCourses.insightDataset = parsedData.insightDataset;

			return inforForCourses;
		} catch (err: any) {
			throw err instanceof SyntaxError
				? new InsightError(`Dataset ${id} is not valid JSON`)
				: new InsightError(`Error reading dataset ${id}: ${err.message}`);
		}
	}

	private async loadDataset(id: string): Promise<InforForCourses> {
		if (this.dataIDmap.has(id)) {
			return this.dataIDmap.get(id)!;
		} else {
			const inforForCourses = await this.readDatasetFromDisk(id);
			this.dataIDmap.set(id, inforForCourses);
			return inforForCourses;
		}
	}
}
