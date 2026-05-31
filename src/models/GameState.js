/**
 * GameState model to manage game state and team scores
 */
export class GameState {
    constructor() {
        this.isActive = false;
        this.currentIndex = 0;
        this.gameSequence = [];
        this.gameMode = 'flags'; // 'flags' or 'capitals'
        this.teamScores = {
            red: 0,
            blue: 0,
            green: 0
        };
        this.isRandomMode = true;
        this.isPracticeMode = false;
        this.practiceDelay = 2;
    }

    reset() {
        this.isActive = false;
        this.currentIndex = 0;
        this.gameSequence = [];
        this.teamScores = { red: 0, blue: 0, green: 0 };
    }

    incrementTeamScore(teamColor) {
        if (this.teamScores.hasOwnProperty(teamColor)) {
            this.teamScores[teamColor]++;
        }
    }

    get hasNextFlag() {
        return this.currentIndex < this.gameSequence.length;
    }

    nextFlag() {
        if (this.hasNextFlag) {
            this.currentIndex++;
        }
    }
}