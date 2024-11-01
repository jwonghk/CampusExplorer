import { InsightResult, InsightError } from "../controller/IInsightFacade";
import { OptionsNode, OrderNode } from "./QueryAST";

const SPLIT_KEY_NUM = 2;

// Processes options for a query, filtering columns and applying sorting if specified
export function processOptions(records: any[], optionsNode: OptionsNode): InsightResult[] {
	const columns = optionsNode.columns;

	const result = filterColumns(records, columns);

	if (optionsNode.order) {
		result.sort(createSortFunction(optionsNode.order));
	}

	return result;
}

// Start ChatGPT
// Filters records to include only specified columns from options
function filterColumns(records: any[], columns: string[]): InsightResult[] {
	return records.map((record) => {
		const filteredRecord: any = {};
		for (const column of columns) {
			filteredRecord[column] = getValue(record, column);
		}
		return filteredRecord;
	});
}

// Retrieves a value from a record based on a given key, supporting nested access
function getValue(record: any, key: string): any {
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
	return undefined;
}
// End ChatGPT

// Creates a sorting function based on the specified order criteria (either a single key or multiple keys with direction)
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
