import { GameState } from '../models/GameState.js';
import { CountryService } from '../services/CountryService.js';
import { GameService } from '../services/GameService.js';
import { GameView } from '../views/GameView.js';

/**
 * Main controller orchestrating the flag guessing game (team modes: Bandera Flash / Capital Quest)
 */
export class GameController {
    /**
     * @param {Object} [options] - Optional configuration
     * @param {function} [options.onGameEnd] - Callback invoked when the game ends, receives { teamScores, elapsedSeconds, totalFlags }
     * @param {boolean} [options.skipInit] - Skip async initialization (used when managed by GameSessionManager)
     */
    constructor(options = {}) {
        this.gameState = new GameState();
        this.countryService = new CountryService();
        this.gameService = new GameService(this.gameState);
        this.filteredCountries = [];
        this.startTime = null;
        this.timerInterval = null;
        this.countdownInterval = null;
        this.defaultCountdownSeconds = 4;
        this.practiceCountdownSeconds = 2;
        this.countryInfoRevealed = false;
        this.onGameEnd = options.onGameEnd || null;

        if (options.skipInit) {
            // Lightweight init: reuse existing DOM elements without creating duplicates
            this._initMinimalView();
        } else {
            this.view = new GameView();
            this.initializeGame();
        }
    }

    /**
     * Minimal view initialization that reuses existing DOM elements.
     * Used when managed by GameSessionManager to avoid duplicate elements.
     * @private
     */
    _initMinimalView() {
        const flagImage = document.getElementById('flagImage');
        const countryInfo = document.getElementById('countryInfo');
        const capitalInfo = document.getElementById('capitalInfo');
        const teamsContainer = document.getElementById('teamsContainer');
        const skipButton = document.getElementById('skipButton');
        const endGameButton = document.getElementById('endGameButton');
        const progressContainer = document.getElementById('progressContainer');

        // Build or reuse progress container
        let progressRef;
        if (progressContainer) {
            progressRef = {
                container: progressContainer,
                progressFill: progressContainer.querySelector('.progress-fill') || document.getElementById('progressFill'),
                progressText: progressContainer.querySelector('.progress-text') || document.getElementById('progressText'),
                timer: progressContainer.querySelector('.timer') || document.getElementById('timer'),
                countdownTimer: progressContainer.querySelector('.countdown-timer') || document.getElementById('countdownTimer'),
            };
        } else {
            // Create progress container if it doesn't exist
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

            const gameContainer = document.querySelector('.container');
            if (gameContainer && flagImage) {
                gameContainer.insertBefore(container, flagImage);
            }

            progressRef = { container, progressFill, progressText, timer, countdownTimer };
        }

        // Find or create team counters from existing teamsContainer children
        const teamCounters = {};
        if (teamsContainer) {
            const existingCounters = teamsContainer.querySelectorAll('[id$="Counter"]');
            if (existingCounters.length > 0) {
                existingCounters.forEach(el => {
                    const teamId = el.id.replace('Counter', '');
                    el._scoreSpan = el.querySelector('span:last-child') || el.lastElementChild;
                    el._nameSpan = el.querySelector('span:first-child') || el.firstElementChild;
                    el._teamDisplayName = el._nameSpan?.textContent || teamId;
                    el.setAttribute('aria-live', 'polite');
                    el.setAttribute('aria-atomic', 'true');
                    const score = el._scoreSpan?.textContent || '0';
                    el.setAttribute('aria-label', `${el._teamDisplayName}: ${score} puntos`);
                    teamCounters[teamId] = el;
                });
            } else {
                // Create team counters
                const teams = [
                    { teamId: 'red', teamDisplayName: 'Equipo Rojo' },
                    { teamId: 'blue', teamDisplayName: 'Equipo Azul' },
                    { teamId: 'green', teamDisplayName: 'Equipo Verde' },
                ];
                teams.forEach(t => {
                    const el = document.createElement('div');
                    el.id = `${t.teamId}Counter`;
                    el.setAttribute('aria-live', 'polite');
                    el.setAttribute('aria-atomic', 'true');
                    el.setAttribute('aria-label', `${t.teamDisplayName}: 0 puntos`);
                    const nameSpan = document.createElement('span');
                    nameSpan.textContent = t.teamDisplayName;
                    const scoreSpan = document.createElement('span');
                    scoreSpan.textContent = '0';
                    el.appendChild(nameSpan);
                    el.appendChild(scoreSpan);
                    el._nameSpan = nameSpan;
                    el._scoreSpan = scoreSpan;
                    el._teamDisplayName = t.teamDisplayName;
                    teamCounters[t.teamId] = el;
                    teamsContainer.appendChild(el);
                });
            }
        }

        // Build a minimal view-like object
        this.view = {
            _isDesktop: window.innerWidth > 600,
            gameState: null,
            elements: {
                flagImage,
                countryInfo,
                capitalInfo,
                teamsContainer,
                skipButton,
                endGameButton,
                startButton: document.getElementById('startButton'),
                teamCounters,
                progressContainer: progressRef,
                maxCountriesInput: document.getElementById('maxCountries'),
                continentFilter: document.getElementById('continentFilter'),
                sovereignFilter: document.getElementById('sovereignFilter'),
            },
            setCurrentCountry(country) { this._currentCountry = country; },
            updateFlagDisplay(country) {
                if (country && flagImage) {
                    flagImage.src = country.flagUrl;
                    flagImage.style.display = '';
                    if (countryInfo) {
                        countryInfo.classList.add('hidden-keep-space');
                        countryInfo.textContent = '';
                    }

                    const gState = this.gameState;
                    if (gState && gState.gameMode === 'capitals') {
                        // Show capitalInfo container (reserve space for reveal)
                        if (capitalInfo) capitalInfo.style.display = '';
                        const hintMode = gState.capitalsHintMode || 'flagAndName';
                        if (hintMode === 'nameOnly') {
                            flagImage.style.display = 'none';
                        }
                        if (hintMode === 'flagOnly') {
                            // countryInfo already hidden and empty
                        } else {
                            if (countryInfo) {
                                countryInfo.textContent = country.displayName;
                                countryInfo.classList.remove('hidden-keep-space');
                            }
                        }
                    } else {
                        // Flags mode: hide country name (reserve space for reveal), hide capitalInfo
                        if (countryInfo) {
                            countryInfo.textContent = country.displayName;
                            countryInfo.classList.add('hidden-keep-space');
                        }
                        if (capitalInfo) capitalInfo.style.display = 'none';
                    }
                }
            },
            updateStartButton(isActive) {
                const btn = document.getElementById('startButton');
                if (btn) btn.hidden = isActive;
            },
            setFiltersEnabled() {},
            hideSettingsPanel() {},
            setSettingsButtonVisible() {},
            showProgressContainer() {
                if (progressRef.container) progressRef.container.style.display = 'block';
            },
            hideProgressContainer() {
                if (progressRef.container) progressRef.container.style.display = 'none';
            },
            updateProgress(current, total) {
                if (progressRef.progressText) progressRef.progressText.textContent = `${current} / ${total}`;
                if (progressRef.progressFill) {
                    const pct = total > 0 ? (current / total) * 100 : 0;
                    progressRef.progressFill.style.width = `${pct}%`;
                }
            },
            updateTimer(seconds) {
                if (progressRef.timer) {
                    const m = Math.floor(seconds / 60);
                    const s = seconds % 60;
                    progressRef.timer.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                }
            },
            updateCountdown(seconds) {
                if (progressRef.countdownTimer) {
                    progressRef.countdownTimer.textContent = seconds;
                    progressRef.countdownTimer.className = seconds <= 2 ? 'countdown-timer urgent' : 'countdown-timer';
                }
            },
            showCountdown() {
                if (progressRef.countdownTimer) progressRef.countdownTimer.style.opacity = '1';
            },
            hideCountdown() {
                if (progressRef.countdownTimer) progressRef.countdownTimer.style.opacity = '0';
            },
            updateTeamScore(teamColor, score) {
                const counter = teamCounters[teamColor];
                if (counter && counter._scoreSpan) {
                    counter._scoreSpan.textContent = score;
                    const teamName = counter._teamDisplayName || counter._nameSpan?.textContent || teamColor;
                    counter.setAttribute('aria-label', `${teamName}: ${score} puntos`);
                }
            },
            showCountryInfo() {
                if (countryInfo) countryInfo.classList.remove('hidden-keep-space');
            },
            showCapitalInfo() {
                if (capitalInfo) { capitalInfo.classList.add('revealed'); }
            },
            hideCapitalInfo() {
                if (capitalInfo) { capitalInfo.classList.remove('revealed'); }
            },
            clearCountryInfo() {
                if (countryInfo) countryInfo.textContent = '';
            },
            clearCapitalInfo() {
                if (capitalInfo) { capitalInfo.textContent = ''; capitalInfo.classList.remove('revealed'); }
            },
            setDefaultFlag() {
                if (flagImage) flagImage.src = 'https://flagcdn.com/un.svg';
            },
            showGameEndMessage() {},
            getFilterValues() { return {}; },
            updateMaxCountriesInput() {},
        };
    }

    async initializeGame() {
        try {
            await this.countryService.loadCountries();
            this.setupEventListeners();
            this.updateMaxCountriesLimit();
        } catch (error) {
            console.error('Failed to initialize game:', error);
        }
    }

    setupEventListeners() {
        // Start/End game button
        this.view.elements.startButton.onclick = () => this.toggleGameState();
        
        // End game button (visible during game)
        if (this.view.elements.endGameButton) {
            this.view.elements.endGameButton.onclick = () => this.endGame();
        }
        
        // Skip button
        if (this.view.elements.skipButton) {
            this.view.elements.skipButton.onclick = () => this.skipCurrentFlag();
        }
        
        // Filter change listeners
        this.view.elements.continentFilter.onchange = () => this.updateMaxCountriesLimit();
        this.view.elements.sovereignFilter.onchange = () => this.updateMaxCountriesLimit();
        this.view.elements.maxCountriesInput.addEventListener('input', () => this.filterNumericInput());
        this.view.elements.maxCountriesInput.addEventListener('blur', () => this.validateMaxCountriesInput());
        
        // Flag click to reveal answer
        this.view.elements.flagImage.onclick = () => this.handleRevealAction();
        
        // Team scoring
        Object.keys(this.view.elements.teamCounters).forEach(teamColor => {
            this.view.elements.teamCounters[teamColor].onclick = () => this.handleTeamScore(teamColor);
        });
        
        // Keyboard events
        document.addEventListener('keydown', (event) => this.handleKeyPress(event));
    }

    toggleGameState() {
        if (this.gameState.isActive) {
            this.endGame();
        } else {
            this.startGame();
        }
    }

    startGame() {
        const filters = this.view.getFilterValues();

        // If Word Drop mode is selected, don't start the standard game
        if (filters.gameMode === 'wordDrop') return;

        this.filteredCountries = this.countryService.filterCountries(filters);
        
        if (this.filteredCountries.length === 0) {
            alert('No countries match the selected filters');
            return;
        }

        this.configureGameSettings(filters);
        this.gameService.startGame(this.filteredCountries);
        this.view.updateStartButton(true);
        this.view.setFiltersEnabled(false);
        this.view.hideSettingsPanel();
        this.view.setSettingsButtonVisible(false);
        this.resetTeamScores();
        this.startTimer();
        this.view.showProgressContainer();
        this.updateProgress();
        this.displayCurrentFlag();
    }

    /**
     * Starts the game with externally provided config and country pool.
     * Used by GameSessionManager to orchestrate team modes.
     *
     * @param {Object} config - Configuration from BottomSheetView
     * @param {string} config.continent - Continent filter
     * @param {string} config.sovereigntyStatus - Sovereignty filter
     * @param {number} config.maxCount - Country count
     * @param {boolean} [config.practiceMode] - Practice mode toggle
     * @param {boolean} [config.randomOrder] - Random order toggle
     * @param {Object} [config.modeOptions] - Mode-specific options (teams, hintMode)
     * @param {string} config.modeId - Mode identifier ('banderaFlash' or 'capitalQuest')
     * @param {import('../models/Country.js').Country[]} pool - Pre-filtered country pool
     */
    startWithConfig(config, pool) {
        if (!pool || pool.length === 0) {
            alert('No countries match the selected filters');
            return;
        }

        this.filteredCountries = pool;

        // Map mode ID to internal game mode
        const gameMode = config.modeId === 'capitalQuest' ? 'capitals' : 'flags';

        // Configure game state from external config
        this.gameState.isPracticeMode = config.practiceMode || false;
        this.gameState.gameMode = gameMode;
        this.gameState.isRandomMode = config.randomOrder !== false;
        this.gameState.capitalsHintMode = config.modeOptions?.hintMode || 'flagAndName';

        this.gameService.startGame(this.filteredCountries);
        this.view.updateStartButton(true);
        this.view.setFiltersEnabled(false);
        this.view.hideSettingsPanel();
        this.view.setSettingsButtonVisible(false);
        this.resetTeamScores();
        this.startTimer();
        this.view.showProgressContainer();
        this.updateProgress();
        this.displayCurrentFlag();

        // Wire up interactive elements
        if (this.view.elements.skipButton) {
            this.view.elements.skipButton.onclick = () => this.skipCurrentFlag();
        }
        if (this.view.elements.flagImage) {
            this.view.elements.flagImage.onclick = () => this.handleRevealAction();
        }
        Object.keys(this.view.elements.teamCounters).forEach(teamColor => {
            this.view.elements.teamCounters[teamColor].onclick = () => this.handleTeamScore(teamColor);
        });
        this._keyHandler = (event) => this.handleKeyPress(event);
        document.addEventListener('keydown', this._keyHandler);
    }

    endGame() {
        this.gameService.endGame();
        this.stopTimer();
        this.resetCountryState();
        this.updateFinalScores();
        this.view.showGameEndMessage(this.gameState.teamScores);
        this.view.setDefaultFlag();
        this.view.clearCountryInfo();
        this.view.clearCapitalInfo();
        this.view.updateStartButton(false);
        this.view.setFiltersEnabled(true);
        this.view.setSettingsButtonVisible(true);
        this.view.hideProgressContainer();
        this.updateMaxCountriesLimit();
        this.resetTeamScores();

        // Notify GameSessionManager that the game ended
        if (this.onGameEnd) {
            const elapsed = this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0;
            this.onGameEnd({
                teamScores: { ...this.gameState.teamScores },
                elapsedSeconds: elapsed,
                totalFlags: this.filteredCountries.length,
            });
        }

        // Return to landing after game ends
        document.body.classList.add('landing-mode');
    }

    handleTeamScore(teamColor) {
        if (!this.gameState.isActive) return;
        
        // Show country info if not visible
        if (!this.countryInfoRevealed) {
            this.revealCountryInfo();
            return;
        }

        // Process score and move to next flag
        const scoreProcessed = this.gameService.processTeamScore(teamColor);
        if (scoreProcessed) {
            this.view.updateTeamScore(teamColor, this.gameState.teamScores[teamColor]);
            this.updateProgress();
            this.resetCountryState();
            this.displayCurrentFlag();
        }
    }

    displayCurrentFlag() {
        const currentCountry = this.gameService.getCurrentCountry(this.filteredCountries);
        
        if (currentCountry) {
            this.view.gameState = this.gameState;
            this.view.setCurrentCountry(currentCountry);
            this.view.updateFlagDisplay(currentCountry);
            if (this.gameState.gameMode === 'capitals') {
                this.view.clearCapitalInfo();
            }
            this.startCountdown();
        } else {
            this.endGame();
        }
    }

    updateMaxCountriesLimit() {
        const filters = this.view.getFilterValues();
        const maxCount = this.countryService.getMaxCountryCount(filters);
        this.view.updateMaxCountriesInput(maxCount);
    }

    filterNumericInput() {
        const input = this.view.elements.maxCountriesInput;
        input.value = input.value.replace(/[^0-9]/g, '');
    }

    validateMaxCountriesInput() {
        const input = this.view.elements.maxCountriesInput;
        const max = parseInt(input.max, 10);
        const min = parseInt(input.min, 10);
        let value = parseInt(input.value, 10);

        if (input.value === '') {
            return;
        }

        if (isNaN(value) || value < min) {
            value = min;
        } else if (value > max) {
            value = max;
        }

        input.value = value;
    }

    updateAllTeamScores(useCurrentScores = true) {
        Object.keys(this.gameState.teamScores).forEach(teamColor => {
            const score = useCurrentScores ? this.gameState.teamScores[teamColor] : 0;
            this.view.updateTeamScore(teamColor, score);
        });
    }

    resetTeamScores() {
        this.updateAllTeamScores(false);
    }

    updateFinalScores() {
        this.updateAllTeamScores(true);
    }

    startTimer() {
        this.startTime = Date.now();
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            this.view.updateTimer(elapsed);
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.stopCountdown();
    }

    startCountdown() {
        this.stopCountdown();
        let countdownSeconds = this.gameState.isPracticeMode ? this.practiceCountdownSeconds : this.defaultCountdownSeconds;
        this.countryInfoRevealed = false;
        this.view.showCountdown();
        this.view.updateCountdown(countdownSeconds);
        
        this.countdownInterval = setInterval(() => {
            countdownSeconds--;
            this.view.updateCountdown(countdownSeconds);
            
            if (countdownSeconds <= 0) {
                this.revealCountryInfo();
                if (this.gameState.isPracticeMode) {
                    setTimeout(() => {
                        this.handleTeamScore('blue');
                    }, 2500);
                }
            }
        }, 1000);
    }

    stopCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
        this.view.hideCountdown();
    }

    revealCountryInfo() {
        if (this.countryInfoRevealed) return;
        
        this.countryInfoRevealed = true;
        
        if (this.gameState.gameMode === 'flags') {
            this.view.showCountryInfo();
        } else if (this.gameState.gameMode === 'capitals') {
            this.displayCapital();
        }
        
        this.stopCountdown();
    }

    displayCapital() {
        const currentCountry = this.gameService.getCurrentCountry(this.filteredCountries);
        if (currentCountry?.capital) {
            this.view.elements.capitalInfo.textContent = currentCountry.capital;
            this.view.showCapitalInfo();
        }
    }

    configureGameSettings(filters) {
        this.gameState.isPracticeMode = filters.practiceMode;
        this.gameState.gameMode = filters.gameMode;
        this.gameState.isRandomMode = filters.randomMode;
        this.gameState.capitalsHintMode = filters.capitalsHintMode || 'flagAndName';
    }

    resetCountryState() {
        this.countryInfoRevealed = false;
        this.view.hideCapitalInfo();
        this.stopCountdown();
    }

    updateProgress() {
        const total = this.filteredCountries.length;
        const current = this.gameState.currentIndex;
        this.view.updateProgress(current, total);
    }

    handleRevealAction() {
        if (this.gameState.isActive && !this.countryInfoRevealed) {
            this.revealCountryInfo();
        }
    }

    skipCurrentFlag() {
        if (!this.gameState.isActive) return;
        
        // Reveal the answer briefly, then move on (counts as draw)
        if (!this.countryInfoRevealed) {
            this.revealCountryInfo();
        }
        // Score as draw and advance
        this.handleTeamScore('blue');
    }

    handleKeyPress(event) {
        if (!this.gameState.isActive) return;
        
        const keyMap = {
            'r': 'red',
            'g': 'green', 
            'd': 'blue',
            'y': 'yellow'
        };
        
        // Skip with 'S' key
        if (event.key.toLowerCase() === 's') {
            this.skipCurrentFlag();
            return;
        }
        
        // Escape to end game
        if (event.key === 'Escape') {
            this.endGame();
            return;
        }
        
        // Space to reveal
        if (event.key === ' ') {
            event.preventDefault();
            this.handleRevealAction();
            return;
        }
        
        const teamColor = keyMap[event.key.toLowerCase()];
        if (teamColor) {
            this.handleTeamScore(teamColor);
        }
    }

    /**
     * Stops the game (alias for endGame, used by GameSessionManager).
     */
    stop() {
        if (this.gameState.isActive) {
            this.endGame();
        }
    }

    /**
     * Cleans up the controller (used by GameSessionManager).
     */
    destroy() {
        this.stop();
        this.stopTimer();
        if (this._keyHandler) {
            document.removeEventListener('keydown', this._keyHandler);
            this._keyHandler = null;
        }
    }
}
