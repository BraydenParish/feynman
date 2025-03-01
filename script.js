// Constants
const TOTAL_QUESTIONS = 10;
const TIMER_DURATION = 10; // seconds
const POINTS_PER_QUESTION = 10;
const CONSECUTIVE_CORRECT_TO_ADVANCE = 3;
const CONSECUTIVE_WRONG_TO_DOWNGRADE = 2;

// API Configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = ''; // Add your API key here

// Game State
const gameState = {
    currentQuestion: null,
    currentQuestionIndex: 0,
    score: 0,
    difficulty: 'easy', // 'easy', 'medium', 'hard'
    consecutiveCorrect: 0,
    consecutiveWrong: 0,
    answeredQuestions: [],
    timerInterval: null,
    timeLeft: TIMER_DURATION,
    performance: {
        easy: { correct: 0, total: 0 },
        medium: { correct: 0, total: 0 },
        hard: { correct: 0, total: 0 }
    }
};

// DOM Elements
const startScreen = document.getElementById('start-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultsScreen = document.getElementById('results-screen');
const startBtn = document.getElementById('start-btn');
const nextBtn = document.getElementById('next-btn');
const restartBtn = document.getElementById('restart-btn');
const questionText = document.getElementById('question-text');
const optionBtns = document.querySelectorAll('.option-btn');
const scoreDisplay = document.getElementById('score');
const difficultyDisplay = document.getElementById('difficulty');
const timerBar = document.getElementById('timer-bar');
const feedback = document.getElementById('feedback');
const feedbackText = document.getElementById('feedback-text');
const hintContainer = document.getElementById('hint-container');
const hintText = document.getElementById('hint-text');
const finalScore = document.getElementById('final-score');
const performanceSummary = document.getElementById('performance-summary');

// Predefined Questions
const easyQuestions = [
    {
        text: "Who was the first president of the United States?",
        options: ["Abraham Lincoln", "Thomas Jefferson", "George Washington", "John Adams"],
        correctAnswer: 2,
        difficulty: "easy"
    },
    {
        text: "In which year did World War II end?",
        options: ["1943", "1945", "1947", "1950"],
        correctAnswer: 1,
        difficulty: "easy"
    },
    {
        text: "Which ancient civilization built the pyramids of Giza?",
        options: ["Romans", "Greeks", "Egyptians", "Mayans"],
        correctAnswer: 2,
        difficulty: "easy"
    },
    {
        text: "Who wrote the Declaration of Independence?",
        options: ["George Washington", "Benjamin Franklin", "Thomas Jefferson", "John Adams"],
        correctAnswer: 2,
        difficulty: "easy"
    },
    {
        text: "Which event marked the beginning of World War I?",
        options: ["The assassination of Archduke Franz Ferdinand", "The invasion of Poland", "The bombing of Pearl Harbor", "The Russian Revolution"],
        correctAnswer: 0,
        difficulty: "easy"
    }
];

const mediumQuestions = [
    {
        text: "Which treaty ended World War I?",
        options: ["Treaty of Paris", "Treaty of Versailles", "Treaty of London", "Treaty of Berlin"],
        correctAnswer: 1,
        difficulty: "medium"
    },
    {
        text: "Who was the leader of the Soviet Union during the Cuban Missile Crisis?",
        options: ["Joseph Stalin", "Vladimir Lenin", "Nikita Khrushchev", "Leonid Brezhnev"],
        correctAnswer: 2,
        difficulty: "medium"
    },
    {
        text: "Which civilization is known for creating the first written legal code, the Code of Hammurabi?",
        options: ["Sumerians", "Babylonians", "Assyrians", "Persians"],
        correctAnswer: 1,
        difficulty: "medium"
    },
    {
        text: "During which decade did the Great Depression begin?",
        options: ["1910s", "1920s", "1930s", "1940s"],
        correctAnswer: 2,
        difficulty: "medium"
    },
    {
        text: "Who was the first female Prime Minister of the United Kingdom?",
        options: ["Theresa May", "Margaret Thatcher", "Queen Victoria", "Queen Elizabeth II"],
        correctAnswer: 1,
        difficulty: "medium"
    }
];

const hardQuestions = [
    {
        text: "Which of these countries was NOT part of the original Allied Powers in World War I?",
        options: ["United States", "France", "Russia", "United Kingdom"],
        correctAnswer: 0,
        difficulty: "hard"
    },
    {
        text: "The Defenestration of Prague in 1618 helped trigger which major European conflict?",
        options: ["The Hundred Years' War", "The Thirty Years' War", "The War of Spanish Succession", "The Franco-Prussian War"],
        correctAnswer: 1,
        difficulty: "hard"
    },
    {
        text: "Who was the last emperor of the Byzantine Empire?",
        options: ["Constantine XI Palaiologos", "Justinian I", "Basil II", "Alexios I Komnenos"],
        correctAnswer: 0,
        difficulty: "hard"
    },
    {
        text: "Which of these battles was NOT fought during the Napoleonic Wars?",
        options: ["Battle of Waterloo", "Battle of Austerlitz", "Battle of Trafalgar", "Battle of Gettysburg"],
        correctAnswer: 3,
        difficulty: "hard"
    },
    {
        text: "The Meiji Restoration occurred in which country?",
        options: ["China", "Korea", "Japan", "Vietnam"],
        correctAnswer: 2,
        difficulty: "hard"
    }
];

// Event Listeners
startBtn.addEventListener('click', startGame);
nextBtn.addEventListener('click', loadNextQuestion);
restartBtn.addEventListener('click', restartGame);
optionBtns.forEach(button => {
    button.addEventListener('click', () => handleAnswer(parseInt(button.dataset.index)));
});

// Game Functions
function startGame() {
    // Reset game state
    gameState.currentQuestionIndex = 0;
    gameState.score = 0;
    gameState.difficulty = 'easy';
    gameState.consecutiveCorrect = 0;
    gameState.consecutiveWrong = 0;
    gameState.answeredQuestions = [];
    gameState.performance = {
        easy: { correct: 0, total: 0 },
        medium: { correct: 0, total: 0 },
        hard: { correct: 0, total: 0 }
    };
    
    // Update UI
    scoreDisplay.textContent = '0';
    difficultyDisplay.textContent = 'Easy';
    
    // Hide start screen, show quiz screen
    startScreen.classList.add('hidden');
    quizScreen.classList.remove('hidden');
    
    // Load first question
    loadQuestion();
}

function restartGame() {
    resultsScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
}

async function loadQuestion() {
    // Clear previous feedback
    feedback.classList.add('hidden');
    hintContainer.classList.add('hidden');
    
    // Try to get a dynamic question from API first
    let question = null;
    
    if (OPENROUTER_API_KEY) {
        try {
            question = await generateDynamicQuestion();
        } catch (error) {
            console.error('Error generating dynamic question:', error);
            // Fall back to static questions
        }
    }
    
    // If API call failed or no API key, use static questions
    if (!question) {
        question = getStaticQuestion();
    }
    
    // Set current question
    gameState.currentQuestion = question;
    
    // Update UI
    questionText.textContent = question.text;
    optionBtns.forEach((button, index) => {
        button.textContent = question.options[index];
        button.classList.remove('correct', 'incorrect', 'disabled');
    });
    
    // Start timer
    startTimer();
}

function getStaticQuestion() {
    let questionPool;
    
    switch (gameState.difficulty) {
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
        !gameState.answeredQuestions.includes(q.text)
    );
    
    // If all questions in the current difficulty have been used, reset
    if (availableQuestions.length === 0) {
        return questionPool[Math.floor(Math.random() * questionPool.length)];
    }
    
    // Return a random question from available ones
    return availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
}

async function generateDynamicQuestion() {
    const prompt = `Generate a multiple-choice history question with 4 options. The difficulty level should be ${gameState.difficulty}. 
    Format the response as a JSON object with the following structure:
    {
      "text": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0, // Index of the correct option (0-3)
      "difficulty": "${gameState.difficulty}"
    }
    Make sure the question is factually accurate and the correct answer is properly indicated.`;
    
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
            messages: [
                { role: 'user', content: prompt }
            ],
            temperature: 0.7
        })
    });
    
    if (!response.ok) {
        throw new Error('Failed to generate question');
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse the JSON response
    try {
        const questionObj = JSON.parse(content);
        return questionObj;
    } catch (error) {
        console.error('Error parsing question JSON:', error);
        throw error;
    }
}

async function getHint() {
    if (!OPENROUTER_API_KEY) return null;
    
    const prompt = `The following history question was asked: "${gameState.currentQuestion.text}"
    The correct answer is: "${gameState.currentQuestion.options[gameState.currentQuestion.correctAnswer]}"
    Please provide a helpful hint that gives a clue about the correct answer without directly revealing it.`;
    
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
                messages: [
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate hint');
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('Error generating hint:', error);
        return null;
    }
}

function startTimer() {
    // Reset timer
    clearInterval(gameState.timerInterval);
    gameState.timeLeft = TIMER_DURATION;
    timerBar.style.width = '100%';
    
    // Start countdown
    gameState.timerInterval = setInterval(() => {
        gameState.timeLeft -= 0.1;
        const percentage = (gameState.timeLeft / TIMER_DURATION) * 100;
        timerBar.style.width = `${percentage}%`;
        
        // Change color as time runs out
        if (percentage < 30) {
            timerBar.style.backgroundColor = '#dc3545';
        } else if (percentage < 60) {
            timerBar.style.backgroundColor = '#ffc107';
        } else {
            timerBar.style.backgroundColor = '#3498db';
        }
        
        // Time's up
        if (gameState.timeLeft <= 0) {
            clearInterval(gameState.timerInterval);
            handleTimeUp();
        }
    }, 100);
}

function handleTimeUp() {
    // Stop the timer
    clearInterval(gameState.timerInterval);
    
    // Mark the correct answer
    optionBtns.forEach((button, index) => {
        if (index === gameState.currentQuestion.correctAnswer) {
            button.classList.add('correct');
        }
        button.classList.add('disabled');
    });
    
    // Show feedback
    feedbackText.textContent = "Time's up! The correct answer is: " + 
        gameState.currentQuestion.options[gameState.currentQuestion.correctAnswer];
    feedbackText.className = 'incorrect';
    feedback.classList.remove('hidden');
    
    // Update game state
    updateGameState(false);
    
    // Show hint if available
    showHint();
}

async function handleAnswer(selectedIndex) {
    // Stop the timer
    clearInterval(gameState.timerInterval);
    
    // Disable all option buttons
    optionBtns.forEach(button => button.classList.add('disabled'));
    
    // Check if answer is correct
    const isCorrect = selectedIndex === gameState.currentQuestion.correctAnswer;
    
    // Highlight selected answer and correct answer
    optionBtns[selectedIndex].classList.add(isCorrect ? 'correct' : 'incorrect');
    if (!isCorrect) {
        optionBtns[gameState.currentQuestion.correctAnswer].classList.add('correct');
    }
    
    // Show feedback
    if (isCorrect) {
        feedbackText.textContent = "Correct!";
        feedbackText.className = 'correct';
    } else {
        feedbackText.textContent = "Incorrect. The correct answer is: " + 
            gameState.currentQuestion.options[gameState.currentQuestion.correctAnswer];
        feedbackText.className = 'incorrect';
        
        // Show hint if answer is wrong
        showHint();
    }
    
    feedback.classList.remove('hidden');
    
    // Update game state
    updateGameState(isCorrect);
}

async function showHint() {
    if (OPENROUTER_API_KEY) {
        const hint = await getHint();
        if (hint) {
            hintText.textContent = hint;
            hintContainer.classList.remove('hidden');
        }
    }
}

function updateGameState(isCorrect) {
    // Track answered question
    gameState.answeredQuestions.push(gameState.currentQuestion.text);
    
    // Update performance tracking
    gameState.performance[gameState.difficulty].total += 1;
    
    if (isCorrect) {
        // Update score
        gameState.score += POINTS_PER_QUESTION;
        scoreDisplay.textContent = gameState.score;
        
        // Update performance tracking
        gameState.performance[gameState.difficulty].correct += 1;
        
        // Update consecutive counters
        gameState.consecutiveCorrect += 1;
        gameState.consecutiveWrong = 0;
        
        // Check if difficulty should increase
        if (gameState.consecutiveCorrect >= CONSECUTIVE_CORRECT_TO_ADVANCE) {
            if (gameState.difficulty === 'easy') {
                gameState.difficulty = 'medium';
                difficultyDisplay.textContent = 'Medium';
            } else if (gameState.difficulty === 'medium') {
                gameState.difficulty = 'hard';
                difficultyDisplay.textContent = 'Hard';
            }
            gameState.consecutiveCorrect = 0;
        }
    } else {
        // Update consecutive counters
        gameState.consecutiveCorrect = 0;
        gameState.consecutiveWrong += 1;
        
        // Check if difficulty should decrease
        if (gameState.consecutiveWrong >= CONSECUTIVE_WRONG_TO_DOWNGRADE) {
            if (gameState.difficulty === 'hard') {
                gameState.difficulty = 'medium';
                difficultyDisplay.textContent = 'Medium';
            } else if (gameState.difficulty === 'medium') {
                gameState.difficulty = 'easy';
                difficultyDisplay.textContent = 'Easy';
            }
            gameState.consecutiveWrong = 0;
        }
    }
}

function loadNextQuestion() {
    gameState.currentQuestionIndex += 1;
    
    // Check if quiz is complete
    if (gameState.currentQuestionIndex >= TOTAL_QUESTIONS) {
        showResults();
    } else {
        loadQuestion();
    }
}

function showResults() {
    // Hide quiz screen, show results screen
    quizScreen.classList.add('hidden');
    resultsScreen.classList.remove('hidden');
    
    // Update final score
    finalScore.textContent = gameState.score;
    
    // Generate performance summary
    let summaryHTML = '<h3>Performance Summary</h3>';
    
    // Easy questions summary
    const easyStats = gameState.performance.easy;
    if (easyStats.total > 0) {
        const easyPercentage = Math.round((easyStats.correct / easyStats.total) * 100);
        summaryHTML += `<p>Easy: ${easyStats.correct}/${easyStats.total} correct (${easyPercentage}%)</p>`;
    }
    
    // Medium questions summary
    const mediumStats = gameState.performance.medium;
    if (mediumStats.total > 0) {
        const mediumPercentage = Math.round((mediumStats.correct / mediumStats.total) * 100);
        summaryHTML += `<p>Medium: ${mediumStats.correct}/${mediumStats.total} correct (${mediumPercentage}%)</p>`;
    }
    
    // Hard questions summary
    const hardStats = gameState.performance.hard;
    if (hardStats.total > 0) {
        const hardPercentage = Math.round((hardStats.correct / hardStats.total) * 100);
        summaryHTML += `<p>Hard: ${hardStats.correct}/${hardStats.total} correct (${hardPercentage}%)</p>`;
    }
    
    // Overall assessment
    const totalCorrect = easyStats.correct + mediumStats.correct + hardStats.correct;
    const totalQuestions = TOTAL_QUESTIONS;
    const overallPercentage = Math.round((totalCorrect / totalQuestions) * 100);
    
    let assessment = '';
    if (overallPercentage >= 90) {
        assessment = 'Outstanding! You\'re a history expert!';
    } else if (overallPercentage >= 70) {
        assessment = 'Great job! You have a solid understanding of history.';
    } else if (overallPercentage >= 50) {
        assessment = 'Good effort! Keep learning and improving your history knowledge.';
    } else {
        assessment = 'Keep studying! History has many fascinating stories to discover.';
    }
    
    summaryHTML += `<p class="assessment">${assessment}</p>`;
    
    // Update performance summary
    performanceSummary.innerHTML = summaryHTML;
}

// Initialize the game
function init() {
    // Check if API key is available
    if (!OPENROUTER_API_KEY) {
        console.warn('OpenRouter API key not provided. Using static questions only.');
    }
}

// Start the game initialization
init(); 