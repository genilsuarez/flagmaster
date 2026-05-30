/**
 * View class for managing DOM elements and UI updates
 */
export class GameView {
    constructor() {
        this._isDesktop = window.innerWidth > 600;
        window.addEventListener('resize', () => { this._isDesktop = window.innerWidth > 600; }, { passive: true });
        this.elements = this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        const elements = {
            flagImage: document.getElementById('flagImage'),
            countryInfo: document.getElementById('countryInfo'),
            capitalInfo: document.getElementById('capitalInfo'),
            continentFilter: document.getElementById('continentFilter'),
            sovereignFilter: document.getElementById('sovereignFilter'),
            gameModeFilter: document.getElementById('gameModeFilter'),
            startButton: this.createStartButton(),
            endGameButton: document.getElementById('endGameButton'),
            skipButton: document.getElementById('skipButton'),
            teamsContainer: this.createTeamsContainer(),
            maxCountriesInput: this.createMaxCountriesInput(),
            practiceModeCheckbox: this.createPracticeModeCheckbox(),
            randomModeCheckbox: this.createRandomModeCheckbox()
        };
        
        if (!elements.flagImage || !elements.countryInfo || !elements.capitalInfo) {
            throw new Error('Required DOM elements not found');
        }

        // Fallback: if SVG fails, retry with PNG; if PNG also fails, leave broken
        elements.flagImage.onerror = () => {
            const src = elements.flagImage.src;
            if (src.includes('flagcdn.com') && src.endsWith('.svg')) {
                const code = src.split('/').pop().replace('.svg', '');
                elements.flagImage.onerror = null;
                elements.flagImage.src = `https://flagcdn.com/w320/${code}.png`;
            }
        };
        
        try {
            elements.filterContainer = this.createFilterContainer(elements);
            elements.settingsButton = this.createSettingsButton();
            elements.teamCounters = this.createTeamCounters(elements);
            elements.progressContainer = this.createProgressContainer();
        } catch (error) {
            console.error('Error initializing UI elements:', error);
            throw new Error('Failed to initialize game interface');
        }
        
        return elements;
    }

    createStartButton() {
        return document.getElementById('startButton');
    }

    createTeamsContainer() {
        return document.getElementById('teamsContainer');
    }

    createFilterContainer(elements) {
        const container = document.getElementById('filterContainer');
        const closeButton = container?.querySelector('.filter-close-btn');
        if (closeButton) {
            closeButton.onclick = () => this.closeSettingsPanel();
        }
        // Close on backdrop click (clicking outside the panel)
        if (container) {
            container.onclick = (e) => {
                if (e.target === container) {
                    this.closeSettingsPanel();
                }
            };
        }
        return container;
    }

    createSettingsButton() {
        const button = document.getElementById('settingsButton');
        if (!button) {
            // Settings button removed from game header — settings accessible via drawer
            return null;
        }
        
        button.title = 'Game Settings';
        
        button.onclick = () => {
            const filterContainer = document.getElementById('filterContainer');
            if (!filterContainer) return;
            
            const isVisible = filterContainer.classList.contains('show');
            
            if (isVisible) {
                filterContainer.classList.remove('show');
                button.classList.remove('active');
            } else {
                filterContainer.classList.add('show');
                button.classList.add('active');
            }
        };
        
        return button;
    }

    createMaxCountriesInput() {
        return document.getElementById('maxCountries');
    }

    createPracticeModeCheckbox() {
        return document.querySelector('.practice-mode-container');
    }

    createRandomModeCheckbox() {
        return document.querySelector('.random-mode-container');
    }

    createTeamCounters(elements) {
        const teamConfigurations = [
            { teamId: 'red', teamDisplayName: 'Equipo Rojo' },
            { teamId: 'blue', teamDisplayName: 'Equipo Azul' },
            { teamId: 'green', teamDisplayName: 'Equipo Verde' }
        ];
        const teamCounters = {};
        
        teamConfigurations.forEach(teamConfig => {
            const counterElement = document.createElement('div');
            counterElement.id = `${teamConfig.teamId}Counter`;
            counterElement.setAttribute('aria-live', 'polite');
            counterElement.setAttribute('aria-atomic', 'true');
            counterElement.setAttribute('aria-label', `${teamConfig.teamDisplayName}: 0 puntos`);
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = teamConfig.teamDisplayName;
            const scoreSpan = document.createElement('span');
            scoreSpan.textContent = '0';
            
            counterElement.appendChild(nameSpan);
            counterElement.appendChild(scoreSpan);
            
            // Cache span references to avoid querySelectorAll on each score update
            counterElement._nameSpan = nameSpan;
            counterElement._scoreSpan = scoreSpan;
            counterElement._teamDisplayName = teamConfig.teamDisplayName;
            
            teamCounters[teamConfig.teamId] = counterElement;
            elements.teamsContainer.appendChild(counterElement);
        });
        
        return teamCounters;
    }

    createProgressContainer() {
        const container = document.createElement('div');
        container.id = 'progressContainer';
        container.className = 'progress-container';
        
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        
        const progressFill = document.createElement('div');
        progressFill.className = 'progress-fill';
        progressFill.id = 'progressFill';
        
        const progressText = document.createElement('div');
        progressText.className = 'progress-text';
        progressText.id = 'progressText';
        progressText.textContent = '0 / 0';
        
        const timer = document.createElement('div');
        timer.className = 'timer';
        timer.id = 'timer';
        timer.textContent = '00:00';
        
        const countdownTimer = document.createElement('div');
        countdownTimer.className = 'countdown-timer';
        countdownTimer.id = 'countdownTimer';
        countdownTimer.textContent = '3';
        
        progressBar.appendChild(progressFill);
        container.appendChild(progressText);
        container.appendChild(progressBar);
        const timerContainer = document.createElement('div');
        timerContainer.className = 'timer-container';
        timerContainer.appendChild(timer);
        timerContainer.appendChild(countdownTimer);
        container.appendChild(timerContainer);
        
        document.querySelector('.container').insertBefore(container, document.getElementById('flagImage'));
        
        return { container, progressFill, progressText, timer, countdownTimer };
    }

    setupEventListeners() {
        // Event listeners will be set by the controller
    }

    updateFlagDisplay(country) {
        if (country) {
            // Always start hidden and empty — text is set only at reveal time
            this.elements.countryInfo.classList.add('hidden-keep-space');
            this.elements.countryInfo.textContent = '';
            
            if (this.gameState && this.gameState.gameMode === 'capitals') {
                const hintMode = this.gameState.capitalsHintMode || 'flagAndName';
                
                // Show/hide flag based on hint mode
                if (hintMode === 'nameOnly') {
                    this.elements.flagImage.style.display = 'none';
                } else {
                    this.elements.flagImage.style.display = '';
                    this.elements.flagImage.src = country.flagUrl;
                }
                
                // Show/hide country name based on hint mode
                // For flagOnly: countryInfo stays hidden and empty (set at reveal time)
                if (hintMode !== 'flagOnly') {
                    this.elements.countryInfo.textContent = country.displayName;
                    this.elements.countryInfo.classList.remove('hidden-keep-space');
                }
            } else {
                // Flags mode: show flag, hide name — text set at reveal time in showCountryInfo()
                this.elements.flagImage.style.display = '';
                this.elements.flagImage.src = country.flagUrl;
            }
        }
    }

    updateTeamScore(teamColor, score) {
        const counter = this.elements.teamCounters[teamColor];
        if (counter) {
            counter._scoreSpan.textContent = score;
            const teamName = counter._teamDisplayName || counter._nameSpan?.textContent || teamColor;
            counter.setAttribute('aria-label', `${teamName}: ${score} puntos`);
        }
    }

    updateStartButton(isGameActive) {
        this.elements.startButton.textContent = isGameActive ? 'Terminar' : '¡Jugar!';
        this.elements.startButton.hidden = isGameActive;
        
        // Show/hide game action buttons
        if (this.elements.endGameButton) {
            this.elements.endGameButton.hidden = !isGameActive;
        }
        if (this.elements.skipButton) {
            this.elements.skipButton.hidden = !isGameActive;
        }
    }

    setFiltersEnabled(enabled) {
        this.elements.continentFilter.disabled = !enabled;
        this.elements.sovereignFilter.disabled = !enabled;
        this.elements.maxCountriesInput.disabled = !enabled;
        this.elements.practiceModeCheckbox.querySelector('input').disabled = !enabled;
        this.elements.randomModeCheckbox.querySelector('input').disabled = !enabled;
    }

    setSettingsButtonVisible(visible) {
        if (this.elements.settingsButton) {
            this.elements.settingsButton.style.display = visible ? 'flex' : 'none';
        }
    }

    hideSettingsPanel() {
        this.closeSettingsPanel();
    }
    
    closeSettingsPanel() {
        const filterContainer = document.getElementById('filterContainer');
        const settingsButton = document.getElementById('settingsButton');
        
        if (filterContainer) {
            filterContainer.classList.remove('show');
        }
        if (settingsButton) {
            settingsButton.classList.remove('active');
        }
    }

    showGameEndModal(teamScores) {
        const modal = document.createElement('div');
        modal.id = 'gameEndModal';
        modal.className = 'modal-overlay';
        
        const maxScore = Math.max(...Object.values(teamScores));
        const winners = Object.keys(teamScores).filter(team => teamScores[team] === maxScore);
        const teamNames = { red: 'Equipo Rojo', blue: 'Equipo Azul', green: 'Equipo Verde' };
        
        let winnerText;
        if (winners.length > 1) {
            // Si hay empate entre equipos (red/green) y blue, el equipo gana
            if (winners.includes('blue') && (winners.includes('red') || winners.includes('green'))) {
                const teamWinner = winners.find(team => team !== 'blue');
                winnerText = `🏆 ¡${teamNames[teamWinner]} Gana!`;
            } else {
                winnerText = '🤝 ¡Empate Total!';
            }
        } else if (winners[0] === 'blue') {
            winnerText = '🤝 ¡Más Empates!';
        } else {
            winnerText = `🏆 ¡${teamNames[winners[0]]} Gana!`;
        }
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>🎉 ¡Juego Terminado! 🎉</h2>
                </div>
                <div class="modal-body">
                    <div class="winner-announcement">
                        <h3>${winnerText}</h3>
                    </div>
                    <div class="final-scores">
                        <div class="score-item red">
                            <span class="team-name">Equipo Rojo</span>
                            <span class="score">${teamScores.red}</span>
                        </div>
                        <div class="score-item blue">
                            <span class="team-name">Equipo Azul</span>
                            <span class="score">${teamScores.blue}</span>
                        </div>
                        <div class="score-item green">
                            <span class="team-name">Equipo Verde</span>
                            <span class="score">${teamScores.green}</span>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="modal-close-btn">Cerrar</button>
                </div>
            </div>
        `;
        
        const closeButton = modal.querySelector('.modal-close-btn');
        if (closeButton) {
            closeButton.onclick = () => {
                if (modal.parentNode) {
                    document.body.removeChild(modal);
                }
            };
        }
        
        document.body.appendChild(modal);
    }

    updateMaxCountriesInput(maxValue) {
        this.elements.maxCountriesInput.max = maxValue;
        this.elements.maxCountriesInput.value = maxValue;
    }

    showCountryInfo() {
        if (this.gameState && this.gameState.gameMode === 'flags') {
            const currentCountry = this.getCurrentCountry();
            if (currentCountry) {
                this.elements.countryInfo.textContent = currentCountry.displayName;
            }
            this.elements.countryInfo.classList.remove('hidden-keep-space');
        }
    }

    getCurrentCountry() {
        return this.currentCountry;
    }

    setCurrentCountry(country) {
        this.currentCountry = country;
    }

    hideCountryInfo() {
        this.elements.countryInfo.classList.add('hidden-keep-space');
    }

    clearCountryInfo() {
        this.elements.countryInfo.textContent = '';
        this.elements.countryInfo.classList.add('hidden-keep-space');
    }

    updateProgress(current, total) {
        if (this._isDesktop) {
            const percentage = total > 0 ? (current / total) * 100 : 0;
            this.elements.progressContainer.progressFill.style.width = `${percentage}%`;
            this.elements.progressContainer.progressText.textContent = `${current} / ${total}`;
        }
    }

    updateTimer(seconds) {
        if (this._isDesktop) {
            const minutes = Math.floor(seconds / 60);
            const secs = seconds % 60;
            this.elements.progressContainer.timer.textContent = 
                `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    }

    updateCountdown(seconds) {
        if (this._isDesktop) {
            this.elements.progressContainer.countdownTimer.textContent = seconds;
            this.elements.progressContainer.countdownTimer.className = 
                seconds <= 2 ? 'countdown-timer urgent' : 'countdown-timer';
        }
    }

    hideCountdown() {
        if (this._isDesktop) {
            this.elements.progressContainer.countdownTimer.style.opacity = '0';
        }
    }

    showCountdown() {
        if (this._isDesktop) {
            this.elements.progressContainer.countdownTimer.style.opacity = '1';
        }
    }

    showProgressContainer() {
        if (this._isDesktop) {
            this.elements.progressContainer.container.style.display = 'block';
        }
    }

    hideProgressContainer() {
        if (this._isDesktop) {
            this.elements.progressContainer.container.style.display = 'none';
        }
    }

    showGameEndMessage(teamScores) {
        this.showGameEndModal(teamScores);
    }

    setDefaultFlag() {
        this.elements.flagImage.style.display = '';
        this.elements.flagImage.src = "https://flagcdn.com/un.svg";
    }

    getFilterValues() {
        const practiceInput = this.elements.practiceModeCheckbox?.querySelector('input');
        const randomInput = this.elements.randomModeCheckbox?.querySelector('input');
        const capitalsHintMode = document.getElementById('capitalsHintMode');
        
        return {
            continent: this.elements.continentFilter?.value || 'All',
            sovereigntyStatus: this.elements.sovereignFilter?.value || 'All',
            gameMode: this.elements.gameModeFilter?.value || 'flags',
            maxCount: parseInt(this.elements.maxCountriesInput?.value || '50', 10),
            practiceMode: practiceInput?.checked || false,
            randomMode: randomInput?.checked || true,
            capitalsHintMode: capitalsHintMode?.value || 'flagAndName'
        };
    }

    showCapitalInfo() {
        this.elements.capitalInfo.classList.add('revealed');
    }

    hideCapitalInfo() {
        this.elements.capitalInfo.classList.remove('revealed');
    }

    clearCapitalInfo() {
        this.elements.capitalInfo.textContent = '';
        this.elements.capitalInfo.classList.remove('revealed');
    }
}