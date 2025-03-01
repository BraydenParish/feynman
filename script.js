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
const OPENROUTER_API_KEY = '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';

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

// Static Questions
const easyQuestions = [
    { text: "Who was the first President of the United States?", options: ["George Washington", "John Adams", "Thomas Jefferson", "Abraham Lincoln"], correctAnswer: 0, difficulty: "easy" }
];

const mediumQuestions = [
    { text: "In which year did World War II end?", options: ["1942", "1945", "1939", "1950"], correctAnswer: 1, difficulty: "medium" }
];

const hardQuestions = [
    { text: "Which battle is considered the turning point of the Eastern Front in WWII?", options: ["Stalingrad", "Normandy", "Midway", "El Alamein"], correctAnswer: 0, difficulty: "hard" }
];

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

// UI Management

// Power-up System

// Animation System

// Progress Management

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
    console.log('startGame triggered');
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
    
    try {
        question = await generateDynamicQuestion();
    } catch (error) {
        console.error('Error generating dynamic question:', error);
    }
    
    if (!question) {
        console.error('Dynamic question generation failed.');
        return;
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

function startTimer() {
    gameState.current.timeLeft = TIMER_DURATION;
    // Initialize the timer bar to 100%
    if (gameUI.updateTimerBar) {
        gameUI.updateTimerBar(100);
    }
    gameState.current.timerInterval = setInterval(() => {
        gameState.current.timeLeft--;
        let percentage = (gameState.current.timeLeft / TIMER_DURATION) * 100;
        if (gameUI.updateTimerBar) {
            gameUI.updateTimerBar(percentage);
        }
        // Play tick sound each second
        SOUNDS.tick.play();
        if (gameState.current.timeLeft <= 0) {
            clearInterval(gameState.current.timerInterval);
            // If time runs out, consider it as an incorrect answer (or call a timeout handler if available)
            handleAnswer(-1);
        }
    }, 1000);
}

async function handleAnswer(selectedIndex) {
    clearInterval(gameState.current.timerInterval);
    gameUI.setTimerBarPulsing(false);
    
    const isCorrect = selectedIndex === gameState.current.question.correctAnswer;
    const answerTime = TIMER_DURATION - gameState.current.timeLeft;
    
    if (isCorrect) {
        // Add green effect to the clicked button
        gameUI.elements.optionBtns[selectedIndex].classList.add('correct');
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
document.addEventListener('DOMContentLoaded', init); 