import { InsightResult, InsightError } from "../controller/IInsightFacade";
import { Options } from "./QueryInterfaces";

const SPLIT_KEY_NUM = 2;

export function processOptions(records: any[], options: Options): InsightResult[] {
	if (!options.COLUMNS || !Array.isArray(options.COLUMNS) || options.COLUMNS.length === 0) {
		throw new InsightError("OPTIONS must contain a non-empty COLUMNS array");
	}

	const columns = options.COLUMNS;
	const result = filterColumns(records, columns);

	return result;
}

// Start ChatGPT
function filterColumns(records: any[], columns: string[]): InsightResult[] {
	return records.map((record) => {
		const filteredRecord: any = {};
		for (const column of columns) {
			const fieldParts = column.split("_");
			if (fieldParts.length !== SPLIT_KEY_NUM) {
				throw new InsightError(`Invalid column key: ${column}`);
			}
			const field = fieldParts[1];
			filteredRecord[column] = record[field];
		}
		return filteredRecord;
	});
}
// End ChatGPT
