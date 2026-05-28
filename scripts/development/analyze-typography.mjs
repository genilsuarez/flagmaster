import { readFileSync } from 'fs';

const css = readFileSync('/Users/gsuarez/Documents/Code/FlagQuiz/assets/styles/styles.css', 'utf8');
const lines = css.split('\n');

// Build map: selector -> font-size
let currentSelector = '';
const data = [];

for (const line of lines) {
    const t = line.trim();
    // Capture selector lines
    if (t.startsWith('.') && !t.startsWith('/*')) {
        const sel = t.split('{')[0].trim().split(',')[0].trim();
        if (sel) currentSelector = sel;
    }
    // Capture font-size values (skip var() and clamp())
    if (t.includes('font-size:') && !t.includes('var(') && !t.includes('clamp(')) {
        const fs = t.replace('font-size:', '').trim().replace(';', '');
        data.push({ sel: currentSelector, fs });
    }
}

// Group by semantic role
const groups = {
    'SCORE (puntuación en juego)': d => d.sel.includes('score') && !d.sel.includes('stat') && !d.sel.includes('final'),
    'PROGRESS / ROUND counter':    d => (d.sel.includes('progress') || d.sel.includes('round') || d.sel.includes('question-count')) && !d.sel.includes('btn') && !d.sel.includes('bar') && !d.sel.includes('fill'),
    'SECTION TITLE (encabezado de sección)': d => d.sel.includes('section-title') || d.sel.includes('section_title') || d.sel.includes('__section-title'),
    'FIELD LABEL':                 d => (d.sel.includes('__label') || d.sel.includes('-label') || d.sel.includes('field__label') || d.sel.includes('settings-field__label')) && !d.sel.includes('btn') && !d.sel.includes('toggle__label'),
    'HINT / FEEDBACK':             d => d.sel.includes('hint') || d.sel.includes('feedback') || d.sel.includes('warning'),
    'PROMPT (pregunta del juego)': d => d.sel.includes('prompt'),
    'STAT VALUE (modal resultados)': d => d.sel.includes('stat-value') || d.sel.includes('stat_value'),
    'STAT LABEL (modal resultados)': d => d.sel.includes('stat-label') || d.sel.includes('stat_label'),
    'MODAL TITLE':                 d => d.sel.includes('__title') || d.sel.includes('-title'),
};

for (const [group, fn] of Object.entries(groups)) {
    const matches = data.filter(fn);
    if (matches.length === 0) continue;
    const sizes = [...new Set(matches.map(d => d.fs))];
    const inconsistent = sizes.length > 1 ? ' ⚠️  INCONSISTENTE' : ' ✅';
    console.log(`\n=== ${group}${inconsistent} ===`);
    for (const { sel, fs } of matches) {
        console.log(`  ${fs.padEnd(10)} ${sel}`);
    }
}

// Also show all unique font-sizes used (scale audit)
console.log('\n\n=== ESCALA TIPOGRÁFICA COMPLETA (valores únicos) ===');
const allSizes = [...new Set(data.map(d => d.fs))].sort((a, b) => parseFloat(a) - parseFloat(b));
console.log(allSizes.join('  |  '));
console.log(`\nTotal valores distintos: ${allSizes.length}`);
