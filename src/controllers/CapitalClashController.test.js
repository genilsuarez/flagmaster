import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CapitalClashController } from './CapitalClashController.js';

/**
 * Helper to create mock country objects matching the Country model shape.
 */
function makeCountry(name, continent, capital) {
    return {
        englishName: name,
        spanishName: name,
        displayName: name,
        capital: capital || `${name} City`,
        continent,
        flagUrl: `https://flagcdn.com/${name.toLowerCase().replace(/\s/g, '-')}.svg`,
        isSovereign: true,
    };
}

/**
 * Creates a pool of countries across multiple continents for testing.
 */
function createTestPool() {
    return [
        makeCountry('France', 'Europe', 'París'),
        makeCountry('Germany', 'Europe', 'Berlín'),
        makeCountry('Spain', 'Europe', 'Madrid'),
        makeCountry('Italy', 'Europe', 'Roma'),
        makeCountry('Portugal', 'Europe', 'Lisboa'),
        makeCountry('Brazil', 'America', 'Brasília'),
        makeCountry('Argentina', 'America', 'Buenos Aires'),
        makeCountry('Japan', 'Asia', 'Tokio'),
        makeCountry('China', 'Asia', 'Pekín'),
        makeCountry('India', 'Asia', 'Nueva Delhi'),
        makeCountry('Australia', 'Oceania', 'Canberra'),
        makeCountry('Nigeria', 'Africa', 'Abuya'),
    ];
}

describe('CapitalClashController', () => {
    let container;
    let controller;
    let pool;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        pool = createTestPool();
    });

    afterEach(() => {
        if (controller) {
            controller.destroy();
            controller = null;
        }
        if (container && container.parentNode) {
            document.body.removeChild(container);
        }
        vi.restoreAllMocks();
    });

    describe('constructor', () => {
        it('initializes with default state', () => {
            controller = new CapitalClashController({ container });
            expect(controller.isActive).toBe(false);
            expect(controller.totalScore).toBe(0);
            expect(controller.currentRound).toBe(0);
        });

        it('accepts onRoundEnd and onGameEnd callbacks', () => {
            const onRoundEnd = vi.fn();
            const onGameEnd = vi.fn();
            controller = new CapitalClashController({ container, onRoundEnd, onGameEnd });
            expect(controller.onRoundEnd).toBe(onRoundEnd);
            expect(controller.onGameEnd).toBe(onGameEnd);
        });
    });

    describe('start', () => {
        it('sets isActive to true', () => {
            controller = new CapitalClashController({ container });
            controller.start(pool);
            expect(controller.isActive).toBe(true);
        });

        it('uses default rounds (10) when not specified', () => {
            controller = new CapitalClashController({ container });
            controller.start(pool);
            expect(controller.totalRounds).toBe(10);
        });

        it('uses configurable rounds from modeOptions', () => {
            controller = new CapitalClashController({ container });
            controller.start(pool, { rounds: 5 });
            expect(controller.totalRounds).toBe(5);
        });

        it('uses configurable timePerQuestion from modeOptions', () => {
            controller = new CapitalClashController({ container });
            controller.start(pool, { timePerQuestion: 20 });
            expect(controller.timePerQuestion).toBe(20);
        });

        it('defaults timePerQuestion to 15 seconds', () => {
            controller = new CapitalClashController({ container });
            controller.start(pool);
            expect(controller.timePerQuestion).toBe(15);
        });

        it('defaults variant to "default"', () => {
            controller = new CapitalClashController({ container });
            controller.start(pool);
            expect(controller.variant).toBe('default');
        });

        it('accepts "inverse" variant from modeOptions', () => {
            controller = new CapitalClashController({ container });
            controller.start(pool, { variant: 'inverse' });
            expect(controller.variant).toBe('inverse');
        });

        it('resets score and round counters', () => {
            controller = new CapitalClashController({ container });
            controller.totalScore = 500;
            controller.currentRound = 5;
            controller.start(pool);
            expect(controller.totalScore).toBe(0);
            expect(controller.currentRound).toBe(1);
        });

        it('renders the game UI into the container', () => {
            controller = new CapitalClashController({ container });
            controller.start(pool);
            expect(container.querySelector('.capital-clash-prompt')).not.toBeNull();
            expect(container.querySelector('.capital-clash-options')).not.toBeNull();
            expect(container.querySelector('.capital-clash-timer')).not.toBeNull();
        });

        it('renders 4 multiple choice options', () => {
            controller = new CapitalClashController({ container });
            controller.start(pool);
            const buttons = container.querySelectorAll('.mc-option');
            expect(buttons.length).toBe(4);
        });

        it('does not mutate the original pool', () => {
            controller = new CapitalClashController({ container });
            const originalPool = [...pool];
            controller.start(pool);
            expect(pool).toEqual(originalPool);
        });
    });

    describe('default variant (country → capitals)', () => {
        it('displays country name as prompt', () => {
            controller = new CapitalClashController({ container });
            controller.start(pool, { variant: 'default' });
            const prompt = container.querySelector('.capital-clash-prompt');
            // Prompt should be the displayName of the current country
            expect(prompt.textContent).toBe(controller.currentCountry.displayName);
        });

        it('displays capital names as options', () => {
            controller = new CapitalClashController({ container });
            controller.start(pool, { variant: 'default' });
            const buttons = container.querySelectorAll('.mc-option');
            const optionTexts = Array.from(buttons).map(b => b.textContent);
            // The correct capital should be among the options
            expect(optionTexts).toContain(controller.currentCountry.capital);
        });
    });

    describe('inverse variant (capital → countries)', () => {
        it('displays capital name as prompt', () => {
            controller = new CapitalClashController({ container });
            controller.start(pool, { variant: 'inverse' });
            const prompt = container.querySelector('.capital-clash-prompt');
            expect(prompt.textContent).toBe(controller.currentCountry.capital);
        });

        it('displays country names as options', () => {
            controller = new CapitalClashController({ container });
            controller.start(pool, { variant: 'inverse' });
            const buttons = container.querySelectorAll('.mc-option');
            const optionTexts = Array.from(buttons).map(b => b.textContent);
            // The correct country displayName should be among the options
            expect(optionTexts).toContain(controller.currentCountry.displayName);
        });
    });

    describe('nextRound', () => {
        it('increments currentRound', () => {
            controller = new CapitalClashController({ container });
            controller.start(pool, { rounds: 5 });
            expect(controller.currentRound).toBe(1);
        });

        it('ends the game when all rounds are completed', () => {
            const onGameEnd = vi.fn();
            controller = new CapitalClashController({ container, onGameEnd });
            controller.start(pool, { rounds: 1 });
            vi.useFakeTimers();
            controller.handleAnswer(0, true);
            vi.advanceTimersByTime(CapitalClashController.FEEDBACK_DELAY_MS);
            expect(onGameEnd).toHaveBeenCalled();
            vi.useRealTimers();
        });

        it('picks a different country each round', () => {
            controller = new CapitalClashController({ container });
            controller.start(pool, { rounds: 3 });
            const firstCountry = controller.currentCountry;

            vi.useFakeTimers();
            controller.handleAnswer(0, false);
            vi.advanceTimersByTime(CapitalClashController.FEEDBACK_DELAY_MS);
            const secondCountry = controller.currentCountry;

            expect(firstCountry).not.toBe(secondCountry);
            vi.useRealTimers();
        });
    });

    describe('handleAnswer', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('awards points for correct answers', () => {
            controller = new CapitalClashController({ container });
            controller.start(pool, { rounds: 5 });
            vi.spyOn(controller.timerView, 'getRemaining').mockReturnValue(7);
            controller.handleAnswer(0, true);
            expect(controller.totalScore).toBeGreaterThan(0);
        });

        it('awards zero points for incorrect answers', () => {
            controller = new CapitalClashController({ container });
            controller.start(pool, { rounds: 5 });
            controller.handleAnswer(0, false);
            expect(controller.totalScore).toBe(0);
        });

        it('increments streak on correct answer', () => {
            controller = new CapitalClashController({ container });
            controller.start(pool, { rounds: 5 });
            vi.spyOn(controller.timerView, 'getRemaining').mockReturnValue(5);
            controller.handleAnswer(0, true);
            expect(controller.streakService.count).toBe(1);
        });

        it('resets streak on incorrect answer', () => {
            controller = new CapitalClashController({ container });
            controller.start(pool, { rounds: 5 });
            vi.spyOn(controller.timerView, 'getRemaining').mockReturnValue(5);
            controller.handleAnswer(0, true);
            vi.advanceTimersByTime(CapitalClashController.FEEDBACK_DELAY_MS);
            controller.handleAnswer(0, true);
            vi.advanceTimersByTime(CapitalClashController.FEEDBACK_DELAY_MS);
            expect(controller.streakService.count).toBe(2);
            controller.handleAnswer(0, false);
            expect(controller.streakService.count).toBe(0);
        });

        it('calls onRoundEnd callback with round data', () => {
            const onRoundEnd = vi.fn();
            controller = new CapitalClashController({ container, onRoundEnd });
            controller.start(pool, { rounds: 5 });
            vi.spyOn(controller.timerView, 'getRemaining').mockReturnValue(7);
            controller.handleAnswer(0, true);
            expect(onRoundEnd).toHaveBeenCalledWith(expect.objectContaining({
                round: 1,
                correct: true,
                totalScore: expect.any(Number),
                streak: 1,
                timeRemaining: 7,
            }));
        });

        it('advances to next round after 300ms feedback delay', () => {
            controller = new CapitalClashController({ container });
            controller.start(pool, { rounds: 5 });
            const initialRound = controller.currentRound;
            controller.handleAnswer(0, true);
            expect(controller.currentRound).toBe(initialRound);
            vi.advanceTimersByTime(CapitalClashController.FEEDBACK_DELAY_MS);
            expect(controller.currentRound).toBe(initialRound + 1);
        });

        it('records round in roundHistory', () => {
            controller = new CapitalClashController({ container });
            controller.start(pool, { rounds: 5 });
            vi.spyOn(controller.timerView, 'getRemaining').mockReturnValue(3);
            controller.handleAnswer(0, true);
            expect(controller.roundHistory).toHaveLength(1);
            expect(controller.roundHistory[0]).toEqual(expect.objectContaining({
                correct: true,
                points: expect.any(Number),
                timeRemaining: 3,
            }));
        });
    });

    describe('handleTimeout', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('marks the round as incorrect on timeout', () => {
            controller = new CapitalClashController({ container });
            controller.start(pool, { rounds: 5 });
            controller.handleTimeout();
            expect(controller.roundHistory[0].correct).toBe(false);
            expect(controller.roundHistory[0].points).toBe(0);
        });

        it('resets streak on timeout', () => {
            controller = new CapitalClashController({ container });
            controller.start(pool, { rounds: 5 });
            vi.spyOn(controller.timerView, 'getRemaining').mockReturnValue(5);
            controller.handleAnswer(0, true);
            vi.advanceTimersByTime(CapitalClashController.FEEDBACK_DELAY_MS);
            expect(controller.streakService.count).toBe(1);
            controller.handleTimeout();
            expect(controller.streakService.count).toBe(0);
        });
    });

    describe('end', () => {
        it('sets isActive to false', () => {
            controller = new CapitalClashController({ container });
            controller.start(pool, { rounds: 5 });
            controller.end();
            expect(controller.isActive).toBe(false);
        });

        it('calls onGameEnd with session results', () => {
            const onGameEnd = vi.fn();
            controller = new CapitalClashController({ container, onGameEnd });
            controller.start(pool, { rounds: 2 });

            vi.useFakeTimers();
            vi.spyOn(controller.timerView, 'getRemaining').mockReturnValue(5);
            controller.handleAnswer(0, true);
            vi.advanceTimersByTime(CapitalClashController.FEEDBACK_DELAY_MS);
            controller.handleAnswer(0, true);
            vi.advanceTimersByTime(CapitalClashController.FEEDBACK_DELAY_MS);
            expect(onGameEnd).toHaveBeenCalledWith(expect.objectContaining({
                totalScore: expect.any(Number),
                totalRounds: 2,
                roundHistory: expect.any(Array),
                highestStreak: 2,
            }));
            vi.useRealTimers();
        });
    });

    describe('power-up integration', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('grants power-up at streak milestone 3', () => {
            controller = new CapitalClashController({ container });
            controller.start(pool, { rounds: 10 });
            vi.spyOn(controller.timerView, 'getRemaining').mockReturnValue(5);

            for (let i = 0; i < 3; i++) {
                controller.handleAnswer(0, true);
                vi.advanceTimersByTime(CapitalClashController.FEEDBACK_DELAY_MS);
            }

            expect(controller.powerUpService.inventory).toContain('timeExtra');
        });

        it('applies timeExtra power-up by adding 5 seconds', () => {
            controller = new CapitalClashController({ container });
            controller.start(pool, { rounds: 10 });

            controller.powerUpService.inventory.push('timeExtra');

            const addTimeSpy = vi.spyOn(controller.timerView, 'addTime');
            controller.handlePowerUpActivation('timeExtra');
            expect(addTimeSpy).toHaveBeenCalledWith(5);
        });

        it('applies freeze power-up by freezing the timer', () => {
            controller = new CapitalClashController({ container });
            controller.start(pool, { rounds: 10 });

            controller.powerUpService.inventory.push('freeze');

            const freezeSpy = vi.spyOn(controller.timerView, 'freeze');
            controller.handlePowerUpActivation('freeze');
            expect(freezeSpy).toHaveBeenCalled();
        });

        it('applies 50/50 power-up by disabling 2 options', () => {
            controller = new CapitalClashController({ container });
            controller.start(pool, { rounds: 10 });

            controller.powerUpService.inventory.push('fiftyFifty');

            controller.handlePowerUpActivation('fiftyFifty');

            const disabledButtons = container.querySelectorAll('.mc-option--disabled');
            expect(disabledButtons.length).toBe(2);
        });
    });

    describe('scoring integration', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('calculates score based on time remaining', () => {
            controller = new CapitalClashController({ container });
            controller.start(pool, { rounds: 5, timePerQuestion: 15 });

            vi.spyOn(controller.timerView, 'getRemaining').mockReturnValue(15);
            controller.handleAnswer(0, true);
            // BASE_POINTS * (15/15) * 1.0 = 1000
            expect(controller.totalScore).toBe(1000);
        });

        it('calculates score with streak multiplier', () => {
            controller = new CapitalClashController({ container });
            controller.start(pool, { rounds: 10, timePerQuestion: 15 });

            vi.spyOn(controller.timerView, 'getRemaining').mockReturnValue(15);

            controller.handleAnswer(0, true); // streak 1, mult 1.0 → 1000
            vi.advanceTimersByTime(CapitalClashController.FEEDBACK_DELAY_MS);
            controller.handleAnswer(0, true); // streak 2, mult 1.0 → 1000
            vi.advanceTimersByTime(CapitalClashController.FEEDBACK_DELAY_MS);
            controller.handleAnswer(0, true); // streak 3, mult 1.5 → 1500

            expect(controller.totalScore).toBe(1000 + 1000 + 1500);
        });

        it('awards zero points when time remaining is zero', () => {
            controller = new CapitalClashController({ container });
            controller.start(pool, { rounds: 5, timePerQuestion: 15 });

            vi.spyOn(controller.timerView, 'getRemaining').mockReturnValue(0);
            controller.handleAnswer(0, true);
            expect(controller.totalScore).toBe(0);
        });
    });

    describe('destroy', () => {
        it('clears the container', () => {
            controller = new CapitalClashController({ container });
            controller.start(pool);
            controller.destroy();
            expect(container.innerHTML).toBe('');
        });

        it('sets isActive to false', () => {
            controller = new CapitalClashController({ container });
            controller.start(pool);
            controller.destroy();
            expect(controller.isActive).toBe(false);
        });
    });

    describe('getHighestStreak', () => {
        it('returns 0 when no rounds played', () => {
            controller = new CapitalClashController({ container });
            expect(controller.getHighestStreak()).toBe(0);
        });

        it('calculates highest streak from round history', () => {
            controller = new CapitalClashController({ container });
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
