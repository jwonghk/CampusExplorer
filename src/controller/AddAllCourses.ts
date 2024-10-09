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
		const zipFile = JSZip();
		const sectionsPromiseArray: Promise<string>[] = [];

		// Promise to handle the asynchronous processing of the ZIP file
		const promiseFunc: Promise<string[]> = new Promise<string[]>((res, rej) => {
			zipFile
				.loadAsync(contents, { base64: true })
				.then((zip: JSZip) => {
					// Access the 'courses' folder inside the ZIP
					const courseFolder = zip.folder("courses") || zip.folder("Courses");
					if (!courseFolder) {
						// Reject if 'courses' folder is not found
						return rej(new InsightError("Courses folder not found"));
					}
					// For each file in the 'courses' folder, read its content as a string
					courseFolder.forEach((_, fileContent) => sectionsPromiseArray.push(fileContent.async("string")));
					// Wait for all file contents to be read
					Promise.all(sectionsPromiseArray)
						.then((promise: string[]) => {
							// Create a new InforForCourses instance with the file contents
							const coursesData = new InforForCourses(id, promise);
							if (!coursesData.listOfSections.length) {
								return rej("No sections were added!");
							}
							// Store the courses data in the dataset
							this.insightfacade.dataIDmap.set(id, coursesData);
							this.insightfacade.datasetNameIDList.push(id);
							res(this.insightfacade.datasetNameIDList);
						})
						.catch(rej);
				})
				.catch((err) => rej(new InsightError("Error: " + err)));
		});
		return promiseFunc;
	}
}
