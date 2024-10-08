import { ASTNode, LogicNode, ComparatorNode, NotNode } from "./QueryAST";
import { validateComparisonObject, validateFilterObject, validateArray } from "./QueryValidator";
import { InsightError } from "../controller/IInsightFacade";

// Helper function for parsing comparison operators
function parseComparison(filter: any, comparator: "LT" | "GT" | "EQ" | "IS"): ComparatorNode {
	const comparison = filter[comparator];
	const { key, value } = validateComparisonObject(comparison, comparator);
	if (comparator === "IS") {
		if (typeof value !== "string") {
			throw new InsightError("IS value must be a string");
		}
	} else {
		if (typeof value !== "number") {
			throw new InsightError("Comparison value must be a number");
		}
	}
	return new ComparatorNode(comparator, key, value);
}

export function parseFilter(filter: any): ASTNode | null {
	validateFilterObject(filter, "filter");

	if (Object.keys(filter).length === 0) {
		return null;
	}

	// Parse logical operators
	if ("AND" in filter) {
		validateArray(filter.AND, "AND");
		const filters = filter.AND.map(parseFilter);
		return new LogicNode("AND", filters);
	}

	if ("OR" in filter) {
		validateArray(filter.OR, "OR");
		const filters = filter.OR.map(parseFilter);
		return new LogicNode("OR", filters);
	}

	if ("NOT" in filter) {
		const innerFilter = parseFilter(filter.NOT);
		if (innerFilter === null) {
			throw new InsightError("Invalid NOT filter structure");
		}
		return new NotNode(innerFilter);
	}

	// Parse comparison operators
	const comparisonKeys = ["LT", "GT", "EQ", "IS"] as const;
	for (const comparator of comparisonKeys) {
		if (comparator in filter) {
			return parseComparison(filter, comparator);
		}
	}

	throw new InsightError("Invalid filter");
}
