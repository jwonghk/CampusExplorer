import { IInsightFacade, InsightDataset, InsightDatasetKind, InsightResult } from "./IInsightFacade";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
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
		/*
		Validate Query:
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

		/*
		Validate Query Semantics:
		Check that query is semantically valid and references an existing dataset.
		- Check that keys are valid and reference same dataset
		- Check that dataset exists

		Inputs: ast, Query.OPTIONS, dataset
		Return: boolean
		*/

		/*
		Load Dataset from Disk:
		Retrieve the dataset stored on disk to memory.
		- Check that dataset exists on disk
		- Load dataset from disk to memory
		- Caches dataset to perform query

		Inputs: id:string
		Returns: dataset:Dataset
		*/

		/*
		Execute Query:
		Apply the query's filtering to the dataset and retrieve corresponding records.
		- Traverse AST nodes to apply logical and comparison filters
		- Evaluate LT, GT, EQ, IS, AND, OR, NOT
		- Combine conditions with AND, OR, NOT

		Inputs: ast, dataset
		Returns: result:InsightResult[]
		*/

		/*
		Process Options:
		Apply the OPTIONS to the query results.
		- Extract specified COLUMNs
		- Sort results based on ORDER key

		Inputs: result, Query.OPTIONS
		Return: result:InsightResult[]
		*/

		// Check Result Size: ensure that the result size does not exceed 5000

		// Return Query Result: return processed results

		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::performQuery() is unimplemented! - query=${query};`);
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::listDatasets is unimplemented!`);
	}
}
