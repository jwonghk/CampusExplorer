import {
	IInsightFacade,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";
import { clearDisk, getContentFromArchives, loadTestQuery } from "../TestUtil";

import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";

import path from "path";
const fs = require("fs-extra");
use(chaiAsPromised);

// const TWO_SPACE_COUNT = 2;

export interface ITestQuery {
	title?: string;
	input: unknown;
	errorExpected: boolean;
	expected: any;
}

describe("InsightFacade", function () {
	let facade: IInsightFacade;

	// Declare datasets used in tests. You should add more datasets like this!
	let sections: string;
	let sections2: string;
	let math541Sections: string;
	let emptyZip: string;
	let invalidZIP: string;
	let invalidJSONZip: string;
	let noCourseFolder: string;
	let missingResultKey: string;
	let courseJAPN314: string;
	let courseMATH541: string;

	before(async function () {
		// This block runs once and loads the datasets.
		sections = await getContentFromArchives("pair.zip");
		sections2 = await getContentFromArchives("SmallerData.zip");
		math541Sections = await getContentFromArchives("MATH541.zip");

		emptyZip = await getContentFromArchives("test_empty.zip");
		invalidZIP = await getContentFromArchives("invalid_zip.zip");
		invalidJSONZip = await getContentFromArchives("test_invalid_json.zip");
		noCourseFolder = await getContentFromArchives("test_no_course_folder.zip");
		missingResultKey = await getContentFromArchives("missing_result_key.zip");

		courseJAPN314 = await getContentFromArchives("JAPN314.zip");
		courseMATH541 = await getContentFromArchives("MATH541.zip");

		// Just in case there is anything hanging around from a previous run of the test suite
		await clearDisk();

		const topLevelDir = path.resolve(__dirname, "../../data");

		fs.mkdir(topLevelDir, { recursive: true }, (err: any) => {
			if (err) {
				return err;
			}
			//console.log("Directory created successfully!");
		});
		//console.log(topLevelDir);
	});

	describe("AddDataset", function () {
		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			facade = new InsightFacade();
		});

		afterEach(async function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one

			await clearDisk();
		});

		it("should reject with an empty dataset id", async function () {
			try {
				await facade.addDataset("", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		// this add 2 datasets
		it("This try to add two data set: smallerData and MATH541", async function () {
			let result;

			try {
				result = await facade.addDataset("SmallerData", sections2, InsightDatasetKind.Sections);
				result = await facade.addDataset("MATH541Data", math541Sections, InsightDatasetKind.Sections);
			} catch (err) {
				//console.log("Error: " + err);
				return expect(err).to.be.instanceOf(InsightError);
			}
			//console.log(result);
			return expect(result).to.be.deep.equal(["SmallerData", "MATH541Data"]);
		});

		// this add 1 data only : same as the test right below here
		it("should add a valid dataset and return the dataset id", async function () {
			try {
				const outputId = await facade.addDataset("foo", sections, InsightDatasetKind.Sections);
				expect(outputId).to.deep.equal(["foo"]);
			} catch (err) {
				return expect(err).to.be.instanceOf(InsightError);
			}
			//console.log(outputId);
		});

		// this add 1 dataset only
		it("should add a valid dataset and return the dataset", async function () {
			let result;
			try {
				result = await facade.addDataset("foo", sections, InsightDatasetKind.Sections);
			} catch (err) {
				return expect(err).to.be.instanceOf(InsightError);
			}
			expect(result).to.deep.equal(["foo"]);
		});

		it("should reject with a duplicate dataset id", async function () {
			try {
				await facade.addDataset("foo", sections, InsightDatasetKind.Sections);
				await facade.addDataset("foo", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject adding a dataset with null content", async function () {
			try {
				await facade.addDataset("foo", null as any, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject adding a dataset with an underscore in the id", async function () {
			try {
				await facade.addDataset("foo_bar", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject adding a dataset only whitespace in the id", async function () {
			try {
				await facade.addDataset("   ", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject adding a dataset not in base64", async function () {
			try {
				const invalidContent = "foobar";
				await facade.addDataset("foo", invalidContent, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject adding an empty zip dataset", async function () {
			try {
				await facade.addDataset("foobar", emptyZip, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject dataset with invalid JSON", async function () {
			try {
				await facade.addDataset("foobar", invalidJSONZip, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject adding a dataset without courses folder", async function () {
			try {
				await facade.addDataset("foobar", noCourseFolder, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject adding a dataset without the result key", async function () {
			try {
				await facade.addDataset("foobar", missingResultKey, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject zip file with invalid content", async function () {
			try {
				await facade.addDataset("foobar", invalidZIP, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject because of adding InsightDatasetKind of Rooms in C1", async function () {
			try {
				await facade.addDataset("dunbar", sections, InsightDatasetKind.Rooms);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject adding same dataset id with different kinds", async function () {
			try {
				await facade.addDataset("foobar", sections, InsightDatasetKind.Sections);
				await facade.addDataset("foobar", sections, InsightDatasetKind.Rooms);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});
	});

	describe("removeDataset", function () {
		beforeEach(function () {
			facade = new InsightFacade();
		});

		afterEach(async function () {
			await clearDisk();
		});

		it("should successfully remove a valid dataset", async function () {
			try {
				await facade.addDataset("sampleDataset", sections2, InsightDatasetKind.Sections);
				const removedId = await facade.removeDataset("sampleDataset");
				expect(removedId).to.equal("sampleDataset");

				const datasets = await facade.listDatasets();
				expect(datasets).to.deep.equal([]);
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject removing a dataset with id containing underscore _", async function () {
			try {
				await facade.removeDataset("foo_bar_nonexistent");
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject removing a dataset that doesn't exist", async function () {
			try {
				await facade.removeDataset("nonexistentID");
				expect.fail("Should have thrown above.");
			} catch (err) {
				//console.log("Inside the test case within removing data don't exist");
				expect(err).to.be.instanceOf(NotFoundError);
			}
		});

		it("should reject removing a dataset with an empty id", async function () {
			try {
				await facade.removeDataset("");
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject removing a dataset with an id that's only whitespace", async function () {
			try {
				await facade.removeDataset("   ");
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject removing a dataset with an id containing underscore", async function () {
			try {
				await facade.removeDataset("foo_bar");
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject removing a dataset with an id that is null", async function () {
			try {
				await facade.removeDataset(null as any);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});
	});

	describe("listDataset", function () {
		beforeEach(function () {
			facade = new InsightFacade();
		});

		afterEach(async function () {
			await clearDisk();
		});

		it("should list one added dataset", async function () {
			try {
				await facade.addDataset("sampleDataset", sections, InsightDatasetKind.Sections);
				const datasets = await facade.listDatasets();
				expect(datasets).to.deep.equal([
					{
						id: "sampleDataset",
						kind: InsightDatasetKind.Sections,
						numRows: 64612,
					},
				]);
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("test listing two datasets", async function () {
			let datasets;
			try {
				await facade.addDataset("JAPN314", courseJAPN314, InsightDatasetKind.Sections);

				await facade.addDataset("MATH541", courseMATH541, InsightDatasetKind.Sections);

				datasets = await facade.listDatasets();
				expect(datasets).to.deep.equal([
					{
						id: "JAPN314",
						kind: InsightDatasetKind.Sections,
						numRows: 10,
					},
					{
						id: "MATH541",
						kind: InsightDatasetKind.Sections,
						numRows: 8,
					},
				]);
			} catch (error) {
				expect(error).to.be.instanceOf(InsightError);
			}
		});
	});

	describe("Persistence", function () {
		it("should add a dataset and persist across InsightFacade instances", async function () {
			const facade1 = new InsightFacade();

			try {
				await facade1.addDataset("sections", sections, InsightDatasetKind.Sections);
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}

			const facade2 = new InsightFacade();

			try {
				const datasets = await facade2.listDatasets();
				expect(datasets).to.deep.equal([
					{
						id: "sections",
						kind: InsightDatasetKind.Sections,
						numRows: 64612,
					},
				]);
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should perform a query using the second instance", async function () {
			const facade2 = new InsightFacade();

			const query = {
				WHERE: {
					IS: {
						sections_dept: "cpsc",
					},
				},
				OPTIONS: {
					COLUMNS: ["sections_dept", "sections_avg"],
					ORDER: "sections_avg",
				},
			};

			try {
				const results = await facade2.performQuery(query);
				expect(results).to.be.an("array");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should remove the dataset and confirm it is no longer listed", async function () {
			const facade2 = new InsightFacade();

			try {
				const removedId = await facade2.removeDataset("sections");
				expect(removedId).to.equal("sections");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}

			try {
				const datasets = await facade2.listDatasets();
				expect(datasets).to.deep.equal([]);
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});
	});

	describe("PerformQuery", function () {
		/**
		 * Loads the TestQuery specified in the test name and asserts the behaviour of performQuery.
		 *
		 * Note: the 'this' parameter is automatically set by Mocha and contains information about the test.
		 */
		async function checkQuery(this: Mocha.Context): Promise<any> {
			if (!this.test) {
				throw new Error(
					"Invalid call to checkQuery." +
						"Usage: 'checkQuery' must be passed as the second parameter of Mocha's it(..) function." +
						"Do not invoke the function directly."
				);
			}
			// Destructuring assignment to reduce property accesses
			const { input, expected, errorExpected } = await loadTestQuery(this.test.title);
			let result: InsightResult[] = []; // dummy value before being reassigned

			try {
				result = await facade.performQuery(input);

				if (errorExpected) {
					expect.fail(`performQuery resolved when it should have rejected with ${expected}`);
				}

				// console.log("Expected:", JSON.stringify(expected, null, TWO_SPACE_COUNT));
				expect(result).to.be.an("array");
				expect(result).to.have.deep.members(expected);
			} catch (err) {
				if (!errorExpected) {
					expect.fail(`performQuery threw unexpected error: ${err}`);
				}

				expect(expected).to.be.oneOf(["ResultTooLargeError", "InsightError"]);
			}
		}

		before(async function () {
			facade = new InsightFacade();

			// Add the datasets to InsightFacade once.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises: Promise<string[]>[] = [
				facade.addDataset("sections", sections, InsightDatasetKind.Sections),
				facade.addDataset("sections2", sections2, InsightDatasetKind.Sections),
			];

			try {
				await Promise.all(loadDatasetPromises);
			} catch (err) {
				throw new Error(`In PerformQuery Before hook, dataset(s) failed to be added. \n${err}`);
			}
		});

		after(async function () {
			await clearDisk();
		});

		// Examples demonstrating how to test performQuery using the JSON Test Queries.
		// The relative path to the query file must be given in square brackets.
		it("[valid/simple.json] SELECT dept, avg WHERE avg > 97", checkQuery);
		it("[invalid/invalid.json] Query missing WHERE", checkQuery);

		// Leo's tests
		it("[valid/wildcard_at_start.json] Query wildcard at start", checkQuery);
		it("[valid/wildcard_at_end.json] Query wildcard at end", checkQuery);
		it("[valid/queryWildcardAtStartAndEnd.json] Query wildcard at start and end", checkQuery);
		it("[valid/query_with_and.json] Query with AND logic", checkQuery);
		it("[valid/query_with_and_or.json] Query with AND and OR logic", checkQuery);
		it("[valid/validQueryWithBODYAndOPTIONSValues.json] Valid query with BODY and OPTIONS values", checkQuery);
		it("[valid/validQueryWithMAndSCOMPARISON.json] Valid query with M and S COMPARISON", checkQuery);
		it("[valid/validQueryWithANDLogicRange.json] Valid query with AND logic range", checkQuery);
		it("[valid/validQueryWithNOTNegation.json] Valid query with NOT negation", checkQuery);
		it("[valid/empty_field.json] Query containing empty field", checkQuery);
		it("[valid/queryUsingEQOperator.json] Query using EQ operator", checkQuery);
		it("[valid/high_gt_filter.json] Query with high GT number value for filter", checkQuery);
		it("[valid/queryWithGTFilterOnSections_avg.json] Query with GT filter on sections_avg", checkQuery);
		it("[valid/queryWithEQFilterOnSections_pass.json] Query with EQ filter on sections_pass", checkQuery);
		it("[valid/validLongQuery.json] Valid long query", checkQuery);

		it("[invalid/wildcard_at_middle.json] Query wildcard in middle", checkQuery);
		it("[invalid/missing_options.json] Query missing OPTIONS", checkQuery);
		it("[invalid/missing_columns.json] Query missing COLUMNS", checkQuery);
		it("[invalid/dataset_too_large.json] Query with greater than 5000 results", checkQuery);
		it("[invalid/query_with_greater_than_5000_results.json] Query with greater than 5000 results", checkQuery);
		it("[invalid/invalid_mcomparator.json] Query with invalid MCOMPARATOR", checkQuery);
		it("[invalid/invalid_logic_operator.json] Query with invalid LOGIC operator", checkQuery);
		it("[invalid/invalid_missing_order.json] Query missing ORDER key", checkQuery);
		it("[invalid/invalid_where_filter.json] Query with invalid WHERE filter", checkQuery);
		it("[invalid/empty_and.json] Query with empty AND list", checkQuery);
		it("[invalid/nonexistent_dataset.json] Query referencing non-existent dataset", checkQuery);
		it("[invalid/multiple_datasets.json] Query referencing multiple datasets", checkQuery);
		it("[invalid/invalid_order.json] Query with invalid ORDER key", checkQuery);
		it("[invalid/empty_column.json] Query with no COLUMNS", checkQuery);
		it("[invalid/invalid_column.json] Query with invalid COLUMNS key", checkQuery);
		it("[invalid/empty_not.json] Query with empty NOT filter", checkQuery);
		it("[invalid/invalid_filter_key.json] Query with invalid filter key", checkQuery);
		it("[invalid/invalid_filter_type.json] Query with invalid filter type", checkQuery);
		it("[invalid/invalid_scomparator.json] Query with incorrect type for string field", checkQuery);
		it("[invalid/empty_or.json] Query with empty AND list", checkQuery);
		it("[invalid/empty_gt.json] Query with empty GT", checkQuery);
		it("[invalid/empty_lt.json] Query with empty LT", checkQuery);
		it("[invalid/empty_eq.json] Query with empty EQ", checkQuery);
		it("[invalid/empty_is.json] Query with empty IS", checkQuery);
		it("[invalid/empty_and_object.json] Query with empty AND object", checkQuery);
		it("[invalid/empty_or_object.json] Query with empty OR object", checkQuery);

		// John's tests
		it("[valid/valid_AND_GT_IS_LT.json] Svalid_AND_GT_IS_LT", checkQuery);
		it("[valid/valid_AND_GT_IS_cStar.json] valid_AND_GT_IS_cStar", checkQuery);
		it("[valid/valid_AND_GT_IS.json] valid_AND_GT_IS", checkQuery);
		it("[valid/valid_AND_GT_cStar.json] valid_AND_GT_cStar", checkQuery);
		it("[valid/valid_wildCard_Only_AND_GT_IS_LT.json] valid_wildCard_Only_AND_GT_IS_LT", checkQuery);
		it("[valid/valid_AND_GT_IS_LT_sections_audit.json] valid_AND_GT_IS_LT_sections_audit", checkQuery);
		it("[valid/valid_AND_GT_IS_LT_sections_fail.json] valid_AND_GT_IS_LT_sections_fail", checkQuery);
		it("[valid/valid_AND_GT_IS_LT_sections_id.json] valid_AND_GT_IS_LT_sections_id", checkQuery);
		it("[valid/valid_AND_GT_IS_LT_sections_instructor.json] valid_AND_GT_IS_LT_sections_instructor", checkQuery);
		it("[valid/valid_AND_GT_IS_LT_sections_pass.json] valid_AND_GT_IS_LT_sections_pass", checkQuery);
		it("[valid/valid_AND_GT_IS_LT_sections_title.json] valid_AND_GT_IS_LT_sections_title", checkQuery);
		it("[valid/valid_AND_GT_IS_LT_sections_uuid.json] valid_AND_GT_IS_LT_sections_uuid", checkQuery);
		it("[valid/valid_AND_GT_IS_LT_sections_year.json] valid_AND_GT_IS_LT_sections_year", checkQuery);
		it("[valid/valid_AND_GTNegative23_IS_starhYstar.json] valid_AND_GTNegative23_IS_starhYstar", checkQuery);
		it("[valid/valid_AND_GTNegative144_IS_overall.json] valid_AND_GTNegative144_IS_overall", checkQuery);
		it("[valid/valid_NOT_AND_GT0_LT100.json] valid_NOT_AND_GT0_LT100", checkQuery);
		it("[valid/valid_OR_GT_94_IS_phar.json] valid_OR_GT_94_IS_phar", checkQuery);
		it("[valid/valid_OR_GT_IS_cpsStar_LT.json] valid_OR_GT_IS_cpsStar_LT", checkQuery);
		it("[valid/valid_AND_GT0_IS_cpsSTAR_LT100.json] valid_AND_GT0_IS_cpsSTAR_LT100", checkQuery);
		it("[valid/valid_AND_GT84_IS_cstar_NoOrderSpecified.json] valid_AND_GT84_IS_cstar_NoOrderSpecified", checkQuery);
		it("[valid/valid_AND_GT95_IS_starYstar.json] valid_AND_GT95_IS_starYstar", checkQuery);
		it("[valid/valid_AND_GT97_IS_starhystar.json] valid_AND_GT97_IS_starhystar", checkQuery);
		it("[valid/valid_AND_GT100_IS_cStar.json] valid_AND_GT100_IS_cStar", checkQuery);

		it("[invalid/invalid_IS_55shouldbeString.json], invalid_IS_55shouldbeString only", checkQuery);
		it("[invalid/invalid_mkey_underScore_key.json], invalid_mkey_underScore_key", checkQuery);
		it("[invalid/invalid_mkey_underScore_key2.json], invalid_mkey_underScore_key2", checkQuery);
		it("[invalid/invalid_query_missUseColumns1.json], invalid_query_missUseColumns1", checkQuery);
		it("[invalid/invalid_query_missUseColumns2.json], invalid_query_missUseColumns2", checkQuery);
		it("[invalid/invalid_query_missUseColumns3.json], invalid_query_missUseColumns3", checkQuery);
		it("[invalid/invalid_query_missUseColumns4.json], invalid_query_missUseColumns4", checkQuery);
		it("[invalid/invalid_query_missUseColumns5.json], invalid_query_missUseColumns5", checkQuery);
		it("[invalid/invalid_wildCardUsages_abc_wc_IJK_wc.json], invalid_wildCardUsages_abc_wc_IJK_wc", checkQuery);
		it("[invalid/invalid_wildCardUsages_twoConsecAsterisk.json], invalid_wildCardUsages_twoConsecAsterisk", checkQuery);
		it(
			"[invalid/invalid_wildCardUsages_twoConsecAsterisk2.json], invalid_wildCardUsages_twoConsecAsterisk2",
			checkQuery
		);
		it("[invalid/morethan5000_returned.json], morethan5000_returned", checkQuery);
		it("[invalid/invalid_a_body_with_no_filter_matches_all_entries.json], missing_columns", checkQuery);
		it("[invalid/invalid_oR_gt_is_lt_audit_dept_avg.json], missing_columns", checkQuery);
		it("[invalid/invalid_using_datasetname_id_that_has_underscore.json], missing_columns", checkQuery);
		it("[invalid/invalid_using_nonexistent_dataname_as_mkey.json], missing_columns", checkQuery);
	});
});
