// Game State Management
export class GameState {
    constructor() {
        this.current = {
            question: null,
            questionIndex: 0,
            score: 0,
            xp: 0,
            level: 1,
            streak: 0,
            difficulty: 'easy',
            consecutiveCorrect: 0,
            consecutiveWrong: 0,
            answeredQuestions: new Set(),
            timerInterval: null,
            timeLeft: 10,
            performance: {
                easy: { correct: 0, total: 0 },
                medium: { correct: 0, total: 0 },
                hard: { correct: 0, total: 0 }
            },
            powerUps: {
                timeFreeze: 0,
                doubleXp: 0,
                skipQuestion: 0
            },
            activePowerUps: {
                doubleXp: false,
                timeFreeze: false
            }
        };
        
        this.listeners = new Set();
    }
    
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    
    update(changes) {
        const oldState = {...this.current};
        this.current = {...this.current, ...changes};
        this.notifyListeners(oldState);
    }
    
    notifyListeners(oldState) {
        this.listeners.forEach(listener => listener(this.current, oldState));
    }
    
    reset() {
        this.current = {
            ...this.current,
            questionIndex: 0,
            score: 0,
            streak: 0,
            difficulty: 'easy',
            consecutiveCorrect: 0,
            consecutiveWrong: 0,
            answeredQuestions: new Set(),
            performance: {
                easy: { correct: 0, total: 0 },
                medium: { correct: 0, total: 0 },
                hard: { correct: 0, total: 0 }
            }
        };
    }
} 