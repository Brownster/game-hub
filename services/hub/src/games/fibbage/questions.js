import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load questions from JSON file
let questionsData = null;

function loadQuestions() {
  if (questionsData) return questionsData;

  try {
    const filePath = join(__dirname, "questions.json");
    const raw = readFileSync(filePath, "utf-8");
    questionsData = JSON.parse(raw);
    console.log(`Loaded ${questionsData.normal?.length || 0} fibbage questions`);
    return questionsData;
  } catch (err) {
    console.error("Failed to load fibbage questions:", err);
    // Fallback with a few sample questions
    questionsData = {
      normal: [
        {
          category: "sample",
          question: "In 2013, a man was arrested for <BLANK> in public.",
          answer: "yodeling",
          alternateSpellings: [],
          suggestions: ["dancing", "sleeping", "singing", "juggling"],
        },
      ],
    };
    return questionsData;
  }
}

// Get a random question, avoiding ones already used
export function getRandomQuestion(usedIds = new Set()) {
  const data = loadQuestions();
  const questions = data.normal || [];

  // Filter out used questions
  const available = questions.filter((q, idx) => !usedIds.has(idx));

  if (available.length === 0) {
    // All questions used, reset and pick from all
    usedIds.clear();
    const idx = Math.floor(Math.random() * questions.length);
    return { question: questions[idx], questionIndex: idx };
  }

  // Pick random from available
  const randomIdx = Math.floor(Math.random() * available.length);
  const question = available[randomIdx];

  // Find original index
  const originalIdx = questions.findIndex((q) => q === question);

  return { question, questionIndex: originalIdx };
}

// Check if a submitted lie matches the truth (case insensitive, with alternate spellings)
export function matchesAnswer(submission, question) {
  const normalized = submission.trim().toLowerCase();
  const answer = question.answer.toLowerCase();

  if (normalized === answer) return true;

  // Check alternate spellings
  if (question.alternateSpellings) {
    for (const alt of question.alternateSpellings) {
      if (normalized === alt.toLowerCase()) return true;
    }
  }

  return false;
}

// Get total question count
export function getQuestionCount() {
  const data = loadQuestions();
  return data.normal?.length || 0;
}
