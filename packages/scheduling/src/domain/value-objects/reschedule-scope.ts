export type RescheduleScope =
  | { readonly type: "entire_encounter" }
  | { readonly type: "official_match"; readonly officialSlot: 1 | 2 };

export function rescheduleScopesConflict(left: RescheduleScope, right: RescheduleScope): boolean {
  switch (left.type) {
    case "entire_encounter":
      return true;
    case "official_match":
      return (
        right.type === "entire_encounter" ||
        (right.type === "official_match" && left.officialSlot === right.officialSlot)
      );
    default: {
      const exhaustiveScope: never = left;
      void exhaustiveScope;
      return false;
    }
  }
}
