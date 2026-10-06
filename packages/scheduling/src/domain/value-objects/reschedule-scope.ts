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

/** A detached copy, so a stored request never aliases caller input. */
export function copyRescheduleScope(scope: RescheduleScope): RescheduleScope {
  switch (scope.type) {
    case "entire_encounter":
      return { type: "entire_encounter" };
    case "official_match":
      return { type: "official_match", officialSlot: scope.officialSlot };
    default: {
      const exhaustiveScope: never = scope;
      void exhaustiveScope;
      return { type: "entire_encounter" };
    }
  }
}

/** The scope names the whole Encounter or one of its slots. */
export function isRescheduleScopeOf(scope: RescheduleScope, officialMatchCount: 1 | 2): boolean {
  switch (scope.type) {
    case "entire_encounter":
      return true;
    case "official_match":
      return scope.officialSlot === 1 || (scope.officialSlot === 2 && officialMatchCount === 2);
    default: {
      const exhaustiveScope: never = scope;
      void exhaustiveScope;
      return false;
    }
  }
}
