import { GAME_MODES } from '../models/ModeDefinition.js';
import { ACHIEVEMENTS } from '../services/AchievementService.js';
import { MODE_OPTIONS } from '../models/ModeOptions.js';

/**
 * GameEndModalView - Modal overlay displaying game results at session end.
 *
 * Supports two layouts:
 * 1. Team scores layout (banderaFlash/capitalQuest): shows team scores and winner announcement
 * 2. Individual stats layout (all other modes): shows total score, correct/wrong, streak, time
 *
 * Also displays newly unlocked achievements and provides navigation buttons.
 *
 * CSS classes:
 * - game-end-modal: root modal element
 * - game-end-modal__overlay: backdrop overlay
 * - game-end-modal__content: modal content container
 * - game-end-modal__stats: stats section
 * - game-end-modal__achievements: achievements section
 */
export class GameEndModalView {
    /** @type {HTMLElement|null} */
    #modalElement = null;

    /** @type {HTMLElement|null} */
    #previousFocus = null;

    /** @type {function|null} */
    #onPlayAgain = null;

    /** @type {function|null} */
    #onHome = null;

    /** @type {string|null} */
    #modeId = null;

    /** @type {Object|null} */
    #modeOptions = null;

    /** @type {function|null} */
    #boundKeyHandler = null;

    /**
     * @param {Object} options
     * @param {function(string): void} options.onPlayAgain - Callback invoked with the mode id to replay
     * @param {function(): void} options.onHome - Callback to return to landing/mode selector
     */
    constructor({ onPlayAgain, onHome }) {
        this.#onPlayAgain = onPlayAgain;
        this.#onHome = onHome;
    }

    /**
     * Shows the game end modal with team scores layout.
     *
     * @param {Object} options
     * @param {string} options.modeId - The mode that was played
     * @param {Object} options.teamScores - Map of team color to score (e.g. { red: 5, blue: 3, green: 2 })
     * @param {string[]} [options.newAchievements] - Array of newly unlocked achievement IDs
     */
    showTeamResults({ modeId, teamScores, newAchievements = [], modeOptions = {} }) {
        this.#modeId = modeId;
        this.#modeOptions = modeOptions;
        this.#previousFocus = document.activeElement;

        const overlay = this.#createOverlay();
        const content = this.#createContent();

        // Header
        content.appendChild(this.#createHeader());

        // Team scores
        const statsSection = document.createElement('div');
        statsSection.className = 'game-end-modal__stats';
        statsSection.appendChild(this.#createTeamScores(teamScores));
        content.appendChild(statsSection);

        // Achievements
        if (newAchievements.length > 0) {
            content.appendChild(this.#createAchievementsSection(newAchievements));
        }

        // Buttons
        content.appendChild(this.#createButtons());

        overlay.appendChild(content);
        this.#mount(overlay);
    }

    /**
     * Shows the game end modal with individual stats layout.
     *
     * @param {Object} options
     * @param {string} options.modeId - The mode that was played
     * @param {number} options.totalScore - Final score
     * @param {number} options.correct - Number of correct answers
     * @param {number} options.wrong - Number of wrong answers
     * @param {number} options.maxStreak - Highest streak achieved
     * @param {number} options.elapsedSeconds - Total time elapsed in seconds
     * @param {string[]} [options.newAchievements] - Array of newly unlocked achievement IDs
     */
    showIndividualResults({ modeId, totalScore, correct, wrong, maxStreak, elapsedSeconds, newAchievements = [], modeOptions = {} }) {
        this.#modeId = modeId;
        this.#modeOptions = modeOptions;
        this.#previousFocus = document.activeElement;

        const overlay = this.#createOverlay();
        const content = this.#createContent();

        // Header
        content.appendChild(this.#createHeader());

        // Individual stats
        const statsSection = document.createElement('div');
        statsSection.className = 'game-end-modal__stats';
        statsSection.appendChild(this.#createIndividualStats({ totalScore, correct, wrong, maxStreak, elapsedSeconds }));
        content.appendChild(statsSection);

        // Achievements
        if (newAchievements.length > 0) {
            content.appendChild(this.#createAchievementsSection(newAchievements));
        }

        // Buttons
        content.appendChild(this.#createButtons());

        overlay.appendChild(content);
        this.#mount(overlay);
    }

    /**
     * Creates the modal overlay element.
     * @returns {HTMLElement}
     * @private
     */
    #createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'game-end-modal game-end-modal__overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Resultados del juego');
        return overlay;
    }

    /**
     * Creates the modal content container.
     * @returns {HTMLElement}
     * @private
     */
    #createContent() {
        const content = document.createElement('div');
        content.className = 'game-end-modal__content';
        return content;
    }

    /**
     * Creates the modal header with game-over title, game name and difficulty badge.
     * @returns {HTMLElement}
     * @private
     */
    #createHeader() {
        const header = document.createElement('div');
        header.className = 'game-end-modal__header';

        const title = document.createElement('h2');
        title.className = 'game-end-modal__title';
        title.textContent = '🎉 ¡Juego Terminado! 🎉';

        header.appendChild(title);

        // Game name
        const mode = GAME_MODES[this.#modeId];
        if (mode) {
            const gameName = document.createElement('p');
            gameName.className = 'game-end-modal__game-name';
            gameName.textContent = `${mode.icon} ${mode.name}`;
            header.appendChild(gameName);
        }

        // Difficulty / mode options summary
        const difficultyText = this.#buildDifficultyText();
        if (difficultyText) {
            const badge = document.createElement('p');
            badge.className = 'game-end-modal__difficulty-badge';
            badge.textContent = difficultyText;
            header.appendChild(badge);
        }

        return header;
    }

    /**
     * Builds a human-readable difficulty/options summary for the current mode.
     * Returns null if there are no relevant options to display.
     * @returns {string|null}
     * @private
     */
    #buildDifficultyText() {
        if (!this.#modeId) return null;

        const optionDefs = MODE_OPTIONS[this.#modeId] || [];
        if (optionDefs.length === 0) return null;

        const opts = this.#modeOptions || {};
        const parts = [];

        for (const def of optionDefs) {
            // Resolve value: use provided value or fall back to the defined default
            const val = opts[def.id] !== undefined ? opts[def.id] : def.default;
            if (val === undefined || val === null) continue;

            if (def.type === 'select') {
                // Select options are always shown — they describe the mode variant
                const opt = def.options?.find(o => o.value === val);
                if (opt) parts.push(opt.label);
            } else if (def.type === 'number') {
                // Only show rounds for number options (skip time-per-question — it's noise)
                // Skip sessionTime for streakBlitz — it's already embedded in the endCondition label
                if (def.id === 'rounds') {
                    parts.push(`${val} rondas`);
                }
            }
        }

        return parts.length > 0 ? parts.join(' · ') : null;
    }

    /**
     * Creates the team scores display with winner announcement.
     * @param {Object} teamScores - Map of team color to score
     * @returns {HTMLElement}
     * @private
     */
    #createTeamScores(teamScores) {
        const container = document.createElement('div');
        container.className = 'game-end-modal__team-scores';

        // Determine winner
        const teamNames = { red: 'Equipo Rojo', blue: 'Equipo Azul', green: 'Equipo Verde' };
        const scores = Object.entries(teamScores);
        const maxScore = Math.max(...scores.map(([, s]) => s));
        const winners = scores.filter(([, s]) => s === maxScore).map(([team]) => team);

        // Winner announcement
        const announcement = document.createElement('div');
        announcement.className = 'game-end-modal__winner';

        if (winners.length > 1) {
            announcement.textContent = '🤝 ¡Empate!';
        } else {
            announcement.textContent = `🏆 ¡${teamNames[winners[0]] || winners[0]} Gana!`;
        }
        container.appendChild(announcement);

        // Score list
        const scoreList = document.createElement('div');
        scoreList.className = 'game-end-modal__score-list';

        scores.forEach(([team, score]) => {
            const item = document.createElement('div');
            item.className = `game-end-modal__score-item game-end-modal__score-item--${team}`;

            const nameSpan = document.createElement('span');
            nameSpan.className = 'game-end-modal__team-name';
            nameSpan.textContent = teamNames[team] || team;

            const scoreSpan = document.createElement('span');
            scoreSpan.className = 'game-end-modal__team-score';
            scoreSpan.textContent = String(score);

            item.appendChild(nameSpan);
            item.appendChild(scoreSpan);
            scoreList.appendChild(item);
        });

        container.appendChild(scoreList);
        return container;
    }

    /**
     * Creates the individual stats display.
     * @param {Object} stats
     * @param {number} stats.totalScore
     * @param {number} stats.correct
     * @param {number} stats.wrong
     * @param {number} stats.maxStreak
     * @param {number} stats.elapsedSeconds
     * @returns {HTMLElement}
     * @private
     */
    #createIndividualStats({ totalScore, correct, wrong, maxStreak, elapsedSeconds }) {
        const container = document.createElement('div');
        container.className = 'game-end-modal__individual-stats';

        const stats = [
            { label: 'Puntuación', value: totalScore.toLocaleString(), icon: '⭐' },
            { label: 'Correctas', value: String(correct), icon: '✅' },
            { label: 'Incorrectas', value: String(wrong), icon: '❌' },
            { label: 'Mejor racha', value: String(maxStreak), icon: '🔥' },
            { label: 'Tiempo', value: this.#formatTime(elapsedSeconds), icon: '⏱️' },
        ];

        stats.forEach(({ label, value, icon }) => {
            const row = document.createElement('div');
            row.className = 'game-end-modal__stat-row';

            const iconSpan = document.createElement('span');
            iconSpan.className = 'game-end-modal__stat-icon';
            iconSpan.setAttribute('aria-hidden', 'true');
            iconSpan.textContent = icon;

            const labelSpan = document.createElement('span');
            labelSpan.className = 'game-end-modal__stat-label';
            labelSpan.textContent = label;

            const valueSpan = document.createElement('span');
            valueSpan.className = 'game-end-modal__stat-value';
            valueSpan.textContent = value;

            row.appendChild(iconSpan);
            row.appendChild(labelSpan);
            row.appendChild(valueSpan);
            container.appendChild(row);
        });

        return container;
    }

    /**
     * Creates the achievements section showing newly unlocked achievements.
     * @param {string[]} achievementIds - Array of achievement IDs
     * @returns {HTMLElement}
     * @private
     */
    #createAchievementsSection(achievementIds) {
        const section = document.createElement('div');
        section.className = 'game-end-modal__achievements';

        const heading = document.createElement('h3');
        heading.className = 'game-end-modal__achievements-title';
        heading.textContent = '🏅 Logros desbloqueados';
        section.appendChild(heading);

        const list = document.createElement('div');
        list.className = 'game-end-modal__achievements-list';

        achievementIds.forEach(id => {
            const achievement = ACHIEVEMENTS[id];
            if (!achievement) return;

            const item = document.createElement('div');
            item.className = 'game-end-modal__achievement-item';

            const icon = document.createElement('span');
            icon.className = 'game-end-modal__achievement-icon';
            icon.setAttribute('aria-hidden', 'true');
            icon.textContent = achievement.icon;

            const name = document.createElement('span');
            name.className = 'game-end-modal__achievement-name';
            name.textContent = achievement.name;

            item.appendChild(icon);
            item.appendChild(name);
            list.appendChild(item);
        });

        section.appendChild(list);
        return section;
    }

    /**
     * Creates the action buttons (Jugar de nuevo + Inicio).
     * @returns {HTMLElement}
     * @private
     */
    #createButtons() {
        const footer = document.createElement('div');
        footer.className = 'game-end-modal__footer';

        const playAgainBtn = document.createElement('button');
        playAgainBtn.type = 'button';
        playAgainBtn.className = 'game-end-modal__btn game-end-modal__btn--play-again';
        playAgainBtn.textContent = 'Jugar de nuevo';
        playAgainBtn.setAttribute('aria-label', 'Jugar de nuevo con el mismo modo');
        playAgainBtn.addEventListener('click', () => {
            if (this.#onPlayAgain) {
                this.#onPlayAgain(this.#modeId);
            }
            this.close();
        });

        const homeBtn = document.createElement('button');
        homeBtn.type = 'button';
        homeBtn.className = 'game-end-modal__btn game-end-modal__btn--home';
        homeBtn.textContent = 'Inicio';
        homeBtn.setAttribute('aria-label', 'Volver al inicio');
        homeBtn.addEventListener('click', () => {
            if (this.#onHome) {
                this.#onHome();
            }
            this.close();
        });

        footer.appendChild(playAgainBtn);
        footer.appendChild(homeBtn);
        return footer;
    }

    /**
     * Mounts the modal to the DOM, sets up focus trap and keyboard handling.
     * @param {HTMLElement} overlay
     * @private
     */
    #mount(overlay) {
        // Remove any existing modal
        this.close();

        this.#modalElement = overlay;
        document.body.appendChild(overlay);

        // Set up keyboard handler (Escape to close, focus trap)
        this.#boundKeyHandler = (event) => this.#handleKeyDown(event);
        document.addEventListener('keydown', this.#boundKeyHandler);

        // Focus the first button for accessibility
        const firstButton = overlay.querySelector('button');
        if (firstButton) {
            firstButton.focus();
        }
    }

    /**
     * Handles keyboard events for the modal (Escape to close, Tab focus trap).
     * @param {KeyboardEvent} event
     * @private
     */
    #handleKeyDown(event) {
        if (!this.#modalElement) return;

        if (event.key === 'Escape') {
            event.preventDefault();
            if (this.#onHome) {
                this.#onHome();
            }
            this.close();
            return;
        }

        // Focus trap: keep Tab within the modal
        if (event.key === 'Tab') {
            const focusableElements = this.#modalElement.querySelectorAll(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );

            if (focusableElements.length === 0) return;

            const firstFocusable = focusableElements[0];
            const lastFocusable = focusableElements[focusableElements.length - 1];

            if (event.shiftKey) {
                if (document.activeElement === firstFocusable) {
                    event.preventDefault();
                    lastFocusable.focus();
                }
            } else {
                if (document.activeElement === lastFocusable) {
                    event.preventDefault();
                    firstFocusable.focus();
                }
            }
        }
    }

    /**
     * Closes and removes the modal from the DOM.
     */
    close() {
        if (this.#boundKeyHandler) {
            document.removeEventListener('keydown', this.#boundKeyHandler);
            this.#boundKeyHandler = null;
        }

        if (this.#modalElement && this.#modalElement.parentNode) {
            this.#modalElement.parentNode.removeChild(this.#modalElement);
        }
        this.#modalElement = null;

        // Restore focus to the previously focused element
        if (this.#previousFocus && typeof this.#previousFocus.focus === 'function') {
            this.#previousFocus.focus();
        }
        this.#previousFocus = null;
    }

    /**
     * Formats seconds into MM:SS display string.
     * @param {number} seconds
     * @returns {string}
     * @private
     */
    #formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Destroys the modal and cleans up all resources.
     */
    destroy() {
        this.close();
        this.#onPlayAgain = null;
        this.#onHome = null;
        this.#modeId = null;
    }
}
