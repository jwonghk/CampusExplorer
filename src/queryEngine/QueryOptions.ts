// QueryOptions.ts

import { InsightResult, InsightError } from "../controller/IInsightFacade";
import { OptionsNode, OrderNode } from "./QueryAST";

const SPLIT_KEY_NUM = 2;

export function processOptions(records: any[], optionsNode: OptionsNode): InsightResult[] {
	const columns = optionsNode.columns;

	const result = filterColumns(records, columns);

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
		}
		return filteredRecord;
	});
}

function getValue(record: any, key: string): any {
	const parts = key.split("_");
	if (parts.length !== SPLIT_KEY_NUM) {
		return record[key];
	}
	const field = parts[1];
	let value = record[field];
	if (value === undefined) {
		const adjustedField = field.toLowerCase();
		value = record[adjustedField];
	}
	return value;
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
