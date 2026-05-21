/**
 * StreakService - Tracks consecutive correct answers and determines tier/multiplier.
 *
 * Thresholds (descending):
 *   12+ correct → ×5.0 (aurora)
 *    8+ correct → ×3.0 (pulse)
 *    5+ correct → ×2.0 (fire)
 *    3+ correct → ×1.5 (gold)
 *   <3  correct → ×1.0 (none)
 */
export class StreakService {
    static THRESHOLDS = [
        { count: 12, multiplier: 5.0, tier: 'aurora' },
        { count: 8,  multiplier: 3.0, tier: 'pulse' },
        { count: 5,  multiplier: 2.0, tier: 'fire' },
        { count: 3,  multiplier: 1.5, tier: 'gold' },
    ];

    constructor() {
        this.reset();
    }

    /**
     * Record a correct answer. Increments streak count and updates tier/multiplier.
     * @returns {{ multiplier: number, tier: string, count: number }}
     */
    recordCorrect() {
        this.count++;
        this.updateTier();
        return { multiplier: this.multiplier, tier: this.tier, count: this.count };
    }

    /**
     * Record an incorrect answer. Resets streak to zero.
     * @returns {{ multiplier: number, tier: string, count: number }}
     */
    recordIncorrect() {
        this.reset();
        return { multiplier: this.multiplier, tier: this.tier, count: this.count };
    }

    /**
     * Reset streak state to initial values.
     */
    reset() {
        this.count = 0;
        this.multiplier = 1.0;
        this.tier = 'none';
    }

    /**
     * Update tier and multiplier based on current streak count.
     * Iterates thresholds in descending order, applying the first match.
     * @private
     */
    updateTier() {
        for (const t of StreakService.THRESHOLDS) {
            if (this.count >= t.count) {
                this.multiplier = t.multiplier;
                this.tier = t.tier;
                return;
            }
        }
        this.multiplier = 1.0;
        this.tier = 'none';
    }
}
