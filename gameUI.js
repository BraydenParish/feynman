// UI Management
export class GameUI {
    constructor() {
        this.elements = {
            startScreen: document.getElementById('start-screen'),
            quizScreen: document.getElementById('quiz-screen'),
            resultsScreen: document.getElementById('results-screen'),
            countdownScreen: document.getElementById('countdown-screen'),
            countdown: document.getElementById('countdown'),
            questionText: document.getElementById('question-text'),
            optionBtns: document.querySelectorAll('.option-btn'),
            score: document.getElementById('score'),
            difficulty: document.getElementById('difficulty'),
            timerBar: document.getElementById('timer-bar'),
            feedback: document.getElementById('feedback'),
            feedbackText: document.getElementById('feedback-text'),
            hintContainer: document.getElementById('hint-container'),
            hintText: document.getElementById('hint-text'),
            aiQuip: document.getElementById('ai-quip'),
            xpBar: document.getElementById('xp-bar'),
            xpProgress: document.getElementById('xp-progress'),
            level: document.getElementById('level'),
            streak: document.getElementById('streak'),
            streakCounter: document.getElementById('streak-counter'),
            streakFire: document.getElementById('streak-fire'),
            xpPopup: document.getElementById('xp-popup'),
            xpAmount: document.getElementById('xp-amount'),
            levelUpModal: document.getElementById('level-up-modal'),
            newLevel: document.getElementById('new-level'),
            levelTitle: document.getElementById('level-title'),
            powerUpBtns: {
                timeFreeze: document.getElementById('time-freeze'),
                doubleXp: document.getElementById('double-xp'),
                skipQuestion: document.getElementById('skip-question')
            },
            powerUpCounts: {
                timeFreeze: document.getElementById('time-freeze-count'),
                doubleXp: document.getElementById('double-xp-count'),
                skipQuestion: document.getElementById('skip-question-count')
            }
        };
    }
    
    setupEventListeners(handlers) {
        document.getElementById('start-btn').addEventListener('click', handlers.startGame);
        document.getElementById('next-btn').addEventListener('click', handlers.loadNextQuestion);
        document.getElementById('restart-btn').addEventListener('click', handlers.restartGame);
        document.getElementById('level-up-close').addEventListener('click', () => this.hideLevelUpModal());
        
        this.elements.optionBtns.forEach(button => {
            button.addEventListener('click', () => handlers.handleAnswer(parseInt(button.dataset.index)));
        });
        
        Object.entries(this.elements.powerUpBtns).forEach(([type, btn]) => {
            btn.addEventListener('click', () => handlers.activatePowerUp(type));
        });
    }
    
    updateXP(xp, maxXP) {
        this.elements.xpBar.style.width = `${(xp / maxXP) * 100}%`;
        this.elements.xpProgress.textContent = `${xp}/${maxXP} XP`;
        this.elements.level.textContent = Math.floor(xp / maxXP) + 1;
    }
    
    showXPPopup(amount) {
        this.elements.xpAmount.textContent = amount;
        this.elements.xpPopup.classList.remove('hidden');
        setTimeout(() => {
            this.elements.xpPopup.classList.add('hidden');
        }, 1500);
    }
    
    updateStreak(streak, threshold) {
        this.elements.streak.textContent = streak;
        this.elements.streakCounter.classList.toggle('hidden', streak === 0);
        this.elements.streakFire.classList.toggle('hidden', streak < threshold);
    }
    
    showLevelUpModal(level, title) {
        this.elements.newLevel.textContent = level;
        this.elements.levelTitle.textContent = title;
        this.elements.levelUpModal.classList.remove('hidden');
    }
    
    hideLevelUpModal() {
        this.elements.levelUpModal.classList.add('hidden');
    }
    
    updatePowerUps(powerUps) {
        Object.entries(powerUps).forEach(([type, count]) => {
            this.elements.powerUpCounts[type].textContent = count;
            this.elements.powerUpBtns[type].disabled = count === 0;
        });
    }
    
    setTimerBarPulsing(isPulsing) {
        this.elements.timerBar.classList.toggle('pulsing', isPulsing);
    }
    
    updateTimerBar(percentage) {
        this.elements.timerBar.style.width = `${percentage}%`;
        if (percentage < 30) {
            this.elements.timerBar.style.backgroundColor = '#dc3545';
        } else if (percentage < 60) {
            this.elements.timerBar.style.backgroundColor = '#ffc107';
        } else {
            this.elements.timerBar.style.backgroundColor = '#3498db';
        }
    }
    
    showFeedback(isCorrect, correctAnswer) {
        this.elements.feedbackText.textContent = isCorrect ? 
            "Correct!" : 
            `Incorrect. The correct answer is: ${correctAnswer}`;
        this.elements.feedbackText.className = isCorrect ? 'correct' : 'incorrect';
        this.elements.feedback.classList.remove('hidden');
    }
    
    showHint(hint) {
        this.elements.hintText.textContent = hint;
        this.elements.hintContainer.classList.remove('hidden');
    }
    
    showAIQuip(quip) {
        this.elements.aiQuip.textContent = quip;
        this.elements.aiQuip.classList.remove('hidden');
    }
    
    updateScore(score) {
        this.elements.score.textContent = score;
    }
    
    updateDifficulty(difficulty) {
        this.elements.difficulty.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    }
    
    showScreen(screenName) {
        ['startScreen', 'quizScreen', 'resultsScreen', 'countdownScreen'].forEach(screen => {
            this.elements[screen].classList.toggle('hidden', screen !== screenName);
        });
    }
    
    resetOptionButtons() {
        this.elements.optionBtns.forEach(button => {
            button.classList.remove('correct', 'incorrect', 'disabled');
        });
    }
    
    disableOptionButtons() {
        this.elements.optionBtns.forEach(button => {
            button.classList.add('disabled');
        });
    }
    
    updateQuestion(question) {
        this.elements.questionText.textContent = question.text;
        this.elements.optionBtns.forEach((button, index) => {
            button.textContent = question.options[index];
        });
    }
    
    showResults(score, performance, totalXP, level) {
        this.elements.finalScore.textContent = score;
        
        let summaryHTML = '<h3>Performance Summary</h3>';
        
        ['easy', 'medium', 'hard'].forEach(diff => {
            const stats = performance[diff];
            if (stats.total > 0) {
                const percentage = Math.round((stats.correct / stats.total) * 100);
                summaryHTML += `<p>${diff.charAt(0).toUpperCase() + diff.slice(1)}: ${stats.correct}/${stats.total} correct (${percentage}%)</p>`;
            }
        });
        
        const totalCorrect = Object.values(performance).reduce((sum, {correct}) => sum + correct, 0);
        const totalQuestions = Object.values(performance).reduce((sum, {total}) => sum + total, 0);
        const overallPercentage = Math.round((totalCorrect / totalQuestions) * 100);
        
        let assessment = '';
        if (overallPercentage >= 90) assessment = 'Outstanding! You\'re a history expert!';
        else if (overallPercentage >= 70) assessment = 'Great job! You have a solid understanding of history.';
        else if (overallPercentage >= 50) assessment = 'Good effort! Keep learning and improving your history knowledge.';
        else assessment = 'Keep studying! History has many fascinating stories to discover.';
        
        summaryHTML += `<p class="assessment">${assessment}</p>`;
        this.elements.performanceSummary.innerHTML = summaryHTML;
        
        document.getElementById('total-xp').textContent = totalXP;
        document.getElementById('final-level').textContent = level;
    }
} 