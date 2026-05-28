/**
 * WordDropView: manages the DOM for the Word Drop game mode.
 * Creates letter boxes, input field, score display, and animations.
 */
export class WordDropView {
    constructor() {
        this.container = null;
        this.letterGrid = null;
        this.guessButton = null;
        this.inputContainer = null;
        this.answerInput = null;
        this.scoreDisplay = null;
        this.livesDisplay = null;
        this.feedbackEl = null;
        this.flagHint = null;
        this.countryNameHint = null;
        this.letterBoxes = [];
        this.currentDifficulty = 'easy';

        this.onGuessPressed = null;
        this.onAnswerSubmitted = null;
        this.onNextPressed = null;
        this.onAnswerTimeout = null;
        this.answerCountdownInterval = null;
        this.answerTimeLeft = 10;

        this.buildDOM();
    }

    buildDOM() {
        this.container = document.createElement('div');
        this.container.id = 'wordDropContainer';
        this.container.className = 'word-drop-container';
        this.container.hidden = true;

        // Score & lives bar
        const topBar = document.createElement('div');
        topBar.className = 'word-drop-top-bar';

        this.scoreDisplay = document.createElement('div');
        this.scoreDisplay.className = 'word-drop-score';
        this.scoreDisplay.innerHTML = '<span class="wd-score-label">Puntos</span><span class="wd-score-value">0</span>';

        this.difficultyBadge = document.createElement('div');
        this.difficultyBadge.className = 'word-drop-difficulty-badge';
        this.difficultyBadge.textContent = '🟢 Fácil';

        this.livesDisplay = document.createElement('div');
        this.livesDisplay.className = 'word-drop-lives';
        this.livesDisplay.innerHTML = '<span class="wd-lives-hearts">♥♥♥</span>';

        topBar.appendChild(this.scoreDisplay);
        topBar.appendChild(this.difficultyBadge);
        topBar.appendChild(this.livesDisplay);

        // Flag hint (optional)
        this.flagHint = document.createElement('img');
        this.flagHint.className = 'word-drop-flag-hint';
        this.flagHint.alt = 'Flag hint';
        this.flagHint.loading = 'eager';

        // Country name hint (easy mode only)
        this.countryNameHint = document.createElement('div');
        this.countryNameHint.className = 'word-drop-country-name-hint';
        this.countryNameHint.hidden = true;

        // Letter grid
        this.letterGrid = document.createElement('div');
        this.letterGrid.className = 'word-drop-grid';

        // Feedback element
        this.feedbackEl = document.createElement('div');
        this.feedbackEl.className = 'word-drop-feedback';

        // Guess button
        this.guessButton = document.createElement('button');
        this.guessButton.className = 'word-drop-guess-btn';
        this.guessButton.textContent = '¡Ya sé!';
        this.guessButton.addEventListener('click', () => {
            if (this.onGuessPressed) this.onGuessPressed();
        });

        // Input container (hidden until guess pressed)
        this.inputContainer = document.createElement('div');
        this.inputContainer.className = 'word-drop-input-container';
        this.inputContainer.hidden = true;

        this.answerInput = document.createElement('input');
        this.answerInput.type = 'text';
        this.answerInput.className = 'word-drop-input';
        this.answerInput.placeholder = 'Escribe tu respuesta...';
        this.answerInput.autocomplete = 'off';
        this.answerInput.spellcheck = false;

        const submitBtn = document.createElement('button');
        submitBtn.className = 'word-drop-submit-btn';
        submitBtn.textContent = 'Enviar';
        submitBtn.addEventListener('click', () => this.submitAnswer());

        this.answerInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                this.submitAnswer();
            }
        });

        this.inputContainer.appendChild(this.answerInput);
        this.inputContainer.appendChild(submitBtn);

        // Countdown element for answer time
        this.countdownEl = document.createElement('div');
        this.countdownEl.className = 'word-drop-answer-countdown';
        this.countdownEl.hidden = true;
        this.inputContainer.appendChild(this.countdownEl);

        // Next button (shown after feedback)
        this.nextButton = document.createElement('button');
        this.nextButton.className = 'word-drop-next-btn';
        this.nextButton.textContent = 'Siguiente →';
        this.nextButton.hidden = true;
        this.nextButton.addEventListener('click', () => {
            if (this.onNextPressed) this.onNextPressed();
        });

        // Assemble
        this.container.appendChild(topBar);
        this.container.appendChild(this.flagHint);
        this.container.appendChild(this.countryNameHint);
        this.container.appendChild(this.letterGrid);
        this.container.appendChild(this.feedbackEl);
        this.container.appendChild(this.guessButton);
        this.container.appendChild(this.inputContainer);
        this.container.appendChild(this.nextButton);

        // Insert into game wrapper
        const gameWrapper = document.querySelector('.game-wrapper');
        if (gameWrapper) {
            gameWrapper.appendChild(this.container);
        }
    }

    /**
     * Shows the Word Drop UI and hides the standard game UI.
     */
    show() {
        this.container.hidden = false;
        // Legacy elements are already hidden by GameSessionManager.prepareGameUI()
    }

    /**
     * Hides the Word Drop UI and restores standard game UI.
     */
    hide() {
        this.container.hidden = true;
        // UI restoration is handled by GameSessionManager.restoreGameUI()
    }

    /**
     * Sets up the letter boxes for a new word.
     * @param {string} word - The word to display as boxes
     * @param {boolean} showFlag - Whether to show the flag hint
     * @param {string} flagUrl - URL of the flag image
     * @param {string} [countryName] - Country name for easy mode hint
     */
    setupWord(word, showFlag, flagUrl, countryName) {
        this.letterGrid.innerHTML = '';
        this.letterBoxes = [];
        this.feedbackEl.textContent = '';
        this.feedbackEl.className = 'word-drop-feedback';
        this.guessButton.hidden = false;
        this.guessButton.disabled = false;
        this.inputContainer.hidden = true;
        this.nextButton.hidden = true;
        this.answerInput.value = '';
        this.answerInput.disabled = false;

        // Flag hint
        this.flagHint.classList.remove('flag-hint-reveal');
        if (showFlag && flagUrl) {
            this.flagHint.src = flagUrl;
            this.flagHint.hidden = false;
        } else {
            this.flagHint.hidden = true;
        }

        // Country name hint (easy mode only)
        if (this.currentDifficulty === 'easy' && countryName) {
            this.countryNameHint.textContent = countryName;
            this.countryNameHint.hidden = false;
        } else {
            this.countryNameHint.textContent = '';
            this.countryNameHint.hidden = true;
        }

        // Create letter boxes
        for (let i = 0; i < word.length; i++) {
            const char = word[i];
            if (char === ' ') {
                const spacer = document.createElement('div');
                spacer.className = 'word-drop-spacer';
                this.letterGrid.appendChild(spacer);
                this.letterBoxes.push(null); // placeholder
            } else {
                const box = document.createElement('div');
                box.className = 'letter-box';
                box.dataset.index = i;
                box.textContent = '';
                this.letterGrid.appendChild(box);
                this.letterBoxes.push(box);
            }
        }
    }

    /**
     * Reveals a letter at the given position with animation.
     */
    revealLetter(position, char) {
        const box = this.letterBoxes[position];
        if (!box) return;

        box.textContent = char;
        box.classList.add('revealed');

        // Trigger drop animation
        box.classList.add('letter-drop');
        setTimeout(() => box.classList.remove('letter-drop'), 400);
    }

    /**
     * Reveals all remaining letters (when word completes or after answer).
     */
    revealAllLetters(word) {
        for (let i = 0; i < word.length; i++) {
            const box = this.letterBoxes[i];
            if (box && !box.classList.contains('revealed')) {
                box.textContent = word[i];
                box.classList.add('revealed', 'revealed-final');
            }
        }
    }

    /**
     * Shows the input field for the player to type their answer.
     */
    showInput() {
        this.guessButton.hidden = true;
        this.inputContainer.hidden = false;
        this.answerInput.focus();
        this.startAnswerCountdown();
    }

    /**
     * Starts a 10-second countdown for answering.
     */
    startAnswerCountdown() {
        this.answerTimeLeft = 10;
        this.updateCountdownDisplay();
        this.countdownEl.hidden = false;

        this.answerCountdownInterval = setInterval(() => {
            this.answerTimeLeft--;
            this.updateCountdownDisplay();

            if (this.answerTimeLeft <= 0) {
                this.stopAnswerCountdown();
                // Auto-submit empty (timeout)
                if (this.onAnswerTimeout) this.onAnswerTimeout();
            }
        }, 1000);
    }

    /**
     * Stops the answer countdown.
     */
    stopAnswerCountdown() {
        if (this.answerCountdownInterval) {
            clearInterval(this.answerCountdownInterval);
            this.answerCountdownInterval = null;
        }
        this.countdownEl.hidden = true;
    }

    /**
     * Updates the countdown display element.
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
     * Returns how many seconds elapsed since the countdown started.
     */
    getElapsedAnswerSeconds() {
        return 10 - (this.answerTimeLeft || 0);
    }

    /**
     * Submits the answer from the input field.
     */
    submitAnswer() {
        const answer = this.answerInput.value.trim();
        if (!answer) return;
        this.stopAnswerCountdown();
        if (this.onAnswerSubmitted) this.onAnswerSubmitted(answer);
    }

    /**
     * Shows feedback after answer validation.
     * @param {boolean} correct
     * @param {number} score
     * @param {string} correctWord
     */
    showFeedback(correct, score, correctWord, flagUrl) {
        this.inputContainer.hidden = true;
        this.answerInput.disabled = true;

        if (correct) {
            this.feedbackEl.textContent = `✓ ¡Correcto! +${score} puntos`;
            this.feedbackEl.className = 'word-drop-feedback feedback-correct';
            this.letterGrid.classList.add('grid-correct');
        } else {
            this.feedbackEl.textContent = `✗ Incorrecto (${score}). Era: ${correctWord}`;
            this.feedbackEl.className = 'word-drop-feedback feedback-wrong';
            this.letterGrid.classList.add('grid-wrong');
        }

        // In hard mode (no flag shown), reveal the flag after validation for learning
        if (flagUrl && this.flagHint.hidden) {
            this.flagHint.src = flagUrl;
            this.flagHint.hidden = false;
            this.flagHint.classList.add('flag-hint-reveal');
        }

        setTimeout(() => {
            this.letterGrid.classList.remove('grid-correct', 'grid-wrong');
        }, 600);

        this.nextButton.hidden = false;
        this.nextButton.focus();
    }

    /**
     * Shows feedback when word completes without answer.
     */
    showTimeoutFeedback(word, flagUrl) {
        this.guessButton.hidden = true;
        this.inputContainer.hidden = true;
        this.answerInput.disabled = true;
        this.feedbackEl.textContent = `⏱ Tiempo agotado. Era: ${word}`;
        this.feedbackEl.className = 'word-drop-feedback feedback-timeout';

        // In hard mode, reveal the flag for learning
        if (flagUrl && this.flagHint.hidden) {
            this.flagHint.src = flagUrl;
            this.flagHint.hidden = false;
            this.flagHint.classList.add('flag-hint-reveal');
        }

        this.nextButton.hidden = false;
        this.nextButton.focus();
    }

    /**
     * Updates the score display.
     */
    updateScore(score) {
        const valueEl = this.scoreDisplay.querySelector('.wd-score-value');
        if (valueEl) valueEl.textContent = score;
    }

    /**
     * Updates the lives display.
     * @param {number} lives - remaining lives (0-3)
     */
    updateLives(lives) {
        const heartsEl = this.livesDisplay.querySelector('.wd-lives-hearts');
        if (heartsEl) {
            const full = '♥'.repeat(Math.max(0, lives));
            const empty = '♡'.repeat(Math.max(0, 3 - lives));
            heartsEl.textContent = full + empty;
            if (lives <= 1) heartsEl.classList.add('lives-critical');
            else heartsEl.classList.remove('lives-critical');
        }
    }

    /**
     * Shows/hides lives display based on survival mode.
     */
    setLivesVisible(visible) {
        this.livesDisplay.style.display = visible ? 'flex' : 'none';
    }

    /**
     * Updates the difficulty badge display.
     * @param {string} difficulty - 'easy' or 'hard'
     */
    setDifficulty(difficulty) {
        if (this.difficultyBadge) {
            if (difficulty === 'hard') {
                this.difficultyBadge.textContent = '🔴 Difícil';
                this.difficultyBadge.classList.add('difficulty-hard');
                this.difficultyBadge.classList.remove('difficulty-easy');
            } else {
                this.difficultyBadge.textContent = '🟢 Fácil';
                this.difficultyBadge.classList.add('difficulty-easy');
                this.difficultyBadge.classList.remove('difficulty-hard');
            }
        }
    }

    /**
     * Resets the view for a clean state.
     */
    reset() {
        this.letterGrid.innerHTML = '';
        this.letterBoxes = [];
        this.feedbackEl.textContent = '';
        this.feedbackEl.className = 'word-drop-feedback';
        this.guessButton.hidden = false;
        this.guessButton.disabled = false;
        this.inputContainer.hidden = true;
        this.nextButton.hidden = true;
        this.answerInput.value = '';
        this.flagHint.hidden = true;
        this.stopAnswerCountdown();
        this.updateScore(0);
        this.updateLives(3);
    }
}
