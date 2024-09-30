import {
	IInsightFacade,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";
import { clearDisk, getContentFromArchives, loadTestQuery } from "../TestUtil";

import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";

use(chaiAsPromised);

export interface ITestQuery {
	title?: string;
	input: unknown;
	errorExpected: boolean;
	expected: any;
}

class Section {
	private readonly uuid: string;
	private readonly id: string;
	private readonly title: string;
	private readonly instructor: string;
	private readonly dept: string;

	private readonly year: number;
	private readonly avg: number;
	private readonly pass: number;
	private readonly fail: number;
	private readonly audit: number;

	constructor(
		uuid: string,
		Course: string,
		Title: string,
		Professor: string,
		Subject: string,
		Year: number,
		Avg: number,
		Pass: number,
		Fail: number,
		Audit: number
	) {
		this.uuid = uuid;
		this.id = Course;
		this.title = Title;
		this.instructor = Professor;
		this.dept = Subject;
		this.year = Year;
		this.avg = Avg;
		this.pass = Pass;
		this.fail = Fail;
		this.audit = Audit;
	}
}

describe("Describe for Add Dataset", function () {
	describe("addDataset", function () {
		let facade: InsightFacade;
		let sections: string;

		let anotherSections: string;
		let noSectionInside: string;
		let datwithEmptyFieldVal: string;

		beforeEach(async function () {
			try {
				sections = await getContentFromArchives("pair.zip");

				anotherSections = await getContentFromArchives("SmallerData.zip");

				noSectionInside = await getContentFromArchives("NothingInside.zip");
				datwithEmptyFieldVal = await getContentFromArchives("dataWithEmptyFieldVal.zip");
			} catch (err) {
				return expect(err).to.be.instanceOf(Error);
			}

			await clearDisk();
			facade = new InsightFacade();
		});


		it("This succesfully added a new Data", async function () {
			let result;
			try {
				result = await facade.addDataset(
					"pair",
					sections,
					InsightDatasetKind.Sections
				);
			} catch (err) {
				return expect(err).to.be.instanceOf(InsightError);
			}
			// this is wrong: return expect(result).to.be.deep.equal(["pair"]);
			return expect(result).to.deep.equal(["pair"]);
		});

		// this should success: add data with empty field value
		it("This should success: add data with empty field value", async function () {
			let result;
			try {
				result = await facade.addDataset(
					"data_with_emptyField_value",
					datwithEmptyFieldVal,
					InsightDatasetKind.Sections
				);
			} catch (err) {
				return expect(err).to.be.instanceOf(InsightError);
			}
			// this is wrong: return expect(result).to.be.deep.equal(["pair"]);
			return expect(result).to.deep.equal(["pair"]);
		});

		// fail: should fail because zip folder has nothing inside
		it("A zipfolder with nothing inside", async function () {
			try {
				await facade.addDataset(
					"nothingInside",
					noSectionInside,
					InsightDatasetKind.Sections
				);
			} catch (err) {
				return expect(err).to.be.instanceOf(InsightError);
			}
			expect.fail("Should have thrown an error above!");
		});

		it("use the wrong thing in the 3rd parameter of addDataset", async function () {
			try {
				await facade.addDataset(
					"nice_data",
					sections,
					InsightDatasetKind.Rooms
				);
			} catch (err) {
				return expect(err).to.be.instanceOf(InsightError);
			}

			return expect.fail("Should have failed above!");
		});

		// this should reject: "nosuchString" a string is used instead
		// of a base64 string gotten from the getContentFromArchives function
		it("should reject when section is called nosuchString", async function () {
			try {
				await facade.addDataset(
					"validId",
					"nosuchString",
					InsightDatasetKind.Sections
				);
			} catch (err) {
				return expect(err).to.be.instanceOf(InsightError);
			}

			return expect.fail("should have failed!");
		});

		// this reject: since id is empty
		it("should reject when dataset id is empty", async function () {
			try {
				await facade.addDataset("", sections, InsightDatasetKind.Sections);
			} catch (err) {
				return expect(err).to.be.instanceOf(InsightError);
			}

			return expect.fail("should have failed!");
		});

		// fail: because the id is an  _
		it("should reject because dataset name contains an underscore", async function () {

			try {
				await facade.addDataset("_", sections, InsightDatasetKind.Sections);
			} catch (err) {

				return expect(err).to.be.instanceOf(InsightError);
			}
			expect.fail("should have failed!");
		});

		// fail: because it contains _
		it("should reject because dataset name contains an underscore a_c", async function () {

			try {
				await facade.addDataset("a_c", sections, InsightDatasetKind.Sections);
			} catch (err) {
				return expect(err).to.be.instanceOf(InsightError);
			}
			expect.fail("should have failed above!");
		});

		// fail: because it contains space
		it("should reject because dataset name contains a space", async function () {

			try {
				await facade.addDataset(" ", sections, InsightDatasetKind.Sections);
			} catch (err) {
				return expect(err).to.be.be.instanceOf(Error);
			}
			expect.fail("Should have thrown an error above");
		});

		// fail, because ABC already exists
		it("ABC already exists", async function () {
			try {
				await facade.addDataset("ABC", sections, InsightDatasetKind.Sections);
				await facade.addDataset(
					"ABC",
					anotherSections,
					InsightDatasetKind.Sections
				);
			} catch (err) {
				return expect(err).to.be.instanceOf(InsightError);
			}
			expect.fail(
				"Should have failed because the data has been removed already."
			);
		});


	});
});

describe("Describe for Remove Dataset", function () {
	describe("RemoveDataset", function () {
		let facade: InsightFacade;
		let sections: string;
		before(async function () {
			sections = await getContentFromArchives("pair.zip");
		});

		beforeEach(async function () {
			await clearDisk();
			facade = new InsightFacade();
		});

		// Add a data, then remove it, and call remove again
		it("add data, remove data, remove again!", async function () {
			//let result;
			try {
				await facade.addDataset("data1", sections, InsightDatasetKind.Sections);
				await facade.removeDataset("data1");
				await facade.removeDataset("data1");
			} catch (err) {
				return expect(err).to.be.instanceOf(NotFoundError);
			}
			expect.fail("should failed above");
		});

		// Remove Successfully
		it("Removal Success!", async function () {
			await facade.addDataset("pairData", sections, InsightDatasetKind.Sections);
			const result = await facade.removeDataset("pairData");
			expect(result).to.contain("pairData");
		});

		// No data with such ID name exists, so should be rejected
		it("Need to be rejected since No data with the given id exists", async function () {
			//execution
			//let result;
			try {
				await facade.removeDataset("NOsuchDataName");
			} catch (err) {
				//wrong: expect(err).to.be.instanceOf(NotFoundError);
				return expect(err).to.be.instanceOf(NotFoundError);
			}
			//validation
			expect.fail("Not found error should have thrown!");
		});

		// trying to remove a data with an id that contains a underscore, should be rejected
		it("will be rejected because the dataset name given contains underscore", async function () {
			//let result;
			try {
				await facade.removeDataset("a_b");
			} catch (err) {
				//wrong: expect(err).to.be.instanceOf(InsightError);
				return expect(err).to.be.instanceOf(InsightError);
			}
			expect.fail("Should have thrown error above!!");
		});

		// trying to reject because dataset name is an empty
		it("will be rejected because the dataset name is empty", async function () {
			//let result;
			try {
				await facade.removeDataset("");
			} catch (err) {
				// wrong: expect(err).to.be.instanceOf(InsightError);
				return expect(err).to.be.instanceOf(InsightError);
			}
			expect.fail("Should have thrown error above!!");
		});

		// " " id with a space
		it("will be rejected because the dataset name is a space", async function () {
			//let result;
			try {
				await facade.removeDataset(" ");
			} catch (err) {
				return expect(err).to.be.instanceOf(InsightError);
			}
			expect.fail("Should have thrown error above!!");
		});
	});
});

describe("PerformQuery", function () {
	/**
	 * Loads the TestQuery specified in the test name and asserts the behaviour of performQuery.
	 *
	 * Note: the 'this' parameter is automatically set by Mocha and contains information about the test.
	 */

	let facade: IInsightFacade;

	// Declare datasets used in tests. You should add more datasets like this!
	let sections: string;
	let sections2: string;

	before(async function () {
		// This block runs once and loads the datasets.
		sections = await getContentFromArchives("pair.zip");
		sections2 = await getContentFromArchives("SmallerData.zip");
		// Just in case there is anything hanging around from a previous run of the test suite
		await clearDisk();
	});

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
		let result: InsightResult[];
		try {
			result = await facade.performQuery(input);
		} catch (err) {
			if (!errorExpected) {
				expect.fail(`performQuery threw unexpected error: ${err}`);
			}
			// wrong (i.e. without the return in front):
			// expect(errorExpected).to.be.equal(expected);
			// wrong : return expect(err).to.be.instanceOf(expected);
			let localExepctedError;
			if (expected === "InsightError") {
				localExepctedError = InsightError;
				return expect(err).to.be.instanceOf(localExepctedError);
			} else if (expected === "ResultTooLargeError") {
				localExepctedError = ResultTooLargeError;
				return expect(err).to.be.instanceOf(localExepctedError);
			} else if (expected === "NotFoundError") {
				localExepctedError = NotFoundError;
				return expect(err).to.be.instanceOf(localExepctedError);
			} else {
				return expect(err).to.be.instanceOf(Error);
			}
			//return expect(err).to.be.instanceOf(localExepctedError); //todo
		}
		if (errorExpected) {
			expect.fail(`performQuery resolved when it should have rejected with ${expected}`);
		}
		return expect(result).to.be.deep.equal(expected); //todo
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
	it("will be rejected because no valid object", async function () {
		//let result;
		try {
			await facade.performQuery("safd");
		} catch (err) {
			// wrong: expect(err).to.be.instanceOf(InsightError);
			return expect(err).to.be.instanceOf(InsightError);
		}
		expect.fail("Should have thrown error above!!");
	});
	it("[valid/valid_simple.json] SELECT dept, avg WHERE avg > 97", checkQuery);
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
	/*it(
		"[valid/valid_AND_LTzero_IScStarjson] valid_AND_LTzero_IScStar",
		checkQuery
	);*/
	it("[valid/valid_NOT_AND_GT0_LT100.json] valid_NOT_AND_GT0_LT100", checkQuery);
	it("[valid/valid_OR_GT_94_IS_phar.json] valid_OR_GT_94_IS_phar", checkQuery);
	it("[valid/valid_OR_GT_IS_cpsStar_LT.json] valid_OR_GT_IS_cpsStar_LT", checkQuery);

	it("[valid/valid_AND_GT0_IS_cpsSTAR_LT100.json] valid_AND_GT0_IS_cpsSTAR_LT100", checkQuery);
	it("[valid/valid_AND_GT84_IS_cstar_NoOrderSpecified.json] valid_AND_GT84_IS_cstar_NoOrderSpecified", checkQuery);
	it("[valid/valid_AND_GT95_IS_starYstar.json] valid_AND_GT95_IS_starYstar", checkQuery);
	it("[valid/valid_AND_GT97_IS_starhystar.json] valid_AND_GT97_IS_starhystar", checkQuery);
	it("[valid/valid_AND_GT100_IS_cStar.json] valid_AND_GT100_IS_cStar", checkQuery);

	it("[invalid/invalid.json], Query missing WHERE", checkQuery);
	it("[invalid/invalid_filter_key.json], invalid_filter_key", checkQuery);
	it("[invalid/invalid_filter_keyType.json], invalid_filter_keyType only", checkQuery);
	it("[invalid/invalid_IS_55shouldbeString.json], invalid_IS_55shouldbeString only", checkQuery);
	it("[invalid/invalid_logic_key_or.json], invalid_logic_key_or", checkQuery);

	it("[invalid/invalid_mkey_sect.json], invalid_mkey_sect", checkQuery);
	it("[invalid/invalid_mkey_section.json], invalid_mkey_section", checkQuery);
	it("[invalid/invalid_mkey_underScore_key.json], invalid_mkey_underScore_key", checkQuery);
	it("[invalid/invalid_mkey_underScore_key2.json], invalid_mkey_underScore_key2", checkQuery);

	it("[invalid/invalid_query_missUseColumns1.json], invalid_query_missUseColumns1", checkQuery);
	it("[invalid/invalid_query_missUseColumns2.json], invalid_query_missUseColumns2", checkQuery);
	it("[invalid/invalid_query_missUseColumns3.json], invalid_query_missUseColumns3", checkQuery);
	it("[invalid/invalid_query_missUseColumns4.json], invalid_query_missUseColumns4", checkQuery);
	it("[invalid/invalid_query_missUseColumns5.json], invalid_query_missUseColumns5", checkQuery);

	it("[invalid/invalid_wildCardUsages_abc_wc_IJK_wc.json], invalid_wildCardUsages_abc_wc_IJK_wc", checkQuery);
	it("[invalid/invalid_wildCardUsages_twoConsecAsterisk.json], invalid_wildCardUsages_twoConsecAsterisk", checkQuery);
	it("[invalid/invalid_wildCardUsages_twoConsecAsterisk2.json], invalid_wildCardUsages_twoConsecAsterisk2", checkQuery);
	it("[invalid/missing_columns.json], missing_columns", checkQuery);
	it("[invalid/morethan5000_returned.json], morethan5000_returned", checkQuery);

	it("[invalid/invalid_a_body_with_no_filter_matches_all_entries.json], missing_columns", checkQuery);
	it("[invalid/invalid_asterisk_as_FILTER.json], missing_columns", checkQuery);
	it("[invalid/invalid_oR_gt_is_lt_audit_dept_avg.json], missing_columns", checkQuery);
	it("[invalid/invalid_using_datasetname_id_that_has_underscore.json], missing_columns", checkQuery);
	it("[invalid/invalid_using_nonexistent_dataname_as_mkey.json], missing_columns", checkQuery);

	/*
	it(
		"[invalid/invalid_TheQuery_ISnotanObject.json], invalid_since_QueryNOTanObject",
		checkQuery
	);*/
});

// listing all existent dataset
describe("List all dataset", function (): void {
	let facade: InsightFacade;
	let courseJAPN314: string;
	let courseMATH541: string;

	before(async function () {
		courseJAPN314 = await getContentFromArchives("JAPN314.zip");
		courseMATH541 = await getContentFromArchives("MATH541.zip");
	});

	beforeEach(async function () {
		await clearDisk();
		facade = new InsightFacade();
	});

	it("test listing", async function () {
		// do I need try catch here???/
		await facade.addDataset("JAPN314", courseJAPN314, InsightDatasetKind.Sections);

		await facade.addDataset("MATH541", courseMATH541, InsightDatasetKind.Sections);

		const datasets = await facade.listDatasets();

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
	});
});
