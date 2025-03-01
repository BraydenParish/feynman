// Game Progress Management
export class GameProgress {
    constructor() {
        this.storage = window.localStorage;
        this.achievements = {
            quickLearner: {
                id: 'quickLearner',
                title: 'Quick Learner',
                description: 'Answer 3 questions correctly in under 5 seconds each',
                condition: (stats) => stats.fastAnswers >= 3
            },
            streakMaster: {
                id: 'streakMaster',
                title: 'Streak Master',
                description: 'Achieve a streak of 5 or more correct answers',
                condition: (stats) => stats.maxStreak >= 5
            },
            historyBuff: {
                id: 'historyBuff',
                title: 'History Buff',
                description: 'Complete a quiz with 90% or higher accuracy',
                condition: (stats) => (stats.correct / stats.total) >= 0.9
            },
            powerPlayer: {
                id: 'powerPlayer',
                title: 'Power Player',
                description: 'Use all types of power-ups in a single game',
                condition: (stats) => stats.powerUpsUsed >= 3
            },
            dailyScholar: {
                id: 'dailyScholar',
                title: 'Daily Scholar',
                description: 'Maintain a 3-day login streak',
                condition: (stats) => stats.loginStreak >= 3
            }
        };
    }
    
    save(gameState) {
        const progress = {
            highestLevel: gameState.current.level,
            totalXP: gameState.current.xp,
            streakDays: this.getStreakDays(),
            lastPlayed: new Date().toISOString(),
            achievements: this.getAchievements(gameState),
            stats: {
                gamesPlayed: this.getStats().gamesPlayed + 1,
                totalCorrect: this.getStats().totalCorrect + gameState.current.performance.correct,
                totalQuestions: this.getStats().totalQuestions + TOTAL_QUESTIONS,
                highestStreak: Math.max(this.getStats().highestStreak, gameState.current.streak)
            }
        };
        
        this.storage.setItem('historyQuizProgress', JSON.stringify(progress));
    }
    
    load() {
        const saved = this.storage.getItem('historyQuizProgress');
        if (saved) {
            return JSON.parse(saved);
        }
        return null;
    }
    
    getStats() {
        const saved = this.load();
        return saved?.stats || {
            gamesPlayed: 0,
            totalCorrect: 0,
            totalQuestions: 0,
            highestStreak: 0
        };
    }
    
    getStreakDays() {
        const saved = this.load();
        return saved?.streakDays || 0;
    }
    
    updateDailyStreak() {
        const lastPlayed = new Date(this.load()?.lastPlayed || 0);
        const today = new Date();
        const diffDays = Math.floor((today - lastPlayed) / (1000 * 60 * 60 * 24));
        
        let streakDays = this.getStreakDays();
        
        if (diffDays === 1) {
            streakDays++;
            this.checkDailyStreakAchievements(streakDays);
        } else if (diffDays > 1) {
            streakDays = 1;
        }
        
        return streakDays;
    }
    
    getAchievements(gameState) {
        const currentAchievements = this.load()?.achievements || [];
        const stats = {
            correct: Object.values(gameState.current.performance)
                .reduce((sum, {correct}) => sum + correct, 0),
            total: Object.values(gameState.current.performance)
                .reduce((sum, {total}) => sum + total, 0),
            maxStreak: gameState.current.streak,
            fastAnswers: this.countFastAnswers(gameState),
            powerUpsUsed: this.countUniquePowerUpsUsed(gameState),
            loginStreak: this.getStreakDays()
        };
        
        const newAchievements = Object.values(this.achievements)
            .filter(achievement => 
                !currentAchievements.includes(achievement.id) &&
                achievement.condition(stats)
            )
            .map(achievement => achievement.id);
        
        return [...currentAchievements, ...newAchievements];
    }
    
    countFastAnswers(gameState) {
        // This would need to be tracked during gameplay
        return gameState.current.fastAnswers || 0;
    }
    
    countUniquePowerUpsUsed(gameState) {
        return Object.values(gameState.current.powerUps)
            .filter(count => count > 0)
            .length;
    }
    
    checkDailyStreakAchievements(streakDays) {
        const achievements = this.load()?.achievements || [];
        if (streakDays >= 3 && !achievements.includes('dailyScholar')) {
            achievements.push('dailyScholar');
            this.storage.setItem('historyQuizProgress', JSON.stringify({
                ...this.load(),
                achievements
            }));
        }
    }
    
    getLeaderboardPosition(score) {
        const leaderboard = JSON.parse(this.storage.getItem('historyQuizLeaderboard') || '[]');
        const position = leaderboard.filter(entry => entry.score > score).length + 1;
        const total = leaderboard.length + 1;
        return {
            position,
            total,
            percentile: Math.round((total - position + 1) / total * 100)
        };
    }
    
    updateLeaderboard(score, playerName = 'Anonymous') {
        let leaderboard = JSON.parse(this.storage.getItem('historyQuizLeaderboard') || '[]');
        leaderboard.push({ score, playerName, date: new Date().toISOString() });
        leaderboard.sort((a, b) => b.score - a.score);
        leaderboard = leaderboard.slice(0, 100); // Keep only top 100
        this.storage.setItem('historyQuizLeaderboard', JSON.stringify(leaderboard));
    }
} 