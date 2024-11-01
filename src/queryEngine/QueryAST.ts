export abstract class ASTNode {}

const SPLIT_KEY_NUM = 2;

// Represents a logical operation node with an operator (AND/OR) and an array of filters (sub-nodes)
export class LogicNode extends ASTNode {
	constructor(public operator: "AND" | "OR", public filters: ASTNode[]) {
		super();
	}
}

// Represents a comparison operation node with a comparator (LT, GT, EQ, IS), a key, and a value
export class ComparatorNode extends ASTNode {
	constructor(public comparator: "LT" | "GT" | "EQ" | "IS", public key: string, public value: any) {
		super();
	}
}

// Represents a NOT operation node with a single filter (sub-node) to negate
export class NotNode extends ASTNode {
	constructor(public filter: ASTNode) {
		super();
	}
}

// Represents the root query node, containing filter, options, and optional transformations
export class QueryNode extends ASTNode {
	public datasetIds: Set<string>;

	constructor(
		public filter: ASTNode | null,
		public options: OptionsNode,
		public transformations?: TransformationsNode
	) {
		super();
		this.datasetIds = new Set<string>();
		this.extractDatasetIds();
	}

	// Extracts dataset IDs from the query by traversing filter, columns, order, and transformation keys
	private extractDatasetIds(): void {
		const applyKeys = this.getApplyKeys();

		if (this.filter) {
			traverseFilterForDatasetIds(this.filter, this.datasetIds);
		}

		this.processColumns(applyKeys);
		this.processOrderKeys(applyKeys);
		this.processTransformationKeys();
	}

	// Gets the set of keys defined in apply rules for use in transformations
	private getApplyKeys(): Set<string> {
		const applyKeys = new Set<string>();
		if (this.transformations) {
			this.transformations.applyRules.forEach((applyNode) => {
				applyKeys.add(applyNode.applyKey);
			});
		}
		return applyKeys;
	}

	// Processes column keys to add dataset IDs if they are not transformation apply keys
	private processColumns(applyKeys: Set<string>): void {
		this.options.columns.forEach((column) => {
			if (!applyKeys.has(column)) {
				addDatasetIdFromKey(column, this.datasetIds);
			}
		});
	}

	// Processes order keys to add dataset IDs if they are not transformation apply keys
	private processOrderKeys(applyKeys: Set<string>): void {
		if (!this.options.order) {
			return;
		}

		const orderKeys = this.options.order instanceof OrderNode ? this.options.order.keys : [this.options.order];

		orderKeys.forEach((key) => {
			if (!applyKeys.has(key)) {
				addDatasetIdFromKey(key, this.datasetIds);
			}
		});
	}

	// Processes transformation group and apply keys to add associated dataset IDs
	private processTransformationKeys(): void {
		if (this.transformations) {
			this.transformations.groupKeys.forEach((key) => {
				addDatasetIdFromKey(key, this.datasetIds);
			});
			this.transformations.applyRules.forEach((applyNode) => {
				addDatasetIdFromKey(applyNode.key, this.datasetIds);
			});
		}
	}
}

// Recursively traverses filter nodes to extract and add dataset IDs into the given set
function traverseFilterForDatasetIds(node: ASTNode, datasetIds: Set<string>): void {
	if (node instanceof LogicNode) {
		node.filters.forEach((filter) => traverseFilterForDatasetIds(filter, datasetIds));
	} else if (node instanceof ComparatorNode) {
		addDatasetIdFromKey(node.key, datasetIds);
	} else if (node instanceof NotNode) {
		traverseFilterForDatasetIds(node.filter, datasetIds);
	}
}

// Splits a key by "_" and adds the dataset ID part to the datasetIds set
function addDatasetIdFromKey(key: string, datasetIds: Set<string>): void {
	const parts = key.split("_");
	if (parts.length !== SPLIT_KEY_NUM) {
		throw new Error(`Invalid key format: ${key}`);
	}
	datasetIds.add(parts[0]);
}

// Represents options for a query, specifying columns to select and optional ordering
export class OptionsNode extends ASTNode {
	constructor(public columns: string[], public order?: OrderNode | string) {
		super();
	}
}

// Represents ordering criteria for a query, with keys to order by and optional direction
export class OrderNode extends ASTNode {
	constructor(public keys: string[], public direction: "UP" | "DOWN" = "UP") {
		super();
	}
}

// Represents transformations in a query, specifying group and apply rules
export class TransformationsNode extends ASTNode {
	constructor(public groupKeys: string[], public applyRules: ApplyNode[]) {
		super();
	}
}

// Represents an apply operation in a transformation, specifying an apply key, token, and dataset key
export class ApplyNode extends ASTNode {
	constructor(public applyKey: string, public applyToken: string, public key: string) {
		super();
	}
}
