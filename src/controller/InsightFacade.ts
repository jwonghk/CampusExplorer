import { IInsightFacade, InsightDataset, InsightDatasetKind, InsightResult } from "./IInsightFacade";
import { InsightError, ResultTooLargeError } from "./IInsightFacade";
import * as fs from "fs/promises";
import * as path from "path";
import { Query } from "../queryEngine/QueryInterfaces";
import { parseFilter } from "../queryEngine/QueryParser";
import { executeQuery } from "../queryEngine/QueryExecutor";

const DATA_DIR = path.join(__dirname, "../../data");
const MAX_QUERY_SIZE = 5000;

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	private datasets: Map<string, any[]> = new Map<string, any[]>();

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		// TODO: Remove this once you implement the methods!
		throw new Error(
			`InsightFacadeImpl::addDataset() is unimplemented! - id=${id}; content=${content?.length}; kind=${kind}`
		);
	}

	public async removeDataset(id: string): Promise<string> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::removeDataset() is unimplemented! - id=${id};`);
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

			const dataset = await this.loadDataset(datasetId);

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

	public async listDatasets(): Promise<InsightDataset[]> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::listDatasets is unimplemented!`);
	}

	private async readDatasetFromDisk(id: string): Promise<any[]> {
		try {
			const filePath = path.join(DATA_DIR, `${id}.json`);
			await fs.access(filePath);
			const content = await fs.readFile(filePath, "utf8");
			const parsedData = JSON.parse(content);
			if (!Array.isArray(parsedData.listOfSections)) {
				throw new InsightError(`Dataset ${id} is malformed`);
			}
			return parsedData.listOfSections;
		} catch (err: any) {
			if (err.code === "ENOENT") {
				throw new InsightError(`Dataset ${id} not found`);
			} else if (err instanceof SyntaxError) {
				throw new InsightError(`Dataset ${id} is not valid JSON`);
			} else {
				throw new InsightError(`Error reading dataset ${id}: ${err.message}`);
			}
		}
	}

	private async loadDataset(id: string): Promise<any[]> {
		if (this.datasets.has(id)) {
			return this.datasets.get(id)!;
		} else {
			const data = await this.readDatasetFromDisk(id);
			this.datasets.set(id, data);
			return data;
		}
	}
}
