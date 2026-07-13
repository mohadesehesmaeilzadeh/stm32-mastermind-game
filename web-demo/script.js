const SEGMENTS = {
  "0": ["a", "b", "c", "d", "e", "f"],
  "1": ["b", "c"],
  "2": ["a", "b", "g", "e", "d"],
  "3": ["a", "b", "g", "c", "d"],
  "4": ["f", "g", "b", "c"],
  "5": ["a", "f", "g", "c", "d"],
  "6": ["a", "f", "g", "c", "d", "e"],
  "7": ["a", "b", "c"],
  "8": ["a", "b", "c", "d", "e", "f", "g"],
  "9": ["a", "b", "c", "d", "f", "g"]
};

const state = {
  mode: "WAIT_START",
  secret: "0000",
  input: "",
  remaining: 60,
  initialTime: 60,
  rescueUsed: 0,
  history: [],
  timerId: null,
  terminalLines: [],
  score: 0,
  audio: null
};

const els = {
  stateChip: document.querySelector("#stateChip"),
  clockChip: document.querySelector("#clockChip"),
  scoreChip: document.querySelector("#scoreChip"),
  terminal: document.querySelector("#terminal"),
  guessInput: document.querySelector("#guessInput"),
  submitBtn: document.querySelector("#submitBtn"),
  startBtn: document.querySelector("#startBtn"),
  resetBtn: document.querySelector("#resetBtn"),
  rescueBtn: document.querySelector("#rescueBtn"),
  difficultySelect: document.querySelector("#difficultySelect"),
  codeModeSelect: document.querySelector("#codeModeSelect"),
  debugToggle: document.querySelector("#debugToggle"),
  soundToggle: document.querySelector("#soundToggle"),
  secretBox: document.querySelector("#secretBox"),
  lcdLine1: document.querySelector("#lcdLine1"),
  lcdLine2: document.querySelector("#lcdLine2"),
  sevenDisplay: document.querySelector("#sevenDisplay"),
  led1: document.querySelector("#led1"),
  led2: document.querySelector("#led2"),
  buzzer: document.querySelector("#buzzer"),
  keypad: document.querySelector("#keypad"),
  historyBody: document.querySelector("#historyBody"),
  attemptChip: document.querySelector("#attemptChip"),
  feedbackExplain: document.querySelector("#feedbackExplain"),
  traceUsart: document.querySelector("#traceUsart"),
  traceTim: document.querySelector("#traceTim"),
  traceExti: document.querySelector("#traceExti"),
  traceGpio: document.querySelector("#traceGpio")
};

function init() {
  buildSevenSegment();
  buildKeypad();
  appendTerminal("--- Mastermind Game ---");
  appendTerminal("Press 'S' to Start");
  render();

  els.startBtn.addEventListener("click", startGame);
  els.resetBtn.addEventListener("click", resetGame);
  els.submitBtn.addEventListener("click", submitGuess);
  els.rescueBtn.addEventListener("click", useRescue);
  els.guessInput.addEventListener("input", handleInput);
  els.debugToggle.addEventListener("change", renderSecret);
  els.difficultySelect.addEventListener("change", syncDifficulty);
  document.addEventListener("keydown", handleKeyboard);
}

function buildSevenSegment() {
  els.sevenDisplay.innerHTML = "";
  for (let i = 0; i < 4; i += 1) {
    const digit = document.createElement("div");
    digit.className = "digit";
    digit.dataset.index = String(i);
    ["a", "b", "c", "d", "e", "f", "g"].forEach((segment) => {
      const span = document.createElement("span");
      span.className = `seg seg-${segment}`;
      span.dataset.segment = segment;
      digit.appendChild(span);
    });
    els.sevenDisplay.appendChild(digit);
  }
}

function buildKeypad() {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "Clear", "0", "Back"];
  els.keypad.innerHTML = "";
  keys.forEach((key) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = key;
    if (key.length > 1) button.classList.add("control-key");
    button.addEventListener("click", () => handleKeypad(key));
    els.keypad.appendChild(button);
  });
}

function handleKeypad(key) {
  if (key === "Clear") {
    setInput("");
    return;
  }
  if (key === "Back") {
    setInput(state.input.slice(0, -1));
    return;
  }
  if (/^\d$/.test(key) && state.input.length < 4) {
    setInput(state.input + key);
  }
}

function handleKeyboard(event) {
  const tag = document.activeElement ? document.activeElement.tagName : "";
  const typingInField = tag === "INPUT" || tag === "SELECT";

  if ((event.key === "s" || event.key === "S") && !typingInField) {
    event.preventDefault();
    startGame();
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    submitGuess();
    return;
  }

  if (!typingInField && /^\d$/.test(event.key) && state.input.length < 4) {
    setInput(state.input + event.key);
  }

  if (!typingInField && event.key === "Backspace") {
    setInput(state.input.slice(0, -1));
  }
}

function syncDifficulty() {
  if (state.mode !== "PLAYING") {
    state.initialTime = Number(els.difficultySelect.value);
    state.remaining = state.initialTime;
    render();
  }
}

function handleInput() {
  setInput(els.guessInput.value.replace(/\D/g, "").slice(0, 4));
}

function setInput(value) {
  state.input = value;
  els.guessInput.value = value;
  pulse(els.traceUsart);
}

function startGame() {
  stopTimer();
  state.mode = "PLAYING";
  state.initialTime = Number(els.difficultySelect.value);
  state.remaining = state.initialTime;
  state.secret = generateSecret();
  state.rescueUsed = 0;
  state.history = [];
  state.score = 0;
  setInput("");
  clearBuzzer();

  appendTerminal("");
  appendTerminal("Game Started!");
  appendTerminal("Enter 4 digits: ");
  setLcd("Game Started!", "Enter 4 digits");
  startTimer();
  pulse(els.traceUsart);
  pulse(els.traceGpio);
  render();
  els.guessInput.focus();
}

function resetGame() {
  stopTimer();
  state.mode = "WAIT_START";
  state.secret = "0000";
  state.initialTime = Number(els.difficultySelect.value);
  state.remaining = state.initialTime;
  state.rescueUsed = 0;
  state.history = [];
  state.score = 0;
  setInput("");
  clearBuzzer();
  setLcd("Press S to Start", "USART ready");
  appendTerminal("");
  appendTerminal("--- Reset ---");
  appendTerminal("Press 'S' to Start");
  render();
}

function generateSecret() {
  if (els.codeModeSelect.value === "unique") {
    const digits = [..."0123456789"];
    let code = "";
    while (code.length < 4) {
      const index = Math.floor(Math.random() * digits.length);
      code += digits.splice(index, 1)[0];
    }
    return code;
  }
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join("");
}

function submitGuess() {
  if (state.mode !== "PLAYING") {
    appendTerminal("Press 'S' to start first.");
    return;
  }

  if (state.input.length !== 4) {
    appendTerminal("Error: Must be 4 digits!");
    appendTerminal("Enter 4 digits: ");
    setLcd("Input Error", "Need 4 digits");
    pulse(els.traceUsart);
    pulse(els.traceGpio);
    return;
  }

  const guess = state.input;
  const result = checkPassword(guess, state.secret);
  state.history.unshift({
    attempt: state.history.length + 1,
    guess,
    feedback: result.feedback,
    exact: result.exact,
    misplaced: result.misplaced
  });

  appendTerminal(guess);

  if (result.feedback === "****") {
    winGame();
  } else {
    appendTerminal(`Feedback: [${result.feedback}]`);
    appendTerminal("Enter 4 digits: ");
    setLcd(`[${result.feedback}]`, "Try again");
    explainFeedback(guess, result);
    setInput("");
    pulse(els.traceUsart);
    pulse(els.traceGpio);
    render();
  }
}

function checkPassword(input, secret) {
  const feedback = ["-", "-", "-", "-"];
  const secretUsed = [false, false, false, false];
  const inputUsed = [false, false, false, false];
  let exact = 0;
  let misplaced = 0;

  for (let i = 0; i < 4; i += 1) {
    if (input[i] === secret[i]) {
      feedback[i] = "*";
      secretUsed[i] = true;
      inputUsed[i] = true;
      exact += 1;
    }
  }

  for (let i = 0; i < 4; i += 1) {
    if (!inputUsed[i]) {
      for (let j = 0; j < 4; j += 1) {
        if (!secretUsed[j] && input[i] === secret[j]) {
          feedback[i] = "+";
          secretUsed[j] = true;
          misplaced += 1;
          break;
        }
      }
    }
  }

  return { feedback: feedback.join(""), exact, misplaced };
}

function explainFeedback(guess, result) {
  const missing = 4 - result.exact - result.misplaced;
  els.feedbackExplain.innerHTML = `
    <strong>Guess ${escapeHtml(guess)}</strong> produced
    <strong>${escapeHtml(result.feedback)}</strong>.<br>
    Exact matches: ${result.exact}. Misplaced digits: ${result.misplaced}.
    Missing digits: ${missing}.<br>
    The firmware checks exact positions first, then searches unused secret digits for misplaced matches.
  `;
}

function winGame() {
  stopTimer();
  state.mode = "GAMEOVER";
  state.score = calculateScore();
  appendTerminal("*** YOU WON ***");
  appendTerminal("Press 'S' to Restart.");
  setLcd("YOU WON", `Score ${state.score}`);
  playTone(620, 0.12);
  setTimeout(() => playTone(780, 0.16), 140);
  setInput("");
  pulse(els.traceGpio);
  render();
}

function timeoutGame() {
  stopTimer();
  state.mode = "GAMEOVER";
  state.remaining = 0;
  state.score = 0;
  appendTerminal("BOOM! Time is Up.");
  appendTerminal("Press 'S' to Restart.");
  setLcd("BOOM", "Time is up");
  els.buzzer.classList.add("active");
  playAlarm();
  setTimeout(clearBuzzer, 3000);
  pulse(els.traceTim);
  pulse(els.traceGpio);
  render();
}

function useRescue() {
  if (state.mode !== "PLAYING") {
    appendTerminal("Rescue is available only during PLAYING.");
    return;
  }

  if (state.rescueUsed >= 2) {
    appendTerminal("No rescue chances left.");
    return;
  }

  const bonus = state.rescueUsed === 0 ? 15 : 5;
  state.remaining += bonus;
  state.rescueUsed += 1;
  appendTerminal(`EXTI rescue used: +${bonus} seconds`);
  setLcd(`+${bonus} seconds`, `${2 - state.rescueUsed} rescue left`);
  pulse(els.traceExti);
  pulse(els.traceGpio);
  render();
}

function startTimer() {
  state.timerId = window.setInterval(() => {
    if (state.mode !== "PLAYING") return;
    state.remaining -= 1;
    pulse(els.traceTim);
    if (state.remaining <= 0) {
      timeoutGame();
    } else {
      render();
    }
  }, 1000);
}

function stopTimer() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function calculateScore() {
  const timeScore = state.remaining * 10;
  const attemptPenalty = Math.max(0, state.history.length - 1) * 15;
  const rescuePenalty = state.rescueUsed * 25;
  return Math.max(0, timeScore + 200 - attemptPenalty - rescuePenalty);
}

function setLcd(line1, line2) {
  els.lcdLine1.textContent = line1;
  els.lcdLine2.textContent = line2;
}

function appendTerminal(text) {
  state.terminalLines.push(text);
  if (state.terminalLines.length > 80) state.terminalLines.shift();
  renderTerminal();
}

function renderTerminal() {
  els.terminal.textContent = state.terminalLines.join("\n");
  els.terminal.scrollTop = els.terminal.scrollHeight;
}

function render() {
  renderState();
  renderSevenSegment();
  renderSecret();
  renderHistory();
  renderInputs();
  renderRescue();
}

function renderState() {
  els.stateChip.textContent = state.mode;
  els.stateChip.className = "chip";
  if (state.mode === "PLAYING") els.stateChip.classList.add("chip-play");
  if (state.mode === "GAMEOVER") els.stateChip.classList.add("chip-over");
  els.clockChip.textContent = state.mode === "PLAYING" ? `TIM2 ${state.remaining}s` : "TIM2 idle";
  els.scoreChip.textContent = `Score ${state.score}`;
}

function renderSevenSegment() {
  const value = String(Math.max(0, state.remaining)).padStart(4, "0").slice(-4);
  [...els.sevenDisplay.querySelectorAll(".digit")].forEach((digit, index) => {
    const number = value[index];
    const active = SEGMENTS[number] || [];
    digit.querySelectorAll(".seg").forEach((segment) => {
      segment.classList.toggle("on", active.includes(segment.dataset.segment));
    });
  });
}

function renderSecret() {
  els.secretBox.textContent = els.debugToggle.checked ? `Secret: ${state.secret}` : "Secret: ----";
}

function renderHistory() {
  els.attemptChip.textContent = `${state.history.length} attempts`;
  if (state.history.length === 0) {
    els.historyBody.innerHTML = `<tr><td colspan="5">No guesses yet.</td></tr>`;
    return;
  }

  els.historyBody.innerHTML = state.history
    .map((row) => `
      <tr>
        <td>${row.attempt}</td>
        <td class="code">${escapeHtml(row.guess)}</td>
        <td class="feedback">${escapeHtml(row.feedback)}</td>
        <td>${row.exact}</td>
        <td>${row.misplaced}</td>
      </tr>
    `)
    .join("");
}

function renderInputs() {
  const playing = state.mode === "PLAYING";
  els.submitBtn.disabled = !playing;
  els.guessInput.disabled = !playing;
  els.rescueBtn.disabled = !playing || state.rescueUsed >= 2;
  els.startBtn.textContent = state.mode === "WAIT_START" ? "Start S" : "Restart S";
}

function renderRescue() {
  els.led1.classList.toggle("active", state.rescueUsed < 1);
  els.led2.classList.toggle("active", state.rescueUsed < 2);
}

function clearBuzzer() {
  els.buzzer.classList.remove("active");
}

function pulse(element) {
  element.classList.remove("pulse");
  void element.offsetWidth;
  element.classList.add("pulse");
  window.setTimeout(() => element.classList.remove("pulse"), 260);
}

function playAlarm() {
  playTone(220, 0.14);
  setTimeout(() => playTone(160, 0.14), 180);
  setTimeout(() => playTone(220, 0.14), 360);
}

function playTone(frequency, duration) {
  if (!els.soundToggle.checked) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  if (!state.audio) state.audio = new AudioContext();

  const oscillator = state.audio.createOscillator();
  const gain = state.audio.createGain();
  oscillator.frequency.value = frequency;
  oscillator.type = "square";
  gain.gain.setValueAtTime(0.001, state.audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.05, state.audio.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, state.audio.currentTime + duration);
  oscillator.connect(gain);
  gain.connect(state.audio.destination);
  oscillator.start();
  oscillator.stop(state.audio.currentTime + duration);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

init();
