import { InsightError } from "../controller/IInsightFacade";
import { ApplyToken } from "./QueryInterfaces";

const SPLIT_KEY_NUM = 2;
const MIN_QUERY_KEYS = 2;

export function validateQueryStructure(query: any): void {
	if (!isValidObject(query)) {
		throw new InsightError("Query must be a non-null object");
	}

	const queryKeys = Object.keys(query);
	const allowedKeys = ["WHERE", "OPTIONS", "TRANSFORMATIONS"];

	// Ensure no extra top-level keys are present
	for (const key of queryKeys) {
		if (!allowedKeys.includes(key)) {
			throw new InsightError(`Query contains invalid key: ${key}`);
		}
	}

	if (!queryKeys.includes("WHERE") || !queryKeys.includes("OPTIONS")) {
		throw new InsightError("Query must contain WHERE and OPTIONS");
	}

	if (queryKeys.includes("TRANSFORMATIONS")) {
		validateTransformations(query.TRANSFORMATIONS);
	}

	if (!isValidObject(query.WHERE) || !isValidObject(query.OPTIONS)) {
		throw new InsightError("WHERE and OPTIONS must be non-null objects");
	}

	validateOptions(query.OPTIONS, query.TRANSFORMATIONS);
}

// Start ChatGPT
function validateTransformations(transformations: any): void {
	if (!isValidObject(transformations)) {
		throw new InsightError("TRANSFORMATIONS must be a non-null object");
	}
	const transKeys = Object.keys(transformations);
	if (!transKeys.includes("GROUP") || !transKeys.includes("APPLY") || transKeys.length !== MIN_QUERY_KEYS) {
		throw new InsightError("TRANSFORMATIONS must contain GROUP and APPLY");
	}

	const group = transformations.GROUP;
	const apply = transformations.APPLY;

	if (!Array.isArray(group) || group.length === 0) {
		throw new InsightError("GROUP must be a non-empty array");
	}

	const applyKeysSet = new Set<string>();
	if (!Array.isArray(apply)) {
		throw new InsightError("APPLY must be an array");
	}

	for (const applyRule of apply) {
		validateApplyRule(applyRule, applyKeysSet);
	}
}

function validateApplyRule(applyRule: any, applyKeysSet: Set<string>): void {
	if (!isValidObject(applyRule) || Object.keys(applyRule).length !== 1) {
		throw new InsightError("Each APPLYRULE must be an object with one applykey");
	}
	const applyKey = Object.keys(applyRule)[0];
	if (applyKeysSet.has(applyKey) || applyKey.includes("_")) {
		throw new InsightError("applykeys must be unique and not contain underscores");
	}
	applyKeysSet.add(applyKey);
	const applyContent = applyRule[applyKey];
	if (!isValidObject(applyContent) || Object.keys(applyContent).length !== 1) {
		throw new InsightError("APPLYRULE must have exactly one APPLYTOKEN");
	}
	const applyToken = Object.keys(applyContent)[0] as ApplyToken;
	if (!["MAX", "MIN", "AVG", "COUNT", "SUM"].includes(applyToken)) {
		throw new InsightError(`Invalid APPLYTOKEN: ${applyToken}`);
	}
	const fieldKey = applyContent[applyToken];
	validateKey(fieldKey);
}
// End ChatGPT

function validateOptions(options: any, transformations: any): void {
	if (!isValidObject(options)) {
		throw new InsightError("OPTIONS must be a non-null object");
	}
	const optionsKeys = Object.keys(options);
	if (!optionsKeys.includes("COLUMNS")) {
		throw new InsightError("OPTIONS must contain COLUMNS");
	}
	const columns = options.COLUMNS;
	if (!Array.isArray(columns) || columns.length === 0) {
		throw new InsightError("COLUMNS must be a non-empty array");
	}

	if (options.ORDER) {
		validateOrder(options.ORDER, columns);
	}

	if (transformations) {
		const groupKeys = transformations.GROUP;
		const applyKeys = transformations.APPLY.map((rule: any) => Object.keys(rule)[0]);
		const allValidKeys = groupKeys.concat(applyKeys);

		for (const column of columns) {
			if (!allValidKeys.includes(column)) {
				throw new InsightError("COLUMNS keys must be in GROUP or APPLY keys when TRANSFORMATIONS is present");
			}
		}

		for (const key of groupKeys) {
			validateKey(key);
		}
	} else {
		for (const column of columns) {
			validateKey(column);
		}
	}
}

function validateOrder(order: any, columns: string[]): void {
	if (typeof order === "string") {
		if (!columns.includes(order)) {
			throw new InsightError("ORDER key must be in COLUMNS");
		}
	} else if (isValidObject(order)) {
		const dir = order.dir;
		const keys = order.keys;
		if (!["UP", "DOWN"].includes(dir) || !Array.isArray(keys) || keys.length === 0) {
			throw new InsightError("Invalid ORDER object");
		}
		for (const key of keys) {
			if (!columns.includes(key)) {
				throw new InsightError("ORDER keys must be in COLUMNS");
			}
		}
	} else {
		throw new InsightError("ORDER must be a string or an object");
	}
}

function isValidObject(obj: any): boolean {
	return typeof obj === "object" && obj !== null && !Array.isArray(obj);
}

const VALID_FIELDS = [
	"dept",
	"id",
	"instructor",
	"title",
	"uuid",
	"avg",
	"pass",
	"fail",
	"audit",
	"year",
	"fullname",
	"shortname",
	"number",
	"name",
	"address",
	"type",
	"furniture",
	"seats",
	"lat",
	"lon",
	"href",
];

function validateKey(key: string): void {
	if (typeof key !== "string" || key.trim() === "") {
		throw new InsightError(`Invalid key: ${key}`);
	}
	const keyParts = key.split("_");
	if (keyParts.length !== SPLIT_KEY_NUM) {
		throw new InsightError(`Invalid key format: ${key}`);
	}
	const fieldName = keyParts[1];
	if (!VALID_FIELDS.includes(fieldName)) {
		throw new InsightError(`Invalid field name: ${fieldName}`);
	}
}
