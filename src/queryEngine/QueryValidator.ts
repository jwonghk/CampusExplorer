import { InsightError } from "../controller/IInsightFacade";
import { Query } from "./QueryInterfaces";

const SPLIT_KEY_NUM = 2;

// Helper function to validate the structure of a filter object (e.g., WHERE clause)
export function validateFilterObject(filter: any, filterType: string): void {
	if (typeof filter !== "object" || filter === null) {
		throw new InsightError(`Invalid ${filterType} structure`);
	}
}

// Helper function to validate that AND/OR arrays contain at least one filter
export function validateArray(filterArray: any, filterType: string): void {
	if (!Array.isArray(filterArray) || filterArray.length === 0) {
		throw new InsightError(`${filterType} must be a non-empty array`);
	}
}

// Ensure a valid key is referenced in COLUMNS and ORDER clauses
export function validateKey(key: string, datasetId: string): void {
	const keyParts = key.split("_");
	if (keyParts.length !== SPLIT_KEY_NUM || keyParts[0] !== datasetId) {
		throw new InsightError(`Invalid key format or dataset mismatch: ${key}`);
	}
}

// Helper function to validate comparison objects used in LT, GT, EQ, IS
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

	// Validate that the key references a valid field
	const fieldName = keyParts[1];
	const validFields = ["dept", "id", "instructor", "title", "uuid", "avg", "pass", "fail", "audit", "year"];
	if (!validFields.includes(fieldName)) {
		throw new InsightError(`Invalid field name: ${fieldName}`);
	}

	return { key, value }; // Return the validated key-value pair
}

// Start ChatGPT
// Extract dataset IDs from the query by inspecting the COLUMNS and WHERE clauses
export function extractDatasetIds(query: Query): Set<string> {
	const datasetIds = new Set<string>();

	// Extract dataset IDs from the OPTIONS clause
	extractFromOptions(query.OPTIONS, datasetIds);

	// Extract dataset IDs from the WHERE clause
	traverseFilter(query.WHERE, datasetIds);

	return datasetIds;
}

// Helper function to extract dataset IDs from the OPTIONS clause
function extractFromOptions(options: any, datasetIds: Set<string>): void {
	for (const column of options.COLUMNS) {
		addDatasetIdFromKey(column, datasetIds);
	}
	if (options.ORDER) {
		addDatasetIdFromKey(options.ORDER, datasetIds);
	}
}

// Helper function to recursively extract dataset IDs from the WHERE clause
function traverseFilter(filter: any, datasetIds: Set<string>): void {
	if (!filter || typeof filter !== "object") {
		return;
	}
	const key = Object.keys(filter)[0];
	if (!key) {
		throw new InsightError("Filter must contain exactly one key");
	}

	if (["AND", "OR"].includes(key)) {
		// Recursively traverse sub-filters for AND/OR operations
		for (const subFilter of filter[key]) {
			traverseFilter(subFilter, datasetIds);
		}
	} else if (key === "NOT") {
		traverseFilter(filter.NOT, datasetIds);
	} else if (["LT", "GT", "EQ", "IS"].includes(key)) {
		// Extract dataset ID from the key in comparison operations
		const comparisonKey = Object.keys(filter[key])[0];
		addDatasetIdFromKey(comparisonKey, datasetIds);
	} else {
		throw new InsightError(`Invalid filter key: ${key}`);
	}
}

// Add a dataset ID to the set by extracting it from the key
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

// Validate the overall query structure (must contain WHERE and OPTIONS)
export function validateQueryStructure(query: any): void {
	if (typeof query !== "object" || query === null || Array.isArray(query)) {
		throw new InsightError("Query must be a non-null object");
	}

	const validTopLevelKeys = ["WHERE", "OPTIONS"];
	if (Object.keys(query).length !== validTopLevelKeys.length || !validTopLevelKeys.every((k) => k in query)) {
		throw new InsightError("Query must contain only WHERE and OPTIONS");
	}

	if (!isValidObject(query.WHERE) || !isValidObject(query.OPTIONS)) {
		throw new InsightError("WHERE and OPTIONS must be non-null objects");
	}

	// Ensure COLUMNS is a non-empty array in the OPTIONS clause
	if (!Array.isArray(query.OPTIONS.COLUMNS) || query.OPTIONS.COLUMNS.length === 0) {
		throw new InsightError("OPTIONS must contain a non-empty COLUMNS array");
	}

	const validOptionsKeys = ["COLUMNS", "ORDER"];
	if (!Object.keys(query.OPTIONS).every((k) => validOptionsKeys.includes(k))) {
		throw new InsightError("OPTIONS can only contain COLUMNS and optional ORDER");
	}

	// Validate ORDER key if it exists, ensuring it's in COLUMNS
	if (
		"ORDER" in query.OPTIONS &&
		(!isString(query.OPTIONS.ORDER) || !query.OPTIONS.COLUMNS.includes(query.OPTIONS.ORDER))
	) {
		throw new InsightError("ORDER must be a string and exist in COLUMNS");
	}
}

// Helper function to check if an object is valid (non-null, not an array)
function isValidObject(obj: any): boolean {
	return typeof obj === "object" && obj !== null && !Array.isArray(obj);
}

// Helper function to check if a value is a string
function isString(value: any): boolean {
	return typeof value === "string";
}
