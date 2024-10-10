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
import { Query } from "../queryEngine/QueryInterfaces";
import { extractDatasetIds, validateQueryStructure } from "../queryEngine/QueryValidator";
import { parseFilter } from "../queryEngine/QueryParser";
import { executeQuery } from "../queryEngine/QueryExecutor";
import { processOptions } from "../queryEngine/QueryOptions";

const fs = require("fs-extra");
import * as path from "path";

const DATA_DIR = path.join(__dirname, "../../data");
const MAX_QUERY_SIZE = 5000;

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	public datasetNameIDList: string[];
	public dataIDmap: Map<string, InforForCourses>;

	constructor() {
		this.dataIDmap = new Map<string, InforForCourses>();
		this.datasetNameIDList = [];
	}

	// Add a dataset by extracting courses from a ZIP file
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

	// Check if conditions are met to add the dataset (valid ID, dataset doesn't already exist)
	public async checkConditionsForAdding(id: string, kind: InsightDatasetKind): Promise<void> {
		if (id.includes(" ") || id.includes("_") || id.trim() === "") {
			throw new InsightError("Data ID contains space(s), underscore(s), or is empty");
		} else if (kind === InsightDatasetKind.Rooms) {
			throw new InsightError("InsightDatasetKind being Room is not allowed yet in c1");
		}

		const filePath = path.join(DATA_DIR, `${id}.json`);
		const exists = await fs.pathExists(filePath);
		if (exists || this.datasetNameIDList.includes(id)) {
			throw new InsightError("Data ID already exists, it cannot be added again");
		}
	}

	// Write dataset information to persistent storage
	private async writeToPersistent(id: string, jsonData: string): Promise<void> {
		try {
			const dataDir = "data";
			await fs.ensureDir(dataDir);

			const filePath = path.join(dataDir, id + ".json");
			await fs.writeFile(filePath, jsonData);
		} catch (err: any) {
			throw new InsightError("Error writing dataset to disk: " + err.message);
		}
	}

	// Remove a dataset from the system and disk
	public async removeDataset(id: string): Promise<string> {
		if (!id || id.includes("_") || id.trim() === "") {
			throw new InsightError("Invalid dataset ID: it cannot be null, contain underscores, or only whitespace");
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

	// Perform a query on a dataset based on the provided filter and options
	public async performQuery(query: unknown): Promise<InsightResult[]> {
		try {
			if (typeof query !== "object" || query === null || Array.isArray(query)) {
				throw new InsightError("Query must be a non-null object");
			}

			validateQueryStructure(query);
			const typedQuery = query as Query;

			const datasetIds = extractDatasetIds(typedQuery);
			if (datasetIds.size !== 1) {
				throw new InsightError("Query must reference exactly one dataset");
			}

			let datasetId = datasetIds.values().next().value;
			const ast = parseFilter(typedQuery.WHERE);

			if (!typedQuery.OPTIONS?.COLUMNS?.length) {
				throw new InsightError("OPTIONS.COLUMNS must contain at least one key");
			}

			const firstColumnKey = typedQuery.OPTIONS.COLUMNS[0];
			datasetId = firstColumnKey.split("_")[0];

			const datasetInfo = await this.loadDataset(datasetId);
			const dataset = datasetInfo.listOfSections;

			const records = ast === null ? dataset : await executeQuery(ast, dataset);
			const results = processOptions(records, typedQuery.OPTIONS);

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

	// Return a list of all datasets in the system
	public async resolveListofData(): Promise<InsightDataset[]> {
		const insightDatasetArray: InsightDataset[] = [];
		const storingKey: string[] = [];
		for (const [key, value] of this.dataIDmap.entries()) {
			if (value.insightDataset) {
				insightDatasetArray.push(value.insightDataset);
				storingKey.push(key);
			}
		}
		return insightDatasetArray;
	}

	// List all datasets by reading them from disk if necessary
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

	// Read a dataset from disk and return it as an InforForCourses instance
	private async readDatasetFromDisk(id: string): Promise<InforForCourses> {
		try {
			// Start ChatGPT
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
			inforForCourses.listOfSections = parsedData.listOfSections.map(
				(sectionData: any) =>
					new Section(
						sectionData.uuid,
						sectionData.id,
						sectionData.title,
						sectionData.instructor,
						sectionData.dept,
						sectionData.year,
						sectionData.avg,
						sectionData.pass,
						sectionData.fail,
						sectionData.audit
					)
			);
			inforForCourses.insightDataset = parsedData.insightDataset;

			return inforForCourses;
		} catch (err: any) {
			throw err instanceof SyntaxError
				? new InsightError(`Dataset ${id} is not valid JSON`)
				: new InsightError(`Error reading dataset ${id}: ${err.message}`);
		}
		// End ChatGPT
	}

	// Load a dataset from memory if available, or from disk otherwise
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
