/**
 * StreakIndicatorView - Visual feedback for the streak/multiplier system.
 * Positioned at the top of the game area, displays current streak count
 * and multiplier with tier-based visual styling.
 *
 * Tiers (ascending):
 *   none   → hidden/minimal display
 *   gold   → gold border glow
 *   fire   → terracotta gradient with 🔥
 *   pulse  → animated pulse glow
 *   aurora → aurora shimmer with ✨
 *
 * CSS classes:
 * - streak-indicator: base container
 * - streak-indicator--none: no active streak
 * - streak-indicator--gold: gold tier (3+ streak)
 * - streak-indicator--fire: fire tier (5+ streak)
 * - streak-indicator--pulse: pulse tier (8+ streak)
 * - streak-indicator--aurora: aurora tier (12+ streak)
 *
 * Accessibility:
 * - aria-live="polite" announcements on tier changes
 * - prefers-reduced-motion: disables animations
 */
export class StreakIndicatorView {
    /** @type {HTMLElement|null} */
    #container;

    /** @type {HTMLElement|null} */
    #displayEl;

    /** @type {HTMLElement|null} */
    #announcer;

    /** @type {string} Current active tier */
    #currentTier = 'none';

    /** @type {number} Current streak count */
    #currentCount = 0;

    /** @type {number} Current multiplier */
    #currentMultiplier = 1.0;

    /** @type {Object<string, string>} Tier icons */
    static TIER_ICONS = {
        none: '',
        gold: '⭐',
        fire: '🔥',
        pulse: '💫',
        aurora: '✨',
    };

    /** @type {Object<string, string>} Tier labels for accessibility */
    static TIER_LABELS = {
        none: 'sin racha',
        gold: 'nivel oro',
        fire: 'nivel fuego',
        pulse: 'nivel pulso',
        aurora: 'nivel aurora',
    };

    /**
     * @param {Object} options
     * @param {HTMLElement} options.container - Parent element to render into
     */
    constructor({ container }) {
        this.#container = container;
        this.#render();
    }

    /**
     * Updates the streak indicator display with new tier, count, and multiplier.
     * Triggers CSS tier transition and aria-live announcement when tier changes.
     *
     * @param {string} tier - One of: 'none', 'gold', 'fire', 'pulse', 'aurora'
     * @param {number} count - Current streak count
     * @param {number} multiplier - Current active multiplier
     */
    update(tier, count, multiplier) {
        const tierChanged = tier !== this.#currentTier;

        this.#currentTier = tier;
        this.#currentCount = count;
        this.#currentMultiplier = multiplier;

        this.#updateDisplay();
        this.#updateTierClass(tier);

        if (tierChanged) {
            this.#announce(tier, count, multiplier);
        }
    }

    /**
     * Resets the indicator to its initial hidden state.
     */
    reset() {
        this.update('none', 0, 1.0);
    }

    /**
     * Removes the rendered content and cleans up.
     */
    destroy() {
        if (this.#container) {
            this.#container.innerHTML = '';
        }
        this.#displayEl = null;
        this.#announcer = null;
        this.#currentTier = 'none';
        this.#currentCount = 0;
        this.#currentMultiplier = 1.0;
    }

    /**
     * Creates the DOM structure for the streak indicator.
     * @private
     */
    #render() {
        if (!this.#container) return;

        this.#container.innerHTML = '';

        const indicator = document.createElement('div');
        indicator.className = 'streak-indicator streak-indicator--none';
        indicator.setAttribute('role', 'status');
        indicator.setAttribute('aria-label', 'Indicador de racha');

        const display = document.createElement('span');
        display.className = 'streak-indicator__display';
        indicator.appendChild(display);

        // Hidden announcer for screen readers
        const announcer = document.createElement('span');
        announcer.className = 'sr-only';
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        indicator.appendChild(announcer);

        this.#container.appendChild(indicator);
        this.#displayEl = display;
        this.#announcer = announcer;
    }

    /**
     * Updates the visible text content of the indicator.
     * @private
     */
    #updateDisplay() {
        if (!this.#displayEl) return;

        if (this.#currentTier === 'none' || this.#currentCount === 0) {
            this.#displayEl.textContent = '';
            return;
        }

        const icon = StreakIndicatorView.TIER_ICONS[this.#currentTier] || '';
        this.#displayEl.textContent = `${icon} ${this.#currentCount} × ${this.#currentMultiplier.toFixed(1)}`;
    }

    /**
     * Updates the CSS class to reflect the current tier, removing old tier classes.
     * @param {string} tier - The new tier
     * @private
     */
    #updateTierClass(tier) {
        if (!this.#container) return;

        const indicator = this.#container.querySelector('.streak-indicator');
        if (!indicator) return;

        // Remove all tier classes
        indicator.classList.remove(
            'streak-indicator--none',
            'streak-indicator--gold',
            'streak-indicator--fire',
            'streak-indicator--pulse',
            'streak-indicator--aurora'
        );

        // Add the current tier class
        indicator.classList.add(`streak-indicator--${tier}`);
    }

    /**
     * Announces the tier change to screen readers via aria-live region.
     * @param {string} tier - Current tier
     * @param {number} count - Current streak count
     * @param {number} multiplier - Current multiplier
     * @private
     */
    #announce(tier, count, multiplier) {
        if (!this.#announcer) return;

        if (tier === 'none') {
            this.#announcer.textContent = 'Racha perdida';
            return;
        }

        const tierLabel = StreakIndicatorView.TIER_LABELS[tier] || tier;
        this.#announcer.textContent = `Racha: ${count}, multiplicador ×${multiplier.toFixed(1)}, ${tierLabel}`;
    }
}
