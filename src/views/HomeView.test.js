import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HomeView } from './HomeView.js';

describe('HomeView', () => {
    let container;
    let statsService;
    let countryService;
    let onModeSelect;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);

        statsService = {
            getStats: vi.fn().mockReturnValue({
                currentStreak: 5,
                gamesPlayed: 10,
                uniqueCountriesCorrect: ['AR', 'BR', 'CL'],
                modeStats: {
                    banderaFlash: { gamesPlayed: 3 },
                },
            }),
        };

        countryService = {
            countries: new Array(195),
        };

        onModeSelect = vi.fn();
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('renders into the provided container', () => {
        const view = new HomeView({ container, statsService, countryService, onModeSelect });
        view.render();
        expect(container.querySelector('.home-view')).not.toBeNull();
    });

    it('sets role="main" on the content wrapper', () => {
        const view = new HomeView({ container, statsService, countryService, onModeSelect });
        view.render();
        const wrapper = container.querySelector('.home-view');
        expect(wrapper.getAttribute('role')).toBe('main');
    });

    it('renders a header with logo, streak badge, and menu button', () => {
        const view = new HomeView({ container, statsService, countryService, onModeSelect });
        view.render();
        const header = container.querySelector('.home-view__header');
        expect(header).not.toBeNull();
        expect(header.querySelector('.home-view__logo')).not.toBeNull();
        expect(header.querySelector('.home-view__streak-badge')).not.toBeNull();
        expect(header.querySelector('.home-view__menu-btn')).not.toBeNull();
    });

    it('displays current streak in the header badge', () => {
        const view = new HomeView({ container, statsService, countryService, onModeSelect });
        view.render();
        const badge = container.querySelector('.home-view__streak-badge');
        expect(badge.textContent).toContain('5');
    });

    it('renders engagement section', () => {
        const view = new HomeView({ container, statsService, countryService, onModeSelect });
        view.render();
        expect(container.querySelector('.engagement-section')).not.toBeNull();
    });

    it('renders team modes section with heading "Modos en Equipo"', () => {
        const view = new HomeView({ container, statsService, countryService, onModeSelect });
        view.render();
        const teamSection = container.querySelector('.home-view__section--team');
        expect(teamSection).not.toBeNull();
        const heading = teamSection.querySelector('h2');
        expect(heading.textContent).toBe('Modos en Equipo');
    });

    it('renders individual modes section with heading "Modos Individuales"', () => {
        const view = new HomeView({ container, statsService, countryService, onModeSelect });
        view.render();
        const indSection = container.querySelector('.home-view__section--individual');
        expect(indSection).not.toBeNull();
        const heading = indSection.querySelector('h2');
        expect(heading.textContent).toBe('Modos Individuales');
    });

    it('team section appears before individual section in DOM order', () => {
        const view = new HomeView({ container, statsService, countryService, onModeSelect });
        view.render();
        const sections = container.querySelectorAll('.home-view__section');
        expect(sections[0].classList.contains('home-view__section--team')).toBe(true);
        expect(sections[1].classList.contains('home-view__section--individual')).toBe(true);
    });

    it('sets role="region" and aria-label on each category section', () => {
        const view = new HomeView({ container, statsService, countryService, onModeSelect });
        view.render();
        const teamSection = container.querySelector('.home-view__section--team');
        expect(teamSection.getAttribute('role')).toBe('region');
        expect(teamSection.getAttribute('aria-label')).toBe('Modos en Equipo');

        const indSection = container.querySelector('.home-view__section--individual');
        expect(indSection.getAttribute('role')).toBe('region');
        expect(indSection.getAttribute('aria-label')).toBe('Modos Individuales');
    });

    it('renders 2 mode cards in team section', () => {
        const view = new HomeView({ container, statsService, countryService, onModeSelect });
        view.render();
        const teamGrid = container.querySelector('.home-view__section--team .home-view__modes-grid');
        const cards = teamGrid.querySelectorAll('.mode-card');
        expect(cards.length).toBe(2);
    });

    it('renders 6 mode cards in individual section', () => {
        const view = new HomeView({ container, statsService, countryService, onModeSelect });
        view.render();
        const indGrid = container.querySelector('.home-view__section--individual .home-view__modes-grid');
        const cards = indGrid.querySelectorAll('.mode-card');
        expect(cards.length).toBe(6);
    });

    it('calls onModeSelect when a mode card is clicked', () => {
        const view = new HomeView({ container, statsService, countryService, onModeSelect });
        view.render();
        const firstCard = container.querySelector('.mode-card');
        firstCard.click();
        expect(onModeSelect).toHaveBeenCalledWith('banderaFlash');
    });

    it('update() refreshes engagement data without re-rendering the full view', () => {
        const view = new HomeView({ container, statsService, countryService, onModeSelect });
        view.render();

        // Change stats
        statsService.getStats.mockReturnValue({
            currentStreak: 10,
            gamesPlayed: 20,
            uniqueCountriesCorrect: ['AR', 'BR', 'CL', 'MX', 'PE'],
            modeStats: { banderaFlash: { gamesPlayed: 5 } },
        });

        view.update();

        // Engagement section should still exist (not re-rendered from scratch)
        expect(container.querySelector('.engagement-section')).not.toBeNull();
        // Mode cards should still be there
        expect(container.querySelectorAll('.mode-card').length).toBe(8);
    });

    it('destroy() removes the element from the DOM', () => {
        const view = new HomeView({ container, statsService, countryService, onModeSelect });
        view.render();
        expect(container.querySelector('.home-view')).not.toBeNull();
        view.destroy();
        expect(container.querySelector('.home-view')).toBeNull();
    });

    it('destroy() cleans up internal references', () => {
        const view = new HomeView({ container, statsService, countryService, onModeSelect });
        view.render();
        view.destroy();
        expect(view.element).toBeNull();
        expect(view.engagementView).toBeNull();
        expect(view.modeCardViews).toEqual([]);
    });

    it('handles statsService errors gracefully for streak', () => {
        statsService.getStats.mockImplementation(() => { throw new Error('fail'); });
        const view = new HomeView({ container, statsService, countryService, onModeSelect });
        view.render();
        const badge = container.querySelector('.home-view__streak-badge');
        expect(badge.textContent).toContain('0');
    });

    it('renders section headings as h2 elements', () => {
        const view = new HomeView({ container, statsService, countryService, onModeSelect });
        view.render();
        const headings = container.querySelectorAll('.home-view__section-heading');
        expect(headings.length).toBe(2);
        headings.forEach((h) => expect(h.tagName).toBe('H2'));
    });

    it('section headings have the correct CSS class for DM Serif Display styling', () => {
        const view = new HomeView({ container, statsService, countryService, onModeSelect });
        view.render();
        const headings = container.querySelectorAll('.home-view__section-heading');
        headings.forEach((h) => expect(h.classList.contains('home-view__section-heading')).toBe(true));
    });
});
