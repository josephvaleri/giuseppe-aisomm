export { recordEvent, recomputeBadges } from "./engine";

// Convenience wrappers (emit events where native tables don't exist)
export const logQuizCompleted = (userId: string) => recordEvent(userId, "QUIZ_COMPLETED");
export const logQuizCorrect = (userId: string, n = 1) => recordEvent(userId, "QUIZ_CORRECT", n);
export const logPairing = (userId: string) => recordEvent(userId, "PAIRING");
export const logStoryShared = (userId: string) => recordEvent(userId, "STORY_SHARED");
export const logAnalysisEvent = (userId: string) => recordEvent(userId, "ANALYSIS");

// For actions already persisted in native tables (cellar, scans), just call recomputeBadges(userId)
// after the insert completes. Example hooks are shown below.
