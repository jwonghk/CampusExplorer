import { InsightDataset, InsightDatasetKind, InsightError } from "./IInsightFacade";

const YEAR_NINETEEN_HUNDRED = 1900;

// Represents an individual course section, storing details such as ID, instructor, average grade, etc.
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

	// Initializes the section with data, handling both raw parsed data and deserialized data from disk
	constructor(aSection: any) {
		if ("uuid" in aSection && "id" in aSection && "title" in aSection) {
			// Deserialized data from disk
			this.uuid = aSection.uuid;
			this.id = aSection.id;
			this.title = aSection.title;
			this.instructor = aSection.instructor;
			this.dept = aSection.dept;
			this.year = aSection.year;
			this.avg = aSection.avg;
			this.pass = aSection.pass;
			this.fail = aSection.fail;
			this.audit = aSection.audit;
		} else {
			// Raw data from parsing course data
			const sectionFields: any = {};
			for (const key in aSection) {
				if (Object.prototype.hasOwnProperty.call(aSection, key)) {
					sectionFields[key.toLowerCase()] = aSection[key];
				}
			}

			this.uuid = sectionFields.id.toString();
			this.id = sectionFields.course;
			this.title = sectionFields.title;
			this.instructor = sectionFields.professor;
			this.dept = sectionFields.subject;

			const sectionField = sectionFields.section;
			this.year = sectionField === "overall" ? YEAR_NINETEEN_HUNDRED : Number(sectionFields.year);

			this.avg = Number(sectionFields.avg);
			this.pass = Number(sectionFields.pass);
			this.fail = Number(sectionFields.fail);
			this.audit = Number(sectionFields.audit);
		}
	}
}

// Manages course information for a given dataset, handling dataset ID, sections, and metadata
export default class InforForCourses {
	public idOfZipDatafile: string;
	public listOfSections: Section[];
	public insightDataset: InsightDataset;

	// Initializes the dataset with an ID and an array of course content strings in the zip file
	constructor(id: string, coursesArrayInZip: string[]) {
		this.idOfZipDatafile = id;
		this.listOfSections = [];
		this.insightDataset = {
			id: id,
			numRows: 0,
			kind: InsightDatasetKind.Sections,
		};
		this.processCourses(coursesArrayInZip);
	}

	// Processes each course file content in the dataset, extracting and validating sections
	private processCourses(coursesInZip: string[]): void {
		for (const courseContent of coursesInZip) {
			try {
				const courseData = JSON.parse(courseContent);
				this.validateCourseData(courseData);
				this.extractSections(courseData);
			} catch (_err: any) {
				continue; // Skip invalid course files
			}
		}
		this.insightDataset.numRows = this.listOfSections.length;
	}

	// Validates that course data contains a 'result' key to proceed with processing
	private validateCourseData(courseData: any): void {
		if (!Object.prototype.hasOwnProperty.call(courseData, "result")) {
			throw new InsightError("Course data missing 'result' key");
		}
	}

	// Extracts valid sections from course data, adding them to the list of sections
	private extractSections(courseData: any): void {
		for (const sectionData of courseData.result) {
			if (this.isValidSection(sectionData)) {
				const section = new Section(sectionData);
				this.listOfSections.push(section);
			}
		}
	}

	// Checks if section data includes all necessary fields for a valid section
	private isValidSection(sectionData: any): boolean {
		const requiredFields = [
			"id",
			"Course",
			"Title",
			"Professor",
			"Subject",
			"Year",
			"Avg",
			"Pass",
			"Fail",
			"Audit",
			"Section",
		];
		return requiredFields.every((field) => Object.prototype.hasOwnProperty.call(sectionData, field));
	}
}
