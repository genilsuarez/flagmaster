/**
 * EvaluationEngine - Evalúa las asignaciones del jugador contra los datos reales.
 * Función pura: determinista dado assignments + items.
 *
 * @param {Map<string, string>|Object<string, string>} assignments - Mapa itemId → zoneId (continente asignado)
 * @param {Array<{id: string, continent: string}>} items - Array de GameItem con id y continent real
 * @returns {{results: Array<{itemId: string, assignedZone: string, correctZone: string, isCorrect: boolean}>, score: number, correct: number, incorrect: number}}
 */
export function evaluate(assignments, items) {
    const assignmentMap = assignments instanceof Map
        ? assignments
        : new Map(Object.entries(assignments));

    let correct = 0;
    let incorrect = 0;

    const results = items.map(item => {
        const assignedZone = assignmentMap.get(item.id) || null;
        const correctZone = item.continent;
        const isCorrect = assignedZone === correctZone;

        if (isCorrect) {
            correct++;
        } else {
            incorrect++;
        }

        return {
            itemId: item.id,
            assignedZone,
            correctZone,
            isCorrect,
        };
    });

    const total = items.length;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;

    return { results, score, correct, incorrect };
}
