import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE_URL = 'http://127.0.0.1:3000/flagsquiz/';
const OUT_DIR = path.join(__dirname, '../.playwright-mcp');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function goHome(page) {
    await page.goto(BASE_URL);
    await sleep(800);
}

async function clickModeByText(page, text) {
    await page.locator('.landing-mode-card', { hasText: text }).first().click();
    await sleep(600);
}

async function playGame(page) {
    const btn = page.locator('.bottom-sheet__play-btn');
    if (await btn.isVisible()) {
        await btn.click();
        await sleep(1000);
    }
}

(async () => {
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();

    // ── 1. Home ──────────────────────────────────────────────────────────
    await goHome(page);
    await page.screenshot({ path: `${OUT_DIR}/audit-01-home.png` });
    console.log('✓ 01 Home');

    // ── 2. FlagRush ───────────────────────────────────────────────────────
    await clickModeByText(page, 'Carrera de Banderas');
    await page.screenshot({ path: `${OUT_DIR}/audit-02-sheet-flagrush.png` });
    console.log('✓ 02 Sheet FlagRush');
    await playGame(page);
    await page.screenshot({ path: `${OUT_DIR}/audit-03-game-flagrush.png` });
    console.log('✓ 03 Game FlagRush');
    // Answer one question
    const mc1 = page.locator('.mc-option').first();
    if (await mc1.isVisible()) { await mc1.click(); await sleep(500); }
    await page.screenshot({ path: `${OUT_DIR}/audit-04-flagrush-answer.png` });
    console.log('✓ 04 FlagRush answer feedback');

    // ── 3. CapitalClash ───────────────────────────────────────────────────
    await goHome(page);
    await clickModeByText(page, 'Duelo de Capitales');
    await page.screenshot({ path: `${OUT_DIR}/audit-05-sheet-capitalclash.png` });
    console.log('✓ 05 Sheet CapitalClash');
    await playGame(page);
    await page.screenshot({ path: `${OUT_DIR}/audit-06-game-capitalclash.png` });
    console.log('✓ 06 Game CapitalClash');

    // ── 4. StreakBlitz ────────────────────────────────────────────────────
    await goHome(page);
    await clickModeByText(page, 'Racha Relámpago');
    await page.screenshot({ path: `${OUT_DIR}/audit-07-sheet-streakblitz.png` });
    console.log('✓ 07 Sheet StreakBlitz');
    await playGame(page);
    await page.screenshot({ path: `${OUT_DIR}/audit-08-game-streakblitz.png` });
    console.log('✓ 08 Game StreakBlitz');

    // ── 5. GeoPuzzle ──────────────────────────────────────────────────────
    await goHome(page);
    await clickModeByText(page, 'Geo Pistas');
    await page.screenshot({ path: `${OUT_DIR}/audit-09-sheet-geopuzzle.png` });
    console.log('✓ 09 Sheet GeoPuzzle');
    await playGame(page);
    await sleep(500);
    await page.screenshot({ path: `${OUT_DIR}/audit-10-game-geopuzzle.png` });
    console.log('✓ 10 Game GeoPuzzle');
    const guessBtn = page.locator('.geo-puzzle-guess-btn');
    if (await guessBtn.isVisible()) {
        await guessBtn.click();
        await sleep(400);
        await page.screenshot({ path: `${OUT_DIR}/audit-11-geopuzzle-input.png` });
        console.log('✓ 11 GeoPuzzle input state');
    }

    // ── 6. LetrasEnCaida ──────────────────────────────────────────────────
    await goHome(page);
    await clickModeByText(page, 'Letras en Caída');
    await page.screenshot({ path: `${OUT_DIR}/audit-12-sheet-letras.png` });
    console.log('✓ 12 Sheet LetrasEnCaida');
    await playGame(page);
    await sleep(800);
    await page.screenshot({ path: `${OUT_DIR}/audit-13-game-letras.png` });
    console.log('✓ 13 Game LetrasEnCaida');
    const wdBtn = page.locator('.word-drop-guess-btn');
    if (await wdBtn.isVisible()) {
        await wdBtn.click();
        await sleep(400);
        await page.screenshot({ path: `${OUT_DIR}/audit-14-letras-input.png` });
        console.log('✓ 14 LetrasEnCaida input state');
    }

    // ── 7. BanderaFlash (team) ────────────────────────────────────────────
    await goHome(page);
    await clickModeByText(page, 'Bandera Flash');
    await page.screenshot({ path: `${OUT_DIR}/audit-15-sheet-banderaflash.png` });
    console.log('✓ 15 Sheet BanderaFlash');
    await playGame(page);
    await page.screenshot({ path: `${OUT_DIR}/audit-16-game-banderaflash.png` });
    console.log('✓ 16 Game BanderaFlash (team)');

    // ── 8. CapitalQuest (team) ────────────────────────────────────────────
    await goHome(page);
    await clickModeByText(page, 'Búsqueda de Capitales');
    await page.screenshot({ path: `${OUT_DIR}/audit-17-sheet-capitalquest.png` });
    console.log('✓ 17 Sheet CapitalQuest');
    await playGame(page);
    await page.screenshot({ path: `${OUT_DIR}/audit-18-game-capitalquest.png` });
    console.log('✓ 18 Game CapitalQuest (team)');

    // ── 9. Game end modal ─────────────────────────────────────────────────
    await goHome(page);
    await clickModeByText(page, 'Carrera de Banderas');
    // Set rounds to 1
    const roundsInput = page.locator('#bs-opt-rounds');
    if (await roundsInput.isVisible()) await roundsInput.fill('1');
    await playGame(page);
    // Answer quickly to trigger end
    for (let i = 0; i < 5; i++) {
        const opt = page.locator('.mc-option').first();
        if (await opt.isVisible()) { await opt.click(); await sleep(2200); }
        const modal = page.locator('.game-end-modal__content');
        if (await modal.isVisible()) break;
    }
    const endModal = page.locator('.game-end-modal__content');
    if (await endModal.isVisible()) {
        await page.screenshot({ path: `${OUT_DIR}/audit-19-game-end-modal.png` });
        console.log('✓ 19 Game end modal');
    }

    await browser.close();
    console.log('\n✅ Full audit complete — screenshots in .playwright-mcp/');
})();
