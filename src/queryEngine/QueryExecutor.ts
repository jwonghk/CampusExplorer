import { ASTNode, LogicNode, ComparatorNode, NotNode } from "./QueryAST";
import { InsightError } from "../controller/IInsightFacade";

const SPLIT_KEY_NUM = 2;

export async function executeQuery(ast: ASTNode, dataset: any[]): Promise<any[]> {
	if (!ast) {
		return dataset;
	}

	return dataset.filter((record) => evaluate(ast, record));
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
		case "GT":
		case "EQ":
			if (typeof value !== "number" || typeof node.value !== "number") {
				throw new InsightError("Numeric comparisons require numeric values");
			}
			if (node.comparator === "LT") {
				return value < node.value;
			} else if (node.comparator === "GT") {
				return value > node.value;
			} else {
				return value === node.value;
			}
		case "IS":
			if (typeof value !== "string" || typeof node.value !== "string") {
				throw new InsightError("IS comparison requires string values");
			}
			return matchIS(value, node.value as string);
		default:
			throw new InsightError(`Invalid comparator: ${node.comparator}`);
	}
}

// Start ChatGPT
function getValue(record: any, key: string): any {
	const parts = key.split("_");
	if (parts.length !== SPLIT_KEY_NUM) {
		throw new InsightError(`Invalid key format: ${key}`);
	}
	const field = parts[1];
	return record[field];
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
