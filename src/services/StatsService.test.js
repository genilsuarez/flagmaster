import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StatsService } from './StatsService.js';

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: vi.fn((key) => store[key] ?? null),
        setItem: vi.fn((key, value) => { store[key] = value; }),
        removeItem: vi.fn((key) => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; }),
        _getStore: () => store,
    };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('StatsService', () => {
    let service;

    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
        service = new StatsService();
    });

    describe('recordIndividualGame()', () => {
        it('updates global stats (gamesPlayed, totalCorrect, totalWrong)', () => {
            service.recordIndividualGame({
                modeId: 'flagRush',
                totalScore: 5000,
                correct: 8,
                wrong: 2,
                elapsedSeconds: 90,
            });

            const stats = service.getStats();
            expect(stats.gamesPlayed).toBe(1);
            expect(stats.totalCorrect).toBe(8);
            expect(stats.totalWrong).toBe(2);
        });

        it('tracks per-mode stats (gamesPlayed, totalScore, bestScore, totalCorrect)', () => {
            service.recordIndividualGame({
                modeId: 'flagRush',
                totalScore: 5000,
                correct: 8,
                wrong: 2,
                elapsedSeconds: 90,
            });

            const modeStats = service.getModeStats('flagRush');
            expect(modeStats.gamesPlayed).toBe(1);
            expect(modeStats.totalScore).toBe(5000);
            expect(modeStats.bestScore).toBe(5000);
            expect(modeStats.totalCorrect).toBe(8);
        });

        it('accumulates per-mode stats across multiple games', () => {
            service.recordIndividualGame({
                modeId: 'capitalClash',
                totalScore: 3000,
                correct: 5,
                wrong: 1,
                elapsedSeconds: 60,
            });
            service.recordIndividualGame({
                modeId: 'capitalClash',
                totalScore: 4000,
                correct: 7,
                wrong: 0,
                elapsedSeconds: 50,
            });

            const modeStats = service.getModeStats('capitalClash');
            expect(modeStats.gamesPlayed).toBe(2);
            expect(modeStats.totalScore).toBe(7000);
            expect(modeStats.bestScore).toBe(4000);
            expect(modeStats.totalCorrect).toBe(12);
        });

        it('tracks different modes independently', () => {
            service.recordIndividualGame({
                modeId: 'flagRush',
                totalScore: 2000,
                correct: 4,
                wrong: 1,
                elapsedSeconds: 30,
            });
            service.recordIndividualGame({
                modeId: 'streakBlitz',
                totalScore: 8000,
                correct: 12,
                wrong: 3,
                elapsedSeconds: 90,
            });

            expect(service.getModeStats('flagRush').gamesPlayed).toBe(1);
            expect(service.getModeStats('streakBlitz').gamesPlayed).toBe(1);
            expect(service.getModeStats('flagRush').bestScore).toBe(2000);
            expect(service.getModeStats('streakBlitz').bestScore).toBe(8000);
        });

        it('updates bestScore only when new score is higher', () => {
            service.recordIndividualGame({
                modeId: 'flagRush',
                totalScore: 5000,
                correct: 8,
                wrong: 2,
                elapsedSeconds: 90,
            });
            service.recordIndividualGame({
                modeId: 'flagRush',
                totalScore: 3000,
                correct: 5,
                wrong: 3,
                elapsedSeconds: 80,
            });

            expect(service.getModeStats('flagRush').bestScore).toBe(5000);
        });

        it('updates modesCompleted in localStorage', () => {
            service.recordIndividualGame({
                modeId: 'geoPuzzle',
                totalScore: 1000,
                correct: 3,
                wrong: 0,
                elapsedSeconds: 120,
            });

            const modes = service.getModesCompleted();
            expect(modes).toContain('geoPuzzle');
        });

        it('does not duplicate modes in modesCompleted', () => {
            service.recordIndividualGame({
                modeId: 'flagRush',
                totalScore: 1000,
                correct: 3,
                wrong: 0,
                elapsedSeconds: 30,
            });
            service.recordIndividualGame({
                modeId: 'flagRush',
                totalScore: 2000,
                correct: 5,
                wrong: 1,
                elapsedSeconds: 40,
            });

            const modes = service.getModesCompleted();
            expect(modes.filter(m => m === 'flagRush')).toHaveLength(1);
        });

        it('updates powerUpsUsed counter in localStorage', () => {
            service.recordIndividualGame({
                modeId: 'streakBlitz',
                totalScore: 5000,
                correct: 10,
                wrong: 2,
                elapsedSeconds: 90,
                powerUpsUsed: 3,
            });

            expect(service.getPowerUpsUsed()).toBe(3);
        });

        it('accumulates powerUpsUsed across sessions', () => {
            service.recordIndividualGame({
                modeId: 'streakBlitz',
                totalScore: 5000,
                correct: 10,
                wrong: 2,
                elapsedSeconds: 90,
                powerUpsUsed: 3,
            });
            service.recordIndividualGame({
                modeId: 'flagRush',
                totalScore: 3000,
                correct: 5,
                wrong: 1,
                elapsedSeconds: 60,
                powerUpsUsed: 2,
            });

            expect(service.getPowerUpsUsed()).toBe(5);
        });

        it('does not update powerUpsUsed when count is 0', () => {
            service.recordIndividualGame({
                modeId: 'flagRush',
                totalScore: 1000,
                correct: 3,
                wrong: 0,
                elapsedSeconds: 30,
                powerUpsUsed: 0,
            });

            expect(service.getPowerUpsUsed()).toBe(0);
        });
    });

    describe('getModeStats()', () => {
        it('returns default stats for a mode with no games', () => {
            const stats = service.getModeStats('supervivencia');
            expect(stats).toEqual({
                gamesPlayed: 0,
                totalScore: 0,
                bestScore: 0,
                totalCorrect: 0,
            });
        });
    });

    describe('getAllModeStats()', () => {
        it('returns all per-mode stats', () => {
            service.recordIndividualGame({
                modeId: 'flagRush',
                totalScore: 1000,
                correct: 3,
                wrong: 0,
                elapsedSeconds: 30,
            });
            service.recordIndividualGame({
                modeId: 'capitalClash',
                totalScore: 2000,
                correct: 5,
                wrong: 1,
                elapsedSeconds: 45,
            });

            const allStats = service.getAllModeStats();
            expect(allStats.flagRush).toBeDefined();
            expect(allStats.capitalClash).toBeDefined();
            expect(allStats.flagRush.gamesPlayed).toBe(1);
            expect(allStats.capitalClash.gamesPlayed).toBe(1);
        });
    });

    describe('persistence', () => {
        it('persists modeStats to localStorage', () => {
            service.recordIndividualGame({
                modeId: 'flagRush',
                totalScore: 5000,
                correct: 8,
                wrong: 2,
                elapsedSeconds: 90,
            });

            // Create a new service instance to verify persistence
            const service2 = new StatsService();
            const modeStats = service2.getModeStats('flagRush');
            expect(modeStats.gamesPlayed).toBe(1);
            expect(modeStats.bestScore).toBe(5000);
        });
    });

    describe('backward compatibility', () => {
        it('recordGame() still works for legacy callers', () => {
            service.recordGame({ correct: 5, wrong: 2, elapsedSeconds: 30 });

            const stats = service.getStats();
            expect(stats.gamesPlayed).toBe(1);
            expect(stats.totalCorrect).toBe(5);
            expect(stats.totalWrong).toBe(2);
        });

        it('loads stats without modeStats field gracefully', () => {
            const oldData = {
                gamesPlayed: 10,
                totalCorrect: 50,
                totalWrong: 20,
                bestTimeSeconds: 45,
                currentStreak: 3,
                longestStreak: 7,
                lastPlayedDate: '2024-01-15',
                uniqueCountriesCorrect: ['FR', 'DE'],
                achievements: { explorer: true, sniper: false, lightning: false, conqueror: false, persistent: false },
            };
            localStorageMock.setItem('flagquiz_stats_v1', JSON.stringify(oldData));

            const svc = new StatsService();
            const stats = svc.getStats();
            expect(stats.gamesPlayed).toBe(10);
            expect(stats.totalCorrect).toBe(50);
            expect(stats.modeStats).toEqual({});
        });

        it('loads stats without lastPlayedMode field gracefully', () => {
            const oldData = {
                gamesPlayed: 5,
                totalCorrect: 20,
                totalWrong: 5,
                bestTimeSeconds: 30,
                currentStreak: 2,
                longestStreak: 4,
                lastPlayedDate: '2024-03-10',
                uniqueCountriesCorrect: ['FR'],
                achievements: { explorer: true, sniper: false, lightning: false, conqueror: false, persistent: false },
                modeStats: { flagRush: { gamesPlayed: 3, totalScore: 9000, bestScore: 4000, totalCorrect: 15 } },
            };
            localStorageMock.setItem('flagquiz_stats_v1', JSON.stringify(oldData));

            const svc = new StatsService();
            expect(svc.getLastPlayedMode()).toBeNull();
        });
    });

    describe('getLastPlayedMode()', () => {
        it('returns null when no game has been played', () => {
            expect(service.getLastPlayedMode()).toBeNull();
        });

        it('returns the mode ID after recording an individual game', () => {
            service.recordIndividualGame({
                modeId: 'flagRush',
                totalScore: 5000,
                correct: 8,
                wrong: 2,
                elapsedSeconds: 90,
            });

            expect(service.getLastPlayedMode()).toBe('flagRush');
        });

        it('returns the most recently played mode', () => {
            service.recordIndividualGame({
                modeId: 'flagRush',
                totalScore: 5000,
                correct: 8,
                wrong: 2,
                elapsedSeconds: 90,
            });
            service.recordIndividualGame({
                modeId: 'capitalClash',
                totalScore: 3000,
                correct: 5,
                wrong: 1,
                elapsedSeconds: 60,
            });

            expect(service.getLastPlayedMode()).toBe('capitalClash');
        });

        it('persists lastPlayedMode across service instances', () => {
            service.recordIndividualGame({
                modeId: 'streakBlitz',
                totalScore: 7000,
                correct: 12,
                wrong: 3,
                elapsedSeconds: 120,
            });

            const service2 = new StatsService();
            expect(service2.getLastPlayedMode()).toBe('streakBlitz');
        });

        it('is included in getStats() response', () => {
            service.recordIndividualGame({
                modeId: 'geoPuzzle',
                totalScore: 2000,
                correct: 4,
                wrong: 0,
                elapsedSeconds: 60,
            });

            const stats = service.getStats();
            expect(stats.lastPlayedMode).toBe('geoPuzzle');
        });
    });
});
