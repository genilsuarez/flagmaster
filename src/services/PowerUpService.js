import { POWER_UP_TYPES } from '../models/PowerUp.js';

/**
 * PowerUpService - Manages power-up granting, inventory, and activation.
 *
 * Power-ups are earned at streak milestones and stored in an inventory (max 3).
 * Only 1 power-up can be activated per question. The 50/50 power-up is restricted
 * to multiple-choice question types only.
 */
export class PowerUpService {
    static MAX_INVENTORY = 3;
    static GRANTS = [
        { streak: 3,  type: 'timeExtra' },
        { streak: 5,  type: 'fiftyFifty' },
        { streak: 7,  type: 'freeze' },
        { streak: 10, type: 'doublePoints' },
    ];

    constructor() {
        this.reset();
    }

    /**
     * Check if a power-up should be granted at the given streak count.
     * Grants the power-up if inventory is not full.
     * @param {number} streakCount - Current consecutive correct answers
     * @returns {null|{full: boolean}|{granted: string}} null if no grant at this streak,
     *   { full: true } if inventory is full, { granted: type } if successfully added
     */
    checkGrant(streakCount) {
        const grant = PowerUpService.GRANTS.find(g => g.streak === streakCount);
        if (!grant) return null;
        if (this.inventory.length >= PowerUpService.MAX_INVENTORY) {
            return { full: true };
        }
        this.inventory.push(grant.type);
        return { granted: grant.type };
    }

    /**
     * Activate a power-up from inventory.
     * Validates that:
     * - The power-up exists in inventory
     * - Only 1 power-up is activated per question
     * - 50/50 is only used on multipleChoice questions
     * @param {string} powerUpId - The power-up type id to activate
     * @param {string} questionType - Current question type (e.g. 'multipleChoice', 'freeText')
     * @returns {{success: boolean, error?: string, effect?: string}}
     */
    activate(powerUpId, questionType) {
        if (this.activatedThisQuestion) {
            return { success: false, error: 'alreadyUsedThisQuestion' };
        }

        const index = this.inventory.indexOf(powerUpId);
        if (index === -1) {
            return { success: false, error: 'notInInventory' };
        }

        const powerUpDef = POWER_UP_TYPES[powerUpId];
        if (!powerUpDef) {
            return { success: false, error: 'invalidPowerUp' };
        }

        // 50/50 is only applicable to multipleChoice questions
        if (powerUpId === 'fiftyFifty' && questionType !== 'multipleChoice') {
            return { success: false, error: 'notApplicable' };
        }

        // Remove from inventory and mark as activated
        this.inventory.splice(index, 1);
        this.activatedThisQuestion = true;

        return { success: true, effect: powerUpId };
    }

    /**
     * Reset the per-question activation flag. Call at the start of each new question.
     */
    resetQuestionState() {
        this.activatedThisQuestion = false;
    }

    /**
     * Fully reset the service state (inventory and activation tracking).
     */
    reset() {
        this.inventory = [];
        this.activatedThisQuestion = false;
    }
}
