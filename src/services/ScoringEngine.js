/**
 * ScoringEngine - Calculates points based on speed, streak, and power-ups.
 *
 * Scoring formula (individual modes):
 *   points = 100 × Speed_Factor × streak_multiplier × (2 if doubleActive)
 *   Speed_Factor = time_remaining / total_time (range 0.0 to 1.0)
 *
 * GeoPuzzle formula:
 *   points = 100 × ((6 - N + 1) / 6) × streak_multiplier
 *   where N = number of hints revealed
 */
export class ScoringEngine {
    static BASE_POINTS = 100;

    /**
     * Calculate points for timed modes (Flag Rush, Capital Clash, Streak Blitz, Supervivencia).
     * @param {number} timeRemaining - Seconds remaining when answered
     * @param {number} totalTime - Total seconds allocated for the question
     * @param {number} streakMultiplier - Current streak multiplier (1.0+)
     * @param {boolean} doubleActive - Whether Doble Puntos power-up is active
     * @returns {number} Rounded points awarded
     */
    calculate(timeRemaining, totalTime, streakMultiplier, doubleActive = false) {
        const speedFactor = totalTime > 0 ? timeRemaining / totalTime : 0;
        let points = ScoringEngine.BASE_POINTS * speedFactor * streakMultiplier;
        if (doubleActive) points *= 2;
        return Math.round(points);
    }

    /**
     * Calculate points for Geo Puzzle mode based on hints revealed.
     * @param {number} hintsRevealed - Number of hints revealed (1 to 6)
     * @param {number} streakMultiplier - Current streak multiplier (1.0+)
     * @returns {number} Rounded points awarded
     */
    calculateGeoPuzzle(hintsRevealed, streakMultiplier) {
        const factor = (6 - hintsRevealed + 1) / 6;
        return Math.round(ScoringEngine.BASE_POINTS * factor * streakMultiplier);
    }
}
