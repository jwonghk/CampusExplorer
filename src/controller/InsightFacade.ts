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
import { parseFilter } from "../queryEngine/QueryParser";
import { executeQuery } from "../queryEngine/QueryExecutor";
import { processOptions } from "../queryEngine/QueryOptions";

const fs = require("fs-extra");
import * as path from "path";

const DATA_DIR = path.join(__dirname, "../../data");
const MAX_QUERY_SIZE = 5000;
// const TWO_SPACE_COUNT = 2;

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
		//console.log("current dir: " + __dirname);
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		this.checkConditionsForAdding(id, kind);

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

	public checkConditionsForAdding(id: string, kind: InsightDatasetKind): boolean {
		if (this.datasetNameIDList.includes(id)) {
			throw new InsightError("Data ID already exists, it cannot be added again");
		} else if (id.includes(" ") || id.includes("_") || id === "") {
			throw new InsightError("Data ID contains space(s), underscore(s), or is empty");
		} else if (kind === InsightDatasetKind.Rooms) {
			throw new InsightError("InsightDatasetKind being Room is not allowed yet in c1");
		} else {
			//console.log("Unique id added!");
			return true;
		}
	}

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

	public async removeDataset(id: string): Promise<string> {
		const filePath = "data/" + id + ".json";

		return new Promise<string>((resolve, reject) => {
			if (!id || id.includes("_") || id.includes(" ")) {
				return reject(new InsightError("Invalid dataset ID: it cannot be null, contain underscores, or spaces"));
			}
			if (!this.datasetNameIDList.includes(id)) {
				fs.unlink(filePath, (err: any) => {
					if (err) {
						return reject(new NotFoundError("Dataset file not found, unable to remove"));
					}
				});
				const index = this.datasetNameIDList.indexOf(id);
				if (index > -1) {
					delete this.datasetNameIDList[index];
				}
				this.dataIDmap.delete(id);
				return reject(new NotFoundError("Dataset with this ID was not added to the system yet"));
			}

			fs.unlink(filePath, (err: any) => {
				if (err) {
					return reject(new NotFoundError("Dataset file not found for removal"));
				}
				const index = this.datasetNameIDList.indexOf(id);
				if (index > -1) {
					this.datasetNameIDList.splice(index, 1);
				}
				this.dataIDmap.delete(id);
				resolve(id);
			});
		});
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		try {
			// Parse Query: parse the query and generate an AST
			const typedQuery = query as Query;
			const ast = parseFilter(typedQuery.WHERE);

			// Check Query Options: ensure that the query options are valid
			if (!typedQuery.OPTIONS?.COLUMNS?.length) {
				throw new InsightError("OPTIONS.COLUMNS must contain at least one key");
			}
			const firstColumnKey = typedQuery.OPTIONS.COLUMNS[0];
			const datasetId = firstColumnKey.split("_")[0];

			// Load Dataset: load the dataset from disk
			const datasetInfo = await this.loadDataset(datasetId);
			const dataset = datasetInfo.listOfSections;

			// Execute Query: process the query and return the results
			let records: any[];
			if (ast === null) {
				records = dataset;
			} else {
				records = await executeQuery(ast, dataset);
			}

			// Process Query Options: apply options to the query results
			const results = processOptions(records, typedQuery.OPTIONS);

			// Check Result Size: ensure that the result size does not exceed 5000
			if (results.length > MAX_QUERY_SIZE) {
				throw new ResultTooLargeError("Query results exceed 5000 entries");
			}

			// Return Query Result: return processed results
			// console.log("Query results:", JSON.stringify(results, null, TWO_SPACE_COUNT));
			return results;
		} catch (error: any) {
			if (error instanceof ResultTooLargeError) {
				throw error;
			}
			throw new InsightError(error.message);
		}
	}

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

	public async listDatasets(): Promise<InsightDataset[]> {
		return await this.resolveListofData();
	}

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
