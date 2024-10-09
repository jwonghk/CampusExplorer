import { InsightResult, InsightError } from "../controller/IInsightFacade";
import { Options } from "./QueryInterfaces";
import { validateKey } from "./QueryValidator";

const SPLIT_KEY_NUM = 2;

// Processes the OPTIONS clause of a query, filtering and sorting the dataset based on the COLUMNS and ORDER fields
export function processOptions(records: any[], options: Options): InsightResult[] {
	if (!options.COLUMNS || !Array.isArray(options.COLUMNS) || options.COLUMNS.length === 0) {
		throw new InsightError("OPTIONS must contain a non-empty COLUMNS array");
	}

	const columns = options.COLUMNS;
	const datasetId = columns[0].split("_")[0];

	// Validate all columns in the COLUMNS array
	for (const column of columns) {
		validateKey(column, datasetId); // Add validation for each column
	}

	// Filter the dataset to include only the specified columns
	let result = filterColumns(records, columns);

	// If ORDER is specified, sort the result based on the ORDER key
	if (options.ORDER) {
		const orderKey = options.ORDER;
		if (typeof orderKey !== "string") {
			throw new InsightError("ORDER must be a string");
		}
		validateKey(orderKey, datasetId); // Add validation for ORDER key
		result = result.sort((a, b) => {
			if (a[orderKey] < b[orderKey]) {
				return -1;
			} else if (a[orderKey] > b[orderKey]) {
				return 1;
			} else {
				return 0;
			}
		});
	}

	return result;
}

// Helper function to filter the dataset to include only the columns specified in the COLUMNS array
function filterColumns(records: any[], columns: string[]): InsightResult[] {
	// Start ChatGPT
	return records.map((record) => {
		const filteredRecord: any = {};
		for (const column of columns) {
			const fieldParts = column.split("_");
			if (fieldParts.length !== SPLIT_KEY_NUM) {
				throw new InsightError(`Invalid column key: ${column}`);
			}
			const field = fieldParts[1]; // Extract the field name from the column key
			filteredRecord[column] = record[field];
		}
		return filteredRecord;
	});
	// End ChatGPT
}
