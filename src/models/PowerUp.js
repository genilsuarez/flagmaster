/**
 * Power-up type definitions and constants
 */
export const POWER_UP_TYPES = {
    timeExtra:    { id: 'timeExtra',    icon: '🕐', name: 'Tiempo Extra',  streakRequired: 3,  applicableTo: 'all' },
    fiftyFifty:   { id: 'fiftyFifty',   icon: '✂️', name: '50/50',         streakRequired: 5,  applicableTo: 'multipleChoice' },
    freeze:       { id: 'freeze',       icon: '❄️', name: 'Congelar',      streakRequired: 7,  applicableTo: 'all' },
    doublePoints: { id: 'doublePoints', icon: '💎', name: 'Doble Puntos',  streakRequired: 10, applicableTo: 'all' },
};
