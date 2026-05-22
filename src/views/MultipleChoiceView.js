/**
 * Shared view for rendering multiple-choice questions.
 * Displays 4 option buttons in a 2×2 grid with selection feedback.
 *
 * CSS classes:
 * - mc-grid: container grid
 * - mc-option: individual option button
 * - mc-option--correct: sage highlight for correct answer
 * - mc-option--incorrect: rust highlight for incorrect answer
 * - mc-option--disabled: visually disabled option (50/50 power-up)
 */
export class MultipleChoiceView {
    /** @type {HTMLElement|null} */
    #container;

    /** @type {HTMLButtonElement[]} */
    #buttons = [];

    /** @type {boolean} */
    #disabled = false;

    /** @type {number} Feedback delay in ms before calling onSelect */
    static FEEDBACK_DELAY_MS = 300;

    /**
     * @param {Object} options
     * @param {HTMLElement} options.container - Parent element to render into
     */
    constructor({ container }) {
        this.#container = container;
    }

    /**
     * Renders 4 option buttons in a 2×2 grid layout.
     * Each button displays an option text (country name or capital).
     * On selection, shows correct/incorrect feedback with a 300ms delay
     * before invoking the onSelect callback.
     *
     * @param {Array<{text: string, correct: boolean}>} options - Array of 4 options
     * @param {function(number, boolean): void} onSelect - Callback with (selectedIndex, isCorrect)
     */
    render(options, onSelect) {
        this.#disabled = false;
        this.#buttons = [];

        if (!this.#container) return;
        this.#container.innerHTML = '';

        const grid = document.createElement('div');
        grid.className = 'mc-grid';
        grid.setAttribute('role', 'group');
        grid.setAttribute('aria-label', 'Opciones de respuesta');

        options.forEach((option, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'mc-option';
            button.textContent = option.text;
            button.setAttribute('aria-label', option.text);

            button.addEventListener('click', () => {
                if (this.#disabled) return;
                this.#handleSelection(index, options, onSelect);
            });

            this.#buttons.push(button);
            grid.appendChild(button);
        });

        this.#container.appendChild(grid);
    }

    /**
     * Handles a button selection: disables all buttons, shows feedback,
     * then calls onSelect after the feedback delay.
     *
     * @param {number} selectedIndex - Index of the selected option
     * @param {Array<{text: string, correct: boolean}>} options - The options array
     * @param {function(number, boolean): void} onSelect - Callback
     * @private
     */
    #handleSelection(selectedIndex, options, onSelect) {
        this.disable();

        const isCorrect = options[selectedIndex].correct;

        // Show feedback on the selected button
        if (isCorrect) {
            this.#buttons[selectedIndex].classList.add('mc-option--correct');
            this.#addFeedbackIcon(this.#buttons[selectedIndex], '✓');
        } else {
            this.#buttons[selectedIndex].classList.add('mc-option--incorrect');
            this.#addFeedbackIcon(this.#buttons[selectedIndex], '✗');
            // Also highlight the correct answer
            const correctIndex = options.findIndex(o => o.correct);
            if (correctIndex !== -1) {
                this.#buttons[correctIndex].classList.add('mc-option--correct');
                this.#addFeedbackIcon(this.#buttons[correctIndex], '✓');
            }
        }

        // Delay before calling onSelect so user sees the visual feedback
        setTimeout(() => {
            if (onSelect) {
                onSelect(selectedIndex, isCorrect);
            }
        }, MultipleChoiceView.FEEDBACK_DELAY_MS);
    }

    /**
     * Appends a feedback icon (✓ or ✗) to a button element.
     * @param {HTMLButtonElement} button
     * @param {string} icon
     * @private
     */
    #addFeedbackIcon(button, icon) {
        const span = document.createElement('span');
        span.className = 'mc-option__icon';
        span.textContent = ` ${icon}`;
        span.setAttribute('aria-hidden', 'true');
        button.appendChild(span);
    }

    /**
     * Disables specific options by index (used by 50/50 power-up).
     * Hides/disables the buttons at the given indices.
     *
     * @param {number[]} indices - Array of option indices to disable
     */
    disableOptions(indices) {
        indices.forEach(index => {
            const button = this.#buttons[index];
            if (button) {
                button.disabled = true;
                button.classList.add('mc-option--disabled');
            }
        });
    }

    /**
     * Disables all option buttons (prevents double-clicks after selection).
     */
    disable() {
        this.#disabled = true;
        this.#buttons.forEach(button => {
            button.disabled = true;
        });
    }

    /**
     * Removes the rendered content and resets internal state.
     */
    destroy() {
        if (this.#container) {
            this.#container.innerHTML = '';
        }
        this.#buttons = [];
        this.#disabled = false;
    }
}
