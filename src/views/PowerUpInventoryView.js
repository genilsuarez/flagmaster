import { POWER_UP_TYPES } from '../models/PowerUp.js';

/**
 * PowerUpInventoryView - Displays up to 3 power-up icons as circular buttons.
 * Players can activate a power-up before answering; once any power-up is used
 * in a round, all buttons become disabled until the next round.
 *
 * CSS classes:
 * - powerup-inventory: flex container for the buttons
 * - powerup-btn: individual circular icon button
 * - powerup-btn--used: applied to all buttons after one activation per round
 *
 * Accessibility:
 * - Each button has an aria-label with the power-up name
 * - Tooltip on hover shows the power-up name
 */
export class PowerUpInventoryView {
    /** @type {HTMLElement|null} */
    #container;

    /** @type {HTMLElement|null} */
    #inventoryEl;

    /** @type {function|null} Callback when a power-up is activated */
    #onActivate;

    /** @type {boolean} Whether a power-up has been used this round */
    #usedThisRound = false;

    /** @type {string[]} Current inventory of power-up type ids */
    #currentInventory = [];

    /**
     * @param {Object} options
     * @param {HTMLElement} options.container - Parent element to render into
     * @param {function} [options.onActivate] - Callback invoked with power-up id on activation
     */
    constructor({ container, onActivate = null }) {
        this.#container = container;
        this.#onActivate = onActivate;
        this.#render();
    }

    /**
     * Updates the displayed power-up buttons based on the current inventory.
     * @param {string[]} inventory - Array of power-up type ids (max 3)
     */
    update(inventory) {
        this.#currentInventory = inventory.slice(0, 3);
        this.#renderButtons();
    }

    /**
     * Resets the per-round used state, re-enabling buttons for the next round.
     */
    resetRound() {
        this.#usedThisRound = false;
        this.#renderButtons();
    }

    /**
     * Sets the onActivate callback.
     * @param {function} callback
     */
    set onActivate(callback) {
        this.#onActivate = callback;
    }

    /**
     * Removes the rendered content and cleans up.
     */
    destroy() {
        if (this.#container) {
            this.#container.innerHTML = '';
        }
        this.#inventoryEl = null;
        this.#currentInventory = [];
        this.#usedThisRound = false;
    }

    /**
     * Creates the DOM structure for the power-up inventory container.
     * @private
     */
    #render() {
        if (!this.#container) return;

        this.#container.innerHTML = '';

        const inventory = document.createElement('div');
        inventory.className = 'powerup-inventory';
        inventory.setAttribute('role', 'toolbar');
        inventory.setAttribute('aria-label', 'Inventario de power-ups');

        this.#container.appendChild(inventory);
        this.#inventoryEl = inventory;
    }

    /**
     * Re-renders the power-up buttons based on current inventory and used state.
     * @private
     */
    #renderButtons() {
        if (!this.#inventoryEl) return;

        this.#inventoryEl.innerHTML = '';

        for (const typeId of this.#currentInventory) {
            const powerUp = POWER_UP_TYPES[typeId];
            if (!powerUp) continue;

            const btn = document.createElement('button');
            btn.className = 'powerup-btn';
            btn.type = 'button';
            btn.textContent = powerUp.icon;
            btn.setAttribute('aria-label', powerUp.name);
            btn.setAttribute('title', powerUp.name);
            btn.dataset.powerupId = typeId;

            if (this.#usedThisRound) {
                btn.classList.add('powerup-btn--used');
                btn.disabled = true;
            }

            btn.addEventListener('click', () => this.#handleActivate(typeId));

            this.#inventoryEl.appendChild(btn);
        }
    }

    /**
     * Handles a power-up button click. Marks the round as used and invokes callback.
     * @param {string} typeId - The power-up type id that was activated
     * @private
     */
    #handleActivate(typeId) {
        if (this.#usedThisRound) return;

        this.#usedThisRound = true;

        // Disable all buttons immediately
        this.#renderButtons();

        if (this.#onActivate) {
            this.#onActivate(typeId);
        }
    }
}
