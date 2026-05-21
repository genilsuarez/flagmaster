import { describe, it, expect, beforeEach } from 'vitest';
import { PowerUpService } from './PowerUpService.js';

describe('PowerUpService', () => {
    let service;

    beforeEach(() => {
        service = new PowerUpService();
    });

    describe('constants', () => {
        it('has MAX_INVENTORY of 3', () => {
            expect(PowerUpService.MAX_INVENTORY).toBe(3);
        });

        it('has GRANTS at streak 3, 5, 7, 10', () => {
            const streaks = PowerUpService.GRANTS.map(g => g.streak);
            expect(streaks).toEqual([3, 5, 7, 10]);
        });

        it('maps correct power-up types to streak thresholds', () => {
            expect(PowerUpService.GRANTS[0]).toEqual({ streak: 3, type: 'timeExtra' });
            expect(PowerUpService.GRANTS[1]).toEqual({ streak: 5, type: 'fiftyFifty' });
            expect(PowerUpService.GRANTS[2]).toEqual({ streak: 7, type: 'freeze' });
            expect(PowerUpService.GRANTS[3]).toEqual({ streak: 10, type: 'doublePoints' });
        });
    });

    describe('checkGrant', () => {
        it('returns null for non-grant streak counts', () => {
            expect(service.checkGrant(1)).toBeNull();
            expect(service.checkGrant(2)).toBeNull();
            expect(service.checkGrant(4)).toBeNull();
            expect(service.checkGrant(6)).toBeNull();
        });

        it('grants timeExtra at streak 3', () => {
            const result = service.checkGrant(3);
            expect(result).toEqual({ granted: 'timeExtra' });
            expect(service.inventory).toContain('timeExtra');
        });

        it('grants fiftyFifty at streak 5', () => {
            const result = service.checkGrant(5);
            expect(result).toEqual({ granted: 'fiftyFifty' });
            expect(service.inventory).toContain('fiftyFifty');
        });

        it('grants freeze at streak 7', () => {
            const result = service.checkGrant(7);
            expect(result).toEqual({ granted: 'freeze' });
            expect(service.inventory).toContain('freeze');
        });

        it('grants doublePoints at streak 10', () => {
            const result = service.checkGrant(10);
            expect(result).toEqual({ granted: 'doublePoints' });
            expect(service.inventory).toContain('doublePoints');
        });

        it('returns { full: true } when inventory is at max', () => {
            service.checkGrant(3);
            service.checkGrant(5);
            service.checkGrant(7);
            expect(service.inventory.length).toBe(3);

            const result = service.checkGrant(10);
            expect(result).toEqual({ full: true });
            expect(service.inventory.length).toBe(3);
        });
    });

    describe('activate', () => {
        beforeEach(() => {
            service.checkGrant(3);  // adds timeExtra
            service.checkGrant(5);  // adds fiftyFifty
        });

        it('activates a power-up from inventory', () => {
            const result = service.activate('timeExtra', 'multipleChoice');
            expect(result).toEqual({ success: true, effect: 'timeExtra' });
            expect(service.inventory).not.toContain('timeExtra');
        });

        it('blocks 50/50 on non-multipleChoice questions', () => {
            const result = service.activate('fiftyFifty', 'freeText');
            expect(result).toEqual({ success: false, error: 'notApplicable' });
            expect(service.inventory).toContain('fiftyFifty');
        });

        it('allows 50/50 on multipleChoice questions', () => {
            const result = service.activate('fiftyFifty', 'multipleChoice');
            expect(result).toEqual({ success: true, effect: 'fiftyFifty' });
        });

        it('enforces 1-per-question limit', () => {
            service.activate('timeExtra', 'multipleChoice');
            const result = service.activate('fiftyFifty', 'multipleChoice');
            expect(result).toEqual({ success: false, error: 'alreadyUsedThisQuestion' });
        });

        it('returns error for power-up not in inventory', () => {
            const result = service.activate('freeze', 'multipleChoice');
            expect(result).toEqual({ success: false, error: 'notInInventory' });
        });

        it('returns error for invalid power-up id', () => {
            service.inventory.push('invalidType');
            const result = service.activate('invalidType', 'multipleChoice');
            expect(result).toEqual({ success: false, error: 'invalidPowerUp' });
        });
    });

    describe('resetQuestionState', () => {
        it('allows activation again after reset', () => {
            service.checkGrant(3);
            service.checkGrant(5);
            service.activate('timeExtra', 'multipleChoice');

            service.resetQuestionState();

            const result = service.activate('fiftyFifty', 'multipleChoice');
            expect(result).toEqual({ success: true, effect: 'fiftyFifty' });
        });
    });

    describe('reset', () => {
        it('clears inventory and activation state', () => {
            service.checkGrant(3);
            service.checkGrant(5);
            service.activate('timeExtra', 'multipleChoice');

            service.reset();

            expect(service.inventory).toEqual([]);
            expect(service.activatedThisQuestion).toBe(false);
        });
    });
});
