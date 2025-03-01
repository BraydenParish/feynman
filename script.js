import { GameState } from './gameState.js';
import { GameUI } from './gameUI.js';
import { PowerUpSystem } from './powerUps.js';
import { AnimationSystem } from './animations.js';
import { GameProgress } from './gameProgress.js';

// Constants
const TOTAL_QUESTIONS = 10;
const TIMER_DURATION = 10; // seconds
const POINTS_PER_QUESTION = 10;
const CONSECUTIVE_CORRECT_TO_ADVANCE = 3;
const CONSECUTIVE_WRONG_TO_DOWNGRADE = 2;
const XP_PER_CORRECT = 50;
const XP_PER_LEVEL = 500;
const STREAK_BONUS_THRESHOLD = 3;
const STREAK_BONUS_MULTIPLIER = 1.1; // 10% bonus

// API Configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = ''; // Add your API key here

// Sound Effects
const SOUNDS = {
    correct: new Audio('https://assets.mixkit.co/active_storage/sfx/2577/2577-preview.mp3'),
    wrong: new Audio('https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3'),
    tick: new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'),
    levelUp: new Audio('https://assets.mixkit.co/active_storage/sfx/2588/2588-preview.mp3'),
    streak: new Audio('https://assets.mixkit.co/active_storage/sfx/2563/2563-preview.mp3'),
    countdown: new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3')
};

// Preload sounds and set volume
Object.values(SOUNDS).forEach(sound => {
    sound.load();
    sound.volume = 0.5;
});

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// State Management
class GameState {
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
            timeLeft: TIMER_DURATION,
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

// UI Management
class GameUI {
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
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        document.getElementById('start-btn').addEventListener('click', () => startGame());
        document.getElementById('next-btn').addEventListener('click', () => loadNextQuestion());
        document.getElementById('restart-btn').addEventListener('click', () => restartGame());
        document.getElementById('level-up-close').addEventListener('click', () => this.hideLevelUpModal());
        
        this.elements.optionBtns.forEach(button => {
            button.addEventListener('click', () => handleAnswer(parseInt(button.dataset.index)));
        });
        
        Object.entries(this.elements.powerUpBtns).forEach(([type, btn]) => {
            btn.addEventListener('click', () => powerUpSystem.activatePowerUp(type));
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
    
    updateStreak(streak) {
        this.elements.streak.textContent = streak;
        this.elements.streakCounter.classList.toggle('hidden', streak === 0);
        this.elements.streakFire.classList.toggle('hidden', streak < STREAK_BONUS_THRESHOLD);
    }
    
    showLevelUpModal(level, title) {
        this.elements.newLevel.textContent = level;
        this.elements.levelTitle.textContent = title;
        this.elements.levelUpModal.classList.remove('hidden');
        animationSystem.createFireworks();
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
}

// Power-up System
class PowerUpSystem {
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
        loadNextQuestion();
    }
    
    showPowerUpNotification(type) {
        // TODO: Implement power-up notification UI
    }
}

// Animation System
class AnimationSystem {
    constructor() {
        this.particles = [];
        this.container = document.getElementById('particles-container');
    }
    
    createParticle(x, y, color) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        particle.style.backgroundColor = color;
        this.container.appendChild(particle);
        return particle;
    }
    
    async correctAnswerAnimation(element) {
        const rect = element.getBoundingClientRect();
        const particles = [];
        
        for (let i = 0; i < 15; i++) {
            const particle = this.createParticle(
                rect.left + Math.random() * rect.width,
                rect.top + Math.random() * rect.height,
                '#28a745'
            );
            particles.push(particle);
        }
        
        await this.animateParticles(particles);
    }
    
    createFireworks() {
        const fireworksContainer = document.querySelector('.fireworks');
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const firework = document.createElement('div');
                firework.className = 'firework';
                firework.style.left = `${Math.random() * 100}%`;
                firework.style.top = `${Math.random() * 100}%`;
                fireworksContainer.appendChild(firework);
                
                setTimeout(() => firework.remove(), 800);
            }, i * 200);
        }
    }
    
    async animateParticles(particles) {
        const animations = particles.map(particle => {
            const angle = Math.random() * Math.PI * 2;
            const velocity = 1 + Math.random() * 2;
            const distance = 30 + Math.random() * 50;
            
            return new Promise(resolve => {
                const startX = parseFloat(particle.style.left);
                const startY = parseFloat(particle.style.top);
                let progress = 0;
                
                const animate = () => {
                    progress += 0.05;
                    if (progress >= 1) {
                        particle.remove();
                        resolve();
                        return;
                    }
                    
                    const x = startX + Math.cos(angle) * distance * progress;
                    const y = startY + Math.sin(angle) * distance * progress;
                    particle.style.left = `${x}px`;
                    particle.style.top = `${y}px`;
                    particle.style.opacity = 1 - progress;
                    
                    requestAnimationFrame(animate);
                };
                
                requestAnimationFrame(animate);
            });
        });
        
        await Promise.all(animations);
    }
}

// Progress Management
class GameProgress {
    constructor() {
        this.storage = window.localStorage;
    }
    
    save(gameState) {
        const progress = {
            highestLevel: gameState.current.level,
            totalXP: gameState.current.xp,
            streakDays: this.getStreakDays(),
            lastPlayed: new Date().toISOString(),
            achievements: this.getAchievements(gameState)
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
        } else if (diffDays > 1) {
            streakDays = 1;
        }
        
        return streakDays;
    }
    
    getAchievements(gameState) {
        // TODO: Implement achievements system
        return [];
    }
}

// Initialize game components
const gameState = new GameState();
const gameUI = new GameUI();
const powerUpSystem = new PowerUpSystem(gameState, gameUI);
const animationSystem = new AnimationSystem();
const gameProgress = new GameProgress();

// Question Generation and API Integration
async function generateDynamicQuestion() {
    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'History Quiz Game'
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-thinking-exp:free',
                messages: [{
                    role: 'user',
                    content: `Generate a multiple-choice history question with 4 options. 
                    The difficulty level should be ${gameState.current.difficulty}. 
                    Format the response as a JSON object with the following structure:
                    {
                      "text": "The question text",
                      "options": ["Option A", "Option B", "Option C", "Option D"],
                      "correctAnswer": 0,
                      "difficulty": "${gameState.current.difficulty}"
                    }
                    Make sure the question is factually accurate and the correct answer is properly indicated.`
                }],
                temperature: 0.7
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('API Error:', errorData);
            throw new Error(`Failed to generate question: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        if (!data.choices?.[0]?.message?.content) {
            throw new Error('Invalid API response format');
        }
        
        const questionObj = JSON.parse(data.choices[0].message.content);
        validateQuestionFormat(questionObj);
        return questionObj;
    } catch (error) {
        console.error('Question generation failed:', error);
        return null;
    }
}

function validateQuestionFormat(question) {
    const required = ['text', 'options', 'correctAnswer', 'difficulty'];
    const missing = required.filter(field => !question[field]);
    if (missing.length > 0) {
        throw new Error(`Invalid question format. Missing: ${missing.join(', ')}`);
    }
    
    if (!Array.isArray(question.options) || question.options.length !== 4) {
        throw new Error('Question must have exactly 4 options');
    }
    
    if (typeof question.correctAnswer !== 'number' || 
        question.correctAnswer < 0 || 
        question.correctAnswer > 3) {
        throw new Error('correctAnswer must be a number between 0 and 3');
    }
}

// Game Flow Functions
async function startGame() {
    gameState.reset();
    gameUI.showScreen('countdownScreen');
    await startCountdown();
    gameUI.showScreen('quizScreen');
    loadQuestion();
}

async function startCountdown() {
    for (let i = 3; i > 0; i--) {
        gameUI.elements.countdown.textContent = i;
        SOUNDS.countdown.play();
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

async function loadQuestion() {
    gameUI.elements.feedback.classList.add('hidden');
    gameUI.elements.hintContainer.classList.add('hidden');
    
    let question = null;
    
    if (OPENROUTER_API_KEY) {
        try {
            question = await generateDynamicQuestion();
        } catch (error) {
            console.error('Error generating dynamic question:', error);
        }
    }
    
    if (!question) {
        question = getStaticQuestion();
    }
    
    gameState.update({ question });
    gameUI.updateQuestion(question);
    startTimer();
}

function getStaticQuestion() {
    let questionPool;
    
    switch (gameState.current.difficulty) {
        case 'easy':
            questionPool = easyQuestions;
            break;
        case 'medium':
            questionPool = mediumQuestions;
            break;
        case 'hard':
            questionPool = hardQuestions;
            break;
    }
    
    // Filter out the immediately previous question
    const availableQuestions = questionPool.filter(q => 
        !gameState.current.answeredQuestions.has(q.text)
    );
    
    // If all questions in the current difficulty have been used, reset
    if (availableQuestions.length === 0) {
        return questionPool[Math.floor(Math.random() * questionPool.length)];
    }
    
    // Return a random question from available ones
    return availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
}

async function handleAnswer(selectedIndex) {
    clearInterval(gameState.current.timerInterval);
    gameUI.setTimerBarPulsing(false);
    
    const isCorrect = selectedIndex === gameState.current.question.correctAnswer;
    const answerTime = TIMER_DURATION - gameState.current.timeLeft;
    
    if (isCorrect) {
        SOUNDS.correct.play();
        await animationSystem.correctAnswerAnimation(gameUI.elements.optionBtns[selectedIndex]);
        if (answerTime <= 5) {
            gameState.current.fastAnswers = (gameState.current.fastAnswers || 0) + 1;
        }
    } else {
        SOUNDS.wrong.play();
        animationSystem.shakeScreen();
    }
    
    gameUI.showFeedback(
        isCorrect,
        gameState.current.question.options[gameState.current.question.correctAnswer]
    );
    
    if (!isCorrect) {
        showHint();
    }
    
    updateGameState(isCorrect);
}

async function showHint() {
    if (OPENROUTER_API_KEY) {
        const hint = await generateHint();
        if (hint) {
            gameUI.showHint(hint);
        }
    }
}

function updateGameState(isCorrect) {
    // Update streak
    if (isCorrect) {
        gameState.current.streak++;
        if (gameState.current.streak >= STREAK_BONUS_THRESHOLD) {
            SOUNDS.streak.play();
        }
    } else {
        gameState.current.streak = 0;
    }
    
    // Update consecutive counters
    if (isCorrect) {
        gameState.current.consecutiveCorrect++;
        gameState.current.consecutiveWrong = 0;
    } else {
        gameState.current.consecutiveCorrect = 0;
        gameState.current.consecutiveWrong++;
    }
    
    // Update difficulty
    if (gameState.current.consecutiveCorrect >= CONSECUTIVE_CORRECT_TO_ADVANCE) {
        if (gameState.current.difficulty === 'easy') {
            gameState.current.difficulty = 'medium';
        } else if (gameState.current.difficulty === 'medium') {
            gameState.current.difficulty = 'hard';
        }
        gameState.current.consecutiveCorrect = 0;
    } else if (gameState.current.consecutiveWrong >= CONSECUTIVE_WRONG_TO_DOWNGRADE) {
        if (gameState.current.difficulty === 'hard') {
            gameState.current.difficulty = 'medium';
        } else if (gameState.current.difficulty === 'medium') {
            gameState.current.difficulty = 'easy';
        }
        gameState.current.consecutiveWrong = 0;
    }
    
    // Update score and XP
    if (isCorrect) {
        const basePoints = POINTS_PER_QUESTION;
        const streakBonus = gameState.current.streak >= STREAK_BONUS_THRESHOLD ? 
            STREAK_BONUS_MULTIPLIER : 1;
        const xpMultiplier = gameState.current.activePowerUps.doubleXp ? 2 : 1;
        
        const points = Math.round(basePoints * streakBonus);
        const xp = Math.round(XP_PER_CORRECT * streakBonus * xpMultiplier);
        
        gameState.current.score += points;
        addXP(xp);
    }
    
    // Update UI
    gameUI.updateScore(gameState.current.score);
    gameUI.updateDifficulty(gameState.current.difficulty);
    gameUI.updateStreak(gameState.current.streak, STREAK_BONUS_THRESHOLD);
    
    // Check for power-ups
    powerUpSystem.checkPowerUpEarnings();
    
    // Track performance
    gameState.current.performance[gameState.current.difficulty].total++;
    if (isCorrect) {
        gameState.current.performance[gameState.current.difficulty].correct++;
    }
    
    // Add question to answered list
    gameState.current.answeredQuestions.add(gameState.current.question.text);
}

function addXP(amount) {
    const oldLevel = Math.floor(gameState.current.xp / XP_PER_LEVEL);
    gameState.current.xp += amount;
    const newLevel = Math.floor(gameState.current.xp / XP_PER_LEVEL);
    
    gameUI.showXPPopup(amount);
    gameUI.updateXP(gameState.current.xp, XP_PER_LEVEL);
    
    if (newLevel > oldLevel) {
        levelUp(newLevel);
    }
}

function levelUp(level) {
    SOUNDS.levelUp.play();
    gameUI.showLevelUpModal(level, getLevelTitle(level));
    animationSystem.createFireworks();
}

function getLevelTitle(level) {
    const titles = [
        'History Novice',
        'Knowledge Seeker',
        'Time Traveler',
        'History Enthusiast',
        'Chronicle Master',
        'Wisdom Keeper',
        'Legacy Guardian',
        'History Scholar',
        'Time Lord',
        'History Legend'
    ];
    return titles[Math.min(level - 1, titles.length - 1)];
}

function loadNextQuestion() {
    gameState.current.questionIndex++;
    
    if (gameState.current.questionIndex >= TOTAL_QUESTIONS) {
        showResults();
    } else {
        loadQuestion();
    }
}

function showResults() {
    gameUI.showScreen('resultsScreen');
    gameUI.showResults(
        gameState.current.score,
        gameState.current.performance,
        gameState.current.xp,
        Math.floor(gameState.current.xp / XP_PER_LEVEL) + 1
    );
    
    const leaderboardPosition = gameProgress.getLeaderboardPosition(gameState.current.score);
    document.getElementById('percentile').textContent = leaderboardPosition.percentile;
    document.getElementById('peer-comparison').classList.remove('hidden');
    
    gameProgress.updateLeaderboard(gameState.current.score);
    gameProgress.save(gameState);
    
    const streakDays = gameProgress.updateDailyStreak();
    if (streakDays > 0) {
        document.getElementById('login-streak').textContent = streakDays;
        document.getElementById('daily-streak').classList.remove('hidden');
    }
}

function restartGame() {
    gameUI.showScreen('startScreen');
}

// Initialize the game
function init() {
    if (!OPENROUTER_API_KEY) {
        console.warn('OpenRouter API key not provided. Using static questions only.');
    }
    
    const progress = gameProgress.load();
    if (progress) {
        gameState.update({
            xp: progress.totalXP,
            level: Math.floor(progress.totalXP / XP_PER_LEVEL) + 1
        });
        gameUI.updateXP(progress.totalXP, XP_PER_LEVEL);
    }
    
    gameProgress.updateDailyStreak();
    
    // Set up event handlers
    gameUI.setupEventListeners({
        startGame,
        loadNextQuestion,
        restartGame,
        handleAnswer,
        activatePowerUp: (type) => powerUpSystem.activatePowerUp(type)
    });
    
    powerUpSystem.setSkipQuestionHandler(() => loadNextQuestion());
}

// Start the game initialization
init(); 