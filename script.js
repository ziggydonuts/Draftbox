// DraftBox — AI caption studio
// Calls the Google Gemini API directly from the browser using a key the user
// supplies themselves (free tier, no credit card required — get one at
// aistudio.google.com/apikey). The key is kept in sessionStorage only
// (cleared when the tab closes) and is never sent anywhere except
// generativelanguage.googleapis.com.

const els = {
  form: document.getElementById('briefForm'),
  topic: document.getElementById('topic'),
  platform: document.getElementById('platform'),
  tone: document.getElementById('tone'),
  generateBtn: document.getElementById('generateBtn'),
  statusLine: document.getElementById('statusLine'),
  cards: document.getElementById('cards'),
  emptyState: document.getElementById('emptyState'),
  draftCount: document.getElementById('draftCount'),
  keyBtn: document.getElementById('keyBtn'),
  keyDot: document.getElementById('keyDot'),
  modalBackdrop: document.getElementById('modalBackdrop'),
  apiKeyInput: document.getElementById('apiKeyInput'),
  saveKeyBtn: document.getElementById('saveKeyBtn'),
  closeModalBtn: document.getElementById('closeModalBtn'),
};

const STORAGE_KEY = 'draftbox_api_key';

function getApiKey() {
  return sessionStorage.getItem(STORAGE_KEY) || '';
}

function setApiKey(key) {
  sessionStorage.setItem(STORAGE_KEY, key);
  refreshKeyStatus();
}

function refreshKeyStatus() {
  const hasKey = !!getApiKey();
  els.keyDot.classList.toggle('active', hasKey);
  els.statusLine.textContent = hasKey
    ? 'Key connected. Ready to draft.'
    : 'Add your free Gemini API key to start drafting.';
  els.statusLine.classList.remove('error', 'ok');
}

// ---------- Modal ----------
function openModal() {
  els.apiKeyInput.value = getApiKey();
  els.modalBackdrop.classList.add('open');
  els.apiKeyInput.focus();
}
function closeModal() {
  els.modalBackdrop.classList.remove('open');
}

els.keyBtn.addEventListener('click', openModal);
els.closeModalBtn.addEventListener('click', closeModal);
els.modalBackdrop.addEventListener('click', (e) => {
  if (e.target === els.modalBackdrop) closeModal();
});
els.saveKeyBtn.addEventListener('click', () => {
  const val = els.apiKeyInput.value.trim();
  setApiKey(val);
  closeModal();
});

// ---------- Generation ----------
els.form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const apiKey = getApiKey();
  if (!apiKey) {
    openModal();
    return;
  }

  const topic = els.topic.value.trim();
  const platform = els.platform.value;
  const tone = els.tone.value;
  if (!topic) return;

  setLoading(true);

  try {
    const drafts = await fetchDrafts({ topic, platform, tone, apiKey });
    renderDrafts(drafts, platform);
    els.statusLine.textContent = `${drafts.length} drafts ready.`;
    els.statusLine.classList.remove('error');
    els.statusLine.classList.add('ok');
  } catch (err) {
    console.error(err);
    els.statusLine.textContent = err.message || 'Something went wrong. Check your key and try again.';
    els.statusLine.classList.remove('ok');
    els.statusLine.classList.add('error');
  } finally {
    setLoading(false);
  }
});

function setLoading(isLoading) {
  els.generateBtn.disabled = isLoading;
  els.generateBtn.querySelector('span').textContent = isLoading
    ? 'Drafting…'
    : 'Generate drafts';
}

const GEMINI_MODEL = 'gemini-2.5-flash';

async function fetchDrafts({ topic, platform, tone, apiKey }) {
  const systemPrompt = `You write short-form social captions. Return ONLY valid JSON, no prose, no markdown fences, matching exactly this shape:
{"drafts":[{"caption":"...","hashtags":["...","..."]}]}
Write exactly 3 drafts. Each caption should be platform-appropriate for ${platform}, written in a "${tone}" tone. Keep captions concise and natural, not generic. Include 3-5 relevant hashtags per draft (no spaces, no # duplicated, lowercase unless it's an acronym).`;

  const userPrompt = `Topic: ${topic}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.9,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 400 && body.includes('API key not valid')) {
      throw new Error('That API key was rejected. Double-check it and try again.');
    }
    if (response.status === 429) {
      throw new Error('Free-tier rate limit hit — wait a few seconds and try again.');
    }
    throw new Error(`API error (${response.status}): ${body.slice(0, 140)}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No text returned from the model.');

  const cleaned = text.replace(/```json|```/g, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Could not parse the model response as JSON.');
  }

  if (!parsed.drafts || !Array.isArray(parsed.drafts)) {
    throw new Error('Unexpected response shape from the model.');
  }

  return parsed.drafts;
}

// ---------- Rendering ----------
function renderDrafts(drafts, platform) {
  els.emptyState.remove();
  els.cards.innerHTML = '';

  drafts.forEach((draft, i) => {
    const card = document.createElement('article');
    card.className = 'card';

    const label = document.createElement('p');
    label.className = 'card-label';
    label.textContent = `Draft ${String(i + 1).padStart(2, '0')} · ${platform}`;

    const text = document.createElement('p');
    text.className = 'card-text';
    text.textContent = draft.caption;

    const tags = document.createElement('div');
    tags.className = 'tags';
    (draft.hashtags || []).forEach((tag) => {
      const chip = document.createElement('span');
      chip.className = 'tag';
      chip.textContent = tag.startsWith('#') ? tag : `#${tag}`;
      tags.appendChild(chip);
    });

    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = 'Copy caption';
    copyBtn.addEventListener('click', () => {
      const full = `${draft.caption}\n\n${(draft.hashtags || []).map(t => t.startsWith('#') ? t : `#${t}`).join(' ')}`;
      navigator.clipboard.writeText(full).then(() => {
        copyBtn.textContent = 'Copied ✓';
        copyBtn.classList.add('copied');
        setTimeout(() => {
          copyBtn.textContent = 'Copy caption';
          copyBtn.classList.remove('copied');
        }, 1600);
      });
    });

    card.append(label, text, tags, copyBtn);
    els.cards.appendChild(card);
  });

  els.draftCount.textContent = String(drafts.length);
}

// ---------- Init ----------
refreshKeyStatus();
