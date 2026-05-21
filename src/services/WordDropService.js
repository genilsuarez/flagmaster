/**
 * WordDropService: manages the Word Drop game mode logic.
 * Handles letter reveal timing, scoring, and round lifecycle.
 */
export class WordDropService {
    constructor() {
        this.currentRound = null;
        this.revealInterval = null;
        this.onLetterRevealed = null;
        this.onWordCompleted = null;
    }

    /**
     * Creates a new round from a country object.
     * @param {object} country - Country model instance
     * @param {object} options - { category, speed }
     */
    createRound(country, options = {}) {
        const category = options.category || 'country'; // 'country' | 'capital'
        const speed = options.speed || 'normal'; // 'slow' | 'normal' | 'fast'

        const word = category === 'capital'
            ? (country.capital || country.spanishName)
            : country.spanishName;

        const upperWord = word.toUpperCase();
        const totalLetters = upperWord.length;

        // Generate random reveal order
        const revealOrder = this.generateRevealOrder(totalLetters);

        const timePerLetter = {
            slow: 1200,
            normal: 800,
            fast: 500
        }[speed] || 800;

        this.currentRound = {
            word: upperWord,
            totalLetters,
            revealedCount: 0,
            revealOrder,
            revealedPositions: new Set(),
            timePerLetter,
            answered: false,
            playerAnswer: null,
            score: 0,
            country,
            category
        };

        return this.currentRound;
    }

    /**
     * Generates a shuffled array of indices for letter reveal order.
     */
    generateRevealOrder(length) {
        const indices = Array.from({ length }, (_, i) => i);
        // Fisher-Yates shuffle
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        return indices;
    }

    /**
     * Starts the letter reveal interval.
     */
    startRevealing() {
        if (!this.currentRound) return;

        // Always clear any existing interval to prevent stacking
        this.stopRevealing();

        this.revealInterval = setInterval(() => {
            if (!this.currentRound || this.currentRound.answered) {
                this.stopRevealing();
                return;
            }

            if (this.currentRound.revealedCount >= this.currentRound.totalLetters) {
                this.stopRevealing();
                if (this.onWordCompleted) this.onWordCompleted();
                return;
            }

            const positionToReveal = this.currentRound.revealOrder[this.currentRound.revealedCount];
            this.currentRound.revealedPositions.add(positionToReveal);
            this.currentRound.revealedCount++;

            if (this.onLetterRevealed) {
                this.onLetterRevealed(positionToReveal, this.currentRound.word[positionToReveal]);
            }

            // Check if word is now complete
            if (this.currentRound.revealedCount >= this.currentRound.totalLetters) {
                this.stopRevealing();
                if (this.onWordCompleted) this.onWordCompleted();
            }
        }, this.currentRound.timePerLetter);
    }

    /**
     * Stops the letter reveal interval.
     */
    stopRevealing() {
        if (this.revealInterval) {
            clearInterval(this.revealInterval);
            this.revealInterval = null;
        }
    }

    /**
     * Called when the player presses the guess button.
     * Freezes the reveal and returns the current state.
     */
    freezeRound() {
        this.stopRevealing();
        if (this.currentRound) {
            this.currentRound.answered = true;
        }
        return this.currentRound;
    }

    /**
     * Validates the player's answer and calculates score.
     * @param {string} playerAnswer
     * @returns {{ correct: boolean, score: number, word: string }}
     */
    validateAnswer(playerAnswer) {
        if (!this.currentRound) return { correct: false, score: 0, word: '' };

        const normalized = this.normalizeAnswer(playerAnswer);
        const expected = this.normalizeAnswer(this.currentRound.word);
        const correct = normalized === expected;

        const score = this.calculateScore(
            this.currentRound.revealedCount,
            this.currentRound.totalLetters,
            correct
        );

        this.currentRound.playerAnswer = playerAnswer;
        this.currentRound.score = score;

        return {
            correct,
            score,
            word: this.currentRound.word
        };
    }

    /**
     * Calculates score based on how many letters were revealed.
     */
    calculateScore(revealedCount, totalLetters, isCorrect) {
        if (!isCorrect) return -15;

        const ratio = revealedCount / totalLetters;

        if (ratio <= 0.25) return 100;
        if (ratio <= 0.50) return 60;
        if (ratio <= 0.75) return 20;
        return 10;
    }

    /**
     * Normalizes a string for comparison (removes accents, uppercases, trims).
     */
    normalizeAnswer(str) {
        return str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase()
            .trim();
    }

    /**
     * Returns the current display state of the word (revealed letters + blanks).
     */
    getDisplayState() {
        if (!this.currentRound) return [];

        return Array.from(this.currentRound.word).map((char, index) => {
            if (char === ' ') return { char: ' ', revealed: true, isSpace: true };
            return {
                char,
                revealed: this.currentRound.revealedPositions.has(index),
                isSpace: false
            };
        });
    }

    /**
     * Resets the current round.
     */
    reset() {
        this.stopRevealing();
        this.currentRound = null;
    }
}
