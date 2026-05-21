import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WordDropController } from './WordDropController.js';
import { GameSessionManager } from './GameSessionManager.js';

/**
 * Helper to create mock country objects.
 */
function makeCountry(name, continent = 'Europe', capital = 'Capital') {
    return {
        englishName: name,
        spanishName: name,
        displayName: name,
        continent,
        capital,
        flagUrl: `https://flagcdn.com/${name.toLowerCase()}.svg`,
        isSovereign: true,
    };
}

function createTestPool() {
    return [
        makeCountry('France', 'Europe', 'Paris'),
        makeCountry('Germany', 'Europe', 'Berlin'),
        makeCountry('Spain', 'Europe', 'Madrid'),
        makeCountry('Italy', 'Europe', 'Rome'),
        makeCountry('Portugal', 'Europe', 'Lisbon'),
        makeCountry('Brazil', 'America', 'Brasilia'),
        makeCountry('Argentina', 'America', 'Buenos Aires'),
        makeCountry('Japan', 'Asia', 'Tokyo'),
    ];
}

describe('WordDropController', () => {
    let controller;
    let mockStatsService;

    beforeEach(() => {
        mockStatsService = {
            recordGame: vi.fn(),
            recordCountryCorrect: vi.fn(),
        };
    });

    afterEach(() => {
        if (controller) {
            controller.destroy();
            controller = null;
        }
        vi.restoreAllMocks();
    });

    describe('constructor with options', () => {
        it('accepts onGameEnd callback', () => {
            const onGameEnd = vi.fn();
            controller = new WordDropController(null, mockStatsService, { onGameEnd });
            expect(controller.onGameEnd).toBe(onGameEnd);
        });

        it('accepts onCorrectAnswer callback', () => {
            const onCorrectAnswer = vi.fn();
            controller = new WordDropController(null, mockStatsService, { onCorrectAnswer });
            expect(controller.onCorrectAnswer).toBe(onCorrectAnswer);
        });

        it('accepts onIncorrectAnswer callback', () => {
            const onIncorrectAnswer = vi.fn();
            controller = new WordDropController(null, mockStatsService, { onIncorrectAnswer });
            expect(controller.onIncorrectAnswer).toBe(onIncorrectAnswer);
        });

        it('defaults callbacks to null when no options provided', () => {
            controller = new WordDropController(null, mockStatsService);
            expect(controller.onGameEnd).toBeNull();
            expect(controller.onCorrectAnswer).toBeNull();
            expect(controller.onIncorrectAnswer).toBeNull();
        });
    });

    describe('streak integration callbacks', () => {
        it('calls onCorrectAnswer when answer is correct', () => {
            const onCorrectAnswer = vi.fn();
            controller = new WordDropController(null, mockStatsService, { onCorrectAnswer });

            controller.start({ countries: [makeCountry('France')], survival: false });

            // Simulate a correct answer by triggering guess then submitting
            controller.triggerGuess();

            // Mock the service to return correct
            vi.spyOn(controller.service, 'validateAnswer').mockReturnValue({
                correct: true,
                score: 60,
                word: 'FRANCE',
            });
            vi.spyOn(controller.view, 'getElapsedAnswerSeconds').mockReturnValue(2);

            controller.handleAnswerSubmitted('France');

            expect(onCorrectAnswer).toHaveBeenCalledTimes(1);
        });

        it('calls onIncorrectAnswer when answer is wrong', () => {
            const onIncorrectAnswer = vi.fn();
            controller = new WordDropController(null, mockStatsService, { onIncorrectAnswer });

            controller.start({ countries: [makeCountry('France')], survival: false });

            controller.triggerGuess();

            vi.spyOn(controller.service, 'validateAnswer').mockReturnValue({
                correct: false,
                score: -15,
                word: 'FRANCE',
            });
            vi.spyOn(controller.view, 'getElapsedAnswerSeconds').mockReturnValue(2);

            controller.handleAnswerSubmitted('Wrong');

            expect(onIncorrectAnswer).toHaveBeenCalledTimes(1);
        });

        it('calls onIncorrectAnswer on answer timeout', () => {
            const onIncorrectAnswer = vi.fn();
            controller = new WordDropController(null, mockStatsService, { onIncorrectAnswer });

            controller.start({ countries: [makeCountry('France')], survival: false });

            // Simulate the answer timeout
            controller.triggerGuess();
            controller.handleAnswerTimeout();

            expect(onIncorrectAnswer).toHaveBeenCalledTimes(1);
        });

        it('calls onIncorrectAnswer when word completes without answer', () => {
            const onIncorrectAnswer = vi.fn();
            controller = new WordDropController(null, mockStatsService, { onIncorrectAnswer });

            controller.start({ countries: [makeCountry('France'), makeCountry('Spain')], survival: false });

            // Simulate word completion without answer
            controller.handleWordCompleted();

            expect(onIncorrectAnswer).toHaveBeenCalledTimes(1);
        });
    });

    describe('endGame routing through onGameEnd', () => {
        it('calls onGameEnd callback instead of showing modal when managed', () => {
            const onGameEnd = vi.fn();
            controller = new WordDropController(null, mockStatsService, { onGameEnd });

            controller.start({ countries: [makeCountry('France')], survival: false });
            controller.currentIndex = 1;
            controller.totalScore = 60;

            controller.endGame();

            expect(onGameEnd).toHaveBeenCalledWith(expect.objectContaining({
                totalScore: 60,
                roundsReached: 1,
            }));
            // Should NOT record stats directly when managed by GameSessionManager
            expect(mockStatsService.recordGame).not.toHaveBeenCalled();
        });

        it('records stats directly in legacy mode (no onGameEnd)', () => {
            controller = new WordDropController(null, mockStatsService);

            controller.start({ countries: [makeCountry('France')], survival: true });
            controller.currentIndex = 1;
            controller.totalScore = 60;

            controller.endGame();

            expect(mockStatsService.recordGame).toHaveBeenCalled();
        });
    });

    describe('stop and destroy lifecycle', () => {
        it('stop() deactivates the controller', () => {
            controller = new WordDropController(null, mockStatsService);
            controller.start({ countries: [makeCountry('France')] });

            expect(controller.isActive).toBe(true);
            controller.stop();
            expect(controller.isActive).toBe(false);
        });

        it('destroy() deactivates and clears timers', () => {
            controller = new WordDropController(null, mockStatsService);
            controller.start({ countries: [makeCountry('France')] });

            controller.destroy();
            expect(controller.isActive).toBe(false);
        });
    });
});

describe('GameSessionManager letrasEnCaida integration', () => {
    let container;
    let manager;
    let pool;
    let mockStatsService;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        pool = createTestPool();

        mockStatsService = {
            recordGame: vi.fn(),
            recordIndividualGame: vi.fn(),
            recordCountryCorrect: vi.fn(),
            getStats: vi.fn().mockReturnValue({
                totalCorrect: 50,
                currentStreak: 0,
                uniqueCountriesCorrect: [],
            }),
        };
    });

    afterEach(() => {
        if (manager) {
            manager.destroy();
            manager = null;
        }
        if (container && container.parentNode) {
            document.body.removeChild(container);
        }
        vi.restoreAllMocks();
        localStorage.removeItem('flagquiz_modes_completed');
        localStorage.removeItem('flagquiz_powerups_used');
    });

    it('starts a letrasEnCaida session via GameSessionManager', () => {
        manager = new GameSessionManager({ container, statsService: mockStatsService });
        manager.startSession('letrasEnCaida', {
            modeOptions: { difficulty: 'easy', category: 'country', speed: 'normal' }
        }, pool);

        expect(manager.isActive).toBe(true);
        expect(manager.session.modeId).toBe('letrasEnCaida');
        expect(manager.activeController).toBeInstanceOf(WordDropController);
    });

    it('passes config through to WordDropController', () => {
        manager = new GameSessionManager({ container, statsService: mockStatsService });
        manager.startSession('letrasEnCaida', {
            modeOptions: { difficulty: 'hard', category: 'capital', speed: 'fast', survival: true }
        }, pool);

        const ctrl = manager.activeController;
        expect(ctrl.category).toBe('capital');
        expect(ctrl.speed).toBe('fast');
        expect(ctrl.difficulty).toBe('hard');
        expect(ctrl.isSurvivalMode).toBe(true);
    });

    it('increments streak on correct answer via callback', () => {
        manager = new GameSessionManager({ container, statsService: mockStatsService });
        manager.startSession('letrasEnCaida', { modeOptions: {} }, pool);

        // Simulate correct answer callback
        manager.handleLetrasCorrect();

        expect(manager.session.streak).toBe(1);
        expect(manager.streakService.count).toBe(1);
    });

    it('resets streak on incorrect answer via callback', () => {
        manager = new GameSessionManager({ container, statsService: mockStatsService });
        manager.startSession('letrasEnCaida', { modeOptions: {} }, pool);

        // Build up a streak
        manager.handleLetrasCorrect();
        manager.handleLetrasCorrect();
        expect(manager.session.streak).toBe(2);

        // Incorrect resets
        manager.handleLetrasIncorrect();

        expect(manager.session.streak).toBe(0);
        expect(manager.session.multiplier).toBe(1.0);
    });

    it('applies streak multiplier thresholds correctly', () => {
        manager = new GameSessionManager({ container, statsService: mockStatsService });
        manager.startSession('letrasEnCaida', { modeOptions: {} }, pool);

        // 3 correct → gold tier (1.5x)
        manager.handleLetrasCorrect();
        manager.handleLetrasCorrect();
        manager.handleLetrasCorrect();

        expect(manager.session.streak).toBe(3);
        expect(manager.session.multiplier).toBe(1.5);
    });

    it('routes end-game through endSession()', () => {
        const onSessionEnd = vi.fn();
        manager = new GameSessionManager({ container, statsService: mockStatsService, onSessionEnd });
        manager.startSession('letrasEnCaida', { modeOptions: {} }, pool);

        // Simulate the controller ending the game
        const ctrl = manager.activeController;
        ctrl.currentIndex = 3;
        ctrl.totalScore = 150;
        ctrl.endGame();

        expect(onSessionEnd).toHaveBeenCalled();
        expect(manager.isActive).toBe(false);
    });

    it('records stats through GameSessionManager on end', () => {
        manager = new GameSessionManager({ container, statsService: mockStatsService });
        manager.startSession('letrasEnCaida', { modeOptions: {} }, pool);

        // Simulate the controller ending the game
        const ctrl = manager.activeController;
        ctrl.currentIndex = 2;
        ctrl.totalScore = 100;
        ctrl.endGame();

        expect(mockStatsService.recordIndividualGame).toHaveBeenCalled();
    });

    it('WordDropController has stop() and destroy() methods for lifecycle', () => {
        manager = new GameSessionManager({ container, statsService: mockStatsService });
        manager.startSession('letrasEnCaida', { modeOptions: {} }, pool);

        const ctrl = manager.activeController;
        expect(typeof ctrl.stop).toBe('function');
        expect(typeof ctrl.destroy).toBe('function');
    });
});
