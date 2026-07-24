export type SelectionStatus =
  | "awaiting_provider_data"
  | "candidates_available"
  | "selection_in_progress"
  | "awaiting_opponent_confirmation"
  | "confirmed"
  | "disputed"
  | "organizer_review"
  | "approved"
  | "voided";
