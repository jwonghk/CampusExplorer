export abstract class ASTNode {}

const SPLIT_KEY_NUM = 2;

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

	private extractDatasetIds(): void {
		const applyKeys = this.getApplyKeys();

		if (this.filter) {
			traverseFilterForDatasetIds(this.filter, this.datasetIds);
		}

		this.processColumns(applyKeys);
		this.processOrderKeys(applyKeys);
		this.processTransformationKeys();
	}

	private getApplyKeys(): Set<string> {
		const applyKeys = new Set<string>();
		if (this.transformations) {
			this.transformations.applyRules.forEach((applyNode) => {
				applyKeys.add(applyNode.applyKey);
			});
		}
		return applyKeys;
	}

	private processColumns(applyKeys: Set<string>): void {
		this.options.columns.forEach((column) => {
			if (!applyKeys.has(column)) {
				addDatasetIdFromKey(column, this.datasetIds);
			}
		});
	}

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

function traverseFilterForDatasetIds(node: ASTNode, datasetIds: Set<string>): void {
	if (node instanceof LogicNode) {
		node.filters.forEach((filter) => traverseFilterForDatasetIds(filter, datasetIds));
	} else if (node instanceof ComparatorNode) {
		addDatasetIdFromKey(node.key, datasetIds);
	} else if (node instanceof NotNode) {
		traverseFilterForDatasetIds(node.filter, datasetIds);
	}
}

function addDatasetIdFromKey(key: string, datasetIds: Set<string>): void {
	const parts = key.split("_");
	if (parts.length !== SPLIT_KEY_NUM) {
		throw new Error(`Invalid key format: ${key}`);
	}
	datasetIds.add(parts[0]);
}

export class OptionsNode extends ASTNode {
	constructor(public columns: string[], public order?: OrderNode | string) {
		super();
	}
}

export class OrderNode extends ASTNode {
	constructor(public keys: string[], public direction: "UP" | "DOWN" = "UP") {
		super();
	}
}

export class TransformationsNode extends ASTNode {
	constructor(public groupKeys: string[], public applyRules: ApplyNode[]) {
		super();
	}
}

export class ApplyNode extends ASTNode {
	constructor(public applyKey: string, public applyToken: string, public key: string) {
		super();
	}
}
