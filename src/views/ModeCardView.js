/**
 * Renders a single mode card with icon, name, description, and category badge.
 * Handles keyboard and pointer interactions.
 * Follows Editorial Luxe design system with DM Serif Display headings and Inter body text.
 */
export class ModeCardView {
    /**
     * @param {Object} options
     * @param {Object} options.mode - Mode definition from GAME_MODES (id, name, icon, category, description)
     * @param {function(string): void} options.onSelect - Callback invoked with the selected mode id
     */
    constructor({ mode, onSelect }) {
        this.mode = mode;
        this.onSelect = onSelect;
        this.element = null;
    }

    /**
     * Renders the mode card and returns the root HTMLElement.
     * @returns {HTMLElement}
     */
    render() {
        const { id, name, icon, category, description } = this.mode;
        const categoryLabel = category === 'team' ? 'Equipos' : 'Individual';

        const article = document.createElement('article');
        article.className = 'mode-card';
        article.setAttribute('role', 'button');
        article.setAttribute('tabindex', '0');
        article.setAttribute('aria-label', `${name} — ${categoryLabel}: ${description}`);
        article.setAttribute('data-mode-id', id);

        // Icon
        const iconEl = document.createElement('span');
        iconEl.className = 'mode-card__icon';
        iconEl.setAttribute('aria-hidden', 'true');
        iconEl.textContent = icon;

        // Name
        const nameEl = document.createElement('h3');
        nameEl.className = 'mode-card__name';
        nameEl.textContent = name;

        // Description
        const descEl = document.createElement('p');
        descEl.className = 'mode-card__description';
        descEl.textContent = description;

        // Category badge
        const badge = document.createElement('span');
        badge.className = `mode-card__badge mode-card__badge--${category}`;
        badge.textContent = categoryLabel;

        article.appendChild(iconEl);
        article.appendChild(nameEl);
        article.appendChild(descEl);
        article.appendChild(badge);

        // Event handlers
        article.addEventListener('click', () => this._handleSelect());
        article.addEventListener('keydown', (e) => this._handleKeydown(e));

        this.element = article;
        return article;
    }

    /**
     * Handles keyboard activation (Enter/Space).
     * @param {KeyboardEvent} event
     * @private
     */
    _handleKeydown(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this._handleSelect();
        }
    }

    /**
     * Invokes the onSelect callback with the mode id.
     * @private
     */
    _handleSelect() {
        if (this.onSelect) {
            this.onSelect(this.mode.id);
        }
    }
}
