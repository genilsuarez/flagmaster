import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OrdenaContinenteController } from './OrdenaContinenteController.js';

/**
 * Helper: creates a minimal pool of countries for testing.
 */
function createTestPool() {
    return [
        { Country_English: 'Spain', Country_Spanish: 'España', Continent: 'Europe', Sovereign_State: 'Yes', Flag_URL: 'https://flags/es.svg', Capital_Spanish: 'Madrid' },
        { Country_English: 'France', Country_Spanish: 'Francia', Continent: 'Europe', Sovereign_State: 'Yes', Flag_URL: 'https://flags/fr.svg', Capital_Spanish: 'París' },
        { Country_English: 'Germany', Country_Spanish: 'Alemania', Continent: 'Europe', Sovereign_State: 'Yes', Flag_URL: 'https://flags/de.svg', Capital_Spanish: 'Berlín' },
        { Country_English: 'Nigeria', Country_Spanish: 'Nigeria', Continent: 'Africa', Sovereign_State: 'Yes', Flag_URL: 'https://flags/ng.svg', Capital_Spanish: 'Abuya' },
        { Country_English: 'Egypt', Country_Spanish: 'Egipto', Continent: 'Africa', Sovereign_State: 'Yes', Flag_URL: 'https://flags/eg.svg', Capital_Spanish: 'El Cairo' },
        { Country_English: 'Kenya', Country_Spanish: 'Kenia', Continent: 'Africa', Sovereign_State: 'Yes', Flag_URL: 'https://flags/ke.svg', Capital_Spanish: 'Nairobi' },
    ];
}

function createDefaultOptions() {
    return {
        itemCount: 6,
        continents: ['Europe', 'Africa'],
        itemType: 'flags',
        timerMode: 'off',
    };
}

describe('OrdenaContinenteController', () => {
    let container;
    let onRoundEnd;
    let onGameEnd;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        onRoundEnd = vi.fn();
        onGameEnd = vi.fn();

        // Mock matchMedia for pointer detection (default: fine pointer / desktop)
        window.matchMedia = vi.fn().mockImplementation((query) => ({
            matches: query === '(pointer: fine)',
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        }));
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    describe('constructor', () => {
        it('initializes with correct defaults', () => {
            const ctrl = new OrdenaContinenteController({ container, onRoundEnd, onGameEnd });

            expect(ctrl.container).toBe(container);
            expect(ctrl.onRoundEnd).toBe(onRoundEnd);
            expect(ctrl.onGameEnd).toBe(onGameEnd);
            expect(ctrl.roundHistory).toEqual([]);
            expect(ctrl.isActive).toBe(false);
        });
    });

    describe('start', () => {
        it('initializes session state and renders view', () => {
            const ctrl = new OrdenaContinenteController({ container, onRoundEnd, onGameEnd });
            ctrl.start(createTestPool(), createDefaultOptions());

            expect(ctrl.isActive).toBe(true);
            expect(ctrl._state).not.toBeNull();
            expect(ctrl._state.items.length).toBe(6);
            expect(ctrl._state.zones.length).toBe(2);
            expect(ctrl._state.pendingItems.size).toBe(6);
            expect(ctrl._state.assignments.size).toBe(0);
            expect(ctrl._state.isEvaluated).toBe(false);
        });

        it('creates DragDropHandler for fine pointer devices', () => {
            const ctrl = new OrdenaContinenteController({ container, onRoundEnd, onGameEnd });
            ctrl.start(createTestPool(), createDefaultOptions());

            expect(ctrl._handler).toBeDefined();
            expect(ctrl._handler.constructor.name).toBe('DragDropHandler');
        });

        it('creates TapToAssignHandler for coarse pointer devices', () => {
            window.matchMedia = vi.fn().mockImplementation((query) => ({
                matches: false, // coarse pointer
                media: query,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            }));

            const ctrl = new OrdenaContinenteController({ container, onRoundEnd, onGameEnd });
            ctrl.start(createTestPool(), createDefaultOptions());

            expect(ctrl._handler).toBeDefined();
            expect(ctrl._handler.constructor.name).toBe('TapToAssignHandler');
        });

        it('renders the view with items and zones', () => {
            const ctrl = new OrdenaContinenteController({ container, onRoundEnd, onGameEnd });
            ctrl.start(createTestPool(), createDefaultOptions());

            // Check that the view rendered items
            const items = container.querySelectorAll('.oc-item');
            expect(items.length).toBe(6);

            // Check that zones are rendered
            const zones = container.querySelectorAll('.oc-zone');
            expect(zones.length).toBe(2);
        });
    });

    describe('_handleAssign', () => {
        it('moves item from pending to assigned zone', () => {
            const ctrl = new OrdenaContinenteController({ container, onRoundEnd, onGameEnd });
            ctrl.start(createTestPool(), createDefaultOptions());

            const itemId = ctrl._state.items[0].id;
            const zoneId = ctrl._state.zones[0].id;

            ctrl._handleAssign(itemId, zoneId);

            expect(ctrl._state.assignments.has(itemId)).toBe(true);
            expect(ctrl._state.assignments.get(itemId)).toBe(zoneId);
            expect(ctrl._state.pendingItems.has(itemId)).toBe(false);
        });

        it('updates counter after assignment', () => {
            const ctrl = new OrdenaContinenteController({ container, onRoundEnd, onGameEnd });
            ctrl.start(createTestPool(), createDefaultOptions());

            const itemId = ctrl._state.items[0].id;
            const zoneId = ctrl._state.zones[0].id;

            ctrl._handleAssign(itemId, zoneId);

            const counter = container.querySelector('.oc-counter');
            expect(counter.textContent).toBe('5 / 6');
        });

        it('enables verify button when all items are assigned', () => {
            const ctrl = new OrdenaContinenteController({ container, onRoundEnd, onGameEnd });
            ctrl.start(createTestPool(), createDefaultOptions());

            const zoneId = ctrl._state.zones[0].id;

            // Assign all items
            for (const item of ctrl._state.items) {
                ctrl._handleAssign(item.id, zoneId);
            }

            const verifyBtn = container.querySelector('.oc-verify-btn');
            expect(verifyBtn.disabled).toBe(false);
        });

        it('is a no-op after evaluation', () => {
            const ctrl = new OrdenaContinenteController({ container, onRoundEnd, onGameEnd });
            ctrl.start(createTestPool(), createDefaultOptions());

            const zoneId = ctrl._state.zones[0].id;

            // Assign all and verify
            for (const item of ctrl._state.items) {
                ctrl._handleAssign(item.id, zoneId);
            }
            ctrl._handleVerify();

            // Try to assign again — should be no-op
            const newItemId = 'fake-item';
            ctrl._handleAssign(newItemId, zoneId);
            expect(ctrl._state.assignments.has(newItemId)).toBe(false);
        });
    });

    describe('_handleUnassign', () => {
        it('returns item to pending set', () => {
            const ctrl = new OrdenaContinenteController({ container, onRoundEnd, onGameEnd });
            ctrl.start(createTestPool(), createDefaultOptions());

            const itemId = ctrl._state.items[0].id;
            const zoneId = ctrl._state.zones[0].id;

            ctrl._handleAssign(itemId, zoneId);
            ctrl._handleUnassign(itemId);

            expect(ctrl._state.pendingItems.has(itemId)).toBe(true);
            expect(ctrl._state.assignments.has(itemId)).toBe(false);
        });

        it('disables verify button after unassignment', () => {
            const ctrl = new OrdenaContinenteController({ container, onRoundEnd, onGameEnd });
            ctrl.start(createTestPool(), createDefaultOptions());

            const zoneId = ctrl._state.zones[0].id;

            // Assign all
            for (const item of ctrl._state.items) {
                ctrl._handleAssign(item.id, zoneId);
            }

            // Unassign one
            ctrl._handleUnassign(ctrl._state.items[0].id);

            const verifyBtn = container.querySelector('.oc-verify-btn');
            expect(verifyBtn.disabled).toBe(true);
        });

        it('is a no-op after evaluation', () => {
            const ctrl = new OrdenaContinenteController({ container, onRoundEnd, onGameEnd });
            ctrl.start(createTestPool(), createDefaultOptions());

            const zoneId = ctrl._state.zones[0].id;

            // Assign all and verify
            for (const item of ctrl._state.items) {
                ctrl._handleAssign(item.id, zoneId);
            }
            ctrl._handleVerify();

            // Try to unassign — should be no-op
            const itemId = ctrl._state.items[0].id;
            ctrl._handleUnassign(itemId);
            expect(ctrl._state.assignments.has(itemId)).toBe(true);
        });
    });

    describe('_handleReassign', () => {
        it('moves item between zones without passing through panel', () => {
            const ctrl = new OrdenaContinenteController({ container, onRoundEnd, onGameEnd });
            ctrl.start(createTestPool(), createDefaultOptions());

            const itemId = ctrl._state.items[0].id;
            const zone1Id = ctrl._state.zones[0].id;
            const zone2Id = ctrl._state.zones[1].id;

            ctrl._handleAssign(itemId, zone1Id);
            ctrl._handleReassign(itemId, zone2Id);

            expect(ctrl._state.assignments.get(itemId)).toBe(zone2Id);
            // Item should NOT be in pending
            expect(ctrl._state.pendingItems.has(itemId)).toBe(false);
        });

        it('is a no-op when reassigning to the same zone', () => {
            const ctrl = new OrdenaContinenteController({ container, onRoundEnd, onGameEnd });
            ctrl.start(createTestPool(), createDefaultOptions());

            const itemId = ctrl._state.items[0].id;
            const zoneId = ctrl._state.zones[0].id;

            ctrl._handleAssign(itemId, zoneId);
            ctrl._handleReassign(itemId, zoneId);

            expect(ctrl._state.assignments.get(itemId)).toBe(zoneId);
        });
    });

    describe('_handleVerify', () => {
        it('evaluates assignments and invokes onGameEnd after continue', () => {
            const ctrl = new OrdenaContinenteController({ container, onRoundEnd, onGameEnd });
            ctrl.start(createTestPool(), createDefaultOptions());

            const zoneId = ctrl._state.zones[0].id;

            // Assign all items to first zone
            for (const item of ctrl._state.items) {
                ctrl._handleAssign(item.id, zoneId);
            }

            ctrl._handleVerify();

            expect(ctrl._state.isEvaluated).toBe(true);
            // onGameEnd is deferred until user clicks continue
            expect(onGameEnd).not.toHaveBeenCalled();

            // Simulate clicking the continue button
            const continueBtn = container.querySelector('.oc-continue-btn');
            expect(continueBtn).not.toBeNull();
            continueBtn.click();

            expect(onGameEnd).toHaveBeenCalledTimes(1);

            const gameEndData = onGameEnd.mock.calls[0][0];
            expect(gameEndData).toHaveProperty('totalScore');
            expect(gameEndData).toHaveProperty('roundHistory');
            expect(gameEndData).toHaveProperty('totalRounds', 1);
            expect(gameEndData.roundHistory).toHaveLength(1);
        });

        it('invokes onRoundEnd with round data', () => {
            const ctrl = new OrdenaContinenteController({ container, onRoundEnd, onGameEnd });
            ctrl.start(createTestPool(), createDefaultOptions());

            const zoneId = ctrl._state.zones[0].id;
            for (const item of ctrl._state.items) {
                ctrl._handleAssign(item.id, zoneId);
            }

            ctrl._handleVerify();

            expect(onRoundEnd).toHaveBeenCalledTimes(1);
            const roundData = onRoundEnd.mock.calls[0][0];
            expect(roundData).toHaveProperty('score');
            expect(roundData).toHaveProperty('correct');
            expect(roundData).toHaveProperty('incorrect');
            expect(roundData).toHaveProperty('total', 6);
            expect(roundData).toHaveProperty('timeElapsed');
            expect(roundData).toHaveProperty('results');
        });

        it('sets roundHistory with one entry', () => {
            const ctrl = new OrdenaContinenteController({ container, onRoundEnd, onGameEnd });
            ctrl.start(createTestPool(), createDefaultOptions());

            const zoneId = ctrl._state.zones[0].id;
            for (const item of ctrl._state.items) {
                ctrl._handleAssign(item.id, zoneId);
            }

            ctrl._handleVerify();

            expect(ctrl.roundHistory).toHaveLength(1);
            expect(ctrl.roundHistory[0].total).toBe(6);
        });

        it('disables handler after evaluation', () => {
            const ctrl = new OrdenaContinenteController({ container, onRoundEnd, onGameEnd });
            ctrl.start(createTestPool(), createDefaultOptions());

            const zoneId = ctrl._state.zones[0].id;
            for (const item of ctrl._state.items) {
                ctrl._handleAssign(item.id, zoneId);
            }

            const disableSpy = vi.spyOn(ctrl._handler, 'disable');
            ctrl._handleVerify();

            expect(disableSpy).toHaveBeenCalled();
        });
    });

    describe('_handleTimeout', () => {
        it('marks pending items as incorrect and invokes onGameEnd after continue', () => {
            const ctrl = new OrdenaContinenteController({ container, onRoundEnd, onGameEnd });
            ctrl.start(createTestPool(), { ...createDefaultOptions(), timerMode: 'on', timeLimit: 60 });

            // Assign only 3 items correctly
            const europeZone = ctrl._state.zones.find(z => z.continent === 'Europe');
            const europeItems = ctrl._state.items.filter(i => i.continent === 'Europe');
            for (const item of europeItems) {
                ctrl._handleAssign(item.id, europeZone.id);
            }

            // Simulate timeout
            ctrl._handleTimeout();

            expect(ctrl._state.isEvaluated).toBe(true);
            // onGameEnd is deferred until user clicks continue
            expect(onGameEnd).not.toHaveBeenCalled();

            // Simulate clicking the continue button
            const continueBtn = container.querySelector('.oc-continue-btn');
            expect(continueBtn).not.toBeNull();
            continueBtn.click();

            expect(onGameEnd).toHaveBeenCalledTimes(1);

            const gameEndData = onGameEnd.mock.calls[0][0];
            // 3 correct (Europe items in Europe zone) + 3 incorrect (Africa items unassigned)
            expect(gameEndData.roundHistory[0].correct).toBe(3);
            expect(gameEndData.roundHistory[0].incorrect).toBe(3);
        });
    });

    describe('timer', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('starts timer when timerMode is on', () => {
            const ctrl = new OrdenaContinenteController({ container, onRoundEnd, onGameEnd });
            ctrl.start(createTestPool(), { ...createDefaultOptions(), timerMode: 'on', timeLimit: 60 });

            expect(ctrl._timerInterval).not.toBeNull();
            expect(ctrl._timerRemaining).toBe(60);
        });

        it('does not start timer when timerMode is off', () => {
            const ctrl = new OrdenaContinenteController({ container, onRoundEnd, onGameEnd });
            ctrl.start(createTestPool(), createDefaultOptions());

            expect(ctrl._timerInterval).toBeNull();
        });

        it('decrements timer every second', () => {
            const ctrl = new OrdenaContinenteController({ container, onRoundEnd, onGameEnd });
            ctrl.start(createTestPool(), { ...createDefaultOptions(), timerMode: 'on', timeLimit: 60 });

            vi.advanceTimersByTime(3000);

            expect(ctrl._timerRemaining).toBe(57);
        });

        it('triggers timeout when timer reaches 0', () => {
            const ctrl = new OrdenaContinenteController({ container, onRoundEnd, onGameEnd });
            ctrl.start(createTestPool(), { ...createDefaultOptions(), timerMode: 'on', timeLimit: 5 });

            vi.advanceTimersByTime(5000);

            expect(ctrl._state.isEvaluated).toBe(true);
            // onGameEnd is deferred until user clicks continue
            expect(onGameEnd).not.toHaveBeenCalled();

            // Simulate clicking the continue button
            const continueBtn = container.querySelector('.oc-continue-btn');
            expect(continueBtn).not.toBeNull();
            continueBtn.click();

            expect(onGameEnd).toHaveBeenCalled();
        });

        it('pauses timer on visibility hidden', () => {
            const ctrl = new OrdenaContinenteController({ container, onRoundEnd, onGameEnd });
            ctrl.start(createTestPool(), { ...createDefaultOptions(), timerMode: 'on', timeLimit: 60 });

            vi.advanceTimersByTime(2000);
            expect(ctrl._timerRemaining).toBe(58);

            // Simulate visibility hidden
            Object.defineProperty(document, 'hidden', { value: true, writable: true });
            document.dispatchEvent(new Event('visibilitychange'));

            vi.advanceTimersByTime(5000);
            // Timer should still be at 58 because it's paused
            expect(ctrl._timerRemaining).toBe(58);

            // Simulate visibility visible
            Object.defineProperty(document, 'hidden', { value: false, writable: true });
            document.dispatchEvent(new Event('visibilitychange'));

            vi.advanceTimersByTime(2000);
            expect(ctrl._timerRemaining).toBe(56);
        });
    });

    describe('stop', () => {
        it('stops timer and disables handler without triggering onGameEnd', () => {
            const ctrl = new OrdenaContinenteController({ container, onRoundEnd, onGameEnd });
            ctrl.start(createTestPool(), { ...createDefaultOptions(), timerMode: 'on', timeLimit: 60 });

            ctrl.stop();

            expect(ctrl._timerInterval).toBeNull();
            expect(ctrl.isActive).toBe(false);
            expect(onGameEnd).not.toHaveBeenCalled();
        });
    });

    describe('destroy', () => {
        it('cleans up timer, handler, and view', () => {
            const ctrl = new OrdenaContinenteController({ container, onRoundEnd, onGameEnd });
            ctrl.start(createTestPool(), createDefaultOptions());

            ctrl.destroy();

            expect(ctrl._handler).toBeNull();
            expect(ctrl._view).toBeNull();
            expect(ctrl._state).toBeNull();
            expect(ctrl.isActive).toBe(false);
        });
    });
});
