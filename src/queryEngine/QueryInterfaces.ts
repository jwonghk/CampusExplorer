export interface Query {
	WHERE: Filter;
	OPTIONS: Options;
}

export type Filter = LogicComparison | MComparator | SComparator | Negation | EmptyFilter;

export type Comparison = Record<string, number>;

export interface LogicComparison {
	AND?: Filter[];
	OR?: Filter[];
}

export interface MComparator {
	LT?: Comparison;
	GT?: Comparison;
	EQ?: Comparison;
}

export interface SComparator {
	IS: Record<string, string>;
}

export interface Negation {
	NOT: Filter;
}

export interface EmptyFilter {
	// Empty Filter
}

export interface Options {
	COLUMNS: string[];
	ORDER?: string;
}
