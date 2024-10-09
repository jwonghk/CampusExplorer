import { InsightError } from "../controller/IInsightFacade";
import { Query } from "./QueryInterfaces";

// Helper function to validate the filter object
export function validateFilterObject(filter: any, filterType: string): void {
	if (typeof filter !== "object" || filter === null) {
		throw new InsightError(`Invalid ${filterType} structure`);
	}
}

// Helper function to validate arrays for AND/OR logic
export function validateArray(filterArray: any, filterType: string): void {
	if (!Array.isArray(filterArray) || filterArray.length === 0) {
		throw new InsightError(`${filterType} must be a non-empty array`);
	}
}

// Helper function to validate comparison objects
export function validateComparisonObject(comparison: any, comparator: string): { key: string; value: any } {
	if (typeof comparison !== "object" || comparison === null) {
		throw new InsightError(`Invalid comparison object for ${comparator}`);
	}

	const keys = Object.keys(comparison);
	if (keys.length !== 1) {
		throw new InsightError(`${comparator} must have exactly one key`);
	}

	const key = keys[0];
	const value = comparison[key];
	return { key, value };
}

// Start ChatGPT
export function extractDatasetIds(query: Query): Set<string> {
	const datasetIds = new Set<string>();

	// Extract from COLUMNS
	for (const column of query.OPTIONS.COLUMNS) {
		const id = column.split("_")[0];
		datasetIds.add(id);
	}

	// Extract from ORDER if present
	if (query.OPTIONS.ORDER) {
		const orderKey = query.OPTIONS.ORDER;
		const id = orderKey.split("_")[0];
		datasetIds.add(id);
	}

	// Extract from WHERE
	function traverseFilter(filter: any): void {
		if (filter === null || typeof filter !== "object") {
			return;
		}
		const keys = Object.keys(filter);
		if (["AND", "OR"].includes(keys[0])) {
			for (const subFilter of filter[keys[0]]) {
				traverseFilter(subFilter);
			}
		} else if (keys[0] === "NOT") {
			traverseFilter(filter.NOT);
		} else {
			const comparator = keys[0];
			const mKey = filter[comparator];
			const key = Object.keys(mKey)[0];
			const id = key.split("_")[0];
			datasetIds.add(id);
		}
	}
	traverseFilter(query.WHERE);

	return datasetIds;
}
// End ChatGPT

export function validateQueryStructure(query: Query): void {
	if (!query.WHERE || !query.OPTIONS) {
		throw new InsightError("Query must contain WHERE and OPTIONS");
	}
	if (!Array.isArray(query.OPTIONS.COLUMNS) || query.OPTIONS.COLUMNS.length === 0) {
		throw new InsightError("OPTIONS must contain a non-empty COLUMNS array");
	}
}
