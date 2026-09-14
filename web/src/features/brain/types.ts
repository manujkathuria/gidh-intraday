export type RuleCategory =
  | "ALLOCATION"
  | "ENTRY"
  | "INVALIDATION"
  | "HOLD"
  | "NO_TRADE"
  | "CHARACTER"
  | "BATTALION";

export interface BrainRule {
  id: string;
  category: RuleCategory;
  name: string;
  confidence: number;
  triggerTime?: string;
  conditions: string[];
  action: string;
  invalidation?: string;
  notes?: string;
}

export interface CategoryOption {
  key: string;
  label: string;
}
