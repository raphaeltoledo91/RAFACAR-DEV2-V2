import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

const rootDir = process.cwd();
const dataDir = path.join(rootDir, 'data');
const distDir = path.join(rootDir, 'dist');
const configFile = path.join(dataDir, 'config.local.json');
const configExampleFile = path.join(dataDir, 'config.local.example.json');
const notificationsConfigFile = path.join(dataDir, 'notifications.local.json');
const notificationsExampleFile = path.join(dataDir, 'notifications.example.json');
const monitoringConfigFile = path.join(dataDir, 'monitoring.local.json');
const monitoringExampleFile = path.join(dataDir, 'monitoring.example.json');
const evidenceMediaDir = path.join(dataDir, 'evidence-media');

function readJsonSafe(file, fallback = {}) {
  try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback; }
  catch (error) { console.error(`[config] Falha ao ler ${file}:`, error.message); return fallback; }
}

function ensureConfigFiles() {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(evidenceMediaDir, { recursive: true });
  const example = { traccarUrl: 'https://gps2.rafacarrastreadores.com.br', mediaMtxUrl: 'http://mtx.getautoflow.com.br', port: 3000, pollingMs: 30000, allowUnsafeGoogleTiles: true, sessionTtlHours: 8 };
  const notificationsExample = {
    publicAppUrl: 'https://rafacar-dev2-production.up.railway.app',
    traccarWebhookSecret: 'troque-por-um-segredo-forte',
    pushover: {
      appToken: '',
      userKey: '',
      device: '',
      sound: 'pushover',
      priority: 0
    },
    firebase: {
      vapidKey: '',
      webConfig: {
        apiKey: '',
        authDomain: '',
        projectId: 'rafacar-dev2',
        storageBucket: '',
        messagingSenderId: '',
        appId: ''
      }
    }
  };
  const monitoringExample = {
    mediaMtxUrl: 'http://mtx.getautoflow.com.br',
    cameras: [
      {
        deviceId: 1,
        label: 'Camera principal',
        streamPath: 'veiculo-1/camera-1',
        snapshotPath: 'veiculo-1/camera-1/snapshot.jpg',
        mode: 'image',
        enabled: true,
        autoOpen: true
      }
    ],
    evidence: []
  };
  if (!fs.existsSync(configExampleFile)) fs.writeFileSync(configExampleFile, `${JSON.stringify(example, null, 2)}\n`);
  if (!fs.existsSync(notificationsExampleFile)) fs.writeFileSync(notificationsExampleFile, `${JSON.stringify(notificationsExample, null, 2)}\n`);
  if (!fs.existsSync(monitoringExampleFile)) fs.writeFileSync(monitoringExampleFile, `${JSON.stringify(monitoringExample, null, 2)}\n`);
  if (!fs.existsSync(configFile)) fs.writeFileSync(configFile, `${JSON.stringify(example, null, 2)}\n`, { mode: 0o600 });
  if (!fs.existsSync(monitoringConfigFile)) fs.writeFileSync(monitoringConfigFile, `${JSON.stringify({ mediaMtxUrl: monitoringExample.mediaMtxUrl, cameras: [], evidence: [] }, null, 2)}\n`, { mode: 0o600 });
  try { fs.chmodSync(configFile, 0o600); } catch { /* ignore */ }
  try { if (fs.existsSync(notificationsConfigFile)) fs.chmodSync(notificationsConfigFile, 0o600); } catch { /* ignore */ }
  try { if (fs.existsSync(monitoringConfigFile)) fs.chmodSync(monitoringConfigFile, 0o600); } catch { /* ignore */ }
}

ensureConfigFiles();
const localConfig = readJsonSafe(configFile, {});
const notificationsConfig = readJsonSafe(notificationsConfigFile, {});
const monitoringConfig = readJsonSafe(monitoringConfigFile, {});
const pushoverConfig = notificationsConfig.pushover || {};
const firebaseConfig = notificationsConfig.firebase || {};

function firebaseWebConfigJson() {
  const value = process.env.FIREBASE_WEB_CONFIG_JSON || localConfig.firebaseWebConfigJson || firebaseConfig.webConfigJson || firebaseConfig.webConfig || '';
  if (!value) return '';
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value); } catch { return ''; }
}

const config = {
  port: Number(process.env.PORT || localConfig.port || 3000),
  traccarUrl: String(process.env.TRACCAR_URL || localConfig.traccarUrl || 'https://gps2.rafacarrastreadores.com.br').replace(/\/+$/, ''),
  mediaMtxUrl: String(process.env.MEDIA_MTX_URL || process.env.MEDIAMTX_URL || localConfig.mediaMtxUrl || monitoringConfig.mediaMtxUrl || 'http://mtx.getautoflow.com.br').replace(/\/+$/, ''),
  pollingMs: Number(process.env.POLLING_MS || localConfig.pollingMs || 30000),
  allowUnsafeGoogleTiles: String(process.env.ALLOW_UNSAFE_GOOGLE_TILES ?? localConfig.allowUnsafeGoogleTiles ?? 'true') !== 'false',
  sessionTtlMs: Number(process.env.SESSION_TTL_MS || (Number(localConfig.sessionTtlHours || 8) * 60 * 60 * 1000)),
  publicAppUrl: String(process.env.PUBLIC_APP_URL || localConfig.publicAppUrl || notificationsConfig.publicAppUrl || '').replace(/\/+$/, ''),
  corsOrigins: String(process.env.CORS_ORIGINS || localConfig.corsOrigins || '').split(',').map((item) => item.trim().replace(/\/+$/, '')).filter(Boolean),
  cookieSameSite: String(process.env.COOKIE_SAMESITE || localConfig.cookieSameSite || 'lax').toLowerCase(),
  cookieSecure: String(process.env.COOKIE_SECURE ?? localConfig.cookieSecure ?? '').toLowerCase(),
  pushover: {
    token: String(process.env.PUSHOVER_APP_TOKEN || process.env.PUSHOVER_TOKEN || localConfig.pushoverAppToken || localConfig.pushoverToken || pushoverConfig.appToken || pushoverConfig.token || ''),
    user: String(process.env.PUSHOVER_USER_KEY || process.env.PUSHOVER_USER || localConfig.pushoverUserKey || localConfig.pushoverUser || pushoverConfig.userKey || pushoverConfig.user || ''),
    device: String(process.env.PUSHOVER_DEVICE || localConfig.pushoverDevice || pushoverConfig.device || ''),
    sound: String(process.env.PUSHOVER_SOUND || localConfig.pushoverSound || pushoverConfig.sound || 'pushover'),
    priority: Number(process.env.PUSHOVER_PRIORITY || localConfig.pushoverPriority || pushoverConfig.priority || 0)
  },
  firebase: {
    vapidKey: String(process.env.FIREBASE_VAPID_KEY || localConfig.firebaseVapidKey || firebaseConfig.vapidKey || ''),
    webConfigJson: firebaseWebConfigJson()
  },
  gemini: {
    apiKey: String(process.env.GEMINI_API_KEY || localConfig.geminiApiKey || ''),
    model: String(process.env.GEMINI_MODEL || localConfig.geminiModel || 'gemini-flash-latest').replace(/^models\//, '')
  },
  traccarWebhookSecret: String(process.env.TRACCAR_WEBHOOK_SECRET || localConfig.traccarWebhookSecret || notificationsConfig.traccarWebhookSecret || '')
};

const app = express();
const allowedMethods = new Set(['GET', 'POST', 'PUT', 'DELETE']);
const endpointAllowList = [
  /^\/api\/server$/, /^\/api\/session$/, /^\/api\/users(?:\/\d+)?$/, /^\/api\/permissions$/, /^\/api\/statistics$/,
  /^\/api\/devices(?:\/\d+)?$/, /^\/api\/positions(?:\/\d+)?$/, /^\/api\/events$/, /^\/api\/groups(?:\/\d+)?$/,
  /^\/api\/drivers(?:\/\d+)?$/, /^\/api\/geofences(?:\/\d+)?$/, /^\/api\/calendars(?:\/\d+)?$/,
  /^\/api\/attributes\/computed(?:\/\d+)?$/, /^\/api\/notifications(?:\/\d+)?$/, /^\/api\/notifications\/types$/,
  /^\/api\/maintenance(?:\/\d+)?$/, /^\/api\/commands(?:\/\d+)?$/, /^\/api\/commands\/types$/, /^\/api\/commands\/send$/,
  /^\/api\/reports\/(events|route|trips|stops|summary)$/, /^\/api\/geocode$/, /^\/api\/geocode\/reverse$/
];

const COOKIE_NAME = 'rafacar_sid';
const sessions = new Map();

function clampText(value, maxLength = 300) { return String(value ?? '').trim().slice(0, maxLength); }
function cleanMediaPath(value) { return String(value || '').trim().replace(/^\/+/, ''); }
function readMonitoringState() {
  const state = readJsonSafe(monitoringConfigFile, {});
  return {
    mediaMtxUrl: clampText(state.mediaMtxUrl || config.mediaMtxUrl, 300).replace(/\/+$/, ''),
    cameras: Array.isArray(state.cameras) ? state.cameras : [],
    evidence: Array.isArray(state.evidence) ? state.evidence : []
  };
}
function writeMonitoringState(nextState) {
  const payload = {
    mediaMtxUrl: config.mediaMtxUrl,
    cameras: Array.isArray(nextState.cameras) ? nextState.cameras : [],
    evidence: Array.isArray(nextState.evidence) ? nextState.evidence : []
  };
  fs.writeFileSync(monitoringConfigFile, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600 });
}
function monitoringSummary() {
  const state = readMonitoringState();
  return { mediaMtxUrl: config.mediaMtxUrl, camerasConfigured: state.cameras.length, evidenceCount: state.evidence.length };
}
function normalizeMode(value) {
  return ['image', 'webrtc', 'hls'].includes(String(value || '').toLowerCase()) ? String(value).toLowerCase() : 'image';
}
function publicCamera(camera = {}) {
  return {
    id: String(camera.id || camera.deviceId || ''),
    deviceId: Number(camera.deviceId),
    deviceName: clampText(camera.deviceName, 120),
    label: clampText(camera.label || 'Camera principal', 120),
    streamPath: clampText(camera.streamPath, 320),
    snapshotPath: clampText(camera.snapshotPath, 320),
    mode: normalizeMode(camera.mode),
    enabled: camera.enabled !== false,
    autoOpen: camera.autoOpen !== false,
    createdAt: camera.createdAt || null,
    updatedAt: camera.updatedAt || null
  };
}
function cameraFromBody(body = {}, existing = {}) {
  const deviceId = Number(body.deviceId);
  if (!Number.isFinite(deviceId) || deviceId <= 0) {
    const error = new Error('deviceId invalido para camera.');
    error.status = 400;
    throw error;
  }
  const streamPath = clampText(body.streamPath, 320).replace(/^\/+/, '');
  const snapshotPath = clampText(body.snapshotPath, 320).replace(/^\/+/, '');
  const enabled = body.enabled !== false;
  if (enabled && !streamPath && !snapshotPath) {
    const error = new Error('Informe o caminho de streaming ou snapshot do MediaMTX.');
    error.status = 400;
    throw error;
  }
  const now = new Date().toISOString();
  return {
    id: String(deviceId),
    deviceId,
    deviceName: clampText(body.deviceName, 120),
    label: clampText(body.label || existing.label || 'Camera principal', 120),
    streamPath,
    snapshotPath,
    mode: normalizeMode(body.mode || existing.mode),
    enabled,
    autoOpen: body.autoOpen !== false,
    createdAt: existing.createdAt || now,
    updatedAt: now
  };
}
function mediaMtxOrigin() {
  try { return new URL(config.mediaMtxUrl).origin; } catch { return ''; }
}
function mediaUrlFromInput(value) {
  const raw = clampText(value, 600);
  if (!raw) return '';
  const url = new URL(raw, `${config.mediaMtxUrl}/`);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('URL de midia invalida.');
  const allowedOrigin = mediaMtxOrigin();
  if (!allowedOrigin || url.origin !== allowedOrigin) throw new Error('A evidencia deve usar o servidor MediaMTX configurado.');
  return url.href;
}
function mediaUrlFromPathOrUrl({ path: mediaPath = '', url: mediaUrl = '' } = {}) {
  if (mediaUrl) return mediaUrlFromInput(mediaUrl);
  const pathValue = cleanMediaPath(mediaPath);
  if (!pathValue) {
    const error = new Error('Informe o caminho da imagem no MediaMTX.');
    error.status = 400;
    throw error;
  }
  return new URL(pathValue, `${config.mediaMtxUrl}/`).href;
}
function publicEvidence(record = {}) {
  const sourceUrl = clampText(record.sourceUrl || record.imageUrl, 700);
  return {
    id: String(record.id || ''),
    deviceId: Number(record.deviceId || 0) || null,
    deviceName: clampText(record.deviceName, 120),
    title: clampText(record.title || 'Evidencia RAFACAR', 160),
    note: clampText(record.note, 1000),
    streamPath: clampText(record.streamPath, 320),
    imageUrl: record.localFile ? `/api/monitoring/evidence/${encodeURIComponent(record.id)}/image` : (sourceUrl ? `/api/monitoring/media/image?url=${encodeURIComponent(sourceUrl)}` : ''),
    sourceUrl,
    capturedAt: record.capturedAt || record.createdAt || null,
    createdAt: record.createdAt || null,
    createdBy: clampText(record.createdBy, 120)
  };
}
function evidenceFromBody(body = {}, user = {}) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const imageUrl = body.imageUrl ? mediaUrlFromInput(body.imageUrl) : '';
  return {
    id,
    deviceId: Number(body.deviceId || 0) || null,
    deviceName: clampText(body.deviceName, 120),
    title: clampText(body.title || `Evidencia ${now}`, 160),
    note: clampText(body.note, 1000),
    streamPath: clampText(body.streamPath, 320),
    imageUrl,
    sourceUrl: imageUrl,
    capturedAt: clampText(body.capturedAt || now, 80),
    createdAt: now,
    createdBy: clampText(user.name || user.email || 'usuario', 120)
  };
}
async function saveSnapshotEvidence(body = {}, user = {}) {
  const record = evidenceFromBody(body, user);
  if (!record.imageUrl) {
    const error = new Error('Informe uma URL de imagem/snapshot do MediaMTX.');
    error.status = 400;
    throw error;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(record.imageUrl, { signal: controller.signal, redirect: 'manual' });
    const type = response.headers.get('content-type') || '';
    if (!response.ok) {
      const error = new Error(`MediaMTX retornou HTTP ${response.status} ao buscar snapshot.`);
      error.status = 502;
      throw error;
    }
    if (!type.startsWith('image/')) {
      const error = new Error('A URL informada nao retornou uma imagem.');
      error.status = 415;
      throw error;
    }
    const length = Number(response.headers.get('content-length') || 0);
    if (length > 6 * 1024 * 1024) {
      const error = new Error('Imagem maior que 6MB.');
      error.status = 413;
      throw error;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 6 * 1024 * 1024) {
      const error = new Error('Imagem maior que 6MB.');
      error.status = 413;
      throw error;
    }
    const extension = type.includes('png') ? '.png' : type.includes('webp') ? '.webp' : '.jpg';
    const filename = `${record.id}${extension}`;
    fs.writeFileSync(path.join(evidenceMediaDir, filename), buffer, { mode: 0o600 });
    record.localFile = filename;
    return record;
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('Tempo esgotado ao buscar snapshot no MediaMTX.');
      timeoutError.status = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
function isAllowedEndpoint(urlPath) { return endpointAllowList.some((rx) => rx.test(urlPath)); }
function pushoverConfigured() { return Boolean(config.pushover.token && config.pushover.user); }
function geminiConfigured() { return Boolean(config.gemini.apiKey); }
function safePublicConfig(req = null) {
  return {
    pollingMs: config.pollingMs,
    traccarUrl: config.traccarUrl,
    mediaMtxUrl: config.mediaMtxUrl,
    authMode: 'traccar-user-session',
    authenticated: Boolean(req ? getSession(req) : false),
    configExists: fs.existsSync(configFile),
    allowUnsafeGoogleTiles: config.allowUnsafeGoogleTiles,
    mobile: { installable: true, serviceWorker: true, appUrl: config.publicAppUrl || '' },
    monitoring: monitoringSummary(),
    assistant: { aiEnabled: geminiConfigured() }
  };
}
function redact(value) { if (!value) return ''; const s = String(value); return s.length <= 8 ? '********' : `${s.slice(0, 4)}…${s.slice(-4)}`; }
function parseCookies(req) { const header = req.headers.cookie || ''; return Object.fromEntries(header.split(';').map((part) => { const [key, ...rest] = part.trim().split('='); if (!key) return null; return [decodeURIComponent(key), decodeURIComponent(rest.join('=') || '')]; }).filter(Boolean)); }
function allowedCorsOrigins() {
  const origins = new Set(config.corsOrigins);
  if (config.publicAppUrl) {
    try { origins.add(new URL(config.publicAppUrl).origin); } catch { /* ignore */ }
  }
  return origins;
}
function isCorsAllowed(origin = '') { return Boolean(origin && allowedCorsOrigins().has(String(origin).replace(/\/+$/, ''))); }
function cookieOptions(req) {
  const isSecureRequest = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const sameSite = ['none', 'lax', 'strict'].includes(config.cookieSameSite) ? config.cookieSameSite : 'lax';
  const secure = config.cookieSecure ? config.cookieSecure === 'true' : (sameSite === 'none' || Boolean(isSecureRequest));
  return { httpOnly: true, sameSite, secure, path: '/', maxAge: config.sessionTtlMs };
}
function parseSetCookie(headers) { const raw = headers.get('set-cookie'); if (!raw) return ''; return raw.split(/,(?=[^;,]+=)/g).map((part) => part.split(';')[0].trim()).filter(Boolean).join('; '); }
function sanitizeUser(payload, fallbackLogin = '') { const user = payload && typeof payload === 'object' ? payload : {}; return { id: user.id ?? null, name: user.name || user.email || fallbackLogin, email: user.email || fallbackLogin, administrator: Boolean(user.administrator), readonly: Boolean(user.readonly), deviceReadonly: Boolean(user.deviceReadonly), disabled: Boolean(user.disabled) }; }
function sanitizeProfilePayload(body = {}, currentUser = {}) {
  const payload = { ...(currentUser && typeof currentUser === 'object' ? currentUser : {}) };
  for (const key of ['password', 'token', 'hashedPassword', 'salt']) delete payload[key];
  for (const key of ['name', 'email', 'phone', 'latitude', 'longitude', 'zoom', 'coordinateFormat']) {
    if (body[key] !== undefined) payload[key] = typeof body[key] === 'string' ? body[key].trim() : body[key];
  }
  if (body.attributes && typeof body.attributes === 'object' && !Array.isArray(body.attributes)) {
    payload.attributes = { ...(currentUser.attributes || {}), ...body.attributes };
  }
  payload.id = currentUser.id;
  return payload;
}
function createLocalSession(req, res, remoteCookie, user) { const sid = crypto.randomBytes(32).toString('base64url'); const now = Date.now(); sessions.set(sid, { sid, remoteCookie, user, createdAt: now, lastSeenAt: now, expiresAt: now + config.sessionTtlMs }); res.cookie(COOKIE_NAME, sid, cookieOptions(req)); return sid; }
function destroyLocalSession(req, res) { const sid = parseCookies(req)[COOKIE_NAME]; if (sid) sessions.delete(sid); res.clearCookie(COOKIE_NAME, { path: '/' }); }
function cleanupSessions() { const now = Date.now(); for (const [sid, session] of sessions.entries()) if (!session?.expiresAt || session.expiresAt <= now) sessions.delete(sid); }
function getSession(req) { cleanupSessions(); const sid = parseCookies(req)[COOKIE_NAME]; if (!sid) return null; const session = sessions.get(sid); if (!session) return null; if (session.expiresAt <= Date.now()) { sessions.delete(sid); return null; } session.lastSeenAt = Date.now(); session.expiresAt = Date.now() + config.sessionTtlMs; return session; }
function requireAuth(req, res, next) { const session = getSession(req); if (!session) return res.status(401).json({ ok: false, error: 'Login necessário. Entre com as credenciais do Traccar.' }); req.rafacarSession = session; return next(); }
function requireAdministrator(req, res, next) { if (!req.rafacarSession?.user?.administrator) return res.status(403).json({ ok: false, error: 'Somente administrador pode testar notificacoes.' }); return next(); }

async function loginToTraccar(login, password) {
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 18000);
  try {
    const body = new URLSearchParams({ email: login, password });
    const response = await fetch(`${config.traccarUrl}/api/session`, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body, signal: controller.signal, redirect: 'manual' });
    const setCookie = parseSetCookie(response.headers); const text = await response.text(); let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = text ? { raw: text } : null; }
    if (!response.ok || !setCookie) { const message = payload?.message || payload?.error || payload?.raw || `Traccar retornou HTTP ${response.status}`; const error = new Error(String(message).slice(0, 500)); error.status = response.status || 401; throw error; }
    return { remoteCookie: setCookie, user: sanitizeUser(payload, login) };
  } catch (error) { if (error.name === 'AbortError') throw new Error('Tempo esgotado ao autenticar no Traccar.'); throw error; }
  finally { clearTimeout(timeout); }
}

function buildAuthHeaders(req, extra = {}) { const session = req.rafacarSession || getSession(req); if (!session?.remoteCookie) { const error = new Error('Sessão Traccar não encontrada. Faça login novamente.'); error.status = 401; throw error; } return { Accept: 'application/json', Cookie: session.remoteCookie, ...extra }; }

async function traccarFetch(req, apiPath, options = {}) {
  if (!apiPath.startsWith('/api/')) throw new Error('Rota interna invalida.');
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), Number(options.timeoutMs || 18000)); const url = `${config.traccarUrl}${apiPath}`;
  try {
    const response = await fetch(url, { method: options.method || 'GET', headers: buildAuthHeaders(req, options.headers), body: options.body, signal: controller.signal, redirect: 'manual' });
    const setCookie = parseSetCookie(response.headers); if (setCookie) { const session = req.rafacarSession || getSession(req); if (session) session.remoteCookie = setCookie; }
    const contentType = response.headers.get('content-type') || ''; const text = await response.text(); let payload = null;
    if (contentType.includes('application/json')) { try { payload = text ? JSON.parse(text) : null; } catch { payload = { raw: text }; } } else { payload = text ? { raw: text } : null; }
    if (response.status === 401) { const sid = parseCookies(req)[COOKIE_NAME]; if (sid) sessions.delete(sid); }
    if (!response.ok) { const message = payload?.message || payload?.error || payload?.raw || `Traccar retornou HTTP ${response.status}`; const error = new Error(String(message).slice(0, 500)); error.status = response.status; error.payload = payload; throw error; }
    return payload;
  } catch (error) { if (error.name === 'AbortError') throw new Error('Tempo esgotado ao conectar ao Traccar.'); throw error; }
  finally { clearTimeout(timeout); }
}

function recentIso(hoursBack = 24) { return new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString(); }
function nowIso() { return new Date().toISOString(); }
async function buildSnapshot(req) {
  const eventsPath = `/api/reports/events?from=${encodeURIComponent(recentIso(24))}&to=${encodeURIComponent(nowIso())}`;
  const [server, devices, positions, events] = await Promise.allSettled([traccarFetch(req, '/api/server'), traccarFetch(req, '/api/devices'), traccarFetch(req, '/api/positions'), traccarFetch(req, eventsPath)]);
  return { ok: true, user: req.rafacarSession?.user || null, server: server.status === 'fulfilled' ? server.value : null, devices: devices.status === 'fulfilled' && Array.isArray(devices.value) ? devices.value : [], positions: positions.status === 'fulfilled' && Array.isArray(positions.value) ? positions.value : [], events: events.status === 'fulfilled' && Array.isArray(events.value) ? events.value : [], errors: [server, devices, positions, events].filter((item) => item.status === 'rejected').map((item) => item.reason?.message || String(item.reason)), config: safePublicConfig(req) };
}

function formatWebhookMessage(payload = {}) {
  const event = payload.event || payload.type || payload.alarm || payload.notification || 'evento';
  const device = payload.device?.name || payload.deviceName || payload.name || payload.device?.uniqueId || payload.deviceId || 'veiculo';
  const time = payload.eventTime || payload.deviceTime || payload.fixTime || payload.serverTime || new Date().toISOString();
  const address = payload.position?.address || payload.address || '';
  const speed = payload.position?.speed ?? payload.speed;
  const parts = [`${device}: ${event}`, `Horario: ${time}`];
  if (address) parts.push(`Local: ${address}`);
  if (speed !== undefined && speed !== null && speed !== '') parts.push(`Velocidade: ${speed}`);
  return parts.join('\n');
}

async function sendPushoverMessage({ title = 'RAFACAR RASTREADORES', message, priority = config.pushover.priority, url = config.publicAppUrl }) {
  if (!pushoverConfigured()) {
    const error = new Error('Pushover nao configurado. Defina PUSHOVER_APP_TOKEN e PUSHOVER_USER_KEY na Railway.');
    error.status = 503;
    throw error;
  }
  const body = new URLSearchParams({
    token: config.pushover.token,
    user: config.pushover.user,
    title: String(title).slice(0, 250),
    message: String(message || 'Teste RAFACAR').slice(0, 1024),
    priority: String(Number.isFinite(priority) ? priority : 0),
    sound: config.pushover.sound || 'pushover'
  });
  if (config.pushover.device) body.set('device', config.pushover.device);
  if (url) {
    body.set('url', url);
    body.set('url_title', 'Abrir RAFACAR');
  }
  const response = await fetch('https://api.pushover.net/1/messages.json', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = { raw: text }; }
  if (!response.ok || payload?.status === 0) {
    const error = new Error(payload?.errors?.join(', ') || payload?.raw || `Pushover retornou HTTP ${response.status}`);
    error.status = response.status || 502;
    error.payload = payload;
    throw error;
  }
  return payload;
}

function sanitizeAssistantContext(body = {}) {
  const question = clampText(body.question, 1200);
  const vehicles = Array.isArray(body.vehicles) ? body.vehicles.slice(0, 12) : [];
  const events = Array.isArray(body.events) ? body.events.slice(0, 20) : [];
  return { question, vehicles, events };
}

async function askGeminiAssistant(body = {}) {
  if (!geminiConfigured()) {
    const error = new Error('IA nao configurada.');
    error.status = 503;
    throw error;
  }
  const context = sanitizeAssistantContext(body);
  if (!context.question) {
    const error = new Error('Pergunta obrigatoria.');
    error.status = 400;
    throw error;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const prompt = [
      'Voce e o assistente operacional RAFACAR para rastreamento veicular.',
      'Responda em portugues do Brasil, direto e com foco em operacao de frota.',
      'Use somente os dados enviados no contexto. Se faltar dado, diga exatamente o que falta.',
      'Nao revele detalhes tecnicos de servidor, proxy, tokens, cookies ou credenciais.',
      '',
      JSON.stringify(context, null, 2)
    ].join('\n');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.gemini.model)}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': config.gemini.apiKey
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 900 }
      }),
      signal: controller.signal
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload?.error?.message || `IA retornou HTTP ${response.status}`);
      error.status = response.status || 502;
      throw error;
    }
    return String(payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n').trim() || '');
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Tempo esgotado ao consultar IA.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

app.disable('x-powered-by'); app.set('trust proxy', 1);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (isCorsAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-rafacar-webhook-secret');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});
const connectSrc = ["'self'", 'https://*.tile.openstreetmap.org', 'https://*.basemaps.cartocdn.com', 'https://server.arcgisonline.com'];
const imgSrc = ["'self'", 'data:', 'blob:', 'https:'];
const frameSrc = ["'self'"];
const mediaSrc = ["'self'", 'blob:'];
const mediaOrigin = mediaMtxOrigin();
if (mediaOrigin) {
  connectSrc.push(mediaOrigin);
  imgSrc.push(mediaOrigin);
  frameSrc.push(mediaOrigin);
  mediaSrc.push(mediaOrigin);
}
if (config.allowUnsafeGoogleTiles) connectSrc.push('https://mt0.google.com', 'https://mt1.google.com', 'https://mt2.google.com', 'https://mt3.google.com');
app.use(helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: { useDefaults: true, directives: { "default-src": ["'self'"], "connect-src": connectSrc, "img-src": imgSrc, "frame-src": frameSrc, "media-src": mediaSrc, "style-src": ["'self'", "'unsafe-inline'", 'https:'], "script-src": ["'self'"], "font-src": ["'self'", 'data:'], "object-src": ["'none'"], "base-uri": ["'self'"], "upgrade-insecure-requests": null } } }));
app.use(compression()); app.use(express.json({ limit: '512kb' })); app.use(express.urlencoded({ extended: false, limit: '512kb' })); app.use(morgan('combined'));
app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 240, standardHeaders: 'draft-8', legacyHeaders: false }));
const loginLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false, message: { ok: false, error: 'Muitas tentativas de login. Aguarde alguns minutos.' } });
const assistantLimiter = rateLimit({ windowMs: 60 * 1000, limit: 24, standardHeaders: 'draft-8', legacyHeaders: false, message: { ok: false, error: 'Muitas consultas de IA. Aguarde um momento.' } });

app.get('/api/health', (req, res) => { const session = getSession(req); res.set('Cache-Control', 'no-store'); res.json({ ok: true, service: 'rafacar-dev2', version: '6.1.0-monitoring-mediamtx', port: config.port, traccarUrl: config.traccarUrl, mediaMtxUrl: config.mediaMtxUrl, authMode: 'traccar-user-session', authenticated: Boolean(session), sessions: sessions.size, configExists: fs.existsSync(configFile), user: session?.user ? redact(session.user.email || session.user.name) : '' }); });
app.get('/api/config', (req, res) => { res.set('Cache-Control', 'no-store'); res.json({ ok: true, config: safePublicConfig(req) }); });
app.get('/api/mobile/status', requireAuth, (req, res) => { res.set('Cache-Control', 'no-store'); res.json({ ok: true, mobile: safePublicConfig(req).mobile }); });
app.post('/api/assistant/ask', requireAuth, assistantLimiter, async (req, res) => {
  try {
    const answer = await askGeminiAssistant(req.body || {});
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, answer });
  } catch (error) {
    res.status(error.status || 502).json({ ok: false, error: error.message || 'Falha ao consultar IA.' });
  }
});
app.get('/api/monitoring/cameras', requireAuth, (_req, res) => {
  const state = readMonitoringState();
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, mediaMtxUrl: config.mediaMtxUrl, cameras: state.cameras.map(publicCamera).filter((camera) => Number.isFinite(camera.deviceId) && camera.deviceId > 0) });
});
app.get('/api/monitoring/media/image', requireAuth, async (req, res) => {
  try {
    const targetUrl = mediaUrlFromPathOrUrl({ path: req.query.path, url: req.query.url });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(targetUrl, { signal: controller.signal, redirect: 'manual' });
      const type = response.headers.get('content-type') || '';
      if (!response.ok) return res.status(502).json({ ok: false, error: `MediaMTX retornou HTTP ${response.status}.` });
      if (!type.startsWith('image/')) return res.status(415).json({ ok: false, error: 'MediaMTX nao retornou imagem.' });
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length > 8 * 1024 * 1024) return res.status(413).json({ ok: false, error: 'Imagem maior que 8MB.' });
      res.set('Cache-Control', 'private, no-store');
      res.set('Content-Type', type);
      return res.send(buffer);
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    if (error.name === 'AbortError') return res.status(504).json({ ok: false, error: 'Tempo esgotado ao buscar imagem no MediaMTX.' });
    return res.status(error.status || 400).json({ ok: false, error: error.message || 'Falha ao buscar imagem no MediaMTX.' });
  }
});
app.post('/api/monitoring/cameras', requireAuth, (req, res) => {
  try {
    const state = readMonitoringState();
    const deviceId = Number(req.body?.deviceId);
    const existing = state.cameras.find((camera) => Number(camera.deviceId) === deviceId) || {};
    const nextCamera = cameraFromBody(req.body || {}, existing);
    const cameras = state.cameras.filter((camera) => Number(camera.deviceId) !== nextCamera.deviceId);
    cameras.push(nextCamera);
    cameras.sort((a, b) => Number(a.deviceId) - Number(b.deviceId));
    writeMonitoringState({ ...state, cameras });
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, camera: publicCamera(nextCamera), cameras: cameras.map(publicCamera) });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, error: error.message || 'Falha ao salvar camera.' });
  }
});
app.delete('/api/monitoring/cameras/:deviceId', requireAuth, (req, res) => {
  const state = readMonitoringState();
  const deviceId = Number(req.params.deviceId);
  const cameras = state.cameras.filter((camera) => Number(camera.deviceId) !== deviceId);
  writeMonitoringState({ ...state, cameras });
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, cameras: cameras.map(publicCamera) });
});
app.get('/api/monitoring/evidence', requireAuth, (_req, res) => {
  const state = readMonitoringState();
  const evidence = state.evidence.slice().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).map(publicEvidence);
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, evidence });
});
app.post('/api/monitoring/evidence', requireAuth, (req, res) => {
  try {
    const state = readMonitoringState();
    const record = evidenceFromBody(req.body || {}, req.rafacarSession?.user || {});
    const evidence = [record, ...state.evidence].slice(0, 1000);
    writeMonitoringState({ ...state, evidence });
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, evidence: publicEvidence(record) });
  } catch (error) {
    res.status(error.status || 400).json({ ok: false, error: error.message || 'Falha ao salvar evidencia.' });
  }
});
app.post('/api/monitoring/evidence/snapshot', requireAuth, async (req, res) => {
  try {
    const state = readMonitoringState();
    const record = await saveSnapshotEvidence(req.body || {}, req.rafacarSession?.user || {});
    const evidence = [record, ...state.evidence].slice(0, 1000);
    writeMonitoringState({ ...state, evidence });
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, evidence: publicEvidence(record) });
  } catch (error) {
    res.status(error.status || 502).json({ ok: false, error: error.message || 'Falha ao capturar snapshot.', details: error.payload || null });
  }
});
app.get('/api/monitoring/evidence/:id/image', requireAuth, (req, res) => {
  const state = readMonitoringState();
  const record = state.evidence.find((item) => String(item.id) === String(req.params.id));
  if (!record?.localFile) return res.status(404).json({ ok: false, error: 'Imagem de evidencia nao encontrada.' });
  const absolute = path.resolve(evidenceMediaDir, record.localFile);
  if (!absolute.startsWith(path.resolve(evidenceMediaDir))) return res.status(403).json({ ok: false, error: 'Arquivo bloqueado.' });
  if (!fs.existsSync(absolute)) return res.status(404).json({ ok: false, error: 'Arquivo de evidencia nao existe no disco.' });
  res.set('Cache-Control', 'private, no-store');
  res.sendFile(absolute);
});
app.delete('/api/monitoring/evidence/:id', requireAuth, (req, res) => {
  const state = readMonitoringState();
  const record = state.evidence.find((item) => String(item.id) === String(req.params.id));
  const evidence = state.evidence.filter((item) => String(item.id) !== String(req.params.id));
  if (record?.localFile) {
    const absolute = path.resolve(evidenceMediaDir, record.localFile);
    if (absolute.startsWith(path.resolve(evidenceMediaDir)) && fs.existsSync(absolute)) {
      try { fs.unlinkSync(absolute); } catch { /* ignore */ }
    }
  }
  writeMonitoringState({ ...state, evidence });
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, evidence: evidence.map(publicEvidence) });
});
app.post('/api/mobile/pushover/test', requireAuth, requireAdministrator, async (req, res) => {
  try {
    const user = req.rafacarSession?.user?.name || req.rafacarSession?.user?.email || 'admin';
    const payload = await sendPushoverMessage({ title: 'Teste RAFACAR', message: `Notificacao Pushover enviada pelo painel RAFACAR.\nUsuario: ${user}\nHorario: ${new Date().toISOString()}` });
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, result: { status: payload?.status || 1, request: payload?.request || null } });
  } catch (error) {
    res.status(error.status || 502).json({ ok: false, error: error.message || 'Falha ao enviar Pushover.', details: error.payload || null });
  }
});
app.post('/api/auth/login', loginLimiter, async (req, res) => { try { const body = req.body || {}; const login = String(body.email || body.user || body.username || '').trim(); const password = String(body.password || ''); if (!login || login.length > 180) return res.status(400).json({ ok: false, error: 'Usuário/e-mail inválido.' }); if (!password || password.length > 300) return res.status(400).json({ ok: false, error: 'Senha inválida.' }); const { remoteCookie, user } = await loginToTraccar(login, password); createLocalSession(req, res, remoteCookie, user); res.set('Cache-Control', 'no-store'); return res.json({ ok: true, user, config: safePublicConfig(req) }); } catch (error) { return res.status(error.status || 401).json({ ok: false, error: error.message || 'Login inválido no Traccar.' }); } });
app.post('/api/auth/logout', (req, res) => { destroyLocalSession(req, res); res.set('Cache-Control', 'no-store'); res.json({ ok: true }); });
app.get('/api/auth/me', requireAuth, async (req, res) => { try { const remoteUser = await traccarFetch(req, '/api/session'); req.rafacarSession.user = sanitizeUser(remoteUser, req.rafacarSession.user?.email || ''); res.set('Cache-Control', 'no-store'); res.json({ ok: true, authenticated: true, user: req.rafacarSession.user, config: safePublicConfig(req) }); } catch { destroyLocalSession(req, res); res.status(401).json({ ok: false, authenticated: false, error: 'Sessão expirada. Faça login novamente.' }); } });
app.get('/api/user/profile', requireAuth, async (req, res) => {
  try {
    const userId = Number(req.rafacarSession?.user?.id);
    if (!Number.isFinite(userId) || userId <= 0) return res.status(400).json({ ok: false, error: 'Usuario logado sem ID valido no Traccar.' });
    const profile = await traccarFetch(req, `/api/users/${userId}`);
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, user: profile });
  } catch (error) {
    res.status(error.status || 502).json({ ok: false, error: error.message || 'Falha ao carregar usuario logado.', details: error.payload || null });
  }
});
app.put('/api/user/profile', requireAuth, async (req, res) => {
  try {
    const userId = Number(req.rafacarSession?.user?.id);
    if (!Number.isFinite(userId) || userId <= 0) return res.status(400).json({ ok: false, error: 'Usuario logado sem ID valido no Traccar.' });
    const currentUser = await traccarFetch(req, `/api/users/${userId}`);
    const payload = sanitizeProfilePayload(req.body || {}, currentUser || {});
    const updated = await traccarFetch(req, `/api/users/${userId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    req.rafacarSession.user = sanitizeUser(updated || payload, req.rafacarSession.user?.email || '');
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, user: updated || payload });
  } catch (error) {
    res.status(error.status || 502).json({ ok: false, error: error.message || 'Falha ao atualizar usuario logado.', details: error.payload || null });
  }
});
app.get('/api/bootstrap', requireAuth, async (req, res) => { try { res.set('Cache-Control', 'no-store'); res.json(await buildSnapshot(req)); } catch (error) { res.status(error.status || 502).json({ ok: false, error: error.message || 'Falha ao carregar dados iniciais.' }); } });
app.get('/api/snapshot', requireAuth, async (req, res) => { try { res.set('Cache-Control', 'no-store'); res.json(await buildSnapshot(req)); } catch (error) { res.status(error.status || 502).json({ ok: false, error: error.message || 'Falha ao atualizar dados.' }); } });
app.get('/api/command-types', requireAuth, async (req, res) => { try { const deviceId = Number(req.query.deviceId); const query = Number.isFinite(deviceId) && deviceId > 0 ? `?deviceId=${deviceId}` : ''; const payload = await traccarFetch(req, `/api/commands/types${query}`); res.set('Cache-Control', 'no-store'); res.json(Array.isArray(payload) ? payload : []); } catch (error) { res.status(error.status || 502).json({ ok: false, error: error.message || 'Falha ao carregar comandos.' }); } });
app.post('/api/send-command', requireAuth, async (req, res) => { try { const body = req.body || {}; const deviceId = Number(body.deviceId); const type = String(body.type || '').trim(); if (!Number.isFinite(deviceId) || deviceId <= 0) return res.status(400).json({ ok: false, error: 'deviceId inválido.' }); if (!type || type.length > 80) return res.status(400).json({ ok: false, error: 'Tipo de comando inválido.' }); const attributes = body.attributes && typeof body.attributes === 'object' && !Array.isArray(body.attributes) ? body.attributes : {}; const command = { id: 0, deviceId, type, attributes }; const payload = await traccarFetch(req, '/api/commands/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(command) }); res.json({ ok: true, command: payload }); } catch (error) { res.status(error.status || 502).json({ ok: false, error: error.message || 'Falha ao enviar comando.', details: error.payload || null }); } });
app.all('/api/traccar/*', requireAuth, async (req, res) => { try { if (!allowedMethods.has(req.method)) return res.status(405).json({ ok: false, error: 'Método não permitido.' }); const rawPath = `/${req.params[0] || ''}`.replace(/\/+/g, '/'); const apiPath = rawPath.startsWith('/api/') ? rawPath : `/api${rawPath}`; if (!isAllowedEndpoint(apiPath)) return res.status(403).json({ ok: false, error: 'Endpoint nao autorizado.', apiPath }); const query = new URLSearchParams(req.query).toString(); const finalPath = query ? `${apiPath}?${query}` : apiPath; const hasBody = !['GET', 'HEAD'].includes(req.method); const payload = await traccarFetch(req, finalPath, { method: req.method, headers: hasBody ? { 'Content-Type': 'application/json' } : {}, body: hasBody ? JSON.stringify(req.body || {}) : undefined }); res.set('Cache-Control', 'no-store'); res.json(payload); } catch (error) { res.status(error.status || 502).json({ ok: false, error: error.message || 'Falha ao conectar ao Traccar.', details: error.payload || null }); } });
app.post('/api/webhooks/traccar/pushover', async (req, res) => {
  try {
    const providedSecret = String(req.get('x-rafacar-webhook-secret') || req.query.secret || '');
    if (config.traccarWebhookSecret && providedSecret !== config.traccarWebhookSecret) return res.status(401).json({ ok: false, error: 'Webhook nao autorizado.' });
    if (!config.traccarWebhookSecret) return res.status(503).json({ ok: false, error: 'Defina TRACCAR_WEBHOOK_SECRET antes de ativar o webhook.' });
    const payload = await sendPushoverMessage({ title: 'Alerta RAFACAR', message: formatWebhookMessage(req.body || {}) });
    res.json({ ok: true, result: { status: payload?.status || 1, request: payload?.request || null } });
  } catch (error) {
    res.status(error.status || 502).json({ ok: false, error: error.message || 'Falha ao processar webhook Pushover.', details: error.payload || null });
  }
});
app.use(express.static(distDir, { etag: true, maxAge: '1h', setHeaders(res, filePath) { if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-store'); } }));
app.get('*', (_req, res) => { res.sendFile(path.join(distDir, 'index.html')); });
app.use((error, _req, res, _next) => { console.error('[server]', error); res.status(500).json({ ok: false, error: 'Erro interno no RAFACAR RASTREADORES.' }); });
app.listen(config.port, '0.0.0.0', () => { console.log(`RAFACAR RASTREADORES rodando em 0.0.0.0:${config.port}`); console.log('Auth mode: credenciais Traccar por usuário com cookie HttpOnly'); });
