/**
 * Competitions that still need their organizer and captains: not drafted, finished or
 * archived. Account deletion blockers in several contexts read the same set (ADR-0028).
 */
export const ACTIVE_COMPETITION_STATUSES_SQL = `('registration', 'published', 'paused')`;
