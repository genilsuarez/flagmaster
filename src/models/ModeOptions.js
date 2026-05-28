/**
 * Mode-specific option definitions for the BottomSheetView configuration panel.
 * Each mode defines its own set of configurable options with schema:
 * { id, label, type, default, min?, max?, options? }
 *
 * Consumed by BottomSheetView and any component needing mode configuration metadata.
 */
export const MODE_OPTIONS = {
    flagRush: [
        { id: 'timePerQuestion', label: 'Tiempo por pregunta (s)', type: 'number', default: 10, min: 5, max: 30 },
        { id: 'rounds', label: 'Número de rondas', type: 'number', default: 10, min: 5, max: 50 },
    ],
    capitalClash: [
        { id: 'timePerQuestion', label: 'Tiempo por pregunta (s)', type: 'number', default: 15, min: 5, max: 30 },
        { id: 'variant', label: 'Variante', type: 'select', options: [
            { value: 'default', label: 'País → Capital' },
            { value: 'inverse', label: 'Capital → País' },
        ], default: 'default' },
        { id: 'rounds', label: 'Número de rondas', type: 'number', default: 10, min: 5, max: 50 },
    ],
    streakBlitz: [
        { id: 'endCondition', label: 'Condición de fin', type: 'select', options: [
            { value: 'time', label: '⚡ Contrarreloj (90s)' },
            { value: 'lives', label: '💀 Supervivencia (3 vidas)' },
        ], default: 'time' },
        { id: 'sessionTime', label: 'Tiempo de sesión (s)', type: 'number', default: 90, min: 30, max: 180 },
        { id: 'timePerQuestion', label: 'Tiempo por pregunta (s)', type: 'number', default: 10, min: 5, max: 20 },
    ],
    geoPuzzle: [
        { id: 'rounds', label: 'Número de rondas', type: 'number', default: 10, min: 3, max: 30 },
    ],
    banderaFlash: [],
    capitalQuest: [
        { id: 'hintMode', label: 'Pista', type: 'select', options: [
            { value: 'flagAndName', label: 'Bandera + Nombre del país' },
            { value: 'flagOnly', label: 'Solo bandera' },
            { value: 'nameOnly', label: 'Solo nombre del país' },
        ], default: 'flagAndName' },
    ],
    letrasEnCaida: [
        { id: 'difficulty', label: 'Dificultad', type: 'select', options: [
            { value: 'easy',   label: '🟢 Fácil — Bandera + pista' },
            { value: 'medium', label: '🟡 Medio — Solo bandera' },
            { value: 'hard',   label: '🔴 Difícil — Sin pista' },
        ], default: 'easy' },
        { id: 'category', label: 'Categoría', type: 'select', options: [
            { value: 'country', label: '🌍 Países (adivina el país)' },
            { value: 'capital', label: '🏛️ Capitales (adivina la capital)' },
        ], default: 'country' },
        { id: 'speed', label: 'Velocidad', type: 'select', options: [
            { value: 'slow', label: '🐢 Lento' },
            { value: 'normal', label: '⚡ Normal' },
            { value: 'fast', label: '🚀 Rápido' },
        ], default: 'normal' },
    ],
};

/**
 * Returns the options array for a given mode ID.
 * @param {string} modeId - The mode identifier (e.g. 'flagRush', 'capitalQuest')
 * @returns {Array<{id: string, label: string, type: string, default: *, min?: number, max?: number, options?: Array<{value: string, label: string}>}>}
 */
export function getOptionsForMode(modeId) {
    return MODE_OPTIONS[modeId] || [];
}
