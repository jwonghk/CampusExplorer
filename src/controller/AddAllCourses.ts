import { InsightError } from "./IInsightFacade";
import InsightFacade from "./InsightFacade";
import JSZip from "jszip";
import InforForCourses from "./InforForCourses";

export class AddAllCourses {
	private insightfacade: InsightFacade;

	constructor(insigFac: InsightFacade) {
		this.insightfacade = insigFac;
	}

	public async AddAllCourse(id: string, contents: string): Promise<string[]> {
		const zipFile = JSZip();
		const sectionsPromiseArray: Promise<string>[] = [];
		const promiseFunc: Promise<string[]> = new Promise<string[]>((res, rej) => {
			zipFile
				.loadAsync(contents, { base64: true })
				.then((zip: JSZip) => {
					const courseFolder = zip.folder("courses") || zip.folder("Courses");
					if (!courseFolder) {
						return rej(new InsightError("Courses folder not found"));
					}
					courseFolder.forEach((_, fileContent) => sectionsPromiseArray.push(fileContent.async("string")));
					Promise.all(sectionsPromiseArray)
						.then((promise: string[]) => {
							const coursesData = new InforForCourses(id, promise);
							if (!coursesData.listOfSections.length) {
								return rej("No sections were added!");
							}
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
