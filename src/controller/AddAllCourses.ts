import { InsightError } from "./IInsightFacade";
import InsightFacade from "./InsightFacade";
import JSZip from "jszip";
import InforForCourses from "./InforForCourses";

// Class responsible for adding all courses from a ZIP file to the dataset
export class AddAllCourses {
	private insightfacade: InsightFacade;

	constructor(insigFac: InsightFacade) {
		this.insightfacade = insigFac;
	}

	// Method to add all courses from the provided ZIP content
	public async AddAllCourse(id: string, contents: string): Promise<string[]> {
		// Validate the dataset ID (must be non-empty, no underscore, and not contain only whitespace)
		if (!id || id.includes("_") || id.trim() === "") {
			throw new InsightError("Invalid dataset ID: must not contain underscores, spaces, or be empty");
		}

		// Validate the content (check if base64 and non-empty)
		if (!contents || contents.trim() === "") {
			throw new InsightError("Dataset content cannot be empty");
		}

		try {
			// Attempt to load ZIP content, reject if not base64 or corrupt
			const zipFile = await JSZip.loadAsync(contents, { base64: true });
			const courseFolder = zipFile.folder("courses");
			if (!courseFolder) {
				throw new InsightError("Courses folder not found in ZIP");
			}

			// Extract files and read contents
			const sectionsPromiseArray: Promise<string>[] = [];
			courseFolder.forEach((_, file) => {
				sectionsPromiseArray.push(file.async("string"));
			});

			const fileContents = await Promise.all(sectionsPromiseArray);
			const coursesData = new InforForCourses(id, fileContents);

			// Ensure valid sections were added
			if (!coursesData.listOfSections.length) {
				throw new InsightError("No valid sections found in dataset");
			}

			// Store dataset in memory and list, then persist to disk
			this.insightfacade.dataIDmap.set(id, coursesData);
			this.insightfacade.datasetNameIDList.push(id);

			// Persist data to disk
			await this.insightfacade.writeToPersistent(id, JSON.stringify(coursesData));
			return this.insightfacade.datasetNameIDList;
		} catch (err: any) {
			// Provide detailed error message depending on the failure
			throw new InsightError("Failed to add dataset: " + (err.message || "Unknown error"));
		}
	}
}
