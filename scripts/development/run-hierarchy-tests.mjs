/**
 * Node.js test runner for the 3-level preference hierarchy logic.
 * Simulates exactly what BottomSheetView.open() + _loadSavedConfig() does.
 *
 * Run: node scripts/development/run-hierarchy-tests.mjs
 */

const FACTORY = { continent: 'All', sovereigntyStatus: 'All', maxCount: null, randomOrder: true };

// Simula localStorage con un Map simple
function makeStorage() {
    const store = new Map();
    return {
        getItem:    (k) => store.has(k) ? store.get(k) : null,
        setItem:    (k, v) => store.set(k, v),
        removeItem: (k) => store.delete(k),
    };
}

/**
 * Simula exactamente la lógica de BottomSheetView.open() + _loadSavedConfig().
 * Niveles:
 *   1. Factory defaults
 *   2. Global (flagquiz_global_defaults)
 *   3. Local  (flagquiz_mode_config_<modeId>)
 */
function resolveState(ls, modeId) {
    const LOCAL_KEY  = 'flagquiz_mode_config_' + modeId;
    const GLOBAL_KEY = 'flagquiz_global_defaults';

    // Nivel 1: factory
    const state = { ...FACTORY };

    // Nivel 2: global
    const rawGlobal = ls.getItem(GLOBAL_KEY);
    if (rawGlobal) {
        const g = JSON.parse(rawGlobal);
        if (g.continent)                        state.continent         = g.continent;
        if (g.sovereigntyStatus)                state.sovereigntyStatus = g.sovereigntyStatus;
        if (g.maxCount != null)                 state.maxCount          = g.maxCount;
        if (typeof g.randomOrder === 'boolean') state.randomOrder       = g.randomOrder;
    }

    // Nivel 3: local (pisa global campo a campo)
    const rawLocal = ls.getItem(LOCAL_KEY);
    if (rawLocal) {
        const l = JSON.parse(rawLocal);
        if (l.continent !== undefined)          state.continent         = l.continent;
        if (l.sovereigntyStatus !== undefined)  state.sovereigntyStatus = l.sovereigntyStatus;
        if (l.countryCount !== undefined)       state.maxCount          = l.countryCount;
        if (typeof l.randomOrder === 'boolean') state.randomOrder       = l.randomOrder;
    }

    return state;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(label, actual, expected) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a === e) {
        console.log(`  ✅ ${label}`);
        passed++;
    } else {
        console.error(`  ❌ ${label}`);
        console.error(`     Expected: ${e}`);
        console.error(`     Got:      ${a}`);
        failed++;
    }
}

const MODE = 'flagRush';
const GK   = 'flagquiz_global_defaults';
const LK   = 'flagquiz_mode_config_' + MODE;

// ─── Tests ──────────────────────────────────────────────────────────────────

console.log('\n🧪 Preference Hierarchy — 3 niveles\n');

// A. Solo defaults (sin global, sin local)
{
    const ls = makeStorage();
    const s = resolveState(ls, MODE);
    assert(
        'A. Solo defaults (sin global, sin local) → All/All/null/true',
        s,
        { continent: 'All', sovereigntyStatus: 'All', maxCount: null, randomOrder: true }
    );
}

// B. Solo global (sin local)
{
    const ls = makeStorage();
    ls.setItem(GK, JSON.stringify({ continent: 'Europe', sovereigntyStatus: 'Yes', maxCount: 30, randomOrder: false }));
    const s = resolveState(ls, MODE);
    assert(
        'B. Solo global (sin local) → Europe/Yes/30/false',
        s,
        { continent: 'Europe', sovereigntyStatus: 'Yes', maxCount: 30, randomOrder: false }
    );
}

// C. Solo local (sin global) — el caso que reportaste como problemático
{
    const ls = makeStorage();
    ls.setItem(LK, JSON.stringify({ continent: 'Asia', sovereigntyStatus: 'No', countryCount: 20, randomOrder: true, modeOptions: {} }));
    const s = resolveState(ls, MODE);
    assert(
        'C. Solo local (sin global) → Asia/No/20/true',
        s,
        { continent: 'Asia', sovereigntyStatus: 'No', maxCount: 20, randomOrder: true }
    );
}

// D. Global + local (local debe ganar en todos los campos)
{
    const ls = makeStorage();
    ls.setItem(GK, JSON.stringify({ continent: 'Europe', sovereigntyStatus: 'Yes', maxCount: 30, randomOrder: false }));
    ls.setItem(LK, JSON.stringify({ continent: 'America', sovereigntyStatus: 'All', countryCount: 15, randomOrder: true, modeOptions: {} }));
    const s = resolveState(ls, MODE);
    assert(
        'D. Global + local → local gana: America/All/15/true',
        s,
        { continent: 'America', sovereigntyStatus: 'All', maxCount: 15, randomOrder: true }
    );
}

// E. Local countryCount=null (null explícito debe ganar sobre global maxCount=50)
{
    const ls = makeStorage();
    ls.setItem(GK, JSON.stringify({ continent: 'Africa', sovereigntyStatus: 'All', maxCount: 50, randomOrder: true }));
    ls.setItem(LK, JSON.stringify({ continent: 'Africa', sovereigntyStatus: 'All', countryCount: null, randomOrder: true, modeOptions: {} }));
    const s = resolveState(ls, MODE);
    assert(
        'E. Local countryCount=null → maxCount=null (null local gana sobre global 50)',
        { maxCount: s.maxCount },
        { maxCount: null }
    );
}

// F. Datos legacy (local sin campos de filtro) → global debe ganar para filtros
{
    const ls = makeStorage();
    ls.setItem(GK, JSON.stringify({ continent: 'Oceania', sovereigntyStatus: 'Yes', maxCount: 25, randomOrder: false }));
    ls.setItem(LK, JSON.stringify({ modeOptions: { timePerQuestion: 15, rounds: 20 } })); // sin continent/sovereignty/countryCount
    const s = resolveState(ls, MODE);
    assert(
        'F. Legacy local (sin filtros) → global gana: Oceania/Yes/25/false',
        { continent: s.continent, sovereigntyStatus: s.sovereigntyStatus, maxCount: s.maxCount, randomOrder: s.randomOrder },
        { continent: 'Oceania', sovereigntyStatus: 'Yes', maxCount: 25, randomOrder: false }
    );
}

// G. Local parcial (solo continent) → continent local, resto del global
{
    const ls = makeStorage();
    ls.setItem(GK, JSON.stringify({ continent: 'Europe', sovereigntyStatus: 'Yes', maxCount: 30, randomOrder: false }));
    ls.setItem(LK, JSON.stringify({ continent: 'Asia', modeOptions: {} })); // solo continent
    const s = resolveState(ls, MODE);
    assert(
        'G. Local parcial (continent=Asia) → Asia + resto del global: Yes/30/false',
        s,
        { continent: 'Asia', sovereigntyStatus: 'Yes', maxCount: 30, randomOrder: false }
    );
}

// H. Sin global, local parcial (solo continent) → continent local, resto factory
{
    const ls = makeStorage();
    ls.setItem(LK, JSON.stringify({ continent: 'Africa', modeOptions: {} })); // sin global
    const s = resolveState(ls, MODE);
    assert(
        'H. Sin global, local parcial (continent=Africa) → Africa + factory: All/null/true',
        s,
        { continent: 'Africa', sovereigntyStatus: 'All', maxCount: null, randomOrder: true }
    );
}

// I. Global parcial (solo continent) + local completo → local gana en todo
{
    const ls = makeStorage();
    ls.setItem(GK, JSON.stringify({ continent: 'Europe' })); // global parcial
    ls.setItem(LK, JSON.stringify({ continent: 'America', sovereigntyStatus: 'No', countryCount: 10, randomOrder: false, modeOptions: {} }));
    const s = resolveState(ls, MODE);
    assert(
        'I. Global parcial + local completo → local gana: America/No/10/false',
        s,
        { continent: 'America', sovereigntyStatus: 'No', maxCount: 10, randomOrder: false }
    );
}

// J. Global con randomOrder=false, local sin randomOrder → global randomOrder se mantiene
{
    const ls = makeStorage();
    ls.setItem(GK, JSON.stringify({ continent: 'All', sovereigntyStatus: 'All', maxCount: null, randomOrder: false }));
    ls.setItem(LK, JSON.stringify({ continent: 'Asia', modeOptions: {} })); // sin randomOrder
    const s = resolveState(ls, MODE);
    assert(
        'J. Local sin randomOrder → global randomOrder=false se mantiene',
        { randomOrder: s.randomOrder },
        { randomOrder: false }
    );
}

// ─── Resultado ──────────────────────────────────────────────────────────────

console.log(`\n📊 Resultado: ${passed} pasaron, ${failed} fallaron de ${passed + failed} tests\n`);

if (failed > 0) process.exit(1);
