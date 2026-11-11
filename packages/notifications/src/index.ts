/** Public API for notifications: the web activity channel and email (ADR-0008, ADR-0029). */
export {
  ACTIVITY_AUDIENCE,
  ACTIVITY_KIND,
  ACTIVITY_OUTCOME,
  ACTIVITY_RESOURCE,
  ACTIVITY_SOURCE,
  ACTIVITY_STATUS,
  isPending,
  type ActivityAudience,
  type ActivityAudienceRef,
  type ActivityAudienceScope,
  type ActivityEntry,
  type ActivityKind,
  type ActivityOutcome,
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
export {
  CRITICAL_EMAIL_TEMPLATES,
  DEFAULT_EMAIL_LOCALE,
  EMAIL_LOCALES,
  EMAIL_TEMPLATE,
  isCriticalEmail,
  type EmailIntent,
  type EmailLocale,
  type EmailNames,
  type EmailTemplate,
} from "./domain/entities/email-intent.ts";
export {
  EMAIL_CHANNEL,
  EMAIL_CLAIM_LEASE_MINUTES,
  EMAIL_DELIVERY_STATUS,
  EMAIL_RETRY_DELAYS_MINUTES,
  EMAIL_SKIP_REASON,
  nextEmailAttemptAt,
  type EmailDelivery,
  type EmailDeliveryOutcome,
  type EmailDeliveryStatus,
  type EmailSkipReason,
} from "./domain/entities/email-delivery.ts";
export {
  defaultEmailPreferences,
  type EmailPreferences,
} from "./domain/entities/email-preferences.ts";
export { EmailSendFailed, UnknownUnsubscribeToken } from "./domain/errors/email.errors.ts";
export type { EmailMessage, EmailSenderPort } from "./domain/ports/email-sender.port.ts";
export type { EmailOutboxRepository } from "./domain/ports/email-outbox.repository.ts";
export type { EmailPreferencesRepository } from "./domain/ports/email-preferences.repository.ts";
export type {
  EmailAudience,
  EmailChannelAccessPort,
  EmailContact,
  EmailContactsPort,
  EmailRecipientsPort,
} from "./domain/ports/email-recipients.port.ts";
export { renderEmail, type RenderedEmail } from "./domain/templates/render-email.ts";
export {
  EnqueueEmailsUseCase,
  type EmailAudienceIntent,
  type EnqueueEmailsInput,
} from "./application/enqueue-emails/enqueue-emails.use-case.ts";
export {
  DispatchEmailsUseCase,
  EMAIL_DISPATCH_BATCH,
  type DispatchEmailsOutput,
  type EmailLinks,
} from "./application/dispatch-emails/dispatch-emails.use-case.ts";
export {
  GetEmailPreferencesUseCase,
  SaveEmailPreferencesUseCase,
  UnsubscribeEmailUseCase,
  type EmailPreferencesView,
} from "./application/email-preferences/email-preferences.use-cases.ts";
