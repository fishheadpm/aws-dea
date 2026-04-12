'use strict';

const DATA_URL = './data.json';
const STORAGE_KEY_PROGRESS = 'aws_term_progress_v1';
const STORAGE_KEY_HISTORY = 'aws_term_history_v1';

const titleScreen = document.getElementById('titleScreen');
const quizScreen = document.getElementById('quizScreen');
const completeScreen = document.getElementById('completeScreen');
const historyScreen = document.getElementById('historyScreen');

const startFromBeginningButton = document.getElementById('startFromBeginningButton');
const continueButton = document.getElementById('continueButton');
const historyButton = document.getElementById('historyButton');

const progressLabel = document.getElementById('progressLabel');
const questionText = document.getElementById('questionText');

const beforeRevealArea = document.getElementById('beforeRevealArea');
const answerArea = document.getElementById('answerArea');
const answerTerm = document.getElementById('answerTerm');

const showAnswerButton = document.getElementById('showAnswerButton');
const correctButton = document.getElementById('correctButton');
const wrongButton = document.getElementById('wrongButton');

const backToTitleFromQuizButton = document.getElementById('backToTitleFromQuizButton');
const backToTitleAfterRevealButton = document.getElementById('backToTitleAfterRevealButton');
const backToTitleFromCompleteButton = document.getElementById('backToTitleFromCompleteButton');
const backToTitleFromHistoryButton = document.getElementById('backToTitleFromHistoryButton');

const historyList = document.getElementById('historyList');

let allQuestions = [];
let currentProgress = null;

function hideAllScreens() {
  titleScreen.classList.add('hidden');
  quizScreen.classList.add('hidden');
  completeScreen.classList.add('hidden');
  historyScreen.classList.add('hidden');
}

function showTitleScreen() {
  hideAllScreens();
  titleScreen.classList.remove('hidden');
}

function showQuizScreen() {
  hideAllScreens();
  quizScreen.classList.remove('hidden');
}

function showCompleteScreen() {
  hideAllScreens();
  completeScreen.classList.remove('hidden');
}

function showHistoryScreen() {
  hideAllScreens();
  historyScreen.classList.remove('hidden');
}

function loadHistoryMap() {
  const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error('履歴データの読み込みに失敗しました', error);
    return {};
  }
}

function saveHistoryMap(historyMap) {
  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(historyMap));
}

function incrementWrongCount(questionId) {
  const historyMap = loadHistoryMap();
  historyMap[questionId] = (historyMap[questionId] || 0) + 1;
  saveHistoryMap(historyMap);
}

function loadProgress() {
  const raw = localStorage.getItem(STORAGE_KEY_PROGRESS);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error('進行データの読み込みに失敗しました', error);
    return null;
  }
}

function saveProgress(progress) {
  localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(progress));
}

function clearProgress() {
  localStorage.removeItem(STORAGE_KEY_PROGRESS);
}

function shuffle(array) {
  const copied = [...array];
  for (let i = copied.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  return copied;
}

function createNewProgress() {
  const shuffledIds = shuffle(allQuestions.map((q) => q.id));
  return {
    queue: shuffledIds,
    solvedIds: []
  };
}

function getQuestionById(id) {
  return allQuestions.find((q) => q.id === id) || null;
}

function getCurrentQuestion() {
  if (!currentProgress || !currentProgress.queue.length) {
    return null;
  }
  return getQuestionById(currentProgress.queue[0]);
}

function renderCurrentQuestion() {
  const currentQuestion = getCurrentQuestion();

  if (!currentQuestion) {
    clearProgress();
    currentProgress = null;
    showCompleteScreen();
    return;
  }

  const solvedCount = currentProgress.solvedIds.length;
  const totalCount = allQuestions.length;

  progressLabel.textContent = `進行状況: ${solvedCount} / ${totalCount}`;
  questionText.textContent = currentQuestion.description;
  answerTerm.textContent = '';

  beforeRevealArea.classList.remove('hidden');
  answerArea.classList.add('hidden');

  showQuizScreen();
}

function startFromBeginning() {
  currentProgress = createNewProgress();
  saveProgress(currentProgress);
  renderCurrentQuestion();
}

function continueFromSaved() {
  const saved = loadProgress();

  if (!saved || !Array.isArray(saved.queue) || !Array.isArray(saved.solvedIds) || saved.queue.length === 0) {
    alert('続きのデータがありません。');
    return;
  }

  currentProgress = saved;
  renderCurrentQuestion();
}

function showAnswer() {
  const currentQuestion = getCurrentQuestion();
  if (!currentQuestion) {
    return;
  }

  answerTerm.textContent = currentQuestion.term;
  beforeRevealArea.classList.add('hidden');
  answerArea.classList.remove('hidden');
}

function markCorrect() {
  const currentQuestion = getCurrentQuestion();
  if (!currentQuestion) {
    return;
  }

  const currentId = currentQuestion.id;
  currentProgress.queue.shift();

  if (!currentProgress.solvedIds.includes(currentId)) {
    currentProgress.solvedIds.push(currentId);
  }

  saveProgress(currentProgress);
  renderCurrentQuestion();
}

function markWrong() {
  const currentQuestion = getCurrentQuestion();
  if (!currentQuestion) {
    return;
  }

  const currentId = currentQuestion.id;
  currentProgress.queue.shift();
  currentProgress.queue.push(currentId);

  incrementWrongCount(currentId);
  saveProgress(currentProgress);
  renderCurrentQuestion();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderHistory() {
  const historyMap = loadHistoryMap();

  const items = Object.entries(historyMap)
    .map(([id, count]) => {
      const question = getQuestionById(id);
      if (!question) {
        return null;
      }

      return {
        id,
        count,
        term: question.term,
        description: question.description
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term, 'ja'));

  if (items.length === 0) {
    historyList.innerHTML = '<p class="empty-message">まだ間違えた履歴はありません。</p>';
    return;
  }

  historyList.innerHTML = items.map((item) => `
    <div class="history-item">
      <div class="history-left">
        <div class="history-name">${escapeHtml(item.term)}</div>
        <div class="history-detail">${escapeHtml(item.description)}</div>
      </div>
      <div class="history-count">${item.count}回</div>
    </div>
  `).join('');
}

async function loadQuestions() {
  const response = await fetch(DATA_URL, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`data.json の読み込みに失敗しました: ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('data.json の形式が不正です。');
  }

  allQuestions = data;
}

startFromBeginningButton.addEventListener('click', startFromBeginning);
continueButton.addEventListener('click', continueFromSaved);

historyButton.addEventListener('click', () => {
  renderHistory();
  showHistoryScreen();
});

showAnswerButton.addEventListener('click', showAnswer);
correctButton.addEventListener('click', markCorrect);
wrongButton.addEventListener('click', markWrong);

backToTitleFromQuizButton.addEventListener('click', showTitleScreen);
backToTitleAfterRevealButton.addEventListener('click', showTitleScreen);
backToTitleFromCompleteButton.addEventListener('click', showTitleScreen);
backToTitleFromHistoryButton.addEventListener('click', showTitleScreen);

window.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadQuestions();
    showTitleScreen();
  } catch (error) {
    console.error(error);
    alert('問題データの読み込みに失敗しました。data.json を確認してください。');
  }
});
