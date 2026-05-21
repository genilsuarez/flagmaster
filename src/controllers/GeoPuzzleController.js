import { ScoringEngine } from '../services/ScoringEngine.js';
import { StreakService } from '../services/StreakService.js';

/**
 * GeoPuzzleController - Orchestrates the Geo Puzzle individual game mode.
 *
 * Reveals 6 progressive hints about a country one at a time:
 *   1. Continent (e.g., "Europa")
 *   2. Population (e.g., "67 millones")
 *   3. Area (e.g., "643,801 km²")
 *   4. First letter of capital (e.g., "La capital empieza con P")
 *   5. Capital name (e.g., "París")
 *   6. Flag image
 *
 * The player types a free text guess (country name) after each hint.
 * One guess is allowed per hint level. If wrong, the next hint is revealed.
 * Scoring is based on how few hints were needed: fewer hints = more points.
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
        this.guessesThisRound = 0;
        this.roundHistory = [];

        // DOM element references
        this.hintsContainer = null;
        this.inputEl = null;
        this.submitBtn = null;
        this.nextHintBtn = null;
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

        // Start first round
        this.nextRound();
    }

    /**
     * Advances to the next round. Picks a country and reveals the first hint.
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
        this.hintsRevealed = 0;
        this.guessesThisRound = 0;

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

        // Enable input
        this.setInputEnabled(true);

        // Reveal first hint
        this.revealNextHint();
    }

    /**
     * Reveals the next hint in the sequence.
     * Hints order: continent, population, area, capital letter, capital name, flag.
     */
    revealNextHint() {
        if (!this.isActive || !this.currentCountry) return;

        if (this.hintsRevealed >= GeoPuzzleController.TOTAL_HINTS) return;

        this.hintsRevealed++;

        const hint = this.getHintContent(this.hintsRevealed);

        if (hint.type === 'text') {
            const hintEl = document.createElement('div');
            hintEl.className = 'geo-puzzle-hint';
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

        // Update next hint button state
        this.updateNextHintButton();
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
                return { type: 'text', content: `Continente: ${country.continent}` };
            case 2:
                return { type: 'text', content: `Población: ${this.formatPopulation(country.population)}` };
            case 3:
                return { type: 'text', content: `Área: ${this.formatArea(country.area)}` };
            case 4: {
                const firstLetter = country.capital ? country.capital.charAt(0).toUpperCase() : '?';
                return { type: 'text', content: `La capital empieza con ${firstLetter}` };
            }
            case 5:
                return { type: 'text', content: `Capital: ${country.capital}` };
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
     * Processes the player's text guess for the current round.
     * Uses fuzzy matching (case-insensitive, accent-insensitive).
     *
     * @param {string} guess - The player's text input
     */
    submitGuess(guess) {
        if (!this.isActive || !this.currentCountry) return;

        // Reject empty or whitespace-only guesses
        if (!guess || !guess.trim()) return;

        // Check if player has already guessed at this hint level
        if (this.guessesThisRound >= this.hintsRevealed) return;

        this.guessesThisRound++;

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

        // Disable input
        this.setInputEnabled(false);

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

        // Advance to next round after a short delay
        setTimeout(() => {
            this.nextRound();
        }, 1500);
    }

    /**
     * Handles an incorrect guess. Reveals next hint or ends round.
     * @private
     */
    handleIncorrectGuess() {
        if (this.hintsRevealed >= GeoPuzzleController.TOTAL_HINTS) {
            // All hints used and still wrong — round failed
            this.handleRoundFailed();
        } else {
            // Show incorrect feedback
            if (this.feedbackEl) {
                this.feedbackEl.textContent = 'Incorrecto. Pide otra pista o intenta de nuevo.';
                this.feedbackEl.className = 'geo-puzzle-feedback geo-puzzle-feedback--incorrect';
            }

            // Reveal next hint automatically
            this.revealNextHint();
        }
    }

    /**
     * Handles a round where the player used all 6 hints without guessing correctly.
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

        // Disable input
        this.setInputEnabled(false);

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

        // Advance to next round after a short delay
        setTimeout(() => {
            this.nextRound();
        }, 2000);
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
    }

    /**
     * Destroys the controller, removing all DOM elements and cleaning up.
     */
    destroy() {
        this.stop();

        if (this.container) {
            this.container.innerHTML = '';
        }

        this.hintsContainer = null;
        this.inputEl = null;
        this.submitBtn = null;
        this.nextHintBtn = null;
        this.scoreEl = null;
        this.progressEl = null;
        this.feedbackEl = null;
        this.flagEl = null;
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
        header.className = 'geo-puzzle-header';

        this.scoreEl = document.createElement('div');
        this.scoreEl.className = 'geo-puzzle-score';
        this.scoreEl.setAttribute('aria-label', 'Puntuación');
        this.scoreEl.textContent = '0';
        header.appendChild(this.scoreEl);

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

        // Input area
        const inputArea = document.createElement('div');
        inputArea.className = 'geo-puzzle-input-area';

        this.inputEl = document.createElement('input');
        this.inputEl.type = 'text';
        this.inputEl.className = 'geo-puzzle-input';
        this.inputEl.placeholder = 'Escribe el nombre del país...';
        this.inputEl.setAttribute('aria-label', 'Respuesta del país');
        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.submitGuess(this.inputEl.value);
                this.inputEl.value = '';
            }
        });
        inputArea.appendChild(this.inputEl);

        this.submitBtn = document.createElement('button');
        this.submitBtn.className = 'geo-puzzle-submit';
        this.submitBtn.textContent = 'Adivinar';
        this.submitBtn.setAttribute('aria-label', 'Enviar respuesta');
        this.submitBtn.addEventListener('click', () => {
            this.submitGuess(this.inputEl.value);
            this.inputEl.value = '';
        });
        inputArea.appendChild(this.submitBtn);

        this.container.appendChild(inputArea);

        // Next hint button
        this.nextHintBtn = document.createElement('button');
        this.nextHintBtn.className = 'geo-puzzle-next-hint';
        this.nextHintBtn.textContent = 'Siguiente pista';
        this.nextHintBtn.setAttribute('aria-label', 'Revelar siguiente pista');
        this.nextHintBtn.addEventListener('click', () => {
            if (this.hintsRevealed < GeoPuzzleController.TOTAL_HINTS) {
                this.revealNextHint();
            }
        });
        this.container.appendChild(this.nextHintBtn);
    }

    /**
     * Updates the next hint button state based on hints revealed.
     * @private
     */
    updateNextHintButton() {
        if (!this.nextHintBtn) return;

        if (this.hintsRevealed >= GeoPuzzleController.TOTAL_HINTS) {
            this.nextHintBtn.disabled = true;
            this.nextHintBtn.textContent = 'Sin más pistas';
        } else {
            this.nextHintBtn.disabled = false;
            this.nextHintBtn.textContent = `Siguiente pista (${this.hintsRevealed}/${GeoPuzzleController.TOTAL_HINTS})`;
        }
    }

    /**
     * Enables or disables the input area.
     * @param {boolean} enabled
     * @private
     */
    setInputEnabled(enabled) {
        if (this.inputEl) {
            this.inputEl.disabled = !enabled;
        }
        if (this.submitBtn) {
            this.submitBtn.disabled = !enabled;
        }
        if (this.nextHintBtn) {
            this.nextHintBtn.disabled = !enabled;
        }
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
