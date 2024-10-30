import { InsightError } from "./IInsightFacade";
import InsightFacade from "./InsightFacade";
import JSZip from "jszip";
import InforForCourses from "./InforForCourses";
import * as fs from "fs-extra";
import * as path from "path";

export class AddAllCourses {
	private insightfacade: InsightFacade;
	private readonly DATA_DIR = "./data";

	constructor(insightFacade: InsightFacade) {
		this.insightfacade = insightFacade;
		// Ensure data directory exists
		fs.ensureDirSync(this.DATA_DIR);
	}

	public async AddAllCourse(id: string, contents: string): Promise<string[]> {
		const zipFile = new JSZip();
		const sectionsPromiseArray: Promise<string>[] = [];

		try {
			const zip = await zipFile.loadAsync(contents, { base64: true });
			const courseFolder = zip.folder("courses");

			if (!courseFolder) {
				throw new InsightError("Courses folder not found");
			}

			courseFolder.forEach((_, file) => {
				sectionsPromiseArray.push(file.async("string"));
			});

			const fileContents = await Promise.all(sectionsPromiseArray);
			const coursesData = new InforForCourses(id, fileContents);

			if (!coursesData.listOfSections.length) {
				throw new InsightError("No valid sections were added!");
			}

			// Update in-memory storage
			this.insightfacade.dataIDmap.set(id, coursesData);
			this.insightfacade.datasetNameIDList.push(id);

			// Persist to disk
			await this.persistDataset(id, coursesData);

			return this.insightfacade.datasetNameIDList;
		} catch (err) {
			if (err instanceof InsightError) {
				throw err;
			}
			throw new InsightError(`Failed to process dataset: ${err}`);
		}
	}

	private async persistDataset(id: string, data: InforForCourses): Promise<void> {
		try {
			const filePath = path.join(this.DATA_DIR, `${id}.json`);
			await fs.writeJSON(filePath, data, { spaces: 2 });
		} catch (err) {
			throw new InsightError(`Failed to persist dataset: ${err}`);
		}
	}
}
