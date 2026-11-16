/**
 * Centralized lifecycle timing constants for the Upcoming Departures section,
 * departure notifications, and delay escalation rules.
 */
export const DEPARTURE_LIFECYCLE_CONFIG = {
  /** Near-departure warning window (light yellow row + MM:SS countdown + unassigned check) */
  NEAR_WINDOW_MINUTES: 30,
  /** Duration a due trip stays visible at the top with "حان وقت الانطلاق" badge */
  DEPARTURE_GRACE_MINUTES: 2,
  /** Grace deadline after departure time before an unstarted trip moves to Delayed + Alert */
  NOT_STARTED_DELAY_MINUTES: 5,
  /** Exit fade + slide transition duration in seconds */
  EXIT_ANIMATION_SECONDS: 0.5,
  /** Maximum number of visible upcoming rows at a time */
  MAX_VISIBLE_ROWS: 10,
  /** Maximum number of trips shown in the "انطلقت مؤخراً" log */
  RECENTLY_DEPARTED_LIMIT: 5,
  /** Visual toast auto-dismiss duration in seconds */
  TOAST_DISPLAY_SECONDS: 8,
} as const;
