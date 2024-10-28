// AggregationHelper.ts

import { InsightError } from "../controller/IInsightFacade";
import Decimal from "decimal.js";

const TWO_DECIMAL_PLACES = 2;

export function performAggregation(applyToken: string, values: any[]): any {
	switch (applyToken) {
		case "MAX":
			return Math.max(...values);
		case "MIN":
			return Math.min(...values);
		case "AVG":
			return calculateAverage(values);
		case "SUM":
			return calculateSum(values);
		case "COUNT":
			return new Set(values).size;
		default:
			throw new InsightError(`Invalid APPLYTOKEN: ${applyToken}`);
	}
}

function calculateAverage(values: number[]): number {
	let total = new Decimal(0);
	values.forEach((num) => {
		total = total.add(new Decimal(num));
	});
	const numRows = values.length;
	const avg = total.toNumber() / numRows;
	return Number(avg.toFixed(TWO_DECIMAL_PLACES));
}

function calculateSum(values: number[]): number {
	let total = new Decimal(0);
	values.forEach((num) => {
		total = total.add(new Decimal(num));
	});
	return Number(total.toFixed(TWO_DECIMAL_PLACES));
}
