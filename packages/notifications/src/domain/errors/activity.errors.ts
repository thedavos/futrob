import { TaggedError } from "@futrob/shared-kernel";

export class InvalidActivity extends TaggedError("InvalidActivity")<{
  code: "notifications.invalid_activity";
  message: string;
}> {}

export class InvalidActivityCursor extends TaggedError("InvalidActivityCursor")<{
  code: "notifications.invalid_cursor";
  message: string;
}> {}

export type RecordActivityError = InvalidActivity;
export type ListActivitiesError = InvalidActivityCursor | InvalidActivity;
