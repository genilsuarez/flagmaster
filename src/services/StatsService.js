/**
 * Service for persisting user stats and achievements in localStorage.
 * Enables the motivation features (streak, achievements, progress).
 * Tracks both global stats and per-mode stats for individual game modes.
 */
const STORAGE_KEY = 'flagquiz_stats_v1';
const MODES_COMPLETED_KEY = 'flagquiz_modes_completed';
const POWERUPS_USED_KEY = 'flagquiz_powerups_used';

const DEFAULT_MODE_STATS = {
    gamesPlayed: 0,
    totalScore: 0,
    bestScore: 0,
    totalCorrect: 0,
};

const DEFAULT_STATS = {
    gamesPlayed: 0,
    totalCorrect: 0,
    totalWrong: 0,
    bestTimeSeconds: null,
    currentStreak: 0,
    longestStreak: 0,
    lastPlayedDate: null,
    lastPlayedMode: null,
    uniqueCountriesCorrect: [],
    achievements: {
        explorer: false,    // 10 correct answers total
        sniper: false,      // 10 correct in a row in a single game
        lightning: false,   // Finish a full game under 60s
        conqueror: false,   // All countries from a continent
        persistent: false   // 7 day streak
    },
    modeStats: {},
};

export class StatsService {
    constructor() {
        this.stats = this.load();
        this.updateStreakOnVisit();
    }

    load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return { ...DEFAULT_STATS, modeStats: {} };
            const parsed = JSON.parse(raw);
            return {
                ...DEFAULT_STATS,
                ...parsed,
                achievements: { ...DEFAULT_STATS.achievements, ...(parsed.achievements || {}) },
                modeStats: parsed.modeStats || {},
            };
        } catch {
            return { ...DEFAULT_STATS, modeStats: {} };
        }
    }

    save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.stats));
        } catch {
            // Ignore storage errors (private mode, quota)
        }
    }

    getStats() {
        return { ...this.stats, modeStats: { ...this.stats.modeStats } };
    }

    /**
     * Returns per-mode stats for a specific mode.
     * @param {string} modeId - Mode identifier
     * @returns {object} Mode stats (gamesPlayed, totalScore, bestScore, totalCorrect)
     */
    getModeStats(modeId) {
        return { ...DEFAULT_MODE_STATS, ...(this.stats.modeStats[modeId] || {}) };
    }

    /**
     * Returns the last played mode ID, or null if no game has been played.
     * @returns {string|null}
     */
    getLastPlayedMode() {
        return this.stats.lastPlayedMode || null;
    }

    /**
     * Returns all per-mode stats.
     * @returns {object} Map of modeId → mode stats
     */
    getAllModeStats() {
        return { ...this.stats.modeStats };
    }

    /**
     * Called on each page load. If the user opens the app on a new day:
     *  - Consecutive day → streak++
     *  - Missed days → streak resets to 0 (will become 1 on next game)
     */
    updateStreakOnVisit() {
        const today = this.today();
        if (!this.stats.lastPlayedDate) return;
        const diff = this.daysBetween(this.stats.lastPlayedDate, today);
        if (diff > 1) {
            this.stats.currentStreak = 0;
            this.save();
        }
    }

    /**
     * Called after every finished game (legacy method for backward compatibility).
     * @param {object} payload - { correct, wrong, elapsedSeconds }
     */
    recordGame({ correct = 0, wrong = 0, elapsedSeconds = 0 } = {}) {
        const today = this.today();
        const s = this.stats;

        s.gamesPlayed += 1;
        s.totalCorrect += correct;
        s.totalWrong += wrong;

        if (elapsedSeconds > 0 && (s.bestTimeSeconds === null || elapsedSeconds < s.bestTimeSeconds)) {
            s.bestTimeSeconds = elapsedSeconds;
        }

        // Streak: only counts if at least one correct answer today
        if (correct > 0) {
            if (s.lastPlayedDate !== today) {
                const diff = s.lastPlayedDate ? this.daysBetween(s.lastPlayedDate, today) : Infinity;
                s.currentStreak = diff === 1 ? s.currentStreak + 1 : 1;
                s.lastPlayedDate = today;
            }
            if (s.currentStreak > s.longestStreak) {
                s.longestStreak = s.currentStreak;
            }
        }

        this.checkAchievements({ correct, elapsedSeconds });
        this.save();
        return this.getStats();
    }

    /**
     * Records an individual game session with mode-specific stats.
     * Updates both global stats and per-mode stats.
     *
     * @param {object} sessionResults - Full session results from GameSessionManager
     * @param {string} sessionResults.modeId - Mode identifier
     * @param {number} sessionResults.totalScore - Total score for the session
     * @param {number} sessionResults.correct - Number of correct answers
     * @param {number} sessionResults.wrong - Number of wrong answers
     * @param {number} sessionResults.elapsedSeconds - Total session time
     * @param {number} [sessionResults.powerUpsUsed] - Power-ups used this session
     * @returns {object} Updated stats
     */
    recordIndividualGame(sessionResults) {
        const { modeId, totalScore = 0, correct = 0, wrong = 0, elapsedSeconds = 0, powerUpsUsed = 0 } = sessionResults;

        // Update global stats via existing method
        this.recordGame({ correct, wrong, elapsedSeconds });

        // Track last played mode
        if (modeId) {
            this.stats.lastPlayedMode = modeId;
        }

        // Update per-mode stats
        if (modeId) {
            if (!this.stats.modeStats[modeId]) {
                this.stats.modeStats[modeId] = { ...DEFAULT_MODE_STATS };
            }
            const mode = this.stats.modeStats[modeId];
            mode.gamesPlayed += 1;
            mode.totalScore += totalScore;
            mode.totalCorrect += correct;
            if (totalScore > mode.bestScore) {
                mode.bestScore = totalScore;
            }
        }

        // Update modesCompleted counter
        if (modeId) {
            this.updateModesCompleted(modeId);
        }

        // Update powerUpsUsed counter
        if (powerUpsUsed > 0) {
            this.updatePowerUpsUsed(powerUpsUsed);
        }

        this.save();
        return this.getStats();
    }

    /**
     * Updates the modesCompleted list in localStorage.
     * @param {string} modeId - Mode just completed
     * @returns {string[]} Updated list of completed modes
     */
    updateModesCompleted(modeId) {
        try {
            const stored = localStorage.getItem(MODES_COMPLETED_KEY);
            const modes = stored ? JSON.parse(stored) : [];
            if (!modes.includes(modeId)) {
                modes.push(modeId);
                localStorage.setItem(MODES_COMPLETED_KEY, JSON.stringify(modes));
            }
            return modes;
        } catch {
            return [modeId];
        }
    }

    /**
     * Gets the list of modes completed at least once.
     * @returns {string[]}
     */
    getModesCompleted() {
        try {
            const stored = localStorage.getItem(MODES_COMPLETED_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    }

    /**
     * Updates the cumulative power-ups used counter.
     * @param {number} count - Number of power-ups used this session
     * @returns {number} Updated total
     */
    updatePowerUpsUsed(count) {
        try {
            const stored = localStorage.getItem(POWERUPS_USED_KEY);
            const total = (stored ? parseInt(stored, 10) : 0) + count;
            localStorage.setItem(POWERUPS_USED_KEY, total.toString());
            return total;
        } catch {
            return count;
        }
    }

    /**
     * Gets the cumulative power-ups used count.
     * @returns {number}
     */
    getPowerUpsUsed() {
        try {
            const stored = localStorage.getItem(POWERUPS_USED_KEY);
            return stored ? parseInt(stored, 10) : 0;
        } catch {
            return 0;
        }
    }

    recordCountryCorrect(countryCode) {
        if (!countryCode) return;
        if (!this.stats.uniqueCountriesCorrect.includes(countryCode)) {
            this.stats.uniqueCountriesCorrect.push(countryCode);
            this.save();
        }
    }

    checkAchievements({ correct, elapsedSeconds }) {
        const s = this.stats;
        const a = s.achievements;

        if (!a.explorer && s.totalCorrect >= 10) a.explorer = true;
        if (!a.sniper && correct >= 10) a.sniper = true;
        if (!a.lightning && elapsedSeconds > 0 && elapsedSeconds <= 60 && correct > 0) a.lightning = true;
        if (!a.persistent && s.currentStreak >= 7) a.persistent = true;
        // Conqueror achievement is tracked externally when a continent is completed
    }

    reset() {
        this.stats = { ...DEFAULT_STATS, achievements: { ...DEFAULT_STATS.achievements }, modeStats: {} };
        this.save();
    }

    today() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    daysBetween(dateA, dateB) {
        const a = new Date(dateA);
        const b = new Date(dateB);
        return Math.round((b - a) / (1000 * 60 * 60 * 24));
    }
}
