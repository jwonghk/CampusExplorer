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
			return value < node.value;
		case "GT":
			return value > node.value;
		case "EQ":
			return value === node.value;
		case "IS":
			if (typeof value !== "string") {
				return false;
			}
			return matchIS(value, node.value as string);
		default:
			return false;
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
	const escapedPattern =
		"^" +
		pattern.replace(/[*?]/g, (char) => {
			if (char === "*") {
				return ".*";
			}
			if (char === "?") {
				return ".";
			}
			return "\\" + char;
		}) +
		"$";
	const regex = new RegExp(escapedPattern);
	return regex.test(value);
}
// End ChatGPT
