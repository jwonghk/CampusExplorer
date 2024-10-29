import { InsightError } from "../controller/IInsightFacade";
import Decimal from "decimal.js";

const TWO_DECIMAL_PLACES = 2;

export function performAggregation(applyToken: string, values: any[]): any {
    console.log("Performing Aggregation:", applyToken, "Values:", values); // Log operation and values

    switch (applyToken) {
        case "MAX": {
            const maxResult = Math.max(...values);
            console.log("MAX Result:", maxResult); // Log MAX result
            return maxResult;
        }
        case "MIN": {
            const minResult = Math.min(...values);
            console.log("MIN Result:", minResult); // Log MIN result
            return minResult;
        }
        case "AVG": {
            const avgResult = calculateAverage(values);
            console.log("AVG Result:", avgResult); // Log AVG result
            return avgResult;
        }
        case "SUM": {
            const sumResult = calculateSum(values);
            console.log("SUM Result:", sumResult); // Log SUM result
            return sumResult;
        }
        case "COUNT": {
            const countResult = new Set(values).size;
            console.log("COUNT Result:", countResult); // Log COUNT result
            return countResult;
        }
        default:
            throw new InsightError(`Invalid APPLYTOKEN: ${applyToken}`);
    }
}

function calculateAverage(values: number[]): number {
    console.log("Calculating Average, Values:", values); // Log values for average calculation
    let total = new Decimal(0);
    values.forEach((num) => {
        total = total.add(new Decimal(num));
    });
    const numRows = new Decimal(values.length);
    const avg = total.dividedBy(numRows);
    const roundedAvg = Number(avg.toFixed(TWO_DECIMAL_PLACES));
    console.log("Calculated Average:", roundedAvg); // Log calculated average
    return roundedAvg;
}


function calculateSum(values: number[]): number {
    console.log("Calculating Sum, Values:", values); // Log values for sum calculation
    let total = new Decimal(0);
    values.forEach((num) => {
        total = total.add(new Decimal(num));
    });
    const roundedSum = Number(total.toFixed(TWO_DECIMAL_PLACES));
    console.log("Calculated Sum:", roundedSum); // Log calculated sum
    return roundedSum;
}
