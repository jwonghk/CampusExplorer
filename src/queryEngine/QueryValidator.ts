import { InsightError } from "../controller/IInsightFacade";

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
