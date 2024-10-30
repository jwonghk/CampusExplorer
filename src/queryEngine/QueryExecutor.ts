import { ASTNode, QueryNode, TransformationsNode, LogicNode, ComparatorNode, NotNode } from "./QueryAST";
import { InsightResult, InsightError } from "../controller/IInsightFacade";
import { performAggregation } from "./AggregationHelper";
import { processOptions } from "./QueryOptions";

const SPLIT_KEY_NUM = 2;

export async function executeQuery(ast: ASTNode | null, dataset: any[]): Promise<InsightResult[]> {
	if (!(ast instanceof QueryNode)) {
		throw new InsightError("Invalid AST: Root node must be a QueryNode");
	}

	const queryNode = ast as QueryNode;

	let records = dataset;

	if (queryNode.filter) {
		records = records.filter((record) => evaluate(queryNode.filter!, record));
	}

	if (queryNode.transformations) {
		records = applyTransformations(records, queryNode.transformations);
	}

	const results = processOptions(records, queryNode.options);

	return results;
}

function evaluate(node: ASTNode, record: any): boolean {
	if (node instanceof LogicNode) {
		return evaluateLogicNode(node, record);
	} else if (node instanceof ComparatorNode) {
		return evaluateComparisonNode(node, record);
	} else if (node instanceof NotNode) {
		return !evaluate(node.filter, record);
	}
	return false;
}

function evaluateLogicNode(node: LogicNode, record: any): boolean {
	if (node.operator === "AND") {
		return node.filters.every((filter) => evaluate(filter, record));
	} else if (node.operator === "OR") {
		return node.filters.some((filter) => evaluate(filter, record));
	}
	return false;
}

function evaluateComparisonNode(node: ComparatorNode, record: any): boolean {
	const value = getValue(record, node.key);
	if (value === undefined || value === null) {
		return false;
	}
	switch (node.comparator) {
		case "LT":
			return typeof value === "number" && value < node.value;
		case "GT":
			return typeof value === "number" && value > node.value;
		case "EQ":
			return typeof value === "number" && value === node.value;
		case "IS":
			return typeof value === "string" && matchIS(value, node.value as string);
		default:
			throw new InsightError(`Invalid comparator: ${node.comparator}`);
	}
}

// Start ChatGPT
function getValue(record: any, key: string): any {
	// Check if record contains key directly
	if (key in record) {
		return record[key];
	}

	// Split key by underscore for nested access
	const parts = key.split("_");

	// Ensure the split key has expected structure before nested access
	if (parts.length === SPLIT_KEY_NUM) {
		const field = parts[1];
		let value = record[field];

		// Check adjusted case if initial value is undefined
		if (value === undefined) {
			const adjustedField = field.toLowerCase();
			value = record[adjustedField];
		}

		// Return value if found through split structure
		if (value !== undefined) {
			return value;
		}
	}

	// Fallback if neither direct access nor split structure found a value
	return undefined;
}

function matchIS(value: string, pattern: string): boolean {
	if (pattern === null || typeof pattern !== "string") {
		throw new InsightError("Pattern in IS must be a string");
	}
	if (pattern.includes("**")) {
		throw new InsightError("Invalid wildcard usage in IS");
	}
	const escapedPattern = "^" + pattern.replace(/\*/g, ".*") + "$";
	const regex = new RegExp(escapedPattern);
	return regex.test(value);
}
// End ChatGPT

function applyTransformations(records: any[], transformationsNode: TransformationsNode): any[] {
	const groups = groupRecords(records, transformationsNode.groupKeys);
	const transformedRecords = [];

	for (const group of Object.values(groups)) {
		const newRecord: any = {};

		// Add group keys
		const sample = group[0];
		for (const key of transformationsNode.groupKeys) {
			newRecord[key] = getValue(sample, key);
		}

		// Apply aggregation
		for (const applyNode of transformationsNode.applyRules) {
			const values = group.map((item: any) => getValue(item, applyNode.key));
			newRecord[applyNode.applyKey] = performAggregation(applyNode.applyToken, values);
		}

		transformedRecords.push(newRecord);
	}

	return transformedRecords;
}

function groupRecords(records: any[], groupKeys: string[]): Record<string, any[]> {
	const groups: Record<string, any[]> = {};
	records.forEach((record) => {
		const keyValues = groupKeys.map((k) => getValue(record, k));
		const key = JSON.stringify(keyValues);
		if (!groups[key]) {
			groups[key] = [];
		}
		groups[key].push(record);
	});
	return groups;
}
