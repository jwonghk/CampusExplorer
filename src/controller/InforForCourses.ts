import { InsightDataset, InsightDatasetKind, InsightError } from "./IInsightFacade";

const YEAR_NINETEEN_HUNDRED = 1900;

// Represents a single course section
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

	// Constructor to initialize a Section object
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

export default class InforForCourses {
	public idOfZipDatafile: string;
	public listOfSections: Section[];
	public insightDataset: InsightDataset;

	// Constructor to process and store all course sections from the parsed ZIP content
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

	// Method to iterate through courses and extract their sections
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

	// Check if the 'result' key exists in the parsed JSON content
	public checkIfResultKeyIsInTheParseJSON(aCourseInJSON: JSON): void {
		if (!Object.prototype.hasOwnProperty.call(aCourseInJSON, "result")) {
			throw new InsightError("result key is not found");
		}
	}

	// Extract a section from the parsed JSON and store it in the list of sections
	public returnASingleSection(sectionsArray: any): void {
		for (const aSection of sectionsArray.result) {
			this.checkingToSeeIfAllTenReqFieldsExist(aSection);

			const uuid = aSection.id.toString();
			const Course = aSection.Course;
			const Title = aSection.Title;
			const Professor = aSection.Professor;
			const Subject = aSection.Subject;
			const sectionField = aSection.Section;

			let Year: number;
			// Set the year based on whether it is "overall" or a specific year
			if (sectionField === "overall") {
				Year = YEAR_NINETEEN_HUNDRED;
			} else {
				Year = Number(aSection.Year);
			}

			const Avg = Number(aSection.Avg);
			const Pass = Number(aSection.Pass);
			const Fail = Number(aSection.Fail);
			const Audit = Number(aSection.Audit);

			// Create a new Section object and add it to the list of sections
			const section = new Section(uuid, Course, Title, Professor, Subject, Year, Avg, Pass, Fail, Audit);

			this.listOfSections.push(section);
		}
		// Update the number of rows in the dataset after adding sections
		this.insightDataset.numRows = this.listOfSections.length;
	}

	// Validate that the section contains all required fields
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
			Object.prototype.hasOwnProperty.call(aSingleSection, "Audit") &&
			Object.prototype.hasOwnProperty.call(aSingleSection, "Section")
		) {
			return;
		} else {
			throw new InsightError("A section doesn't have all 10 required fields!");
		}
	}
}
