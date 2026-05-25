'use strict';

const DATA_URL = './data.json';
const STORAGE_KEY_PROGRESS = 'g_kentei_progress_v3';
const STORAGE_KEY_HISTORY = 'g_kentei_history_v3';
const STORAGE_KEY_SELECTED_SERIES = 'g_kentei_selected_series_v3';

const titleScreen = document.getElementById('titleScreen');
const quizScreen = document.getElementById('quizScreen');
const completeScreen = document.getElementById('completeScreen');
const historyScreen = document.getElementById('historyScreen');

const seriesSelect = document.getElementById('seriesSelect');
const seriesInfo = document.getElementById('seriesInfo');

const startFromBeginningButton = document.getElementById('startFromBeginningButton');
const continueButton = document.getElementById('continueButton');
const historyButton = document.getElementById('historyButton');
const resetCurrentButton = document.getElementById('resetCurrentButton');
const resetAllButton = document.getElementById('resetAllButton');

const currentSeriesLabel = document.getElementById('currentSeriesLabel');
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

const completeMessage = document.getElementById('completeMessage');
const historySeriesLabel = document.getElementById('historySeriesLabel');
const historyList = document.getElementById('historyList');

let allSeries = [];
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
  renderSeriesInfo();
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

function getSelectedSeriesId() {
  return seriesSelect.value || (allSeries[0] ? allSeries[0].id : '');
}

function getSelectedSeries() {
  const selectedId = getSelectedSeriesId();
  return allSeries.find((series) => series.id === selectedId) || allSeries[0] || null;
}

function getSeriesById(seriesId) {
  return allSeries.find((series) => series.id === seriesId) || null;
}

function getQuestionsForSeries(seriesId) {
  const series = getSeriesById(seriesId);
  return series ? series.questions : [];
}

function getProgressKey(seriesId) {
  return `${STORAGE_KEY_PROGRESS}_${seriesId}`;
}

function getHistoryKey(seriesId) {
  return `${STORAGE_KEY_HISTORY}_${seriesId}`;
}

function loadHistoryMap(seriesId) {
  const raw = localStorage.getItem(getHistoryKey(seriesId));
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

function saveHistoryMap(seriesId, historyMap) {
  localStorage.setItem(getHistoryKey(seriesId), JSON.stringify(historyMap));
}

function incrementWrongCount(seriesId, questionId) {
  const historyMap = loadHistoryMap(seriesId);
  historyMap[questionId] = (historyMap[questionId] || 0) + 1;
  saveHistoryMap(seriesId, historyMap);
}

function loadProgress(seriesId) {
  const raw = localStorage.getItem(getProgressKey(seriesId));
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
  localStorage.setItem(getProgressKey(progress.seriesId), JSON.stringify(progress));
}

function clearProgress(seriesId) {
  localStorage.removeItem(getProgressKey(seriesId));
}

function clearHistory(seriesId) {
  localStorage.removeItem(getHistoryKey(seriesId));
}

function resetSeriesData(seriesId) {
  clearProgress(seriesId);
  clearHistory(seriesId);

  if (currentProgress && currentProgress.seriesId === seriesId) {
    currentProgress = null;
  }
}

function resetAllData() {
  allSeries.forEach((series) => {
    resetSeriesData(series.id);
  });
  currentProgress = null;
}

function shuffle(array) {
  const copied = [...array];
  for (let i = copied.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  return copied;
}

function createNewProgress(seriesId) {
  const questions = getQuestionsForSeries(seriesId);
  const shuffledIds = shuffle(questions.map((q) => q.id));

  return {
    seriesId,
    queue: shuffledIds,
    solvedIds: []
  };
}

function getQuestionById(seriesId, id) {
  const questions = getQuestionsForSeries(seriesId);
  return questions.find((q) => q.id === id) || null;
}

function getCurrentQuestion() {
  if (!currentProgress || !currentProgress.queue.length) {
    return null;
  }

  return getQuestionById(currentProgress.seriesId, currentProgress.queue[0]);
}

function renderSeriesInfo() {
  const series = getSelectedSeries();
  if (!series) {
    seriesInfo.textContent = '';
    return;
  }

  seriesInfo.textContent = `${series.title}：${series.questions.length}問`;
}

function renderSeriesSelect() {
  seriesSelect.innerHTML = allSeries.map((series) => {
    return `<option value="${escapeHtml(series.id)}">${escapeHtml(series.title)}</option>`;
  }).join('');

  const savedSeriesId = localStorage.getItem(STORAGE_KEY_SELECTED_SERIES);
  if (savedSeriesId && allSeries.some((series) => series.id === savedSeriesId)) {
    seriesSelect.value = savedSeriesId;
  }

  renderSeriesInfo();
}

function renderCurrentQuestion() {
  const currentQuestion = getCurrentQuestion();

  if (!currentQuestion) {
    if (currentProgress) {
      const series = getSeriesById(currentProgress.seriesId);
      clearProgress(currentProgress.seriesId);
      completeMessage.textContent = series ? `${series.title} の出題をすべて終えました。` : '今回の出題をすべて終えました。';
    }

    currentProgress = null;
    showCompleteScreen();
    return;
  }

  const series = getSeriesById(currentProgress.seriesId);
  const questions = getQuestionsForSeries(currentProgress.seriesId);
  const solvedCount = currentProgress.solvedIds.length;
  const totalCount = questions.length;

  currentSeriesLabel.textContent = series ? series.title : '';
  progressLabel.textContent = `進行状況: ${solvedCount} / ${totalCount}`;
  questionText.textContent = currentQuestion.description;
  answerTerm.textContent = '';

  beforeRevealArea.classList.remove('hidden');
  answerArea.classList.add('hidden');

  showQuizScreen();
}

function startFromBeginning() {
  const series = getSelectedSeries();
  if (!series) {
    alert('問題データがありません。');
    return;
  }

  currentProgress = createNewProgress(series.id);
  saveProgress(currentProgress);
  renderCurrentQuestion();
}

function continueFromSaved() {
  const series = getSelectedSeries();
  if (!series) {
    alert('問題データがありません。');
    return;
  }

  const saved = loadProgress(series.id);

  if (!saved || saved.seriesId !== series.id || !Array.isArray(saved.queue) || !Array.isArray(saved.solvedIds) || saved.queue.length === 0) {
    alert('選択した回の続きデータがありません。');
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

  incrementWrongCount(currentProgress.seriesId, currentId);
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
  const series = getSelectedSeries();
  if (!series) {
    historyList.innerHTML = '<p class="empty-message">問題データがありません。</p>';
    return;
  }

  historySeriesLabel.textContent = series.title;
  const historyMap = loadHistoryMap(series.id);

  const items = Object.entries(historyMap)
    .map(([id, count]) => {
      const question = getQuestionById(series.id, id);
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

function normalizeLoadedData(data) {
  if (Array.isArray(data)) {
    return [
      {
        id: 'series1',
        title: '第1回',
        questions: data
      }
    ];
  }

  if (data && Array.isArray(data.series)) {
    return data.series;
  }

  throw new Error('data.json の形式が不正です。');
}

async function loadQuestions() {
  const response = await fetch(DATA_URL, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`data.json の読み込みに失敗しました: ${response.status}`);
  }

  const data = await response.json();
  allSeries = normalizeLoadedData(data);

  allSeries.forEach((series) => {
    if (!series.id || !series.title || !Array.isArray(series.questions)) {
      throw new Error('data.json の series 形式が不正です。');
    }
  });
}

seriesSelect.addEventListener('change', () => {
  localStorage.setItem(STORAGE_KEY_SELECTED_SERIES, getSelectedSeriesId());
  renderSeriesInfo();
});

startFromBeginningButton.addEventListener('click', startFromBeginning);
continueButton.addEventListener('click', continueFromSaved);

historyButton.addEventListener('click', () => {
  renderHistory();
  showHistoryScreen();
});

resetCurrentButton.addEventListener('click', () => {
  const series = getSelectedSeries();
  if (!series) {
    return;
  }

  const ok = confirm(`${series.title} の進行状況と間違えた履歴を削除します。よろしいですか？`);
  if (!ok) {
    return;
  }

  resetSeriesData(series.id);
  alert(`${series.title} の履歴をリセットしました。`);
  showTitleScreen();
});

resetAllButton.addEventListener('click', () => {
  const ok = confirm('すべての回の進行状況と間違えた履歴を削除します。よろしいですか？');
  if (!ok) {
    return;
  }

  resetAllData();
  alert('全履歴をリセットしました。');
  showTitleScreen();
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
    renderSeriesSelect();
    showTitleScreen();
  } catch (error) {
    console.error(error);
    alert('問題データの読み込みに失敗しました。data.json を確認してください。');
  }
});
