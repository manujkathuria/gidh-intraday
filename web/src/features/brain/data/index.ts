import { BrainRule, CategoryOption } from "../types";
import { ALLOCATION_RULES } from "./rulesAllocation";
import { TACTICS_RULES } from "./rulesTactics";
import { INVALIDATION_RULES } from "./rulesInvalidation";
import { HOLD_NO_TRADE_RULES } from "./rulesHoldNoTrade";
import { PROFILES_RULES } from "./rulesProfiles";
import { BATTALIONS_RULES } from "./rulesBattalions";

export const ALL_BRAIN_RULES: BrainRule[] = [
  ...ALLOCATION_RULES,
  ...TACTICS_RULES,
  ...INVALIDATION_RULES,
  ...HOLD_NO_TRADE_RULES,
  ...PROFILES_RULES,
  ...BATTALIONS_RULES,
];

export const BRAIN_CATEGORIES: CategoryOption[] = [
  { key: "ALL", label: "All Rules (34)" },
  { key: "ALLOCATION", label: "Allocation & Geometry (3)" },
  { key: "ENTRY", label: "Entry Tactics (5)" },
  { key: "INVALIDATION", label: "Invalidation & Cuts (5)" },
  { key: "HOLD", label: "Hold & Ratchets (3)" },
  { key: "NO_TRADE", label: "No-Trade Filters (3)" },
  { key: "CHARACTER", label: "Character Profiles (10)" },
  { key: "BATTALION", label: "Sector Battalions (5)" },
];


