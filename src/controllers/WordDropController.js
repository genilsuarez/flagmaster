/**
 * WordDropController: orchestrates the Word Drop game mode.
 * Manages round lifecycle, scoring, lives, and transitions.
 */
import { WordDropService } from '../services/WordDropService.js';
import { WordDropView } from '../views/WordDropView.js';

export class WordDropController {
    /**
     * @param {object} countryService - Country data service
     * @param {object} statsService - Stats persistence service
     * @param {object} [options] - Optional callbacks for GameSessionManager integration
     * @param {function} [options.onGameEnd] - Callback when game ends with results data
     * @param {function} [options.onCorrectAnswer] - Callback when a word is guessed correctly
     * @param {function} [options.onIncorrectAnswer] - Callback when a word is guessed incorrectly or times out
     */
    constructor(countryService, statsService, options = {}) {
        this.countryService = countryService;
        this.statsService = statsService;
        this.onGameEnd = options.onGameEnd || null;
        this.onCorrectAnswer = options.onCorrectAnswer || null;
        this.onIncorrectAnswer = options.onIncorrectAnswer || null;
        this.service = new WordDropService();
        this.view = new WordDropView();

        this.countries = [];
        this.currentIndex = 0;
        this.totalScore = 0;
        this.lives = 3;
        this.isActive = false;
        this.phase = 'revealing'; // 'revealing' | 'input' | 'review'
        this.isSurvivalMode = true;
        this.showFlag = true;
        this.category = 'country'; // 'country' | 'capital'
        this.speed = 'normal';
        this.roundTransitionTimeout = null;
        this.revealStartTimeout = null;

        this.bindEvents();
    }

    bindEvents() {
        this.view.onGuessPressed = () => this.triggerGuess();
        this.view.onAnswerSubmitted = (answer) => this.handleAnswerSubmitted(answer);
        this.view.onNextPressed = () => this.advanceToNextRound();
        this.view.onAnswerTimeout = () => this.handleAnswerTimeout();

        this.service.onLetterRevealed = (position, char) => {
            this.view.revealLetter(position, char);
        };

        this.service.onWordCompleted = () => {
            this.handleWordCompleted();
        };

        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    /**
     * Centralized keyboard handler for Word Drop mode.
     * Uses current phase to determine action:
     * - 'revealing': letters are dropping, Enter/Space to guess
     * - 'input': player is typing answer (handled by input's own listener)
     * - 'review': feedback shown, Enter to advance
     */
    handleKeyDown(e) {
        if (!this.isActive) return;

        if (e.key === 'Enter') {
            if (this.phase === 'revealing') {
                e.preventDefault();
                this.triggerGuess();
            } else if (this.phase === 'review') {
                e.preventDefault();
                this.advanceToNextRound();
            }
            return;
        }

        if (e.code === 'Space' && this.phase === 'revealing') {
            e.preventDefault();
            this.triggerGuess();
        }
    }

    /**
     * Clears all pending timeouts and intervals for the current round.
     */
    clearPendingTimers() {
        this.service.stopRevealing();
        if (this.roundTransitionTimeout) {
            clearTimeout(this.roundTransitionTimeout);
            this.roundTransitionTimeout = null;
        }
        if (this.revealStartTimeout) {
            clearTimeout(this.revealStartTimeout);
            this.revealStartTimeout = null;
        }
    }

    /**
     * Starts a Word Drop game session.
     * @param {object} options - { countries, survival, showFlag, category, speed, difficulty }
     */
    start(options = {}) {
        // Clean up any previous game state
        this.clearPendingTimers();

        this.countries = options.countries || [];
        this.isSurvivalMode = options.survival !== false;
        this.showFlag = options.showFlag !== false;
        this.category = options.category || 'country';
        this.speed = options.speed || 'normal';
        this.difficulty = options.difficulty || 'easy';

        if (this.countries.length === 0) return;

        // Shuffle countries
        this.shuffleArray(this.countries);

        this.currentIndex = 0;
        this.totalScore = 0;
        this.lives = 3;
        this.isActive = true;
        this.phase = 'revealing';

        this.view.show();
        this.view.reset();
        this.view.updateScore(0);
        this.view.setLivesVisible(this.isSurvivalMode);
        this.view.updateLives(this.lives);
        this.view.setDifficulty(this.difficulty);
        this.view.initProgress(this.countries.length);

        this.startRound();
    }

    /**
     * Starts a new round with the current country.
     */
    startRound() {
        // Always clear previous timers before starting a new round
        this.clearPendingTimers();
        this.phase = 'revealing';

        if (this.currentIndex >= this.countries.length) {
            this.endGame();
            return;
        }

        const country = this.countries[this.currentIndex];
        const round = this.service.createRound(country, {
            category: this.category,
            speed: this.speed
        });

        // Contextual hint for easy mode:
        // - guessing country name → show the capital as hint
        // - guessing capital → show the country name as hint
        const hint = this.category === 'capital'
            ? country.spanishName
            : (country.capital || null);

        this.view.setupWord(round.word, this.showFlag, country.flagUrl, hint);
        
        // Small delay before starting reveal for visual readiness
        this.revealStartTimeout = setTimeout(() => {
            this.revealStartTimeout = null;
            if (this.isActive && this.service.currentRound && !this.service.currentRound.answered) {
                this.service.startRevealing();
            }
        }, 200);
    }

    /**
     * Triggers the guess action — freezes the round and shows the input.
     * Called by the "¡Ya sé!" button, Enter key, or Space key.
     */
    triggerGuess() {
        if (!this.isActive || !this.service.currentRound) return;
        if (this.service.currentRound.answered) return;
        if (this.phase !== 'revealing') return;

        // Cancel the reveal start timeout if it hasn't fired yet
        if (this.revealStartTimeout) {
            clearTimeout(this.revealStartTimeout);
            this.revealStartTimeout = null;
        }

        this.service.freezeRound();
        this.phase = 'input';
        this.view.showInput();
    }

    /**
     * Called when the player submits their answer.
     */
    handleAnswerSubmitted(answer) {
        if (!this.isActive || !this.service.currentRound) return;

        const elapsedSeconds = this.view.getElapsedAnswerSeconds();
        const result = this.service.validateAnswer(answer);

        // Time penalty: first 5 seconds free, then -3 pts per second after that
        const penaltySeconds = Math.max(0, elapsedSeconds - 5);
        const timePenalty = penaltySeconds * 3;
        const adjustedScore = result.correct ? Math.max(10, result.score - timePenalty) : result.score;

        // Reveal all letters
        this.view.revealAllLetters(this.service.currentRound.word);

        // Update score
        this.totalScore += adjustedScore;
        this.view.updateScore(Math.max(0, this.totalScore));
        this.view.showFeedback(result.correct, adjustedScore, result.word, this.service.currentRound.country?.flagUrl);

        // Track stats
        if (result.correct && this.statsService) {
            const country = this.service.currentRound.country;
            if (country?.englishName) {
                this.statsService.recordCountryCorrect(country.englishName);
            }
        }

        // Notify streak callbacks for GameSessionManager integration
        if (result.correct) {
            if (this.onCorrectAnswer) this.onCorrectAnswer();
        } else {
            if (this.onIncorrectAnswer) this.onIncorrectAnswer();
        }

        // If wrong in survival mode, lose a life
        if (!result.correct && this.isSurvivalMode) {
            this.lives--;
            this.view.updateLives(this.lives);
            if (this.lives <= 0) {
                this.roundTransitionTimeout = setTimeout(() => this.endGame(), 1500);
                return;
            }
        }

        this.currentIndex++;
        this.view.updateProgress(this.currentIndex);

        // Delay phase change to prevent same-event bubbling from triggering advance
        setTimeout(() => { this.phase = 'review'; }, 0);
    }

    /**
     * Called when the answer countdown reaches 0.
     */
    handleAnswerTimeout() {
        if (!this.isActive || !this.service.currentRound) return;

        this.view.revealAllLetters(this.service.currentRound.word);
        this.view.showFeedback(false, -15, this.service.currentRound.word, this.service.currentRound.country?.flagUrl);

        this.totalScore -= 15;
        this.view.updateScore(Math.max(0, this.totalScore));

        // Notify streak callback for GameSessionManager integration
        if (this.onIncorrectAnswer) this.onIncorrectAnswer();

        if (this.isSurvivalMode) {
            this.lives--;
            this.view.updateLives(this.lives);
            if (this.lives <= 0) {
                this.roundTransitionTimeout = setTimeout(() => this.endGame(), 1500);
                return;
            }
        }

        this.currentIndex++;
        this.view.updateProgress(this.currentIndex);
        setTimeout(() => { this.phase = 'review'; }, 0);
    }

    /**
     * Called when the player presses "Siguiente" to advance.
     */
    advanceToNextRound() {
        if (!this.isActive) return;
        if (this.phase !== 'review') return;
        this.phase = 'advancing'; // prevent double-advance from keydown + button click
        this.startRound();
    }

    /**
     * Called when the word completes without the player answering.
     */
    handleWordCompleted() {
        if (!this.isActive || !this.service.currentRound) return;
        if (this.service.currentRound.answered) return;

        this.service.currentRound.answered = true;
        this.view.revealAllLetters(this.service.currentRound.word);
        this.view.showTimeoutFeedback(this.service.currentRound.word, this.service.currentRound.country?.flagUrl);

        // Notify streak callback for GameSessionManager integration
        if (this.onIncorrectAnswer) this.onIncorrectAnswer();

        // Survival mode: lose a life
        if (this.isSurvivalMode) {
            this.lives--;
            this.view.updateLives(this.lives);
            if (this.lives <= 0) {
                this.roundTransitionTimeout = setTimeout(() => this.endGame(), 1500);
                return;
            }
        }

        this.currentIndex++;
        this.view.updateProgress(this.currentIndex);
        this.phase = 'review';
    }

    /**
     * Ends the Word Drop game and shows results.
     */
    endGame() {
        this.isActive = false;
        this.clearPendingTimers();

        // Build game-end data for GameSessionManager integration
        const endData = {
            totalScore: Math.max(0, this.totalScore),
            roundsReached: this.currentIndex,
            roundHistory: this.buildRoundHistory(),
        };

        // If managed by GameSessionManager, route through onGameEnd callback
        if (this.onGameEnd) {
            this.onGameEnd(endData);
            return;
        }

        // Legacy standalone mode: record game in stats directly
        if (this.statsService) {
            this.statsService.recordGame({
                correct: this.currentIndex,
                wrong: this.isSurvivalMode ? (3 - this.lives) : 0,
                elapsedSeconds: 0
            });
        }

        this.showEndModal();
    }

    /**
     * Builds a round history array compatible with GameSessionManager.
     * @returns {Array<{correct: boolean, points: number, timeRemaining: number}>}
     * @private
     */
    buildRoundHistory() {
        // WordDropController doesn't track per-round history internally,
        // so we build a synthetic one based on final state
        const history = [];
        // We don't have detailed per-round data, so provide what we can
        for (let i = 0; i < this.currentIndex; i++) {
            history.push({
                correct: true, // approximation — detailed tracking would require more state
                points: 0,
                timeRemaining: 0,
            });
        }
        // Mark incorrect rounds based on lives lost
        if (this.isSurvivalMode) {
            const livesLost = Math.max(0, 3 - this.lives);
            for (let i = 0; i < livesLost && i < history.length; i++) {
                history[history.length - 1 - i] = { correct: false, points: 0, timeRemaining: 0 };
            }
        }
        return history;
    }

    /**
     * Shows the game over modal for Word Drop.
     */
    showEndModal() {
        const modal = document.createElement('div');
        modal.id = 'wordDropEndModal';
        modal.className = 'modal-overlay';

        const wordsGuessed = this.currentIndex;
        const emoji = this.totalScore >= 200 ? '🏆' : this.totalScore >= 100 ? '⭐' : '🎮';
        const diffLabel = this.difficulty === 'hard'
            ? '🔴 Difícil (sin pista)'
            : this.difficulty === 'medium'
                ? '🟡 Medio (solo bandera)'
                : this.category === 'capital'
                    ? '🟢 Fácil (bandera + país)'
                    : '🟢 Fácil (bandera + capital)';

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${emoji} Letras en Caída ${emoji}</h2>
                </div>
                <div class="modal-body">
                    <div class="winner-announcement">
                        <h3>Juego terminado</h3>
                    </div>
                    <div class="final-scores">
                        <div class="score-item green">
                            <span class="team-name">Puntuación total</span>
                            <span class="score">${Math.max(0, this.totalScore)}</span>
                        </div>
                        <div class="score-item blue">
                            <span class="team-name">Palabras jugadas</span>
                            <span class="score">${wordsGuessed}</span>
                        </div>
                        <div class="score-item blue">
                            <span class="team-name">Dificultad</span>
                            <span class="score" style="font-size:0.85rem">${diffLabel}</span>
                        </div>
                        ${this.isSurvivalMode ? `
                        <div class="score-item red">
                            <span class="team-name">Vidas restantes</span>
                            <span class="score">${'♥'.repeat(Math.max(0, this.lives))}${'♡'.repeat(Math.max(0, 3 - this.lives))}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="modal-close-btn">Cerrar</button>
                </div>
            </div>
        `;

        const closeButton = modal.querySelector('.modal-close-btn');
        closeButton.onclick = () => {
            if (modal.parentNode) document.body.removeChild(modal);
            this.cleanup();
        };

        document.body.appendChild(modal);
    }

    /**
     * Cleans up after game ends and returns to landing.
     */
    cleanup() {
        this.view.hide();
        this.view.reset();
        document.body.classList.add('landing-mode');
    }

    /**
     * Stops the game immediately (e.g., when user presses End Game).
     */
    stop() {
        this.isActive = false;
        this.clearPendingTimers();
        this.view.hide();
        this.view.reset();
    }

    /**
     * Fisher-Yates shuffle.
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * Destroys the controller and removes event listeners.
     */
    destroy() {
        this.isActive = false;
        this.clearPendingTimers();
    }
}
