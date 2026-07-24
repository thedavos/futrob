export type RescheduleScope =
  | { readonly type: "entire_encounter" }
  | { readonly type: "official_match"; readonly officialSlot: 1 | 2 };
