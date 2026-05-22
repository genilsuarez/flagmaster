import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EngagementSectionView } from './EngagementSectionView.js';

/**
 * Creates a mock StatsService with configurable stats.
 */
function createMockStatsService(overrides = {}) {
    const defaultStats = {
        gamesPlayed: 0,
        totalCorrect: 0,
        totalWrong: 0,
        bestTimeSeconds: null,
        currentStreak: 0,
        longestStreak: 0,
        lastPlayedDate: null,
        uniqueCountriesCorrect: [],
        achievements: {},
        modeStats: {},
        ...overrides,
    };
    return {
        getStats: () => ({ ...defaultStats }),
    };
}

/**
 * Creates a mock CountryService with a given number of countries.
 */
function createMockCountryService(count = 195) {
    return {
        countries: Array.from({ length: count }, (_, i) => ({ code: `C${i}` })),
    };
}

describe('EngagementSectionView', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('render()', () => {
        it('returns a section element with class engagement-section', () => {
            const view = new EngagementSectionView({
                statsService: createMockStatsService(),
                countryService: createMockCountryService(),
            });
            const el = view.render();
            expect(el.tagName).toBe('SECTION');
            expect(el.classList.contains('engagement-section')).toBe(true);
        });

        it('has aria-label for accessibility', () => {
            const view = new EngagementSectionView({
                statsService: createMockStatsService(),
                countryService: createMockCountryService(),
            });
            const el = view.render();
            expect(el.getAttribute('aria-label')).toBe('Estadísticas del jugador');
        });
    });

    describe('streak badge', () => {
        it('displays streak with 🔥 icon when user has sessions', () => {
            const view = new EngagementSectionView({
                statsService: createMockStatsService({ gamesPlayed: 5, currentStreak: 3 }),
                countryService: createMockCountryService(),
            });
            const el = view.render();
            const streakEl = el.querySelector('.engagement-section__streak');
            expect(streakEl.hidden).toBe(false);
            expect(streakEl.querySelector('.engagement-section__streak-icon').textContent).toBe('🔥');
            expect(streakEl.querySelector('.engagement-section__streak-count').textContent).toBe('3');
        });

        it('hides streak when no sessions exist', () => {
            const view = new EngagementSectionView({
                statsService: createMockStatsService({ gamesPlayed: 0 }),
                countryService: createMockCountryService(),
            });
            const el = view.render();
            const streakEl = el.querySelector('.engagement-section__streak');
            expect(streakEl.hidden).toBe(true);
        });

        it('shows streak of 0 when user has sessions but no active streak', () => {
            const view = new EngagementSectionView({
                statsService: createMockStatsService({ gamesPlayed: 2, currentStreak: 0 }),
                countryService: createMockCountryService(),
            });
            const el = view.render();
            const streakEl = el.querySelector('.engagement-section__streak');
            expect(streakEl.hidden).toBe(false);
            expect(streakEl.querySelector('.engagement-section__streak-count').textContent).toBe('0');
        });

        it('has aria-label with streak days', () => {
            const view = new EngagementSectionView({
                statsService: createMockStatsService({ gamesPlayed: 1, currentStreak: 7 }),
                countryService: createMockCountryService(),
            });
            const el = view.render();
            const streakEl = el.querySelector('.engagement-section__streak');
            expect(streakEl.getAttribute('aria-label')).toBe('Racha: 7 días');
        });
    });

    describe('global progress', () => {
        it('displays "{uniqueCorrect} de {total} banderas acertadas"', () => {
            const view = new EngagementSectionView({
                statsService: createMockStatsService({
                    gamesPlayed: 3,
                    uniqueCountriesCorrect: ['AR', 'BR', 'CL'],
                }),
                countryService: createMockCountryService(195),
            });
            const el = view.render();
            const progressEl = el.querySelector('.engagement-section__progress-text');
            expect(progressEl.textContent).toBe('3 de 195 banderas acertadas');
        });

        it('shows "0 de {total}" when no sessions exist', () => {
            const view = new EngagementSectionView({
                statsService: createMockStatsService({ gamesPlayed: 0 }),
                countryService: createMockCountryService(200),
            });
            const el = view.render();
            const progressEl = el.querySelector('.engagement-section__progress-text');
            expect(progressEl.textContent).toBe('0 de 200 banderas acertadas');
        });

        it('has aria-label with progress info', () => {
            const view = new EngagementSectionView({
                statsService: createMockStatsService({
                    uniqueCountriesCorrect: ['AR'],
                }),
                countryService: createMockCountryService(50),
            });
            const el = view.render();
            const progressWrapper = el.querySelector('.engagement-section__progress');
            expect(progressWrapper.getAttribute('aria-label')).toBe('Progreso: 1 de 50 banderas acertadas');
        });
    });

    describe('last played quick-replay button', () => {
        it('shows quick-play button when user has previous sessions with a valid mode', () => {
            const view = new EngagementSectionView({
                statsService: createMockStatsService({
                    gamesPlayed: 5,
                    modeStats: { flagRush: { gamesPlayed: 3, totalScore: 100, bestScore: 50, totalCorrect: 20 } },
                }),
                countryService: createMockCountryService(),
            });
            const el = view.render();
            const lastPlayedEl = el.querySelector('.engagement-section__last-played');
            expect(lastPlayedEl.hidden).toBe(false);
            const button = lastPlayedEl.querySelector('.engagement-section__quick-play');
            expect(button).not.toBeNull();
            expect(button.textContent).toBe('▶ Flag Rush');
        });

        it('hides last-played when no sessions exist', () => {
            const view = new EngagementSectionView({
                statsService: createMockStatsService({ gamesPlayed: 0 }),
                countryService: createMockCountryService(),
            });
            const el = view.render();
            const lastPlayedEl = el.querySelector('.engagement-section__last-played');
            expect(lastPlayedEl.hidden).toBe(true);
        });

        it('hides last-played when modeStats is empty', () => {
            const view = new EngagementSectionView({
                statsService: createMockStatsService({ gamesPlayed: 2, modeStats: {} }),
                countryService: createMockCountryService(),
            });
            const el = view.render();
            const lastPlayedEl = el.querySelector('.engagement-section__last-played');
            expect(lastPlayedEl.hidden).toBe(true);
        });

        it('calls onQuickPlay with modeId when button is clicked', () => {
            const onQuickPlay = vi.fn();
            const view = new EngagementSectionView({
                statsService: createMockStatsService({
                    gamesPlayed: 1,
                    modeStats: { streakBlitz: { gamesPlayed: 1, totalScore: 50, bestScore: 50, totalCorrect: 5 } },
                }),
                countryService: createMockCountryService(),
                onQuickPlay,
            });
            const el = view.render();
            const button = el.querySelector('.engagement-section__quick-play');
            button.click();
            expect(onQuickPlay).toHaveBeenCalledWith('streakBlitz');
        });

        it('has aria-label on the quick-play button', () => {
            const view = new EngagementSectionView({
                statsService: createMockStatsService({
                    gamesPlayed: 1,
                    modeStats: { capitalClash: { gamesPlayed: 2, totalScore: 80, bestScore: 40, totalCorrect: 10 } },
                }),
                countryService: createMockCountryService(),
            });
            const el = view.render();
            const button = el.querySelector('.engagement-section__quick-play');
            expect(button.getAttribute('aria-label')).toBe('Jugar de nuevo: Capital Clash');
        });

        it('picks the mode with most games played as last played', () => {
            const view = new EngagementSectionView({
                statsService: createMockStatsService({
                    gamesPlayed: 10,
                    modeStats: {
                        flagRush: { gamesPlayed: 2, totalScore: 50, bestScore: 30, totalCorrect: 10 },
                        geoPuzzle: { gamesPlayed: 5, totalScore: 200, bestScore: 80, totalCorrect: 30 },
                        streakBlitz: { gamesPlayed: 3, totalScore: 100, bestScore: 50, totalCorrect: 15 },
                    },
                }),
                countryService: createMockCountryService(),
            });
            const el = view.render();
            const button = el.querySelector('.engagement-section__quick-play');
            expect(button.textContent).toBe('▶ Geo Puzzle');
        });
    });

    describe('empty/invalid state handling', () => {
        it('handles null uniqueCountriesCorrect gracefully', () => {
            const view = new EngagementSectionView({
                statsService: createMockStatsService({ uniqueCountriesCorrect: null }),
                countryService: createMockCountryService(100),
            });
            const el = view.render();
            const progressEl = el.querySelector('.engagement-section__progress-text');
            expect(progressEl.textContent).toBe('0 de 100 banderas acertadas');
        });

        it('handles statsService throwing an error gracefully', () => {
            const view = new EngagementSectionView({
                statsService: { getStats: () => { throw new Error('corrupted'); } },
                countryService: createMockCountryService(50),
            });
            const el = view.render();
            const progressEl = el.querySelector('.engagement-section__progress-text');
            expect(progressEl.textContent).toBe('0 de 50 banderas acertadas');
        });

        it('handles countryService with empty countries array', () => {
            const view = new EngagementSectionView({
                statsService: createMockStatsService(),
                countryService: { countries: [] },
            });
            const el = view.render();
            const progressEl = el.querySelector('.engagement-section__progress-text');
            expect(progressEl.textContent).toBe('0 de 0 banderas acertadas');
        });

        it('handles invalid modeStats entries gracefully', () => {
            const view = new EngagementSectionView({
                statsService: createMockStatsService({
                    gamesPlayed: 1,
                    modeStats: { invalidMode: { gamesPlayed: 5 } },
                }),
                countryService: createMockCountryService(),
            });
            const el = view.render();
            // invalidMode is not in GAME_MODES, so last-played should be hidden
            const lastPlayedEl = el.querySelector('.engagement-section__last-played');
            expect(lastPlayedEl.hidden).toBe(true);
        });

        it('handles negative currentStreak gracefully', () => {
            const view = new EngagementSectionView({
                statsService: createMockStatsService({ gamesPlayed: 1, currentStreak: -5 }),
                countryService: createMockCountryService(),
            });
            const el = view.render();
            const streakEl = el.querySelector('.engagement-section__streak');
            expect(streakEl.querySelector('.engagement-section__streak-count').textContent).toBe('0');
        });
    });

    describe('update()', () => {
        it('refreshes stats without full re-render', () => {
            let gamesPlayed = 0;
            const statsService = {
                getStats: () => ({
                    gamesPlayed,
                    totalCorrect: 0,
                    totalWrong: 0,
                    currentStreak: gamesPlayed,
                    longestStreak: 0,
                    lastPlayedDate: null,
                    uniqueCountriesCorrect: [],
                    modeStats: {},
                }),
            };
            const view = new EngagementSectionView({
                statsService,
                countryService: createMockCountryService(100),
            });
            const el = view.render();

            // Initially no sessions
            const streakEl = el.querySelector('.engagement-section__streak');
            expect(streakEl.hidden).toBe(true);

            // Simulate a game played
            gamesPlayed = 1;
            view.update();

            expect(streakEl.hidden).toBe(false);
            expect(streakEl.querySelector('.engagement-section__streak-count').textContent).toBe('1');
        });

        it('updates progress text on update()', () => {
            let uniqueCountries = [];
            const statsService = {
                getStats: () => ({
                    gamesPlayed: 1,
                    currentStreak: 1,
                    uniqueCountriesCorrect: uniqueCountries,
                    modeStats: {},
                }),
            };
            const view = new EngagementSectionView({
                statsService,
                countryService: createMockCountryService(50),
            });
            const el = view.render();

            let progressEl = el.querySelector('.engagement-section__progress-text');
            expect(progressEl.textContent).toBe('0 de 50 banderas acertadas');

            uniqueCountries = ['AR', 'BR'];
            view.update();

            progressEl = el.querySelector('.engagement-section__progress-text');
            expect(progressEl.textContent).toBe('2 de 50 banderas acertadas');
        });
    });
});
