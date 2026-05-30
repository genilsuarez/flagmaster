import { GameSessionState } from '../models/GameSessionState.js';
import { ScoringEngine } from '../services/ScoringEngine.js';
import { StreakService } from '../services/StreakService.js';
import { PowerUpService } from '../services/PowerUpService.js';
import { FlagRushController } from './FlagRushController.js';
import { CapitalClashController } from './CapitalClashController.js';
import { StreakBlitzController } from './StreakBlitzController.js';
import { GeoPuzzleController } from './GeoPuzzleController.js';
import { GameController } from './GameController.js';
import { WordDropController } from './WordDropController.js';
import { OrdenaContinenteController } from './ordena-continente/OrdenaContinenteController.js';

/**
 * GameSessionManager - Central orchestrator for all game modes.
 *
 * Coordinates mode controllers with shared services (ScoringEngine, StreakService,
 * PowerUpService). Manages the lifecycle of a game session from start to end,
 * delegates answer handling and power-up activation to the active controller,
 * and records session stats at completion.
 *
 * Used by AppRouter/main.js to start any game mode through a unified interface.
 *
 * @example
 * const manager = new GameSessionManager({ container, countryService, statsService, achievementService });
 * manager.startSession('flagRush', { modeOptions: { rounds: 10 } }, countryPool);
 * // ... game plays via controller ...
 * // manager.endSession() called automatically or manually
 */
export class GameSessionManager {
    /**
     * @param {Object} options
     * @param {HTMLElement} options.container - Parent element for game UI
     * @param {import('../services/CountryService.js').CountryService} [options.countryService] - Country data service
     * @param {import('../services/StatsService.js').StatsService} [options.statsService] - Stats persistence service
     * @param {import('../services/AchievementService.js').AchievementService} [options.achievementService] - Achievement evaluation service
     * @param {function} [options.onSessionEnd] - Callback with full session results when session ends
     */
    constructor({ container, countryService = null, statsService = null, achievementService = null, onSessionEnd = null }) {
        this.container = container;
        this.gameContent = container.querySelector('.container') || container;
        this.countryService = countryService;
        this.statsService = statsService;
        this.achievementService = achievementService;
        this.onSessionEnd = onSessionEnd;

        // Shared services
        this.scoringEngine = new ScoringEngine();
        this.streakService = new StreakService();
        this.powerUpService = new PowerUpService();

        // Session state
        this.session = null;
        this.activeController = null;
        this.sessionStartTime = null;
        this.powerUpsUsedThisSession = 0;
    }

    /**
     * Starts a new game session for the given mode.
     *
     * Creates the appropriate controller based on modeId, initializes shared
     * services, and starts the game with the provided config and country pool.
     *
     * @param {string} modeId - Mode identifier (e.g. 'flagRush', 'capitalClash', 'banderaFlash')
     * @param {Object} config - Session configuration
     * @param {Object} [config.modeOptions] - Mode-specific options (rounds, timePerQuestion, variant, etc.)
     * @param {string} [config.continent] - Continent filter applied
     * @param {string} [config.sovereignty] - Sovereignty filter applied
     * @param {number} [config.maxCount] - Max country count
     * @param {import('../models/Country.js').Country[]} pool - Filtered country pool
     */
    startSession(modeId, config, pool) {
        // Clean up any previous session
        if (this.activeController) {
            this.destroyActiveController();
        }

        // Initialize session state
        this.session = new GameSessionState(modeId, config);
        this.session.isActive = true;
        this.session.startTime = Date.now();
        this.sessionStartTime = Date.now();
        this.powerUpsUsedThisSession = 0;

        // Reset shared services
        this.streakService.reset();
        this.powerUpService.reset();

        // Prepare game UI: hide legacy elements, show end button
        this.prepareGameUI(modeId);

        // Register centralized Escape key handler for all modes
        this._escapeHandler = (e) => {
            if (e.key === 'Escape' && this.session && this.session.isActive) {
                e.preventDefault();
                this.endSession();
            }
        };
        document.addEventListener('keydown', this._escapeHandler);

        // Create the appropriate controller
        this.activeController = this.createController(modeId, config.modeOptions || {});

        // Start the controller with the pool and mode options
        this.startController(modeId, pool, config.modeOptions || {});
    }

    /**
     * Prepares the game UI by hiding legacy elements and showing the
     * end game button for individual modes.
     *
     * @param {string} modeId - Mode identifier
     * @private
     */
    prepareGameUI(modeId) {
        const endGameButton = document.getElementById('endGameButton');
        const skipButton = document.getElementById('skipButton');
        const startButton = document.getElementById('startButton');
        const flagImage = document.getElementById('flagImage');
        const countryInfo = document.getElementById('countryInfo');
        const capitalInfo = document.getElementById('capitalInfo');
        const teamsContainer = document.getElementById('teamsContainer');

        const individualModes = ['flagRush', 'capitalClash', 'streakBlitz', 'geoPuzzle', 'letrasEnCaida', 'ordenaContinente'];

        if (individualModes.includes(modeId)) {
            // Hide legacy elements that individual modes don't use
            if (flagImage) flagImage.style.display = 'none';
            if (countryInfo) countryInfo.style.display = 'none';
            if (capitalInfo) capitalInfo.style.display = 'none';
            if (teamsContainer) teamsContainer.style.display = 'none';
            if (startButton) startButton.hidden = true;
            if (skipButton) skipButton.hidden = true;

            // Create a dedicated render target for individual mode controllers
            // so they don't wipe the legacy elements with innerHTML = ''
            let renderTarget = this.container.querySelector('.game-mode-content');
            if (!renderTarget) {
                renderTarget = document.createElement('div');
                renderTarget.className = 'game-mode-content';
                this.gameContent.appendChild(renderTarget);
            }
            renderTarget.innerHTML = '';
            this.gameContent = renderTarget;

            // Show end game button and wire it
            if (endGameButton) {
                endGameButton.hidden = false;
                this._endGameHandler = () => this.endSession();
                endGameButton.addEventListener('click', this._endGameHandler);
            }
        } else {
            // Team modes: show skip/end buttons via GameView (legacy)
            if (startButton) startButton.hidden = true;
            if (endGameButton) {
                endGameButton.hidden = false;
                this._endGameHandler = () => this.endSession();
                endGameButton.addEventListener('click', this._endGameHandler);
            }
            if (skipButton) skipButton.hidden = false;
        }
    }

    /**
     * Restores the game UI to its default state after a session ends.
     * @private
     */
    restoreGameUI() {
        // Remove centralized Escape key handler
        if (this._escapeHandler) {
            document.removeEventListener('keydown', this._escapeHandler);
            this._escapeHandler = null;
        }

        const endGameButton = document.getElementById('endGameButton');
        const skipButton = document.getElementById('skipButton');
        const startButton = document.getElementById('startButton');
        const flagImage = document.getElementById('flagImage');
        const countryInfo = document.getElementById('countryInfo');
        const capitalInfo = document.getElementById('capitalInfo');
        const teamsContainer = document.getElementById('teamsContainer');

        if (flagImage) flagImage.style.display = '';
        if (countryInfo) countryInfo.style.display = '';
        if (capitalInfo) capitalInfo.style.display = '';
        if (teamsContainer) teamsContainer.style.display = '';
        if (startButton) startButton.hidden = false;
        if (endGameButton) {
            endGameButton.hidden = true;
            if (this._endGameHandler) {
                endGameButton.removeEventListener('click', this._endGameHandler);
                this._endGameHandler = null;
            }
        }
        if (skipButton) skipButton.hidden = true;

        // Remove the render target
        const renderTarget = this.container.querySelector('.game-mode-content');
        if (renderTarget) {
            renderTarget.remove();
        }

        // Reset gameContent reference
        this.gameContent = this.container.querySelector('.container') || this.container;
    }

    /**
     * Creates the appropriate controller instance based on mode ID.
     *
     * Individual modes (flagRush, capitalClash, streakBlitz, geoPuzzle, supervivencia)
     * get their dedicated controllers. Team modes (banderaFlash, capitalQuest) use
     * GameController, and letrasEnCaida uses WordDropController.
     *
     * @param {string} modeId - Mode identifier
     * @param {Object} modeOptions - Mode-specific options
     * @returns {Object} Controller instance
     * @private
     */
    createController(modeId, modeOptions) {
        switch (modeId) {
            case 'flagRush':
                return new FlagRushController({
                    container: this.gameContent,
                    onRoundEnd: (data) => this.handleRoundEnd(data),
                    onGameEnd: (data) => this.handleGameEnd(data),
                });

            case 'capitalClash':
                return new CapitalClashController({
                    container: this.gameContent,
                    onRoundEnd: (data) => this.handleRoundEnd(data),
                    onGameEnd: (data) => this.handleGameEnd(data),
                });

            case 'streakBlitz':
                return new StreakBlitzController({
                    container: this.gameContent,
                    onRoundEnd: (data) => this.handleRoundEnd(data),
                    onGameEnd: (data) => this.handleGameEnd(data),
                });

            case 'geoPuzzle':
                return new GeoPuzzleController({
                    container: this.gameContent,
                    onRoundEnd: (data) => this.handleRoundEnd(data),
                    onGameEnd: (data) => this.handleGameEnd(data),
                });

            case 'banderaFlash':
            case 'capitalQuest':
                return new GameController({
                    onGameEnd: (data) => this.handleGameEnd(data),
                    skipInit: true,
                });

            case 'ordenaContinente':
                return new OrdenaContinenteController({
                    container: this.gameContent,
                    onRoundEnd: (data) => this.handleRoundEnd(data),
                    onGameEnd: (data) => this.handleGameEnd(data),
                });

            case 'letrasEnCaida':
                return new WordDropController(this.countryService, this.statsService, {
                    onGameEnd: (data) => this.handleGameEnd(data),
                    onCorrectAnswer: () => this.handleLetrasCorrect(),
                    onIncorrectAnswer: () => this.handleLetrasIncorrect(),
                });

            default:
                throw new Error(`Unknown mode: ${modeId}`);
        }
    }

    /**
     * Starts the active controller with the appropriate parameters.
     *
     * @param {string} modeId - Mode identifier
     * @param {import('../models/Country.js').Country[]} pool - Country pool
     * @param {Object} modeOptions - Mode-specific options
     * @private
     */
    startController(modeId, pool, modeOptions) {
        switch (modeId) {
            case 'flagRush':
            case 'capitalClash':
            case 'streakBlitz':
            case 'geoPuzzle':
                this.activeController.start(pool, modeOptions);
                break;

            case 'banderaFlash':
            case 'capitalQuest':
                // GameController is started with external config and pool
                if (pool && pool.length > 0) {
                    this.activeController.startWithConfig(
                        { ...this.session.config, modeId },
                        pool
                    );
                }
                break;

            case 'ordenaContinente':
                this.activeController.start(pool, modeOptions);
                break;

            case 'letrasEnCaida': {
                const difficulty = modeOptions.difficulty || 'easy';
                const category = modeOptions.category || 'country';
                // hard = no flag, easy/medium = flag shown
                const showFlag = difficulty !== 'hard';
                // When guessing capitals, only include countries that have a capital registered
                const filteredPool = category === 'capital'
                    ? pool.filter(c => c.capital && c.capital.trim() !== '' && c.capital !== 'Desconocida')
                    : pool;
                this.activeController.start({
                    countries: filteredPool.length > 0 ? filteredPool : pool,
                    survival: modeOptions.survival !== false,
                    showFlag,
                    category,
                    speed: modeOptions.speed || 'normal',
                    difficulty,
                });
                break;
            }
        }
    }

    /**
     * Handles an answer from the active game session.
     *
     * Coordinates scoring, streak tracking, and power-up grants. This method
     * is called by the active controller's round-end callback or can be called
     * directly for modes that delegate scoring to the session manager.
     *
     * @param {boolean} correct - Whether the answer was correct
     * @param {number} timeRemaining - Seconds remaining when answered
     * @param {number} totalTime - Total seconds allocated for the question
     */
    handleAnswer(correct, timeRemaining, totalTime) {
        if (!this.session || !this.session.isActive) return;

        this.session.currentRound++;

        if (correct) {
            const streakResult = this.streakService.recordCorrect();
            this.session.streak = streakResult.count;
            this.session.multiplier = streakResult.multiplier;

            // Check if doublePoints power-up is active
            const doubleActive = this.session.activePowerUp === 'doublePoints';

            // Calculate points
            const points = this.scoringEngine.calculate(
                timeRemaining,
                totalTime,
                streakResult.multiplier,
                doubleActive
            );

            this.session.totalScore += points;

            // Check power-up grant at streak milestones
            const grantResult = this.powerUpService.checkGrant(streakResult.count);
            if (grantResult && grantResult.granted) {
                this.session.powerUps = [...this.powerUpService.inventory];
            }

            // Record round
            this.session.roundHistory.push({
                correct: true,
                points,
                timeMs: (totalTime - timeRemaining) * 1000,
            });

            // Clear active power-up after use
            this.session.activePowerUp = null;
        } else {
            this.streakService.recordIncorrect();
            this.session.streak = 0;
            this.session.multiplier = 1.0;

            // Record round
            this.session.roundHistory.push({
                correct: false,
                points: 0,
                timeMs: (totalTime - timeRemaining) * 1000,
            });

            // Clear active power-up
            this.session.activePowerUp = null;
        }
    }

    /**
     * Activates a power-up from the player's inventory.
     *
     * Delegates validation and activation to PowerUpService, then updates
     * session state with the active power-up for scoring purposes.
     *
     * @param {string} id - Power-up type id (e.g. 'timeExtra', 'fiftyFifty')
     * @param {string} type - Current question type ('multipleChoice' or 'freeText')
     * @returns {{success: boolean, error?: string, effect?: string}}
     */
    activatePowerUp(id, type) {
        if (!this.session || !this.session.isActive) {
            return { success: false, error: 'noActiveSession' };
        }

        const result = this.powerUpService.activate(id, type);

        if (result.success) {
            this.session.activePowerUp = id;
            this.session.powerUps = [...this.powerUpService.inventory];
            this.powerUpsUsedThisSession++;
        }

        return result;
    }

    /**
     * Ends the current game session.
     *
     * Stops the active controller, records session stats, checks achievements,
     * and invokes the onSessionEnd callback with full results.
     *
     * @returns {Object|null} Session results or null if no active session
     */
    endSession() {
        if (!this.session || !this.session.isActive) return null;

        this.session.isActive = false;

        // Sync round history from the controller before stopping it,
        // so that buildSessionResults() has accurate data even when the
        // user ends the game manually (stop() does not fire onGameEnd).
        if (this.activeController && this.activeController.roundHistory) {
            const controllerHistory = this.activeController.roundHistory;
            if (controllerHistory.length > 0) {
                this.session.roundHistory = controllerHistory.map(r => ({
                    correct: r.correct,
                    points: r.points || 0,
                    timeMs: r.timeRemaining != null ? r.timeRemaining * 1000 : (r.timeMs || 0),
                }));
            }
        }

        // Stop the active controller
        if (this.activeController) {
            if (typeof this.activeController.stop === 'function') {
                this.activeController.stop();
            }
        }

        // Restore game UI to default state
        this.restoreGameUI();

        // Calculate session results
        const results = this.buildSessionResults();

        // Record stats
        this.recordStats(results);

        // Check achievements
        let newAchievements = [];
        if (this.achievementService) {
            newAchievements = this.checkAchievements(results);
        }

        const fullResults = {
            ...results,
            newAchievements,
        };

        // Invoke callback
        if (this.onSessionEnd) {
            this.onSessionEnd(fullResults);
        }

        return fullResults;
    }

    /**
     * Handles a correct answer from the Letras en Caída controller.
     * Increments the streak via StreakService.
     * @private
     */
    handleLetrasCorrect() {
        if (!this.session || !this.session.isActive) return;

        const streakResult = this.streakService.recordCorrect();
        this.session.streak = streakResult.count;
        this.session.multiplier = streakResult.multiplier;
    }

    /**
     * Handles an incorrect answer or timeout from the Letras en Caída controller.
     * Resets the streak via StreakService.
     * @private
     */
    handleLetrasIncorrect() {
        if (!this.session || !this.session.isActive) return;

        this.streakService.recordIncorrect();
        this.session.streak = 0;
        this.session.multiplier = 1.0;
    }

    /**
     * Handles round-end data from the active controller.
     * Updates session state to stay in sync with the controller's internal state.
     *
     * @param {Object} data - Round-end data from the controller
     * @private
     */
    handleRoundEnd(data) {
        if (!this.session) return;

        // Sync session state with controller data
        if (data.totalScore !== undefined) {
            this.session.totalScore = data.totalScore;
        }
        if (data.streak !== undefined) {
            this.session.streak = data.streak;
        }
        if (data.livesRemaining !== undefined) {
            this.session.lives = data.livesRemaining;
        }

        this.session.currentRound = data.round || this.session.currentRound;
    }

    /**
     * Handles game-end data from the active controller.
     * Triggers endSession to finalize stats and achievements.
     *
     * @param {Object} data - Game-end data from the controller
     * @private
     */
    handleGameEnd(data) {
        if (!this.session) return;

        // Mark session as naturally completed (not manually abandoned)
        this.session.completedNaturally = true;

        // Sync final state from controller
        if (data.totalScore !== undefined) {
            this.session.totalScore = data.totalScore;
        }
        if (data.roundHistory) {
            // Use controller's round history for accurate data
            this.session.roundHistory = data.roundHistory.map(r => ({
                correct: r.correct,
                points: r.points || 0,
                timeMs: r.timeRemaining != null ? r.timeRemaining * 1000 : 0,
            }));
        }
        if (data.totalRounds !== undefined) {
            this.session.currentRound = data.totalRounds;
        }
        if (data.roundsReached !== undefined) {
            this.session.currentRound = data.roundsReached;
        }

        // Handle team mode end data (from GameController)
        if (data.teamScores) {
            const scores = data.teamScores;
            const correct = (scores.red || 0) + (scores.green || 0);
            const wrong = scores.blue || 0;
            this.session.totalScore = correct;
            this.session.roundHistory = [];
            // Build synthetic round history for team modes
            for (let i = 0; i < correct; i++) {
                this.session.roundHistory.push({ correct: true, points: 1, timeMs: 0 });
            }
            for (let i = 0; i < wrong; i++) {
                this.session.roundHistory.push({ correct: false, points: 0, timeMs: 0 });
            }
            this.session.currentRound = correct + wrong;
        }

        this.endSession();
    }

    /**
     * Builds the session results object from current session state.
     *
     * @returns {Object} Session results
     * @private
     */
    buildSessionResults() {
        const history = this.session.roundHistory;
        const correct = history.filter(r => r.correct).length;
        const wrong = history.filter(r => !r.correct).length;
        const totalQuestions = history.length;
        const elapsedSeconds = Math.round((Date.now() - this.sessionStartTime) / 1000);

        // Calculate highest streak from round history
        let maxStreak = 0;
        let currentStreak = 0;
        for (const round of history) {
            if (round.correct) {
                currentStreak++;
                if (currentStreak > maxStreak) maxStreak = currentStreak;
            } else {
                currentStreak = 0;
            }
        }

        // Calculate average response time
        const responseTimes = history
            .filter(r => r.timeMs != null && r.timeMs > 0)
            .map(r => r.timeMs / 1000);
        const avgResponseTime = responseTimes.length > 0
            ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
            : null;

        return {
            modeId: this.session.modeId,
            modeOptions: this.session.config?.modeOptions || {},
            continent: this.session.config?.continent || null,
            sovereignty: this.session.config?.sovereignty || null,
            totalScore: this.session.totalScore,
            correct,
            wrong,
            totalQuestions,
            elapsedSeconds,
            maxStreak,
            avgResponseTime,
            roundsReached: this.session.currentRound,
            powerUpsUsed: this.powerUpsUsedThisSession,
            roundHistory: history,
            completedNaturally: this.session.completedNaturally === true,
        };
    }

    /**
     * Records session stats to StatsService.
     * Uses recordIndividualGame for per-mode tracking.
     *
     * @param {Object} results - Session results
     * @private
     */
    recordStats(results) {
        if (!this.statsService) return;

        try {
            this.statsService.recordIndividualGame({
                modeId: results.modeId,
                totalScore: results.totalScore,
                correct: results.correct,
                wrong: results.wrong,
                elapsedSeconds: results.elapsedSeconds,
                powerUpsUsed: results.powerUpsUsed,
                completedNaturally: results.completedNaturally,
                totalQuestions: results.totalQuestions,
            });
        } catch {
            // Ignore stats recording errors
        }
    }

    /**
     * Checks achievements against session results and cumulative stats.
     *
     * @param {Object} results - Session results
     * @returns {string[]} Array of newly unlocked achievement IDs
     * @private
     */
    checkAchievements(results) {
        if (!this.achievementService) return [];

        try {
            const cumulativeStats = this.statsService ? this.statsService.getStats() : {};

            return this.achievementService.check(results, {
                totalCorrect: cumulativeStats.totalCorrect || 0,
                currentStreak: cumulativeStats.currentStreak || 0,
                uniqueCountriesCorrect: cumulativeStats.uniqueCountriesCorrect || [],
                modesCompleted: this.getModesCompleted(results.modeId),
                powerUpsUsed: this.getCumulativePowerUpsUsed(),
                continentCompleted: false,
            });
        } catch {
            return [];
        }
    }

    /**
     * Gets the list of modes completed, including the current one.
     *
     * @param {string} currentModeId - The mode just completed
     * @returns {string[]}
     * @private
     */
    getModesCompleted(currentModeId) {
        try {
            const stored = localStorage.getItem('flagquiz_modes_completed');
            const modes = stored ? JSON.parse(stored) : [];
            if (!modes.includes(currentModeId)) {
                modes.push(currentModeId);
                localStorage.setItem('flagquiz_modes_completed', JSON.stringify(modes));
            }
            return modes;
        } catch {
            return [currentModeId];
        }
    }

    /**
     * Gets the cumulative power-ups used count, including this session.
     *
     * @returns {number}
     * @private
     */
    getCumulativePowerUpsUsed() {
        try {
            const stored = localStorage.getItem('flagquiz_powerups_used');
            const total = (stored ? parseInt(stored, 10) : 0) + this.powerUpsUsedThisSession;
            localStorage.setItem('flagquiz_powerups_used', total.toString());
            return total;
        } catch {
            return this.powerUpsUsedThisSession;
        }
    }

    /**
     * Destroys the active controller and cleans up resources.
     * @private
     */
    destroyActiveController() {
        if (this.activeController) {
            if (typeof this.activeController.destroy === 'function') {
                this.activeController.destroy();
            }
            this.activeController = null;
        }
    }

    /**
     * Destroys the session manager and all associated resources.
     */
    destroy() {
        if (this._escapeHandler) {
            document.removeEventListener('keydown', this._escapeHandler);
            this._escapeHandler = null;
        }
        this.destroyActiveController();
        this.session = null;
        this.sessionStartTime = null;
    }

    /**
     * Returns whether a session is currently active.
     * @returns {boolean}
     */
    get isActive() {
        return this.session !== null && this.session.isActive;
    }

    /**
     * Returns the current session state (read-only copy).
     * @returns {GameSessionState|null}
     */
    getSessionState() {
        return this.session ? { ...this.session } : null;
    }
}
