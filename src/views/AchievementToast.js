import { ACHIEVEMENTS } from '../services/AchievementService.js';

/**
 * AchievementToast - Shows a brief toast notification when achievements are unlocked.
 *
 * Displays a small animated toast at the top of the screen with the achievement
 * icon and name. Auto-dismisses after 3 seconds. Queues multiple toasts if
 * several achievements unlock simultaneously.
 *
 * CSS classes:
 * - achievement-toast: root toast element
 * - achievement-toast--visible: shown state (triggers slide-in animation)
 * - achievement-toast__icon: emoji icon
 * - achievement-toast__text: text content
 */
export class AchievementToast {
    /** @type {HTMLElement|null} */
    #container = null;

    /** @type {string[]} */
    #queue = [];

    /** @type {boolean} */
    #showing = false;

    constructor() {
        this.#createContainer();
    }

    /**
     * Shows toast notifications for newly unlocked achievements.
     * Queues multiple achievements and shows them sequentially.
     *
     * @param {string[]} achievementIds - Array of newly unlocked achievement IDs
     */
    show(achievementIds) {
        if (!achievementIds || achievementIds.length === 0) return;

        this.#queue.push(...achievementIds);
        if (!this.#showing) {
            this.#showNext();
        }
    }

    /**
     * Creates the toast container element and appends it to the body.
     * @private
     */
    #createContainer() {
        this.#container = document.createElement('div');
        this.#container.className = 'achievement-toast';
        this.#container.setAttribute('role', 'status');
        this.#container.setAttribute('aria-live', 'polite');
        this.#container.setAttribute('aria-atomic', 'true');
        document.body.appendChild(this.#container);
    }

    /**
     * Shows the next queued achievement toast.
     * @private
     */
    #showNext() {
        if (this.#queue.length === 0) {
            this.#showing = false;
            return;
        }

        this.#showing = true;
        const achievementId = this.#queue.shift();
        const achievement = ACHIEVEMENTS[achievementId];

        if (!achievement) {
            this.#showNext();
            return;
        }

        // Build toast content
        this.#container.innerHTML = '';

        const icon = document.createElement('span');
        icon.className = 'achievement-toast__icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = achievement.icon;

        const text = document.createElement('span');
        text.className = 'achievement-toast__text';
        text.textContent = `🏅 Logro desbloqueado: ${achievement.name}`;

        this.#container.appendChild(icon);
        this.#container.appendChild(text);

        // Show with animation
        requestAnimationFrame(() => {
            this.#container.classList.add('achievement-toast--visible');
        });

        // Auto-dismiss after 3 seconds
        setTimeout(() => {
            this.#container.classList.remove('achievement-toast--visible');
            // Wait for transition to finish before showing next
            setTimeout(() => this.#showNext(), 300);
        }, 3000);
    }

    /**
     * Destroys the toast and removes it from the DOM.
     */
    destroy() {
        if (this.#container && this.#container.parentNode) {
            this.#container.parentNode.removeChild(this.#container);
        }
        this.#container = null;
        this.#queue = [];
        this.#showing = false;
    }
}
