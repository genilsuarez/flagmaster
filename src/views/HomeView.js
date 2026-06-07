import { GAME_MODES } from '../models/ModeDefinition.js';
import { ModeCardView } from './ModeCardView.js';
import { EngagementSectionView } from './EngagementSectionView.js';

/**
 * Renders the complete Home screen: header, engagement section, and mode category sections.
 * Groups modes by category ('team' first, 'individual' second) and renders section headings.
 * Follows Editorial Luxe design system with DM Serif Display headings and Inter body text.
 */
export class HomeView {
    /**
     * @param {Object} options
     * @param {HTMLElement} options.container - DOM element to render into
     * @param {import('../services/StatsService.js').StatsService} options.statsService
     * @param {import('../services/CountryService.js').CountryService} options.countryService
     * @param {function(string): void} options.onModeSelect - Callback invoked with the selected mode id
     */
    constructor({ container, statsService, countryService, onModeSelect }) {
        this.container = container;
        this.statsService = statsService;
        this.countryService = countryService;
        this.onModeSelect = onModeSelect;

        /** @type {EngagementSectionView|null} */
        this.engagementView = null;

        /** @type {ModeCardView[]} */
        this.modeCardViews = [];

        /** @type {HTMLElement|null} */
        this.element = null;

        /** @type {HTMLElement|null} */
        this.streakBadgeEl = null;
    }

    /**
     * Builds the full home screen DOM and appends it to the container.
     * Structure: header → engagement section → team modes section → individual modes section.
     */
    render() {
        const wrapper = document.createElement('div');
        wrapper.className = 'home-view';
        wrapper.setAttribute('role', 'main');

        // Header
        const header = this._renderHeader();
        wrapper.appendChild(header);

        // Engagement section
        this.engagementView = new EngagementSectionView({
            statsService: this.statsService,
            countryService: this.countryService,
            onQuickPlay: (modeId) => {
                if (this.onModeSelect) {
                    this.onModeSelect(modeId);
                }
            },
        });
        wrapper.appendChild(this.engagementView.render());

        // Group modes by category
        const modes = Object.values(GAME_MODES);
        const teamModes = modes.filter((m) => m.category === 'team');
        const individualModes = modes.filter((m) => m.category === 'individual');

        // Team modes section
        const teamSection = this._renderModeSection('Modos en Equipo', 'team', teamModes);
        wrapper.appendChild(teamSection);

        // Individual modes section
        const individualSection = this._renderModeSection('Modos Individuales', 'individual', individualModes);
        wrapper.appendChild(individualSection);

        this.element = wrapper;
        this.container.appendChild(wrapper);
    }

    /**
     * Refreshes engagement data without full re-render.
     * Also updates the header streak badge.
     */
    update() {
        if (this.engagementView) {
            this.engagementView.update();
        }
        this._updateStreakBadge();
    }

    /**
     * Cleans up DOM and references.
     */
    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.engagementView = null;
        this.modeCardViews = [];
        this.element = null;
    }

    /**
     * Renders the home screen header with logo, streak badge, and menu button.
     * @returns {HTMLElement}
     * @private
     */
    _renderHeader() {
        const header = document.createElement('header');
        header.className = 'home-view__header';

        // Logo
        const logo = document.createElement('span');
        logo.className = 'home-view__logo';
        logo.textContent = '🌍 FlagMaster';
        logo.setAttribute('aria-label', 'FlagMaster');

        // Streak badge
        const streakBadge = document.createElement('span');
        streakBadge.className = 'home-view__streak-badge';
        streakBadge.setAttribute('aria-label', 'Racha de días');
        const streak = this._getCurrentStreak();
        streakBadge.textContent = `🔥 ${streak}`;
        this.streakBadgeEl = streakBadge;

        // Menu button
        const menuBtn = document.createElement('button');
        menuBtn.className = 'home-view__menu-btn';
        menuBtn.id = 'homeMenuBtn';
        menuBtn.type = 'button';
        menuBtn.setAttribute('aria-label', 'Abrir menú');
        menuBtn.setAttribute('data-action', 'menu');
        menuBtn.textContent = '☰';

        header.appendChild(menuBtn);
        header.appendChild(logo);
        header.appendChild(streakBadge);

        return header;
    }

    /**
     * Renders a category section with heading and mode cards grid.
     * @param {string} title - Section heading text
     * @param {string} category - 'team' or 'individual'
     * @param {Object[]} modes - Array of mode definitions
     * @returns {HTMLElement}
     * @private
     */
    _renderModeSection(title, category, modes) {
        const section = document.createElement('section');
        section.className = `home-view__section home-view__section--${category}`;
        section.setAttribute('role', 'region');
        section.setAttribute('aria-label', title);

        // Section heading with DM Serif Display
        const heading = document.createElement('h2');
        heading.className = 'home-view__section-heading';
        heading.textContent = title;
        section.appendChild(heading);

        // Mode cards grid
        const grid = document.createElement('div');
        grid.className = 'home-view__modes-grid';

        for (const mode of modes) {
            const cardView = new ModeCardView({
                mode,
                onSelect: (modeId) => {
                    if (this.onModeSelect) {
                        this.onModeSelect(modeId);
                    }
                },
            });
            const cardEl = cardView.render();
            grid.appendChild(cardEl);
            this.modeCardViews.push(cardView);
        }

        section.appendChild(grid);
        return section;
    }

    /**
     * Gets the current streak from stats service safely.
     * @returns {number}
     * @private
     */
    _getCurrentStreak() {
        try {
            const stats = this.statsService.getStats();
            const streak = stats && stats.currentStreak;
            return typeof streak === 'number' && streak >= 0 ? streak : 0;
        } catch {
            return 0;
        }
    }

    /**
     * Updates the header streak badge with the current streak value.
     * @private
     */
    _updateStreakBadge() {
        if (this.streakBadgeEl) {
            const streak = this._getCurrentStreak();
            this.streakBadgeEl.textContent = `🔥 ${streak}`;
        }
    }
}
