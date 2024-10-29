// QueryOptions.ts

import { InsightResult, InsightError } from "../controller/IInsightFacade";
import { OptionsNode, OrderNode } from "./QueryAST";

const SPLIT_KEY_NUM = 2;

export function processOptions(records: any[], optionsNode: OptionsNode): InsightResult[] {
	const columns = optionsNode.columns;

	const result = filterColumns(records, columns);
	console.log("Records after Filtering Columns:", result); // Log records after filtering columns


	if (optionsNode.order) {
		result.sort(createSortFunction(optionsNode.order));
	}

	return result;
}

function filterColumns(records: any[], columns: string[]): InsightResult[] {
	return records.map((record) => {
		const filteredRecord: any = {};
		for (const column of columns) {
			filteredRecord[column] = getValue(record, column);
			console.log("Column:", column, "Value:", filteredRecord[column]); // Log each column and its value
		}
		return filteredRecord;
	});
}

function getValue(record: any, key: string): any {
	console.log(`\n-- getValue called --`);
	console.log(`Key: ${key}`);
	console.log(`Record:`, record);

	// Check if record contains key directly
	if (key in record) {
		console.log(`Direct access found. Key: ${key}, Value:`, record[key]);
		return record[key];
	}

	// Split key by underscore for nested access
	const parts = key.split("_");
	console.log(`Split Key Parts:`, parts);

	// Ensure the split key has expected structure before nested access
	if (parts.length === SPLIT_KEY_NUM) {
		const field = parts[1];
		let value = record[field];
		console.log(`Field after split: ${field}, Initial Value:`, value);

		// Check adjusted case if initial value is undefined
		if (value === undefined) {
			const adjustedField = field.toLowerCase();
			value = record[adjustedField];
			console.log(`Adjusted Field (lowercase): ${adjustedField}, Value after adjustment:`, value);
		}

		// Return value if found through split structure
		if (value !== undefined) {
			console.log(`Returning Value for Key "${key}":`, value, "\n");
			return value;
		}
	}

	// Fallback if neither direct access nor split structure found a value
	console.log(`No matching value found for Key "${key}". Returning undefined.\n`);
	return undefined;
}


function createSortFunction(order: OrderNode | string): (a: any, b: any) => number {
	if (typeof order === "string") {
		return (a, b) => (a[order] < b[order] ? -1 : a[order] > b[order] ? 1 : 0);
	} else if (order instanceof OrderNode) {
		const dir = order.direction === "UP" ? 1 : -1;
		const keys = order.keys;
		return (a, b) => {
			for (const key of keys) {
				if (a[key] < b[key]) {
					return -1 * dir;
				}
				if (a[key] > b[key]) {
					return 1 * dir;
				}
			}
			return 0;
		};
	} else {
		throw new InsightError("Invalid ORDER format");
	}
}
