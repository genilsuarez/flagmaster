/**
 * Test script for the 3-level preference hierarchy.
 * Run in browser console while the app is open at localhost:5173.
 *
 * Tests all combinations:
 *   A. Solo defaults (sin global, sin local)
 *   B. Solo global (sin local)
 *   C. Solo local (sin global)
 *   D. Global + local (local debe ganar)
 *   E. Default + global + local (local debe ganar)
 *   F. Datos legacy (local sin campos de filtro — global debe ganar)
 */

const GLOBAL_KEY = 'flagquiz_global_defaults';
const LOCAL_PREFIX = 'flagquiz_mode_config_';
const TEST_MODE = 'flagRush';
const LOCAL_KEY = LOCAL_PREFIX + TEST_MODE;

// ─── Helpers ────────────────────────────────────────────────────────────────

function backup() {
    return {
        global: localStorage.getItem(GLOBAL_KEY),
        local:  localStorage.getItem(LOCAL_KEY),
    };
}

function restore(bak) {
    if (bak.global !== null) localStorage.setItem(GLOBAL_KEY, bak.global);
    else localStorage.removeItem(GLOBAL_KEY);
    if (bak.local !== null) localStorage.setItem(LOCAL_KEY, bak.local);
    else localStorage.removeItem(LOCAL_KEY);
}

function readState() {
    // Read what BottomSheetView would compute by simulating open()
    const FACTORY = { continent: 'All', sovereigntyStatus: 'All', maxCount: null, randomOrder: true };

    // Level 1: factory
    let state = { ...FACTORY };

    // Level 2: global
    const rawGlobal = localStorage.getItem(GLOBAL_KEY);
    if (rawGlobal) {
        try {
            const g = JSON.parse(rawGlobal);
            if (g.continent)         state.continent         = g.continent;
            if (g.sovereigntyStatus) state.sovereigntyStatus = g.sovereigntyStatus;
            if (g.maxCount != null)  state.maxCount          = g.maxCount;
            if (typeof g.randomOrder === 'boolean') state.randomOrder = g.randomOrder;
        } catch {}
    }

    // Level 3: local
    const rawLocal = localStorage.getItem(LOCAL_KEY);
    if (rawLocal) {
        try {
            const l = JSON.parse(rawLocal);
            if (l.continent !== undefined)         state.continent         = l.continent;
            if (l.sovereigntyStatus !== undefined) state.sovereigntyStatus = l.sovereigntyStatus;
            if (l.countryCount !== undefined)      state.maxCount          = l.countryCount;
            if (typeof l.randomOrder === 'boolean') state.randomOrder      = l.randomOrder;
        } catch {}
    }

    return state;
}

function assert(label, actual, expected) {
    const pass = JSON.stringify(actual) === JSON.stringify(expected);
    const icon = pass ? '✅' : '❌';
    if (!pass) {
        console.error(`${icon} ${label}`);
        console.error('   Expected:', expected);
        console.error('   Got:     ', actual);
    } else {
        console.log(`${icon} ${label}`);
    }
    return pass;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

function runTests() {
    const bak = backup();
    let passed = 0, failed = 0;

    console.group('🧪 Preference Hierarchy Tests');

    // ── A. Solo defaults (sin global, sin local) ──────────────────────────
    localStorage.removeItem(GLOBAL_KEY);
    localStorage.removeItem(LOCAL_KEY);
    {
        const s = readState();
        const ok = assert(
            'A. Solo defaults → continent=All, sovereignty=All, maxCount=null, randomOrder=true',
            { continent: s.continent, sovereigntyStatus: s.sovereigntyStatus, maxCount: s.maxCount, randomOrder: s.randomOrder },
            { continent: 'All', sovereigntyStatus: 'All', maxCount: null, randomOrder: true }
        );
        ok ? passed++ : failed++;
    }

    // ── B. Solo global (sin local) ────────────────────────────────────────
    localStorage.setItem(GLOBAL_KEY, JSON.stringify({ continent: 'Europe', sovereigntyStatus: 'Yes', maxCount: 30, randomOrder: false }));
    localStorage.removeItem(LOCAL_KEY);
    {
        const s = readState();
        const ok = assert(
            'B. Solo global → continent=Europe, sovereignty=Yes, maxCount=30, randomOrder=false',
            { continent: s.continent, sovereigntyStatus: s.sovereigntyStatus, maxCount: s.maxCount, randomOrder: s.randomOrder },
            { continent: 'Europe', sovereigntyStatus: 'Yes', maxCount: 30, randomOrder: false }
        );
        ok ? passed++ : failed++;
    }

    // ── C. Solo local (sin global) ────────────────────────────────────────
    localStorage.removeItem(GLOBAL_KEY);
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ continent: 'Asia', sovereigntyStatus: 'No', countryCount: 20, randomOrder: true, modeOptions: {} }));
    {
        const s = readState();
        const ok = assert(
            'C. Solo local (sin global) → continent=Asia, sovereignty=No, maxCount=20, randomOrder=true',
            { continent: s.continent, sovereigntyStatus: s.sovereigntyStatus, maxCount: s.maxCount, randomOrder: s.randomOrder },
            { continent: 'Asia', sovereigntyStatus: 'No', maxCount: 20, randomOrder: true }
        );
        ok ? passed++ : failed++;
    }

    // ── D. Global + local (local debe ganar en todos los campos) ──────────
    localStorage.setItem(GLOBAL_KEY, JSON.stringify({ continent: 'Europe', sovereigntyStatus: 'Yes', maxCount: 30, randomOrder: false }));
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ continent: 'America', sovereigntyStatus: 'All', countryCount: 15, randomOrder: true, modeOptions: {} }));
    {
        const s = readState();
        const ok = assert(
            'D. Global + local → local gana: continent=America, sovereignty=All, maxCount=15, randomOrder=true',
            { continent: s.continent, sovereigntyStatus: s.sovereigntyStatus, maxCount: s.maxCount, randomOrder: s.randomOrder },
            { continent: 'America', sovereigntyStatus: 'All', maxCount: 15, randomOrder: true }
        );
        ok ? passed++ : failed++;
    }

    // ── E. Local con countryCount=null (usuario borró el campo) ───────────
    localStorage.setItem(GLOBAL_KEY, JSON.stringify({ continent: 'Africa', sovereigntyStatus: 'All', maxCount: 50, randomOrder: true }));
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ continent: 'Africa', sovereigntyStatus: 'All', countryCount: null, randomOrder: true, modeOptions: {} }));
    {
        const s = readState();
        const ok = assert(
            'E. Local countryCount=null → maxCount=null (null explícito prevalece sobre global 50)',
            { maxCount: s.maxCount },
            { maxCount: null }
        );
        ok ? passed++ : failed++;
    }

    // ── F. Datos legacy (local sin campos de filtro) ──────────────────────
    localStorage.setItem(GLOBAL_KEY, JSON.stringify({ continent: 'Oceania', sovereigntyStatus: 'Yes', maxCount: 25, randomOrder: false }));
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ modeOptions: { timePerQuestion: 15, rounds: 20 } }));
    // Legacy local: no tiene continent, sovereigntyStatus, countryCount
    {
        const s = readState();
        const ok = assert(
            'F. Legacy local (sin filtros) → global gana: continent=Oceania, sovereignty=Yes, maxCount=25',
            { continent: s.continent, sovereigntyStatus: s.sovereigntyStatus, maxCount: s.maxCount },
            { continent: 'Oceania', sovereigntyStatus: 'Yes', maxCount: 25 }
        );
        ok ? passed++ : failed++;
    }

    // ── G. Local parcial (solo continent, sin los otros) ─────────────────
    localStorage.setItem(GLOBAL_KEY, JSON.stringify({ continent: 'Europe', sovereigntyStatus: 'Yes', maxCount: 30, randomOrder: false }));
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ continent: 'Asia', modeOptions: {} }));
    // Local solo tiene continent — los demás deben venir del global
    {
        const s = readState();
        const ok = assert(
            'G. Local parcial (solo continent=Asia) → continent=Asia, resto del global: sovereignty=Yes, maxCount=30, randomOrder=false',
            { continent: s.continent, sovereigntyStatus: s.sovereigntyStatus, maxCount: s.maxCount, randomOrder: s.randomOrder },
            { continent: 'Asia', sovereigntyStatus: 'Yes', maxCount: 30, randomOrder: false }
        );
        ok ? passed++ : failed++;
    }

    // ── H. Sin global, local parcial (solo continent) ────────────────────
    localStorage.removeItem(GLOBAL_KEY);
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ continent: 'Africa', modeOptions: {} }));
    {
        const s = readState();
        const ok = assert(
            'H. Sin global, local parcial (continent=Africa) → continent=Africa, resto factory: sovereignty=All, maxCount=null, randomOrder=true',
            { continent: s.continent, sovereigntyStatus: s.sovereigntyStatus, maxCount: s.maxCount, randomOrder: s.randomOrder },
            { continent: 'Africa', sovereigntyStatus: 'All', maxCount: null, randomOrder: true }
        );
        ok ? passed++ : failed++;
    }

    // ─── Resultado ────────────────────────────────────────────────────────
    console.groupEnd();
    console.log(`\n📊 Resultado: ${passed} pasaron, ${failed} fallaron de ${passed + failed} tests`);

    // Restaurar estado original
    restore(bak);
    console.log('🔄 Estado de localStorage restaurado al original');

    return { passed, failed };
}

runTests();
