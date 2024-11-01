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

	let buildingZip: string;
	let invalidHTMLZip: string;
	let missingIndexZip: string;
	let missingBuildingsZip: string;

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

		buildingZip = await getContentFromArchives("campus.zip");
		invalidHTMLZip = await getContentFromArchives("invalid_html.zip");
		missingIndexZip = await getContentFromArchives("missing_index.zip");
		missingBuildingsZip = await getContentFromArchives("missing_buildings.zip");

		// Just in case there is anything hanging around from a previous run of the test suite
		await clearDisk();

		const topLevelDir = path.resolve(__dirname, "../../data");

		fs.mkdir(topLevelDir, { recursive: true }, (err: any) => {
			if (err) {
				return err;
			}
		});
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

		it("should try to add two datasets: smallerData and MATH541", async function () {
			let result;

			try {
				result = await facade.addDataset("SmallerData", sections2, InsightDatasetKind.Sections);
				result = await facade.addDataset("MATH541Data", math541Sections, InsightDatasetKind.Sections);
			} catch (err) {
				return expect(err).to.be.instanceOf(InsightError);
			}
			return expect(result).to.be.deep.equal(["SmallerData", "MATH541Data"]);
		});

		it("should add a valid dataset and return the dataset id", async function () {
			try {
				const outputId = await facade.addDataset("foo", sections2, InsightDatasetKind.Sections);
				expect(outputId).to.deep.equal(["foo"]);
			} catch (err) {
				return expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should add a valid dataset and return the dataset", async function () {
			let result;
			try {
				result = await facade.addDataset("foo", sections2, InsightDatasetKind.Sections);
			} catch (err) {
				return expect(err).to.be.instanceOf(InsightError);
			}
			expect(result).to.deep.equal(["foo"]);
		});

		it("should reject with a duplicate dataset id", async function () {
			try {
				await facade.addDataset("foo", sections2, InsightDatasetKind.Sections);
				await facade.addDataset("foo", sections2, InsightDatasetKind.Sections);
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
				await facade.addDataset("foobar", sections2, InsightDatasetKind.Sections);
				await facade.addDataset("foobar", sections2, InsightDatasetKind.Rooms);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		// Rooms tests
		it("should add a valid rooms dataset and return the dataset id", async function () {
			try {
				const result = await facade.addDataset("rooms", buildingZip, InsightDatasetKind.Rooms);
				expect(result).to.deep.equal(["rooms"]);
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject adding a rooms dataset missing index.htm", async function () {
			try {
				await facade.addDataset("rooms", missingIndexZip, InsightDatasetKind.Rooms);
				expect.fail("Should have thrown an error");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject adding a rooms dataset with invalid HTML", async function () {
			try {
				await facade.addDataset("rooms", invalidHTMLZip, InsightDatasetKind.Rooms);
				expect.fail("Should have thrown an error");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should list datasets including the rooms dataset", async function () {
			try {
				await facade.addDataset("rooms", buildingZip, InsightDatasetKind.Rooms);
				const datasets = await facade.listDatasets();

				// Log the expected and actual values for debugging purposes
				const expectedDataset = {
					id: "rooms",
					kind: InsightDatasetKind.Rooms,
					numRows: 364,
				};
				expect(datasets).to.deep.include(expectedDataset);
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject adding a duplicate rooms dataset id", async function () {
			try {
				await facade.addDataset("rooms", buildingZip, InsightDatasetKind.Rooms);
				await facade.addDataset("rooms", buildingZip, InsightDatasetKind.Rooms);
				expect.fail("Should have thrown an error");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject adding a corrupted ZIP file", async function () {
			try {
				const corruptedZipContent = "Invalid base64 ZIP content";
				await facade.addDataset("corruptedRooms", corruptedZipContent, InsightDatasetKind.Rooms);
				expect.fail("Should have thrown an InsightError");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject adding a rooms dataset with malformed index.htm", async function () {
			try {
				await facade.addDataset("roomsMalformedIndex", invalidHTMLZip, InsightDatasetKind.Rooms);
				expect.fail("Should have thrown an InsightError");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject adding a rooms dataset with no building entries", async function () {
			try {
				await facade.addDataset("roomsNoBuildings", missingBuildingsZip, InsightDatasetKind.Rooms);
				expect.fail("Should have thrown an InsightError");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});
		it("should reject adding a rooms dataset with invalid building HTML content", async function () {
			try {
				await facade.addDataset("roomsInvalidBuildingHTML", invalidHTMLZip, InsightDatasetKind.Rooms);
				expect.fail("Should have thrown an InsightError");
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

		// Rooms tests
		it("should successfully remove a valid rooms dataset", async function () {
			try {
				await facade.addDataset("rooms", buildingZip, InsightDatasetKind.Rooms);
				const removedId = await facade.removeDataset("rooms");
				expect(removedId).to.equal("rooms");

				const datasets = await facade.listDatasets();
				expect(datasets).to.deep.equal([]);
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject removing a non-existent rooms dataset", async function () {
			try {
				await facade.removeDataset("rooms");
				expect.fail("Should have thrown an error");
			} catch (err) {
				expect(err).to.be.instanceOf(NotFoundError);
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
				await facade.addDataset("sampleDataset", sections2, InsightDatasetKind.Sections);
				const datasets = await facade.listDatasets();
				expect(datasets).to.deep.equal([
					{
						id: "sampleDataset",
						kind: InsightDatasetKind.Sections,
						numRows: 25,
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

		// Rooms tests
		it("should list datasets including both sections and rooms datasets", async function () {
			try {
				await facade.addDataset("sections2", sections2, InsightDatasetKind.Sections);
				await facade.addDataset("rooms", buildingZip, InsightDatasetKind.Rooms);

				const datasets = await facade.listDatasets();

				// Define and log expected datasets
				const expectedDatasets = [
					{
						id: "sections2",
						kind: InsightDatasetKind.Sections,
						numRows: 25,
					},
					{
						id: "rooms",
						kind: InsightDatasetKind.Rooms,
						numRows: 364,
					},
				];

				// Assertion with debugging log
				expect(datasets).to.deep.include.members(expectedDatasets);
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});
	});

	describe("Persistence", function () {
		it("should add a dataset and persist across InsightFacade instances", async function () {
			const facade1 = new InsightFacade();

			try {
				await facade1.addDataset("sections2", sections2, InsightDatasetKind.Sections);
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}

			const facade2 = new InsightFacade();

			try {
				const datasets = await facade2.listDatasets();
				expect(datasets).to.deep.equal([
					{
						id: "sections2",
						kind: InsightDatasetKind.Sections,
						numRows: 25,
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
				const removedId = await facade2.removeDataset("sections2");
				expect(removedId).to.equal("sections2");
			} catch (err) {
				expect.fail("Expected removeDataset to succeed, but it threw an error: " + err);
			}

			try {
				const datasets = await facade2.listDatasets();
				expect(datasets).to.deep.equal([]);
			} catch (err) {
				expect.fail("Expected listDatasets to succeed after removal, but it threw an error: " + err);
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
				// console.log("Expected Results:", expected);    // Log expected results
				// console.log("Actual Results:", result);        // Log actual results for comparison
				if (errorExpected) {
					expect.fail(`performQuery resolved when it should have rejected with ${expected}`);
				}

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
				facade.addDataset("rooms", buildingZip, InsightDatasetKind.Rooms),
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

		// Leo's query tests
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

		// John's query tests
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

		it("[invalid/invalid_IS_55shouldbeString.json] invalid_IS_55shouldbeString only", checkQuery);
		it("[invalid/invalid_mkey_underScore_key.json] invalid_mkey_underScore_key", checkQuery);
		it("[invalid/invalid_mkey_underScore_key2.json] invalid_mkey_underScore_key2", checkQuery);
		it("[invalid/invalid_query_missUseColumns1.json] invalid_query_missUseColumns1", checkQuery);
		it("[invalid/invalid_query_missUseColumns2.json] invalid_query_missUseColumns2", checkQuery);
		it("[invalid/invalid_query_missUseColumns3.json] invalid_query_missUseColumns3", checkQuery);
		it("[invalid/invalid_query_missUseColumns4.json] invalid_query_missUseColumns4", checkQuery);
		it("[invalid/invalid_query_missUseColumns5.json] invalid_query_missUseColumns5", checkQuery);
		it("[invalid/invalid_wildCardUsages_abc_wc_IJK_wc.json] invalid_wildCardUsages_abc_wc_IJK_wc", checkQuery);
		it("[invalid/invalid_wildCardUsages_twoConsecAsterisk.json] invalid_wildCardUsages_twoConsecAsterisk", checkQuery);
		it(
			"[invalid/invalid_wildCardUsages_twoConsecAsterisk2.json] invalid_wildCardUsages_twoConsecAsterisk2",
			checkQuery
		);
		it("[invalid/morethan5000_returned.json] morethan5000_returned", checkQuery);
		it("[invalid/invalid_a_body_with_no_filter_matches_all_entries.json] missing_columns", checkQuery);
		it("[invalid/invalid_oR_gt_is_lt_audit_dept_avg.json] missing_columns", checkQuery);
		it("[invalid/invalid_using_datasetname_id_that_has_underscore.json] missing_columns", checkQuery);
		it("[invalid/invalid_using_nonexistent_dataname_as_mkey.json] missing_columns", checkQuery);

		// additional InvalidQueries test cases
		it(
			"[invalid/invalid_CANNOT_query_more_than_one_dataset.json] Invalid: cannot query more than onedataset",
			checkQuery
		);
		it("[invalid/invalid_COLUMNS_IS_AN_EMPTY_ARRAY.json] Invalid: COLUMNS IS AN EMPTY ARRAY", checkQuery);
		it("[invalid/invalid_ORDER_type.json] Invalid:  ORDER TYPE invalid", checkQuery);
		it(
			"[invalid/invalid_RESULT_too_big_WHERE_matches_everything.json] Invalid: TOO_BIG result because WHERE clauses matches everything",
			checkQuery
		);
		it("[invalid/invalid_key_format_in_filter.json] Invalid key format in filter", checkQuery);
		it("[invalid/invalid_field_in_mcomparator.json] Invalid field in MCOMPARATOR", checkQuery);
		it("[invalid/string_in_mcomparator.json] Invalid type String in MComparator", checkQuery);
		it("[invalid/number_in_scomparator.json] Invalid type Number in SComparator", checkQuery);
		it("[invalid/invalid_wildcard_usage_is.json] Invalid wildcard usage in IS", checkQuery);
		it("[invalid/invalid_xor_logic_operator.json] Invalid XOR operator in logic", checkQuery);
		it("[invalid/invalid_null_where_filter.json] Invalid null WHERE filter", checkQuery);
		it("[invalid/missing_where_and_options.json] Missing WHERE and OPTIONS", checkQuery);
		it("[invalid/order_key_not_in_columns.json] ORDER key not in COLUMNS", checkQuery);
		it("[invalid/empty_strings_as_keys.json] Empty strings as keys", checkQuery);
		it("[invalid/extra_keys_as_comparator.json] Extra keys as comparator", checkQuery);
		it("[invalid/invalid_field_name.json] Invalid field name", checkQuery);
		it("[invalid/invalid_dataset_id.json] Invalid dataset id", checkQuery);
		it("[invalid/empty_id_string_in_key.json] Empty id string in key", checkQuery);
		it("[invalid/query_is_not_object.json] Query is not an object", checkQuery);
		it("[invalid/query_is_null.json] Query is null", checkQuery);
		it("[invalid/query_has_extra_keys.json] Query has extra keys", checkQuery);
		it("[invalid/options_not_an_object.json] OPTIONS is not an object", checkQuery);
		it("[invalid/non_object_in_mcomparator.json] Non-object in MCOMPARATOR", checkQuery);
		it("[invalid/boolean_in_mcomparator.json] Boolean in MCOMPARATOR", checkQuery);
		it("[invalid/reference_mulitple_datasets.json] Reference multiple datasets", checkQuery);
		it("[invalid/empty_columns_array.json] Empty COLUMNS array", checkQuery);

		// Room tests
		it("[valid/simpleRoomsQuery.json] Query rooms with seats greater than 150", checkQuery);
		it(
			"[valid/querySpecificRoomsWithOrdering.json] Query rooms in specific buildings with ordered results",
			checkQuery
		);
		it("[invalid/query_referencing_multiple_datasets.json] Query Referencing Multiple Datasets", checkQuery);

		// Query tests for latitude/longitude
		it("[valid/queryRoomsWithLatitudeGreaterThan49.json] Query Rooms with Latitude Greater Than 49", checkQuery);
		it("[valid/queryRoomsWithLongitudeLessThan-123.json] Query Rooms with Longitude Less Than -123", checkQuery);
		it("[valid/queryRoomsWithinAGeographicalArea.json] Query Rooms Within a Geographical Area", checkQuery);
		it(
			"[valid/queryRoomsIncludingLatitudeAndLongitudeInCOLUMNS.json] Query Rooms Including Latitude and Longitude in COLUMNS",
			checkQuery
		);
		it("[valid/queryUsingEQComparatorOnLatitude.json] Query Using EQ Comparator on Latitude", checkQuery);
		it(
			"[valid/queryRoomsCombiningGeolocationWithOtherFields.json] Query Rooms Combining Geolocation with Other Fields",
			checkQuery
		);
		it(
			"[valid/queryWithGeolocationFieldsInGROUPAndAPPLY.json] Query with Geolocation Fields in GROUP and APPLY",
			checkQuery
		);
		it("[valid/queryForNon-ExistentRoomAddress.json] Query for Non-Existent Room Address", checkQuery);

		it(
			"[invalid/query_invalid_latitude_longitude_field.json] Invalid Latitude/Longitude Query with Incorrect Field Name",
			checkQuery
		);
		it(
			"[invalid/query_latitiude_with_non_numeric_field.json] Query Using Non-Numeric Value for Latitude Field",
			checkQuery
		);

		// Query tests for aggregations
		it("[valid/aggregationQueryUsingAVG.json] Aggregation query using AVG", checkQuery);
		it("[valid/aggregationQueryUsingMAX.json] Aggregation query using MAX", checkQuery);
		it("[valid/aggregationQueryUsingMIN.json] Aggregation query using MIN", checkQuery);
		it("[valid/aggregationQueryUsingSUM.json] Aggregation query using SUM", checkQuery);
		it("[valid/aggregationQueryUsingCOUNT.json] Aggregation query using COUNT", checkQuery);
		it("[valid/aggregationQueryWithMultipleAPPLYRules.json] Aggregation query with multiple APPLY rules", checkQuery);
		it("[valid/queryReturningNoResults.json] Query returning no results", checkQuery);

		it("[invalid/aggregation_duplicate_applykey.json] Aggregation query with duplicate applykey", checkQuery);
		it("[invalid/aggregation_invalid_applytoken.json] Aggregation query with invalid APPLYTOKEN", checkQuery);
		it("[invalid/aggregation_missing_applytoken.json] Aggregation query missing APPLYTOKEN", checkQuery);
		it("[invalid/aggregation_missing_group_apply.json] Aggregation query missing GROUP and APPLY", checkQuery);
		it("[invalid/aggregation_nested_transformations.json] Aggregation query with nested TRANSFORMATIONS", checkQuery);
		it(
			"[invalid/aggregation_non_numeric_field.json] Aggregation query applying SUM on a non-numeric field",
			checkQuery
		);
		it("[invalid/aggregation_non_unique_applykeys.json] Aggregation query with non-unique apply keys", checkQuery);
		it("[invalid/aggregation_nonexistent_apply_key.json] Aggregation query with non-existent key in APPLY", checkQuery);
		it("[invalid/aggregation_nonexistent_group_key.json] Aggregation query with non-existent key in GROUP", checkQuery);
		it(
			"[invalid/aggregation_query_with_duplicate_apply_key.json] Aggregation query with duplicate applykey",
			checkQuery
		);
		it("[invalid/aggregation_query_with_empty_group_array.json] Aggregation query with empty GROUP array", checkQuery);
		it("[invalid/query_with_invalid_order_direction.json] Query with Invalid ORDER Direction", checkQuery);
		it("[invalid/query_with_order_key_not_in_column.json] Query with ORDER Keys Not in COLUMNS", checkQuery);
		it("[invalid/invalid_apply_token.json] Query with Invalid APPLY Token", checkQuery);
		it("[invalid/apply_on_non_numeric_field.json] Query Using APPLY on Non-Numeric Field", checkQuery);
		it("[invalid/query_with_duplicate_apply_keys.json] Query with Duplicate APPLY Keys", checkQuery);
		it("[invalid/query_with_invalid_group_key.json] Query with Invalid GROUP Key", checkQuery);
		it(
			"[invalid/query_with_order_key_not_in_column.json] Query Where COLUMNS Contains Keys Not in GROUP or APPLY",
			checkQuery
		);
		it("[invalid/query_with_apply_key_with_underscore.json] Query with APPLY Key Containing Underscore", checkQuery);
		it(
			"[invalid/query_with_missing_apply_in_transformations.json] Query with Missing APPLY in TRANSFORMATIONS",
			checkQuery
		);
		it("[invalid/query_with_invalid_applyrule.json] Query with Invalid APPLYRULE (Non-Object)", checkQuery);
		it(
			"[invalid/query_with_multiple_apply_tokens_in_applyrule.json] Query with Multiple APPLY Tokens in APPLYRULE",
			checkQuery
		);
		it("[invalid/query_with_invalid_applytoken_value.json] Query with Invalid APPLYTOKEN Value", checkQuery);
		it("[invalid/query_with_invalid_key_in_applyrule.json] Query with Invalid Key in APPLYRULE", checkQuery);
		it("[invalid/query_with_invalid_order_clause.json] Query with Invalid ORDER Clause (Missing dir)", checkQuery);
		it("[invalid/query_with_order_keys_not_array.json] Query with ORDER Keys Not an Array", checkQuery);
		it("[invalid/query_with_empty_keys_array_in_order.json] Query with Empty Keys Array in ORDER", checkQuery);
		it(
			"[invalid/query_with_order_clause_not_string_or_object.json] Query with ORDER Clause Not a String or Object",
			checkQuery
		);

		it(
			"[invalid/inval_ANDcase_aString_in_GT_for_rooms_longitude.json] Query with the AND using a string in GT for longit",
			checkQuery
		);
		it("[invalid/inval_applyRule_has2Keys.json] Query using apply rule with 2 keys", checkQuery);
		it(
			"[invalid/inval_key_inCOLUMNS_not_in_GROUP_or_APPLY.json] Query using keys in columns but not appearing in GROUP/APPLY",
			checkQuery
		);
		it(
			"[invalid/inval_key_sections_avgggggg_in_GROUP.json] Query using key with sections being avgggggg in GROUP",
			checkQuery
		);
		it("[invalid/inval_key_sections_bbbb_inSUM_inAPPLY.json] Query using key sections bbbbb in SUM", checkQuery);
		it(
			"[invalid/inval_ORcase_aString_in_GT_for_rooms_longitude.json] Query with the OR using a string in GT for longit",
			checkQuery
		);
		it("[invalid/inval_OrderDir.json] Query with an invalid Order Direction", checkQuery);
		it("[invalid/inval_orderDir_anNumber3.json] Query with an invalid Order Direction being a number 3", checkQuery);
		it(
			"[invalid/inval_orderDIR_containg2directions.json] Query with an invalid Order Direction that contains a array of directions",
			checkQuery
		);
		it(
			"[invalid/inval_roomslatString456.json] Query with an invalid rooms Latitude using a string called 456",
			checkQuery
		);
		it("[invalid/queryWithEmptyGroup.json] Query with Empty Group", checkQuery);
	});

	describe("Invalid Query Inputs", function () {
		it("should reject when query is null", async function () {
			const invalidQuery: any = null;
			try {
				await facade.performQuery(invalidQuery);
				expect.fail("Should have thrown InsightError");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject when query is a string", async function () {
			const invalidQuery: any = "This is not a valid query";
			try {
				await facade.performQuery(invalidQuery);
				expect.fail("Should have thrown InsightError");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject when query is a number", async function () {
			const invalidQuery: any = 12345;
			try {
				await facade.performQuery(invalidQuery);
				expect.fail("Should have thrown InsightError");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject when query is undefined", async function () {
			const invalidQuery: any = undefined;
			try {
				await facade.performQuery(invalidQuery);
				expect.fail("Should have thrown InsightError");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject when query is an array", async function () {
			const invalidQuery: any = [];
			try {
				await facade.performQuery(invalidQuery);
				expect.fail("Should have thrown InsightError");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject when query is an object missing WHERE and OPTIONS", async function () {
			const invalidQuery: any = {};
			try {
				await facade.performQuery(invalidQuery);
				expect.fail("Should have thrown InsightError");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject when query is missing WHERE", async function () {
			const invalidQuery: any = {
				OPTIONS: {
					COLUMNS: ["sections_dept", "sections_avg"],
				},
			};
			try {
				await facade.performQuery(invalidQuery);
				expect.fail("Should have thrown InsightError");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject when query is missing OPTIONS", async function () {
			const invalidQuery: any = {
				WHERE: {
					GT: {
						sections_avg: 90,
					},
				},
			};
			try {
				await facade.performQuery(invalidQuery);
				expect.fail("Should have thrown InsightError");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject when WHERE is not an object", async function () {
			const invalidQuery: any = {
				WHERE: "This is invalid",
				OPTIONS: {
					COLUMNS: ["sections_dept", "sections_avg"],
				},
			};
			try {
				await facade.performQuery(invalidQuery);
				expect.fail("Should have thrown InsightError");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject when query has invalid structure", async function () {
			const invalidQuery: any = {
				WHERE: {
					GT: null, // Invalid value for GT
				},
				OPTIONS: {
					COLUMNS: ["sections_dept", "sections_avg"],
				},
			};
			try {
				await facade.performQuery(invalidQuery);
				expect.fail("Should have thrown an InsightError");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject when query has extra top-level keys", async function () {
			const invalidQuery: any = {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["sections_dept", "sections_avg"],
				},
				EXTRA: "This should not be here",
			};
			try {
				await facade.performQuery(invalidQuery);
				expect.fail("Should have thrown an InsightError");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject when query is an invalid JSON string", async function () {
			const invalidQuery: any = "{ WHERE: { GT { sections_avg: 90 } } }"; // Malformed JSON string
			try {
				await facade.performQuery(invalidQuery);
				expect.fail("Should have thrown an InsightError");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});
	});
});
