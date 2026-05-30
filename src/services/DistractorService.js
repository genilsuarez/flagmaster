/**
 * DistractorService - Generates wrong answer options for multiple-choice questions.
 *
 * Prefers same-continent countries as distractors for higher difficulty,
 * falling back to random selection from the full pool when insufficient
 * same-continent options are available.
 */
export class DistractorService {
    /**
     * Generate distractor countries for a multiple-choice question.
     * Prefers same-continent countries, falls back to random from pool.
     * Ensures uniqueness (no duplicates, excludes correct country).
     *
     * @param {import('../models/Country.js').Country} correctCountry - The correct answer country
     * @param {import('../models/Country.js').Country[]} pool - Available countries to pick from
     * @param {number} count - Number of distractors to generate (default 3)
     * @param {boolean} preferSameContinent - Whether to prefer same-continent distractors (default true)
     * @returns {import('../models/Country.js').Country[]} Array of distractor countries
     */
    generateDistractors(correctCountry, pool, count = 3, preferSameContinent = true) {
        const eligible = pool.filter(c => c !== correctCountry);

        if (eligible.length <= count) {
            return eligible.slice();
        }

        if (preferSameContinent) {
            const sameContinentPool = eligible.filter(
                c => c.continent === correctCountry.continent
            );

            if (sameContinentPool.length >= count) {
                return this.pickRandom(sameContinentPool, count);
            }

            // Not enough same-continent: use all same-continent + fill from others
            const distractors = [...sameContinentPool];
            const remaining = eligible.filter(
                c => c.continent !== correctCountry.continent
            );
            const needed = count - distractors.length;
            const extras = this.pickRandom(remaining, needed);
            distractors.push(...extras);
            return distractors;
        }

        return this.pickRandom(eligible, count);
    }

    /**
     * Combine the correct answer with distractors and return a shuffled array.
     * Tracks recent correct-answer positions to avoid streaks where the correct
     * answer lands in the same slot multiple times in a row.
     *
     * @param {import('../models/Country.js').Country} correct - The correct answer
     * @param {import('../models/Country.js').Country[]} distractors - The distractor options
     * @returns {import('../models/Country.js').Country[]} Randomized array with correct answer included
     */
    shuffleOptions(correct, distractors) {
        const options = [correct, ...distractors];
        const totalOptions = options.length;

        // Initialize position history if not present
        if (!this._recentCorrectPositions) {
            this._recentCorrectPositions = [];
        }

        // Attempt shuffle up to 10 times to avoid repeating the same position
        // 3+ times consecutively
        const MAX_REPEAT = 2;
        const MAX_ATTEMPTS = 10;

        let shuffled;
        let correctIndex;

        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            shuffled = this.shuffle(options);
            correctIndex = shuffled.indexOf(correct);

            // Check if this position would create a streak of MAX_REPEAT+1
            const history = this._recentCorrectPositions;
            const recentSame = history.length >= MAX_REPEAT &&
                history.slice(-MAX_REPEAT).every(pos => pos === correctIndex);

            if (!recentSame) {
                break;
            }
        }

        // Record the position (keep last 5 entries)
        this._recentCorrectPositions.push(correctIndex);
        if (this._recentCorrectPositions.length > 5) {
            this._recentCorrectPositions.shift();
        }

        return shuffled;
    }

    /**
     * Resets the position history tracker. Call when starting a new game session.
     */
    resetPositionHistory() {
        this._recentCorrectPositions = [];
    }

    /**
     * Pick `count` random elements from an array using Fisher-Yates partial shuffle.
     * Does not mutate the original array.
     *
     * @param {Array} array - Source array to pick from
     * @param {number} count - Number of elements to pick
     * @returns {Array} Array of randomly selected elements
     */
    pickRandom(array, count) {
        const copy = array.slice();
        const result = [];
        const picks = Math.min(count, copy.length);

        for (let i = 0; i < picks; i++) {
            const randomIndex = Math.floor(Math.random() * (copy.length - i)) + i;
            [copy[i], copy[randomIndex]] = [copy[randomIndex], copy[i]];
            result.push(copy[i]);
        }

        return result;
    }

    /**
     * Shuffle an array using Fisher-Yates algorithm.
     * Does not mutate the original array.
     *
     * @param {Array} array - Array to shuffle
     * @returns {Array} New shuffled array
     */
    shuffle(array) {
        const copy = array.slice();

        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }

        return copy;
    }
}
