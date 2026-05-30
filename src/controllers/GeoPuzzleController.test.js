import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GeoPuzzleController } from './GeoPuzzleController.js';

/**
 * Helper to create mock country objects matching the Country model shape.
 */
function makeCountry(name, { continent = 'Europe', population = 67000000, area = 643801, capital = 'París', flagUrl = null } = {}) {
    return {
        englishName: name,
        spanishName: name,
        displayName: name,
        continent,
        population,
        area,
        capital,
        flagUrl: flagUrl || `https://flagcdn.com/${name.toLowerCase().replace(/\s/g, '-')}.svg`,
        isSovereign: true,
    };
}

/**
 * Creates a pool of countries for testing.
 */
function createTestPool() {
    return [
        makeCountry('Francia', { continent: 'Europa', population: 67000000, area: 643801, capital: 'París' }),
        makeCountry('Alemania', { continent: 'Europa', population: 83000000, area: 357022, capital: 'Berlín' }),
        makeCountry('España', { continent: 'Europa', population: 47000000, area: 505990, capital: 'Madrid' }),
        makeCountry('Italia', { continent: 'Europa', population: 60000000, area: 301340, capital: 'Roma' }),
        makeCountry('Portugal', { continent: 'Europa', population: 10000000, area: 92212, capital: 'Lisboa' }),
        makeCountry('Brasil', { continent: 'América', population: 213000000, area: 8515767, capital: 'Brasilia' }),
        makeCountry('Argentina', { continent: 'América', population: 45000000, area: 2780400, capital: 'Buenos Aires' }),
        makeCountry('Japón', { continent: 'Asia', population: 126000000, area: 377975, capital: 'Tokio' }),
        makeCountry('China', { continent: 'Asia', population: 1400000000, area: 9596961, capital: 'Pekín' }),
        makeCountry('India', { continent: 'Asia', population: 1380000000, area: 3287263, capital: 'Nueva Delhi' }),
    ];
}

describe('GeoPuzzleController', () => {
    let container;
    let controller;
    let pool;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        pool = createTestPool();
        vi.useFakeTimers();
    });

    afterEach(() => {
        if (controller) {
            controller.destroy();
            controller = null;
        }
        if (container && container.parentNode) {
            document.body.removeChild(container);
        }
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('constructor', () => {
        it('initializes with default state', () => {
            controller = new GeoPuzzleController({ container });
            expect(controller.isActive).toBe(false);
            expect(controller.totalScore).toBe(0);
            expect(controller.currentRound).toBe(0);
            expect(controller.hintsRevealed).toBe(0);
            expect(controller.phase).toBe('revealing');
        });

        it('accepts onRoundEnd and onGameEnd callbacks', () => {
            const onRoundEnd = vi.fn();
            const onGameEnd = vi.fn();
            controller = new GeoPuzzleController({ container, onRoundEnd, onGameEnd });
            expect(controller.onRoundEnd).toBe(onRoundEnd);
            expect(controller.onGameEnd).toBe(onGameEnd);
        });
    });

    describe('start', () => {
        it('sets isActive to true', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool);
            expect(controller.isActive).toBe(true);
        });

        it('uses default rounds (10) when not specified', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool);
            expect(controller.totalRounds).toBe(10);
        });

        it('uses configurable rounds from modeOptions', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });
            expect(controller.totalRounds).toBe(5);
        });

        it('resets score and round counters', () => {
            controller = new GeoPuzzleController({ container });
            controller.totalScore = 500;
            controller.currentRound = 5;
            controller.start(pool);
            expect(controller.totalScore).toBe(0);
            expect(controller.currentRound).toBe(1);
        });

        it('renders the game UI into the container', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool);
            expect(container.querySelector('.geo-puzzle-hints')).not.toBeNull();
            expect(container.querySelector('.geo-puzzle-guess-btn')).not.toBeNull();
            expect(container.querySelector('.geo-puzzle-skip-btn')).not.toBeNull();
        });

        it('reveals the first hint (population) immediately', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool);
            expect(controller.hintsRevealed).toBe(1);
            const hints = container.querySelectorAll('.geo-puzzle-hint');
            expect(hints.length).toBe(1);
            expect(hints[0].textContent).toContain('Población:');
        });

        it('does not mutate the original pool', () => {
            controller = new GeoPuzzleController({ container });
            const originalPool = [...pool];
            controller.start(pool);
            expect(pool).toEqual(originalPool);
        });

        it('starts in revealing phase with guess button visible', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool);
            expect(controller.phase).toBe('revealing');
            expect(container.querySelector('.geo-puzzle-guess-btn').hidden).toBe(false);
        });
    });

    describe('automatic hint reveal (timer-based)', () => {
        it('reveals hints automatically every HINT_INTERVAL_SECONDS', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            expect(controller.hintsRevealed).toBe(1); // first hint immediate

            // Advance timer to reveal hint 2
            vi.advanceTimersByTime(GeoPuzzleController.HINT_INTERVAL_SECONDS * 1000);
            expect(controller.hintsRevealed).toBe(2);

            // Advance timer to reveal hint 3
            vi.advanceTimersByTime(GeoPuzzleController.HINT_INTERVAL_SECONDS * 1000);
            expect(controller.hintsRevealed).toBe(3);
        });

        it('reveals hints in correct order: population, area, capital letter, capital, continent, flag', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            const country = controller.currentCountry;

            // Hint 1: Population (already revealed)
            let hints = container.querySelectorAll('.geo-puzzle-hint');
            expect(hints[0].textContent).toContain('Población:');

            // Hint 2: Area
            vi.advanceTimersByTime(GeoPuzzleController.HINT_INTERVAL_SECONDS * 1000);
            hints = container.querySelectorAll('.geo-puzzle-hint');
            expect(hints[1].textContent).toContain('Área:');

            // Hint 3: First letter of capital
            vi.advanceTimersByTime(GeoPuzzleController.HINT_INTERVAL_SECONDS * 1000);
            hints = container.querySelectorAll('.geo-puzzle-hint');
            expect(hints[2].textContent).toContain('La capital empieza con');

            // Hint 4: Capital name
            vi.advanceTimersByTime(GeoPuzzleController.HINT_INTERVAL_SECONDS * 1000);
            hints = container.querySelectorAll('.geo-puzzle-hint');
            expect(hints[3].textContent).toContain('Capital:');

            // Hint 5: Continent
            vi.advanceTimersByTime(GeoPuzzleController.HINT_INTERVAL_SECONDS * 1000);
            hints = container.querySelectorAll('.geo-puzzle-hint');
            expect(hints[4].textContent).toContain('Continente:');

            // Hint 6: Flag image
            vi.advanceTimersByTime(GeoPuzzleController.HINT_INTERVAL_SECONDS * 1000);
            expect(controller.hintsRevealed).toBe(6);
            const flagEl = container.querySelector('.geo-puzzle-flag');
            expect(flagEl.style.display).toBe('block');
            expect(decodeURIComponent(flagEl.src)).toContain(country.flagUrl);
        });

        it('does not reveal more than 6 hints', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            // Advance past all 6 hints
            for (let i = 0; i < 7; i++) {
                vi.advanceTimersByTime(GeoPuzzleController.HINT_INTERVAL_SECONDS * 1000);
            }
            expect(controller.hintsRevealed).toBe(6);
        });

        it('switches to input phase after all hints are revealed', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            // Advance past all hints (5 ticks to reveal hints 2-6, then 1 more tick to trigger input)
            for (let i = 0; i < 6; i++) {
                vi.advanceTimersByTime(GeoPuzzleController.HINT_INTERVAL_SECONDS * 1000);
            }

            // After all hints revealed, should switch to input phase
            expect(controller.phase).toBe('input');
        });
    });

    describe('triggerGuess ("¡Ya sé!" button)', () => {
        it('stops the hint timer and switches to input phase', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            expect(controller.phase).toBe('revealing');
            controller.triggerGuess();
            expect(controller.phase).toBe('input');
            expect(controller.hintTimer).toBeNull();
        });

        it('shows the input field and hides the guess button', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            controller.triggerGuess();
            expect(container.querySelector('.geo-puzzle-guess-btn').hidden).toBe(true);
            expect(container.querySelector('.geo-puzzle-input-area').hidden).toBe(false);
        });

        it('does nothing if not in revealing phase', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            controller.triggerGuess(); // switch to input
            controller.triggerGuess(); // should do nothing
            expect(controller.phase).toBe('input');
        });

        it('freezes hints at current count', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            // Reveal 2 more hints
            vi.advanceTimersByTime(GeoPuzzleController.HINT_INTERVAL_SECONDS * 1000);
            vi.advanceTimersByTime(GeoPuzzleController.HINT_INTERVAL_SECONDS * 1000);
            expect(controller.hintsRevealed).toBe(3);

            controller.triggerGuess();

            // No more hints should reveal
            vi.advanceTimersByTime(GeoPuzzleController.HINT_INTERVAL_SECONDS * 5000);
            expect(controller.hintsRevealed).toBe(3);
        });
    });

    describe('submitGuess', () => {
        it('accepts correct guess (exact match)', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            controller.triggerGuess();
            const country = controller.currentCountry;
            controller.submitGuess(country.spanishName);

            expect(controller.roundHistory[0].correct).toBe(true);
        });

        it('accepts correct guess (case-insensitive)', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            controller.triggerGuess();
            const country = controller.currentCountry;
            controller.submitGuess(country.spanishName.toUpperCase());

            expect(controller.roundHistory[0].correct).toBe(true);
        });

        it('accepts correct guess (accent-insensitive)', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            // Force a specific country with accents
            controller.currentCountry = makeCountry('Japón', { capital: 'Tokio' });
            controller.triggerGuess();

            controller.submitGuess('japon'); // without accent
            expect(controller.roundHistory[0].correct).toBe(true);
        });

        it('rejects incorrect guess and fails the round', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            controller.triggerGuess();
            controller.submitGuess('PaísInventado');

            expect(controller.roundHistory[0].correct).toBe(false);
            expect(controller.phase).toBe('review');
        });

        it('rejects empty guess', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            controller.triggerGuess();
            controller.submitGuess('');
            expect(controller.roundHistory.length).toBe(0);
        });

        it('rejects whitespace-only guess', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            controller.triggerGuess();
            controller.submitGuess('   ');
            expect(controller.roundHistory.length).toBe(0);
        });

        it('does nothing if not in input phase', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            // Still in revealing phase
            const country = controller.currentCountry;
            controller.submitGuess(country.spanishName);
            expect(controller.roundHistory.length).toBe(0);
        });
    });

    describe('answer timeout', () => {
        it('fails the round when answer time runs out', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            controller.triggerGuess();

            // Advance past the answer time
            vi.advanceTimersByTime(GeoPuzzleController.ANSWER_TIME_SECONDS * 1000);

            expect(controller.roundHistory[0].correct).toBe(false);
            expect(controller.phase).toBe('review');
        });

        it('shows the correct answer on timeout', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            const country = controller.currentCountry;
            controller.triggerGuess();
            vi.advanceTimersByTime(GeoPuzzleController.ANSWER_TIME_SECONDS * 1000);

            const feedback = container.querySelector('.geo-puzzle-feedback');
            expect(feedback.textContent).toContain(country.displayName);
        });
    });

    describe('scoring', () => {
        it('awards maximum points when guessing with 1 hint', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            controller.triggerGuess();
            const country = controller.currentCountry;
            controller.submitGuess(country.spanishName);

            // Formula: 100 * ((6 - 1 + 1) / 6) * 1.0 = 100
            expect(controller.totalScore).toBe(100);
        });

        it('awards fewer points with more hints revealed', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            // Wait for 2 more hints to reveal
            vi.advanceTimersByTime(GeoPuzzleController.HINT_INTERVAL_SECONDS * 2000);
            expect(controller.hintsRevealed).toBe(3);

            controller.triggerGuess();
            const country = controller.currentCountry;
            controller.submitGuess(country.spanishName);

            // Formula: 100 * ((6 - 3 + 1) / 6) * 1.0 = 67
            expect(controller.totalScore).toBe(67);
        });

        it('awards minimum points when guessing with all 6 hints', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            // Wait for all hints to reveal + 1 extra tick to trigger input phase
            for (let i = 0; i < 6; i++) {
                vi.advanceTimersByTime(GeoPuzzleController.HINT_INTERVAL_SECONDS * 1000);
            }
            expect(controller.hintsRevealed).toBe(6);
            expect(controller.phase).toBe('input');

            const country = controller.currentCountry;
            controller.submitGuess(country.spanishName);

            // Formula: 100 * ((6 - 6 + 1) / 6) * 1.0 = 17
            expect(controller.totalScore).toBe(17);
        });

        it('awards zero points when answer times out', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            controller.triggerGuess();
            vi.advanceTimersByTime(GeoPuzzleController.ANSWER_TIME_SECONDS * 1000);

            expect(controller.roundHistory[0].correct).toBe(false);
            expect(controller.roundHistory[0].points).toBe(0);
        });

        it('applies streak multiplier to scoring', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            // Manually set streak to 2 (next correct will be 3 → gold tier, 1.5x)
            controller.streakService.count = 2;
            controller.streakService.multiplier = 1.0;

            controller.triggerGuess();
            const country = controller.currentCountry;
            controller.submitGuess(country.spanishName);

            // After recordCorrect: count becomes 3, multiplier becomes 1.5
            // Formula: 100 * ((6 - 1 + 1) / 6) * 1.5 = 150
            expect(controller.totalScore).toBe(150);
        });
    });

    describe('streak integration', () => {
        it('increments streak on correct guess', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            controller.triggerGuess();
            const country = controller.currentCountry;
            controller.submitGuess(country.spanishName);

            expect(controller.streakService.count).toBe(1);
        });

        it('resets streak on failed round', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            // Build a streak first
            controller.streakService.count = 3;
            controller.streakService.multiplier = 1.5;

            controller.triggerGuess();
            controller.submitGuess('Wrong');

            expect(controller.streakService.count).toBe(0);
            expect(controller.streakService.multiplier).toBe(1.0);
        });
    });

    describe('callbacks', () => {
        it('calls onRoundEnd with correct data on correct guess', () => {
            const onRoundEnd = vi.fn();
            controller = new GeoPuzzleController({ container, onRoundEnd });
            controller.start(pool, { rounds: 5 });

            controller.triggerGuess();
            const country = controller.currentCountry;
            controller.submitGuess(country.spanishName);

            expect(onRoundEnd).toHaveBeenCalledWith(expect.objectContaining({
                round: 1,
                correct: true,
                points: expect.any(Number),
                totalScore: expect.any(Number),
                streak: 1,
                hintsRevealed: 1,
            }));
        });

        it('calls onRoundEnd with correct data on failed round', () => {
            const onRoundEnd = vi.fn();
            controller = new GeoPuzzleController({ container, onRoundEnd });
            controller.start(pool, { rounds: 5 });

            controller.triggerGuess();
            controller.submitGuess('Wrong');

            expect(onRoundEnd).toHaveBeenCalledWith(expect.objectContaining({
                round: 1,
                correct: false,
                points: 0,
                hintsRevealed: 1,
            }));
        });

        it('calls onGameEnd when all rounds are completed', () => {
            const onGameEnd = vi.fn();
            controller = new GeoPuzzleController({ container, onGameEnd });
            controller.start(pool, { rounds: 1 });

            controller.triggerGuess();
            const country = controller.currentCountry;
            controller.submitGuess(country.spanishName);

            // Advance past the transition delay
            vi.advanceTimersByTime(1500);

            expect(onGameEnd).toHaveBeenCalledWith(expect.objectContaining({
                totalScore: expect.any(Number),
                totalRounds: 1,
                roundHistory: expect.any(Array),
                highestStreak: 1,
            }));
        });
    });

    describe('skipRound', () => {
        it('skips the round and records it as failed', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            controller.skipRound();

            expect(controller.roundHistory[0].correct).toBe(false);
            expect(controller.roundHistory[0].points).toBe(0);
            expect(controller.phase).toBe('review');
        });

        it('shows the correct answer when skipping', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            const country = controller.currentCountry;
            controller.skipRound();

            const feedback = container.querySelector('.geo-puzzle-feedback');
            expect(feedback.textContent).toContain(country.displayName);
        });

        it('does nothing in review phase', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            controller.triggerGuess();
            controller.submitGuess('Wrong');
            expect(controller.phase).toBe('review');

            const historyLength = controller.roundHistory.length;
            controller.skipRound();
            expect(controller.roundHistory.length).toBe(historyLength);
        });

        it('works during input phase', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            controller.triggerGuess();
            expect(controller.phase).toBe('input');

            controller.skipRound();
            expect(controller.roundHistory[0].correct).toBe(false);
            expect(controller.phase).toBe('review');
        });

        it('disables skip button during review phase', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            controller.skipRound();

            const skipBtn = container.querySelector('.geo-puzzle-skip-btn');
            expect(skipBtn.disabled).toBe(true);
        });
    });

    describe('end', () => {
        it('sets isActive to false', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });
            controller.end();
            expect(controller.isActive).toBe(false);
        });

        it('calls onGameEnd with session results', () => {
            const onGameEnd = vi.fn();
            controller = new GeoPuzzleController({ container, onGameEnd });
            controller.start(pool, { rounds: 5 });
            controller.end();
            expect(onGameEnd).toHaveBeenCalledWith(expect.objectContaining({
                totalScore: 0,
                roundHistory: [],
            }));
        });
    });

    describe('destroy', () => {
        it('clears the container', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool);
            controller.destroy();
            expect(container.innerHTML).toBe('');
        });

        it('sets isActive to false', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool);
            controller.destroy();
            expect(controller.isActive).toBe(false);
        });

        it('clears all timers', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool);
            controller.destroy();
            expect(controller.hintTimer).toBeNull();
            expect(controller.answerTimer).toBeNull();
        });
    });

    describe('matchGuess (fuzzy matching)', () => {
        it('matches with different casing', () => {
            controller = new GeoPuzzleController({ container });
            const country = makeCountry('Francia', { capital: 'París' });
            expect(controller.matchGuess('FRANCIA', country)).toBe(true);
            expect(controller.matchGuess('francia', country)).toBe(true);
            expect(controller.matchGuess('FrAnCiA', country)).toBe(true);
        });

        it('matches without accents', () => {
            controller = new GeoPuzzleController({ container });
            const country = makeCountry('Japón', { capital: 'Tokio' });
            expect(controller.matchGuess('japon', country)).toBe(true);
            expect(controller.matchGuess('Japon', country)).toBe(true);
        });

        it('matches English name as well', () => {
            controller = new GeoPuzzleController({ container });
            const country = {
                englishName: 'France',
                spanishName: 'Francia',
                displayName: 'Francia',
                continent: 'Europa',
                population: 67000000,
                area: 643801,
                capital: 'París',
                flagUrl: 'https://flagcdn.com/fr.svg',
            };
            expect(controller.matchGuess('france', country)).toBe(true);
            expect(controller.matchGuess('Francia', country)).toBe(true);
        });

        it('trims whitespace from guess', () => {
            controller = new GeoPuzzleController({ container });
            const country = makeCountry('Francia', { capital: 'París' });
            expect(controller.matchGuess('  Francia  ', country)).toBe(true);
        });

        it('returns false for empty or null guess', () => {
            controller = new GeoPuzzleController({ container });
            const country = makeCountry('Francia', { capital: 'París' });
            expect(controller.matchGuess('', country)).toBe(false);
            expect(controller.matchGuess(null, country)).toBe(false);
            expect(controller.matchGuess(undefined, country)).toBe(false);
        });
    });

    describe('formatPopulation', () => {
        it('formats billions correctly', () => {
            controller = new GeoPuzzleController({ container });
            expect(controller.formatPopulation(1400000000)).toBe('1.4 mil millones');
        });

        it('formats millions correctly', () => {
            controller = new GeoPuzzleController({ container });
            expect(controller.formatPopulation(67000000)).toBe('67 millones');
        });

        it('formats thousands correctly', () => {
            controller = new GeoPuzzleController({ container });
            expect(controller.formatPopulation(500000)).toBe('500 mil');
        });

        it('handles zero/null population', () => {
            controller = new GeoPuzzleController({ container });
            expect(controller.formatPopulation(0)).toBe('Desconocida');
            expect(controller.formatPopulation(null)).toBe('Desconocida');
        });
    });

    describe('getHighestStreak', () => {
        it('returns 0 when no rounds played', () => {
            controller = new GeoPuzzleController({ container });
            expect(controller.getHighestStreak()).toBe(0);
        });

        it('calculates highest streak from round history', () => {
            controller = new GeoPuzzleController({ container });
            controller.roundHistory = [
                { correct: true },
                { correct: true },
                { correct: true },
                { correct: false },
                { correct: true },
                { correct: true },
            ];
            expect(controller.getHighestStreak()).toBe(3);
        });
    });

    describe('keyboard shortcuts', () => {
        it('Enter triggers guess in revealing phase', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            const event = new KeyboardEvent('keydown', { key: 'Enter' });
            document.dispatchEvent(event);

            expect(controller.phase).toBe('input');
        });

        it('Space triggers guess in revealing phase', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            const event = new KeyboardEvent('keydown', { code: 'Space', key: ' ' });
            document.dispatchEvent(event);

            expect(controller.phase).toBe('input');
        });

        it('Enter advances to next round in review phase', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            controller.triggerGuess();
            const country = controller.currentCountry;
            controller.submitGuess(country.spanishName);

            expect(controller.phase).toBe('review');
            expect(controller.currentRound).toBe(1);

            const event = new KeyboardEvent('keydown', { key: 'Enter' });
            document.dispatchEvent(event);

            expect(controller.currentRound).toBe(2);
        });

        it('S key skips the round in revealing phase', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            expect(controller.phase).toBe('revealing');

            const event = new KeyboardEvent('keydown', { key: 's' });
            document.dispatchEvent(event);

            expect(controller.roundHistory[0].correct).toBe(false);
            expect(controller.phase).toBe('review');
        });
    });
});
