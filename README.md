# History Quiz Game

A web-based educational history quiz game that tests your knowledge with adaptive difficulty levels and dynamic question generation.

## Features

- Multiple-choice history questions with four options each
- Three difficulty levels: Easy, Medium, and Hard
- Adaptive difficulty based on performance
- 10-second timer for each question
- Score tracking and performance summary
- Dynamic question generation using OpenRouter API with Gemini 2.0 Flash model
- Fallback to static questions if API is unavailable
- Hints for incorrect answers

## How to Use

1. Clone or download this repository
2. Open `index.html` in your web browser
3. Click "Start Quiz" to begin
4. Answer 10 history questions within the time limit
5. View your final score and performance summary at the end

## API Integration

To enable dynamic question generation and hints:

1. Sign up for an API key at [OpenRouter](https://openrouter.ai/)
2. Open `script.js` and add your API key to the `OPENROUTER_API_KEY` constant:

```javascript
const OPENROUTER_API_KEY = 'your-api-key-here';
```

If no API key is provided, the game will use the predefined static questions.

## Technologies Used

- HTML5
- CSS3
- JavaScript (ES6+)
- OpenRouter API with Gemini 2.0 Flash model

## Game Rules

- Each correct answer is worth 10 points
- The difficulty increases after 3 consecutive correct answers
- The difficulty decreases after 2 consecutive incorrect answers
- Questions are randomly selected from the current difficulty pool
- The game consists of 10 questions total

## License

This project is open source and available under the [MIT License](LICENSE).

