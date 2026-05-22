import { GAME_MODES } from '../models/ModeDefinition.js';

/**
 * EngagementSectionView - Renders user engagement stats in the Home screen.
 * Displays streak, global progress, and last-played quick-replay button.
 * Positioned above mode sections in the Home screen.
 *
 * Data sources:
 * - Streak: StatsService.getStats().currentStreak
 * - Last mode played: StatsService.getStats().lastPlayedDate + modeStats
 * - Unique countries correct: StatsService.getStats().uniqueCountriesCorrect.length
 * - Total countries: CountryService.countries.length
 */
export class EngagementSectionView {
    /** @type {import('../services/StatsService.js').StatsService} */
    #statsService;

    /** @type {import('../services/CountryService.js').CountryService} */
    #countryService;

    /** @type {Function|null} */
    #onQuickPlay;

    /** @type {HTMLElement|null} */
    #element;

    /** @type {HTMLElement|null} */
    #streakEl;

    /** @type {HTMLElement|null} */
    #progressEl;

    /** @type {HTMLElement|null} */
    #lastPlayedEl;

    /**
     * @param {Object} options
     * @param {import('../services/StatsService.js').StatsService} options.statsService
     * @param {import('../services/CountryService.js').CountryService} options.countryService
     * @param {Function} [options.onQuickPlay] - Callback invoked with modeId when replay button is clicked
     */
    constructor({ statsService, countryService, onQuickPlay }) {
        this.#statsService = statsService;
        this.#countryService = countryService;
        this.#onQuickPlay = onQuickPlay || null;
        this.#element = null;
        this.#streakEl = null;
        this.#progressEl = null;
        this.#lastPlayedEl = null;
    }

    /**
     * Renders the engagement section and returns the root HTMLElement.
     * @returns {HTMLElement}
     */
    render() {
        const section = document.createElement('section');
        section.className = 'engagement-section';
        section.setAttribute('aria-label', 'Estadísticas del jugador');

        // Streak badge
        const streakEl = document.createElement('div');
        streakEl.className = 'engagement-section__streak';
        section.appendChild(streakEl);
        this.#streakEl = streakEl;

        // Global progress
        const progressEl = document.createElement('div');
        progressEl.className = 'engagement-section__progress';
        section.appendChild(progressEl);
        this.#progressEl = progressEl;

        // Last played quick-replay
        const lastPlayedEl = document.createElement('div');
        lastPlayedEl.className = 'engagement-section__last-played';
        section.appendChild(lastPlayedEl);
        this.#lastPlayedEl = lastPlayedEl;

        this.#element = section;
        this.#populateStats();

        return section;
    }

    /**
     * Refreshes stats display without full re-render.
     */
    update() {
        this.#populateStats();
    }

    /**
     * Reads stats and populates the DOM elements.
     * Handles invalid/missing data gracefully by showing defaults.
     * @private
     */
    #populateStats() {
        const stats = this.#getSafeStats();
        const totalCountries = this.#getTotalCountries();
        const uniqueCorrect = this.#getUniqueCorrectCount(stats);
        const currentStreak = this.#getCurrentStreak(stats);
        const lastPlayedMode = this.#getLastPlayedMode(stats);
        const hasSessions = stats.gamesPlayed > 0;

        // Streak badge
        this.#renderStreak(currentStreak, hasSessions);

        // Global progress
        this.#renderProgress(uniqueCorrect, totalCountries);

        // Last played
        this.#renderLastPlayed(lastPlayedMode, hasSessions);
    }

    /**
     * Safely retrieves stats, returning defaults on any error.
     * @returns {Object}
     * @private
     */
    #getSafeStats() {
        try {
            const stats = this.#statsService.getStats();
            return stats || {};
        } catch {
            return {};
        }
    }

    /**
     * Gets total countries count from CountryService.
     * @returns {number}
     * @private
     */
    #getTotalCountries() {
        try {
            return this.#countryService.countries.length || 0;
        } catch {
            return 0;
        }
    }

    /**
     * Gets unique countries correct count safely.
     * @param {Object} stats
     * @returns {number}
     * @private
     */
    #getUniqueCorrectCount(stats) {
        try {
            if (Array.isArray(stats.uniqueCountriesCorrect)) {
                return stats.uniqueCountriesCorrect.length;
            }
            return 0;
        } catch {
            return 0;
        }
    }

    /**
     * Gets current streak safely.
     * @param {Object} stats
     * @returns {number}
     * @private
     */
    #getCurrentStreak(stats) {
        const streak = stats.currentStreak;
        return typeof streak === 'number' && streak >= 0 ? streak : 0;
    }

    /**
     * Determines the last played mode ID.
     * Uses the explicit lastPlayedMode field from StatsService if available,
     * otherwise falls back to the mode with the most games played.
     * @param {Object} stats
     * @returns {string|null}
     * @private
     */
    #getLastPlayedMode(stats) {
        try {
            // Prefer explicit lastPlayedMode field
            if (stats.lastPlayedMode && GAME_MODES[stats.lastPlayedMode]) {
                return stats.lastPlayedMode;
            }

            // Fallback: infer from modeStats (most games played)
            const modeStats = stats.modeStats;
            if (!modeStats || typeof modeStats !== 'object') return null;

            let lastMode = null;
            let maxGames = 0;

            for (const [modeId, modeData] of Object.entries(modeStats)) {
                if (modeData && modeData.gamesPlayed > maxGames && GAME_MODES[modeId]) {
                    maxGames = modeData.gamesPlayed;
                    lastMode = modeId;
                }
            }

            return lastMode;
        } catch {
            return null;
        }
    }

    /**
     * Renders the streak badge.
     * Hidden when no sessions exist.
     * @param {number} streak
     * @param {boolean} hasSessions
     * @private
     */
    #renderStreak(streak, hasSessions) {
        if (!this.#streakEl) return;

        if (!hasSessions) {
            this.#streakEl.hidden = true;
            this.#streakEl.innerHTML = '';
            return;
        }

        this.#streakEl.hidden = false;
        this.#streakEl.innerHTML = '';

        const icon = document.createElement('span');
        icon.className = 'engagement-section__streak-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = '🔥';

        const count = document.createElement('span');
        count.className = 'engagement-section__streak-count';
        count.textContent = `${streak}`;

        this.#streakEl.setAttribute('aria-label', `Racha: ${streak} días`);
        this.#streakEl.appendChild(icon);
        this.#streakEl.appendChild(count);
    }

    /**
     * Renders the global progress indicator.
     * @param {number} uniqueCorrect
     * @param {number} total
     * @private
     */
    #renderProgress(uniqueCorrect, total) {
        if (!this.#progressEl) return;

        this.#progressEl.innerHTML = '';

        const text = document.createElement('span');
        text.className = 'engagement-section__progress-text';
        text.textContent = `${uniqueCorrect} de ${total} banderas acertadas`;

        this.#progressEl.setAttribute('aria-label', `Progreso: ${uniqueCorrect} de ${total} banderas acertadas`);
        this.#progressEl.appendChild(text);
    }

    /**
     * Renders the last-played quick-replay button.
     * Hidden when no sessions exist or no valid last mode.
     * @param {string|null} modeId
     * @param {boolean} hasSessions
     * @private
     */
    #renderLastPlayed(modeId, hasSessions) {
        if (!this.#lastPlayedEl) return;

        if (!hasSessions || !modeId) {
            this.#lastPlayedEl.hidden = true;
            this.#lastPlayedEl.innerHTML = '';
            return;
        }

        const mode = GAME_MODES[modeId];
        if (!mode) {
            this.#lastPlayedEl.hidden = true;
            this.#lastPlayedEl.innerHTML = '';
            return;
        }

        this.#lastPlayedEl.hidden = false;
        this.#lastPlayedEl.innerHTML = '';

        const button = document.createElement('button');
        button.className = 'engagement-section__quick-play';
        button.type = 'button';
        button.setAttribute('aria-label', `Jugar de nuevo: ${mode.name}`);
        button.textContent = `▶ ${mode.name}`;

        button.addEventListener('click', () => {
            if (this.#onQuickPlay) {
                this.#onQuickPlay(modeId);
            }
        });

        this.#lastPlayedEl.appendChild(button);
    }
}
