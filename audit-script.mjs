import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';

const BASE_URL = 'http://127.0.0.1:3000/flagsquiz/';
const OUT_DIR = '/tmp/flagquiz-audit';
mkdirSync(OUT_DIR, { recursive: true });

const log = (msg) => console.log(`[AUDIT] ${msg}`);

async function screenshot(page, name, description) {
  const path = `${OUT_DIR}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  log(`Screenshot saved: ${name}.png — ${description}`);
  return path;
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Click only visible, in-viewport elements
async function clickVisible(page, selector, timeout = 5000) {
  const el = page.locator(selector).filter({ hasText: /./ }).or(page.locator(selector)).first();
  // Use force: false but only on visible elements
  const count = await page.locator(selector).count();
  if (count === 0) return false;
  
  // Find the first visible one
  const all = await page.locator(selector).all();
  for (const item of all) {
    const visible = await item.isVisible();
    const box = await item.boundingBox();
    if (visible && box && box.y >= 0 && box.y < 900) {
      await item.click({ timeout });
      return true;
    }
  }
  return false;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // Collect console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  // ─── 1. HOME / LANDING ───────────────────────────────────────────────────
  log('Navigating to home...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await sleep(1000);
  await screenshot(page, '01-home', 'Home / landing screen');

  // Capture page HTML for analysis
  const homeHTML = await page.content();
  writeFileSync(`${OUT_DIR}/home.html`, homeHTML);

  // ─── 2. DRAWER MENU ──────────────────────────────────────────────────────
  log('\nOpening drawer menu...');
  // The menu button is .landing-menu-btn
  const menuBtn = page.locator('.landing-menu-btn').first();
  if (await menuBtn.count() > 0) {
    await menuBtn.click();
    await sleep(700);
    await screenshot(page, '02-drawer-open', 'Drawer menu open state');
    // Close drawer
    const closeBtn = page.locator('.drawer-close').first();
    if (await closeBtn.count() > 0) await closeBtn.click();
    else await page.keyboard.press('Escape');
    await sleep(400);
  } else {
    log('WARNING: .landing-menu-btn not found');
    await screenshot(page, '02-drawer-NOTFOUND', 'Drawer menu not found');
  }

  // ─── 3. STATS MODAL ──────────────────────────────────────────────────────
  log('\nOpening stats modal via drawer...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await sleep(600);

  // Open drawer first, then click Estadísticas
  const menuBtn2 = page.locator('.landing-menu-btn').first();
  if (await menuBtn2.count() > 0) {
    await menuBtn2.click();
    await sleep(600);
    // Now click the visible Estadísticas drawer item
    const statsItem = page.locator('.drawer-item[data-action="stats"]').first();
    if (await statsItem.count() > 0) {
      await statsItem.click();
      await sleep(700);
      await screenshot(page, '03-stats-modal', 'Stats modal open');
      // Close modal
      const closeModal = page.locator('.app-modal__close').first();
      if (await closeModal.count() > 0) await closeModal.click();
      else await page.keyboard.press('Escape');
      await sleep(400);
    } else {
      log('WARNING: stats drawer item not found');
      await screenshot(page, '03-stats-NOTFOUND', 'Stats item not found in drawer');
    }
  }

  // ─── 4. MODE CARDS ───────────────────────────────────────────────────────
  const modeNames = [
    'Bandera Flash',
    'Búsqueda de Capitales',
    'Letras en Caída',
    'Carrera de Banderas',
    'Duelo de Capitales',
    'Racha Relámpago',
    'Geo Pistas',
  ];

  const modeSlug = (name) => name.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[áàä]/g, 'a')
    .replace(/[éèë]/g, 'e')
    .replace(/[íìï]/g, 'i')
    .replace(/[óòö]/g, 'o')
    .replace(/[úùü]/g, 'u')
    .replace(/[ñ]/g, 'n');

  for (let i = 0; i < modeNames.length; i++) {
    const modeName = modeNames[i];
    const slug = modeSlug(modeName);
    const idx = String(i + 4).padStart(2, '0');

    log(`\n=== Processing mode: ${modeName} ===`);

    // Navigate back to home
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await sleep(800);

    // Click the mode card — use .landing-mode-card with matching aria-label
    const card = page.locator(`.landing-mode-card[aria-label*="${modeName}"]`).first();
    if (await card.count() === 0) {
      log(`WARNING: Card not found for ${modeName}`);
      continue;
    }
    await card.click();
    await sleep(1000);
    await screenshot(page, `${idx}a-${slug}-config`, `${modeName} — config/bottom-sheet screen`);

    // Capture config HTML
    const configHTML = await page.content();
    writeFileSync(`${OUT_DIR}/${slug}-config.html`, configHTML);

    // Log visible buttons on config screen
    const allBtns = await page.locator('button').all();
    log(`  All buttons (${allBtns.length}):`);
    for (const btn of allBtns) {
      const txt = await btn.textContent();
      const cls = await btn.getAttribute('class');
      const box = await btn.boundingBox();
      const inView = box && box.y >= 0 && box.y < 900;
      log(`    [${inView ? 'VISIBLE' : 'hidden'}] text="${txt?.trim().substring(0,30)}" class="${cls}"`);
    }

    // Start game — click the bottom-sheet play button specifically
    const playBtn = page.locator('.bottom-sheet__play-btn').first();
    if (await playBtn.count() > 0) {
      const box = await playBtn.boundingBox();
      log(`  Play button box: ${JSON.stringify(box)}`);
      await playBtn.click({ timeout: 10000 });
      await sleep(1500);
      await screenshot(page, `${idx}b-${slug}-game`, `${modeName} — active game UI`);

      // Capture game HTML
      const gameHTML = await page.content();
      writeFileSync(`${OUT_DIR}/${slug}-game.html`, gameHTML);

      // Log game screen buttons
      const gameBtns = await page.locator('button').all();
      log(`  Game screen buttons (${gameBtns.length}):`);
      for (const btn of gameBtns) {
        const txt = await btn.textContent();
        const cls = await btn.getAttribute('class');
        const box2 = await btn.boundingBox();
        const inView = box2 && box2.y >= 0 && box2.y < 900;
        if (inView) log(`    [VISIBLE] text="${txt?.trim().substring(0,30)}" class="${cls}"`);
      }
    } else {
      log(`WARNING: .bottom-sheet__play-btn not found for ${modeName}`);
      // Try ¡Jugar! button
      const jugarBtn = page.locator('button').filter({ hasText: '¡Jugar!' }).first();
      if (await jugarBtn.count() > 0) {
        await jugarBtn.click({ timeout: 10000 });
        await sleep(1500);
        await screenshot(page, `${idx}b-${slug}-game`, `${modeName} — active game UI (via ¡Jugar!)`);
        const gameHTML = await page.content();
        writeFileSync(`${OUT_DIR}/${slug}-game.html`, gameHTML);
      } else {
        await screenshot(page, `${idx}b-${slug}-game-NOSTART`, `${modeName} — no start button found`);
      }
    }
  }

  // ─── COLLECT CSS CLASSES ─────────────────────────────────────────────────
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await sleep(500);
  const allClasses = await page.evaluate(() => {
    const classes = new Set();
    document.querySelectorAll('*').forEach(el => {
      el.classList.forEach(c => classes.add(c));
    });
    return [...classes].sort();
  });
  writeFileSync(`${OUT_DIR}/all-classes.txt`, allClasses.join('\n'));
  log(`\nCollected ${allClasses.length} unique CSS classes`);

  // Console errors summary
  writeFileSync(`${OUT_DIR}/console-errors.txt`, consoleErrors.join('\n') || '(none)');
  log(`Console errors: ${consoleErrors.length}`);

  await browser.close();
  log('\n=== Audit complete! ===');
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
