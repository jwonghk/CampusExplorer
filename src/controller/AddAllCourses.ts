import { InsightError } from "./IInsightFacade";
import InsightFacade from "./InsightFacade";
import JSZip from "jszip";
import InforForCourses from "./InforForCourses";

// Class responsible for adding all courses from a ZIP file to the dataset
export class AddAllCourses {
	private insightfacade: InsightFacade;

	constructor(insightFacade: InsightFacade) {
		this.insightfacade = insightFacade;
	}

	// Method to add all courses from the provided ZIP content
	public async AddAllCourse(id: string, contents: string): Promise<string[]> {
		const zipFile = new JSZip();
		const sectionsPromiseArray: Promise<string>[] = [];

		return new Promise<string[]>((res, rej) => {
			zipFile
				.loadAsync(contents, { base64: true })
				.then((zip: JSZip) => {
					const courseFolder = zip.folder("courses");
					if (!courseFolder) {
						return rej(new InsightError("Courses folder not found"));
					}
					courseFolder.forEach((_, file) => {
						sectionsPromiseArray.push(file.async("string"));
					});
					Promise.all(sectionsPromiseArray)
						.then((fileContents: string[]) => {
							const coursesData = new InforForCourses(id, fileContents);
							if (!coursesData.listOfSections.length) {
								return rej(new InsightError("No valid sections were added!"));
							}
							this.insightfacade.dataIDmap.set(id, coursesData);
							this.insightfacade.datasetNameIDList.push(id);
							res(this.insightfacade.datasetNameIDList);
						})
						.catch(rej);
				})
				.catch((err) => rej(new InsightError("Error loading ZIP file: " + err)));
		});
	}
}
