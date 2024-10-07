import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
} from "./IInsightFacade";
import InforForCourses from "./InforForCourses";
import { AddAllCourses } from "./AddAllCourses";

const fs = require("fs-extra");

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	public datasetNameIDList: string[];
	public dataIDmap: Map<string, InforForCourses>;

	constructor() {
		this.dataIDmap = new Map<string, InforForCourses>();
		this.datasetNameIDList = [];

		//console.log("current dir: " + __dirname);
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		// TODO: Remove this once you implement the methods!
		//const funcProm: Promise<string[]> = new Promise<string[]>((res, rej) => {
		const courses = new AddAllCourses(this); // keep !!!
		try {
			this.checkConditionsForAdding(id, kind);
			await courses.AddAllCourse(id, content);
			const jsonFormat = JSON.stringify(this.dataIDmap.get(id));
			await this.WriteToPersistent(id, jsonFormat);
			return this.datasetNameIDList;
		} catch (error: any) {
			throw new InsightError("something wrong with AddAllcourses!" + error);
		}
	}

	public checkConditionsForAdding(id: string, kind: InsightDatasetKind): boolean {
		if (this.datasetNameIDList.includes(id)) {
			throw new InsightError("Data ID already exists!");
		} else if (id.includes(" ") || id.includes("_") || id === "") {
			throw new InsightError("Data ID contains space, underscore or empty");
		} else if (kind === InsightDatasetKind.Rooms) {
			throw new InsightError("InsightDatasetKind being Room is not allowed yet in c1!");
		} else {
			//console.log("Unique id added!");
			return true;
		}
	}

	private async WriteToPersistent(id: string, jsonData: string): Promise<any> {
		return new Promise((res, rej) => {
			fs.writeFile("data/" + id + ".json", jsonData, (err: any) => {
				if (err) {
					//console.log("in Persistent error");
					rej(err);
				} else {
					//console.log("WriteToPersistent runs!!!");
					res(jsonData);
				}
			});
		});
	}

	public async removeDataset(id: string): Promise<string> {
		// TODO: Remove this once you implement the methods!

		const filePath = "data/" + id + ".json";
		let storingResult: string[];
		//console.log("Inside removeDataset");
		return new Promise<string>((RemoveResolve, RemoveRej) => {
			if (!id || id.includes("_") || id.includes(" ")) {
				//console.log("Inside _ and space within removeDataset");
				return RemoveRej(new InsightError("Id null or ID including _ or space!"));
			} else if (!this.datasetNameIDList.includes(id)) {
				fs.unlink(filePath, (err: any, result: any) => {
					//console.log("Get inside fs.unlink!" + result);
					if (err) {
						return RemoveRej(new NotFoundError("Not in folder yet!"));
					} else {
						storingResult.push(result);
					}
				});
				const filePosition = this.datasetNameIDList.indexOf(id);
				delete this.datasetNameIDList[filePosition];
				this.dataIDmap.delete(id);
				return RemoveRej(new NotFoundError("Not yet added!"));
			}

			fs.unlink(filePath, (err: any) => {
				//console.log("Inside second fs.unlink");
				if (err) {
					//console.log("Not yet!");
					return RemoveRej(new NotFoundError("Not in folder!"));
				}
				const positionInList = this.datasetNameIDList.indexOf(id);
				//console.log("Position in list: " + positionInList);
				if (positionInList > -1) {
					this.datasetNameIDList.splice(positionInList, 1);
				}

				const index = this.datasetNameIDList.indexOf(id);
				delete this.datasetNameIDList[index];
				this.dataIDmap.delete(id);
				RemoveResolve(id);
			});

			//throw new Error(`InsightFacadeImpl::removeDataset() is unimplemented! - id=${id};`);
		});
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::performQuery() is unimplemented! - query=${query};`);
	}

	public async resolveListofData(): Promise<InsightDataset[]> {
		const insightDatasetArray: InsightDataset[] = [];
		let storingKey: string[];
		return new Promise((resolve, rej) => {
			try {
				for (const [key, value] of this.dataIDmap.entries()) {
					insightDatasetArray.push(value.insightDataset);
					storingKey.push(key);
				}
			} catch (err) {
				rej(err);
			}
			resolve(insightDatasetArray);
		});
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		return await this.resolveListofData();
	}
}
