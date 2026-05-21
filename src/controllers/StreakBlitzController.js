import { DistractorService } from '../services/DistractorService.js';
import { ScoringEngine } from '../services/ScoringEngine.js';
import { StreakService } from '../services/StreakService.js';
import { PowerUpService } from '../services/PowerUpService.js';
import { MultipleChoiceView } from '../views/MultipleChoiceView.js';
import { TimerView } from '../views/TimerView.js';
import { StreakIndicatorView } from '../views/StreakIndicatorView.js';
import { PowerUpInventoryView } from '../views/PowerUpInventoryView.js';

/**
 * StreakBlitzController - Orchestrates the Streak Blitz individual game mode.
 *
 * A 90-second timed session mixing flag identification (flag → country name)
 * and capital identification (country name → capital) questions. No fixed round
 * count — the game continues until the session timer expires.
 *
 * Key mechanics:
 *   - 90s session timer (configurable via modeOptions.sessionTime)
 *   - 10s per-question timer (configurable via modeOptions.timePerQuestion)
 *   - Random mix of flag/capital questions (max 3 consecutive of same type)
 *   - Immediate advance on answer (no feedback delay)
 *   - Full Streak/PowerUp integration
 *   - Tracks total questions answered, correct count, and highest streak
 *
 * Implements IModeController-like interface:
 *   start(countryPool, modeOptions) - Begin a new session
 *   nextRound() - Advance to the next question
 *   handleAnswer(selectedIndex, isCorrect) - Process player's answer
 *   end() - End the session
 */
export class StreakBlitzController {
    /** @type {number} Default session time in seconds */
    static DEFAULT_SESSION_TIME = 90;

    /** @type {number} Default time per question in seconds */
    static DEFAULT_TIME_PER_QUESTION = 10;

    /** @type {number} Maximum consecutive questions of the same type */
    static MAX_CONSECUTIVE_SAME_TYPE = 3;

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
        this.sessionTime = StreakBlitzController.DEFAULT_SESSION_TIME;
        this.timePerQuestion = StreakBlitzController.DEFAULT_TIME_PER_QUESTION;
        this.currentRound = 0;
        this.totalScore = 0;
        this.correctCount = 0;
        this.isActive = false;
        this.currentCountry = null;
        this.currentQuestionType = null; // 'flag' or 'capital'
        this.consecutiveSameType = 0;
        this.lastQuestionType = null;
        this.roundHistory = [];

        // Session timer state
        this.sessionTimerInterval = null;
        this.sessionStartTime = null;

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
    }

    /**
     * Starts a new Streak Blitz session.
     * @param {import('../models/Country.js').Country[]} countryPool - Filtered country pool
     * @param {Object} [modeOptions] - Mode-specific options
     * @param {number} [modeOptions.sessionTime] - Session duration in seconds (default 90)
     * @param {number} [modeOptions.timePerQuestion] - Seconds per question (default 10)
     */
    start(countryPool, modeOptions = {}) {
        this.pool = countryPool.slice();
        this.sessionTime = modeOptions.sessionTime || StreakBlitzController.DEFAULT_SESSION_TIME;
        this.timePerQuestion = modeOptions.timePerQuestion || StreakBlitzController.DEFAULT_TIME_PER_QUESTION;
        this.currentRound = 0;
        this.totalScore = 0;
        this.correctCount = 0;
        this.isActive = true;
        this.currentCountry = null;
        this.currentQuestionType = null;
        this.consecutiveSameType = 0;
        this.lastQuestionType = null;
        this.roundHistory = [];

        // Reset services
        this.streakService.reset();
        this.powerUpService.reset();

        // Shuffle pool
        this.shufflePool();

        // Build UI
        this.render();

        // Start session timer
        this.startSessionTimer();

        // Start first question
        this.nextRound();
    }

    /**
     * Starts the session countdown timer (90s by default).
     * When it expires, the game ends immediately.
     * @private
     */
    startSessionTimer() {
        this.sessionStartTime = Date.now();

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
     * Determines the next question type (flag or capital), enforcing
     * the max 3 consecutive same-type constraint.
     * @returns {'flag' | 'capital'}
     * @private
     */
    pickQuestionType() {
        // If we've hit the max consecutive limit, force the other type
        if (this.consecutiveSameType >= StreakBlitzController.MAX_CONSECUTIVE_SAME_TYPE) {
            return this.lastQuestionType === 'flag' ? 'capital' : 'flag';
        }

        // Random pick
        return Math.random() < 0.5 ? 'flag' : 'capital';
    }

    /**
     * Advances to the next question. Picks a country, determines question type,
     * generates distractors, renders the question and options, and starts the
     * per-question timer.
     */
    nextRound() {
        if (!this.isActive) return;

        this.currentRound++;

        // Pick a country from the pool (cycle through shuffled pool)
        const poolIndex = (this.currentRound - 1) % this.pool.length;

        // Re-shuffle when we've cycled through the entire pool
        if (poolIndex === 0 && this.currentRound > 1) {
            this.shufflePool();
        }

        this.currentCountry = this.pool[poolIndex];

        // Determine question type
        this.currentQuestionType = this.pickQuestionType();

        // Track consecutive same type
        if (this.currentQuestionType === this.lastQuestionType) {
            this.consecutiveSameType++;
        } else {
            this.consecutiveSameType = 1;
        }
        this.lastQuestionType = this.currentQuestionType;

        // Generate 3 distractors (same continent preference)
        const distractors = this.distractorService.generateDistractors(
            this.currentCountry, this.pool, 3, true
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
            // Show flag, hide text prompt
            if (this.flagEl) {
                this.flagEl.src = this.currentCountry.flagUrl;
                this.flagEl.alt = 'Bandera del país a identificar';
                this.flagEl.style.display = '';
            }
            if (this.promptEl) {
                this.promptEl.style.display = 'none';
            }
        } else {
            // Show country name, hide flag
            if (this.promptEl) {
                this.promptEl.textContent = this.currentCountry.displayName;
                this.promptEl.setAttribute('aria-label', `País: ${this.currentCountry.displayName}`);
                this.promptEl.style.display = '';
            }
            if (this.flagEl) {
                this.flagEl.style.display = 'none';
            }
        }

        // Update question count display
        this.updateQuestionCount();

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

        // Start per-question timer
        if (this.questionTimerView) {
            this.questionTimerView.stop();
            this.questionTimerView.start(this.timePerQuestion);
        }
    }

    /**
     * Handles the player's answer. Calculates score, updates streak,
     * checks power-up grants, and immediately advances to the next question.
     *
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
            });
        }

        // Immediate advance — no feedback delay in Streak Blitz
        this.nextRound();
    }

    /**
     * Handles per-question timer expiration (timeout).
     * Marks the question as incorrect and immediately advances.
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
     * Ends the Streak Blitz session. Cleans up timers and invokes onGameEnd.
     */
    end() {
        this.isActive = false;

        // Stop per-question timer
        if (this.questionTimerView) {
            this.questionTimerView.stop();
        }

        // Stop session timer
        if (this.sessionTimerView) {
            this.sessionTimerView.stop();
        }

        // Invoke onGameEnd callback
        if (this.onGameEnd) {
            this.onGameEnd({
                totalScore: this.totalScore,
                totalQuestions: this.currentRound - 1,
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

        // Score + question count header
        const header = document.createElement('div');
        header.className = 'streak-blitz-header';

        this.scoreEl = document.createElement('div');
        this.scoreEl.className = 'streak-blitz-score';
        this.scoreEl.setAttribute('aria-label', 'Puntuación');
        this.scoreEl.textContent = '0';
        header.appendChild(this.scoreEl);

        this.questionCountEl = document.createElement('div');
        this.questionCountEl.className = 'streak-blitz-question-count';
        this.questionCountEl.setAttribute('aria-label', 'Preguntas respondidas');
        this.questionCountEl.textContent = 'Pregunta 1';
        header.appendChild(this.questionCountEl);

        this.container.appendChild(header);

        // Session timer (the 90s countdown)
        this.sessionTimerContainer = document.createElement('div');
        this.sessionTimerContainer.className = 'streak-blitz-session-timer';
        this.container.appendChild(this.sessionTimerContainer);
        this.sessionTimerView = new TimerView({
            container: this.sessionTimerContainer,
            onExpired: () => this.handleSessionExpired(),
        });

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
        this.flagEl = document.createElement('img');
        this.flagEl.className = 'streak-blitz-flag';
        this.flagEl.alt = 'Bandera del país a identificar';
        this.flagEl.src = '';
        this.flagEl.style.display = 'none';
        this.container.appendChild(this.flagEl);

        // Text prompt (shown for capital questions)
        this.promptEl = document.createElement('h2');
        this.promptEl.className = 'streak-blitz-prompt';
        this.promptEl.setAttribute('aria-live', 'polite');
        this.promptEl.style.display = 'none';
        this.container.appendChild(this.promptEl);

        // Multiple choice container
        this.mcContainer = document.createElement('div');
        this.mcContainer.className = 'streak-blitz-options';
        this.container.appendChild(this.mcContainer);
        this.multipleChoiceView = new MultipleChoiceView({ container: this.mcContainer });

        // Power-up inventory
        this.powerUpContainer = document.createElement('div');
        this.powerUpContainer.className = 'streak-blitz-powerups';
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
     * Updates the question count display element.
     * @private
     */
    updateQuestionCount() {
        if (this.questionCountEl) {
            this.questionCountEl.textContent = `Pregunta ${this.currentRound}`;
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
