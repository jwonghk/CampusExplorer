import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "./IInsightFacade";
import {InforForCourses, Section} from "./InforForCourses";
import { AddAllCourses } from "./AddAllCourses";
import { Query } from "../queryEngine/QueryInterfaces";
import { parseFilter } from "../queryEngine/QueryParser";
import { executeQuery } from "../queryEngine/QueryExecutor";

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
			throw new InsightError("Data ID already exists, cannot add again.");
		} else if (id.includes(" ") || id.includes("_") || id === "") {
			throw new InsightError("Data ID contains space, underscore or empty");
		} else if (kind === InsightDatasetKind.Rooms) {
			throw new InsightError("InsightDatasetKind being Room is not allowed yet in c1!");
		} else {
			//console.log("Unique id added!");
			return true;
		}
	}

	private async writeToPersistent(id: string, jsonData: string): Promise<void> {
		try {
			const dataDir = "data";
			// Ensure the 'data' directory exists
			await fs.ensureDir(dataDir);
			// Construct the full file path
			const filePath = path.join(dataDir, id + ".json");
			// Write the file
			await fs.writeFile(filePath, jsonData);
		} catch (err: any) {
			throw new InsightError("Error writing dataset to disk: " + err.message);
		}
	}

	public async removeDataset(id: string): Promise<string> {
		// TODO: Remove this once you implement the methods!

		const filePath = "data/" + id + ".json";
		let storingResult: string[];
		//console.log("Inside removeDataset");
		return new Promise<string>((RemoveResolve, RemoveRej) => {
			if (!id || id.includes("_") || id.includes(" ")) {
				//console.log("Inside _ and space within removeDataset");
				return RemoveRej(new InsightError("Id null or ID including _ or space!"));
			} else if (!this.datasetNameIDList.includes(id)) {
				fs.unlink(filePath, (err: any, result: any) => {
					//console.log("Get inside fs.unlink!" + result);
					if (err) {
						return RemoveRej(new NotFoundError("Not in folder yet!"));
					} else {
						storingResult.push(result);
					}
				});
				const filePosition = this.datasetNameIDList.indexOf(id);
				delete this.datasetNameIDList[filePosition];
				this.dataIDmap.delete(id);
				return RemoveRej(new NotFoundError("Not yet added!"));
			}

			fs.unlink(filePath, (err: any) => {
				//console.log("Inside second fs.unlink");
				if (err) {
					//console.log("Not yet!");
					return RemoveRej(new NotFoundError("Not in folder!"));
				}
				const positionInList = this.datasetNameIDList.indexOf(id);
				//console.log("Position in list: " + positionInList);
				if (positionInList > -1) {
					this.datasetNameIDList.splice(positionInList, 1);
				}

				const index = this.datasetNameIDList.indexOf(id);
				delete this.datasetNameIDList[index];
				this.dataIDmap.delete(id);
				RemoveResolve(id);
			});

			//throw new Error(`InsightFacadeImpl::removeDataset() is unimplemented! - id=${id};`);
		});
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		try {
			/*
			TODO: Validate Query
			Check that query is in the correct structure and syntax.
			- Query is an object and not null
			- Query contains two top level keys, WHERE and OPTIONS
			- Check that WHERE clause is valid and not null
			- Check that COLUMN contains a valid COLUMN array and optionally a valid ORDER

			Inputs: query:any
			Returns: boolean
			*/

			/*
			Parse Query into AST Structure:
			Converts the WHERE clauses into an Abstract Syntax Tree (AST) structure using recursion.
			- Process LogicNode: AND, OR
			- Process ComparisonNode: LT, GT, EQ, IS
			- Process NotNode: NOT
			- Process empty filters

			Inputs: Query.WHERE
			Returns: ast:ASTNode
			*/

			const typedQuery = query as Query;
			const ast = parseFilter(typedQuery.WHERE);

			/*
			TODO: Validate Query Semantics
			Check that query is semantically valid and references an existing dataset.
			- Check that keys are valid and reference same dataset
			- Check that dataset exists

			Inputs: ast, Query.OPTIONS, dataset
			Return: boolean
			*/

			// Extract datasetId from the first key in OPTIONS.COLUMNS
			if (!typedQuery.OPTIONS?.COLUMNS?.length) {
				throw new InsightError("OPTIONS.COLUMNS must contain at least one key");
			}
			const firstColumnKey = typedQuery.OPTIONS.COLUMNS[0];
			const datasetId = firstColumnKey.split("_")[0];

			/*
			Load Dataset from Disk:
			Retrieve the dataset stored on disk to memory.
			- Check that dataset exists on disk
			- Load dataset from disk to memory
			- Caches dataset to perform query

			Inputs: id:string
			Returns: dataset:Dataset
			*/

			const datasetInfo = await this.loadDataset(datasetId);
			const dataset = datasetInfo.listOfSections;

			/*
			Execute Query:
			Apply the query's filtering to the dataset and retrieve corresponding records.
			- Traverse AST nodes to apply logical and comparison filters
			- Evaluate LT, GT, EQ, IS, AND, OR, NOT
			- Combine conditions with AND, OR, NOT

			Inputs: ast, dataset
			Returns: result:InsightResult[]
			*/

			let records: any[];
			if (ast === null) {
				records = dataset;
			} else {
				records = await executeQuery(ast, dataset);
			}

			/*
			TODO: Process Options
			Apply the OPTIONS to the query results.
			- Extract specified COLUMNs
			- Sort results based on ORDER key

			Inputs: result, Query.OPTIONS
			Return: result:InsightResult[]
			*/

			// Check Result Size: ensure that the result size does not exceed 5000
			if (records.length > MAX_QUERY_SIZE) {
				throw new ResultTooLargeError("Query results exceed 5000 entries");
			}

			// Return Query Result: return processed results
			return records;
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
			inforForCourses.listOfSections = parsedData.listOfSections.map((sectionData: any) =>
				new Section(
					sectionData.uuid, sectionData.id, sectionData.title, sectionData.instructor,
					sectionData.dept, sectionData.year, sectionData.avg, sectionData.pass,
					sectionData.fail, sectionData.audit
				)
			);
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
