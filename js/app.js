/**
 * JVAS Wealth Management (JVAS11)
 * Orquestração de Estado, Gatekeeper de Autenticação, Expurgo de Sessão,
 * Auto-Lock por Inatividade (15m), Roteamento e Operações de Modais
 */

window.assets = [];
window.historico = [];
window.dolarOficial = 5.00;
window.dolarSimulado = null;
window.valuesHidden = true; // Modo Privacidade ("Olho Fechado") ativo por padrão
window.editingIdx = null;
window.sortCol = 'pesoMeta';
window.sortDir = -1;
window.theme = 'dark';
window.activePage = 'executiva';

let _inactivityTimer = null;
let _lastActivityReset = 0;

/**
 * Retorna a cotação USD/BRL ativa (Simulada em memória ou Oficial da planilha)
 */
function getEffectiveDolar() {
  if (window.dolarSimulado !== null && window.dolarSimulado !== undefined && window.dolarSimulado > 0) {
    return Number(window.dolarSimulado);
  }
  return Number(window.dolarOficial) > 0 ? Number(window.dolarOficial) : 5.0;
}

/**
 * REGRA CRÍTICA DE EXPURGO E BLOQUEIO DE SESSÃO
 * Remove token, remove caches do localStorage/sessionStorage, limpa variáveis em memória e limpa o DOM
 */
function lockSession(reasonMessage = null) {
  if (_inactivityTimer) {
    clearTimeout(_inactivityTimer);
    _inactivityTimer = null;
  }

  // a) e b) Expurga jvas_api_token e jvas_portfolio_cache de localStorage e sessionStorage
  purgeBrowserAuthAndCache();

  // c) Esvazia imediatamente variáveis em memória
  window.assets = [];
  window.historico = [];
  window.dolarSimulado = null;
  window.editingIdx = null;

  // Limpa HTML das tabelas e cards antes de exibir a Tela de Bloqueio
  purgeFinancialDOM();

  // Fecha todos os modais abertos
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
  closeMobileSidebar();

  // Oculta o app e o loading screen e exibe a Tela de Bloqueio Institucional
  const appEl = document.getElementById('app-container');
  const loadEl = document.getElementById('loading-screen');
  const lockEl = document.getElementById('lock-screen');
  const errEl = document.getElementById('auth-error-msg');
  const tokenInput = document.getElementById('auth-token-input');

  if (appEl) appEl.style.display = 'none';
  if (loadEl) loadEl.style.display = 'none';
  if (lockEl) lockEl.style.display = 'flex';
  if (tokenInput) tokenInput.value = '';

  if (errEl) {
    if (reasonMessage) {
      errEl.textContent = reasonMessage;
      errEl.style.display = 'flex';
    } else {
      errEl.textContent = '';
      errEl.style.display = 'none';
    }
  }
}

/**
 * Monitoramento de Inatividade (Auto-Lock de 15 minutos)
 */
function resetInactivityTimer() {
  if (!getAuthToken()) return;
  const now = Date.now();
  if (now - _lastActivityReset < 1000) return; // throttle 1s
  _lastActivityReset = now;

  if (_inactivityTimer) clearTimeout(_inactivityTimer);
  _inactivityTimer = setTimeout(() => {
    lockSession('Sessão bloqueada automaticamente após 15 minutos de inatividade.');
  }, SECURITY_CONFIG.AUTO_LOCK_MS);
}

function setupInactivityWatchers() {
  const events = ['mousemove', 'keydown', 'click', 'touchstart'];
  events.forEach(evt => {
    window.addEventListener(evt, resetInactivityTimer, { passive: true });
  });
}

/**
 * Gatekeeper: Autenticação na Tela de Bloqueio
 */
async function handleUnlockSubmit(event) {
  if (event) event.preventDefault();
  const input = document.getElementById('auth-token-input');
  const rememberCheck = document.getElementById('auth-remember-check');
  const errEl = document.getElementById('auth-error-msg');
  const submitBtn = document.getElementById('auth-submit-btn');

  const token = (input?.value || '').trim();
  if (!token) {
    if (errEl) {
      errEl.textContent = 'Informe sua Chave de Acesso (API_TOKEN) para desbloquear.';
      errEl.style.display = 'flex';
    }
    return;
  }

  const persist = rememberCheck ? rememberCheck.checked : true;
  setAuthToken(token, persist);

  if (errEl) errEl.style.display = 'none';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Verificando credencial...';
  }

  await loadDataFromSheets(true);

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Desbloquear Plataforma';
  }
}

function toggleAuthPasswordVisibility() {
  const input = document.getElementById('auth-token-input');
  const btn = document.getElementById('auth-eye-btn');
  if (!input || !btn) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.innerHTML = ICONS.eyeOpen;
  } else {
    input.type = 'password';
    btn.innerHTML = ICONS.eyeClosed;
  }
}

/**
 * Carrega dados do Google Sheets via GET autenticado
 */
async function loadDataFromSheets(fromLogin = false) {
  const token = getAuthToken();
  if (!token) {
    lockSession();
    return;
  }

  // Garantir que nenhum cache antigo persista
  try {
    localStorage.removeItem(STORAGE_KEYS.PORTFOLIO_CACHE);
    sessionStorage.removeItem(STORAGE_KEYS.PORTFOLIO_CACHE);
  } catch (e) {
    // ignore
  }

  const lockEl = document.getElementById('lock-screen');
  const loadEl = document.getElementById('loading-screen');
  const loadMsg = document.getElementById('loading-msg');
  const appEl = document.getElementById('app-container');

  if (!fromLogin) {
    if (lockEl) lockEl.style.display = 'none';
    if (loadEl) {
      loadEl.style.display = 'flex';
      loadEl.style.opacity = '1';
    }
    if (loadMsg) loadMsg.textContent = 'Autenticando e buscando cotações em tempo real...';
  }

  setSyncStatus('syncing');

  try {
    const data = await apiFetchPortfolio(token);
    window.assets = data.assets;
    window.historico = data.historico;
    window.dolarOficial = data.dolar;

    if (lockEl) lockEl.style.display = 'none';
    if (appEl) appEl.style.display = 'flex';

    if (loadEl) {
      loadEl.style.opacity = '0';
      setTimeout(() => {
        loadEl.style.display = 'none';
      }, 350);
    }

    setSyncStatus('online');
    resetInactivityTimer();
    refreshActiveView();
    if (fromLogin) {
      showToast('Sessão autenticada com sucesso.', 'success');
    }
  } catch (err) {
    if (err.code === 'UNAUTHORIZED') {
      // lockSession já foi acionado em apiFetchPortfolio
      return;
    }
    console.error('Erro ao carregar dados do Sheets:', err);
    setSyncStatus('offline');

    if (fromLogin) {
      const errEl = document.getElementById('auth-error-msg');
      if (errEl) {
        errEl.textContent = `Falha de conexão com o servidor: ${err.message || 'Verifique sua rede ou token.'}`;
        errEl.style.display = 'flex';
      }
      purgeBrowserAuthAndCache();
    } else {
      if (loadMsg) {
        loadMsg.textContent = 'Falha ao comunicar com Google Sheets. Verifique sua conexão.';
      }
      setTimeout(() => {
        if (loadEl) {
          loadEl.style.opacity = '0';
          setTimeout(() => { loadEl.style.display = 'none'; }, 350);
        }
        if (appEl) appEl.style.display = 'flex';
        refreshActiveView();
      }, 1500);
    }
  }
}

/**
 * Navegação entre as 4 Views e Controle de Sidebar
 */
function switchPage(pageId) {
  window.activePage = pageId;
  document.querySelectorAll('.page-view').forEach(p => {
    p.style.display = 'none';
  });
  document.querySelectorAll('.menu-item').forEach(m => {
    m.classList.remove('active');
  });

  const menuEl = document.getElementById(`menu-${pageId}`);
  const pageEl = document.getElementById(`page-${pageId}`);
  if (menuEl) menuEl.classList.add('active');
  if (pageEl) pageEl.style.display = 'flex';
  if (typeof updateTopbarTitle === 'function') updateTopbarTitle(pageId);
  const mainEl = document.querySelector('.main-content');
  if (mainEl) mainEl.scrollTo({ top: 0 });

  closeMobileSidebar();
  refreshActiveView();
}

function refreshActiveView() {
  updateDolarUI();
  updateMetaThermometerUI();
  if (window.activePage === 'executiva') renderExecutiva();
  else if (window.activePage === 'consolidada') renderTable();
  else if (window.activePage === 'aportes') renderAporteSuggestions();
  else if (window.activePage === 'historico') renderHistorico();
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (!sidebar) return;

  if (window.innerWidth <= 1024) {
    const isOpen = sidebar.classList.toggle('mobile-open');
    if (backdrop) backdrop.classList.toggle('show', isOpen);
  } else {
    sidebar.classList.toggle('collapsed');
  }
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (sidebar) sidebar.classList.remove('mobile-open');
  if (backdrop) backdrop.classList.remove('show');
}

/**
 * Alternância de Privacidade ("Olho Fechado") e Tema (Dark / Light)
 */
function toggleVisibility() {
  window.valuesHidden = !window.valuesHidden;
  updateVisibilityUI();
  refreshActiveView();
  showToast(window.valuesHidden ? 'Modo Privacidade ativado (valores ocultos)' : 'Valores visíveis', 'success');
}

function toggleTheme() {
  window.theme = window.theme === 'dark' ? 'light' : 'dark';
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, window.theme);
  } catch (e) {
    // ignore
  }
  updateThemeUI(window.theme);
}

/**
 * Ordenação da Tabela Consolidada
 */
function sortBy(col) {
  if (window.sortCol === col) {
    window.sortDir *= -1;
  } else {
    window.sortCol = col;
    window.sortDir = -1;
  }
  renderTable();
}

/**
 * Atualização Inline de Recomendação na Tabela Consolidada (updateField)
 */
function handleInlineAcaoChange(idx, selectEl) {
  const asset = window.assets[idx];
  if (!asset || !selectEl) return;
  const newVal = selectEl.value;
  asset.acao = newVal;
  selectEl.className = `acao-select ${getAcaoClass(newVal)}`;
  refreshActiveView();
  apiUpdateField(asset.ticker, 'acao', newVal).catch(() => {});
}

/**
 * Simulação Local de Câmbio USD/BRL (Nunca envia POST para a planilha)
 */
function openDolarModal() {
  const officialEl = document.getElementById('dolar-modal-oficial');
  const inputEl = document.getElementById('dolar-modal-input');
  if (officialEl) {
    officialEl.textContent = `R$ ${window.dolarOficial.toFixed(2).replace('.', ',')}`;
  }
  if (inputEl) {
    inputEl.value = getEffectiveDolar().toFixed(2);
  }
  document.getElementById('modal-dolar')?.classList.add('open');
}

function applySimulatedDolar() {
  const inputEl = document.getElementById('dolar-modal-input');
  const raw = String(inputEl?.value || '').replace(',', '.');
  const val = parseFloat(raw);
  if (!Number.isFinite(val) || val <= 0) {
    showToast('Informe uma cotação USD/BRL válida maior que zero.', 'error');
    return;
  }
  if (Math.abs(val - window.dolarOficial) < 0.001) {
    window.dolarSimulado = null;
    showToast('Câmbio oficial mantido.', 'info');
  } else {
    window.dolarSimulado = val;
    showToast(`Câmbio simulado localmente: R$ ${val.toFixed(2).replace('.', ',')}`, 'success');
  }
  closeModal('modal-dolar');
  refreshActiveView();
}

function resetOfficialDolar(event) {
  if (event) event.stopPropagation();
  window.dolarSimulado = null;
  closeModal('modal-dolar');
  refreshActiveView();
  showToast('Câmbio oficial da planilha restaurado.', 'success');
}

/**
 * Modal 1: Novo / Editar Ativo (com prévia da Soma de Metas em tempo real e envio atômico updateAsset)
 */
function openAddModal() {
  window.editingIdx = null;
  document.getElementById('modal-title').textContent = 'Novo Ativo';
  document.getElementById('modal-delete-btn').style.display = 'none';

  const tickerEl = document.getElementById('m-ticker');
  tickerEl.value = '';
  tickerEl.disabled = false;

  document.getElementById('m-empresa').value = '';
  document.getElementById('m-setor').value = '';
  document.getElementById('m-tipo').value = 'acao';
  document.getElementById('m-bloco').value = 'BR';
  document.getElementById('m-qtd').value = '0';
  document.getElementById('m-pm').value = '0';
  document.getElementById('m-peso').value = '0';
  document.getElementById('m-fundamentos').value = 'positivo';
  document.getElementById('m-acao').value = 'aportar';

  updateModalMetaPreview();
  document.getElementById('modal').classList.add('open');
}

function openEditModal(idx) {
  const a = window.assets[idx];
  if (!a) return;
  window.editingIdx = idx;

  document.getElementById('modal-title').textContent = `Editar Ativo: ${a.ticker}`;
  document.getElementById('modal-delete-btn').style.display = 'inline-flex';

  const tickerEl = document.getElementById('m-ticker');
  tickerEl.value = a.ticker;
  tickerEl.disabled = true;

  document.getElementById('m-empresa').value = a.empresa || '';
  document.getElementById('m-setor').value = a.setor || '';
  document.getElementById('m-tipo').value = String(a.tipo || 'acao').toLowerCase();
  document.getElementById('m-bloco').value = a.bloco || 'BR';
  document.getElementById('m-qtd').value = Number(a.qtd) || 0;
  document.getElementById('m-pm').value = Number(a.pm) || 0;
  document.getElementById('m-peso').value = Number(a.pesoMeta) || 0;
  document.getElementById('m-fundamentos').value = a.fundamentos || 'positivo';
  document.getElementById('m-acao').value = String(a.acao || 'manter').toLowerCase();

  updateModalMetaPreview();
  document.getElementById('modal').classList.add('open');
}

function updateModalMetaPreview() {
  const previewEl = document.getElementById('modal-meta-preview');
  if (!previewEl) return;

  const inputPeso = parseFloat(document.getElementById('m-peso')?.value) || 0;
  let somaOutras = 0;
  (window.assets || []).forEach((a, idx) => {
    if (window.editingIdx !== null && idx === window.editingIdx) return;
    somaOutras += (Number(a.pesoMeta) || 0);
  });

  const novaSoma = somaOutras + inputPeso;
  const diff = novaSoma - 100;
  const isOk = Math.abs(diff) <= 0.05;

  previewEl.className = `modal-meta-footer tabular-nums ${isOk ? 'ok' : diff < 0 ? 'warn' : 'danger'}`;
  const statusHint = isOk
    ? '(Fechado em 100%)'
    : diff < 0
      ? `(Faltam ${Math.abs(diff).toFixed(1).replace('.', ',')}%)`
      : `(Excede +${diff.toFixed(1).replace('.', ',')}%)`;

  previewEl.innerHTML = `Soma das Metas da Carteira após salvar: <strong>${novaSoma.toFixed(1).replace('.', ',')}%</strong> ${statusHint}`;
}

function saveModal() {
  const ticker = (document.getElementById('m-ticker')?.value || '').trim().toUpperCase();
  if (!ticker) {
    showToast('O campo Ticker é obrigatório.', 'error');
    return;
  }

  const tipo = document.getElementById('m-tipo').value;
  const bloco = document.getElementById('m-bloco').value;
  const isRF = tipo === 'renda_fixa' || bloco === 'Renda Fixa';
  const rawQtd = parseFloat(document.getElementById('m-qtd').value) || 0;

  const assetPayload = {
    ticker,
    empresa: (document.getElementById('m-empresa').value || '').trim(),
    setor: (document.getElementById('m-setor').value || '').trim(),
    tipo,
    bloco,
    qtd: isRF && rawQtd <= 0 ? 1 : rawQtd,
    pm: parseFloat(document.getElementById('m-pm').value) || 0,
    pesoMeta: parseFloat(document.getElementById('m-peso').value) || 0,
    acao: document.getElementById('m-acao').value,
    fundamentos: document.getElementById('m-fundamentos').value,
    preco: window.editingIdx !== null ? (Number(window.assets[window.editingIdx]?.preco) || 0) : 0
  };

  if (window.editingIdx !== null) {
    window.assets[window.editingIdx] = {
      ...window.assets[window.editingIdx],
      ...assetPayload
    };
    // Envio único e atômico via updateAsset
    apiUpdateAsset(assetPayload).catch(() => {});
    showToast(`Ativo ${ticker} atualizado.`, 'success');
  } else {
    if (window.assets.some(a => a.ticker === ticker)) {
      showToast(`O ativo ${ticker} já existe na carteira.`, 'error');
      return;
    }
    window.assets.push(assetPayload);
    apiAddAsset(assetPayload).catch(() => {});
    showToast(`Ativo ${ticker} adicionado à carteira.`, 'success');
  }

  closeModal('modal');
  refreshActiveView();
}

function deleteAsset() {
  if (window.editingIdx === null) return;
  const target = window.assets[window.editingIdx];
  if (!target) return;

  const tickerToDelete = target.ticker;
  window.assets.splice(window.editingIdx, 1);
  window.editingIdx = null;

  closeModal('modal');
  refreshActiveView();
  showToast(`Ativo ${tickerToDelete} removido.`, 'success');
  apiDeleteAsset(tickerToDelete).catch(() => {});
}

/**
 * Modal 2: Registrar Compra Executada (Suporta Renda Variável e Renda Fixa)
 */
function openAporteModal(preselectIdx = null, presetQtd = null, presetVal = null) {
  const sel = document.getElementById('aporte-asset');
  if (!sel) return;

  if (!window.assets || window.assets.length === 0) {
    showToast('Cadastre ao menos um ativo antes de registrar uma compra.', 'error');
    return;
  }

  sel.innerHTML = window.assets
    .map((a, i) => `<option value="${i}">${escapeHTML(a.ticker)} — ${escapeHTML(a.empresa || a.bloco)}</option>`)
    .join('');

  if (preselectIdx !== null && preselectIdx !== undefined && window.assets[preselectIdx]) {
    sel.value = String(preselectIdx);
  }

  handleAporteAssetChange(presetQtd, presetVal);
  document.getElementById('modal-aporte')?.classList.add('open');
}

function openQuickBuyFromSuggestion(idx, suggestedQtd, suggestedVal) {
  openAporteModal(idx, suggestedQtd, suggestedVal);
}

function handleAporteAssetChange(presetQtd = null, presetVal = null) {
  const sel = document.getElementById('aporte-asset');
  const a = window.assets[sel?.value];
  if (!a) return;

  const ehRF = isRendaFixa(a);
  const ehUSD = isUSD(a);
  const sym = ehUSD ? 'US$' : 'R$';

  const qtdFieldWrap = document.getElementById('field-aporte-qtd');
  const gridWrap = document.getElementById('aporte-inputs-grid');
  const labelPreco = document.getElementById('label-aporte-preco');
  const qtdInput = document.getElementById('aporte-qtd');
  const precoInput = document.getElementById('aporte-preco');

  if (ehRF) {
    if (qtdFieldWrap) qtdFieldWrap.style.display = 'none';
    if (gridWrap) gridWrap.style.gridTemplateColumns = '1fr';
    if (labelPreco) labelPreco.textContent = 'Valor do Aporte em Renda Fixa (R$)';
    if (qtdInput) qtdInput.value = '1';
    if (precoInput) {
      precoInput.value = presetVal !== null && presetVal !== undefined
        ? Number(presetVal).toFixed(2)
        : '1000.00';
    }
  } else {
    if (qtdFieldWrap) qtdFieldWrap.style.display = 'block';
    if (gridWrap) gridWrap.style.gridTemplateColumns = '1fr 1fr';
    if (labelPreco) labelPreco.textContent = `Preço Pago Unitário (${sym})`;
    if (qtdInput) {
      qtdInput.value = presetQtd !== null && presetQtd !== undefined ? String(presetQtd) : '1';
    }
    if (precoInput) {
      const defPrice = presetVal !== null && presetVal !== undefined ? presetVal : (Number(a.preco) || 0);
      precoInput.value = Number(defPrice).toFixed(2);
    }
  }

  calcTotalAporte();
}

function calcTotalAporte() {
  const sel = document.getElementById('aporte-asset');
  const a = window.assets[sel?.value];
  if (!a) return;

  const ehRF = isRendaFixa(a);
  const ehUSD = isUSD(a);
  const sym = ehUSD ? 'US$' : 'R$';

  const q = ehRF ? 1 : (parseFloat(document.getElementById('aporte-qtd')?.value) || 0);
  const p = parseFloat(document.getElementById('aporte-preco')?.value) || 0;
  const total = q * p;

  const totalEl = document.getElementById('aporte-total-display');
  const projEl = document.getElementById('aporte-pm-projected');

  if (totalEl) {
    totalEl.textContent = `${sym} ${fmtCurrency(total)}`;
  }

  if (projEl) {
    if (ehRF) {
      const novoSaldoRF = (Number(a.preco) || 0) + p;
      const novoPmRF = (Number(a.pm) || 0) + p;
      projEl.innerHTML = `Novo Saldo RF Projetado: <strong>R$ ${fmtCurrency(novoSaldoRF)}</strong> | Novo Custo: <strong>R$ ${fmtCurrency(novoPmRF)}</strong>`;
    } else {
      const oldQtd = Number(a.qtd) || 0;
      const oldPm = Number(a.pm) || 0;
      const novaQtd = oldQtd + q;
      const novoPm = novaQtd > 0
        ? ((oldQtd > 0 && oldPm > 0) ? ((oldQtd * oldPm) + (q * p)) / novaQtd : p)
        : 0;
      projEl.innerHTML = `Nova Posição: <strong>${fmtNumber(novaQtd)}</strong> cotas | Novo Preço Médio Projetado: <strong>${sym} ${fmtCurrency(novoPm)}</strong>`;
    }
  }
}

function executarAporte() {
  const sel = document.getElementById('aporte-asset');
  const a = window.assets[sel?.value];
  if (!a) return;

  const ehRF = isRendaFixa(a);
  const q = ehRF ? 1 : (parseFloat(document.getElementById('aporte-qtd')?.value) || 0);
  const p = parseFloat(document.getElementById('aporte-preco')?.value) || 0;

  if (q <= 0 || p <= 0) {
    showToast('Informe valores maiores que zero para confirmar a compra.', 'error');
    return;
  }

  let novaQtd = 1;
  let novoPm = 0;
  let valorAporteRF = 0;
  let novoSaldoRF = 0;

  if (ehRF) {
    valorAporteRF = p;
    novoSaldoRF = (Number(a.preco) || 0) + valorAporteRF;
    novoPm = (Number(a.pm) || 0) + valorAporteRF;
    novaQtd = 1;

    a.qtd = 1;
    a.preco = novoSaldoRF;
    a.pm = novoPm;
  } else {
    const oldQtd = Number(a.qtd) || 0;
    const oldPm = Number(a.pm) || 0;
    novaQtd = oldQtd + q;
    novoPm = (oldQtd > 0 && oldPm > 0)
      ? ((oldQtd * oldPm) + (q * p)) / novaQtd
      : p;

    a.qtd = novaQtd;
    a.pm = novoPm;
    a.preco = p;
  }

  // Adiciona registro ao histórico em memória imediatamente
  const now = new Date();
  window.historico.unshift({
    data: now.toISOString(),
    ticker: a.ticker,
    qtd: q,
    precoPago: p,
    total: q * p
  });

  closeModal('modal-aporte');
  refreshActiveView();
  showToast(`Compra de ${a.ticker} registrada com sucesso!`, 'success');

  apiRegisterBuy({
    ticker: a.ticker,
    tipo: a.tipo,
    qtdAdquirida: q,
    precoPago: p,
    novaQtd,
    novoPm,
    valorAporteRF,
    novoSaldoRF
  }).catch(() => {});
}

/**
 * Modal 3: Atualizar Saldo de Renda Fixa (updateRendaFixa)
 */
function openRendaFixaModal() {
  const rfList = (window.assets || [])
    .map((a, idx) => ({ ...a, _idx: idx }))
    .filter(a => isRendaFixa(a));

  if (rfList.length === 0) {
    showToast('Nenhum ativo de Renda Fixa encontrado na carteira.', 'error');
    return;
  }

  const sel = document.getElementById('rf-asset-select');
  if (sel) {
    sel.innerHTML = rfList
      .map(a => `<option value="${a._idx}">${escapeHTML(a.ticker)} — ${escapeHTML(a.empresa || 'Renda Fixa')}</option>`)
      .join('');
  }

  handleRFAssetChange();
  document.getElementById('modal-rf')?.classList.add('open');
}

function handleRFAssetChange() {
  const sel = document.getElementById('rf-asset-select');
  const idx = parseInt(sel?.value, 10);
  const a = window.assets[idx];
  if (!a) return;

  const saldoAtual = Number(a.preco) || 0;
  const custoAtual = Number(a.pm) || 0;

  const saldoInput = document.getElementById('rf-novo-saldo');
  const custoInput = document.getElementById('rf-novo-custo');

  if (saldoInput) saldoInput.value = saldoAtual.toFixed(2);
  if (custoInput) custoInput.value = custoAtual.toFixed(2);

  calcRFPreview();
}

function calcRFPreview() {
  const sel = document.getElementById('rf-asset-select');
  const idx = parseInt(sel?.value, 10);
  const a = window.assets[idx];
  if (!a) return;

  const saldoAtual = Number(a.preco) || 0;
  const custoAtual = Number(a.pm) || 0;
  const rendAtual = saldoAtual - custoAtual;
  const rendAtualPct = custoAtual > 0 ? (rendAtual / custoAtual) * 100 : 0;

  const novoSaldo = parseFloat(document.getElementById('rf-novo-saldo')?.value) || 0;
  const novoCusto = parseFloat(document.getElementById('rf-novo-custo')?.value) || 0;
  const novoRend = novoSaldo - novoCusto;
  const novoRendPct = novoCusto > 0 ? (novoRend / novoCusto) * 100 : 0;

  const curInfoEl = document.getElementById('rf-current-summary');
  if (curInfoEl) {
    curInfoEl.innerHTML = `
      <div><span>Saldo Registrado:</span> <strong class="tabular-nums">R$ ${fmtCurrency(saldoAtual)}</strong></div>
      <div><span>Custo Aportado:</span> <strong class="tabular-nums">R$ ${fmtCurrency(custoAtual)}</strong></div>
      <div><span>Rendimento Atual:</span> <strong class="tabular-nums" style="color:${rendAtual >= 0 ? 'var(--green)' : 'var(--red)'}">R$ ${fmtCurrency(rendAtual)} (${fmtPct(rendAtualPct)})</strong></div>
    `;
  }

  const prevEl = document.getElementById('rf-projected-yield');
  if (prevEl) {
    prevEl.innerHTML = `Rendimento Acumulado Atualizado: <strong class="tabular-nums" style="color:${novoRend >= 0 ? 'var(--green)' : 'var(--red)'}">R$ ${fmtCurrency(novoRend)} (${fmtPct(novoRendPct)})</strong>`;
  }
}

function salvarRendaFixaModal() {
  const sel = document.getElementById('rf-asset-select');
  const idx = parseInt(sel?.value, 10);
  const a = window.assets[idx];
  if (!a) return;

  const saldoAtual = parseFloat(document.getElementById('rf-novo-saldo')?.value) || 0;
  const custoTotal = parseFloat(document.getElementById('rf-novo-custo')?.value) || 0;

  if (saldoAtual < 0 || custoTotal < 0) {
    showToast('Os saldos de Renda Fixa não podem ser negativos.', 'error');
    return;
  }

  a.qtd = 1;
  a.preco = saldoAtual;
  a.pm = custoTotal;

  closeModal('modal-rf');
  refreshActiveView();
  showToast(`Saldo de ${a.ticker} atualizado com sucesso!`, 'success');

  apiUpdateRendaFixa(a.ticker, saldoAtual, custoTotal).catch(() => {});
}

/**
 * Fechamento de Modais
 */
function closeModal(id = 'modal') {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

/**
 * Inicialização Global da Aplicação
 */
window.addEventListener('DOMContentLoaded', () => {
  // Carrega tema salvo (ou Dark por padrão)
  try {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    if (savedTheme === 'light' || savedTheme === 'dark') {
      window.theme = savedTheme;
    }
  } catch (e) {
    // ignore
  }

  updateThemeUI(window.theme);
  updateVisibilityUI();
  setupInactivityWatchers();

  // Fecha modais ao clicar no backdrop externo
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal(overlay.id);
      }
    });
  });

  // Gatekeeper: Verifica se existe token no localStorage ao iniciar
  const storedToken = getAuthToken();
  if (!storedToken) {
    lockSession();
  } else {
    loadDataFromSheets(false);
  }
});


/**
 * Listeners puramente visuais (UI/UX): sombra da coluna fixa da tabela,
 * acessibilidade por teclado no menu e reset do drawer ao redimensionar.
 */
(function setupVisualListeners() {
  // Sombra lateral da 1ª coluna fixa somente quando há rolagem horizontal
  document.addEventListener('scroll', (e) => {
    const t = e.target;
    if (t && t.classList && t.classList.contains('table-wrap')) {
      t.classList.toggle('scrolled', t.scrollLeft > 2);
    }
  }, true);

  // Enter / Espaço ativam itens do menu lateral
  document.addEventListener('keydown', (e) => {
    const item = e.target && e.target.closest ? e.target.closest('.menu-item') : null;
    if (item && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      item.click();
    }
  });

  // Esc fecha o drawer mobile
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMobileSidebar();
  });

  // Ao sair do modo mobile, garante que o drawer/backdrop sejam resetados
  let _lastDesktop = window.innerWidth > 1024;
  window.addEventListener('resize', () => {
    const isDesktop = window.innerWidth > 1024;
    if (isDesktop && !_lastDesktop) closeMobileSidebar();
    _lastDesktop = isDesktop;
  }, { passive: true });
})();