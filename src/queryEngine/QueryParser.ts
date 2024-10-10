import { ASTNode, LogicNode, ComparatorNode, NotNode } from "./QueryAST";
import { validateComparisonObject, validateFilterObject, validateArray } from "./QueryValidator";
import { InsightError } from "../controller/IInsightFacade";

// Helper function to parse comparison filters (LT, GT, EQ, IS)
function parseComparison(filter: any, comparator: "LT" | "GT" | "EQ" | "IS"): ComparatorNode {
	const comparison = filter[comparator];
	const { key, value } = validateComparisonObject(comparison, comparator);

	// Validate the type of value based on the comparator
	if (comparator === "IS") {
		if (typeof value !== "string") {
			throw new InsightError("IS value must be a string");
		}
	} else {
		if (typeof value !== "number") {
			throw new InsightError("Comparison value must be a number");
		}
	}
	// Return a new ComparatorNode for the given comparator, key, and value
	return new ComparatorNode(comparator, key, value);
}

// Parse the WHERE clause of a query and convert it into an AST (Abstract Syntax Tree)
export function parseFilter(filter: any): ASTNode | null {
	validateFilterObject(filter, "filter");

	const filterKeys = Object.keys(filter);

	// Empty filter (WHERE: {})
	if (filterKeys.length === 0) {
		return null;
	}

	// Filter must contain exactly one key (AND, OR, NOT, LT, GT, EQ, IS)
	if (filterKeys.length !== 1) {
		throw new InsightError("Filter must contain exactly one key");
	}

	const filterKey = filterKeys[0];

	// Parse logical operators (AND, OR)
	if (filterKey === "AND" || filterKey === "OR") {
		const logicArray = filter[filterKey];
		validateArray(logicArray, filterKey);
		const filters = logicArray.map(parseFilter);
		return new LogicNode(filterKey as "AND" | "OR", filters);
	}

	// Parse NOT operator
	if (filterKey === "NOT") {
		const innerFilter = parseFilter(filter.NOT);
		if (innerFilter === null) {
			throw new InsightError("NOT filter cannot be empty");
		}
		return new NotNode(innerFilter);
	}

	// Parse comparison operators (LT, GT, EQ, IS)
	if (["LT", "GT", "EQ", "IS"].includes(filterKey)) {
		return parseComparison(filter, filterKey as "LT" | "GT" | "EQ" | "IS");
	}

	throw new InsightError("Invalid filter key");
}
