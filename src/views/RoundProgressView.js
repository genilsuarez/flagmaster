/**
 * RoundProgressView — thin progress bar showing round completion.
 *
 * Renders a slim bar (same visual as timer-bar) that fills left-to-right
 * as rounds are completed. Sits between the mode header and the main content.
 *
 * CSS classes:
 * - round-progress: wrapper
 * - round-progress__bar: track
 * - round-progress__fill: animated fill
 */
export class RoundProgressView {
    /** @type {HTMLElement|null} */
    #container;

    /** @type {HTMLElement|null} */
    #fillEl;

    /** @type {number} */
    #total = 0;

    /**
     * @param {Object} options
     * @param {HTMLElement} options.container - Parent element to render into
     * @param {number} options.total - Total number of rounds
     */
    constructor({ container, total }) {
        this.#container = container;
        this.#total = total;
        this.#render();
    }

    /**
     * Updates the bar to reflect completed rounds.
     * @param {number} completed - Number of rounds completed (0-based: call after round ends)
     */
    update(completed) {
        if (!this.#fillEl || this.#total <= 0) return;
        const pct = Math.min(1, Math.max(0, completed / this.#total)) * 100;
        this.#fillEl.style.width = `${pct}%`;
    }

    /**
     * Removes the rendered element.
     */
    destroy() {
        if (this.#container) {
            this.#container.innerHTML = '';
        }
        this.#fillEl = null;
    }

    /** @private */
    #render() {
        if (!this.#container) return;
        this.#container.innerHTML = '';

        const bar = document.createElement('div');
        bar.className = 'round-progress';
        bar.setAttribute('role', 'progressbar');
        bar.setAttribute('aria-valuemin', '0');
        bar.setAttribute('aria-valuemax', String(this.#total));
        bar.setAttribute('aria-valuenow', '0');
        bar.setAttribute('aria-label', 'Progreso de rondas');

        const fill = document.createElement('div');
        fill.className = 'round-progress__fill';
        fill.style.width = '0%';

        bar.appendChild(fill);
        this.#container.appendChild(bar);
        this.#fillEl = fill;
    }
}
