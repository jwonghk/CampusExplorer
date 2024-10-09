// Query interface represents the structure of a query, which consists of WHERE and OPTIONS clauses
export interface Query {
	WHERE: Filter;
	OPTIONS: Options;
}

// Filter can be a logic comparison (AND/OR), comparator (LT, GT, EQ, IS), negation (NOT), or an empty filter
export type Filter = LogicComparison | MComparator | SComparator | Negation | EmptyFilter;

// Comparison object used in numeric comparisons (LT, GT, EQ)
export type Comparison = Record<string, number>;

// LogicComparison interface represents AND/OR operations on filters
export interface LogicComparison {
	AND?: Filter[];
	OR?: Filter[];
}

// MComparator interface represents numeric comparisons (LT, GT, EQ)
export interface MComparator {
	LT?: Comparison;
	GT?: Comparison;
	EQ?: Comparison;
}

// SComparator interface represents string comparisons using IS operator
export interface SComparator {
	IS: Record<string, string>;
}

// Negation interface represents the NOT operation on a filter
export interface Negation {
	NOT: Filter;
}

// Represents an empty filter (used when WHERE is empty)
export interface EmptyFilter {}

// Options interface defines which columns to include in the result and how to order them
export interface Options {
	COLUMNS: string[];
	ORDER?: string;
}
