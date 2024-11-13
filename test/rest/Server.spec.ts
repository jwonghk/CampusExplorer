import { expect } from "chai";
import request, { Response } from "supertest";
import { StatusCodes } from "http-status-codes";
import Log from "@ubccpsc310/folder-test/build/Log";
import Server from "../../src/rest/Server";
import fs from "fs";
import path from "path";

const SERVER_NUM = 4321;

describe("Facade C3", function () {
	let server: Server;
	const SERVER_URL = `http://localhost:${SERVER_NUM}`;

	before(async function () {
		Log.info("Starting Server");
		server = new Server(SERVER_NUM);
		try {
			await server.start();
		} catch (err) {
			Log.error(`Failed to start server: ${err}`);
		}
	});

	after(async function () {
		Log.info("Stopping Server");
		try {
			await server.stop();
		} catch (err) {
			Log.error(`Failed to stop server: ${err}`);
		}
	});

	beforeEach(function () {
		Log.test("Starting test");
	});

	afterEach(function () {
		Log.test("Test completed");
	});

	// Sample on how to format PUT requests
	it("PUT test for valid dataset (sections)", async function () {
		const ENDPOINT_URL = "/dataset/sections/sections";
		const datasetPath = path.join(__dirname, "../resources/archives/pair.zip");

		try {
			const zipFileData = await fs.promises.readFile(datasetPath);
			await request(SERVER_URL)
				.put(ENDPOINT_URL)
				.send(zipFileData)
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: Response) {
					Log.trace(`Response: ${JSON.stringify(res.body)}`);
					expect(res.status).to.equal(StatusCodes.OK);
					expect(res.body).to.have.property("result");
					expect(res.body.result).to.be.an("array");
				})
				.catch(function (err) {
					Log.error(`Error: ${err}`);
					expect.fail();
				});
		} catch (err) {
			Log.error(`Error reading dataset file: ${err}`);
			expect.fail();
		}
	});

	// Test for PUT /dataset/:id/:kind with invalid data
	it("PUT test with invalid dataset (should fail)", async function () {
		const ENDPOINT_URL = "/dataset/invalid/sections";
		const invalidData = Buffer.from("Invalid zip data");

		await request(SERVER_URL)
			.put(ENDPOINT_URL)
			.send(invalidData)
			.set("Content-Type", "application/x-zip-compressed")
			.then(function (res: Response) {
				Log.trace(`Response: ${JSON.stringify(res.body)}`);
				expect(res.status).to.equal(StatusCodes.BAD_REQUEST);
				expect(res.body).to.have.property("error");
			})
			.catch(function (err) {
				Log.error(`Error: ${err}`);
				expect.fail();
			});
	});

	// Test for DELETE /dataset/:id with existing dataset
	it("DELETE test for existing dataset (should succeed)", async function () {
		const ENDPOINT_URL = "/dataset/sections";
		const datasetPath = path.join(__dirname, "../resources/archives/pair.zip");

		try {
			// Ensure dataset exists before deletion
			const zipFileData = await fs.promises.readFile(datasetPath);
			await request(SERVER_URL)
				.put("/dataset/sections/sections")
				.send(zipFileData)
				.set("Content-Type", "application/x-zip-compressed");

			await request(SERVER_URL)
				.delete(ENDPOINT_URL)
				.then(function (res: Response) {
					Log.trace(`Response: ${JSON.stringify(res.body)}`);
					expect(res.status).to.equal(StatusCodes.OK);
					expect(res.body).to.have.property("result");
				})
				.catch(function (err) {
					Log.error(`Error: ${err}`);
					expect.fail();
				});
		} catch (err) {
			Log.error(`Error in DELETE test: ${err}`);
			expect.fail();
		}
	});

	// Test for DELETE /dataset/:id with non-existing dataset
	it("DELETE test for non-existing dataset (should fail with 404)", async function () {
		const ENDPOINT_URL = "/dataset/nonexistent";

		await request(SERVER_URL)
			.delete(ENDPOINT_URL)
			.then(function (res: Response) {
				Log.trace(`Response: ${JSON.stringify(res.body)}`);
				expect(res.status).to.equal(StatusCodes.NOT_FOUND);
				expect(res.body).to.have.property("error");
			})
			.catch(function (err) {
				Log.error(`Error: ${err}`);
				expect.fail();
			});
	});

	// Test for POST /query with a valid query
	it("POST test for valid query (should succeed)", async function () {
		const ENDPOINT_URL = "/query";
		const validQuery = {
			WHERE: {
				GT: {
					sections_avg: 90,
				},
			},
			OPTIONS: {
				COLUMNS: ["sections_dept", "sections_avg"],
				ORDER: "sections_avg",
			},
		};
		const datasetPath = path.join(__dirname, "../resources/archives/pair.zip");

		try {
			// Ensure dataset exists before querying
			const zipFileData = await fs.promises.readFile(datasetPath);
			await request(SERVER_URL)
				.put("/dataset/sections/sections")
				.send(zipFileData)
				.set("Content-Type", "application/x-zip-compressed");

			await request(SERVER_URL)
				.post(ENDPOINT_URL)
				.send(validQuery)
				.set("Content-Type", "application/json")
				.then(function (res: Response) {
					Log.trace(`Response: ${JSON.stringify(res.body)}`);
					expect(res.status).to.equal(StatusCodes.OK);
					expect(res.body).to.have.property("result");
					expect(res.body.result).to.be.an("array");
				})
				.catch(function (err) {
					Log.error(`Error: ${err}`);
					expect.fail();
				});
		} catch (err) {
			Log.error(`Error in POST test: ${err}`);
			expect.fail();
		}
	});

	// Test for POST /query with an invalid query
	it("POST test for invalid query (should fail with 400)", async function () {
		const ENDPOINT_URL = "/query";
		const invalidQuery = {
			WHERE: {},
			OPTIONS: {},
		};

		await request(SERVER_URL)
			.post(ENDPOINT_URL)
			.send(invalidQuery)
			.set("Content-Type", "application/json")
			.then(function (res: Response) {
				Log.trace(`Response: ${JSON.stringify(res.body)}`);
				expect(res.status).to.equal(StatusCodes.BAD_REQUEST);
				expect(res.body).to.have.property("error");
			})
			.catch(function (err) {
				Log.error(`Error: ${err}`);
				expect.fail();
			});
	});

	// Test for GET /datasets to list added datasets
	it("GET test for list of datasets", async function () {
		const ENDPOINT_URL = "/datasets";
		const datasetPath = path.join(__dirname, "../resources/archives/pair.zip");

		try {
			// Ensure dataset exists before listing
			const zipFileData = await fs.promises.readFile(datasetPath);
			await request(SERVER_URL)
				.put("/dataset/sections/sections")
				.send(zipFileData)
				.set("Content-Type", "application/x-zip-compressed");

			await request(SERVER_URL)
				.get(ENDPOINT_URL)
				.then(function (res: Response) {
					Log.trace(`Response: ${JSON.stringify(res.body)}`);
					expect(res.status).to.equal(StatusCodes.OK);
					expect(res.body).to.have.property("result");
					expect(res.body.result).to.be.an("array");
					expect(res.body.result).to.deep.include({
						id: "sections",
						kind: "sections",
						numRows: res.body.result[0].numRows, // numRows may vary
					});
				})
				.catch(function (err) {
					Log.error(`Error: ${err}`);
					expect.fail();
				});
		} catch (err) {
			Log.error(`Error in GET test: ${err}`);
			expect.fail();
		}
	});

	// The other endpoints work similarly. You should be able to find all instructions in the supertest documentation
});
