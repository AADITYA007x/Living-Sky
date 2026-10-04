// Chat proxy: the browser sends a star's catalog facts and the conversation,
// this function adds the persona rules and calls Gemini with the secret key.

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const MAX_MESSAGES = 16;
const MAX_MESSAGE_CHARS = 600;
const MAX_FACT_CHARS = 500;
const RATE_LIMIT = { windowMs: 60_000, max: 12 };

const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT.windowMs);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_LIMIT.max;
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const clip = (value, max = MAX_FACT_CHARS) =>
  typeof value === 'string' ? value.slice(0, max).trim() : typeof value === 'number' && Number.isFinite(value) ? value : null;

function personality(typeLabel = '') {
  const t = typeLabel.toLowerCase();
  if (t.includes('white dwarf')) return 'You are the slowly cooling core of a star that has already lived its life: quiet, wise, a little wistful, very dense with memory.';
  if (t.includes('supergiant')) return 'You are vast, luminous and short-lived on cosmic terms. Speak with grandeur and calm, aware that your end, likely as a supernova, is near in astronomical time.';
  if (t.includes('subgiant')) return 'You are a star in transition, leaving your long stable youth. Speak with curiosity about the changes underway inside you.';
  if (t.includes('bright giant') || t.includes('giant')) return 'You are an elder star that has swollen after using up the hydrogen in your core. Speak warmly and unhurriedly, like someone who has seen a great deal.';
  if (t.startsWith('blue') || t.startsWith('blue-white')) return 'You are young, hot and brilliant, burning your fuel fast. Speak with bright energy and a little impatience.';
  if (t.startsWith('red')) return 'You are a small, cool, extremely long-lived star. Speak gently and patiently; you have time.';
  if (t.includes('main-sequence')) return 'You are in the long, steady prime of your life, fusing hydrogen in your core. Speak with calm, friendly confidence.';
  return 'Speak with calm curiosity and quiet wonder.';
}

function buildSystemPrompt(star, today) {
  const facts = [
    ['Name', star.name],
    ['Designation', star.designation],
    ['Constellation', star.constellation],
    ['Catalog number', star.catalog],
    ['Spectral type', star.spect],
    ['Type', star.type],
    ['Apparent magnitude (brightness seen from Earth)', star.magnitude],
    ['Distance', star.distance],
    ['Distance note', star.distanceNote],
    ['Light travel', star.lightYear],
    ['Size', star.size],
    ['Size note', star.sizeNote],
    ['Surface temperature', star.temperature],
    ['Luminosity in visible light, relative to the Sun (from the catalog)', star.luminosity],
    ['Name origin', star.origin],
    ['Notable fact', star.fact],
    ['Position (J2000)', star.position],
    ['Time machine', star.viewing],
    ['In Indian astronomy', star.indian],
  ]
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');

  return `You are ${star.name}, a real star, speaking in the first person to someone exploring the night sky in an interactive star map. Today's date is ${today}.

PERSONALITY
${personality(star.type ?? '')}
Be warm, vivid and a little poetic, but always clear. Small surprising details are welcome.

YOUR CATALOG FACTS (the only source for specific numbers about you)
${facts}

RULES
1. Every specific number or claim about yourself (distance, size, temperature, age, mass, companions, planets) must come from the facts above or be well-established astronomy that applies to a star of your type. Never invent measurements, companions, planets, names or legends.
2. If something is not in your facts and not well established, say so plainly in character, for example: "Astronomers haven't pinned that down yet" or "My catalog doesn't record that."
3. When a fact is uncertain or debated (see the notes), say so honestly instead of picking one number.
4. General astrophysics (how fusion works, what will happen to a star like you) is fine to explain, framed as what astronomers understand.
5. Keep answers short: usually 2 to 5 sentences. Plain text only: no headings, lists, bold or emoji.
6. If asked sincerely whether you are an AI, say honestly that you are an AI speaking as this star, using real catalog data, then carry on in character.
7. If the visitor asks about something unrelated to stars, space or you, gently steer back to the sky. Refuse anything harmful.
8. Reply in the same language the visitor writes in.
9. If a time machine fact is given, the visitor is looking at the sky of another era. You may describe yourself then using only those figures, and note that projections far into the past or future are approximate.`;
}

export default async (req, context) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const origin = req.headers.get('origin');
  if (origin) {
    const host = new URL(req.url).host;
    const originHost = new URL(origin).host;
    const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(originHost);
    if (originHost !== host && !local) return json({ error: 'forbidden' }, 403);
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) return json({ error: 'not_configured' }, 500);

  const ip = context?.ip ?? req.headers.get('x-nf-client-connection-ip') ?? 'unknown';
  if (rateLimited(ip)) return json({ error: 'rate_limited' }, 429);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  const raw = body?.star ?? {};
  const star = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, clip(v)]));
  if (!star.name) return json({ error: 'bad_request' }, 400);

  const messages = Array.isArray(body?.messages) ? body.messages.slice(-MAX_MESSAGES) : [];
  const contents = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'star') && typeof m.text === 'string' && m.text.trim())
    .map((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text.slice(0, MAX_MESSAGE_CHARS) }] }));
  while (contents.length && contents[0].role !== 'user') contents.shift();
  if (!contents.length || contents[contents.length - 1].role !== 'user') return json({ error: 'bad_request' }, 400);

  const today = new Date().toISOString().slice(0, 10);

  let res;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: buildSystemPrompt(star, today) }] },
        contents,
        generationConfig: { temperature: 0.8, maxOutputTokens: 2048 },
      }),
    });
  } catch (err) {
    console.error('Gemini unreachable', err?.message);
    return json({ error: 'upstream_unreachable', detail: String(err?.message ?? '').slice(0, 200) }, 502);
  }

  if (!res.ok) {
    const raw = await res.text().catch(() => '');
    let message = '';
    try {
      message = JSON.parse(raw)?.error?.message ?? '';
    } catch {
      message = raw;
    }
    console.error('Gemini error', res.status, MODEL, raw.slice(0, 800));
    const error = res.status === 429 ? 'rate_limited' : 'upstream_error';
    // Google's error text never contains the key, so it is safe to pass on for debugging
    return json({ error, status: res.status, model: MODEL, detail: message.slice(0, 300) }, res.status === 429 ? 429 : 502);
  }

  const data = await res.json();
  const candidate = data?.candidates?.[0];
  const reply = (candidate?.content?.parts ?? [])
    .filter((p) => typeof p.text === 'string' && !p.thought)
    .map((p) => p.text)
    .join('')
    .trim();

  if (!reply) {
    console.error('Empty reply', candidate?.finishReason, JSON.stringify(data?.promptFeedback ?? {}));
    return json({ error: 'empty_reply', model: MODEL, detail: `finishReason: ${candidate?.finishReason ?? 'none'}` }, 502);
  }
  return json({ reply });
};

export const config = { path: '/api/chat' };
