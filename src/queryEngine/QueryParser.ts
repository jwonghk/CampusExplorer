// QueryParser.ts

import {
	ASTNode,
	QueryNode,
	OptionsNode,
	OrderNode,
	TransformationsNode,
	ApplyNode,
	LogicNode,
	ComparatorNode,
	NotNode,
} from "./QueryAST";
import { InsightError } from "../controller/IInsightFacade";
import { validateQueryStructure } from "./QueryValidator";

export function parseQuery(query: any): QueryNode {
	validateQueryStructure(query);

	const filter = parseFilter(query.WHERE);

	const options = parseOptions(query.OPTIONS);

	let transformations: TransformationsNode | undefined;
	if (query.TRANSFORMATIONS) {
		transformations = parseTransformations(query.TRANSFORMATIONS);
	}

	return new QueryNode(filter, options, transformations);
}

function parseFilter(filter: any): ASTNode | null {
	if (typeof filter !== "object" || filter === null) {
		throw new InsightError("Invalid filter");
	}

	const keys = Object.keys(filter);
	if (keys.length === 0) {
		return null; // Empty filter matches all records
	}
	if (keys.length !== 1) {
		throw new InsightError("Filter must have exactly one key");
	}

	const key = keys[0];

	switch (key) {
		case "AND":
		case "OR":
			return parseLogicNode(key as "AND" | "OR", filter[key]);
		case "NOT":
			return parseNotNode(filter[key]);
		case "LT":
		case "GT":
		case "EQ":
		case "IS":
			return parseComparatorNode(key as "LT" | "GT" | "EQ" | "IS", filter[key]);
		default:
			throw new InsightError(`Invalid filter key: ${key}`);
	}
}

function parseLogicNode(operator: "AND" | "OR", logicArray: any): LogicNode {
	if (!Array.isArray(logicArray) || logicArray.length === 0) {
		throw new InsightError(`${operator} must be a non-empty array`);
	}
	const filters = logicArray.map((f: any) => parseFilter(f)).filter((f): f is ASTNode => f !== null);
	return new LogicNode(operator, filters);
}

function parseNotNode(innerFilter: any): NotNode {
	const inner = parseFilter(innerFilter);
	if (inner === null) {
		throw new InsightError("NOT cannot have an empty filter");
	}
	return new NotNode(inner);
}

function parseComparatorNode(comparator: "LT" | "GT" | "EQ" | "IS", comparison: any): ComparatorNode {
	if (typeof comparison !== "object" || comparison === null) {
		throw new InsightError(`${comparator} must be an object`);
	}
	const comparisonKeys = Object.keys(comparison);
	if (comparisonKeys.length !== 1) {
		throw new InsightError(`${comparator} must have exactly one key`);
	}
	const compKey = comparisonKeys[0];
	const value = comparison[compKey];
	return new ComparatorNode(comparator, compKey, value);
}

function parseOptions(options: any): OptionsNode {
	const columns = options.COLUMNS;
	if (!Array.isArray(columns) || columns.length === 0) {
		throw new InsightError("COLUMNS must be a non-empty array");
	}

	let orderNode: OrderNode | string | undefined;
	if (options.ORDER) {
		orderNode = parseOrder(options.ORDER);
	}

	return new OptionsNode(columns, orderNode);
}

function parseOrder(order: any): OrderNode | string {
	if (typeof order === "string") {
		return order;
	} else if (typeof order === "object" && order !== null) {
		const direction = order.dir;
		const keys = order.keys;
		if (!Array.isArray(keys) || keys.length === 0) {
			throw new InsightError("ORDER keys must be a non-empty array");
		}
		if (direction !== "UP" && direction !== "DOWN") {
			throw new InsightError("ORDER direction must be 'UP' or 'DOWN'");
		}
		return new OrderNode(keys, direction);
	} else {
		throw new InsightError("Invalid ORDER clause");
	}
}

function parseTransformations(transformations: any): TransformationsNode {
	const group = transformations.GROUP;
	const apply = transformations.APPLY;

	if (!Array.isArray(group) || group.length === 0) {
		throw new InsightError("GROUP must be a non-empty array");
	}
	if (!Array.isArray(apply)) {
		throw new InsightError("APPLY must be an array");
	}

	const applyNodes = apply.map((applyRule: any) => parseApplyRule(applyRule));

	return new TransformationsNode(group, applyNodes);
}

function parseApplyRule(applyRule: any): ApplyNode {
	if (typeof applyRule !== "object" || applyRule === null || Array.isArray(applyRule)) {
		throw new InsightError("Each APPLY rule must be an object");
	}
	const applyKeys = Object.keys(applyRule);
	if (applyKeys.length !== 1) {
		throw new InsightError("Each APPLY rule must have exactly one apply key");
	}
	const applyKey = applyKeys[0];
	if (applyKey.includes("_")) {
		throw new InsightError("Apply key must not contain underscores");
	}
	const applyContent = applyRule[applyKey];
	const applyTokens = Object.keys(applyContent);
	if (applyTokens.length !== 1) {
		throw new InsightError("APPLY rule must have exactly one apply token");
	}
	const applyToken = applyTokens[0];
	const key = applyContent[applyToken];

	return new ApplyNode(applyKey, applyToken, key);
}
