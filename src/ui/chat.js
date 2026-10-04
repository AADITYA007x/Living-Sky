// "Talk to the star": a conversation panel that sends the star's catalog
// facts and the chat history to the /api/chat proxy.

const ENDPOINT = '/api/chat';
const MAX_INPUT = 600;

const ERRORS = {
  rate_limited: 'Too many voices at once. Give me a minute, then ask again.',
  not_configured: 'The chat is not set up yet: the server has no API key.',
  default: 'Something interrupted my light on its way to you. Please try again.',
  offline: 'I cannot reach you right now. Check your connection and try again.',
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export class StarChat {
  constructor(root) {
    this.root = root;
    this.onBack = null;
    this.star = null;
    this.key = null;
    this.histories = new Map();
    this.busy = false;
    this.build();

    window.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Escape' && this.isOpen && !document.querySelector('.scope.is-open, .gallery.is-open')) {
          e.stopPropagation();
          this.close();
          this.onBack?.();
        }
      },
      true,
    );
  }

  get isOpen() {
    return this.root.classList.contains('is-open');
  }

  build() {
    const r = this.root;
    r.setAttribute('aria-hidden', 'true');
    r.innerHTML = `
      <header class="chat-head">
        <button class="chat-back" type="button" aria-label="Back to star details">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="chat-head-text">
          <h2 class="chat-name"></h2>
          <p class="chat-sub">Speaking from its real catalog data</p>
        </div>
      </header>
      <div class="chat-log" role="log" aria-live="polite"></div>
      <div class="chat-suggestions"></div>
      <form class="chat-form">
        <label class="visually-hidden" for="chat-input">Your message</label>
        <textarea id="chat-input" class="chat-input" rows="1" maxlength="${MAX_INPUT}" placeholder="Ask something…"></textarea>
        <button class="chat-send" type="submit" aria-label="Send">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </form>
      <p class="chat-note">Replies are written by an AI (Google Gemini) and can be wrong. Please don’t share personal information.</p>
    `;
    this.nameEl = r.querySelector('.chat-name');
    this.log = r.querySelector('.chat-log');
    this.suggestions = r.querySelector('.chat-suggestions');
    this.form = r.querySelector('.chat-form');
    this.input = r.querySelector('.chat-input');
    this.sendBtn = r.querySelector('.chat-send');

    r.querySelector('.chat-back').addEventListener('click', () => {
      this.close();
      this.onBack?.();
    });
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.send(this.input.value);
    });
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        this.send(this.input.value);
      }
    });
    this.input.addEventListener('input', () => this.autosize());
  }

  autosize() {
    this.input.style.height = 'auto';
    this.input.style.height = `${Math.min(this.input.scrollHeight, 140)}px`;
  }

  open(key, star) {
    this.key = key;
    this.star = star;
    this.nameEl.textContent = star.name;

    if (!this.histories.has(key)) {
      this.histories.set(key, [{ role: 'star', text: greeting(star) }]);
    }
    this.render();
    this.root.classList.add('is-open');
    this.root.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-chatting');
    setTimeout(() => this.input.focus({ preventScroll: true }), 350);
  }

  close() {
    document.body.classList.remove('is-chatting');
    this.root.classList.remove('is-open');
    this.root.setAttribute('aria-hidden', 'true');
  }

  render() {
    const history = this.histories.get(this.key) ?? [];
    this.log.replaceChildren(...history.map((m) => this.bubble(m)));
    this.renderSuggestions(history);
    this.scrollToEnd(false);
  }

  bubble(m) {
    const node = el('p', `chat-msg chat-msg-${m.role}${m.error ? ' is-error' : ''}`, m.text);
    return node;
  }

  renderSuggestions(history) {
    this.suggestions.replaceChildren();
    if (history.some((m) => m.role === 'user')) return;
    for (const q of suggestionsFor(this.star)) {
      const b = el('button', 'chat-chip', q);
      b.type = 'button';
      b.addEventListener('click', () => this.send(q));
      this.suggestions.append(b);
    }
  }

  scrollToEnd(smooth = true) {
    this.log.scrollTo({ top: this.log.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }

  async send(text) {
    const message = text.trim().slice(0, MAX_INPUT);
    if (!message || this.busy) return;
    const key = this.key;
    const history = this.histories.get(key);

    history.push({ role: 'user', text: message });
    this.input.value = '';
    this.autosize();
    this.suggestions.replaceChildren();
    this.log.append(this.bubble({ role: 'user', text: message }));

    const typing = el('p', 'chat-msg chat-msg-star is-typing');
    typing.innerHTML = '<span></span><span></span><span></span>';
    typing.setAttribute('aria-label', `${this.star.name} is replying`);
    this.log.append(typing);
    this.scrollToEnd();
    this.setBusy(true);

    let reply;
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          star: this.star.facts,
          messages: history.filter((m) => !m.error).map(({ role, text }) => ({ role, text })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) console.warn('Star chat error', res.status, data);
      reply = res.ok && data.reply
        ? { role: 'star', text: data.reply }
        : { role: 'star', text: ERRORS[data.error] ?? ERRORS.default, error: true };
    } catch {
      reply = { role: 'star', text: ERRORS.offline, error: true };
    }

    history.push(reply);
    this.setBusy(false);
    if (this.key !== key) return;
    typing.replaceWith(this.bubble(reply));
    this.scrollToEnd();
  }

  setBusy(busy) {
    this.busy = busy;
    this.sendBtn.disabled = busy;
    this.root.classList.toggle('is-busy', busy);
  }
}

function greeting(star) {
  const light = star.lightYear
    ? ` ${star.lightYear.replace('The light reaching your eyes tonight left this star', 'The light you see from me tonight left')}`
    : '';
  return `I am ${star.name}.${light} Ask me anything.`;
}

function suggestionsFor(star) {
  const type = (star.facts?.type ?? '').toLowerCase();
  const list = ['What are you made of?'];
  if (type.includes('supergiant')) list.push('Will you explode one day?');
  else if (type.includes('white dwarf')) list.push('What happened to you?');
  else list.push('How long will you shine?');
  list.push(star.facts?.fact ? 'Tell me something surprising' : 'What would I see from near you?');
  return list;
}
