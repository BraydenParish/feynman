// Power-up System
export class PowerUpSystem {
    constructor(gameState, gameUI) {
        this.gameState = gameState;
        this.gameUI = gameUI;
        this.powerUps = {
            timeFreeze: {
                count: 0,
                duration: 5000,
                effect: () => this.freezeTimer(),
                earnCondition: (state) => state.streak >= 5
            },
            doubleXp: {
                count: 0,
                duration: 30000,
                effect: () => this.activateDoubleXP(),
                earnCondition: (state) => state.consecutiveCorrect >= 3
            },
            skipQuestion: {
                count: 0,
                effect: () => this.skipCurrentQuestion(),
                earnCondition: (state) => state.streak >= 7
            }
        };
    }
    
    checkPowerUpEarnings() {
        Object.entries(this.powerUps).forEach(([name, powerUp]) => {
            if (powerUp.earnCondition(this.gameState.current)) {
                this.awardPowerUp(name);
            }
        });
    }
    
    awardPowerUp(name) {
        this.gameState.current.powerUps[name]++;
        this.gameUI.updatePowerUps(this.gameState.current.powerUps);
        this.showPowerUpNotification(name);
    }
    
    activatePowerUp(type) {
        if (this.gameState.current.powerUps[type] > 0) {
            this.gameState.current.powerUps[type]--;
            this.powerUps[type].effect();
            this.gameUI.updatePowerUps(this.gameState.current.powerUps);
        }
    }
    
    freezeTimer() {
        this.gameState.current.activePowerUps.timeFreeze = true;
        setTimeout(() => {
            this.gameState.current.activePowerUps.timeFreeze = false;
        }, this.powerUps.timeFreeze.duration);
    }
    
    activateDoubleXP() {
        this.gameState.current.activePowerUps.doubleXp = true;
        setTimeout(() => {
            this.gameState.current.activePowerUps.doubleXp = false;
        }, this.powerUps.doubleXp.duration);
    }
    
    skipCurrentQuestion() {
        // This will be implemented in the main game logic
        if (typeof this.onSkipQuestion === 'function') {
            this.onSkipQuestion();
        }
    }
    
    showPowerUpNotification(type) {
        const messages = {
            timeFreeze: '❄️ Time Freeze power-up earned! Use it to pause the timer.',
            doubleXp: '⚡ Double XP power-up earned! Use it to double your next correct answer\'s XP.',
            skipQuestion: '⏭️ Skip Question power-up earned! Use it to skip a difficult question.'
        };
        
        // TODO: Implement a notification system
        console.log(messages[type]);
    }
    
    setSkipQuestionHandler(handler) {
        this.onSkipQuestion = handler;
    }
} 