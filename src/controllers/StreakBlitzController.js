import { DistractorService } from '../services/DistractorService.js';
import { ScoringEngine } from '../services/ScoringEngine.js';
import { StreakService } from '../services/StreakService.js';
import { PowerUpService } from '../services/PowerUpService.js';
import { MultipleChoiceView } from '../views/MultipleChoiceView.js';
import { TimerView } from '../views/TimerView.js';
import { StreakIndicatorView } from '../views/StreakIndicatorView.js';
import { PowerUpInventoryView } from '../views/PowerUpInventoryView.js';

/**
 * StreakBlitzController - Unified controller for timed/survival mixed-question modes.
 *
 * Supports two end conditions via `modeOptions.endCondition`:
 *   - "time" (default): 90s session timer, game ends when time runs out.
 *   - "lives": 3 lives, game ends when all lives are lost. Includes progressive difficulty.
 *
 * Mixes flag identification (flag → country name) and capital identification
 * (country name → capital) questions. Max 3 consecutive of same type.
 *
 * Progressive difficulty (lives mode only):
 *   - Rounds 1–10: 15s timer
 *   - Rounds 11–20: 10s timer
 *   - Rounds 21+: 7s timer with same-continent distractors
 *
 * Implements IModeController-like interface:
 *   start(countryPool, modeOptions) - Begin a new session
 *   nextRound() - Advance to the next question
 *   handleAnswer(selectedIndex, isCorrect) - Process player's answer
 *   end() - End the session
 */
export class StreakBlitzController {
    /** @type {number} Default session time in seconds (time mode) */
    static DEFAULT_SESSION_TIME = 90;

    /** @type {number} Default time per question in seconds */
    static DEFAULT_TIME_PER_QUESTION = 10;

    /** @type {number} Default initial lives (lives mode) */
    static DEFAULT_LIVES = 3;

    /** @type {number} Maximum consecutive questions of the same type */
    static MAX_CONSECUTIVE_SAME_TYPE = 3;

    /** @type {number} Feedback display duration in milliseconds (both modes) */
    static FEEDBACK_DELAY_MS = 700;

    /**
     * Difficulty tier definitions for lives mode (progressive difficulty).
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
     * @param {function} [options.onRoundEnd] - Callback after each question completes
     * @param {function} [options.onGameEnd] - Callback when the session ends
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
        this.questionTimerView = null;
        this.sessionTimerView = null;
        this.streakIndicatorView = null;
        this.powerUpInventoryView = null;

        // Game state
        this.pool = [];
        this.endCondition = 'time'; // 'time' or 'lives'
        this.sessionTime = StreakBlitzController.DEFAULT_SESSION_TIME;
        this.timePerQuestion = StreakBlitzController.DEFAULT_TIME_PER_QUESTION;
        this.lives = StreakBlitzController.DEFAULT_LIVES;
        this.currentRound = 0;
        this.totalScore = 0;
        this.correctCount = 0;
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
        this.questionTimerContainer = null;
        this.sessionTimerContainer = null;
        this.streakContainer = null;
        this.powerUpContainer = null;
        this.scoreEl = null;
        this.questionCountEl = null;
        this.livesEl = null;
        this.skipBtn = null;
    }

    /**
     * Starts a new session.
     * @param {import('../models/Country.js').Country[]} countryPool - Filtered country pool
     * @param {Object} [modeOptions] - Mode-specific options
     * @param {string} [modeOptions.endCondition] - 'time' or 'lives' (default 'time')
     * @param {number} [modeOptions.sessionTime] - Session duration in seconds (time mode, default 90)
     * @param {number} [modeOptions.timePerQuestion] - Seconds per question (default 10)
     */
    start(countryPool, modeOptions = {}) {
        // Filter out countries without a valid capital (needed for capital questions)
        this.pool = countryPool.filter(c => c.capital && c.capital !== 'Sin capital' && c.capital !== 'Desconocida');
        this.endCondition = modeOptions.endCondition || 'time';
        this.sessionTime = modeOptions.sessionTime || StreakBlitzController.DEFAULT_SESSION_TIME;
        this.timePerQuestion = modeOptions.timePerQuestion || StreakBlitzController.DEFAULT_TIME_PER_QUESTION;
        this.lives = StreakBlitzController.DEFAULT_LIVES;
        this.currentRound = 0;
        this.totalScore = 0;
        this.correctCount = 0;
        this.isActive = true;
        this.currentCountry = null;
        this.currentQuestionType = null;
        this.consecutiveSameType = 0;
        this.lastQuestionType = null;
        this.feedbackTimeout = null;
        this.roundHistory = [];
        this.poolIndex = 0;

        // Reset services
        this.streakService.reset();
        this.powerUpService.reset();
        this.distractorService.resetPositionHistory();

        // Shuffle pool
        this.shufflePool();

        // Build UI
        this.render();

        // Start session timer (time mode only)
        if (this.endCondition === 'time') {
            this.startSessionTimer();
        }

        // Start first question
        this.nextRound();
    }

    /**
     * Starts the session countdown timer (time mode only).
     * @private
     */
    startSessionTimer() {
        if (this.sessionTimerView) {
            this.sessionTimerView.start(this.sessionTime);
        }
    }

    /**
     * Handles session timer expiration. Ends the game immediately.
     * @private
     */
    handleSessionExpired() {
        if (!this.isActive) return;
        this.end();
    }

    /**
     * Returns the difficulty tier configuration for the given round number.
     * Used in lives mode for progressive difficulty.
     * @param {number} round - Current round number (1-based)
     * @returns {{time: number, sameContinentDistractors: boolean}}
     */
    getDifficultyForRound(round) {
        if (this.endCondition !== 'lives') {
            return { time: this.timePerQuestion, sameContinentDistractors: true };
        }
        for (const tier of StreakBlitzController.DIFFICULTY_TIERS) {
            if (round <= tier.maxRound) {
                return { time: tier.time, sameContinentDistractors: tier.sameContinentDistractors };
            }
        }
        const lastTier = StreakBlitzController.DIFFICULTY_TIERS[StreakBlitzController.DIFFICULTY_TIERS.length - 1];
        return { time: lastTier.time, sameContinentDistractors: lastTier.sameContinentDistractors };
    }

    /**
     * Determines the next question type (flag or capital), enforcing
     * the max 3 consecutive same-type constraint.
     * @returns {'flag' | 'capital'}
     * @private
     */
    pickQuestionType() {
        if (this.consecutiveSameType >= StreakBlitzController.MAX_CONSECUTIVE_SAME_TYPE) {
            return this.lastQuestionType === 'flag' ? 'capital' : 'flag';
        }
        return Math.random() < 0.5 ? 'flag' : 'capital';
    }

    /**
     * Advances to the next question.
     */
    nextRound() {
        if (!this.isActive) return;

        this.currentRound++;

        // Pool recycling
        if (this.poolIndex >= this.pool.length) {
            this.poolIndex = 0;
            this.shufflePool();
        }

        this.currentCountry = this.pool[this.poolIndex];
        this.poolIndex++;

        // Get difficulty settings
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

        // Generate 3 distractors
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
            options = shuffledOptions.map(country => ({
                text: country.displayName,
                correct: country === this.currentCountry,
            }));
        } else {
            options = shuffledOptions.map(country => ({
                text: country.capital,
                correct: country === this.currentCountry,
            }));
        }

        // Update prompt/flag display
        if (this.currentQuestionType === 'flag') {
            if (this.flagEl) {
                this.flagEl.src = this.currentCountry.flagUrl;
                this.flagEl.alt = 'Bandera del país a identificar';
                this.flagEl.style.visibility = '';
            }
            if (this.promptEl) {
                this.promptEl.style.visibility = 'hidden';
                this.promptEl.textContent = '';
            }
        } else {
            if (this.promptEl) {
                this.promptEl.textContent = this.currentCountry.displayName;
                this.promptEl.setAttribute('aria-label', `País: ${this.currentCountry.displayName}`);
                this.promptEl.style.visibility = '';
            }
            if (this.flagEl) {
                this.flagEl.style.visibility = 'hidden';
            }
        }

        // Update question count / round display
        this.updateQuestionCount();

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

        // Start per-question timer
        if (this.questionTimerView) {
            this.questionTimerView.stop();
            this.questionTimerView.start(difficulty.time);
        }
    }

    /**
     * Handles the player's answer.
     * @param {number} selectedIndex - Index of the selected option (-1 for timeout)
     * @param {boolean} isCorrect - Whether the answer was correct
     */
    handleAnswer(selectedIndex, isCorrect) {
        if (!this.isActive) return;

        // Stop the per-question timer
        const timeRemaining = this.questionTimerView ? this.questionTimerView.getRemaining() : 0;
        if (this.questionTimerView) {
            this.questionTimerView.stop();
        }

        // Disable further selections
        if (this.multipleChoiceView) {
            this.multipleChoiceView.disable();
        }

        let roundPoints = 0;
        const difficulty = this.getDifficultyForRound(this.currentRound);

        if (isCorrect) {
            this.correctCount++;

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

            // Update streak indicator
            if (this.streakIndicatorView) {
                this.streakIndicatorView.update(
                    streakResult.tier, streakResult.count, streakResult.multiplier
                );
            }

            // Deduct a life (lives mode only)
            if (this.endCondition === 'lives') {
                this.lives--;
                this.updateLives();
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
                livesRemaining: this.endCondition === 'lives' ? this.lives : undefined,
            });
        }

        // Check if game is over (lives mode: no lives remaining)
        if (this.endCondition === 'lives' && this.lives <= 0) {
            this.feedbackTimeout = setTimeout(() => {
                this.feedbackTimeout = null;
                this.end();
            }, StreakBlitzController.FEEDBACK_DELAY_MS);
            return;
        }

        // Advance after feedback delay (both modes)
        this.feedbackTimeout = setTimeout(() => {
            this.feedbackTimeout = null;
            this.nextRound();
        }, StreakBlitzController.FEEDBACK_DELAY_MS);
    }

    /**
     * Handles per-question timer expiration (timeout).
     */
    handleTimeout() {
        if (!this.isActive) return;

        if (this.multipleChoiceView) {
            this.multipleChoiceView.disable();
            this.multipleChoiceView.revealCorrectAnswer();
        }

        this.handleAnswer(-1, false);
    }

    /**
     * Handles the skip button. Counts as incorrect, advances immediately.
     */
    handleSkip() {
        if (!this.isActive || this.feedbackTimeout) return;

        if (this.questionTimerView) this.questionTimerView.stop();
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

        switch (powerUpId) {
            case 'timeExtra':
                if (this.questionTimerView) {
                    this.questionTimerView.addTime(5);
                }
                break;

            case 'fiftyFifty':
                this.applyFiftyFifty();
                break;

            case 'freeze':
                if (this.questionTimerView) {
                    this.questionTimerView.freeze();
                }
                break;

            case 'doublePoints':
                break;
        }

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

        const correctText = this.currentQuestionType === 'flag'
            ? this.currentCountry.displayName
            : this.currentCountry.capital;

        buttons.forEach((btn, index) => {
            if (btn.textContent !== correctText) {
                incorrectIndices.push(index);
            }
        });

        const toDisable = this.distractorService.pickRandom(incorrectIndices, 2);

        if (this.multipleChoiceView) {
            this.multipleChoiceView.disableOptions(toDisable);
        }
    }

    /**
     * Ends the session. Cleans up timers and invokes onGameEnd.
     */
    end() {
        this.isActive = false;

        if (this.feedbackTimeout) {
            clearTimeout(this.feedbackTimeout);
            this.feedbackTimeout = null;
        }

        if (this.questionTimerView) {
            this.questionTimerView.stop();
        }

        if (this.sessionTimerView) {
            this.sessionTimerView.stop();
        }

        if (this.onGameEnd) {
            this.onGameEnd({
                totalScore: this.totalScore,
                totalQuestions: this.currentRound - 1,
                roundsReached: this.currentRound - 1,
                correctCount: this.correctCount,
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

        if (this.questionTimerView) {
            this.questionTimerView.stop();
        }

        if (this.sessionTimerView) {
            this.sessionTimerView.stop();
        }
    }

    /**
     * Destroys the controller, removing all DOM elements and cleaning up.
     */
    destroy() {
        this.stop();

        if (this.questionTimerView) this.questionTimerView.destroy();
        if (this.sessionTimerView) this.sessionTimerView.destroy();
        if (this.multipleChoiceView) this.multipleChoiceView.destroy();
        if (this.streakIndicatorView) this.streakIndicatorView.destroy();
        if (this.powerUpInventoryView) this.powerUpInventoryView.destroy();

        if (this.container) {
            this.container.innerHTML = '';
        }

        this.questionTimerView = null;
        this.sessionTimerView = null;
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

        // Header: score + lives/question count
        const header = document.createElement('div');
        header.className = 'streak-blitz-header';

        this.scoreEl = document.createElement('div');
        this.scoreEl.className = 'streak-blitz-score';
        this.scoreEl.setAttribute('aria-label', 'Puntuación');
        this.scoreEl.textContent = '0';
        header.appendChild(this.scoreEl);

        if (this.endCondition === 'lives') {
            this.livesEl = document.createElement('div');
            this.livesEl.className = 'streak-blitz-lives';
            this.livesEl.setAttribute('aria-label', 'Vidas restantes');
            this.livesEl.setAttribute('aria-live', 'polite');
            this.livesEl.textContent = '❤️'.repeat(this.lives);
            header.appendChild(this.livesEl);
        }

        this.questionCountEl = document.createElement('div');
        this.questionCountEl.className = 'streak-blitz-question-count';
        this.questionCountEl.setAttribute('aria-label', 'Preguntas respondidas');
        this.questionCountEl.textContent = this.endCondition === 'lives' ? 'Ronda 1' : 'Pregunta 1';
        header.appendChild(this.questionCountEl);

        this.container.appendChild(header);

        // Session timer (time mode only)
        if (this.endCondition === 'time') {
            this.sessionTimerContainer = document.createElement('div');
            this.sessionTimerContainer.className = 'streak-blitz-session-timer';
            this.container.appendChild(this.sessionTimerContainer);
            this.sessionTimerView = new TimerView({
                container: this.sessionTimerContainer,
                onExpired: () => this.handleSessionExpired(),
            });
        }

        // Streak indicator
        this.streakContainer = document.createElement('div');
        this.streakContainer.className = 'streak-blitz-streak';
        this.container.appendChild(this.streakContainer);
        this.streakIndicatorView = new StreakIndicatorView({ container: this.streakContainer });

        // Per-question timer
        this.questionTimerContainer = document.createElement('div');
        this.questionTimerContainer.className = 'streak-blitz-question-timer';
        this.container.appendChild(this.questionTimerContainer);
        this.questionTimerView = new TimerView({
            container: this.questionTimerContainer,
            onExpired: () => this.handleTimeout(),
        });

        // Flag image (shown for flag questions)
        const questionArea = document.createElement('div');
        questionArea.className = 'streak-blitz-question-area';
        this.container.appendChild(questionArea);

        this.flagEl = document.createElement('img');
        this.flagEl.className = 'streak-blitz-flag';
        this.flagEl.alt = 'Bandera del país a identificar';
        this.flagEl.src = '';
        questionArea.appendChild(this.flagEl);

        // Text prompt (shown for capital questions)
        this.promptEl = document.createElement('h2');
        this.promptEl.className = 'streak-blitz-prompt';
        this.promptEl.setAttribute('aria-live', 'polite');
        questionArea.appendChild(this.promptEl);

        // Multiple choice container
        this.mcContainer = document.createElement('div');
        this.mcContainer.className = 'streak-blitz-options';
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
        this.powerUpContainer.className = 'streak-blitz-powerups';
        this.container.appendChild(this.powerUpContainer);
        this.powerUpInventoryView = new PowerUpInventoryView({
            container: this.powerUpContainer,
            onActivate: (id) => this.handlePowerUpActivation(id),
        });
    }

    /** @private */
    updateScore() {
        if (this.scoreEl) {
            this.scoreEl.textContent = this.totalScore.toString();
        }
    }

    /** @private */
    updateQuestionCount() {
        if (this.questionCountEl) {
            const label = this.endCondition === 'lives' ? 'Ronda' : 'Pregunta';
            this.questionCountEl.textContent = `${label} ${this.currentRound}`;
        }
    }

    /** @private */
    updateLives() {
        if (this.livesEl) {
            this.livesEl.textContent = '❤️'.repeat(Math.max(0, this.lives));
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

    /** @private */
    shufflePool() {
        for (let i = this.pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.pool[i], this.pool[j]] = [this.pool[j], this.pool[i]];
        }
    }
}
