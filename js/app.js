import {
  loadProfile,
  saveProfile,
  clearProfile,
  loadHistory,
  saveHistory,
  clearHistory,
  loadActiveSession,
  saveActiveSession,
  clearActiveSession
} from "./storage.js";

import {
  formatTime,
  percent,
  formatDate,
  uid,
  downloadCSV,
  escapeHtml,
  average,
  clamp
} from "./utils.js";

const state = {
  tests: [],
  profile: loadProfile(),
  history: loadHistory(),
  activeSession: null,
  currentResult: null,
  timerId: null,
  pendingTestId: null
};

const topicRecommendations = {
  "Переменные": "Повтори разницу между let, const и правила переназначения значений.",
  "Типы": "Освежи приведение типов, typeof и поведение truthy / falsy.",
  "Условия": "Пройди ещё раз логические операторы, ветвление if/else и строгое сравнение.",
  "Циклы": "Потренируй for и while, особенно области видимости счётчика.",
  "Функции": "Повтори параметры, return и базовые принципы вызова функций.",
  "Массивы": "Пройди map, filter, join, push, includes и отличие мутирующих методов.",
  "Объекты": "Повтори доступ к свойствам, Object.keys и работу с динамическими ключами.",
  "DOM": "Освежи querySelector, createElement, textContent и вставку узлов.",
  "События": "Повтори addEventListener, event, preventDefault и всплытие.",
  "Методы": "Сконцентрируйся на прикладных методах массивов и работе с DOM API.",
  "Promises": "Повтори состояния Promise, then/catch/finally и async/await.",
  "Fetch": "Освежи fetch, response.ok, response.json и отправку JSON.",
  "Storage": "Повтори localStorage, sessionStorage, stringify/parse и сценарии сохранения.",
  "Формы": "Пересмотри value, required, клиентскую валидацию и сообщения об ошибках.",
  "Модули": "Повтори export/import и подключение модульных скриптов в браузере.",
  "Scope": "Потренируй область видимости, hoisting и temporal dead zone.",
  "Closures": "Пройди замыкания на примерах счётчиков и фабрик функций.",
  "Event Loop": "Освежи microtasks, macrotasks и влияние тяжёлого кода на UI.",
  "Отладка": "Попрактикуй работу с debugger, stack trace и пошаговой проверкой гипотез.",
  "Архитектура": "Повтори разделение ответственности, модули и управление состоянием."
};

const modeLabels = {
  training: "Тренировка",
  exam: "Экзамен"
};

const refs = {
  pageShell: document.querySelector("#page-shell"),
  startupOverlay: document.querySelector("#startup-overlay"),
  startupLogoStep: document.querySelector("#startup-logo-step"),
  startupBrandStep: document.querySelector("#startup-brand-step"),
  startupOnboardingStep: document.querySelector("#startup-onboarding-step"),
  onboardingForm: document.querySelector("#onboarding-form"),
  onboardingName: document.querySelector("#onboarding-name"),
  onboardingNickname: document.querySelector("#onboarding-nickname"),
  onboardingGoal: document.querySelector("#onboarding-goal"),
  onboardingMessage: document.querySelector("#onboarding-message"),
  modeModal: document.querySelector("#mode-modal"),
  closeModeModal: document.querySelector("#close-mode-modal"),
  modeModalTitle: document.querySelector("#mode-modal-title"),
  modeModalText: document.querySelector("#mode-modal-text"),
  modeModalMeta: document.querySelector("#mode-modal-meta"),
  startTrainingButton: document.querySelector("#start-training-button"),
  startExamButton: document.querySelector("#start-exam-button"),
  views: [...document.querySelectorAll(".view")],
  navButtons: [...document.querySelectorAll(".nav-button")],
  resumeSessionButton: document.querySelector("#resume-session-button"),
  homeLevels: document.querySelector("#home-levels"),
  catalogGrid: document.querySelector("#catalog-grid"),
  testModeBadge: document.querySelector("#test-mode-badge"),
  testTitle: document.querySelector("#test-title"),
  testDescription: document.querySelector("#test-description"),
  timerValue: document.querySelector("#timer-value"),
  progressText: document.querySelector("#progress-text"),
  progressBar: document.querySelector("#progress-bar"),
  questionMap: document.querySelector("#question-map"),
  mapLegend: document.querySelector("#map-legend"),
  questionNumber: document.querySelector("#question-number"),
  questionTopic: document.querySelector("#question-topic"),
  questionText: document.querySelector("#question-text"),
  questionOptions: document.querySelector("#question-options"),
  feedbackBox: document.querySelector("#feedback-box"),
  prevQuestionButton: document.querySelector("#prev-question-button"),
  nextQuestionButton: document.querySelector("#next-question-button"),
  finishTestButton: document.querySelector("#finish-test-button"),
  resultSummary: document.querySelector("#result-summary"),
  resultTopics: document.querySelector("#result-topics"),
  resultRecommendations: document.querySelector("#result-recommendations"),
  resultReviewList: document.querySelector("#result-review-list"),
  exportAttemptButton: document.querySelector("#export-attempt-button"),
  profileForm: document.querySelector("#profile-form"),
  profileName: document.querySelector("#profile-name"),
  profileNickname: document.querySelector("#profile-nickname"),
  profileGoal: document.querySelector("#profile-goal"),
  profileMessage: document.querySelector("#profile-message"),
  resetProfileButton: document.querySelector("#reset-profile-button"),
  exportHistoryButton: document.querySelector("#export-history-button"),
  clearHistoryButton: document.querySelector("#clear-history-button"),
  profileTotalAttempts: document.querySelector("#profile-total-attempts"),
  profileBestScore: document.querySelector("#profile-best-score"),
  profileAverageScore: document.querySelector("#profile-average-score"),
  historyList: document.querySelector("#history-list")
};

boot();

async function boot() {
  bindEvents();

  try {
    const response = await fetch("./data/tests.json");
    const payload = await response.json();
    state.tests = payload.tests || [];
    hydrateSessionFromStorage();
    hydrateProfileForms();
    renderEverything();
    syncRouteFromHash();
    startStartupSequence();
  } catch (error) {
    console.error(error);
    document.body.innerHTML = `
      <main style="padding:32px;font-family:Inter,ui-sans-serif,sans-serif;">
        <h1>Не удалось загрузить данные проекта</h1>
        <p>Проверь, что рядом с index.html лежит папка data и файл tests.json.</p>
      </main>
    `;
  }
}

function bindEvents() {
  document.addEventListener("click", handleGlobalClick);
  window.addEventListener("hashchange", syncRouteFromHash);
  refs.prevQuestionButton.addEventListener("click", () => moveQuestion(-1));
  refs.nextQuestionButton.addEventListener("click", handleNextQuestion);
  refs.finishTestButton.addEventListener("click", () => finishCurrentSession(false));
  refs.resumeSessionButton?.addEventListener("click", restoreActiveSession);
  refs.exportAttemptButton.addEventListener("click", exportCurrentAttempt);
  refs.exportHistoryButton.addEventListener("click", exportHistory);
  refs.clearHistoryButton.addEventListener("click", handleClearHistory);
  refs.profileForm.addEventListener("submit", handleProfileSubmit);
  refs.onboardingForm.addEventListener("submit", handleOnboardingSubmit);
  refs.resetProfileButton.addEventListener("click", resetProfile);
  refs.closeModeModal.addEventListener("click", closeModeModal);
  refs.startTrainingButton.addEventListener("click", () => startPendingTest("training"));
  refs.startExamButton.addEventListener("click", () => startPendingTest("exam"));
}

function handleGlobalClick(event) {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    const { view } = viewButton.dataset;
    if (view) {
      event.preventDefault();
      navigate(view);
      return;
    }
  }

  const chooserButton = event.target.closest("[data-open-test]");
  if (chooserButton) {
    openModeModal(chooserButton.dataset.openTest);
    return;
  }

  const optionNode = event.target.closest("[data-option-index]");
  if (optionNode && state.activeSession) {
    handleAnswer(Number(optionNode.dataset.optionIndex));
    return;
  }

  const questionChip = event.target.closest("[data-question-index]");
  if (questionChip && state.activeSession) {
    const nextIndex = Number(questionChip.dataset.questionIndex);
    if (Number.isInteger(nextIndex)) {
      const maxIndex = getCurrentTest().questions.length - 1;
      state.activeSession.currentIndex = clamp(nextIndex, 0, maxIndex);
      persistSession();
      renderTest();
    }
    return;
  }

  if (event.target === refs.modeModal) {
    closeModeModal();
  }
}

function startStartupSequence() {
  refs.pageShell.classList.add("is-hidden");
  refs.startupOverlay.classList.remove("is-hidden");
  showStartupStep("logo");

  window.setTimeout(() => showStartupStep("brand"), 1200);

  if (state.profile) {
    window.setTimeout(() => finishStartupSequence(), 3000);
    return;
  }

  window.setTimeout(() => {
    showStartupStep("onboarding");
    refs.onboardingName.focus();
  }, 3200);
}

function showStartupStep(step) {
  const all = [refs.startupLogoStep, refs.startupBrandStep, refs.startupOnboardingStep];
  all.forEach((node) => {
    node.classList.remove("is-active");
    node.setAttribute("aria-hidden", "true");
  });

  const target = step === "logo"
    ? refs.startupLogoStep
    : step === "brand"
      ? refs.startupBrandStep
      : refs.startupOnboardingStep;

  target.classList.add("is-active");
  target.setAttribute("aria-hidden", "false");
}

function finishStartupSequence() {
  refs.startupOverlay.classList.add("is-hidden");
  refs.pageShell.classList.remove("is-hidden");
}

function hydrateProfileForms() {
  const profile = state.profile || { name: "", nickname: "", goal: "" };
  refs.profileName.value = profile.name || "";
  refs.profileNickname.value = profile.nickname || "";
  refs.profileGoal.value = profile.goal || "";
  refs.onboardingName.value = profile.name || "";
  refs.onboardingNickname.value = profile.nickname || "";
  refs.onboardingGoal.value = profile.goal || "";
}

function hydrateSessionFromStorage() {
  const saved = loadActiveSession();
  if (!saved) return;
  const relatedTest = state.tests.find((test) => test.id === saved.testId);
  if (!relatedTest) {
    clearActiveSession();
    return;
  }
  state.activeSession = saved;
  if (getRemainingSeconds() <= 0) {
    finishCurrentSession(true);
  }
}

function syncRouteFromHash() {
  const hash = window.location.hash.replace("#", "");
  if (!hash) {
    navigate("home", false);
    return;
  }

  if (hash === "test" && state.activeSession) {
    showView("test");
    return;
  }

  if (hash === "result" && state.currentResult) {
    showView("result");
    return;
  }

  if (["home", "catalog", "profile"].includes(hash)) {
    showView(hash);
    return;
  }

  navigate("home", false);
}

function navigate(view, updateHash = true) {
  if (!state.profile && view !== "profile") {
    showStartupStep("onboarding");
    refs.startupOverlay.classList.remove("is-hidden");
    return;
  }

  if (view === "test" && !state.activeSession) view = "home";
  if (view === "result" && !state.currentResult) view = "home";

  showView(view);
  if (updateHash) window.location.hash = view;
}

function showView(view) {
  refs.views.forEach((node) => node.classList.toggle("is-active", node.id === `view-${view}`));
  refs.navButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.view === view));
}

function renderEverything() {
  renderHome();
  renderCatalog();
  renderProfile();
  renderTest();
  renderResult();
}

function renderHome() {
  refs.homeLevels.innerHTML = state.tests.map((test) => renderLevelCard(test)).join("");
}

function renderCatalog() {
  refs.catalogGrid.innerHTML = state.tests.map((test) => `
    <article class="catalog-card">
      <div class="catalog-top">
        <div>
          <span class="mode-chip ${escapeHtml(test.slug)}">${escapeHtml(test.slug.toUpperCase())}</span>
          <h3>${escapeHtml(test.title)}</h3>
          <p>${escapeHtml(test.subtitle)}</p>
        </div>
      </div>

      <div class="catalog-meta">
        <span class="meta-pill">${test.questions.length} вопросов</span>
        <span class="meta-pill">${test.durationMinutes} минут</span>
        <span class="meta-pill">${escapeHtml(test.topics.join(" · "))}</span>
      </div>

      <div class="actions-row">
        <button class="button" data-open-test="${escapeHtml(test.id)}">Начать</button>
      </div>
    </article>
  `).join("");
}

function renderLevelCard(test) {
  return `
    <article class="level-card">
      <div class="level-top">
        <div>
          <h3 class="level-title">${escapeHtml(test.title)}</h3>
          <p>${escapeHtml(test.description)}</p>
        </div>
        <span class="level-chip ${escapeHtml(test.slug)}">${escapeHtml(test.slug.toUpperCase())}</span>
      </div>
      <div class="level-meta">
        <span class="meta-pill">${test.questions.length} вопросов</span>
        <span class="meta-pill">${test.durationMinutes} мин</span>
      </div>
      <div class="actions-row">
        <button class="button" data-open-test="${escapeHtml(test.id)}">Начать</button>
      </div>
    </article>
  `;
}

function renderProfile() {
  const attempts = state.history.length;
  const best = attempts ? Math.max(...state.history.map((item) => item.percentage)) : 0;
  const avg = attempts ? average(state.history.map((item) => item.percentage)) : 0;

  refs.profileTotalAttempts.textContent = String(attempts);
  refs.profileBestScore.textContent = `${best}%`;
  refs.profileAverageScore.textContent = `${avg}%`;

  if (!attempts) {
    refs.historyList.innerHTML = `
      <article class="history-card">
        <h3 class="history-title">История пока пустая</h3>
        <p class="history-meta">Пройди хотя бы один тест, и здесь появятся попытки, проценты, режимы и время завершения.</p>
      </article>
    `;
    return;
  }

  refs.historyList.innerHTML = [...state.history]
    .sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt))
    .map((item) => {
      const scoreClass = item.percentage >= 80 ? "good" : item.percentage >= 55 ? "mid" : "bad";
      return `
        <article class="history-card">
          <div class="history-top">
            <div>
              <h3 class="history-title">${escapeHtml(item.testTitle)}</h3>
              <p class="history-meta">${escapeHtml(modeLabels[item.mode])} · ${formatDate(item.finishedAt)} · ${item.score}/${item.total}</p>
            </div>
            <span class="history-score ${scoreClass}">${item.percentage}%</span>
          </div>
          <p class="history-meta">Пользователь: ${escapeHtml(item.userLabel)} · Слабые темы: ${escapeHtml(item.weakTopicNames.length ? item.weakTopicNames.join(", ") : "не выявлены")}</p>
        </article>
      `;
    }).join("");
}

function renderTest() {
  if (!state.activeSession) {
    stopTimer();
    return;
  }

  const test = getCurrentTest();
  if (!test) return;

  startTimer();

  const { currentIndex, mode, answers } = state.activeSession;
  const question = test.questions[currentIndex];
  const answeredCount = answers.filter((value) => value !== null).length;
  const selectedIndex = answers[currentIndex];
  const isTraining = mode === "training";
  const locked = isTraining && selectedIndex !== null;

  refs.testModeBadge.textContent = modeLabels[mode];
  refs.testTitle.textContent = test.title;
  refs.testDescription.textContent = `${test.subtitle}. ${test.description}`;
  refs.progressText.textContent = `${answeredCount} / ${test.questions.length}`;
  refs.progressBar.style.width = `${percent(answeredCount, test.questions.length)}%`;
  refs.questionNumber.textContent = `Вопрос ${currentIndex + 1} из ${test.questions.length}`;
  refs.questionTopic.textContent = question.topic;
  refs.questionText.textContent = question.prompt;

  refs.questionOptions.innerHTML = question.options.map((option, index) => {
    const isSelected = index === selectedIndex;
    const isCorrect = index === question.correctIndex;
    const optionClasses = ["option-card"];
    if (isSelected) optionClasses.push("is-selected");
    if (locked && isCorrect) optionClasses.push("is-correct");
    if (locked && isSelected && !isCorrect) optionClasses.push("is-wrong");

    let explanationHtml = "";
    if (locked && isCorrect) {
      explanationHtml = `<div class="option-explanation">${escapeHtml(question.explanation)}</div>`;
    } else if (locked && isSelected && !isCorrect) {
      explanationHtml = `<div class="option-explanation">Неверный выбор. Верный вариант подсвечен отдельно.</div>`;
    }

    return `
      <button type="button" class="${optionClasses.join(" ")}" data-option-index="${index}" ${locked ? "disabled" : ""} aria-pressed="${isSelected ? "true" : "false"}">
        <div class="option-row">
          <span class="option-letter">${String.fromCharCode(65 + index)}</span>
          <span class="option-body">
            <span class="option-text">${escapeHtml(option)}</span>
            ${explanationHtml}
          </span>
        </div>
      </button>
    `;
  }).join("");

  renderFeedback(question, selectedIndex, locked);
  renderQuestionMap();
  renderLegend();
  renderTimer();
  updateQuestionButtons();
}

function renderLegend() {
  if (!state.activeSession) {
    refs.mapLegend.innerHTML = "";
    return;
  }

  const isTraining = state.activeSession.mode === "training";
  refs.mapLegend.innerHTML = `
    <span><i class="chip-key current"></i> текущий</span>
    ${isTraining ? '<span><i class="chip-key right"></i> верный</span><span><i class="chip-key wrong"></i> ошибка</span>' : ''}
  `;
}

function renderFeedback(question, selectedIndex, locked) {
  if (!locked || selectedIndex === null || state.activeSession.mode !== "training") {
    refs.feedbackBox.className = "feedback-box is-hidden";
    refs.feedbackBox.innerHTML = "";
    return;
  }

  const good = selectedIndex === question.correctIndex;
  refs.feedbackBox.className = `feedback-box ${good ? "good" : "bad"}`;
  refs.feedbackBox.innerHTML = `<strong>${good ? "Верно." : "Есть ошибка."}</strong> ${escapeHtml(question.explanation)}`;
}

function renderQuestionMap() {
  const test = getCurrentTest();
  if (!test || !state.activeSession) return;

  refs.questionMap.innerHTML = test.questions.map((question, index) => {
    const selected = state.activeSession.answers[index];
    const classes = ["question-chip"];
    if (index === state.activeSession.currentIndex) classes.push("is-current");

    if (selected !== null && state.activeSession.mode === "training") {
      classes.push(selected === question.correctIndex ? "is-right" : "is-wrong");
    } else if (selected !== null) {
      classes.push("is-answered");
    }

    return `<button type="button" class="${classes.join(" ")}" data-question-index="${index}">${index + 1}</button>`;
  }).join("");
}

function updateQuestionButtons() {
  if (!state.activeSession) return;
  const test = getCurrentTest();
  const { currentIndex, mode, answers } = state.activeSession;
  refs.prevQuestionButton.disabled = currentIndex === 0;
  refs.nextQuestionButton.disabled = mode === "training" && answers[currentIndex] === null;
  refs.nextQuestionButton.textContent = currentIndex === test.questions.length - 1 ? "К завершению" : "Далее";
}

function handleNextQuestion() {
  if (!state.activeSession) return;
  const test = getCurrentTest();
  if (!test) return;
  if (state.activeSession.currentIndex >= test.questions.length - 1) {
    finishCurrentSession(false);
    return;
  }
  moveQuestion(1);
}

function moveQuestion(step) {
  if (!state.activeSession) return;
  const test = getCurrentTest();
  const next = clamp(state.activeSession.currentIndex + step, 0, test.questions.length - 1);
  state.activeSession.currentIndex = next;
  persistSession();
  renderTest();
}

function handleAnswer(optionIndex) {
  if (!state.activeSession || !Number.isInteger(optionIndex)) return;
  const test = getCurrentTest();
  if (!test) return;
  const { currentIndex, mode, answers } = state.activeSession;

  if (mode === "training" && answers[currentIndex] !== null) {
    return;
  }

  state.activeSession.answers[currentIndex] = optionIndex;
  persistSession();
  renderTest();
}

function openModeModal(testId) {
  const test = state.tests.find((item) => item.id === testId);
  if (!test) return;
  state.pendingTestId = test.id;
  refs.modeModalTitle.textContent = test.title;
  refs.modeModalText.textContent = `${test.subtitle}. Выбери режим прохождения: тренировка с мгновенной обратной связью или экзамен с финальным разбором.`;
  refs.modeModalMeta.innerHTML = `
    <span class="meta-pill">${test.questions.length} вопросов</span>
    <span class="meta-pill">${test.durationMinutes} минут</span>
    <span class="meta-pill">${escapeHtml(test.topics.join(" · "))}</span>
  `;
  refs.modeModal.classList.remove("is-hidden");
  refs.modeModal.setAttribute("aria-hidden", "false");
}

function closeModeModal() {
  state.pendingTestId = null;
  refs.modeModal.classList.add("is-hidden");
  refs.modeModal.setAttribute("aria-hidden", "true");
}

function startPendingTest(mode) {
  if (!state.pendingTestId) return;
  const testId = state.pendingTestId;
  closeModeModal();
  startTestSession(testId, mode);
}

function startTestSession(testId, mode) {
  const test = state.tests.find((item) => item.id === testId);
  if (!test) return;

  stopTimer();
  state.currentResult = null;
  state.activeSession = {
    sessionId: uid("session"),
    testId: test.id,
    mode,
    currentIndex: 0,
    answers: Array(test.questions.length).fill(null),
    startedAt: new Date().toISOString(),
    deadline: new Date(Date.now() + test.durationMinutes * 60 * 1000).toISOString()
  };

  persistSession();
  renderEverything();
  navigate("test");
}

function restoreActiveSession() {
  if (!state.activeSession) return;
  navigate("test");
  renderTest();
}

function getCurrentTest() {
  if (!state.activeSession) return null;
  return state.tests.find((test) => test.id === state.activeSession.testId) || null;
}

function getRemainingSeconds() {
  if (!state.activeSession) return 0;
  const diff = new Date(state.activeSession.deadline).getTime() - Date.now();
  return Math.max(0, Math.round(diff / 1000));
}

function startTimer() {
  stopTimer();
  state.timerId = window.setInterval(() => {
    renderTimer();
    if (getRemainingSeconds() <= 0) {
      finishCurrentSession(true);
    }
  }, 1000);
}

function stopTimer() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function renderTimer() {
  refs.timerValue.textContent = formatTime(getRemainingSeconds());
}

function finishCurrentSession(isTimeout) {
  if (!state.activeSession) return;
  const test = getCurrentTest();
  if (!test) return;

  stopTimer();

  const answers = [...state.activeSession.answers];
  const total = test.questions.length;
  const remainingSeconds = getRemainingSeconds();
  const totalSeconds = test.durationMinutes * 60;
  const usedSeconds = Math.max(0, totalSeconds - remainingSeconds);
  const questionsReview = test.questions.map((question, index) => {
    const selectedIndex = answers[index];
    const isCorrect = selectedIndex === question.correctIndex;
    return {
      id: question.id,
      topic: question.topic,
      prompt: question.prompt,
      options: question.options,
      correctIndex: question.correctIndex,
      selectedIndex,
      isCorrect,
      explanation: question.explanation
    };
  });

  const score = questionsReview.filter((item) => item.isCorrect).length;
  const percentage = percent(score, total);
  const topicMap = new Map();

  questionsReview.forEach((item) => {
    const info = topicMap.get(item.topic) || { topic: item.topic, total: 0, correct: 0 };
    info.total += 1;
    if (item.isCorrect) info.correct += 1;
    topicMap.set(item.topic, info);
  });

  const topicStats = [...topicMap.values()]
    .map((item) => ({
      ...item,
      percentage: percent(item.correct, item.total),
      mistakes: item.total - item.correct
    }))
    .sort((a, b) => a.percentage - b.percentage);

  const weakTopics = topicStats.filter((item) => item.mistakes > 0).slice(0, 3);
  const recommendations = (weakTopics.length ? weakTopics : topicStats.slice(0, 2)).map((item) => ({
    topic: item.topic,
    text: topicRecommendations[item.topic] || "Повтори теорию и реши ещё один короткий прогон по этой теме."
  }));

  const profile = state.profile || { name: "", nickname: "", goal: "" };
  const userLabel = profile.nickname ? `${profile.name} (@${profile.nickname})` : profile.name;

  state.currentResult = {
    id: uid("attempt"),
    timedOut: isTimeout,
    finishedAt: new Date().toISOString(),
    testId: test.id,
    testTitle: test.title,
    subtitle: test.subtitle,
    mode: state.activeSession.mode,
    score,
    total,
    percentage,
    usedSeconds,
    remainingSeconds,
    userLabel,
    user: {
      name: profile.name || "",
      nickname: profile.nickname || "",
      goal: profile.goal || ""
    },
    topicStats,
    weakTopicNames: weakTopics.map((item) => item.topic),
    recommendations,
    questionsReview
  };

  state.history = [state.currentResult, ...state.history].slice(0, 50);
  saveHistory(state.history);
  state.activeSession = null;
  clearActiveSession();
  renderEverything();
  navigate("result");
}

function renderResult() {
  if (!state.currentResult) {
    refs.resultSummary.innerHTML = "";
    refs.resultTopics.innerHTML = "";
    refs.resultRecommendations.innerHTML = "";
    refs.resultReviewList.innerHTML = "";
    return;
  }

  const result = state.currentResult;
  refs.resultSummary.innerHTML = `
    <article class="stat-box">
      <span class="stat-label">Тест</span>
      <strong class="stat-value">${escapeHtml(result.testTitle)}</strong>
    </article>
    <article class="stat-box">
      <span class="stat-label">Режим</span>
      <strong class="stat-value">${escapeHtml(modeLabels[result.mode])}</strong>
    </article>
    <article class="stat-box">
      <span class="stat-label">Результат</span>
      <strong class="stat-value">${result.score}/${result.total}</strong>
    </article>
    <article class="stat-box">
      <span class="stat-label">Процент</span>
      <strong class="stat-value">${result.percentage}%</strong>
    </article>
    <article class="stat-box">
      <span class="stat-label">Время</span>
      <strong class="stat-value">${formatTime(result.usedSeconds)}</strong>
    </article>
  `;

  refs.resultTopics.innerHTML = result.topicStats.map((topic) => {
    const scoreClass = topic.percentage >= 80 ? "good" : topic.percentage >= 55 ? "mid" : "bad";
    return `
      <article class="topic-card">
        <div class="topic-line">
          <strong>${escapeHtml(topic.topic)}</strong>
          <span>${topic.correct} из ${topic.total} верно · ошибок: ${topic.mistakes}</span>
        </div>
        <div class="topic-rate ${scoreClass}">${topic.percentage}%</div>
      </article>
    `;
  }).join("");

  refs.resultRecommendations.innerHTML = result.recommendations.map((item) => `
    <article class="recommendation-card">
      <strong>${escapeHtml(item.topic)}</strong>
      <p class="history-meta">${escapeHtml(item.text)}</p>
    </article>
  `).join("");

  refs.resultReviewList.innerHTML = result.questionsReview.map((item, index) => {
    const selectedText = item.selectedIndex === null ? "Нет ответа" : item.options[item.selectedIndex];
    return `
      <article class="review-card">
        <div class="review-top">
          <div>
            <h3 class="review-title">${index + 1}. ${escapeHtml(item.prompt)}</h3>
            <p class="review-meta">${escapeHtml(item.topic)} · выбранный ответ: ${escapeHtml(selectedText)}</p>
          </div>
          <span class="review-status ${item.isCorrect ? "good" : "bad"}">${item.isCorrect ? "Верно" : "Ошибка"}</span>
        </div>
        <div class="review-options">
          ${item.options.map((option, optionIndex) => {
            const classes = ["option-card"];
            if (optionIndex === item.correctIndex) classes.push("is-correct");
            if (item.selectedIndex === optionIndex && optionIndex !== item.correctIndex) classes.push("is-wrong");
            if (item.selectedIndex === optionIndex) classes.push("is-selected");
            return `
              <div class="${classes.join(" ")}">
                <div class="option-row">
                  <span class="option-letter">${String.fromCharCode(65 + optionIndex)}</span>
                  <span class="option-body">
                    <span class="option-text">${escapeHtml(option)}</span>
                    ${optionIndex === item.correctIndex ? `<span class="option-explanation">${escapeHtml(item.explanation)}</span>` : ""}
                  </span>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </article>
    `;
  }).join("");
}

function collectProfileFromInputs(nameField, nicknameField, goalField) {
  return {
    name: nameField.value.trim(),
    nickname: nicknameField.value.trim(),
    goal: goalField.value.trim()
  };
}

function validateProfile(profile) {
  if (!profile.name) return "Укажи имя, чтобы профиль не выглядел пустым.";
  if (!profile.nickname) return "Добавь ник, чтобы профиль был узнаваемым.";
  if (!profile.goal) return "Заполни цель, чтобы профиль был завершённым.";
  return "";
}

function saveProfileState(profile) {
  state.profile = profile;
  saveProfile(profile);
  hydrateProfileForms();
  renderEverything();
}

function handleOnboardingSubmit(event) {
  event.preventDefault();
  const profile = collectProfileFromInputs(refs.onboardingName, refs.onboardingNickname, refs.onboardingGoal);
  const error = validateProfile(profile);

  if (error) {
    showInlineMessage(refs.onboardingMessage, error, "danger");
    return;
  }

  saveProfileState(profile);
  refs.onboardingMessage.classList.add("is-hidden");
  finishStartupSequence();
  navigate("home");
}

function handleProfileSubmit(event) {
  event.preventDefault();
  const profile = collectProfileFromInputs(refs.profileName, refs.profileNickname, refs.profileGoal);
  const error = validateProfile(profile);

  if (error) {
    showInlineMessage(refs.profileMessage, error, "danger");
    return;
  }

  saveProfileState(profile);
  showInlineMessage(refs.profileMessage, "Профиль сохранён. История и экспорт обновлены под новые данные.", "success");
}

function showInlineMessage(node, text, type) {
  node.textContent = text;
  node.className = `inline-message ${type}`;
  node.classList.remove("is-hidden");
}

function resetProfile() {
  clearProfile();
  state.profile = null;
  hydrateProfileForms();
  renderEverything();
  refs.pageShell.classList.add("is-hidden");
  refs.startupOverlay.classList.remove("is-hidden");
  showStartupStep("onboarding");
  refs.onboardingName.focus();
}

function handleClearHistory() {
  clearHistory();
  state.history = [];
  renderEverything();
}

function exportCurrentAttempt() {
  if (!state.currentResult) return;
  const result = state.currentResult;
  const finishedLabel = formatDate(result.finishedAt);

  const rows = [[
    "Дата",
    "Тест",
    "Режим",
    "Таймаут",
    "Имя",
    "Ник",
    "Вопрос №",
    "ID вопроса",
    "Тема",
    "Статус",
    "Выбран",
    "Правильный"
  ]];

  result.questionsReview.forEach((item, index) => {
    const hasAnswer = item.selectedIndex !== null && item.selectedIndex !== undefined;
    const status = hasAnswer ? (item.isCorrect ? "Верно" : "Ошибка") : "Нет ответа";
    const selectedLetter = hasAnswer ? String.fromCharCode(65 + item.selectedIndex) : "";
    const correctLetter = String.fromCharCode(65 + item.correctIndex);
    rows.push([
      finishedLabel,
      result.testTitle,
      result.testId,
      modeLabels[result.mode],
      result.timedOut ? "да" : "нет",
      result.user?.name || "",
      result.user?.nickname || "",
      result.user?.goal || "",
      index + 1,
      item.id,
      item.topic,
      status,
      selectedLetter,
      correctLetter
    ]);
  });

  const safeDate = result.finishedAt.replaceAll(":", "-");
  downloadCSV(`signal-js-${result.testId}-${safeDate}.csv`, rows);
}

function exportHistory() {
  const rows = [[
    "Дата",
    "Тест",
    "Режим",
    "Имя",
    "Ник",
    "Результат %",
    "Баллы",
    "Время",
    "Таймаут",
    "Слабые темы"
  ]];

  state.history.forEach((item) => {
    rows.push([
      formatDate(item.finishedAt),
      item.testTitle,
      item.testId,
      modeLabels[item.mode],
      item.user?.name || "",
      item.user?.nickname || "",
      item.percentage,
      `${item.score}/${item.total}`,
      formatTime(item.usedSeconds || 0),
      item.timedOut ? "да" : "нет",
      item.weakTopicNames?.join(", ") || ""
    ]);
  });

  if (rows.length <= 1) return;
  downloadCSV("signal-js-history.csv", rows);
}

function persistSession() {
  if (!state.activeSession) return;
  saveActiveSession(state.activeSession);
}
