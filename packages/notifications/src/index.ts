/** Public API for notifications: the web activity channel (ADR-0008). */
export {
  ACTIVITY_AUDIENCE,
  ACTIVITY_KIND,
  ACTIVITY_RESOURCE,
  ACTIVITY_SOURCE,
  ACTIVITY_STATUS,
  isPending,
  type ActivityAudience,
  type ActivityAudienceRef,
  type ActivityAudienceScope,
  type ActivityEntry,
  type ActivityKind,
  type ActivityResourceType,
  type ActivitySource,
  type ActivitySourceName,
  type ActivityStatus,
  type ActivitySubject,
} from "./domain/entities/activity-entry.ts";
export {
  InvalidActivity,
  InvalidActivityCursor,
  type ListActivitiesError,
  type RecordActivityError,
} from "./domain/errors/activity.errors.ts";
export type {
  ActivityEntryRepository,
  ActivityPosition,
  ActivityQuery,
  CloseActivityCommand,
} from "./domain/ports/activity-entry.repository.ts";
export {
  RecordActivityUseCase,
  type ActivityRecipient,
  type RecordActivityInput,
} from "./application/record-activity/record-activity.use-case.ts";
export {
  CloseActivityUseCase,
  type CloseActivityInput,
  type CloseActivityOutput,
} from "./application/close-activity/close-activity.use-case.ts";
export {
  ACTIVITY_PAGE_SIZE,
  ListActivitiesUseCase,
  decodeActivityCursor,
  encodeActivityCursor,
  type ListActivitiesInput,
} from "./application/list-activities/list-activities.use-case.ts";
