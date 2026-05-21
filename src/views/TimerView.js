/**
 * Shared view for rendering a countdown timer as a linear progress bar.
 * Uses requestAnimationFrame for smooth animation and Date.now() for
 * accurate timing independent of frame rate.
 *
 * CSS classes:
 * - timer-bar: container element
 * - timer-bar__fill: the shrinking progress fill
 * - timer-bar--frozen: applied when freeze power-up is active
 *
 * Color transitions from sage (plenty of time) to rust (running out).
 * Provides aria-live announcements at 5s and 3s remaining.
 */
export class TimerView {
    /** @type {HTMLElement|null} */
    #container;

    /** @type {HTMLElement|null} */
    #fillEl;

    /** @type {HTMLElement|null} */
    #announcer;

    /** @type {number} Total duration in milliseconds */
    #totalMs = 0;

    /** @type {number} Remaining time in milliseconds */
    #remainingMs = 0;

    /** @type {number} Timestamp (Date.now()) when the timer last resumed */
    #startTimestamp = 0;

    /** @type {number} Remaining ms captured at the moment of last resume/start */
    #remainingAtStart = 0;

    /** @type {number|null} requestAnimationFrame ID */
    #rafId = null;

    /** @type {boolean} Whether the timer is frozen */
    #frozen = false;

    /** @type {boolean} Whether the timer is running */
    #running = false;

    /** @type {function|null} Callback when timer reaches 0 */
    #onExpired = null;

    /** @type {boolean} Whether the 5s announcement has been made */
    #announced5s = false;

    /** @type {boolean} Whether the 3s announcement has been made */
    #announced3s = false;

    /**
     * @param {Object} options
     * @param {HTMLElement} options.container - Parent element to render into
     * @param {function} [options.onExpired] - Callback invoked when timer reaches 0
     */
    constructor({ container, onExpired = null }) {
        this.#container = container;
        this.#onExpired = onExpired;
        this.#render();
    }

    /**
     * Starts the countdown timer.
     * @param {number} totalSeconds - Total duration in seconds
     */
    start(totalSeconds) {
        this.#totalMs = totalSeconds * 1000;
        this.#remainingMs = this.#totalMs;
        this.#remainingAtStart = this.#totalMs;
        this.#startTimestamp = Date.now();
        this.#frozen = false;
        this.#running = true;
        this.#announced5s = false;
        this.#announced3s = false;

        if (this.#fillEl) {
            this.#fillEl.parentElement.classList.remove('timer-bar--frozen');
        }

        this.#cancelRaf();
        this.#tick();
    }

    /**
     * Adds extra time to the running timer (for timeExtra power-up).
     * @param {number} seconds - Seconds to add
     */
    addTime(seconds) {
        if (!this.#running) return;

        const addedMs = seconds * 1000;
        // Update remaining based on current elapsed
        this.#syncRemaining();
        this.#remainingMs += addedMs;
        this.#totalMs += addedMs;

        // Reset the reference point
        this.#remainingAtStart = this.#remainingMs;
        this.#startTimestamp = Date.now();

        // Re-enable announcements if time went back above thresholds
        if (this.#remainingMs > 5000) {
            this.#announced5s = false;
            this.#announced3s = false;
        } else if (this.#remainingMs > 3000) {
            this.#announced3s = false;
        }
    }

    /**
     * Freezes the timer (for freeze power-up). Timer stops counting down.
     */
    freeze() {
        if (!this.#running || this.#frozen) return;

        this.#frozen = true;
        this.#syncRemaining();
        this.#cancelRaf();

        if (this.#fillEl) {
            this.#fillEl.parentElement.classList.add('timer-bar--frozen');
        }
    }

    /**
     * Resumes the timer after a freeze.
     */
    resume() {
        if (!this.#running || !this.#frozen) return;

        this.#frozen = false;
        this.#remainingAtStart = this.#remainingMs;
        this.#startTimestamp = Date.now();

        if (this.#fillEl) {
            this.#fillEl.parentElement.classList.remove('timer-bar--frozen');
        }

        this.#tick();
    }

    /**
     * Stops the timer completely without triggering onExpired.
     */
    stop() {
        this.#running = false;
        this.#frozen = false;
        this.#cancelRaf();
    }

    /**
     * Returns the current remaining time in seconds.
     * @returns {number}
     */
    getRemaining() {
        if (this.#running && !this.#frozen) {
            this.#syncRemaining();
        }
        return this.#remainingMs / 1000;
    }

    /**
     * Returns the total time in seconds.
     * @returns {number}
     */
    getTotal() {
        return this.#totalMs / 1000;
    }

    /**
     * Returns whether the timer is currently frozen.
     * @returns {boolean}
     */
    isFrozen() {
        return this.#frozen;
    }

    /**
     * Sets the onExpired callback.
     * @param {function} callback
     */
    set onExpired(callback) {
        this.#onExpired = callback;
    }

    /**
     * Removes the rendered content and cancels animation.
     */
    destroy() {
        this.stop();
        if (this.#container) {
            this.#container.innerHTML = '';
        }
        this.#fillEl = null;
        this.#announcer = null;
    }

    /**
     * Creates the DOM structure for the timer bar.
     * @private
     */
    #render() {
        if (!this.#container) return;

        this.#container.innerHTML = '';

        const bar = document.createElement('div');
        bar.className = 'timer-bar';
        bar.setAttribute('role', 'timer');
        bar.setAttribute('aria-label', 'Tiempo restante');

        const fill = document.createElement('div');
        fill.className = 'timer-bar__fill';
        fill.style.width = '100%';
        bar.appendChild(fill);

        // Hidden announcer for screen readers
        const announcer = document.createElement('span');
        announcer.className = 'sr-only';
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        bar.appendChild(announcer);

        this.#container.appendChild(bar);
        this.#fillEl = fill;
        this.#announcer = announcer;
    }

    /**
     * Synchronizes #remainingMs based on elapsed time since last reference point.
     * @private
     */
    #syncRemaining() {
        const elapsed = Date.now() - this.#startTimestamp;
        this.#remainingMs = Math.max(0, this.#remainingAtStart - elapsed);
    }

    /**
     * Animation loop using requestAnimationFrame.
     * Updates the progress bar width and color on each frame.
     * @private
     */
    #tick() {
        if (!this.#running || this.#frozen) return;

        this.#syncRemaining();

        const progress = this.#totalMs > 0 ? this.#remainingMs / this.#totalMs : 0;
        this.#updateFill(progress);
        this.#checkAnnouncements();

        if (this.#remainingMs <= 0) {
            this.#running = false;
            this.#updateFill(0);
            if (this.#onExpired) {
                this.#onExpired();
            }
            return;
        }

        this.#rafId = requestAnimationFrame(() => this.#tick());
    }

    /**
     * Updates the fill bar width and color based on progress (1.0 = full, 0.0 = empty).
     * @param {number} progress - Value between 0 and 1
     * @private
     */
    #updateFill(progress) {
        if (!this.#fillEl) return;

        const pct = Math.max(0, Math.min(1, progress)) * 100;
        this.#fillEl.style.width = `${pct}%`;

        // Interpolate color from sage (progress=1) to rust (progress=0)
        const color = this.#interpolateColor(progress);
        this.#fillEl.style.backgroundColor = color;
    }

    /**
     * Interpolates between sage (#6b9a70) and rust (#a04b38) based on progress.
     * @param {number} progress - 1.0 = sage, 0.0 = rust
     * @returns {string} CSS color string
     * @private
     */
    #interpolateColor(progress) {
        // Sage: rgb(107, 154, 112)
        const sageR = 107, sageG = 154, sageB = 112;
        // Rust: rgb(160, 75, 56)
        const rustR = 160, rustG = 75, rustB = 56;

        const r = Math.round(rustR + (sageR - rustR) * progress);
        const g = Math.round(rustG + (sageG - rustG) * progress);
        const b = Math.round(rustB + (sageB - rustB) * progress);

        return `rgb(${r}, ${g}, ${b})`;
    }

    /**
     * Checks if aria-live announcements should be made at 5s and 3s thresholds.
     * @private
     */
    #checkAnnouncements() {
        const remainingSec = this.#remainingMs / 1000;

        if (!this.#announced5s && remainingSec <= 5 && remainingSec > 3) {
            this.#announced5s = true;
            this.#announce('5 segundos restantes');
        } else if (!this.#announced3s && remainingSec <= 3 && remainingSec > 0) {
            this.#announced3s = true;
            this.#announce('3 segundos restantes');
        }
    }

    /**
     * Sets the aria-live announcer text for screen readers.
     * @param {string} message
     * @private
     */
    #announce(message) {
        if (this.#announcer) {
            this.#announcer.textContent = message;
        }
    }

    /**
     * Cancels any pending requestAnimationFrame.
     * @private
     */
    #cancelRaf() {
        if (this.#rafId !== null) {
            cancelAnimationFrame(this.#rafId);
            this.#rafId = null;
        }
    }
}
