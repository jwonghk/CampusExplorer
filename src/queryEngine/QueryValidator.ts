import { InsightError } from "../controller/IInsightFacade";
import { Query } from "./QueryInterfaces";

const SPLIT_KEY_NUM = 2;

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

// Ensure a valid key is referenced in COLUMNS and ORDER
export function validateKey(key: string, datasetId: string): void {
	const keyParts = key.split("_");
	if (keyParts.length !== SPLIT_KEY_NUM || keyParts[0] !== datasetId) {
		throw new InsightError(`Invalid key format or dataset mismatch: ${key}`);
	}
}

// Helper function to validate comparison objects
export function validateComparisonObject(comparison: any, comparator: string): { key: string; value: any } {
	if (typeof comparison !== "object" || comparison === null || Array.isArray(comparison)) {
		throw new InsightError(`Invalid comparison object for ${comparator}`);
	}

	const keys = Object.keys(comparison);
	if (keys.length !== 1) {
		throw new InsightError(`${comparator} must have exactly one key`);
	}

	const key = keys[0];
	const value = comparison[key];

	// Validate key format
	if (typeof key !== "string" || key.trim() === "") {
		throw new InsightError(`Invalid key in ${comparator}`);
	}
	const keyParts = key.split("_");
	if (keyParts.length !== SPLIT_KEY_NUM || !keyParts[0] || !keyParts[1]) {
		throw new InsightError(`Invalid key format: ${key}`);
	}

	// Validate field name
	const fieldName = keyParts[1];
	const validFields = ["dept", "id", "instructor", "title", "uuid", "avg", "pass", "fail", "audit", "year"];
	if (!validFields.includes(fieldName)) {
		throw new InsightError(`Invalid field name: ${fieldName}`);
	}

	// Additional checks for value can be added here

	return { key, value };
}

// Start ChatGPT
export function extractDatasetIds(query: Query): Set<string> {
	const datasetIds = new Set<string>();

	// Extract from COLUMNS and ORDER
	extractFromOptions(query.OPTIONS, datasetIds);

	// Extract from WHERE
	traverseFilter(query.WHERE, datasetIds);

	return datasetIds;
}

function extractFromOptions(options: any, datasetIds: Set<string>): void {
	for (const column of options.COLUMNS) {
		addDatasetIdFromKey(column, datasetIds);
	}
	if (options.ORDER) {
		addDatasetIdFromKey(options.ORDER, datasetIds);
	}
}

function traverseFilter(filter: any, datasetIds: Set<string>): void {
	if (!filter || typeof filter !== "object") {
		return;
	}
	const key = Object.keys(filter)[0];
	if (!key) {
		throw new InsightError("Filter must contain exactly one key");
	}

	if (["AND", "OR"].includes(key)) {
		for (const subFilter of filter[key]) {
			traverseFilter(subFilter, datasetIds);
		}
	} else if (key === "NOT") {
		traverseFilter(filter.NOT, datasetIds);
	} else if (["LT", "GT", "EQ", "IS"].includes(key)) {
		const comparisonKey = Object.keys(filter[key])[0];
		addDatasetIdFromKey(comparisonKey, datasetIds);
	} else {
		throw new InsightError(`Invalid filter key: ${key}`);
	}
}

function addDatasetIdFromKey(key: string, datasetIds: Set<string>): void {
    if (typeof key !== "string" || key.trim() === "") {
        throw new InsightError(`Invalid key: ${key}`);
    }
    const id = key.split("_")[0];
    if (!id || id.trim() === "") {
        throw new InsightError(`Invalid dataset ID in key: ${key}`);
    }
    validateKey(key, id); // Validate the key format and dataset
    datasetIds.add(id);
}
// End ChatGPT

export function validateQueryStructure(query: any): void {
	if (typeof query !== "object" || query === null || Array.isArray(query)) {
		throw new InsightError("Query must be a non-null object");
	}

	const validTopLevelKeys = ["WHERE", "OPTIONS"];
	if (Object.keys(query).length !== validTopLevelKeys.length || !validTopLevelKeys.every(k => k in query)) {
		throw new InsightError("Query must contain only WHERE and OPTIONS");
	}

	if (!isValidObject(query.WHERE) || !isValidObject(query.OPTIONS)) {
		throw new InsightError("WHERE and OPTIONS must be non-null objects");
	}

	if (!Array.isArray(query.OPTIONS.COLUMNS) || query.OPTIONS.COLUMNS.length === 0) {
		throw new InsightError("OPTIONS must contain a non-empty COLUMNS array");
	}

	const validOptionsKeys = ["COLUMNS", "ORDER"];
	if (!Object.keys(query.OPTIONS).every(k => validOptionsKeys.includes(k))) {
		throw new InsightError("OPTIONS can only contain COLUMNS and optional ORDER");
	}

	if ("ORDER" in query.OPTIONS && (!isString(query.OPTIONS.ORDER) || !query.OPTIONS.COLUMNS.includes(query.OPTIONS.ORDER))) {
		throw new InsightError("ORDER must be a string and exist in COLUMNS");
	}
}

function isValidObject(obj: any): boolean {
	return typeof obj === "object" && obj !== null && !Array.isArray(obj);
}

function isString(value: any): boolean {
	return typeof value === "string";
}
