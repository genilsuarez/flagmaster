import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AchievementService, ACHIEVEMENTS } from './AchievementService.js';

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

describe('AchievementService', () => {
    let service;

    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
        service = new AchievementService();
    });

    describe('ACHIEVEMENTS constant', () => {
        it('defines 11 achievements', () => {
            expect(Object.keys(ACHIEVEMENTS)).toHaveLength(11);
        });

        it('includes the 5 existing achievements', () => {
            expect(ACHIEVEMENTS.explorer).toBeDefined();
            expect(ACHIEVEMENTS.sniper).toBeDefined();
            expect(ACHIEVEMENTS.lightning).toBeDefined();
            expect(ACHIEVEMENTS.conqueror).toBeDefined();
            expect(ACHIEVEMENTS.persistent).toBeDefined();
        });

        it('includes the 6 new achievements', () => {
            expect(ACHIEVEMENTS.imparable).toBeDefined();
            expect(ACHIEVEMENTS.erudito).toBeDefined();
            expect(ACHIEVEMENTS.velocista).toBeDefined();
            expect(ACHIEVEMENTS.cartografo).toBeDefined();
            expect(ACHIEVEMENTS.coleccionista).toBeDefined();
            expect(ACHIEVEMENTS.superviviente).toBeDefined();
        });

        it('each achievement has id, icon, name, and condition', () => {
            for (const [key, achievement] of Object.entries(ACHIEVEMENTS)) {
                expect(achievement.id).toBe(key);
                expect(achievement.icon).toBeTruthy();
                expect(achievement.name).toBeTruthy();
                expect(achievement.condition).toBeTruthy();
            }
        });
    });

    describe('persistence', () => {
        it('uses flagquiz_achievements_v2 localStorage key', () => {
            service.save();
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'flagquiz_achievements_v2',
                expect.any(String)
            );
        });

        it('loads from flagquiz_achievements_v2 on construction', () => {
            localStorageMock.setItem('flagquiz_achievements_v2', JSON.stringify({ explorer: true }));
            const svc = new AchievementService();
            expect(svc.isUnlocked('explorer')).toBe(true);
        });

        it('starts with all achievements locked when no data exists', () => {
            const unlocked = service.getUnlocked();
            for (const value of Object.values(unlocked)) {
                expect(value).toBe(false);
            }
        });
    });

    describe('migration from old stats format', () => {
        it('migrates achievements from flagquiz_stats_v1 when v2 key is absent', () => {
            const oldStats = {
                gamesPlayed: 5,
                totalCorrect: 20,
                achievements: {
                    explorer: true,
                    sniper: false,
                    lightning: true,
                    conqueror: false,
                    persistent: false,
                },
            };
            localStorageMock.setItem('flagquiz_stats_v1', JSON.stringify(oldStats));

            const svc = new AchievementService();
            expect(svc.isUnlocked('explorer')).toBe(true);
            expect(svc.isUnlocked('lightning')).toBe(true);
            expect(svc.isUnlocked('sniper')).toBe(false);
        });

        it('persists migrated data to the new key', () => {
            const oldStats = {
                achievements: { explorer: true, sniper: true },
            };
            localStorageMock.setItem('flagquiz_stats_v1', JSON.stringify(oldStats));

            new AchievementService();
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'flagquiz_achievements_v2',
                expect.any(String)
            );
        });

        it('does not migrate if v2 key already exists', () => {
            const oldStats = { achievements: { explorer: true } };
            localStorageMock.setItem('flagquiz_stats_v1', JSON.stringify(oldStats));
            localStorageMock.setItem('flagquiz_achievements_v2', JSON.stringify({ explorer: false }));

            const svc = new AchievementService();
            // Should use v2 data, not migrate from v1
            expect(svc.isUnlocked('explorer')).toBe(false);
        });
    });

    describe('check()', () => {
        const baseSession = {
            correct: 0,
            wrong: 0,
            totalQuestions: 0,
            elapsedSeconds: 0,
            maxStreak: 0,
            roundsReached: 0,
            avgResponseTime: null,
            modeId: 'flagRush',
        };

        const baseStats = {
            totalCorrect: 0,
            currentStreak: 0,
            uniqueCountriesCorrect: [],
            modesCompleted: [],
            powerUpsUsed: 0,
            continentCompleted: false,
        };

        it('unlocks explorer when totalCorrect >= 10', () => {
            const result = service.check(baseSession, { ...baseStats, totalCorrect: 10 });
            expect(result).toContain('explorer');
            expect(service.isUnlocked('explorer')).toBe(true);
        });

        it('unlocks sniper when maxStreak >= 10 in session', () => {
            const result = service.check({ ...baseSession, maxStreak: 10 }, baseStats);
            expect(result).toContain('sniper');
        });

        it('unlocks lightning when game < 60s with correct > 0', () => {
            const result = service.check(
                { ...baseSession, elapsedSeconds: 45, correct: 5 },
                baseStats
            );
            expect(result).toContain('lightning');
        });

        it('does not unlock lightning when elapsedSeconds is 0', () => {
            const result = service.check(
                { ...baseSession, elapsedSeconds: 0, correct: 5 },
                baseStats
            );
            expect(result).not.toContain('lightning');
        });

        it('unlocks conqueror when continentCompleted is true', () => {
            const result = service.check(baseSession, { ...baseStats, continentCompleted: true });
            expect(result).toContain('conqueror');
        });

        it('unlocks persistent when currentStreak >= 7', () => {
            const result = service.check(baseSession, { ...baseStats, currentStreak: 7 });
            expect(result).toContain('persistent');
        });

        it('unlocks imparable when maxStreak >= 20', () => {
            const result = service.check({ ...baseSession, maxStreak: 20 }, baseStats);
            expect(result).toContain('imparable');
        });

        it('unlocks erudito when 100% correct in 30+ questions', () => {
            const result = service.check(
                { ...baseSession, correct: 30, wrong: 0, totalQuestions: 30 },
                baseStats
            );
            expect(result).toContain('erudito');
        });

        it('does not unlock erudito with any wrong answers', () => {
            const result = service.check(
                { ...baseSession, correct: 29, wrong: 1, totalQuestions: 30 },
                baseStats
            );
            expect(result).not.toContain('erudito');
        });

        it('does not unlock erudito with fewer than 30 questions', () => {
            const result = service.check(
                { ...baseSession, correct: 20, wrong: 0, totalQuestions: 20 },
                baseStats
            );
            expect(result).not.toContain('erudito');
        });

        it('unlocks velocista when avg < 2s in 10+ questions', () => {
            const result = service.check(
                { ...baseSession, totalQuestions: 15, avgResponseTime: 1.8 },
                baseStats
            );
            expect(result).toContain('velocista');
        });

        it('does not unlock velocista with fewer than 10 questions', () => {
            const result = service.check(
                { ...baseSession, totalQuestions: 5, avgResponseTime: 1.5 },
                baseStats
            );
            expect(result).not.toContain('velocista');
        });

        it('unlocks cartografo when all 7 modes completed', () => {
            const allModes = ['banderaFlash', 'capitalQuest', 'letrasEnCaida', 'flagRush', 'capitalClash', 'streakBlitz', 'geoPuzzle'];
            const result = service.check(baseSession, { ...baseStats, modesCompleted: allModes });
            expect(result).toContain('cartografo');
        });

        it('does not unlock cartografo with fewer than 7 modes', () => {
            const result = service.check(baseSession, { ...baseStats, modesCompleted: ['flagRush', 'capitalClash'] });
            expect(result).not.toContain('cartografo');
        });

        it('unlocks coleccionista when powerUpsUsed >= 50', () => {
            const result = service.check(baseSession, { ...baseStats, powerUpsUsed: 50 });
            expect(result).toContain('coleccionista');
        });

        it('unlocks superviviente when round 50 reached in streakBlitz', () => {
            const result = service.check(
                { ...baseSession, modeId: 'streakBlitz', roundsReached: 50 },
                baseStats
            );
            expect(result).toContain('superviviente');
        });

        it('does not unlock superviviente in other modes', () => {
            const result = service.check(
                { ...baseSession, modeId: 'flagRush', roundsReached: 50 },
                baseStats
            );
            expect(result).not.toContain('superviviente');
        });

        it('does not re-unlock already unlocked achievements', () => {
            service.check(baseSession, { ...baseStats, totalCorrect: 10 });
            const result = service.check(baseSession, { ...baseStats, totalCorrect: 20 });
            expect(result).not.toContain('explorer');
        });

        it('returns multiple newly unlocked achievements at once', () => {
            const result = service.check(
                { ...baseSession, maxStreak: 20, correct: 30, wrong: 0, totalQuestions: 30 },
                { ...baseStats, totalCorrect: 50 }
            );
            expect(result).toContain('explorer');
            expect(result).toContain('sniper');
            expect(result).toContain('imparable');
            expect(result).toContain('erudito');
        });

        it('persists state after unlocking achievements', () => {
            service.check(baseSession, { ...baseStats, totalCorrect: 10 });
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'flagquiz_achievements_v2',
                expect.stringContaining('"explorer":true')
            );
        });

        it('does not persist when no new achievements are unlocked', () => {
            vi.clearAllMocks();
            service.check(baseSession, baseStats);
            expect(localStorageMock.setItem).not.toHaveBeenCalled();
        });
    });

    describe('getUnlocked()', () => {
        it('returns a copy of the unlocked state', () => {
            const unlocked = service.getUnlocked();
            unlocked.explorer = true;
            expect(service.isUnlocked('explorer')).toBe(false);
        });
    });

    describe('reset()', () => {
        it('resets all achievements to locked', () => {
            service.check(
                { correct: 0, wrong: 0, totalQuestions: 0, elapsedSeconds: 0, maxStreak: 0, roundsReached: 0, avgResponseTime: null, modeId: 'flagRush' },
                { totalCorrect: 10, currentStreak: 0, modesCompleted: [], powerUpsUsed: 0, continentCompleted: false }
            );
            expect(service.isUnlocked('explorer')).toBe(true);

            service.reset();
            expect(service.isUnlocked('explorer')).toBe(false);
        });
    });
});
