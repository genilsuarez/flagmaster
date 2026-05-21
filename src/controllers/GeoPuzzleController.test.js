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
            expect(container.querySelector('.geo-puzzle-input')).not.toBeNull();
            expect(container.querySelector('.geo-puzzle-submit')).not.toBeNull();
        });

        it('reveals the first hint (continent)', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool);
            expect(controller.hintsRevealed).toBe(1);
            const hints = container.querySelectorAll('.geo-puzzle-hint');
            expect(hints.length).toBe(1);
            expect(hints[0].textContent).toContain('Continente:');
        });

        it('does not mutate the original pool', () => {
            controller = new GeoPuzzleController({ container });
            const originalPool = [...pool];
            controller.start(pool);
            expect(pool).toEqual(originalPool);
        });
    });

    describe('progressive hints', () => {
        it('reveals hints one at a time in correct order', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            const country = controller.currentCountry;

            // Hint 1: Continent (already revealed)
            expect(controller.hintsRevealed).toBe(1);
            let hints = container.querySelectorAll('.geo-puzzle-hint');
            expect(hints[0].textContent).toContain('Continente:');

            // Hint 2: Population
            controller.revealNextHint();
            expect(controller.hintsRevealed).toBe(2);
            hints = container.querySelectorAll('.geo-puzzle-hint');
            expect(hints[1].textContent).toContain('Población:');

            // Hint 3: Area
            controller.revealNextHint();
            expect(controller.hintsRevealed).toBe(3);
            hints = container.querySelectorAll('.geo-puzzle-hint');
            expect(hints[2].textContent).toContain('Área:');

            // Hint 4: First letter of capital
            controller.revealNextHint();
            expect(controller.hintsRevealed).toBe(4);
            hints = container.querySelectorAll('.geo-puzzle-hint');
            expect(hints[3].textContent).toContain('La capital empieza con');

            // Hint 5: Capital name
            controller.revealNextHint();
            expect(controller.hintsRevealed).toBe(5);
            hints = container.querySelectorAll('.geo-puzzle-hint');
            expect(hints[4].textContent).toContain('Capital:');

            // Hint 6: Flag image
            controller.revealNextHint();
            expect(controller.hintsRevealed).toBe(6);
            const flagEl = container.querySelector('.geo-puzzle-flag');
            expect(flagEl.style.display).toBe('block');
            expect(decodeURIComponent(flagEl.src)).toContain(country.flagUrl);
        });

        it('does not reveal more than 6 hints', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            // Reveal all 6 hints
            for (let i = 0; i < 5; i++) {
                controller.revealNextHint();
            }
            expect(controller.hintsRevealed).toBe(6);

            // Try to reveal one more
            controller.revealNextHint();
            expect(controller.hintsRevealed).toBe(6);
        });

        it('keeps all previously revealed hints visible', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            controller.revealNextHint(); // hint 2
            controller.revealNextHint(); // hint 3

            const hints = container.querySelectorAll('.geo-puzzle-hint');
            expect(hints.length).toBe(3); // hints 1, 2, 3 all visible
        });
    });

    describe('submitGuess', () => {
        it('accepts correct guess (exact match)', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            const country = controller.currentCountry;
            controller.submitGuess(country.spanishName);

            expect(controller.roundHistory[0].correct).toBe(true);
        });

        it('accepts correct guess (case-insensitive)', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            const country = controller.currentCountry;
            controller.submitGuess(country.spanishName.toUpperCase());

            expect(controller.roundHistory[0].correct).toBe(true);
        });

        it('accepts correct guess (accent-insensitive)', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            // Force a specific country with accents
            controller.currentCountry = makeCountry('Japón', { capital: 'Tokio' });
            controller.hintsRevealed = 1;
            controller.guessesThisRound = 0;

            controller.submitGuess('japon'); // without accent
            expect(controller.roundHistory[0].correct).toBe(true);
        });

        it('rejects incorrect guess', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            controller.submitGuess('PaísInventado');

            // Should not record as correct
            expect(controller.roundHistory.length).toBe(0); // round not ended yet
            expect(controller.hintsRevealed).toBe(2); // next hint revealed
        });

        it('allows only 1 guess per hint level', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            // First guess at hint level 1
            controller.submitGuess('Wrong');
            expect(controller.hintsRevealed).toBe(2); // hint 2 revealed after wrong guess
            expect(controller.guessesThisRound).toBe(1);

            // Try second guess at same hint level (guessesThisRound = 1, hintsRevealed = 2)
            // This should be allowed since hintsRevealed is now 2
            controller.submitGuess('AlsoWrong');
            expect(controller.guessesThisRound).toBe(2);
            expect(controller.hintsRevealed).toBe(3);
        });

        it('blocks guess when guessesThisRound equals hintsRevealed', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            // Guess at hint 1
            controller.submitGuess('Wrong');
            // Now guessesThisRound = 1, hintsRevealed = 2

            // Guess at hint 2
            controller.submitGuess('Wrong2');
            // Now guessesThisRound = 2, hintsRevealed = 3

            // Try to guess again without new hint — guessesThisRound (2) < hintsRevealed (3) so it's allowed
            controller.submitGuess('Wrong3');
            expect(controller.guessesThisRound).toBe(3);
        });

        it('rejects empty guess', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            controller.submitGuess('');
            expect(controller.guessesThisRound).toBe(0);
        });

        it('rejects whitespace-only guess', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            controller.submitGuess('   ');
            expect(controller.guessesThisRound).toBe(0);
        });
    });

    describe('scoring', () => {
        it('awards maximum points when guessing with 1 hint', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            const country = controller.currentCountry;
            controller.submitGuess(country.spanishName);

            // Formula: 1000 * ((6 - 1 + 1) / 6) * 1.0 = 1000
            expect(controller.totalScore).toBe(1000);
        });

        it('awards fewer points with more hints revealed', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            // Reveal hints 2 and 3
            controller.revealNextHint(); // hint 2
            controller.revealNextHint(); // hint 3

            const country = controller.currentCountry;
            // guessesThisRound is 0, hintsRevealed is 3
            controller.submitGuess(country.spanishName);

            // Formula: 1000 * ((6 - 3 + 1) / 6) * 1.0 = 667
            expect(controller.totalScore).toBe(667);
        });

        it('awards minimum points when guessing with all 6 hints', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            // Reveal all hints
            for (let i = 0; i < 5; i++) {
                controller.revealNextHint();
            }

            const country = controller.currentCountry;
            controller.submitGuess(country.spanishName);

            // Formula: 1000 * ((6 - 6 + 1) / 6) * 1.0 = 167
            expect(controller.totalScore).toBe(167);
        });

        it('awards zero points when all hints used and guess is wrong', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            // Use all guesses incorrectly
            for (let i = 0; i < 5; i++) {
                controller.submitGuess('Wrong');
            }
            // Now at hint 6, one more wrong guess
            controller.submitGuess('StillWrong');

            expect(controller.roundHistory[0].correct).toBe(false);
            expect(controller.roundHistory[0].points).toBe(0);
        });

        it('applies streak multiplier to scoring', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            // Manually set streak to 3 (gold tier, 1.5x)
            controller.streakService.count = 2;
            controller.streakService.multiplier = 1.0;

            const country = controller.currentCountry;
            controller.submitGuess(country.spanishName);

            // After recordCorrect: count becomes 3, multiplier becomes 1.5
            // Formula: 1000 * ((6 - 1 + 1) / 6) * 1.5 = 1500
            expect(controller.totalScore).toBe(1500);
        });
    });

    describe('streak integration', () => {
        it('increments streak on correct guess', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            const country = controller.currentCountry;
            controller.submitGuess(country.spanishName);

            expect(controller.streakService.count).toBe(1);
        });

        it('resets streak when all 6 hints used without correct guess', () => {
            controller = new GeoPuzzleController({ container });
            controller.start(pool, { rounds: 5 });

            // Build a streak first
            controller.streakService.count = 3;
            controller.streakService.multiplier = 1.5;

            // Use all hints incorrectly
            for (let i = 0; i < 5; i++) {
                controller.submitGuess('Wrong');
            }
            controller.submitGuess('StillWrong');

            expect(controller.streakService.count).toBe(0);
            expect(controller.streakService.multiplier).toBe(1.0);
        });
    });

    describe('callbacks', () => {
        it('calls onRoundEnd with correct data on correct guess', () => {
            const onRoundEnd = vi.fn();
            controller = new GeoPuzzleController({ container, onRoundEnd });
            controller.start(pool, { rounds: 5 });

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

            // Use all hints incorrectly
            for (let i = 0; i < 5; i++) {
                controller.submitGuess('Wrong');
            }
            controller.submitGuess('StillWrong');

            expect(onRoundEnd).toHaveBeenCalledWith(expect.objectContaining({
                round: 1,
                correct: false,
                points: 0,
                hintsRevealed: 6,
            }));
        });

        it('calls onGameEnd when all rounds are completed', () => {
            const onGameEnd = vi.fn();
            controller = new GeoPuzzleController({ container, onGameEnd });
            controller.start(pool, { rounds: 1 });

            const country = controller.currentCountry;
            controller.submitGuess(country.spanishName);

            // Advance past the delay
            vi.advanceTimersByTime(1500);

            expect(onGameEnd).toHaveBeenCalledWith(expect.objectContaining({
                totalScore: expect.any(Number),
                totalRounds: 1,
                roundHistory: expect.any(Array),
                highestStreak: 1,
            }));
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
});
