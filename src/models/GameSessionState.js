/**
 * GameSessionState model for individual mode runtime state
 */
export class GameSessionState {
    constructor(modeId, config) {
        this.modeId = modeId;
        this.config = config;           // { continent, sovereignty, maxCount, modeOptions }
        this.isActive = false;
        this.currentRound = 0;
        this.totalScore = 0;
        this.streak = 0;
        this.multiplier = 1.0;
        this.lives = null;              // Only for Supervivencia
        this.powerUps = [];             // max 3
        this.activePowerUp = null;
        this.startTime = null;
        this.sessionTimer = null;       // For Streak Blitz (90s countdown)
        this.roundHistory = [];         // { correct, points, timeMs }
    }
}
