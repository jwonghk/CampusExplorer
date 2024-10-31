import { InsightError } from "../controller/IInsightFacade";
import Decimal from "decimal.js";

const TWO_DECIMAL_PLACES = 2;

export function performAggregation(applyToken: string, values: any[]): any {
	switch (applyToken) {
		case "MAX": {
			const maxResult = Math.max(...values);
			return maxResult;
		}
		case "MIN": {
			const minResult = Math.min(...values);
			return minResult;
		}
		case "AVG": {
			const avgResult = calculateAverage(values);
			return avgResult;
		}
		case "SUM": {
			const sumResult = calculateSum(values);
			return sumResult;
		}
		case "COUNT": {
			const countResult = new Set(values).size;
			return countResult;
		}
		default:
			throw new InsightError(`Invalid APPLYTOKEN: ${applyToken}`);
	}
}

function calculateAverage(values: number[]): number {
	if (values.length === 0) {
		throw new InsightError("Cannot calculate average of empty set");
	}
	let total = new Decimal(0);
	values.forEach((num) => {
		total = total.add(new Decimal(num));
	});

	const numRows = values.length;
	const avg = total.toNumber() / numRows;
	const roundedAvg = Number(avg.toFixed(TWO_DECIMAL_PLACES));
	return roundedAvg;
}

function calculateSum(values: number[]): number {
	if (values.length === 0) {
		return 0;
	}
	let total = new Decimal(0);
	values.forEach((num) => {
		total = total.add(new Decimal(num));
	});

	const roundedSum = Number(total.toFixed(TWO_DECIMAL_PLACES));
	return roundedSum;
}
