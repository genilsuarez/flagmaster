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
     */
    constructor(options = {}) {
        this.gameState = new GameState();
        this.countryService = new CountryService();
        this.gameService = new GameService(this.gameState);
        this.view = new GameView();
        this.filteredCountries = [];
        this.startTime = null;
        this.timerInterval = null;
        this.countdownInterval = null;
        this.defaultCountdownSeconds = 4;
        this.practiceCountdownSeconds = 2;
        this.countryInfoRevealed = false;
        this.onGameEnd = options.onGameEnd || null;
        
        this.initializeGame();
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
    }
}
