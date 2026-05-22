import { ScoringEngine } from '../services/ScoringEngine.js';
import { StreakService } from '../services/StreakService.js';

/**
 * GeoPuzzleController - Orchestrates the Geo Puzzle individual game mode.
 *
 * Reveals 6 progressive hints about a country automatically on a timer:
 *   1. Population (e.g., "67 millones")
 *   2. Area (e.g., "643,801 km²")
 *   3. First letter of capital (e.g., "La capital empieza con P")
 *   4. Capital name (e.g., "París")
 *   5. Continent (e.g., "Europa")
 *   6. Flag image
 *
 * The player presses "¡Ya sé!" at any time to freeze hints and type their guess.
 * Fewer hints revealed = more points. If all 6 hints reveal without a guess,
 * the player gets one last chance to answer before the round fails.
 *
 * Implements IModeController-like interface:
 *   start(countryPool, modeOptions) - Begin a new session
 *   nextRound() - Advance to the next question
 *   submitGuess(guess) - Process the player's text guess
 *   end() - End the session
 */
export class GeoPuzzleController {
    /** @type {number} Total number of progressive hints */
    static TOTAL_HINTS = 6;

    /** @type {number} Default number of rounds */
    static DEFAULT_ROUNDS = 10;

    /** @type {number} Seconds between each hint reveal */
    static HINT_INTERVAL_SECONDS = 4;

    /** @type {number} Seconds allowed to type answer after pressing "¡Ya sé!" */
    static ANSWER_TIME_SECONDS = 10;

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
        this.scoringEngine = new ScoringEngine();
        this.streakService = new StreakService();

        // Game state
        this.pool = [];
        this.totalRounds = GeoPuzzleController.DEFAULT_ROUNDS;
        this.currentRound = 0;
        this.totalScore = 0;
        this.isActive = false;
        this.currentCountry = null;
        this.hintsRevealed = 0;
        this.roundHistory = [];
        this.phase = 'revealing'; // 'revealing' | 'input' | 'review'

        // Timers
        this.hintTimer = null;
        this.answerTimer = null;
        this.answerTimeLeft = GeoPuzzleController.ANSWER_TIME_SECONDS;
        this.roundTransitionTimeout = null;

        // DOM element references
        this.hintsContainer = null;
        this.guessBtn = null;
        this.skipBtn = null;
        this.inputContainer = null;
        this.inputEl = null;
        this.submitBtn = null;
        this.countdownEl = null;
        this.scoreEl = null;
        this.progressEl = null;
        this.feedbackEl = null;
        this.flagEl = null;
    }

    /**
     * Starts a new Geo Puzzle session.
     * @param {import('../models/Country.js').Country[]} countryPool - Filtered country pool
     * @param {Object} [modeOptions] - Mode-specific options
     * @param {number} [modeOptions.rounds] - Number of rounds (default 10)
     */
    start(countryPool, modeOptions = {}) {
        this.pool = countryPool.slice();
        this.totalRounds = modeOptions.rounds || GeoPuzzleController.DEFAULT_ROUNDS;
        this.currentRound = 0;
        this.totalScore = 0;
        this.isActive = true;
        this.roundHistory = [];

        // Reset services
        this.streakService.reset();

        // Shuffle pool
        this.shufflePool();

        // Build UI
        this.render();

        // Bind keyboard
        this._keyHandler = (e) => this.handleKeyDown(e);
        document.addEventListener('keydown', this._keyHandler);

        // Start first round
        this.nextRound();
    }

    /**
     * Centralized keyboard handler.
     * - 'revealing': Enter/Space to trigger "¡Ya sé!"
     * - 'input': handled by input's own keydown listener
     * - 'review': Enter to advance to next round immediately
     */
    handleKeyDown(e) {
        if (!this.isActive) return;

        if (e.key === 'Enter') {
            if (this.phase === 'revealing') {
                e.preventDefault();
                this.triggerGuess();
            } else if (this.phase === 'review') {
                e.preventDefault();
                this.clearTimers();
                this.nextRound();
            }
            return;
        }

        if (e.code === 'Space' && this.phase === 'revealing') {
            e.preventDefault();
            this.triggerGuess();
        }

        // 'S' key to skip (like other modes)
        if (e.key.toLowerCase() === 's' && this.phase === 'revealing') {
            e.preventDefault();
            this.skipRound();
        }
    }

    /**
     * Advances to the next round. Picks a country and starts auto-revealing hints.
     */
    nextRound() {
        if (!this.isActive) return;

        this.clearTimers();
        this.currentRound++;

        if (this.currentRound > this.totalRounds || this.currentRound > this.pool.length) {
            this.end();
            return;
        }

        // Pick the current country from the shuffled pool
        this.currentCountry = this.pool[this.currentRound - 1];
        this.hintsRevealed = 0;
        this.phase = 'revealing';

        // Update progress display
        this.updateProgress();

        // Clear previous hints and feedback
        if (this.hintsContainer) {
            this.hintsContainer.innerHTML = '';
        }
        if (this.feedbackEl) {
            this.feedbackEl.textContent = '';
            this.feedbackEl.className = 'geo-puzzle-feedback';
        }
        if (this.flagEl) {
            this.flagEl.src = '';
            this.flagEl.style.display = 'none';
        }

        // Reset UI state
        this.showRevealingUI();

        // Reveal first hint immediately, then auto-reveal on timer
        this.revealNextHint();
        this.startHintTimer();
    }

    /**
     * Starts the automatic hint reveal timer.
     * @private
     */
    startHintTimer() {
        this.hintTimer = setInterval(() => {
            if (this.hintsRevealed >= GeoPuzzleController.TOTAL_HINTS) {
                clearInterval(this.hintTimer);
                this.hintTimer = null;
                // All hints revealed — give player a last chance to answer
                this.handleAllHintsRevealed();
                return;
            }
            this.revealNextHint();
        }, GeoPuzzleController.HINT_INTERVAL_SECONDS * 1000);
    }

    /**
     * Reveals the next hint in the sequence.
     * Hints order: population, area, capital letter, capital name, continent, flag.
     */
    revealNextHint() {
        if (!this.isActive || !this.currentCountry) return;
        if (this.hintsRevealed >= GeoPuzzleController.TOTAL_HINTS) return;

        this.hintsRevealed++;

        const hint = this.getHintContent(this.hintsRevealed);

        if (hint.type === 'text') {
            const hintEl = document.createElement('div');
            hintEl.className = 'geo-puzzle-hint geo-puzzle-hint--animate';
            hintEl.setAttribute('aria-label', `Pista ${this.hintsRevealed}`);
            hintEl.textContent = hint.content;
            if (this.hintsContainer) {
                this.hintsContainer.appendChild(hintEl);
            }
        } else if (hint.type === 'flag') {
            if (this.flagEl) {
                this.flagEl.src = hint.content;
                this.flagEl.style.display = 'block';
                this.flagEl.alt = 'Bandera del país a adivinar';
            }
        }
    }

    /**
     * Called when all hints have been revealed without the player pressing "¡Ya sé!".
     * Gives the player a last chance to answer with a countdown.
     * @private
     */
    handleAllHintsRevealed() {
        // Automatically trigger the input phase as a last chance
        this.phase = 'input';
        this.showInputUI();
        this.startAnswerCountdown();
    }

    /**
     * Player presses "¡Ya sé!" — freezes hint reveal and shows input.
     */
    triggerGuess() {
        if (!this.isActive || !this.currentCountry) return;
        if (this.phase !== 'revealing') return;

        // Stop hint timer
        if (this.hintTimer) {
            clearInterval(this.hintTimer);
            this.hintTimer = null;
        }

        this.phase = 'input';
        this.showInputUI();
        this.startAnswerCountdown();
    }

    /**
     * Starts the countdown for the player to type their answer.
     * @private
     */
    startAnswerCountdown() {
        this.answerTimeLeft = GeoPuzzleController.ANSWER_TIME_SECONDS;
        this.updateCountdownDisplay();
        if (this.countdownEl) this.countdownEl.hidden = false;

        this.answerTimer = setInterval(() => {
            this.answerTimeLeft--;
            this.updateCountdownDisplay();

            if (this.answerTimeLeft <= 0) {
                this.stopAnswerCountdown();
                this.handleAnswerTimeout();
            }
        }, 1000);
    }

    /**
     * Stops the answer countdown timer.
     * @private
     */
    stopAnswerCountdown() {
        if (this.answerTimer) {
            clearInterval(this.answerTimer);
            this.answerTimer = null;
        }
        if (this.countdownEl) this.countdownEl.hidden = true;
    }

    /**
     * Updates the countdown display.
     * @private
     */
    updateCountdownDisplay() {
        if (this.countdownEl) {
            this.countdownEl.textContent = `⏱ ${this.answerTimeLeft}s`;
            if (this.answerTimeLeft <= 3) {
                this.countdownEl.classList.add('countdown-urgent');
            } else {
                this.countdownEl.classList.remove('countdown-urgent');
            }
        }
    }

    /**
     * Called when the answer countdown reaches 0 without a submission.
     * @private
     */
    handleAnswerTimeout() {
        this.handleRoundFailed();
    }

    /**
     * Processes the player's text guess for the current round.
     * Uses fuzzy matching (case-insensitive, accent-insensitive).
     *
     * @param {string} guess - The player's text input
     */
    submitGuess(guess) {
        if (!this.isActive || !this.currentCountry) return;
        if (this.phase !== 'input') return;

        // Reject empty or whitespace-only guesses
        if (!guess || !guess.trim()) return;

        this.stopAnswerCountdown();

        const isCorrect = this.matchGuess(guess, this.currentCountry);

        if (isCorrect) {
            this.handleCorrectGuess();
        } else {
            this.handleIncorrectGuess();
        }
    }

    /**
     * Handles a correct guess. Awards points and advances to next round.
     * @private
     */
    handleCorrectGuess() {
        // Record correct in streak
        const streakResult = this.streakService.recordCorrect();

        // Calculate points based on hints revealed
        const roundPoints = this.scoringEngine.calculateGeoPuzzle(
            this.hintsRevealed,
            streakResult.multiplier
        );

        this.totalScore += roundPoints;

        // Update score display
        this.updateScore();

        // Show correct feedback
        if (this.feedbackEl) {
            this.feedbackEl.textContent = `¡Correcto! +${roundPoints} puntos`;
            this.feedbackEl.className = 'geo-puzzle-feedback geo-puzzle-feedback--correct';
        }

        // Show review phase
        this.phase = 'review';
        this.showReviewUI();

        // Record round history
        this.roundHistory.push({
            correct: true,
            points: roundPoints,
            hintsRevealed: this.hintsRevealed,
            country: this.currentCountry,
        });

        // Invoke onRoundEnd callback
        if (this.onRoundEnd) {
            this.onRoundEnd({
                round: this.currentRound,
                correct: true,
                points: roundPoints,
                totalScore: this.totalScore,
                streak: this.streakService.count,
                hintsRevealed: this.hintsRevealed,
            });
        }

        // Auto-advance after delay
        this.roundTransitionTimeout = setTimeout(() => {
            this.roundTransitionTimeout = null;
            this.nextRound();
        }, 1500);
    }

    /**
     * Skips the current round without guessing. Treated as a failed round.
     */
    skipRound() {
        if (!this.isActive || !this.currentCountry) return;
        if (this.phase === 'review') return;

        // Stop any active timers
        this.clearTimers();
        this.stopAnswerCountdown();

        this.handleRoundFailed();
    }

    /**
     * Handles an incorrect guess. Round fails.
     * @private
     */
    handleIncorrectGuess() {
        this.handleRoundFailed();
    }

    /**
     * Handles a round where the player failed (wrong answer or timeout).
     * @private
     */
    handleRoundFailed() {
        // Reset streak
        this.streakService.recordIncorrect();

        // Show the correct answer
        if (this.feedbackEl) {
            this.feedbackEl.textContent = `La respuesta era: ${this.currentCountry.displayName}`;
            this.feedbackEl.className = 'geo-puzzle-feedback geo-puzzle-feedback--failed';
        }

        // Show review phase
        this.phase = 'review';
        this.showReviewUI();

        // Record round history
        this.roundHistory.push({
            correct: false,
            points: 0,
            hintsRevealed: this.hintsRevealed,
            country: this.currentCountry,
        });

        // Invoke onRoundEnd callback
        if (this.onRoundEnd) {
            this.onRoundEnd({
                round: this.currentRound,
                correct: false,
                points: 0,
                totalScore: this.totalScore,
                streak: this.streakService.count,
                hintsRevealed: this.hintsRevealed,
            });
        }

        // Auto-advance after delay
        this.roundTransitionTimeout = setTimeout(() => {
            this.roundTransitionTimeout = null;
            this.nextRound();
        }, 2000);
    }

    /**
     * Returns the hint content for a given hint number.
     * @param {number} hintNumber - Hint number (1-6)
     * @returns {{ type: 'text'|'flag', content: string }}
     * @private
     */
    getHintContent(hintNumber) {
        const country = this.currentCountry;

        switch (hintNumber) {
            case 1:
                return { type: 'text', content: `Población: ${this.formatPopulation(country.population)}` };
            case 2:
                return { type: 'text', content: `Área: ${this.formatArea(country.area)}` };
            case 3: {
                const firstLetter = country.capital ? country.capital.charAt(0).toUpperCase() : '?';
                return { type: 'text', content: `La capital empieza con ${firstLetter}` };
            }
            case 4:
                return { type: 'text', content: `Capital: ${country.capital}` };
            case 5:
                return { type: 'text', content: `Continente: ${country.continent}` };
            case 6:
                return { type: 'flag', content: country.flagUrl };
            default:
                return { type: 'text', content: '' };
        }
    }

    /**
     * Formats a population number into a human-readable Spanish string.
     * @param {number} population - Raw population number
     * @returns {string} Formatted population string
     * @private
     */
    formatPopulation(population) {
        if (!population || population === 0) return 'Desconocida';
        if (population >= 1_000_000_000) {
            return `${(population / 1_000_000_000).toFixed(1).replace('.0', '')} mil millones`;
        }
        if (population >= 1_000_000) {
            return `${(population / 1_000_000).toFixed(1).replace('.0', '')} millones`;
        }
        if (population >= 1_000) {
            return `${(population / 1_000).toFixed(1).replace('.0', '')} mil`;
        }
        return population.toString();
    }

    /**
     * Formats an area number into a human-readable string with km².
     * @param {number} area - Area in km²
     * @returns {string} Formatted area string
     * @private
     */
    formatArea(area) {
        if (!area || area === 0) return 'Desconocida';
        return `${area.toLocaleString('es-ES')} km²`;
    }

    /**
     * Compares the player's guess against the correct country name.
     * Uses fuzzy matching: case-insensitive and accent-insensitive.
     *
     * @param {string} guess - The player's input
     * @param {import('../models/Country.js').Country} country - The correct country
     * @returns {boolean} Whether the guess matches
     */
    matchGuess(guess, country) {
        if (!guess || !guess.trim()) return false;

        const normalize = (str) =>
            str.normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .trim();

        const normalizedGuess = normalize(guess);
        const normalizedSpanish = normalize(country.spanishName);
        const normalizedEnglish = normalize(country.englishName);

        return normalizedGuess === normalizedSpanish || normalizedGuess === normalizedEnglish;
    }

    /**
     * Ends the Geo Puzzle session. Invokes onGameEnd callback.
     */
    end() {
        this.isActive = false;
        this.clearTimers();

        // Invoke onGameEnd callback
        if (this.onGameEnd) {
            this.onGameEnd({
                totalScore: this.totalScore,
                totalRounds: this.currentRound - 1,
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
        this.clearTimers();
    }

    /**
     * Destroys the controller, removing all DOM elements and cleaning up.
     */
    destroy() {
        this.stop();

        if (this._keyHandler) {
            document.removeEventListener('keydown', this._keyHandler);
            this._keyHandler = null;
        }

        if (this.container) {
            this.container.innerHTML = '';
        }

        this.hintsContainer = null;
        this.guessBtn = null;
        this.skipBtn = null;
        this.inputContainer = null;
        this.inputEl = null;
        this.submitBtn = null;
        this.countdownEl = null;
        this.scoreEl = null;
        this.progressEl = null;
        this.feedbackEl = null;
        this.flagEl = null;
    }

    /**
     * Clears all pending timers.
     * @private
     */
    clearTimers() {
        if (this.hintTimer) {
            clearInterval(this.hintTimer);
            this.hintTimer = null;
        }
        if (this.answerTimer) {
            clearInterval(this.answerTimer);
            this.answerTimer = null;
        }
        if (this.roundTransitionTimeout) {
            clearTimeout(this.roundTransitionTimeout);
            this.roundTransitionTimeout = null;
        }
    }

    // ─── UI Methods ──────────────────────────────────────────────────────

    /**
     * Builds the game UI layout inside the container.
     * @private
     */
    render() {
        if (!this.container) return;

        this.container.innerHTML = '';

        // Score + skip + progress header
        const header = document.createElement('div');
        header.className = 'geo-puzzle-header';

        this.scoreEl = document.createElement('div');
        this.scoreEl.className = 'geo-puzzle-score';
        this.scoreEl.setAttribute('aria-label', 'Puntuación');
        this.scoreEl.textContent = '0';
        header.appendChild(this.scoreEl);

        // Skip button (in header, like other modes)
        this.skipBtn = document.createElement('button');
        this.skipBtn.className = 'geo-puzzle-skip-btn';
        this.skipBtn.textContent = 'Saltar';
        this.skipBtn.setAttribute('aria-label', 'Saltar ronda');
        this.skipBtn.addEventListener('click', () => this.skipRound());
        header.appendChild(this.skipBtn);

        this.progressEl = document.createElement('div');
        this.progressEl.className = 'geo-puzzle-progress';
        this.progressEl.setAttribute('aria-label', 'Progreso');
        this.progressEl.textContent = `1 / ${this.totalRounds}`;
        header.appendChild(this.progressEl);

        this.container.appendChild(header);

        // Hints container
        this.hintsContainer = document.createElement('div');
        this.hintsContainer.className = 'geo-puzzle-hints';
        this.hintsContainer.setAttribute('aria-live', 'polite');
        this.container.appendChild(this.hintsContainer);

        // Flag image (hidden initially)
        this.flagEl = document.createElement('img');
        this.flagEl.className = 'geo-puzzle-flag';
        this.flagEl.alt = 'Bandera del país a adivinar';
        this.flagEl.src = '';
        this.flagEl.style.display = 'none';
        this.container.appendChild(this.flagEl);

        // Feedback area
        this.feedbackEl = document.createElement('div');
        this.feedbackEl.className = 'geo-puzzle-feedback';
        this.feedbackEl.setAttribute('aria-live', 'assertive');
        this.container.appendChild(this.feedbackEl);

        // "¡Ya sé!" button
        this.guessBtn = document.createElement('button');
        this.guessBtn.className = 'geo-puzzle-guess-btn';
        this.guessBtn.textContent = '¡Ya sé!';
        this.guessBtn.setAttribute('aria-label', 'Ya sé la respuesta');
        this.guessBtn.addEventListener('click', () => this.triggerGuess());
        this.container.appendChild(this.guessBtn);

        // Input container (hidden until "¡Ya sé!" pressed)
        this.inputContainer = document.createElement('div');
        this.inputContainer.className = 'geo-puzzle-input-area';
        this.inputContainer.hidden = true;

        this.inputEl = document.createElement('input');
        this.inputEl.type = 'text';
        this.inputEl.className = 'geo-puzzle-input';
        this.inputEl.placeholder = 'Escribe el nombre del país...';
        this.inputEl.setAttribute('aria-label', 'Respuesta del país');
        this.inputEl.autocomplete = 'off';
        this.inputEl.spellcheck = false;
        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                this.submitGuess(this.inputEl.value);
            }
        });
        this.inputContainer.appendChild(this.inputEl);

        this.submitBtn = document.createElement('button');
        this.submitBtn.className = 'geo-puzzle-submit';
        this.submitBtn.textContent = 'Enviar';
        this.submitBtn.setAttribute('aria-label', 'Enviar respuesta');
        this.submitBtn.addEventListener('click', () => {
            this.submitGuess(this.inputEl.value);
        });
        this.inputContainer.appendChild(this.submitBtn);

        // Countdown element
        this.countdownEl = document.createElement('div');
        this.countdownEl.className = 'geo-puzzle-countdown';
        this.countdownEl.hidden = true;
        this.inputContainer.appendChild(this.countdownEl);

        this.container.appendChild(this.inputContainer);
    }

    /**
     * Shows the "revealing" UI state: "¡Ya sé!" button visible, input hidden.
     * @private
     */
    showRevealingUI() {
        if (this.guessBtn) {
            this.guessBtn.hidden = false;
            this.guessBtn.disabled = false;
        }
        if (this.inputContainer) this.inputContainer.hidden = true;
        if (this.skipBtn) this.skipBtn.disabled = false;
        if (this.inputEl) {
            this.inputEl.value = '';
            this.inputEl.disabled = false;
        }
    }

    /**
     * Shows the "input" UI state: input visible, "¡Ya sé!" hidden.
     * @private
     */
    showInputUI() {
        if (this.guessBtn) this.guessBtn.hidden = true;
        if (this.inputContainer) this.inputContainer.hidden = false;
        if (this.inputEl) {
            this.inputEl.disabled = false;
            this.inputEl.focus();
        }
    }

    /**
     * Shows the "review" UI state: feedback visible, skip disabled during auto-advance.
     * @private
     */
    showReviewUI() {
        if (this.guessBtn) this.guessBtn.hidden = true;
        if (this.inputContainer) this.inputContainer.hidden = true;
        if (this.skipBtn) this.skipBtn.disabled = true;
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
