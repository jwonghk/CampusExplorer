// Abstract class representing a node in the AST (Abstract Syntax Tree)
export abstract class ASTNode {}

// LogicNode represents an AND or OR operation in the AST
export class LogicNode extends ASTNode {
	constructor(public operator: "AND" | "OR", public filters: ASTNode[]) {
		super();
	}
}

// ComparatorNode represents a comparison operation (LT, GT, EQ, IS) in the AST
export class ComparatorNode extends ASTNode {
	constructor(public comparator: "LT" | "GT" | "EQ" | "IS", public key: string, public value: any) {
		super();
	}
}

// NotNode represents a NOT operation in the AST, which negates the inner filter
export class NotNode extends ASTNode {
	constructor(public filter: ASTNode) {
		super();
	}
}
