import { InsightDataset, InsightDatasetKind, InsightError } from "./IInsightFacade";

export class Section {
	public readonly uuid: string;
	public readonly id: string;
	public readonly title: string;
	public readonly instructor: string;
	public readonly dept: string;

	public readonly year: number;
	public readonly avg: number;
	public readonly pass: number;
	public readonly fail: number;
	public readonly audit: number;

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

export class InforForCourses {
	public idOfZipDatafile: string;
	public listOfSections: Section[];
	public insightDataset: InsightDataset;

	constructor(id: string, coursesArrayInZip: string[]) {
		this.idOfZipDatafile = id;
		this.listOfSections = [];
		this.insightDataset = {
			id: id,
			numRows: this.listOfSections.length,
			kind: InsightDatasetKind.Sections,
		};
		this.GetallSectionsAcrossEachCourse(coursesArrayInZip);
	}

	public GetallSectionsAcrossEachCourse(coursesInZip: string[]): void {
		for (const aCourse of coursesInZip) {
			let allSectionsWithinACourse: JSON;
			try {
				allSectionsWithinACourse = JSON.parse(aCourse);
				this.checkIfResultKeyIsInTheParseJSON(allSectionsWithinACourse);
				this.returnASingleSection(allSectionsWithinACourse);
			} catch (err: any) {
				throw new InsightError(err);
			}
		}
	}

	public checkIfResultKeyIsInTheParseJSON(aCourseInJSON: JSON): void {
		if (Object.prototype.hasOwnProperty.call(aCourseInJSON, "result")) {
			//console.log("Yes, the course in JSON has the 'result' key");
		} else {
			throw new InsightError("result key is not founded");
		}
	}

	public returnASingleSection(sectionsArray: any): void {
		for (const aSection in sectionsArray.result) {
			//this.checkingToSeeIfAllTenReqFieldsExist(sectionsArray.result[aSection]);

			const uuid = sectionsArray.result[aSection].id;
			const Course = sectionsArray.result[aSection].Course;
			const Title = sectionsArray.result[aSection].Title;
			const Professor = sectionsArray.result[aSection].Professor;
			const Subject = sectionsArray.result[aSection].Subject;
			const Year = sectionsArray.result[aSection].Year;
			const Avg = sectionsArray.result[aSection].Avg;
			const Pass = sectionsArray.result[aSection].Pass;
			const Fail = sectionsArray.result[aSection].Fail;
			const Audit = sectionsArray.result[aSection].Audit;
			const section = new Section(uuid, Course, Title, Professor, Subject, Year, Avg, Pass, Fail, Audit);
			this.listOfSections.push(section);
		}
		this.insightDataset.numRows = this.listOfSections.length;
	}

	public checkingToSeeIfAllTenReqFieldsExist(aSingleSection: any): void {
		if (
			Object.prototype.hasOwnProperty.call(aSingleSection, "id") &&
			Object.prototype.hasOwnProperty.call(aSingleSection, "Course") &&
			Object.prototype.hasOwnProperty.call(aSingleSection, "Title") &&
			Object.prototype.hasOwnProperty.call(aSingleSection, "Professor") &&
			Object.prototype.hasOwnProperty.call(aSingleSection, "Subject") &&
			Object.prototype.hasOwnProperty.call(aSingleSection, "Year") &&
			Object.prototype.hasOwnProperty.call(aSingleSection, "Avg") &&
			Object.prototype.hasOwnProperty.call(aSingleSection, "Pass") &&
			Object.prototype.hasOwnProperty.call(aSingleSection, "Fail") &&
			Object.prototype.hasOwnProperty.call(aSingleSection, "Audit")
		) {
			//console.log("This section has all required field!");
			return;
		} else {
			throw new InsightError("A section doesn't have all 10 required fields!");
		}
	}
}
