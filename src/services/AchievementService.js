/**
 * AchievementService - Evaluates and persists achievement unlocks.
 *
 * Manages 11 achievements (5 existing + 6 new) with persistence to
 * localStorage and migration from the old stats format.
 */

const STORAGE_KEY = 'flagquiz_achievements_v2';
const OLD_STATS_KEY = 'flagquiz_stats_v1';

/**
 * @typedef {Object} Achievement
 * @property {string} id - Unique identifier
 * @property {string} icon - Emoji icon
 * @property {string} name - Display name
 * @property {string} condition - Human-readable unlock condition
 */

/** @type {Record<string, Achievement>} */
export const ACHIEVEMENTS = {
    explorer:       { id: 'explorer',       icon: '🌍', name: 'Explorador',     condition: 'totalCorrect >= 10' },
    sniper:         { id: 'sniper',         icon: '🎯', name: 'Francotirador',  condition: '10 correct in one game' },
    lightning:      { id: 'lightning',       icon: '⚡', name: 'Rayo',           condition: 'game < 60s' },
    conqueror:      { id: 'conqueror',       icon: '🌎', name: 'Conquistador',   condition: 'full continent' },
    persistent:     { id: 'persistent',      icon: '🔥', name: 'Persistente',    condition: '7 day streak' },
    imparable:      { id: 'imparable',       icon: '💪', name: 'Imparable',      condition: '20 answer streak' },
    erudito:        { id: 'erudito',         icon: '🧠', name: 'Erudito',        condition: '100% in 30+ questions' },
    velocista:      { id: 'velocista',       icon: '🏎️', name: 'Velocista',      condition: 'avg < 2s in session' },
    cartografo:     { id: 'cartografo',      icon: '🗺️', name: 'Cartógrafo',     condition: 'all 8 modes played' },
    coleccionista:  { id: 'coleccionista',   icon: '💎', name: 'Coleccionista',  condition: '50 power-ups used' },
    superviviente:  { id: 'superviviente',   icon: '💀', name: 'Superviviente',  condition: 'round 50 survival' },
};

export class AchievementService {
    constructor() {
        this.unlocked = this.load();
    }

    /**
     * Load achievement state from localStorage, migrating from old format if needed.
     * @returns {Record<string, boolean>} Map of achievement id → unlocked state
     */
    load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                return this.ensureAllKeys(parsed);
            }
            // Attempt migration from old stats format
            return this.migrateFromOldStats();
        } catch {
            return this.defaultState();
        }
    }

    /**
     * Migrate achievement data from the old flagquiz_stats_v1 format.
     * The old format stored achievements as { explorer: true/false, ... } inside the stats object.
     * @returns {Record<string, boolean>}
     */
    migrateFromOldStats() {
        try {
            const raw = localStorage.getItem(OLD_STATS_KEY);
            if (!raw) return this.defaultState();

            const oldStats = JSON.parse(raw);
            if (!oldStats.achievements) return this.defaultState();

            const migrated = this.defaultState();
            // Transfer existing achievement states from old format
            for (const key of Object.keys(oldStats.achievements)) {
                if (key in migrated) {
                    migrated[key] = Boolean(oldStats.achievements[key]);
                }
            }

            // Persist migrated data to new key
            this.saveState(migrated);
            return migrated;
        } catch {
            return this.defaultState();
        }
    }

    /**
     * Returns a default state with all achievements locked.
     * @returns {Record<string, boolean>}
     */
    defaultState() {
        const state = {};
        for (const id of Object.keys(ACHIEVEMENTS)) {
            state[id] = false;
        }
        return state;
    }

    /**
     * Ensures all achievement keys exist in the loaded state (handles additions).
     * @param {Record<string, boolean>} state
     * @returns {Record<string, boolean>}
     */
    ensureAllKeys(state) {
        const result = this.defaultState();
        for (const key of Object.keys(result)) {
            if (key in state) {
                result[key] = Boolean(state[key]);
            }
        }
        return result;
    }

    /**
     * Persist current achievement state to localStorage.
     * @param {Record<string, boolean>} [state]
     */
    save(state) {
        this.saveState(state || this.unlocked);
    }

    /**
     * @param {Record<string, boolean>} state
     */
    saveState(state) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch {
            // Ignore storage errors (private mode, quota)
        }
    }

    /**
     * Check session results and cumulative stats against achievement conditions.
     * Returns an array of newly unlocked achievement IDs (achievements that were
     * locked before this call and are now unlocked).
     *
     * @param {object} sessionResult - Results from the just-completed session
     * @param {number} sessionResult.correct - Number of correct answers in session
     * @param {number} sessionResult.wrong - Number of wrong answers in session
     * @param {number} sessionResult.totalQuestions - Total questions in session
     * @param {number} sessionResult.elapsedSeconds - Total session time in seconds
     * @param {number} sessionResult.maxStreak - Highest streak achieved in session
     * @param {number} sessionResult.roundsReached - Rounds reached (for Supervivencia)
     * @param {number} [sessionResult.avgResponseTime] - Average response time in seconds
     * @param {string} [sessionResult.modeId] - Mode that was played
     *
     * @param {object} cumulativeStats - Cumulative stats across all sessions
     * @param {number} cumulativeStats.totalCorrect - Lifetime correct answers
     * @param {number} cumulativeStats.currentStreak - Current daily streak
     * @param {string[]} [cumulativeStats.uniqueCountriesCorrect] - Countries answered correctly
     * @param {string[]} [cumulativeStats.modesCompleted] - Modes completed at least once
     * @param {number} [cumulativeStats.powerUpsUsed] - Lifetime power-ups used
     * @param {boolean} [cumulativeStats.continentCompleted] - Whether a full continent was completed
     *
     * @returns {string[]} Array of newly unlocked achievement IDs
     */
    check(sessionResult, cumulativeStats) {
        const newlyUnlocked = [];

        // Explorer: totalCorrect >= 10
        if (!this.unlocked.explorer && cumulativeStats.totalCorrect >= 10) {
            this.unlocked.explorer = true;
            newlyUnlocked.push('explorer');
        }

        // Sniper: 10 correct in a row in a single game (maxStreak >= 10)
        if (!this.unlocked.sniper && sessionResult.maxStreak >= 10) {
            this.unlocked.sniper = true;
            newlyUnlocked.push('sniper');
        }

        // Lightning: Finish a full game under 60s with at least 1 correct
        if (!this.unlocked.lightning && sessionResult.elapsedSeconds > 0 && sessionResult.elapsedSeconds <= 60 && sessionResult.correct > 0) {
            this.unlocked.lightning = true;
            newlyUnlocked.push('lightning');
        }

        // Conqueror: All countries from a continent
        if (!this.unlocked.conqueror && cumulativeStats.continentCompleted) {
            this.unlocked.conqueror = true;
            newlyUnlocked.push('conqueror');
        }

        // Persistent: 7 day streak
        if (!this.unlocked.persistent && cumulativeStats.currentStreak >= 7) {
            this.unlocked.persistent = true;
            newlyUnlocked.push('persistent');
        }

        // Imparable: 20-answer streak in any individual mode
        if (!this.unlocked.imparable && sessionResult.maxStreak >= 20) {
            this.unlocked.imparable = true;
            newlyUnlocked.push('imparable');
        }

        // Erudito: 100% correct in a session of 30+ questions
        if (!this.unlocked.erudito && sessionResult.totalQuestions >= 30 && sessionResult.wrong === 0 && sessionResult.correct === sessionResult.totalQuestions) {
            this.unlocked.erudito = true;
            newlyUnlocked.push('erudito');
        }

        // Velocista: avg response time < 2s in a session of 10+ questions
        if (!this.unlocked.velocista && sessionResult.totalQuestions >= 10 && sessionResult.avgResponseTime != null && sessionResult.avgResponseTime < 2) {
            this.unlocked.velocista = true;
            newlyUnlocked.push('velocista');
        }

        // Cartógrafo: all 8 modes played at least once
        if (!this.unlocked.cartografo && cumulativeStats.modesCompleted && cumulativeStats.modesCompleted.length >= 8) {
            this.unlocked.cartografo = true;
            newlyUnlocked.push('cartografo');
        }

        // Coleccionista: 50 power-ups used cumulatively
        if (!this.unlocked.coleccionista && cumulativeStats.powerUpsUsed >= 50) {
            this.unlocked.coleccionista = true;
            newlyUnlocked.push('coleccionista');
        }

        // Superviviente: reach round 50 in Supervivencia
        if (!this.unlocked.superviviente && sessionResult.modeId === 'supervivencia' && sessionResult.roundsReached >= 50) {
            this.unlocked.superviviente = true;
            newlyUnlocked.push('superviviente');
        }

        // Persist if anything changed
        if (newlyUnlocked.length > 0) {
            this.save();
        }

        return newlyUnlocked;
    }

    /**
     * Get the current unlock state of all achievements.
     * @returns {Record<string, boolean>}
     */
    getUnlocked() {
        return { ...this.unlocked };
    }

    /**
     * Check if a specific achievement is unlocked.
     * @param {string} achievementId
     * @returns {boolean}
     */
    isUnlocked(achievementId) {
        return Boolean(this.unlocked[achievementId]);
    }

    /**
     * Get achievement metadata by ID.
     * @param {string} achievementId
     * @returns {Achievement|undefined}
     */
    getAchievement(achievementId) {
        return ACHIEVEMENTS[achievementId];
    }

    /**
     * Get all achievement definitions.
     * @returns {Record<string, Achievement>}
     */
    getAllAchievements() {
        return { ...ACHIEVEMENTS };
    }

    /**
     * Reset all achievements (for testing or user-initiated reset).
     */
    reset() {
        this.unlocked = this.defaultState();
        this.save();
    }
}
