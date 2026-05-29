const BACKEND_ENDPOINT = 'https://<your-vercel-project>.vercel.app/api/generate'; // Remplace par l'URL de ton backend Vercel déployé
const HARDCODED_PASSWORD = 'Secret123!';
const MAX_JSON_SIZE_KB = 30;
const MAX_JSON_DEPTH = 12;
const REQUEST_TIMEOUT_MS = 25000;
const MIN_GENERATE_INTERVAL_MS = 2000;
const STATE = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error'
};

const elements = {
  loginForm: document.getElementById('loginForm'),
  passwordInput: document.getElementById('passwordInput'),
  loginError: document.getElementById('loginError'),
  loginScreen: document.getElementById('loginScreen'),
  mainScreen: document.getElementById('mainScreen'),
  generateButton: document.getElementById('generateButton'),
  resetButton: document.getElementById('resetButton'),
  copyButton: document.getElementById('copyButton'),
  jsonInput: document.getElementById('jsonInput'),
  statusText: document.getElementById('statusText'),
  feedbackMessage: document.getElementById('feedbackMessage'),
  resultPanel: document.getElementById('resultPanel'),
  umlImage: document.getElementById('umlImage'),
  plantumlCodeArea: document.getElementById('plantumlCode'),
  placeholderText: document.getElementById('placeholderText')
};

let currentState = STATE.IDLE;
let lastGenerateTimestamp = 0;

elements.loginForm.addEventListener('submit', event => {
  event.preventDefault();
  clearLoginError();

  if (elements.passwordInput.value === HARDCODED_PASSWORD) {
    transitionToMainScreen();
  } else {
    showLoginError('Mot de passe incorrect. Veuillez réessayer.');
    elements.passwordInput.value = '';
    elements.passwordInput.focus();
  }
});

elements.generateButton.addEventListener('click', async () => {
  const now = Date.now();
  if (now - lastGenerateTimestamp < MIN_GENERATE_INTERVAL_MS) {
    setFeedback('Veuillez patienter avant de relancer une génération.', STATE.ERROR);
    return;
  }

  lastGenerateTimestamp = now;
  await generateDiagram();
});

elements.resetButton.addEventListener('click', resetForm);
elements.copyButton.addEventListener('click', copyPlantUmlCode);

function clearLoginError() {
  elements.loginError.textContent = '';
}

function showLoginError(message) {
  elements.loginError.textContent = message;
}

function resetForm() {
  elements.jsonInput.value = '';
  elements.plantumlCodeArea.textContent = '';
  elements.umlImage.removeAttribute('src');
  setState(STATE.IDLE, 'État réinitialisé. Collez un nouveau JSON.');
  elements.copyButton.disabled = true;
  elements.resultPanel.classList.add('hidden');
  elements.placeholderText.classList.remove('hidden');
}

function transitionToMainScreen() {
  elements.mainScreen.classList.remove('hidden');
  requestAnimationFrame(() => elements.mainScreen.classList.add('visible'));
  elements.loginScreen.classList.add('hidden');
  elements.jsonInput.focus();
}

function setState(nextState, statusMessage = '') {
  currentState = nextState;
  switch (nextState) {
    case STATE.LOADING:
      elements.generateButton.disabled = true;
      elements.generateButton.textContent = 'Génération en cours...';
      elements.copyButton.disabled = true;
      elements.statusText.textContent = statusMessage;
      break;
    case STATE.SUCCESS:
      elements.generateButton.disabled = false;
      elements.generateButton.textContent = 'Générer le diagramme UML';
      elements.statusText.textContent = statusMessage;
      break;
    case STATE.ERROR:
      elements.generateButton.disabled = false;
      elements.generateButton.textContent = 'Générer le diagramme UML';
      elements.statusText.textContent = statusMessage;
      break;
    default:
      elements.generateButton.disabled = false;
      elements.generateButton.textContent = 'Générer le diagramme UML';
      elements.statusText.textContent = statusMessage;
      break;
  }
}

function setFeedback(message, type = STATE.ERROR) {
  elements.feedbackMessage.textContent = message;
  elements.feedbackMessage.className = `feedback ${type === STATE.SUCCESS ? 'success' : 'error'}`;
}

function clearFeedback() {
  elements.feedbackMessage.textContent = '';
  elements.feedbackMessage.className = 'feedback';
}

async function generateDiagram() {
  clearFeedback();
  elements.resultPanel.classList.add('hidden');
  elements.umlImage.removeAttribute('src');
  elements.plantumlCodeArea.textContent = '';

  const rawInput = elements.jsonInput.value.trim();
  const validation = validateJsonInput(rawInput);

  if (!validation.isValid) {
    setState(STATE.ERROR, validation.error);
    setFeedback(validation.error, STATE.ERROR);
    return;
  }

  setState(STATE.LOADING, 'Validation terminée. Appel au backend en cours...');

  try {
    const plantUml = await fetchPlantUmlCode(validation.cleanedJson);
    const imageUrl = await createPlantUmlImageUrl(plantUml);
    renderResult(plantUml, imageUrl);
    setState(STATE.SUCCESS, 'Diagramme généré avec succès.');
    setFeedback('Diagramme UML prêt.', STATE.SUCCESS);
  } catch (error) {
    const message = parseErrorMessage(error);
    console.error('[UML Generator]', error);
    setState(STATE.ERROR, message);
    setFeedback(message, STATE.ERROR);
  }
}

function validateJsonInput(rawText) {
  if (!rawText) {
    return { isValid: false, error: 'Le champ JSON est vide.' };
  }

  const sizeKb = new Blob([rawText]).size / 1024;
  if (sizeKb > MAX_JSON_SIZE_KB) {
    return { isValid: false, error: `JSON trop volumineux (${sizeKb.toFixed(1)} KB). Limite ${MAX_JSON_SIZE_KB} KB.` };
  }

  let parsedJson;
  try {
    parsedJson = JSON.parse(rawText);
  } catch (error) {
    return { isValid: false, error: 'JSON invalide : vérifiez la syntaxe.' };
  }

  const depth = getJsonDepth(parsedJson);
  if (depth > MAX_JSON_DEPTH) {
    return { isValid: false, error: `Profondeur JSON excessive (${depth}). Limite ${MAX_JSON_DEPTH}.` };
  }

  return {
    isValid: true,
    cleanedJson: JSON.stringify(parsedJson, null, 2)
  };
}

function getJsonDepth(value) {
  if (typeof value !== 'object' || value === null) {
    return 0;
  }

  const childDepths = Array.isArray(value)
    ? value.map(getJsonDepth)
    : Object.values(value).map(getJsonDepth);

  return 1 + (childDepths.length ? Math.max(...childDepths) : 0);
}

async function fetchPlantUmlCode(cleanJson) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(BACKEND_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ json: cleanJson }),
      signal: controller.signal
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Backend error ${response.status}: ${text || response.statusText}`);
    }

    const result = await response.json();

    if (result?.plantuml) {
      return result.plantuml;
    }

    throw new Error('Réponse backend invalide.');
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Délai d’attente dépassé pour le backend.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function createPlantUmlImageUrl(plantUmlText) {
  const encoded = await plantUmlEncode(plantUmlText);
  return `https://www.plantuml.com/plantuml/png/${encoded}`;
}

async function plantUmlEncode(text) {
  if (!window.CompressionStream) {
    throw new Error('Votre navigateur ne prend pas en charge CompressionStream nécessaire pour le codage PlantUML.');
  }

  const utf8 = new TextEncoder().encode(text);
  const cs = new CompressionStream('deflate-raw');
  const compressedStream = new Response(new Blob([utf8]).stream().pipeThrough(cs));
  const compressedBuffer = await compressedStream.arrayBuffer();
  return encode64(new Uint8Array(compressedBuffer));
}

function encode64(data) {
  let result = '';
  for (let i = 0; i < data.length; i += 3) {
    if (i + 2 >= data.length) {
      const b1 = data[i];
      const b2 = data[i + 1] || 0;
      result += append3bytes(b1, b2, 0);
      if (i + 1 === data.length) result += encode6bit(0);
      break;
    }
    result += append3bytes(data[i], data[i + 1], data[i + 2]);
  }
  return result;
}

function append3bytes(b1, b2, b3) {
  const c1 = b1 >> 2;
  const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
  const c3 = ((b2 & 0xf) << 2) | (b3 >> 6);
  const c4 = b3 & 0x3f;
  return encode6bit(c1) + encode6bit(c2) + encode6bit(c3) + encode6bit(c4);
}

function encode6bit(b) {
  if (b < 10) return String.fromCharCode(48 + b);
  b -= 10;
  if (b < 26) return String.fromCharCode(65 + b);
  b -= 26;
  if (b < 26) return String.fromCharCode(97 + b);
  b -= 26;
  if (b === 0) return '-';
  if (b === 1) return '_';
  return '?';
}

function renderResult(plantUmlText, imageUrl) {
  elements.plantumlCodeArea.textContent = plantUmlText;
  elements.umlImage.src = imageUrl;
  elements.umlImage.alt = 'Diagramme UML généré à partir du JSON.';
  elements.resultPanel.classList.remove('hidden');
  elements.copyButton.disabled = false;
  elements.placeholderText.classList.add('hidden');
}

async function copyPlantUmlCode() {
  const text = elements.plantumlCodeArea.textContent.trim();
  if (!text) {
    setFeedback('Aucun code PlantUML à copier.', STATE.ERROR);
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    setFeedback('Code PlantUML copié dans le presse-papiers.', STATE.SUCCESS);
  } catch (error) {
    console.error('[Clipboard]', error);
    setFeedback('Impossible de copier. Veuillez utiliser votre navigateur.', STATE.ERROR);
  }
}

function parseErrorMessage(error) {
  if (!error) {
    return 'Erreur inconnue.';
  }
  if (typeof error === 'string') {
    return error;
  }
  return error.message || 'Erreur interne inconnue.';
}

function initializeUi() {
  elements.loginScreen.classList.add('visible');
  document.body.classList.add('ready');
}

initializeUi();

setState(STATE.IDLE, 'Prêt à convertir un JSON en UML.');
