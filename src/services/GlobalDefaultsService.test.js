import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GlobalDefaultsService } from './GlobalDefaultsService.js';

describe('GlobalDefaultsService', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        localStorage.clear();
    });

    describe('get()', () => {
        it('returns factory defaults when nothing is stored', () => {
            const svc = new GlobalDefaultsService();
            expect(svc.get()).toEqual({
                continent: 'All',
                sovereigntyStatus: 'All',
                maxCount: null,
                randomOrder: true,
            });
        });

        it('returns stored values when present', () => {
            localStorage.setItem('flagquiz_global_defaults', JSON.stringify({
                continent: 'Europe',
                sovereigntyStatus: 'Yes',
                maxCount: 30,
                randomOrder: false,
            }));
            const svc = new GlobalDefaultsService();
            expect(svc.get()).toEqual({
                continent: 'Europe',
                sovereigntyStatus: 'Yes',
                maxCount: 30,
                randomOrder: false,
            });
        });

        it('returns a copy, not a reference', () => {
            const svc = new GlobalDefaultsService();
            const a = svc.get();
            a.continent = 'Asia';
            expect(svc.get().continent).toBe('All');
        });
    });

    describe('set()', () => {
        it('updates individual fields', () => {
            const svc = new GlobalDefaultsService();
            svc.set({ continent: 'Asia' });
            expect(svc.get().continent).toBe('Asia');
            expect(svc.get().sovereigntyStatus).toBe('All'); // unchanged
        });

        it('persists to localStorage', () => {
            const svc = new GlobalDefaultsService();
            svc.set({ continent: 'America', maxCount: 50 });
            const stored = JSON.parse(localStorage.getItem('flagquiz_global_defaults'));
            expect(stored.continent).toBe('America');
            expect(stored.maxCount).toBe(50);
        });

        it('notifies listeners on change', () => {
            const svc = new GlobalDefaultsService();
            const fn = vi.fn();
            svc.onChange(fn);
            svc.set({ continent: 'Africa' });
            expect(fn).toHaveBeenCalledOnce();
            expect(fn.mock.calls[0][0].continent).toBe('Africa');
        });
    });

    describe('onChange()', () => {
        it('returns an unsubscribe function', () => {
            const svc = new GlobalDefaultsService();
            const fn = vi.fn();
            const unsub = svc.onChange(fn);
            unsub();
            svc.set({ continent: 'Asia' });
            expect(fn).not.toHaveBeenCalled();
        });
    });

    describe('validation on load', () => {
        it('ignores invalid continent values', () => {
            localStorage.setItem('flagquiz_global_defaults', JSON.stringify({ continent: 'Mars' }));
            const svc = new GlobalDefaultsService();
            expect(svc.get().continent).toBe('All');
        });

        it('ignores invalid sovereigntyStatus values', () => {
            localStorage.setItem('flagquiz_global_defaults', JSON.stringify({ sovereigntyStatus: 'Maybe' }));
            const svc = new GlobalDefaultsService();
            expect(svc.get().sovereigntyStatus).toBe('All');
        });

        it('ignores maxCount below 5', () => {
            localStorage.setItem('flagquiz_global_defaults', JSON.stringify({ maxCount: 2 }));
            const svc = new GlobalDefaultsService();
            expect(svc.get().maxCount).toBeNull();
        });

        it('handles corrupted JSON gracefully', () => {
            localStorage.setItem('flagquiz_global_defaults', 'not-json');
            const svc = new GlobalDefaultsService();
            expect(svc.get()).toEqual({
                continent: 'All',
                sovereigntyStatus: 'All',
                maxCount: null,
                randomOrder: true,
            });
        });
    });
});
