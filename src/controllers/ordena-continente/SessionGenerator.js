/**
 * SessionGenerator — Genera la distribución de ítems para una sesión de "Ordena por Continente".
 *
 * Función pura: mismos inputs → misma estructura (salvo aleatoriedad interna).
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

/**
 * Mapa de continentes a sus etiquetas en español.
 */
const CONTINENT_LABELS = {
    Africa: 'África',
    America: 'América',
    Asia: 'Asia',
    Europe: 'Europa',
    Oceania: 'Oceanía',
};

/**
 * Genera un ID único para la sesión.
 * Usa crypto.randomUUID() si está disponible, sino genera un UUID v4 simple.
 * @returns {string}
 */
function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    // Fallback: UUID v4 simple
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * Baraja un array usando Fisher-Yates (no muta el original).
 * @template T
 * @param {T[]} array
 * @returns {T[]}
 */
function shuffle(array) {
    const result = array.slice();
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * Genera la distribución de ítems y zonas para una sesión.
 *
 * @param {Array<Object>} pool - Array de países del dataset flags.json
 * @param {Object} modeOptions - Opciones de configuración del modo
 * @param {number} modeOptions.itemCount - Cantidad de ítems a generar
 * @param {string[]} modeOptions.continents - Continentes seleccionados (ej: ['Africa', 'America'])
 * @param {'flags'|'capitals'} modeOptions.itemType - Tipo de ítem a mostrar
 * @returns {{ items: Array<Object>, zones: Array<Object> }}
 * @throws {Error} Si se seleccionan menos de 2 continentes
 */
export function generateSession(pool, modeOptions) {
    const { itemCount, continents, itemType } = modeOptions;

    // Validar mínimo de continentes
    if (!continents || continents.length < 2) {
        throw new Error('Se requieren al menos 2 continentes para iniciar una sesión');
    }

    // Normalizar acceso a propiedades: soportar tanto Country model instances
    // (isSovereign, continent, capital, flagUrl, englishName, spanishName)
    // como objetos raw de flags.json (Sovereign_State, Continent, Capital_Spanish, etc.)
    const getSovereign = (c) => c.isSovereign !== undefined ? c.isSovereign : c.Sovereign_State === 'Yes';
    const getContinent = (c) => c.continent || c.Continent;
    const getCapital = (c) => c.capital !== undefined ? c.capital : (c.Capital_Spanish || '');
    const getFlagUrl = (c) => c.flagUrl || c.Flag_URL;
    const getCountryId = (c) => c.englishName || c.Country_English || c.spanishName || c.Country_Spanish;

    // Filtrar pool: solo países soberanos
    let filteredPool = pool.filter((country) => getSovereign(country));

    // Si itemType es "capitals", excluir países con capital vacía o "Desconocida"
    if (itemType === 'capitals') {
        filteredPool = filteredPool.filter(
            (country) => {
                const cap = getCapital(country);
                return cap && cap.trim() !== '' && cap !== 'Desconocida';
            }
        );
    }

    // Agrupar países disponibles por continente seleccionado
    const countriesByContinent = {};
    for (const continent of continents) {
        countriesByContinent[continent] = shuffle(
            filteredPool.filter((country) => getContinent(country) === continent)
        );
    }

    // Distribuir ítems equitativamente
    const numContinents = continents.length;
    const baseQuota = Math.floor(itemCount / numContinents);
    let remainder = itemCount % numContinents;

    // Asignar cuotas iniciales (base + 1 extra para los primeros 'remainder' continentes, aleatorizado)
    const shuffledContinents = shuffle(continents.slice());
    const quotas = {};
    for (let i = 0; i < shuffledContinents.length; i++) {
        const continent = shuffledContinents[i];
        quotas[continent] = baseQuota + (i < remainder ? 1 : 0);
    }

    // Seleccionar países respetando cuotas y redistribuir faltantes
    const selectedByContinent = {};
    let deficit = 0;

    for (const continent of continents) {
        const available = countriesByContinent[continent];
        const quota = quotas[continent];

        if (available.length >= quota) {
            selectedByContinent[continent] = available.slice(0, quota);
        } else {
            // Tomar todos los disponibles, acumular déficit
            selectedByContinent[continent] = available.slice();
            deficit += quota - available.length;
        }
    }

    // Redistribuir déficit entre continentes con disponibilidad restante
    if (deficit > 0) {
        for (const continent of shuffle(continents.slice())) {
            if (deficit <= 0) break;

            const alreadySelected = selectedByContinent[continent].length;
            const available = countriesByContinent[continent];
            const remaining = available.length - alreadySelected;

            if (remaining > 0) {
                const toTake = Math.min(remaining, deficit);
                const additional = available.slice(alreadySelected, alreadySelected + toTake);
                selectedByContinent[continent] = selectedByContinent[continent].concat(additional);
                deficit -= toTake;
            }
        }
    }

    // Generar GameItems
    const items = [];
    for (const continent of continents) {
        const countries = selectedByContinent[continent];
        for (const country of countries) {
            const capital = getCapital(country);
            const flagUrl = getFlagUrl(country);
            const displayValue = itemType === 'capitals' ? capital : flagUrl;
            const displayType = itemType === 'capitals' ? 'capital' : 'flag';

            items.push({
                id: generateId(),
                countryId: getCountryId(country),
                continent: getContinent(country),
                flagUrl,
                capital,
                displayValue,
                displayType,
            });
        }
    }

    // Generar Zones
    const zones = continents.map((continent) => ({
        id: generateId(),
        continent,
        label: CONTINENT_LABELS[continent] || continent,
    }));

    return {
        items: shuffle(items),
        zones,
    };
}
