import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FlagRushController } from './FlagRushController.js';

/**
 * Helper to create mock country objects matching the Country model shape.
 */
function makeCountry(name, continent) {
    return {
        englishName: name,
        spanishName: name,
        displayName: name,
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
        makeCountry('France', 'Europe'),
        makeCountry('Germany', 'Europe'),
        makeCountry('Spain', 'Europe'),
        makeCountry('Italy', 'Europe'),
        makeCountry('Portugal', 'Europe'),
        makeCountry('Brazil', 'America'),
        makeCountry('Argentina', 'America'),
        makeCountry('Japan', 'Asia'),
        makeCountry('China', 'Asia'),
        makeCountry('India', 'Asia'),
        makeCountry('Australia', 'Oceania'),
        makeCountry('Nigeria', 'Africa'),
    ];
}

describe('FlagRushController', () => {
    let container;
    let controller;
    let pool;

    beforeEach(() => {
        // Create a DOM container for the controller
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
            controller = new FlagRushController({ container });
            expect(controller.isActive).toBe(false);
            expect(controller.totalScore).toBe(0);
            expect(controller.currentRound).toBe(0);
        });

        it('accepts onRoundEnd and onGameEnd callbacks', () => {
            const onRoundEnd = vi.fn();
            const onGameEnd = vi.fn();
            controller = new FlagRushController({ container, onRoundEnd, onGameEnd });
            expect(controller.onRoundEnd).toBe(onRoundEnd);
            expect(controller.onGameEnd).toBe(onGameEnd);
        });
    });

    describe('start', () => {
        it('sets isActive to true', () => {
            controller = new FlagRushController({ container });
            controller.start(pool);
            expect(controller.isActive).toBe(true);
        });

        it('uses default rounds (10) when not specified', () => {
            controller = new FlagRushController({ container });
            controller.start(pool);
            expect(controller.totalRounds).toBe(10);
        });

        it('uses configurable rounds from modeOptions', () => {
            controller = new FlagRushController({ container });
            controller.start(pool, { rounds: 5 });
            expect(controller.totalRounds).toBe(5);
        });

        it('uses configurable timePerQuestion from modeOptions', () => {
            controller = new FlagRushController({ container });
            controller.start(pool, { timePerQuestion: 15 });
            expect(controller.timePerQuestion).toBe(15);
        });

        it('defaults timePerQuestion to 10 seconds', () => {
            controller = new FlagRushController({ container });
            controller.start(pool);
            expect(controller.timePerQuestion).toBe(10);
        });

        it('resets score and round counters', () => {
            controller = new FlagRushController({ container });
            controller.totalScore = 500;
            controller.currentRound = 5;
            controller.start(pool);
            expect(controller.totalScore).toBe(0);
            expect(controller.currentRound).toBe(1); // nextRound increments to 1
        });

        it('renders the game UI into the container', () => {
            controller = new FlagRushController({ container });
            controller.start(pool);
            expect(container.querySelector('.flag-rush-flag')).not.toBeNull();
            expect(container.querySelector('.flag-rush-options')).not.toBeNull();
            expect(container.querySelector('.flag-rush-timer')).not.toBeNull();
        });

        it('displays a flag image for the first round', () => {
            controller = new FlagRushController({ container });
            controller.start(pool);
            const flagImg = container.querySelector('.flag-rush-flag');
            expect(flagImg.src).toBeTruthy();
            expect(flagImg.src).not.toBe('');
        });

        it('renders 4 multiple choice options', () => {
            controller = new FlagRushController({ container });
            controller.start(pool);
            const buttons = container.querySelectorAll('.mc-option');
            expect(buttons.length).toBe(4);
        });

        it('does not mutate the original pool', () => {
            controller = new FlagRushController({ container });
            const originalPool = [...pool];
            controller.start(pool);
            expect(pool).toEqual(originalPool);
        });
    });

    describe('nextRound', () => {
        it('increments currentRound', () => {
            controller = new FlagRushController({ container });
            controller.start(pool, { rounds: 5 });
            expect(controller.currentRound).toBe(1);
            // Simulate answering to advance
            controller.handleAnswer(0, true);
            // After feedback timeout, nextRound is called
        });

        it('ends the game when all rounds are completed', () => {
            const onGameEnd = vi.fn();
            controller = new FlagRushController({ container, onGameEnd });
            controller.start(pool, { rounds: 1 });
            // First round is already started, simulate answer
            vi.useFakeTimers();
            controller.handleAnswer(0, true);
            vi.advanceTimersByTime(FlagRushController.FEEDBACK_DELAY_MS);
            expect(onGameEnd).toHaveBeenCalled();
            vi.useRealTimers();
        });

        it('picks a different country each round', () => {
            controller = new FlagRushController({ container });
            controller.start(pool, { rounds: 3 });
            const firstCountry = controller.currentCountry;

            vi.useFakeTimers();
            controller.handleAnswer(0, false);
            vi.advanceTimersByTime(FlagRushController.FEEDBACK_DELAY_MS);
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
            controller = new FlagRushController({ container });
            controller.start(pool, { rounds: 5 });
            // Mock timer remaining
            vi.spyOn(controller.timerView, 'getRemaining').mockReturnValue(5);
            controller.handleAnswer(0, true);
            expect(controller.totalScore).toBeGreaterThan(0);
        });

        it('awards zero points for incorrect answers', () => {
            controller = new FlagRushController({ container });
            controller.start(pool, { rounds: 5 });
            controller.handleAnswer(0, false);
            expect(controller.totalScore).toBe(0);
        });

        it('increments streak on correct answer', () => {
            controller = new FlagRushController({ container });
            controller.start(pool, { rounds: 5 });
            vi.spyOn(controller.timerView, 'getRemaining').mockReturnValue(5);
            controller.handleAnswer(0, true);
            expect(controller.streakService.count).toBe(1);
        });

        it('resets streak on incorrect answer', () => {
            controller = new FlagRushController({ container });
            controller.start(pool, { rounds: 5 });
            // Build a streak first
            vi.spyOn(controller.timerView, 'getRemaining').mockReturnValue(5);
            controller.handleAnswer(0, true);
            vi.advanceTimersByTime(FlagRushController.FEEDBACK_DELAY_MS);
            controller.handleAnswer(0, true);
            vi.advanceTimersByTime(FlagRushController.FEEDBACK_DELAY_MS);
            expect(controller.streakService.count).toBe(2);
            // Now incorrect
            controller.handleAnswer(0, false);
            expect(controller.streakService.count).toBe(0);
        });

        it('calls onRoundEnd callback with round data', () => {
            const onRoundEnd = vi.fn();
            controller = new FlagRushController({ container, onRoundEnd });
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

        it('advances to next round after 1.5s feedback delay', () => {
            controller = new FlagRushController({ container });
            controller.start(pool, { rounds: 5 });
            const initialRound = controller.currentRound;
            controller.handleAnswer(0, true);
            // Before delay, still same round
            expect(controller.currentRound).toBe(initialRound);
            // After delay
            vi.advanceTimersByTime(FlagRushController.FEEDBACK_DELAY_MS);
            expect(controller.currentRound).toBe(initialRound + 1);
        });

        it('records round in roundHistory', () => {
            controller = new FlagRushController({ container });
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
            controller = new FlagRushController({ container });
            controller.start(pool, { rounds: 5 });
            controller.handleTimeout();
            expect(controller.roundHistory[0].correct).toBe(false);
            expect(controller.roundHistory[0].points).toBe(0);
        });

        it('resets streak on timeout', () => {
            controller = new FlagRushController({ container });
            controller.start(pool, { rounds: 5 });
            vi.spyOn(controller.timerView, 'getRemaining').mockReturnValue(5);
            controller.handleAnswer(0, true);
            vi.advanceTimersByTime(FlagRushController.FEEDBACK_DELAY_MS);
            expect(controller.streakService.count).toBe(1);
            controller.handleTimeout();
            expect(controller.streakService.count).toBe(0);
        });
    });

    describe('end', () => {
        it('sets isActive to false', () => {
            controller = new FlagRushController({ container });
            controller.start(pool, { rounds: 5 });
            controller.end();
            expect(controller.isActive).toBe(false);
        });

        it('calls onGameEnd with session results', () => {
            const onGameEnd = vi.fn();
            controller = new FlagRushController({ container, onGameEnd });
            controller.start(pool, { rounds: 2 });

            vi.useFakeTimers();
            vi.spyOn(controller.timerView, 'getRemaining').mockReturnValue(5);
            controller.handleAnswer(0, true);
            vi.advanceTimersByTime(FlagRushController.FEEDBACK_DELAY_MS);
            controller.handleAnswer(0, true);
            vi.advanceTimersByTime(FlagRushController.FEEDBACK_DELAY_MS);
            // Game should have ended after 2 rounds
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
            controller = new FlagRushController({ container });
            controller.start(pool, { rounds: 10 });
            vi.spyOn(controller.timerView, 'getRemaining').mockReturnValue(5);

            // Answer 3 correct to reach streak 3
            for (let i = 0; i < 3; i++) {
                controller.handleAnswer(0, true);
                vi.advanceTimersByTime(FlagRushController.FEEDBACK_DELAY_MS);
            }

            expect(controller.powerUpService.inventory).toContain('timeExtra');
        });

        it('applies timeExtra power-up by adding 5 seconds', () => {
            controller = new FlagRushController({ container });
            controller.start(pool, { rounds: 10 });

            // Manually add a power-up to inventory
            controller.powerUpService.inventory.push('timeExtra');

            const addTimeSpy = vi.spyOn(controller.timerView, 'addTime');
            controller.handlePowerUpActivation('timeExtra');
            expect(addTimeSpy).toHaveBeenCalledWith(5);
        });

        it('applies freeze power-up by freezing the timer', () => {
            controller = new FlagRushController({ container });
            controller.start(pool, { rounds: 10 });

            controller.powerUpService.inventory.push('freeze');

            const freezeSpy = vi.spyOn(controller.timerView, 'freeze');
            controller.handlePowerUpActivation('freeze');
            expect(freezeSpy).toHaveBeenCalled();
        });

        it('applies 50/50 power-up by disabling 2 options', () => {
            controller = new FlagRushController({ container });
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
            controller = new FlagRushController({ container });
            controller.start(pool, { rounds: 5, timePerQuestion: 10 });

            // Mock 10s remaining (full time) → should get max points
            vi.spyOn(controller.timerView, 'getRemaining').mockReturnValue(10);
            controller.handleAnswer(0, true);
            // BASE_POINTS * (10/10) * 1.0 = 1000
            expect(controller.totalScore).toBe(1000);
        });

        it('calculates score with streak multiplier', () => {
            controller = new FlagRushController({ container });
            controller.start(pool, { rounds: 10, timePerQuestion: 10 });

            vi.spyOn(controller.timerView, 'getRemaining').mockReturnValue(10);

            // Answer 3 correct to reach 1.5x multiplier
            controller.handleAnswer(0, true); // streak 1, mult 1.0 → 1000
            vi.advanceTimersByTime(FlagRushController.FEEDBACK_DELAY_MS);
            controller.handleAnswer(0, true); // streak 2, mult 1.0 → 1000
            vi.advanceTimersByTime(FlagRushController.FEEDBACK_DELAY_MS);
            controller.handleAnswer(0, true); // streak 3, mult 1.5 → 1500

            expect(controller.totalScore).toBe(1000 + 1000 + 1500);
        });

        it('awards zero points when time remaining is zero', () => {
            controller = new FlagRushController({ container });
            controller.start(pool, { rounds: 5, timePerQuestion: 10 });

            vi.spyOn(controller.timerView, 'getRemaining').mockReturnValue(0);
            controller.handleAnswer(0, true);
            // BASE_POINTS * (0/10) * 1.0 = 0
            expect(controller.totalScore).toBe(0);
        });
    });

    describe('destroy', () => {
        it('clears the container', () => {
            controller = new FlagRushController({ container });
            controller.start(pool);
            controller.destroy();
            expect(container.innerHTML).toBe('');
        });

        it('sets isActive to false', () => {
            controller = new FlagRushController({ container });
            controller.start(pool);
            controller.destroy();
            expect(controller.isActive).toBe(false);
        });
    });

    describe('getHighestStreak', () => {
        it('returns 0 when no rounds played', () => {
            controller = new FlagRushController({ container });
            expect(controller.getHighestStreak()).toBe(0);
        });

        it('calculates highest streak from round history', () => {
            controller = new FlagRushController({ container });
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
