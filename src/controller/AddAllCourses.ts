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
		let coursesData: InforForCourses;
		const sectionsPromiseArray = Array<Promise<string>>();
		const filePath: string[] = [];
		const promiseFunc: Promise<string[]> = new Promise<string[]>((res, rej) => {
			zipFile
				.loadAsync(contents, { base64: true })
				.then((zip: JSZip) => {
					zip.folder("courses")?.forEach(function (filePathInsideZip, fileContent) {
						sectionsPromiseArray.push(fileContent.async("string"));
						filePath.push(filePathInsideZip);
					});
					Promise.all(sectionsPromiseArray)
						.then((promise: string[]) => {
							coursesData = new InforForCourses(id, promise);
							//console.log("the length of coursesData listofs[0] : " + coursesData.listOfSections[0].dept);
							if (coursesData.listOfSections.length === 0) {
								rej("No sections were added!");
							}
						})
						.then(() => {
							this.insightfacade.dataIDmap.set(id, coursesData);
							//console.log(this.insightfacade.dataIDmap.get(id));
							this.insightfacade.datasetNameIDList.push(id);
							//console.log("ID List: " + this.insightfacade.datasetNameIDList );
							res(this.insightfacade.datasetNameIDList);
						})
						.catch((err) => {
							rej(err);
						});
				})
				.catch((err: any) => {
					return rej(new InsightError("something wrong!" + err));
				});
		});
		//console.log("PromiseFunc ret!");
		return promiseFunc;
	}
}
