import { GAME_MODES } from '../models/ModeDefinition.js';

/**
 * View class for the Mode Selector screen.
 * Renders 8 mode cards in a CSS Grid layout with keyboard navigation
 * and ARIA listbox/option roles for accessibility.
 */
export class ModeSelectorView {
    /**
     * @param {Object} options
     * @param {HTMLElement} [options.container] - DOM container (defaults to #modeSelectorScreen)
     * @param {function(string): void} options.onSelect - Callback invoked with the selected mode id
     */
    constructor({ container, onSelect, onBack }) {
        /** @type {HTMLElement} */
        this.container = container || document.getElementById('modeSelectorScreen');
        /** @type {function(string): void} */
        this.onSelect = onSelect;
        /** @type {function(): void} */
        this.onBack = onBack;
        /** @type {number} Index of the currently focused card */
        this.focusedIndex = 0;
        /** @type {HTMLElement[]} Rendered card elements */
        this.cards = [];

        this.render();
    }

    /**
     * Renders the mode selector grid inside the container.
     */
    render() {
        if (!this.container) return;

        this.container.innerHTML = '';

        if (this.onBack) {
            const backBtn = document.createElement('button');
            backBtn.className = 'mode-selector__back-btn';
            backBtn.setAttribute('aria-label', 'Volver');
            backBtn.type = 'button';
            backBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg> Volver';
            backBtn.addEventListener('click', () => this.onBack());
            this.container.appendChild(backBtn);
        }

        const heading = document.createElement('h2');
        heading.className = 'mode-selector__heading';
        heading.textContent = 'Elige un Modo de Juego';
        this.container.appendChild(heading);

        const grid = document.createElement('div');
        grid.className = 'mode-selector';
        grid.setAttribute('role', 'listbox');
        grid.setAttribute('aria-label', 'Modos de juego disponibles');
        grid.setAttribute('tabindex', '0');

        const modes = Object.values(GAME_MODES);
        this.cards = modes.map((mode, index) => this._createCard(mode, index));
        this.cards.forEach(card => grid.appendChild(card));

        this.container.appendChild(grid);

        /** @type {HTMLElement} */
        this.grid = grid;

        this._setupKeyboardNavigation(grid);
        this._setFocusedCard(0);
    }

    /**
     * Creates a single mode card element.
     * @param {Object} mode - Mode definition from GAME_MODES
     * @param {number} index - Card index in the grid
     * @returns {HTMLElement}
     * @private
     */
    _createCard(mode, index) {
        const card = document.createElement('button');
        card.className = 'mode-card';
        card.setAttribute('role', 'option');
        card.setAttribute('aria-selected', 'false');
        card.setAttribute('aria-label', `${mode.name} — ${mode.category === 'team' ? 'Equipos' : 'Individual'}`);
        card.setAttribute('data-mode-id', mode.id);
        card.setAttribute('tabindex', '-1');
        card.type = 'button';

        const icon = document.createElement('span');
        icon.className = 'mode-card__icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = mode.icon;

        const name = document.createElement('span');
        name.className = 'mode-card__name';
        name.textContent = mode.name;

        const description = document.createElement('span');
        description.className = 'mode-card__description';
        description.textContent = mode.description;

        const badge = document.createElement('span');
        badge.className = mode.category === 'team'
            ? 'mode-card__badge mode-card__badge--team'
            : 'mode-card__badge mode-card__badge--individual';
        badge.textContent = mode.category === 'team' ? 'Equipos' : 'Individual';

        card.appendChild(icon);
        card.appendChild(name);
        card.appendChild(description);
        card.appendChild(badge);

        card.addEventListener('click', () => {
            this._selectMode(mode.id, index);
        });

        return card;
    }

    /**
     * Sets up keyboard navigation on the grid container.
     * Arrow keys move focus between cards, Enter selects.
     * @param {HTMLElement} grid
     * @private
     */
    _setupKeyboardNavigation(grid) {
        grid.addEventListener('keydown', (event) => {
            const totalCards = this.cards.length;
            const columns = this._getColumnCount();
            let newIndex = this.focusedIndex;

            switch (event.key) {
                case 'ArrowRight':
                    newIndex = Math.min(this.focusedIndex + 1, totalCards - 1);
                    event.preventDefault();
                    break;
                case 'ArrowLeft':
                    newIndex = Math.max(this.focusedIndex - 1, 0);
                    event.preventDefault();
                    break;
                case 'ArrowDown':
                    newIndex = Math.min(this.focusedIndex + columns, totalCards - 1);
                    event.preventDefault();
                    break;
                case 'ArrowUp':
                    newIndex = Math.max(this.focusedIndex - columns, 0);
                    event.preventDefault();
                    break;
                case 'Enter':
                case ' ':
                    event.preventDefault();
                    this._selectMode(this.cards[this.focusedIndex].dataset.modeId, this.focusedIndex);
                    return;
                case 'Home':
                    newIndex = 0;
                    event.preventDefault();
                    break;
                case 'End':
                    newIndex = totalCards - 1;
                    event.preventDefault();
                    break;
                default:
                    return;
            }

            if (newIndex !== this.focusedIndex) {
                this._setFocusedCard(newIndex);
            }
        });
    }

    /**
     * Updates the focused card visually and programmatically.
     * @param {number} index
     * @private
     */
    _setFocusedCard(index) {
        // Remove focus from previous card
        if (this.cards[this.focusedIndex]) {
            this.cards[this.focusedIndex].setAttribute('aria-selected', 'false');
            this.cards[this.focusedIndex].setAttribute('tabindex', '-1');
        }

        this.focusedIndex = index;

        // Set focus on new card
        const card = this.cards[index];
        if (card) {
            card.setAttribute('aria-selected', 'true');
            card.setAttribute('tabindex', '0');
            card.focus();
        }
    }

    /**
     * Handles mode selection via click or keyboard.
     * @param {string} modeId
     * @param {number} index
     * @private
     */
    _selectMode(modeId, index) {
        this._setFocusedCard(index);
        if (this.onSelect) {
            this.onSelect(modeId);
        }
    }

    /**
     * Determines the current number of grid columns based on viewport width.
     * Matches the CSS breakpoint: 2 columns on desktop, 1 on mobile.
     * @returns {number}
     * @private
     */
    _getColumnCount() {
        return window.innerWidth > 767 ? 2 : 3;
    }

    /**
     * Cleans up event listeners and DOM content.
     */
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.cards = [];
    }
}
