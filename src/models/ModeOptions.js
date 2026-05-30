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
    ],
    capitalClash: [
        { id: 'timePerQuestion', label: 'Tiempo por pregunta (s)', type: 'number', default: 15, min: 5, max: 30 },
        { id: 'variant', label: 'Variante', type: 'select', options: [
            { value: 'default', label: '🏳️→🏙️ País → Capital' },
            { value: 'inverse', label: '🏙️→🏳️ Capital → País' },
        ], default: 'default' },
    ],
    streakBlitz: [
        { id: 'endCondition', label: 'Condición de fin', type: 'select', options: [
            { value: 'time', label: '⚡ Contrarreloj' },
            { value: 'lives', label: '💀 Supervivencia' },
        ], default: 'time' },
        // sessionTime is only shown when endCondition === 'time'.
        // It is rendered conditionally by BottomSheetView, not as a static field.
        { id: 'sessionTime', label: 'Tiempo de sesión (s)', type: 'number', default: 90, min: 30, max: 600, _conditionalOn: { id: 'endCondition', value: 'time' } },
        { id: 'timePerQuestion', label: 'Tiempo por pregunta (s)', type: 'number', default: 10, min: 5, max: 20 },
    ],
    geoPuzzle: [],
    banderaFlash: [],
    capitalQuest: [
        { id: 'hintMode', label: 'Pista', type: 'select', options: [
            { value: 'flagAndName', label: '🏳️+📝 Bandera+Nombre' },
            { value: 'flagOnly', label: '🏳️ Bandera' },
            { value: 'nameOnly', label: '📝 Nombre' },
        ], default: 'flagAndName' },
    ],
    letrasEnCaida: [
        { id: 'difficulty', label: 'Dificultad', type: 'select', options: [
            { value: 'easy',   label: '🟢 Fácil' },
            { value: 'medium', label: '🟡 Medio' },
            { value: 'hard',   label: '🔴 Difícil' },
        ], default: 'easy' },
        { id: 'category', label: 'Categoría', type: 'select', options: [
            { value: 'country', label: '🌍 Países' },
            { value: 'capital', label: '🏛️ Capitales' },
        ], default: 'country' },
        { id: 'speed', label: 'Velocidad', type: 'select', options: [
            { value: 'slow', label: '🐢 Lento' },
            { value: 'normal', label: '⚡ Normal' },
            { value: 'fast', label: '🚀 Rápido' },
        ], default: 'normal' },
    ],
    ordenaContinente: [
        { id: 'itemCount', label: 'Cantidad de ítems', type: 'number', default: 10, min: 6, max: 24 },
        { id: 'continents', label: 'Continentes', type: 'multiSelect', options: [
            { value: 'Africa', label: 'África' },
            { value: 'America', label: 'América' },
            { value: 'Asia', label: 'Asia' },
            { value: 'Europe', label: 'Europa' },
            { value: 'Oceania', label: 'Oceanía' },
        ], default: ['Africa', 'America', 'Asia', 'Europe', 'Oceania'] },
        { id: 'itemType', label: 'Tipo de ítem', type: 'select', options: [
            { value: 'flags', label: '🏳️ Banderas' },
            { value: 'capitals', label: '🏛️ Capitales' },
        ], default: 'flags' },
        { id: 'timerMode', label: 'Temporizador', type: 'select', options: [
            { value: 'off', label: '♾️ Sin tiempo' },
            { value: 'on', label: '⏱️ Con tiempo' },
        ], default: 'off' },
        { id: 'timeLimit', label: 'Tiempo límite (s)', type: 'number', default: 120, min: 30, max: 300,
          _conditionalOn: { id: 'timerMode', value: 'on' } },
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
