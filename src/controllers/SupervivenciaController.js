import { DistractorService } from '../services/DistractorService.js';
import { ScoringEngine } from '../services/ScoringEngine.js';
import { StreakService } from '../services/StreakService.js';
import { PowerUpService } from '../services/PowerUpService.js';
import { MultipleChoiceView } from '../views/MultipleChoiceView.js';
import { TimerView } from '../views/TimerView.js';
import { StreakIndicatorView } from '../views/StreakIndicatorView.js';
import { PowerUpInventoryView } from '../views/PowerUpInventoryView.js';

/**
 * SupervivenciaController - Orchestrates the Supervivencia (Survival) game mode.
 *
 * A survival mode with 3 lives and progressive difficulty. The player answers
 * mixed flag/capital questions until all lives are lost. Difficulty increases
 * in tiers based on the current round number:
 *   - Rounds 1–10: 15s timer
 *   - Rounds 11–20: 10s timer
 *   - Rounds 21+: 7s timer with same-continent distractors (harder)
 *
 * Key mechanics:
 *   - 3 lives system: lose 1 life on incorrect answer or timeout
 *   - Game ends when lives reach 0 (no fixed round count)
 *   - Mixed question types: random flag/capital questions (max 3 consecutive same type)
 *   - Pool recycling: reshuffles and reuses countries when pool is exhausted
 *   - Full Scoring/Streak/PowerUp integration
 *   - Tracks rounds reached, total score, highest streak
 *
 * Implements IModeController-like interface:
 *   start(countryPool, modeOptions) - Begin a new session
 *   nextRound() - Advance to the next question
 *   handleAnswer(selectedIndex, isCorrect) - Process player's answer
 *   end() - End the session
 */
export class SupervivenciaController {
    /** @type {number} Default initial lives */
    static DEFAULT_LIVES = 3;

    /** @type {number} Default time per question in seconds (tier 1) */
    static DEFAULT_TIME = 15;

    /** @type {number} Maximum consecutive questions of the same type */
    static MAX_CONSECUTIVE_SAME_TYPE = 3;

    /** @type {number} Feedback display duration in milliseconds */
    static FEEDBACK_DELAY_MS = 1500;

    /**
     * Difficulty tier definitions based on round number.
     * @type {Array<{maxRound: number, time: number, sameContinentDistractors: boolean}>}
     */
    static DIFFICULTY_TIERS = [
        { maxRound: 10, time: 15, sameContinentDistractors: false },
        { maxRound: 20, time: 10, sameContinentDistractors: false },
        { maxRound: Infinity, time: 7, sameContinentDistractors: true },
    ];

    /**
     * @param {Object} options
     * @param {HTMLElement} options.container - Parent element to render the game UI into
     * @param {function} [options.onRoundEnd] - Callback after each round completes
     * @param {function} [options.onGameEnd] - Callback when all lives are lost
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
        this.lives = SupervivenciaController.DEFAULT_LIVES;
        this.timePerQuestion = SupervivenciaController.DEFAULT_TIME;
        this.currentRound = 0;
        this.totalScore = 0;
        this.isActive = false;
        this.currentCountry = null;
        this.currentQuestionType = null; // 'flag' or 'capital'
        this.consecutiveSameType = 0;
        this.lastQuestionType = null;
        this.feedbackTimeout = null;
        this.roundHistory = [];
        this.poolIndex = 0;

        // DOM element references
        this.promptEl = null;
        this.flagEl = null;
        this.mcContainer = null;
        this.timerContainer = null;
        this.streakContainer = null;
        this.powerUpContainer = null;
        this.scoreEl = null;
        this.livesEl = null;
        this.roundEl = null;
    }

    /**
     * Starts a new Supervivencia session.
     * @param {import('../models/Country.js').Country[]} countryPool - Filtered country pool
     * @param {Object} [modeOptions] - Mode-specific options
     * @param {number} [modeOptions.timePerQuestion] - Initial seconds per question (default 15)
     */
    start(countryPool, modeOptions = {}) {
        this.pool = countryPool.slice();
        this.timePerQuestion = modeOptions.timePerQuestion || SupervivenciaController.DEFAULT_TIME;
        this.lives = SupervivenciaController.DEFAULT_LIVES;
        this.currentRound = 0;
        this.totalScore = 0;
        this.isActive = true;
        this.currentCountry = null;
        this.currentQuestionType = null;
        this.consecutiveSameType = 0;
        this.lastQuestionType = null;
        this.roundHistory = [];
        this.poolIndex = 0;

        // Reset services
        this.streakService.reset();
        this.powerUpService.reset();

        // Shuffle pool
        this.shufflePool();

        // Build UI
        this.render();

        // Start first round
        this.nextRound();
    }

    /**
     * Returns the difficulty tier configuration for the given round number.
     * @param {number} round - Current round number (1-based)
     * @returns {{time: number, sameContinentDistractors: boolean}}
     */
    getDifficultyForRound(round) {
        for (const tier of SupervivenciaController.DIFFICULTY_TIERS) {
            if (round <= tier.maxRound) {
                return { time: tier.time, sameContinentDistractors: tier.sameContinentDistractors };
            }
        }
        // Fallback to hardest tier
        const lastTier = SupervivenciaController.DIFFICULTY_TIERS[SupervivenciaController.DIFFICULTY_TIERS.length - 1];
        return { time: lastTier.time, sameContinentDistractors: lastTier.sameContinentDistractors };
    }

    /**
     * Determines the next question type (flag or capital), enforcing
     * the max 3 consecutive same-type constraint.
     * @returns {'flag' | 'capital'}
     */
    pickQuestionType() {
        // If we've hit the max consecutive limit, force the other type
        if (this.consecutiveSameType >= SupervivenciaController.MAX_CONSECUTIVE_SAME_TYPE) {
            return this.lastQuestionType === 'flag' ? 'capital' : 'flag';
        }

        // Random pick
        return Math.random() < 0.5 ? 'flag' : 'capital';
    }

    /**
     * Advances to the next round. Picks a country, determines question type,
     * generates distractors based on difficulty tier, renders the question
     * and options, and starts the timer.
     */
    nextRound() {
        if (!this.isActive) return;

        this.currentRound++;

        // Pool recycling: reshuffle when all countries have been used
        if (this.poolIndex >= this.pool.length) {
            this.poolIndex = 0;
            this.shufflePool();
        }

        // Pick the current country from the pool
        this.currentCountry = this.pool[this.poolIndex];
        this.poolIndex++;

        // Get difficulty settings for this round
        const difficulty = this.getDifficultyForRound(this.currentRound);

        // Determine question type
        this.currentQuestionType = this.pickQuestionType();

        // Track consecutive same type
        if (this.currentQuestionType === this.lastQuestionType) {
            this.consecutiveSameType++;
        } else {
            this.consecutiveSameType = 1;
        }
        this.lastQuestionType = this.currentQuestionType;

        // Generate 3 distractors based on difficulty tier
        const distractors = this.distractorService.generateDistractors(
            this.currentCountry, this.pool, 3, difficulty.sameContinentDistractors
        );

        // Shuffle correct + distractors into 4 options
        const shuffledOptions = this.distractorService.shuffleOptions(
            this.currentCountry, distractors
        );

        // Build options array based on question type
        let options;
        if (this.currentQuestionType === 'flag') {
            // Flag question: show flag, pick from country names
            options = shuffledOptions.map(country => ({
                text: country.displayName,
                correct: country === this.currentCountry,
            }));
        } else {
            // Capital question: show country name, pick from capitals
            options = shuffledOptions.map(country => ({
                text: country.capital,
                correct: country === this.currentCountry,
            }));
        }

        // Update prompt/flag display based on question type
        if (this.currentQuestionType === 'flag') {
            if (this.flagEl) {
                this.flagEl.src = this.currentCountry.flagUrl;
                this.flagEl.alt = 'Bandera del país a identificar';
                this.flagEl.style.display = '';
            }
            if (this.promptEl) {
                this.promptEl.style.display = 'none';
            }
        } else {
            if (this.promptEl) {
                this.promptEl.textContent = this.currentCountry.displayName;
                this.promptEl.setAttribute('aria-label', `País: ${this.currentCountry.displayName}`);
                this.promptEl.style.display = '';
            }
            if (this.flagEl) {
                this.flagEl.style.display = 'none';
            }
        }

        // Update round and lives display
        this.updateRound();
        this.updateLives();

        // Reset power-up per-question state
        this.powerUpService.resetQuestionState();
        if (this.powerUpInventoryView) {
            this.powerUpInventoryView.resetRound();
            this.powerUpInventoryView.update(this.powerUpService.inventory);
        }

        // Render multiple choice options
        if (this.multipleChoiceView) {
            this.multipleChoiceView.destroy();
            this.multipleChoiceView = new MultipleChoiceView({ container: this.mcContainer });
            this.multipleChoiceView.render(options, (selectedIndex, isCorrect) => {
                this.handleAnswer(selectedIndex, isCorrect);
            });
        }

        // Start timer with difficulty-adjusted time
        if (this.timerView) {
            this.timerView.stop();
            this.timerView.start(difficulty.time);
        }
    }

    /**
     * Handles the player's answer (correct, incorrect, or timeout).
     * Calculates score, updates streak, deducts lives on incorrect,
     * and shows feedback for 1.5s before advancing.
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

        // Get the current round's total time for scoring
        const difficulty = this.getDifficultyForRound(this.currentRound);
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
                difficulty.time,
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

            // Deduct a life
            this.lives--;

            // Update streak indicator
            if (this.streakIndicatorView) {
                this.streakIndicatorView.update(
                    streakResult.tier, streakResult.count, streakResult.multiplier
                );
            }

            // Update lives display
            this.updateLives();
        }

        // Update score display
        this.updateScore();

        // Record round history
        this.roundHistory.push({
            correct: isCorrect,
            points: roundPoints,
            timeRemaining,
            country: this.currentCountry,
            questionType: this.currentQuestionType,
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
                questionType: this.currentQuestionType,
                livesRemaining: this.lives,
            });
        }

        // Check if game is over (no lives remaining)
        if (this.lives <= 0) {
            this.feedbackTimeout = setTimeout(() => {
                this.feedbackTimeout = null;
                this.end();
            }, SupervivenciaController.FEEDBACK_DELAY_MS);
            return;
        }

        // Show feedback for 1.5s then advance
        this.feedbackTimeout = setTimeout(() => {
            this.feedbackTimeout = null;
            this.nextRound();
        }, SupervivenciaController.FEEDBACK_DELAY_MS);
    }

    /**
     * Handles timer expiration (timeout). Marks the round as incorrect.
     */
    handleTimeout() {
        if (!this.isActive) return;

        // Disable options
        if (this.multipleChoiceView) {
            this.multipleChoiceView.disable();
        }

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

        // Determine the correct text based on question type
        const correctText = this.currentQuestionType === 'flag'
            ? this.currentCountry.displayName
            : this.currentCountry.capital;

        buttons.forEach((btn, index) => {
            if (btn.textContent !== correctText) {
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
     * Ends the Supervivencia session. Cleans up timers and invokes onGameEnd.
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
                roundsReached: this.currentRound,
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

        // Score + lives + round header
        const header = document.createElement('div');
        header.className = 'supervivencia-header';

        this.scoreEl = document.createElement('div');
        this.scoreEl.className = 'supervivencia-score';
        this.scoreEl.setAttribute('aria-label', 'Puntuación');
        this.scoreEl.textContent = '0';
        header.appendChild(this.scoreEl);

        this.livesEl = document.createElement('div');
        this.livesEl.className = 'supervivencia-lives';
        this.livesEl.setAttribute('aria-label', 'Vidas restantes');
        this.livesEl.setAttribute('aria-live', 'polite');
        this.livesEl.textContent = '❤️'.repeat(this.lives);
        header.appendChild(this.livesEl);

        this.roundEl = document.createElement('div');
        this.roundEl.className = 'supervivencia-round';
        this.roundEl.setAttribute('aria-label', 'Ronda actual');
        this.roundEl.textContent = 'Ronda 1';
        header.appendChild(this.roundEl);

        this.container.appendChild(header);

        // Streak indicator
        this.streakContainer = document.createElement('div');
        this.streakContainer.className = 'supervivencia-streak';
        this.container.appendChild(this.streakContainer);
        this.streakIndicatorView = new StreakIndicatorView({ container: this.streakContainer });

        // Timer
        this.timerContainer = document.createElement('div');
        this.timerContainer.className = 'supervivencia-timer';
        this.container.appendChild(this.timerContainer);
        this.timerView = new TimerView({
            container: this.timerContainer,
            onExpired: () => this.handleTimeout(),
        });

        // Flag image (shown for flag questions)
        this.flagEl = document.createElement('img');
        this.flagEl.className = 'supervivencia-flag';
        this.flagEl.alt = 'Bandera del país a identificar';
        this.flagEl.src = '';
        this.flagEl.style.display = 'none';
        this.container.appendChild(this.flagEl);

        // Text prompt (shown for capital questions)
        this.promptEl = document.createElement('h2');
        this.promptEl.className = 'supervivencia-prompt';
        this.promptEl.setAttribute('aria-live', 'polite');
        this.promptEl.style.display = 'none';
        this.container.appendChild(this.promptEl);

        // Multiple choice container
        this.mcContainer = document.createElement('div');
        this.mcContainer.className = 'supervivencia-options';
        this.container.appendChild(this.mcContainer);
        this.multipleChoiceView = new MultipleChoiceView({ container: this.mcContainer });

        // Power-up inventory
        this.powerUpContainer = document.createElement('div');
        this.powerUpContainer.className = 'supervivencia-powerups';
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
     * Updates the lives display element.
     * @private
     */
    updateLives() {
        if (this.livesEl) {
            this.livesEl.textContent = '❤️'.repeat(Math.max(0, this.lives));
        }
    }

    /**
     * Updates the round display element.
     * @private
     */
    updateRound() {
        if (this.roundEl) {
            this.roundEl.textContent = `Ronda ${this.currentRound}`;
        }
    }

    /**
     * Calculates the highest streak achieved during the session.
     * @returns {number}
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
