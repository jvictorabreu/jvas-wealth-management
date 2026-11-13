/**
 * JVAS Wealth Management (JVAS11)
 * Módulo de Configuração, Constantes Visuais, Ícones SVG e Gestão Segura de Sessão
 */

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbznnwRBPKjW1iHzTKrV9c3qVEOhGuGDM6W4uzE4_TlhO5bN01EoF_0IVueHQwquWmqQhA/exec';

const STORAGE_KEYS = Object.freeze({
  API_TOKEN: 'jvas_api_token',
  PORTFOLIO_CACHE: 'jvas_portfolio_cache',
  THEME: 'jvas_theme'
});

const SECURITY_CONFIG = Object.freeze({
  AUTO_LOCK_MINUTES: 15,
  AUTO_LOCK_MS: 15 * 60 * 1000
});

const TIPO_META = Object.freeze({
  acao:       { label: 'Ação',       color: '#3B82F6', bgDark: 'rgba(59, 130, 246, 0.14)', bgLight: '#DBEAFE' },
  fii:        { label: 'FII',        color: '#8B5CF6', bgDark: 'rgba(139, 92, 246, 0.14)', bgLight: '#EDE9FE' },
  etf:        { label: 'ETF',        color: '#10B981', bgDark: 'rgba(16, 185, 129, 0.14)', bgLight: '#D1FAE5' },
  stock:      { label: 'Stock',      color: '#F59E0B', bgDark: 'rgba(245, 158, 11, 0.14)', bgLight: '#FEF3C7' },
  bdr:        { label: 'BDR',        color: '#F97316', bgDark: 'rgba(249, 115, 22, 0.14)', bgLight: '#FFEDD5' },
  renda_fixa: { label: 'Renda Fixa', color: '#14B8A6', bgDark: 'rgba(20, 184, 166, 0.14)', bgLight: '#CCFBF1' }
});

const BLOCO_META = Object.freeze({
  'Internacional': { label: 'Internacional', color: '#8B5CF6' },
  'Renda Fixa':    { label: 'Renda Fixa',    color: '#14B8A6' },
  'BR':            { label: 'Nacional (BR)', color: '#3B82F6' },
  'FII':           { label: 'Fundos Imob.',  color: '#EC4899' },
  'BDR':           { label: 'BDR',           color: '#F97316' },
  'ETF':           { label: 'ETF',           color: '#10B981' }
});

const BLOCO_ORDER = ['Internacional', 'Renda Fixa', 'BR', 'FII', 'BDR', 'ETF'];
const TIPO_ORDER = ['etf', 'renda_fixa', 'acao', 'stock', 'fii', 'bdr'];

const ACAO_OPTIONS = Object.freeze([
  { value: 'aportar',     label: 'Aportar',     cssClass: 'acao-aportar' },
  { value: 'não aportar', label: 'Não Aportar', cssClass: 'acao-nao-aportar' },
  { value: 'manter',      label: 'Manter',      cssClass: 'acao-manter' },
  { value: 'vender',      label: 'Vender',      cssClass: 'acao-vender' },
  { value: 'zerar',       label: 'Zerar',       cssClass: 'acao-zerar' }
]);

const ICONS = Object.freeze({
  wallet: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>`,
  globe: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>`,
  shield: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  candlestick: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2v20M18 2v20M12 5v14"/><rect x="4" y="6" width="4" height="12" rx="1" fill="currentColor" fill-opacity="0.2"/><rect x="16" y="8" width="4" height="10" rx="1" fill="currentColor" fill-opacity="0.2"/><rect x="10" y="9" width="4" height="5" rx="1" fill="currentColor" fill-opacity="0.2"/></svg>`,
  chart: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  currency: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  compass: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`,
  award: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>`,
  target: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  alertTriangle: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  checkCircle: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  layers: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
  scale: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>`,
  flame: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
  eyeOpen: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  eyeClosed: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
  sun: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  moon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  edit: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  lock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  plus: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  refresh: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
  clock: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  bolt: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  sortNeutral: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>`,
  sortAsc: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m18 15-6-6-6 6"/></svg>`,
  sortDesc: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>`
});

/**
 * Sanitização Anti-XSS obrigatória antes de interpolar dados externos em innerHTML
 * @param {any} str
 * @returns {string}
 */
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Gestão de Sessão / Token (em memória + localStorage opcional)
 */
let _sessionTokenMemory = null;

function getAuthToken() {
  if (_sessionTokenMemory) return _sessionTokenMemory;
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.API_TOKEN);
    if (stored && stored.trim()) {
      _sessionTokenMemory = stored.trim();
      return _sessionTokenMemory;
    }
  } catch (e) {
    console.warn('Acesso ao localStorage restrito:', e);
  }
  return null;
}

function setAuthToken(token, persist = true) {
  const clean = String(token || '').trim();
  _sessionTokenMemory = clean || null;
  try {
    if (clean && persist) {
      localStorage.setItem(STORAGE_KEYS.API_TOKEN, clean);
    } else {
      localStorage.removeItem(STORAGE_KEYS.API_TOKEN);
    }
  } catch (e) {
    console.warn('Não foi possível gravar token no localStorage:', e);
  }
}

/**
 * Expurgo total de credenciais e caches financeiros do navegador
 */
function purgeBrowserAuthAndCache() {
  _sessionTokenMemory = null;
  try {
    localStorage.removeItem(STORAGE_KEYS.API_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.PORTFOLIO_CACHE);
  } catch (e) {
    // ignore storage errors
  }
  try {
    sessionStorage.removeItem(STORAGE_KEYS.API_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.PORTFOLIO_CACHE);
  } catch (e) {
    // ignore storage errors
  }
}

function getTipoMeta(tipo) {
  const key = String(tipo || '').trim().toLowerCase();
  return TIPO_META[key] || { label: tipo || 'Outro', color: '#6B7280', bgDark: 'rgba(107, 114, 128, 0.14)', bgLight: '#F3F4F6' };
}

function getBlocoMeta(bloco) {
  const key = String(bloco || '').trim();
  return BLOCO_META[key] || { label: key || 'Outros', color: '#6B7280' };
}

function getAcaoClass(acao) {
  const norm = String(acao || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (norm.includes('nao') || norm === 'nao_aportar') return 'acao-nao-aportar';
  if (norm === 'aportar') return 'acao-aportar';
  if (norm === 'vender') return 'acao-vender';
  if (norm === 'zerar') return 'acao-zerar';
  return 'acao-manter';
}
