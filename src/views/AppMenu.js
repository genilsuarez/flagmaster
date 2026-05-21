/**
 * AppMenu: hamburger drawer + modals (About, How to play, Shortcuts, Stats, Achievements).
 * Decoupled from the game logic. Interacts with StatsService for dynamic content.
 */

const MODAL_TEMPLATES = {
    about: {
        title: 'Acerca de',
        body: () => `
            <div class="modal-section">
                <p><strong>Quiz de Banderas</strong> es un juego interactivo para aprender las banderas y capitales de todos los países del mundo.</p>
                <p>Juega solo o compite con 2 equipos (con empate si responden al mismo tiempo), filtra por continente, activa el modo práctica o desafía tu memoria con el cronómetro.</p>
            </div>
            <div class="modal-section">
                <h3>Créditos</h3>
                <p>Banderas servidas por <a href="https://flagcdn.com" target="_blank" rel="noopener" style="color:#c77d5f">flagcdn.com</a>.</p>
                <p>Diseñado y construido con vanilla JavaScript y Vite.</p>
            </div>
        `
    },
    howto: {
        title: 'Cómo jugar',
        body: () => `
            <ol class="howto-steps">
                <li>
                    <span class="howto-num">1</span>
                    <div><h4>Elige tu modo</h4><p>Bandera Flash, Capital Quest, Letras en Caída y más desde el selector de modos.</p></div>
                </li>
                <li>
                    <span class="howto-num">2</span>
                    <div><h4>Filtra el desafío</h4><p>Por continente y cuántos países quieres jugar.</p></div>
                </li>
                <li>
                    <span class="howto-num">3</span>
                    <div><h4>Presiona ¡Jugar!</h4><p>Verás una bandera y tendrás que identificar de qué país se trata.</p></div>
                </li>
                <li>
                    <span class="howto-num">4</span>
                    <div><h4>Anota los puntos</h4><p>Presiona el equipo ganador (Rojo, Verde o Azul) o usa las teclas R, G, B.</p></div>
                </li>
            </ol>
            <div class="modal-section" style="margin-top:18px">
                <h3>✏️ Letras en Caída</h3>
                <p>Las letras del nombre aparecen una por una. Presiona <strong>¡Ya sé!</strong> (o Espacio) cuando creas saber la respuesta. Mientras menos letras se hayan revelado, más puntos ganas.</p>
                <p>En modo supervivencia tienes 3 vidas. Si la palabra se completa sin responder, pierdes una vida.</p>
            </div>
        `
    },
    shortcuts: {
        title: 'Atajos de teclado',
        body: () => `
            <table class="shortcuts-table">
                <tbody>
                    <tr><td><span class="key">R</span></td><td>Punto para equipo rojo</td></tr>
                    <tr><td><span class="key">G</span></td><td>Punto para equipo verde</td></tr>
                    <tr><td><span class="key">B</span></td><td>Punto para equipo azul</td></tr>
                    <tr><td><span class="key">S</span></td><td>Saltar bandera</td></tr>
                    <tr><td><span class="key">Espacio</span></td><td>Revelar respuesta</td></tr>
                    <tr><td><span class="key">Esc</span></td><td>Terminar juego</td></tr>
                    <tr><td><span class="key">Click</span></td><td>Presiona la bandera para revelar</td></tr>
                </tbody>
            </table>
        `
    },
    stats: {
        title: 'Tus estadísticas',
        body: (stats) => {
            const accuracy = stats.totalCorrect + stats.totalWrong > 0
                ? Math.round((stats.totalCorrect / (stats.totalCorrect + stats.totalWrong)) * 100)
                : 0;
            const bestTime = stats.bestTimeSeconds
                ? `${Math.floor(stats.bestTimeSeconds / 60)}:${String(stats.bestTimeSeconds % 60).padStart(2, '0')}`
                : '—';

            // Per-mode stats section
            const modeStats = stats.modeStats || {};
            const modeNames = {
                flagRush: '🚩 Flag Rush',
                capitalClash: '⚔️ Capital Clash',
                streakBlitz: '⚡ Streak Blitz',
                geoPuzzle: '🧩 Geo Puzzle',
                supervivencia: '💀 Supervivencia',
                banderaFlash: '🏴 Bandera Flash',
                capitalQuest: '🏛️ Capital Quest',
                letrasEnCaida: '✏️ Letras en Caída',
            };

            const modeStatsHtml = Object.entries(modeNames)
                .filter(([id]) => modeStats[id] && modeStats[id].gamesPlayed > 0)
                .map(([id, name]) => {
                    const m = modeStats[id];
                    return `
                        <div class="mode-stat-row">
                            <span class="mode-stat-name">${name}</span>
                            <span class="mode-stat-detail">${m.gamesPlayed} partida${m.gamesPlayed === 1 ? '' : 's'} · Mejor: ${m.bestScore.toLocaleString()}</span>
                        </div>
                    `;
                }).join('');

            return `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-label">Partidas jugadas</div>
                        <div class="stat-value">${stats.gamesPlayed}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Aciertos totales</div>
                        <div class="stat-value">${stats.totalCorrect}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Precisión</div>
                        <div class="stat-value">${accuracy}<small>%</small></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Mejor tiempo</div>
                        <div class="stat-value">${bestTime}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Racha actual</div>
                        <div class="stat-value">${stats.currentStreak} <small>días</small></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Racha más larga</div>
                        <div class="stat-value">${stats.longestStreak} <small>días</small></div>
                    </div>
                </div>
                <p style="font-size:0.82rem;color:rgba(255,255,255,0.5);text-align:center;margin-top:8px">
                    Banderas únicas acertadas: <strong style="color:#ec4899">${stats.uniqueCountriesCorrect.length}</strong>
                </p>
                ${modeStatsHtml ? `
                    <div class="mode-stats-section">
                        <h3 class="mode-stats-title">Estadísticas por modo</h3>
                        ${modeStatsHtml}
                    </div>
                ` : ''}
            `;
        }
    },
    achievements: {
        title: 'Logros',
        body: (stats) => {
            const items = [
                { id: 'explorer',   icon: '🌍', name: 'Explorador',  desc: '10 aciertos totales' },
                { id: 'sniper',     icon: '🎯', name: 'Francotirador', desc: '10 aciertos en una partida' },
                { id: 'lightning',  icon: '⚡', name: 'Rayo',         desc: 'Partida en menos de 1 min' },
                { id: 'conqueror',  icon: '🌎', name: 'Conquistador', desc: 'Un continente completo' },
                { id: 'persistent', icon: '🔥', name: 'Persistente',  desc: '7 días seguidos' }
            ];
            return `
                <div class="achievements-grid">
                    ${items.map(it => {
                        const unlocked = stats.achievements?.[it.id];
                        return `
                            <div class="achievement ${unlocked ? 'unlocked' : ''}">
                                <div class="ach-icon">${it.icon}</div>
                                <h4>${it.name}</h4>
                                <p>${it.desc}</p>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
    }
};

export class AppMenu {
    constructor({ statsService, onPlay, onOpenSettings, onHome }) {
        this.statsService = statsService;
        this.onPlay = onPlay;
        this.onOpenSettings = onOpenSettings;
        this.onHome = onHome;

        this.drawer = document.getElementById('appDrawer');
        this.overlay = document.getElementById('drawerOverlay');
        this.menuBtn = document.getElementById('landingMenuBtn');
        this.closeBtn = document.getElementById('drawerCloseBtn');
        this.modal = document.getElementById('appModal');
        this.modalTitle = document.getElementById('appModalTitle');
        this.modalBody = document.getElementById('appModalBody');

        this.bindEvents();
        this.updateMotivationUI();
    }

    bindEvents() {
        this.menuBtn?.addEventListener('click', () => this.openDrawer());
        this.closeBtn?.addEventListener('click', () => this.closeDrawer());
        this.overlay?.addEventListener('click', () => this.closeDrawer());

        // Drawer items
        this.drawer?.querySelectorAll('.drawer-item').forEach(btn => {
            btn.addEventListener('click', () => this.handleDrawerAction(btn.dataset.action));
        });

        // Modal close on backdrop / close button
        this.modal?.addEventListener('click', (e) => {
            if (e.target.closest('[data-close]') || e.target.dataset?.close === 'true') this.closeModal();
        });

        // Escape closes drawer/modal
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            if (!this.modal.hidden) this.closeModal();
            else if (this.drawer.classList.contains('open')) this.closeDrawer();
        });
    }

    openDrawer() {
        this.overlay.classList.add('show');
        this.drawer.classList.add('open');
        this.drawer.setAttribute('aria-hidden', 'false');
        this.menuBtn.setAttribute('aria-expanded', 'true');
    }

    closeDrawer() {
        this.overlay.classList.remove('show');
        this.drawer.classList.remove('open');
        this.drawer.setAttribute('aria-hidden', 'true');
        this.menuBtn.setAttribute('aria-expanded', 'false');
    }

    handleDrawerAction(action) {
        switch (action) {
            case 'home':
                this.closeDrawer();
                document.body.classList.add('landing-mode');
                this.updateMotivationUI();
                this.onHome?.();
                break;
            case 'play':
                this.closeDrawer();
                this.onPlay?.();
                break;
            case 'settings':
                this.closeDrawer();
                this.onOpenSettings?.();
                break;
            case 'stats':
                this.openModal('stats');
                break;
            case 'achievements':
                this.openModal('achievements');
                break;
            case 'howto':
                this.openModal('howto');
                break;
            case 'shortcuts':
                this.openModal('shortcuts');
                break;
            case 'about':
                this.openModal('about');
                break;
        }
    }

    openModal(type) {
        const tmpl = MODAL_TEMPLATES[type];
        if (!tmpl) return;
        const stats = this.statsService?.getStats();
        this.modalTitle.textContent = tmpl.title;
        this.modalBody.innerHTML = tmpl.body(stats);
        this.modal.hidden = false;
        this.modal.setAttribute('aria-hidden', 'false');
        requestAnimationFrame(() => this.modal.classList.add('show'));
    }

    closeModal() {
        this.modal.classList.remove('show');
        this.modal.setAttribute('aria-hidden', 'true');
        setTimeout(() => { this.modal.hidden = true; }, 150);
    }

    /**
     * Refreshes the streak badge, progress line, and CTA microcopy
     * based on current stats. Call after stats change or on navigation home.
     */
    updateMotivationUI() {
        if (!this.statsService) return;
        const stats = this.statsService.getStats();

        const streakEl = document.getElementById('streakBadge');
        if (streakEl) {
            if (stats.currentStreak > 0) {
                streakEl.hidden = false;
                streakEl.querySelector('.streak-value').textContent =
                    `${stats.currentStreak} día${stats.currentStreak === 1 ? '' : 's'}`;
            } else {
                streakEl.hidden = true;
            }
        }

        const progressEl = document.getElementById('landingProgress');
        if (progressEl) {
            const count = stats.uniqueCountriesCorrect?.length || 0;
            if (count > 0) {
                progressEl.hidden = false;
                progressEl.querySelector('.progress-current').textContent = count;
            } else {
                progressEl.hidden = true;
            }
        }

        const ctaText = document.querySelector('#landingCTA .cta-text');
        if (ctaText) {
            if (stats.gamesPlayed > 0) {
                ctaText.textContent = '¡Jugar!';
            } else {
                ctaText.textContent = 'Comenzar Juego';
            }
        }
    }
}
