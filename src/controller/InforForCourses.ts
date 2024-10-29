// InforForCourses.ts

import { InsightDataset, InsightDatasetKind, InsightError } from "./IInsightFacade";

const YEAR_NINETEEN_HUNDRED = 1900;

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
		// console.log("Creating Section:", { id: this.id, title: this.title, instructor: this.instructor }); // Log section data
	}
}

export default class InforForCourses {
	public idOfZipDatafile: string;
	public listOfSections: Section[];
	public insightDataset: InsightDataset;

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

	private processCourses(coursesInZip: string[]): void {
		for (const courseContent of coursesInZip) {
			try {
				const courseData = JSON.parse(courseContent);
				// console.log("Processing Course Data:", courseData); // Log each course's raw data
				this.validateCourseData(courseData);
				this.extractSections(courseData);
			} catch (_err: any) {
				continue; // Skip invalid course files
			}
		}
		this.insightDataset.numRows = this.listOfSections.length;
	}

	private validateCourseData(courseData: any): void {
		if (!Object.prototype.hasOwnProperty.call(courseData, "result")) {
			throw new InsightError("Course data missing 'result' key");
		}
	}

	private extractSections(courseData: any): void {
		for (const sectionData of courseData.result) {
			if (this.isValidSection(sectionData)) {
				const section = new Section(sectionData);
				this.listOfSections.push(section);
			}
		}
	}

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
