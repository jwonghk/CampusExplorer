export abstract class ASTNode {}

export class LogicNode extends ASTNode {
	constructor(public operator: "AND" | "OR", public filters: ASTNode[]) {
		super();
	}
}

export class ComparatorNode extends ASTNode {
	constructor(public comparator: "LT" | "GT" | "EQ" | "IS", public key: string, public value: any) {
		super();
	}
}

export class NotNode extends ASTNode {
	constructor(public filter: ASTNode) {
		super();
	}
}
