import { DistractorService } from '../services/DistractorService.js';
import { ScoringEngine } from '../services/ScoringEngine.js';
import { StreakService } from '../services/StreakService.js';
import { PowerUpService } from '../services/PowerUpService.js';
import { MultipleChoiceView } from '../views/MultipleChoiceView.js';
import { TimerView } from '../views/TimerView.js';
import { StreakIndicatorView } from '../views/StreakIndicatorView.js';
import { PowerUpInventoryView } from '../views/PowerUpInventoryView.js';

/**
 * FlagRushController - Orchestrates the Flag Rush individual game mode.
 *
 * Displays a flag image with 4 multiple-choice country name options.
 * Player must identify the correct country within a configurable time limit.
 * Integrates ScoringEngine, StreakService, and PowerUpService for full
 * scoring, streak multipliers, and power-up mechanics.
 *
 * Implements IModeController-like interface:
 *   start(countryPool, modeOptions) - Begin a new session
 *   nextRound() - Advance to the next question
 *   handleAnswer(selectedIndex, isCorrect) - Process player's answer
 *   end() - End the session
 */
export class FlagRushController {
    /** @type {number} Default time per question in seconds */
    static DEFAULT_TIME = 10;

    /** @type {number} Default number of rounds */
    static DEFAULT_ROUNDS = 10;

    /** @type {number} Feedback display duration in milliseconds */
    static FEEDBACK_DELAY_MS = 1500;

    /**
     * @param {Object} options
     * @param {HTMLElement} options.container - Parent element to render the game UI into
     * @param {function} [options.onRoundEnd] - Callback after each round completes
     * @param {function} [options.onGameEnd] - Callback when all rounds are finished
     */
    constructor({ container, onRoundEnd = null, onGameEnd = null }) {
        this.container = container;
        this.onRoundEnd = onRoundEnd;
        this.onGameEnd = onGameEnd;

        // Services
        this.distractorService = new DistractorService();
        this.scoringEngine = new ScoringEngine();
        this.streakService = new StreakService();
        this.powerUpService = new PowerUpService();

        // Views (initialized on start)
        this.multipleChoiceView = null;
        this.timerView = null;
        this.streakIndicatorView = null;
        this.powerUpInventoryView = null;

        // Game state
        this.pool = [];
        this.totalRounds = FlagRushController.DEFAULT_ROUNDS;
        this.timePerQuestion = FlagRushController.DEFAULT_TIME;
        this.currentRound = 0;
        this.totalScore = 0;
        this.isActive = false;
        this.currentCountry = null;
        this.feedbackTimeout = null;
        this.roundHistory = [];

        // DOM element references
        this.flagEl = null;
        this.mcContainer = null;
        this.timerContainer = null;
        this.streakContainer = null;
        this.powerUpContainer = null;
        this.scoreEl = null;
        this.progressEl = null;
        this.skipBtn = null;
    }

    /**
     * Starts a new Flag Rush session.
     * @param {import('../models/Country.js').Country[]} countryPool - Filtered country pool
     * @param {Object} [modeOptions] - Mode-specific options
     * @param {number} [modeOptions.rounds] - Number of rounds (default 10)
     * @param {number} [modeOptions.timePerQuestion] - Seconds per question (default 10)
     */
    start(countryPool, modeOptions = {}) {
        this.pool = countryPool.slice();
        this.totalRounds = modeOptions.rounds || FlagRushController.DEFAULT_ROUNDS;
        this.timePerQuestion = modeOptions.timePerQuestion || FlagRushController.DEFAULT_TIME;
        this.currentRound = 0;
        this.totalScore = 0;
        this.isActive = true;
        this.roundHistory = [];

        // Reset services
        this.streakService.reset();
        this.powerUpService.reset();
        this.distractorService.resetPositionHistory();

        // Shuffle pool
        this.shufflePool();

        // Build UI
        this.render();

        // Start first round
        this.nextRound();
    }

    /**
     * Advances to the next round. Picks a country, generates distractors,
     * renders the flag and options, and starts the timer.
     */
    nextRound() {
        if (!this.isActive) return;

        this.currentRound++;

        if (this.currentRound > this.totalRounds || this.currentRound > this.pool.length) {
            this.end();
            return;
        }

        // Pick the current country from the shuffled pool
        this.currentCountry = this.pool[this.currentRound - 1];

        // Generate 3 distractors (same continent preference)
        const distractors = this.distractorService.generateDistractors(
            this.currentCountry, this.pool, 3, true
        );

        // Shuffle correct + distractors into 4 options
        const shuffledOptions = this.distractorService.shuffleOptions(
            this.currentCountry, distractors
        );

        // Build options array for MultipleChoiceView
        const options = shuffledOptions.map(country => ({
            text: country.displayName,
            correct: country === this.currentCountry,
        }));

        // Update flag image
        if (this.flagEl) {
            this.flagEl.src = this.currentCountry.flagUrl;
            this.flagEl.alt = 'Bandera del país a identificar';
        }

        // Update progress display
        this.updateProgress();

        // Reset power-up per-question state
        this.powerUpService.resetQuestionState();
        if (this.powerUpInventoryView) {
            this.powerUpInventoryView.resetRound();
            this.powerUpInventoryView.update(this.powerUpService.inventory);
        }

        // Re-enable skip button for new round
        if (this.skipBtn) this.skipBtn.disabled = false;

        // Render multiple choice options
        if (this.multipleChoiceView) {
            this.multipleChoiceView.destroy();
            this.multipleChoiceView = new MultipleChoiceView({ container: this.mcContainer });
            this.multipleChoiceView.render(options, (selectedIndex, isCorrect) => {
                this.handleAnswer(selectedIndex, isCorrect);
            });
        }

        // Start timer
        if (this.timerView) {
            this.timerView.stop();
            this.timerView.start(this.timePerQuestion);
        }
    }

    /**
     * Handles the player's answer (correct, incorrect, or timeout).
     * Calculates score, updates streak, checks power-up grants, and
     * shows feedback for 1.5s before advancing.
     *
     * @param {number} selectedIndex - Index of the selected option (-1 for timeout)
     * @param {boolean} isCorrect - Whether the answer was correct
     */
    handleAnswer(selectedIndex, isCorrect) {
        if (!this.isActive) return;

        // Stop the timer
        const timeRemaining = this.timerView ? this.timerView.getRemaining() : 0;
        if (this.timerView) {
            this.timerView.stop();
        }

        // Disable further selections
        if (this.multipleChoiceView) {
            this.multipleChoiceView.disable();
        }

        let roundPoints = 0;

        if (isCorrect) {
            // Record correct in streak
            const streakResult = this.streakService.recordCorrect();

            // Check if doublePoints power-up is active
            const doubleActive = this.powerUpService.activatedThisQuestion &&
                this.lastActivatedPowerUp === 'doublePoints';

            // Calculate points
            roundPoints = this.scoringEngine.calculate(
                timeRemaining,
                this.timePerQuestion,
                streakResult.multiplier,
                doubleActive
            );

            this.totalScore += roundPoints;

            // Update streak indicator
            if (this.streakIndicatorView) {
                this.streakIndicatorView.update(
                    streakResult.tier, streakResult.count, streakResult.multiplier
                );
            }

            // Check power-up grant at streak milestones
            const grantResult = this.powerUpService.checkGrant(streakResult.count);
            if (grantResult && grantResult.granted) {
                if (this.powerUpInventoryView) {
                    this.powerUpInventoryView.update(this.powerUpService.inventory);
                }
            }
        } else {
            // Record incorrect in streak
            const streakResult = this.streakService.recordIncorrect();

            // Update streak indicator
            if (this.streakIndicatorView) {
                this.streakIndicatorView.update(
                    streakResult.tier, streakResult.count, streakResult.multiplier
                );
            }
        }

        // Update score display
        this.updateScore();

        // Record round history
        this.roundHistory.push({
            correct: isCorrect,
            points: roundPoints,
            timeRemaining,
            country: this.currentCountry,
        });

        // Invoke onRoundEnd callback
        if (this.onRoundEnd) {
            this.onRoundEnd({
                round: this.currentRound,
                correct: isCorrect,
                points: roundPoints,
                totalScore: this.totalScore,
                streak: this.streakService.count,
                timeRemaining,
            });
        }

        // Show feedback for 1.5s then advance
        this.feedbackTimeout = setTimeout(() => {
            this.feedbackTimeout = null;
            this.nextRound();
        }, FlagRushController.FEEDBACK_DELAY_MS);
    }

    /**
     * Handles timer expiration (timeout). Marks the round as incorrect.
     */
    handleTimeout() {
        if (!this.isActive) return;

        // Disable options and show correct answer
        if (this.multipleChoiceView) {
            this.multipleChoiceView.disable();
        }

        this.handleAnswer(-1, false);
    }

    /**
     * Handles the skip button. Counts as incorrect, advances immediately.
     */
    handleSkip() {
        if (!this.isActive || this.feedbackTimeout) return;

        if (this.timerView) this.timerView.stop();
        if (this.multipleChoiceView) this.multipleChoiceView.disable();
        if (this.skipBtn) this.skipBtn.disabled = true;

        this.handleAnswer(-1, false);
    }

    /**
     * Handles power-up activation from the inventory view.
     * @param {string} powerUpId - The power-up type id to activate
     */
    handlePowerUpActivation(powerUpId) {
        const result = this.powerUpService.activate(powerUpId, 'multipleChoice');

        if (!result.success) return;

        this.lastActivatedPowerUp = powerUpId;

        // Apply power-up effect
        switch (powerUpId) {
            case 'timeExtra':
                if (this.timerView) {
                    this.timerView.addTime(5);
                }
                break;

            case 'fiftyFifty':
                this.applyFiftyFifty();
                break;

            case 'freeze':
                if (this.timerView) {
                    this.timerView.freeze();
                }
                break;

            case 'doublePoints':
                // Effect applied during score calculation
                break;
        }

        // Update inventory display
        if (this.powerUpInventoryView) {
            this.powerUpInventoryView.update(this.powerUpService.inventory);
        }
    }

    /**
     * Applies the 50/50 power-up: disables 2 incorrect options.
     * @private
     */
    applyFiftyFifty() {
        if (!this.mcContainer) return;

        const buttons = this.mcContainer.querySelectorAll('.mc-option');
        const incorrectIndices = [];

        buttons.forEach((btn, index) => {
            if (btn.textContent !== this.currentCountry.displayName) {
                incorrectIndices.push(index);
            }
        });

        // Pick 2 random incorrect indices to disable
        const toDisable = this.distractorService.pickRandom(incorrectIndices, 2);

        if (this.multipleChoiceView) {
            this.multipleChoiceView.disableOptions(toDisable);
        }
    }

    /**
     * Ends the Flag Rush session. Cleans up timers and invokes onGameEnd.
     */
    end() {
        this.isActive = false;

        // Clear any pending feedback timeout
        if (this.feedbackTimeout) {
            clearTimeout(this.feedbackTimeout);
            this.feedbackTimeout = null;
        }

        // Stop timer
        if (this.timerView) {
            this.timerView.stop();
        }

        // Invoke onGameEnd callback
        if (this.onGameEnd) {
            this.onGameEnd({
                totalScore: this.totalScore,
                totalRounds: this.roundHistory.length,
                roundHistory: this.roundHistory,
                highestStreak: this.getHighestStreak(),
            });
        }
    }

    /**
     * Stops the controller immediately without triggering onGameEnd.
     */
    stop() {
        this.isActive = false;

        if (this.feedbackTimeout) {
            clearTimeout(this.feedbackTimeout);
            this.feedbackTimeout = null;
        }

        if (this.timerView) {
            this.timerView.stop();
        }
    }

    /**
     * Destroys the controller, removing all DOM elements and cleaning up.
     */
    destroy() {
        this.stop();

        if (this.timerView) this.timerView.destroy();
        if (this.multipleChoiceView) this.multipleChoiceView.destroy();
        if (this.streakIndicatorView) this.streakIndicatorView.destroy();
        if (this.powerUpInventoryView) this.powerUpInventoryView.destroy();

        if (this.container) {
            this.container.innerHTML = '';
        }

        this.timerView = null;
        this.multipleChoiceView = null;
        this.streakIndicatorView = null;
        this.powerUpInventoryView = null;
    }

    /**
     * Builds the game UI layout inside the container.
     * @private
     */
    render() {
        if (!this.container) return;

        this.container.innerHTML = '';

        // Score + progress header
        const header = document.createElement('div');
        header.className = 'flag-rush-header';

        this.scoreEl = document.createElement('div');
        this.scoreEl.className = 'flag-rush-score';
        this.scoreEl.setAttribute('aria-label', 'Puntuación');
        this.scoreEl.textContent = '0';
        header.appendChild(this.scoreEl);

        this.progressEl = document.createElement('div');
        this.progressEl.className = 'flag-rush-progress';
        this.progressEl.setAttribute('aria-label', 'Progreso');
        this.progressEl.textContent = `1 / ${this.totalRounds}`;
        header.appendChild(this.progressEl);

        this.container.appendChild(header);

        // Streak indicator
        this.streakContainer = document.createElement('div');
        this.streakContainer.className = 'flag-rush-streak';
        this.container.appendChild(this.streakContainer);
        this.streakIndicatorView = new StreakIndicatorView({ container: this.streakContainer });

        // Timer
        this.timerContainer = document.createElement('div');
        this.timerContainer.className = 'flag-rush-timer';
        this.container.appendChild(this.timerContainer);
        this.timerView = new TimerView({
            container: this.timerContainer,
            onExpired: () => this.handleTimeout(),
        });

        // Flag image
        this.flagEl = document.createElement('img');
        this.flagEl.className = 'flag-rush-flag';
        this.flagEl.alt = 'Bandera del país a identificar';
        this.flagEl.decoding = 'async';
        this.flagEl.src = '';
        this.container.appendChild(this.flagEl);

        // Multiple choice container
        this.mcContainer = document.createElement('div');
        this.mcContainer.className = 'flag-rush-options';
        this.container.appendChild(this.mcContainer);
        this.multipleChoiceView = new MultipleChoiceView({ container: this.mcContainer });

        // Skip button
        this.skipBtn = document.createElement('button');
        this.skipBtn.className = 'mode-skip-btn';
        this.skipBtn.type = 'button';
        this.skipBtn.textContent = 'Saltar';
        this.skipBtn.setAttribute('aria-label', 'Saltar esta pregunta');
        this.skipBtn.addEventListener('click', () => this.handleSkip());
        this.container.appendChild(this.skipBtn);

        // Power-up inventory
        this.powerUpContainer = document.createElement('div');
        this.powerUpContainer.className = 'flag-rush-powerups';
        this.container.appendChild(this.powerUpContainer);
        this.powerUpInventoryView = new PowerUpInventoryView({
            container: this.powerUpContainer,
            onActivate: (id) => this.handlePowerUpActivation(id),
        });
    }

    /**
     * Updates the score display element.
     * @private
     */
    updateScore() {
        if (this.scoreEl) {
            this.scoreEl.textContent = this.totalScore.toString();
        }
    }

    /**
     * Updates the progress display element.
     * @private
     */
    updateProgress() {
        if (this.progressEl) {
            this.progressEl.textContent = `${this.currentRound} / ${this.totalRounds}`;
        }
    }

    /**
     * Calculates the highest streak achieved during the session.
     * @returns {number}
     * @private
     */
    getHighestStreak() {
        let highest = 0;
        let current = 0;

        for (const round of this.roundHistory) {
            if (round.correct) {
                current++;
                if (current > highest) highest = current;
            } else {
                current = 0;
            }
        }

        return highest;
    }

    /**
     * Shuffles the country pool using Fisher-Yates algorithm.
     * @private
     */
    shufflePool() {
        for (let i = this.pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.pool[i], this.pool[j]] = [this.pool[j], this.pool[i]];
        }
    }
}
