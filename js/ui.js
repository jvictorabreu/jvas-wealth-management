/**
 * JVAS Wealth Management (JVAS11)
 * Módulo de Interface (UI): Formatação com Modo Privacidade Real, Sanitização Anti-XSS,
 * Gráficos SVG Vetoriais, Tabelas, Cards Executivos, Ranking e Modais
 */

/**
 * Formata valor monetário respeitando o Modo Privacidade Real ("Olho Fechado")
 * @param {number} v
 * @returns {string}
 */
function fmtCurrency(v) {
  if (window.valuesHidden) return '••••';
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';
  return Number(v).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Formata quantidade/volume respeitando o Modo Privacidade Real ('••')
 * @param {number} v
 * @returns {string}
 */
function fmtNumber(v) {
  if (window.valuesHidden) return '••';
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';
  return Number(v).toLocaleString('pt-BR', {
    maximumFractionDigits: 4
  });
}

/**
 * Formata percentual com sinal opcional
 * @param {number} v
 * @param {boolean} [showSign=true]
 * @param {number} [decimals=2]
 * @returns {string}
 */
function fmtPct(v, showSign = true, decimals = 2) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';
  const num = Number(v);
  const sign = showSign && num > 0 ? '+' : '';
  return `${sign}${num.toFixed(decimals).replace('.', ',')}%`;
}

/**
 * Formata data/hora para dd/mm/aaaa hh:mm
 * @param {string|Date} raw
 * @returns {string}
 */
function fmtDateTime(raw) {
  if (!raw) return '—';
  const str = String(raw).trim();
  // Se já estiver no formato dd/mm/aaaa...
  if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) {
    return escapeHTML(str);
  }
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) {
    return escapeHTML(str);
  }
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Atualiza o estado visual de Sincronização na Topbar
 */
function setSyncStatus(status, customLabel = null) {
  const el = document.getElementById('sync-status');
  const txt = document.getElementById('sync-text');
  if (!el || !txt) return;

  el.className = `sync-status ${status}`;
  if (customLabel) {
    txt.textContent = customLabel;
    return;
  }
  if (status === 'syncing') txt.textContent = 'Sincronizando...';
  else if (status === 'online') txt.textContent = 'Salvo no Sheets';
  else if (status === 'offline') txt.textContent = 'Offline';
}

/**
 * Exibe notificação Toast flutuante
 */
let _toastTimer = null;
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `toast ${type} show`;
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => {
    t.classList.remove('show');
  }, 3400);
}

/**
 * Atualiza botão e classes do Modo Privacidade ("Olho Fechado")
 */
function updateVisibilityUI() {
  document.body.classList.toggle('values-hidden', Boolean(window.valuesHidden));
  const btn = document.getElementById('visibility-btn');
  if (!btn) return;
  if (window.valuesHidden) {
    btn.innerHTML = ICONS.eyeClosed;
    btn.classList.add('privacy-active');
    btn.setAttribute('data-tooltip', 'Valores ocultos — clique para exibir');
    btn.setAttribute('aria-pressed', 'true');
  } else {
    btn.innerHTML = ICONS.eyeOpen;
    btn.classList.remove('privacy-active');
    btn.setAttribute('data-tooltip', 'Valores visíveis — clique para ocultar');
    btn.setAttribute('aria-pressed', 'false');
  }
}

/**
 * Atualiza botão e atributo de Tema (Dark / Light)
 */
function updateThemeUI(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-btn');
  if (!btn) return;
  if (theme === 'dark') {
    btn.innerHTML = ICONS.sun;
    btn.setAttribute('data-tooltip', 'Mudar para tema Light');
  } else {
    btn.innerHTML = ICONS.moon;
    btn.setAttribute('data-tooltip', 'Mudar para tema Dark');
  }
}

/**
 * Atualiza o breadcrumb/título dinâmico da página ativa na Topbar (apenas visual)
 */
const PAGE_TITLES = {
  executiva: 'Visão Executiva',
  consolidada: 'Carteira Consolidada',
  aportes: 'Sugestão de Aporte',
  historico: 'Histórico de Aportes'
};
function updateTopbarTitle(pageId) {
  const el = document.getElementById('topbar-page-title');
  if (el) el.textContent = PAGE_TITLES[pageId] || 'Dashboard';
}

/**
 * Atualiza o Badge de Câmbio USD/BRL na Topbar (Oficial vs. Simulado em memória)
 */
function updateDolarUI() {
  const rate = getEffectiveDolar();
  const isSimulated = window.dolarSimulado !== null && window.dolarSimulado !== undefined;
  const displayEl = document.getElementById('dolar-display');
  const simBadge = document.getElementById('dolar-sim-badge');
  const resetBtn = document.getElementById('dolar-reset-inline');

  if (displayEl) {
    displayEl.textContent = window.valuesHidden
      ? '••,••'
      : rate.toFixed(2).replace('.', ',');
  }
  if (simBadge) {
    simBadge.style.display = isSimulated ? 'inline-flex' : 'none';
  }
  if (resetBtn) {
    resetBtn.style.display = isSimulated ? 'inline-flex' : 'none';
  }
}

/**
 * Atualiza o Termômetro de Metas (Soma PesoMeta%) na Topbar
 */
function updateMetaThermometerUI() {
  const badge = document.getElementById('badge-metas');
  if (!badge) return;
  const soma = calcSomaMetas(window.assets || []);
  const diff = soma - 100;
  const absDiff = Math.abs(diff);

  badge.classList.remove('meta-ok', 'meta-warn', 'meta-danger');

  if (absDiff <= 0.05) {
    badge.classList.add('meta-ok');
    badge.innerHTML = `${ICONS.target} <span>Metas: <strong class="tabular-nums">${soma.toFixed(1).replace('.', ',')}%</strong></span>`;
    badge.title = 'Soma das metas perfeitamente balanceada em 100%.';
  } else if (diff < 0) {
    badge.classList.add('meta-warn');
    const falta = Math.abs(diff).toFixed(1).replace('.', ',');
    badge.innerHTML = `${ICONS.alertTriangle} <span>Metas: <strong class="tabular-nums">${soma.toFixed(1).replace('.', ',')}%</strong> <small class="tabular-nums">(-${falta}%)</small></span>`;
    badge.title = `Faltam ${falta}% para fechar 100% da carteira.`;
  } else {
    badge.classList.add('meta-danger');
    const sobra = diff.toFixed(1).replace('.', ',');
    badge.innerHTML = `${ICONS.alertTriangle} <span>Metas: <strong class="tabular-nums">${soma.toFixed(1).replace('.', ',')}%</strong> <small class="tabular-nums">(+${sobra}%)</small></span>`;
    badge.title = `As metas excedem 100% em +${sobra}%. Ajuste os pesos.`;
  }
}

/**
 * Constrói Gráfico Donut SVG Interativo (viewBox 220x220, perfeitamente centralizado)
 * Cada fatia recebe data-donut-idx para sincronizar hover/touch com a legenda (matriz).
 * @param {Array<{label: string, color: string, atualPct: number, valorBRL: number}>} items
 * @param {number} totalBRL
 * @param {string} subtitle
 * @returns {string}
 */
function buildDonutSVG(items, totalBRL, subtitle = 'PATRIMÔNIO') {
  const CX = 110;
  const radius = 80;
  const strokeW = 20;
  const circumference = 2 * Math.PI * radius;
  const all = items || [];
  const activeItems = all
    .map((item, i) => ({ ...item, _i: i }))
    .filter(i => i.atualPct > 0);

  if (activeItems.length === 0 || totalBRL <= 0) {
    return `
      <div class="donut-chart-box">
        <svg viewBox="0 0 220 220" class="donut-svg" role="img" aria-label="Sem saldo">
          <circle class="donut-track" cx="${CX}" cy="${CX}" r="${radius}" fill="none" stroke-width="${strokeW}"></circle>
        </svg>
        <div class="donut-center">
          <span class="donut-center-val tabular-nums">0%</span>
          <span class="donut-center-top">Sem Saldo</span>
        </div>
      </div>
    `;
  }

  const gapLen = activeItems.length > 1 ? 1.6 : 0;
  let accumulatedPct = 0;
  const segments = activeItems.map(item => {
    const pct = clamp(item.atualPct, 0, 100);
    const rawDash = (pct / 100) * circumference;
    const dash = Math.max(rawDash - gapLen, 0.5);
    const offset = -((accumulatedPct / 100) * circumference);
    accumulatedPct += pct;

    const pctTxt = `${item.atualPct.toFixed(1).replace('.', ',')}%`;
    return `<circle
      class="donut-slice"
      data-donut-idx="${item._i}"
      data-label="${escapeHTML(item.label)}"
      data-val="R$ ${escapeHTML(fmtCurrency(item.valorBRL))}"
      data-pct="${pctTxt}"
      data-color="${escapeHTML(item.color)}"
      style="--slice-color:${item.color}"
      tabindex="0"
      role="img"
      aria-label="${escapeHTML(item.label)}: ${pctTxt}"
      cx="${CX}" cy="${CX}" r="${radius}"
      fill="none"
      stroke="${item.color}"
      stroke-width="${strokeW}"
      stroke-dasharray="${dash.toFixed(2)} ${(circumference - dash).toFixed(2)}"
      stroke-dashoffset="${offset.toFixed(2)}"
      transform="rotate(-90 ${CX} ${CX})"
    ></circle>`;
  }).join('');

  const totalTxt = `R$ ${escapeHTML(fmtCurrency(totalBRL))}`;
  return `
    <div class="donut-chart-box">
      <svg viewBox="0 0 220 220" class="donut-svg">
        <circle class="donut-track" cx="${CX}" cy="${CX}" r="${radius}" fill="none" stroke-width="${strokeW}"></circle>
        ${segments}
      </svg>
      <div class="donut-center" data-def-top="Total" data-def-val="${totalTxt}" data-def-sub="${escapeHTML(subtitle)}">
        <span class="donut-center-top" data-role="top">Total</span>
        <span class="donut-center-val tabular-nums" data-role="val">${totalTxt}</span>
        <span class="donut-center-sub" data-role="sub" style="font-size:10px;font-weight:700;letter-spacing:.6px;font-family:inherit">${escapeHTML(subtitle)}</span>
      </div>
    </div>
  `;
}

/**
 * Sincronização Hover / Touch / Foco entre fatias do Donut e linhas da matriz (delegação global).
 * Puramente visual: lê data-attributes já renderizados, sem tocar em dados de negócio.
 */
function initDonutInteractions() {
  if (window.__donutInit) return;
  window.__donutInit = true;

  const rootOf = el => el.closest('[data-donut-root]');

  const reset = root => {
    if (!root) return;
    root.classList.remove('has-active');
    root.querySelectorAll('.is-active').forEach(n => n.classList.remove('is-active'));
    const c = root.querySelector('.donut-center[data-def-top]');
    if (!c) return;
    const top = c.querySelector('[data-role="top"]');
    const val = c.querySelector('[data-role="val"]');
    const sub = c.querySelector('[data-role="sub"]');
    if (top) top.textContent = c.dataset.defTop;
    if (val) val.textContent = c.dataset.defVal;
    if (sub) {
      sub.textContent = c.dataset.defSub;
      sub.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:.6px;font-family:inherit';
    }
  };

  const activate = (root, idx) => {
    if (!root) return;
    const slice = root.querySelector(`.donut-slice[data-donut-idx="${idx}"]`);
    root.querySelectorAll('.is-active').forEach(n => n.classList.remove('is-active'));
    root.querySelectorAll(`[data-donut-idx="${idx}"]`).forEach(n => n.classList.add('is-active'));
    if (!slice) return; // item sem fatia (0%): apenas realça a linha
    root.classList.add('has-active');
    const c = root.querySelector('.donut-center[data-def-top]');
    if (!c) return;
    const top = c.querySelector('[data-role="top"]');
    const val = c.querySelector('[data-role="val"]');
    const sub = c.querySelector('[data-role="sub"]');
    if (top) top.textContent = slice.dataset.label;
    if (val) val.textContent = slice.dataset.val;
    if (sub) {
      sub.textContent = slice.dataset.pct;
      sub.style.cssText = `color:${slice.dataset.color}`;
    }
  };

  document.addEventListener('mouseover', e => {
    const t = e.target.closest && e.target.closest('[data-donut-idx]');
    if (!t) return;
    const root = rootOf(t);
    if (root) activate(root, t.dataset.donutIdx);
  });
  document.addEventListener('mouseout', e => {
    const t = e.target.closest && e.target.closest('[data-donut-idx]');
    if (!t) return;
    const root = rootOf(t);
    const next = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest('[data-donut-idx]') : null;
    if (next && root && root.contains(next)) return;
    reset(root);
  });
  document.addEventListener('focusin', e => {
    const t = e.target.closest && e.target.closest('[data-donut-idx]');
    if (t) activate(rootOf(t), t.dataset.donutIdx);
  });
  document.addEventListener('focusout', e => {
    const t = e.target.closest && e.target.closest('[data-donut-idx]');
    if (t) reset(rootOf(t));
  });
  // Touch: toque seleciona; toque fora limpa
  document.addEventListener('touchstart', e => {
    const t = e.target.closest && e.target.closest('[data-donut-idx]');
    document.querySelectorAll('[data-donut-root].has-active').forEach(r => {
      if (!t || rootOf(t) !== r) reset(r);
    });
    if (t) activate(rootOf(t), t.dataset.donutIdx);
  }, { passive: true });
}

/**
 * Renderiza a Tela 1: Visão Executiva Completa (8 KPIs + IQC + Matriz Macro)
 */
function renderExecutiva() {
  const rate = getEffectiveDolar();
  const list = window.assets || [];
  updateDolarUI();
  updateMetaThermometerUI();

  renderExecutiveKPIsGrid(list, rate);
  renderIQC(list, rate);
  renderDistribution(list, rate);
}

/**
 * Dicionário institucional de documentação dos KPIs (Popover Explicativo Flutuante)
 */
const KPI_INFO_DOCS = {
  exec_patrimonio_total: {
    title: 'Patrimônio Base Total',
    meaning: 'Valor consolidado de mercado de todos os ativos da carteira na moeda base (R$).',
    interpret: 'Representa seu patrimônio líquido investido. Compare com o Custo Investido para avaliar a geração de riqueza acumulada.',
    formula: 'Σ (Qtd × Preço Atual), convertendo ativos Internacionais pelo câmbio USD/BRL'
  },
  exec_patrimonio_intl: {
    title: 'Patrimônio Internacional',
    meaning: 'Parcela do patrimônio custodiada diretamente no exterior (Stocks e ETFs em US$).',
    interpret: 'Protege o portfólio contra risco-país e desvalorização do Real. O IQC bonifica exposições globais próximas ou acima de 30%–43%.',
    formula: 'Σ (Qtd × Preço Atual em US$) dos ativos do bloco Internacional'
  },
  exec_renda_fixa: {
    title: 'Renda Fixa / Liquidez',
    meaning: 'Saldo atualizado nos títulos e reservas de Renda Fixa / Liquidez em Reais.',
    interpret: 'Funciona como colchão de liquidez, amortecedor de volatilidade e caixa estratégico para oportunidades.',
    formula: 'Σ Saldo Atual (R$) dos ativos classificados como Renda Fixa'
  },
  exec_renda_variavel: {
    title: 'Renda Variável Total',
    meaning: 'Soma de todos os ativos de risco (Ações BR, FIIs, BDRs, ETFs e Stocks) convertidos para R$.',
    interpret: 'Motor de crescimento real do patrimônio no longo prazo. Monitore sua participação percentual frente à sua tolerância a risco.',
    formula: 'Patrimônio Base Total (R$) − Renda Fixa / Liquidez (R$)'
  },
  exec_pl_aberto: {
    title: 'P/L Aberto Consolidado',
    meaning: 'Lucro ou prejuízo latente (não realizado) sobre os ativos em carteira que possuem Custo Médio cadastrado.',
    interpret: 'Valores positivos indicam valorização acima do preço médio de aquisição; valores negativos sinalizam desconto frente ao custo.',
    formula: 'Σ (Valor Atual BRL − Custo Total BRL) para ativos com PM > 0; % = (P/L ÷ Custo) × 100'
  },
  exec_exposicao_cambial: {
    title: 'Exposição Cambial',
    meaning: 'Proporção da carteira atrelada a moedas fortes (Dolarização Direta no exterior + Indireta via BDR/ETF na B3) vs. economia doméstica (BRL).',
    interpret: 'Mostra o grau real de blindagem cambial do patrimônio total além da simples custódia internacional.',
    formula: '((Internacional BRL + BDRs BRL + ETFs B3 BRL) ÷ Patrimônio Total BRL) × 100'
  },
  exec_saude_estrategica: {
    title: 'Saúde Estratégica',
    meaning: 'Percentual do capital alocado em ativos que fazem parte do plano alvo (Meta > 0%) vs. posições legadas/em transição.',
    interpret: 'Quanto mais próximo de 100% no Plano, mais limpa e alinhada à sua tese atual está a carteira.',
    formula: '(Σ Valor BRL dos ativos com Peso Meta > 0% ÷ Patrimônio Total BRL) × 100'
  },
  exec_destaques: {
    title: 'Destaques da Carteira',
    meaning: 'Resumo tático das 3 posições extremas: maior peso individual, maior valorização sobre o PM e maior defasagem de aporte.',
    interpret: 'Ajuda a identificar rapidamente risco de concentração excessiva (Top 1) e a principal prioridade de compra (Maior Gap).',
    formula: 'Máx(Peso Real %), Máx((Preço − PM) ÷ PM %) e Máx(Meta % − Atual %)'
  },
  cons_patrimonio_filtrado: {
    title: 'Patrimônio Filtrado',
    meaning: 'Soma financeira em R$ considerando exclusivamente os ativos visíveis no filtro atual da tabela.',
    interpret: 'Permite dimensionar o tamanho exato de um bloco, classe ou setor específico selecionado nos filtros.',
    formula: 'Σ (Qtd × Preço Atual convertido p/ R$) dos ativos filtrados'
  },
  cons_patrimonio_intl: {
    title: 'Patrimônio Internacional (Filtro)',
    meaning: 'Volume financeiro em US$ dos ativos internacionais presentes no recorte atual dos filtros.',
    interpret: 'Indica o peso dolarizado direto dentro da seleção ativa.',
    formula: 'Σ (Qtd × Preço em US$) dos ativos Internacionais filtrados'
  },
  cons_renda_fixa: {
    title: 'Renda Fixa Filtrada',
    meaning: 'Total acumulado em Renda Fixa dentro do subconjunto filtrado da tabela.',
    interpret: 'Exibe a representatividade de caixa/liquidez no recorte selecionado.',
    formula: 'Σ Saldo Atual (R$) dos ativos de Renda Fixa filtrados'
  },
  cons_renda_variavel: {
    title: 'Renda Variável Filtrada',
    meaning: 'Valor de mercado em R$ das posições de renda variável contidas no filtro ativo.',
    interpret: 'Acompanhe a rentabilidade média sobre o custo do grupo filtrado.',
    formula: 'Σ Valor BRL dos ativos de Renda Variável filtrados'
  },
  cons_pl_aberto: {
    title: 'P/L Aberto Filtrado',
    meaning: 'Resultado financeiro não realizado (lucro/prejuízo) apenas dos ativos exibidos na tabela filtrada.',
    interpret: 'Avalia se o grupo ou setor filtrado está gerando ganho de capital acima do custo médio.',
    formula: 'Σ (Valor Atual BRL − Custo BRL) dos ativos filtrados com PM > 0'
  },
  sim_total_planejado: {
    title: 'Total Planejado',
    meaning: 'Montante financeiro total disponibilizado pelo investidor para a simulação de aporte.',
    interpret: 'Serve como teto orçamentário que o algoritmo distribuirá proporcionalmente aos scores dos ativos.',
    formula: 'Valor do Aporte informado (convertido pelo câmbio ativo USD/BRL)'
  },
  sim_efetivamente_alocado: {
    title: 'Efetivamente Alocado',
    meaning: 'Soma financeira real que será executada após o arredondamento para lotes inteiros de cotas.',
    interpret: 'Quanto mais próximo de 100% de aproveitamento, menor o dinheiro ocioso deixado na corretora.',
    formula: 'Σ (Cotas Inteiras Sugeridas × Preço Atual) convertidos para R$'
  },
  sim_troco_residual: {
    title: 'Troco Total Residual',
    meaning: 'Fração financeira do aporte que sobra por não ser suficiente para adquirir 1 cota inteira adicional.',
    interpret: 'Valores elevados ocorrem quando os ativos selecionados possuem preço unitário alto frente ao aporte.',
    formula: 'Total Planejado (R$) − Efetivamente Alocado (R$)'
  },
  sim_novo_iqc: {
    title: 'Novo IQC Pós-Aporte',
    meaning: 'Projeção simulada do Índice de Qualidade da Carteira (0 a 100) caso as compras sugeridas sejam executadas.',
    interpret: 'Um delta positivo (+pts) confirma que o aporte reduz desvios de meta e melhora a saúde estrutural do portfólio.',
    formula: 'IQC(Carteira Simulada Pós-Aporte) − IQC(Carteira Atual)'
  },
  hist_total_brl: {
    title: 'Total Aportado (Ativos BRL)',
    meaning: 'Soma histórica de todas as compras registradas em ativos negociados em Reais (B3 e Renda Fixa).',
    interpret: 'Reflete o esforço poupador direcionado ao mercado doméstico no recorte selecionado.',
    formula: 'Σ (Qtd Adquirida × Preço Pago em R$) das ordens em BRL'
  },
  hist_total_usd: {
    title: 'Total Aportado (Ativos USD)',
    meaning: 'Soma histórica das compras executadas em ativos internacionais na moeda original (US$).',
    interpret: 'Mostra a acumulação histórica de capital em moeda forte.',
    formula: 'Σ (Qtd Adquirida × Preço Pago em US$) das ordens Internacionais'
  },
  hist_total_convertido: {
    title: 'Total Geral Convertido',
    meaning: 'Volume financeiro global de todos os aportes históricos consolidado em Reais pelo câmbio vigente.',
    interpret: 'Representa o fluxo total de capital injetado na carteira ao longo do tempo.',
    formula: 'Total Aportado BRL + (Total Aportado USD × Câmbio USD/BRL)'
  },
  hist_num_operacoes: {
    title: 'Número de Operações',
    meaning: 'Quantidade total de ordens de compra registradas no histórico auditável.',
    interpret: 'Mede a frequência e consistência da disciplina de aportes.',
    formula: 'Contagem(Registros de Compra no filtro ativo)'
  }
};

function buildKpiTitleWithInfo(label, infoKey) {
  return `<span class="card-title-wrap"><span class="card-label">${escapeHTML(label)}</span><button type="button" class="kpi-info-btn" data-kpi-info="${escapeHTML(infoKey)}" aria-label="Informações sobre ${escapeHTML(label)}">ⓘ</button></span>`;
}

/**
 * Renderiza os 8 Cards Executivos na Tela 1 (divididos em 2 linhas harmônicas)
 */
function renderExecutiveKPIsGrid(assetList, rate) {
  const container = document.getElementById('summary-cards-executiva');
  if (!container) return;

  const k = calcPortfolioKPIs(assetList, rate);

  const rfProfitClass = k.rfProfitBRL >= 0 ? 'pos' : 'neg';
  const rvProfitClass = k.rvProfitBRL >= 0 ? 'pos' : 'neg';
  const plClass = k.plAbertoBRL >= 0 ? 'pos' : 'neg';
  const plColor = k.plAbertoBRL >= 0 ? 'var(--green)' : 'var(--red)';
  const plBg = k.plAbertoBRL >= 0 ? 'var(--green-bg)' : 'var(--red-bg)';

  const valMayorRentClass = k.maiorValorizacao.pct >= 0 ? 'pos' : 'neg';
  const valMayorGapClass = k.maiorGap.gapPct >= 0 ? 'pos' : 'neg';

  const planoW = clamp(k.capitalPlanoPct, 0, 100);
  const transW = clamp(k.capitalTransicaoPct, 0, 100);

  container.innerHTML = `
    <!-- NÍVEL 1: HERO ROW -->
    <div class="kpi-hero-row">
      <!-- Card 1: Patrimônio Base Total (R$) -->
      <div class="card kpi-card kpi-hero kpi-card-primary" style="--kpi-accent:var(--blue)">
        <div class="card-header">
          ${buildKpiTitleWithInfo('Patrimônio Base Total', 'exec_patrimonio_total')}
          <div class="card-icon" style="background:var(--blue-bg);color:var(--blue);">${ICONS.wallet}</div>
        </div>
        <div class="card-value tabular-nums">R$ ${fmtCurrency(k.tvBRL)}</div>
        <div class="card-footer-stack">
          <div class="card-sub"><span class="badge-indicator neutral tabular-nums">≈ US$ ${fmtCurrency(k.tvUSD)}</span></div>
          <div class="card-sub-line">Custo Investido: <strong class="tabular-nums">R$ ${fmtCurrency(k.tcBRL)}</strong></div>
        </div>
      </div>

      <!-- Card 2: Patrimônio Internacional (US$) -->
      <div class="card kpi-card kpi-hero" style="--kpi-accent:var(--purple)">
        <div class="card-header">
          ${buildKpiTitleWithInfo('Patrimônio Internacional', 'exec_patrimonio_intl')}
          <div class="card-icon" style="background:var(--purple-bg);color:var(--purple);">${ICONS.globe}</div>
        </div>
        <div class="card-value tabular-nums">US$ ${fmtCurrency(k.intlUSD)}</div>
        <div class="card-footer-stack">
          <div class="card-sub">
            <span class="badge-indicator neutral tabular-nums">≈ R$ ${fmtCurrency(k.intlBRL)}</span>
            <span class="badge-indicator pos tabular-nums">${fmtPct(k.intlPct, false, 1)}</span>
          </div>
          <div class="card-sub-line">Jurisdição Externa (Stocks / ETFs)</div>
        </div>
      </div>

      <!-- Card 3: Renda Fixa / Liquidez (R$) -->
      <div class="card kpi-card kpi-hero" style="--kpi-accent:var(--teal)">
        <div class="card-header">
          ${buildKpiTitleWithInfo('Renda Fixa / Liquidez', 'exec_renda_fixa')}
          <div class="card-icon" style="background:var(--teal-bg);color:var(--teal);">${ICONS.shield}</div>
        </div>
        <div class="card-value tabular-nums">R$ ${fmtCurrency(k.rfBRL)}</div>
        <div class="card-footer-stack">
          <div class="card-sub">
            <span class="badge-indicator ${rfProfitClass} tabular-nums">R$ ${fmtCurrency(k.rfProfitBRL)} (${fmtPct(k.rfProfitPct)})</span>
          </div>
          <div class="card-sub-line">Participação: <strong class="tabular-nums">${fmtPct(k.rfSharePct, false, 1)}</strong> da carteira</div>
        </div>
      </div>

      <!-- Card 4: Renda Variável Total (R$) -->
      <div class="card kpi-card kpi-hero" style="--kpi-accent:var(--orange)">
        <div class="card-header">
          ${buildKpiTitleWithInfo('Renda Variável Total', 'exec_renda_variavel')}
          <div class="card-icon" style="background:var(--orange-bg);color:var(--orange);">${ICONS.candlestick}</div>
        </div>
        <div class="card-value tabular-nums">R$ ${fmtCurrency(k.rvBRL)}</div>
        <div class="card-footer-stack">
          <div class="card-sub">
            <span class="badge-indicator neutral tabular-nums">≈ US$ ${fmtCurrency(k.rvUSD)}</span>
            <span class="badge-indicator ${rvProfitClass} tabular-nums">${fmtPct(k.rvProfitPct)}</span>
          </div>
          <div class="card-sub-line">Participação: <strong class="tabular-nums">${fmtPct(k.rvSharePct, false, 1)}</strong> sobre total</div>
        </div>
      </div>

      <!-- Card 5: P/L Aberto Consolidado (R$) -->
      <div class="card kpi-card kpi-hero" style="--kpi-accent:${plColor}">
        <div class="card-header">
          ${buildKpiTitleWithInfo('P/L Aberto Consolidado', 'exec_pl_aberto')}
          <div class="card-icon" style="background:${plBg};color:${plColor};">${ICONS.chart}</div>
        </div>
        <div class="card-value tabular-nums" style="color:${plColor}">R$ ${fmtCurrency(k.plAbertoBRL)}</div>
        <div class="card-footer-stack">
          <div class="card-sub">
            <span class="badge-indicator ${plClass} tabular-nums">${fmtPct(k.plAbertoPct)}</span>
            <span style="color:var(--text-muted);font-size:11px;">sobre custo global</span>
          </div>
          <div class="card-sub-line">Resultado não realizado acumulado</div>
        </div>
      </div>
    </div>

    <!-- NÍVEL 2: TACTICAL ANALYTICS STRIP -->
    <div class="kpi-tactical-row">
      <!-- Card 6: Exposição Cambial (Moeda Forte vs. BRL) -->
      <div class="card kpi-card kpi-tactical">
        <div class="card-header">
          ${buildKpiTitleWithInfo('Exposição Cambial', 'exec_exposicao_cambial')}
          <div class="card-icon" style="background:var(--blue-bg);color:var(--blue);">${ICONS.currency}</div>
        </div>
        <div class="card-value tabular-nums">${fmtPct(k.moedaFortePct, false, 1)} <span style="font-size:12px;font-weight:600;color:var(--text-muted);font-family:var(--font-ui)">Moeda Forte</span></div>
        <div class="card-footer-stack">
          <div class="split-bar-bg" title="Direta: ${k.dolDiretaPct.toFixed(1)}% | Indireta B3: ${k.dolIndiretaPct.toFixed(1)}% | BRL: ${k.domesticaPct.toFixed(1)}%">
            <div class="split-bar-seg" style="width:${k.dolDiretaPct}%;background:var(--purple);"></div>
            <div class="split-bar-seg" style="width:${k.dolIndiretaPct}%;background:var(--blue);"></div>
            <div class="split-bar-seg" style="width:${k.domesticaPct}%;background:var(--teal);"></div>
          </div>
          <div class="legend-grid">
            <div class="legend-cell"><span class="lg-top"><span class="lg-dot" style="background:var(--purple)"></span>Direta</span><strong class="tabular-nums" style="color:var(--purple)">${fmtPct(k.dolDiretaPct, false, 1)}</strong></div>
            <div class="legend-cell"><span class="lg-top"><span class="lg-dot" style="background:var(--blue)"></span>B3</span><strong class="tabular-nums" style="color:var(--blue)">${fmtPct(k.dolIndiretaPct, false, 1)}</strong></div>
            <div class="legend-cell"><span class="lg-top"><span class="lg-dot" style="background:var(--teal)"></span>BRL</span><strong class="tabular-nums" style="color:var(--teal)">${fmtPct(k.domesticaPct, false, 1)}</strong></div>
          </div>
        </div>
      </div>

      <!-- Card 7: Saúde Estratégica (Alvo vs. Legado) -->
      <div class="card kpi-card kpi-tactical">
        <div class="card-header">
          ${buildKpiTitleWithInfo('Saúde Estratégica', 'exec_saude_estrategica')}
          <div class="card-icon" style="background:var(--green-bg);color:var(--green);">${ICONS.compass}</div>
        </div>
        <div class="card-value tabular-nums">${fmtPct(k.capitalPlanoPct, false, 1)} <span style="font-size:12px;font-weight:600;color:var(--text-muted);font-family:var(--font-ui)">no Plano</span></div>
        <div class="card-footer-stack">
          <div class="split-bar-bg">
            <div class="split-bar-seg" style="width:${planoW}%;background:var(--green);"></div>
            <div class="split-bar-seg" style="width:${transW}%;background:var(--yellow);"></div>
          </div>
          <div class="stat-rows">
            <div class="stat-row"><span class="st-label"><span class="st-dot" style="background:var(--green)"></span>Alvo</span><span class="st-val tabular-nums">R$ ${fmtCurrency(k.capitalPlanoBRL)}</span></div>
            <div class="stat-row"><span class="st-label"><span class="st-dot" style="background:var(--yellow)"></span>Legado</span><span class="st-val tabular-nums">R$ ${fmtCurrency(k.capitalTransicaoBRL)}</span></div>
            <div class="stat-row">
              <span class="st-label">Transição</span>
              <span class="badge-indicator ${k.countTransicao > 0 ? 'warn' : 'pos'} tabular-nums">${k.countTransicao} ${k.countTransicao === 1 ? 'ativo' : 'ativos'} · ${fmtPct(k.capitalTransicaoPct, false, 1)}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Card 8: Destaques da Carteira (Leaderboard) -->
      <div class="card kpi-card kpi-tactical">
        <div class="card-header" style="margin-bottom:6px;">
          ${buildKpiTitleWithInfo('Destaques da Carteira', 'exec_destaques')}
          <div class="card-icon" style="background:var(--yellow-bg);color:var(--yellow);">${ICONS.award}</div>
        </div>
        <div class="highlights-list">
          <div class="highlight-row">
            <span class="hl-rank">1</span>
            <span class="hl-info"><span class="hl-label">Maior Posição</span><strong>${escapeHTML(k.maiorPosicao.ticker)}</strong></span>
            <span class="hl-val tabular-nums"><span class="badge-indicator neutral">${fmtPct(k.maiorPosicao.pct, false, 1)}</span></span>
          </div>
          <div class="highlight-row">
            <span class="hl-rank">2</span>
            <span class="hl-info"><span class="hl-label">Maior Alta s/ PM</span><strong>${escapeHTML(k.maiorValorizacao.ticker)}</strong></span>
            <span class="hl-val tabular-nums"><span class="badge-indicator ${valMayorRentClass}">${fmtPct(k.maiorValorizacao.pct, true, 1)}</span></span>
          </div>
          <div class="highlight-row">
            <span class="hl-rank">3</span>
            <span class="hl-info"><span class="hl-label">Maior Gap Aporte</span><strong>${escapeHTML(k.maiorGap.ticker)}</strong></span>
            <span class="hl-val tabular-nums"><span class="badge-indicator ${valMayorGapClass}">${fmtPct(k.maiorGap.gapPct, true, 1)}</span></span>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Renderiza os 5 Cards Dinâmicos da Tela 2 (Carteira Consolidada)
 */
function renderConsolidadaSummary(filteredList, rate) {
  const container = document.getElementById('summary-cards-consolidada');
  if (!container) return;

  const k = calcPortfolioKPIs(filteredList, rate);
  const rvProfitClass = k.rvProfitBRL >= 0 ? 'pos' : 'neg';
  const plClass = k.plAbertoBRL >= 0 ? 'pos' : 'neg';
  const plColor = k.plAbertoBRL >= 0 ? 'var(--green)' : 'var(--red)';
  const plBg = k.plAbertoBRL >= 0 ? 'var(--green-bg)' : 'var(--red-bg)';

  container.innerHTML = `
    <div class="card">
      <div class="card-header">${buildKpiTitleWithInfo('Patrimônio Filtrado', 'cons_patrimonio_filtrado')}<div class="card-icon" style="background:var(--blue-bg);color:var(--blue);">${ICONS.wallet}</div></div>
      <div class="card-value tabular-nums">R$ ${fmtCurrency(k.tvBRL)}</div>
      <div class="card-sub"><span class="badge-indicator neutral tabular-nums">≈ US$ ${fmtCurrency(k.tvUSD)}</span></div>
    </div>
    <div class="card">
      <div class="card-header">${buildKpiTitleWithInfo('Patrimônio Internacional', 'cons_patrimonio_intl')}<div class="card-icon" style="background:var(--purple-bg);color:var(--purple);">${ICONS.globe}</div></div>
      <div class="card-value tabular-nums">US$ ${fmtCurrency(k.intlUSD)}</div>
      <div class="card-sub"><span class="badge-indicator neutral tabular-nums">≈ R$ ${fmtCurrency(k.intlBRL)} (${fmtPct(k.intlPct, false, 1)})</span></div>
    </div>
    <div class="card">
      <div class="card-header">${buildKpiTitleWithInfo('Renda Fixa Filtrada', 'cons_renda_fixa')}<div class="card-icon" style="background:var(--teal-bg);color:var(--teal);">${ICONS.shield}</div></div>
      <div class="card-value tabular-nums">R$ ${fmtCurrency(k.rfBRL)}</div>
      <div class="card-sub"><span class="badge-indicator neutral tabular-nums">${fmtPct(k.rfSharePct, false, 1)}</span> da seleção</div>
    </div>
    <div class="card">
      <div class="card-header">${buildKpiTitleWithInfo('Renda Variável Filtrada', 'cons_renda_variavel')}<div class="card-icon" style="background:var(--orange-bg);color:var(--orange);">${ICONS.candlestick}</div></div>
      <div class="card-value tabular-nums">R$ ${fmtCurrency(k.rvBRL)}</div>
      <div class="card-sub"><span class="badge-indicator tabular-nums ${rvProfitClass}">${fmtPct(k.rvProfitPct)}</span> sobre custo</div>
    </div>
    <div class="card">
      <div class="card-header">${buildKpiTitleWithInfo('P/L Aberto Filtrado', 'cons_pl_aberto')}<div class="card-icon" style="background:${plBg};color:${plColor};">${ICONS.chart}</div></div>
      <div class="card-value tabular-nums" style="color:${plColor}">R$ ${fmtCurrency(k.plAbertoBRL)}</div>
      <div class="card-sub"><span class="badge-indicator tabular-nums ${plClass}">${fmtPct(k.plAbertoPct)}</span> sobre custo</div>
    </div>
  `;
}

/**
 * Renderiza o Card de Índice de Qualidade da Carteira (IQC) com Ícones 100% SVG
 */
function renderIQC(assetList, rate) {
  const res = calcIQC(assetList, rate);
  const scoreEl = document.getElementById('iqc-score-val');
  const classEl = document.getElementById('iqc-class-label');
  const gaugeEl = document.getElementById('iqc-gauge-fill');

  if (!scoreEl || !classEl || !gaugeEl) return;

  scoreEl.textContent = res.scoreTotal.toFixed(0);
  scoreEl.style.color = res.colorVar;
  classEl.textContent = res.classification;
  classEl.style.color = res.colorVar;

  const setPillar = (key, val) => {
    const vEl = document.getElementById(`iqc-val-${key}`);
    const bEl = document.getElementById(`iqc-bar-${key}`);
    if (vEl) vEl.textContent = val.toFixed(0);
    if (bEl) bEl.style.width = `${clamp(val, 0, 100)}%`;
  };

  setPillar('aderencia', res.notaAderencia);
  setPillar('div', res.notaDiv);
  setPillar('conc', res.notaConc);
  setPillar('exp', res.notaExp);

  gaugeEl.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1), stroke 0.4s ease';
  gaugeEl.style.strokeDashoffset = (251.2 - (251.2 * (res.scoreTotal / 100))).toFixed(2);
  // Gradiente dinâmico + glow (puramente visual; não altera score nem offset)
  const gStart = document.getElementById('iqc-grad-start');
  const gEnd = document.getElementById('iqc-grad-end');
  if (gStart) gStart.style.stopColor = res.colorVar;
  if (gEnd) gEnd.style.stopColor = `color-mix(in srgb, ${res.colorVar} 62%, #fff)`;
  gaugeEl.style.filter = `drop-shadow(0 0 7px color-mix(in srgb, ${res.colorVar} 60%, transparent))`;

  const strengthsEl = document.getElementById('iqc-list-strengths');
  const improvementsEl = document.getElementById('iqc-list-improvements');

  if (strengthsEl) {
    if (res.strengths.length > 0) {
      strengthsEl.innerHTML = res.strengths.map(item => `
        <li>
          <span class="iqc-svg-bullet pos">${ICONS[item.icon] || ICONS.checkCircle}</span>
          <div><strong>${escapeHTML(item.title)}:</strong> ${escapeHTML(item.text)}</div>
        </li>
      `).join('');
    } else {
      strengthsEl.innerHTML = `
        <li>
          <span class="iqc-svg-bullet neutral">${ICONS.checkCircle}</span>
          <div>Desempenho equilibrado. Nenhum pilar em zona de excelência isolada no momento.</div>
        </li>
      `;
    }
  }

  if (improvementsEl) {
    if (res.improvements.length > 0) {
      improvementsEl.innerHTML = res.improvements.map(item => `
        <li>
          <span class="iqc-svg-bullet warn">${ICONS[item.icon] || ICONS.alertTriangle}</span>
          <div><strong>${escapeHTML(item.title)}:</strong> ${escapeHTML(item.text)}</div>
        </li>
      `).join('');
    } else {
      improvementsEl.innerHTML = `
        <li>
          <span class="iqc-svg-bullet pos">${ICONS.checkCircle}</span>
          <div>Nenhuma fragilidade estrutural crítica identificada no cenário atual.</div>
        </li>
      `;
    }
  }
}

/**
 * Renderiza Alocação Patrimonial e Matriz Comparativa (Donut SVG interativo + Matriz alinhada)
 */
function renderDistribution(assetList, rate) {
  const blocoContainer = document.getElementById('distribution-bloco');
  const tipoContainer = document.getElementById('distribution-tipo');
  if (!blocoContainer || !tipoContainer) return;

  const { tvBRL, byBloco, byTipo } = calcMacroAllocations(assetList, rate);
  const pctFmt = v => `${v.toFixed(1).replace('.', ',')}%`;

  // 1. Card Exposição por Bloco (Atual vs. Meta & Gap)
  const donutBlocoHTML = buildDonutSVG(byBloco, tvBRL, 'POR BLOCO');
  const rowsBlocoHTML = byBloco.map((item, i) => {
    const gapClass = item.deltaPct < -0.5 ? 'neg' : item.deltaPct > 0.5 ? 'pos' : 'zero';
    const barAtual = clamp(item.atualPct, 0, 100);
    const barMeta = clamp(item.metaPct, 0, 100);

    return `
      <div class="macro-row" data-donut-idx="${i}" tabindex="0">
        <div class="macro-name">
          <div class="macro-row-title">
            <span class="macro-dot" style="background:${item.color};color:${item.color}"></span>
            <strong>${escapeHTML(item.bloco)}</strong>
            <span class="macro-count">(${item.count})</span>
          </div>
          <div class="macro-sub tabular-nums">R$ ${fmtCurrency(item.valorBRL)}</div>
        </div>
        <div class="macro-bar-cell">
          <div class="macro-dual-bar">
            <div class="macro-bar-fill" style="width:${barAtual}%;background:${item.color};"></div>
            <div class="macro-bar-marker" style="left:${barMeta}%;" title="Meta: ${item.metaPct.toFixed(1)}%"></div>
          </div>
        </div>
        <div class="macro-pct tabular-nums">${pctFmt(item.atualPct)}</div>
        <div class="macro-meta tabular-nums">${pctFmt(item.metaPct)}</div>
        <div class="gap-cell">
          <span class="delta-pill tabular-nums ${gapClass}" title="Gap em R$: R$ ${fmtCurrency(item.gapBRL)}">${fmtPct(item.deltaPct, true, 1)}</span>
          <span class="gap-money tabular-nums">R$ ${fmtCurrency(item.gapBRL)}</span>
        </div>
      </div>
    `;
  }).join('');

  blocoContainer.innerHTML = `
    <div class="macro-layout" data-donut-root>
      ${donutBlocoHTML}
      <div class="macro-list">
        <div class="macro-head">
          <span>Bloco</span><span>Distribuição</span><span class="r">Atual</span><span class="r">Meta</span><span class="r">Gap</span>
        </div>
        ${rowsBlocoHTML}
      </div>
    </div>
  `;

  // 2. Card Alocação por Classe
  const donutTipoHTML = buildDonutSVG(byTipo, tvBRL, 'POR CLASSE');
  const rowsTipoHTML = byTipo.map((item, i) => {
    const barW = clamp(item.atualPct, 0, 100);
    return `
      <div class="macro-row" data-donut-idx="${i}" tabindex="0">
        <div class="macro-name">
          <div class="macro-row-title">
            <span class="macro-dot" style="background:${item.color};color:${item.color}"></span>
            <span class="type-badge badge-${escapeHTML(item.tipo)}">${escapeHTML(item.label)}</span>
            <span class="macro-count">${item.count} ${item.count === 1 ? 'ativo' : 'ativos'}</span>
          </div>
          <div class="macro-sub tabular-nums">R$ ${fmtCurrency(item.valorBRL)}</div>
        </div>
        <div class="macro-bar-cell">
          <div class="macro-dual-bar">
            <div class="macro-bar-fill" style="width:${barW}%;background:${item.color};"></div>
          </div>
        </div>
        <div class="macro-pct tabular-nums">${pctFmt(item.atualPct)}</div>
      </div>
    `;
  }).join('');

  tipoContainer.innerHTML = `
    <div class="macro-layout" data-donut-root>
      ${donutTipoHTML}
      <div class="macro-list is-tipo">
        <div class="macro-head">
          <span>Classe</span><span>Distribuição</span><span class="r">Atual</span>
        </div>
        ${rowsTipoHTML}
      </div>
    </div>
  `;
}

/**
 * Renderiza a Tela 2: Carteira Consolidada (Filtros Avançados + Tabela Ordenável)
 */
function renderTable() {
  const rate = getEffectiveDolar();
  const allAssets = window.assets || [];
  const tvBRL = calcTotalValorBRL(allAssets, rate);

  updateDolarUI();
  updateMetaThermometerUI();

  const q = (document.getElementById('search-input')?.value || '').trim().toLowerCase();
  const bFilt = document.getElementById('filter-bloco')?.value || 'todos';
  const tFilt = document.getElementById('filter-tipo')?.value || 'todos';
  const aFilt = document.getElementById('filter-acao')?.value || 'todos';
  const pFilt = document.getElementById('filter-posicao')?.value || 'todos';

  const filtered = allAssets
    .map((a, idx) => ({ ...a, _idx: idx }))
    .filter(a => {
      if (bFilt !== 'todos' && a.bloco !== bFilt) return false;
      if (tFilt !== 'todos' && String(a.tipo || '').toLowerCase() !== tFilt) return false;

      if (aFilt !== 'todos') {
        const ac = String(a.acao || '').toLowerCase();
        if (aFilt === 'vender') {
          if (!['vender', 'zerar'].includes(ac)) return false;
        } else if (ac !== aFilt) {
          return false;
        }
      }

      const qtd = Number(a.qtd) || 0;
      const meta = Number(a.pesoMeta) || 0;
      if (pFilt === 'carteira' && qtd <= 0) return false;
      if (pFilt === 'radar' && qtd > 0) return false;
      if (pFilt === 'fora_meta' && !(meta <= 0 && qtd > 0)) return false;

      if (q) {
        const matchT = String(a.ticker || '').toLowerCase().includes(q);
        const matchE = String(a.empresa || '').toLowerCase().includes(q);
        const matchS = String(a.setor || '').toLowerCase().includes(q);
        if (!matchT && !matchE && !matchS) return false;
      }
      return true;
    });

  const sortCol = window.sortCol || 'pesoMeta';
  const sortDir = window.sortDir || -1;

  filtered.sort((a, b) => {
    let va;
    let vb;
    switch (sortCol) {
      case 'ticker': va = a.ticker || ''; vb = b.ticker || ''; break;
      case 'setor': va = a.setor || ''; vb = b.setor || ''; break;
      case 'bloco': va = a.bloco || ''; vb = b.bloco || ''; break;
      case 'tipo': va = a.tipo || ''; vb = b.tipo || ''; break;
      case 'qtd': va = Number(a.qtd) || 0; vb = Number(b.qtd) || 0; break;
      case 'preco': va = Number(a.preco) || 0; vb = Number(b.preco) || 0; break;
      case 'pm': va = Number(a.pm) || 0; vb = Number(b.pm) || 0; break;
      case 'valor': va = calcValorBRL(a, rate); vb = calcValorBRL(b, rate); break;
      case 'resultado': va = calcResultadoBRL(a, rate); vb = calcResultadoBRL(b, rate); break;
      case 'pesoMeta': va = Number(a.pesoMeta) || 0; vb = Number(b.pesoMeta) || 0; break;
      case 'pesoReal': va = calcPesoReal(a, tvBRL, rate); vb = calcPesoReal(b, tvBRL, rate); break;
      case 'delta':
        va = calcPesoReal(a, tvBRL, rate) - (Number(a.pesoMeta) || 0);
        vb = calcPesoReal(b, tvBRL, rate) - (Number(b.pesoMeta) || 0);
        break;
      default: va = a.ticker || ''; vb = b.ticker || '';
    }
    if (typeof va === 'string') {
      return sortDir * va.localeCompare(vb, 'pt-BR');
    }
    return sortDir * (va - vb);
  });

  renderConsolidadaSummary(filtered, rate);

  const thIcon = (col) => {
    if (sortCol !== col) return `<span class="sort-icon faint">${ICONS.sortNeutral}</span>`;
    return sortDir === 1
      ? `<span class="sort-icon active">${ICONS.sortAsc}</span>`
      : `<span class="sort-icon active">${ICONS.sortDesc}</span>`;
  };

  const headEl = document.getElementById('table-head');
  if (headEl) {
    headEl.innerHTML = `
      <tr>
        <th class="sticky-col" onclick="sortBy('ticker')">Ativo ${thIcon('ticker')}</th>
        <th onclick="sortBy('setor')">Setor ${thIcon('setor')}</th>
        <th onclick="sortBy('bloco')">Bloco ${thIcon('bloco')}</th>
        <th onclick="sortBy('tipo')">Classe ${thIcon('tipo')}</th>
        <th class="right" onclick="sortBy('qtd')">Qtd ${thIcon('qtd')}</th>
        <th class="right" onclick="sortBy('preco')">Cotação ${thIcon('preco')}</th>
        <th class="right" onclick="sortBy('pm')">Custo Médio ${thIcon('pm')}</th>
        <th class="right" onclick="sortBy('valor')">Financeiro ${thIcon('valor')}</th>
        <th class="right" onclick="sortBy('resultado')">P/L Aberto ${thIcon('resultado')}</th>
        <th class="right" onclick="sortBy('pesoMeta')">Meta % ${thIcon('pesoMeta')}</th>
        <th class="right" onclick="sortBy('pesoReal')">Atual % ${thIcon('pesoReal')}</th>
        <th class="right" onclick="sortBy('delta')">Delta % ${thIcon('delta')}</th>
        <th style="text-align:center">Recomendação</th>
        <th style="text-align:center">Ações</th>
      </tr>
    `;
  }

  const bodyEl = document.getElementById('table-body');
  if (!bodyEl) return;

  if (filtered.length === 0) {
    bodyEl.innerHTML = `
      <tr>
        <td colspan="14" class="empty-table-cell">
          Nenhum ativo encontrado para os filtros aplicados.
        </td>
      </tr>
    `;
    return;
  }

  bodyEl.innerHTML = filtered.map(a => {
    const usd = isUSD(a);
    const curSymbol = usd ? 'US$' : 'R$';
    const pr = calcPesoReal(a, tvBRL, rate);
    const pMeta = Number(a.pesoMeta) || 0;
    const delta = pr - pMeta;
    const vF = calcValorMoeda(a);
    const pL = calcResultadoMoeda(a);
    const rentPct = calcRentabilidadeAtivoPct(a);
    const qtd = Number(a.qtd) || 0;
    const preco = Number(a.preco) || 0;
    const pm = Number(a.pm) || 0;

    // Alerta de Cotação Zerada: qtd > 0 && preco === 0
    const semCotacaoBadge = (qtd > 0 && preco === 0)
      ? `<span class="zero-quote-badge" title="Ativo em carteira sem preço de mercado atual">! Sem Cotação</span>`
      : '';

    const plClass = pL > 0 ? 'pos' : pL < 0 ? 'neg' : 'neutral';
    const deltaClass = delta < -0.5 ? 'neg' : delta > 0.5 ? 'pos' : 'zero';
    const progressPct = pMeta > 0 ? clamp((pr / pMeta) * 100, 0, 100) : (pr > 0 ? 100 : 0);
    const barColor = delta > 0.5 ? 'var(--yellow)' : 'var(--blue)';

    const tipoMeta = getTipoMeta(a.tipo);
    const acaoCls = getAcaoClass(a.acao);

    const selectOptions = ACAO_OPTIONS.map(opt => {
      const selected = String(a.acao || '').toLowerCase() === opt.value ? 'selected' : '';
      return `<option value="${escapeHTML(opt.value)}" ${selected}>${escapeHTML(opt.label)}</option>`;
    }).join('');

    return `
      <tr>
        <td class="sticky-col">
          <div class="ticker-cell">
            <div class="ticker-name">${escapeHTML(a.ticker)}</div>
            <div class="ticker-empresa">${escapeHTML(a.empresa || '—')}</div>
          </div>
        </td>
        <td><span class="cell-muted">${escapeHTML(a.setor || 'N/D')}</span></td>
        <td><span class="bloco-badge">${escapeHTML(a.bloco || 'BR')}</span></td>
        <td><span class="type-badge badge-${escapeHTML(String(a.tipo || 'acao').toLowerCase())}">${escapeHTML(tipoMeta.label)}</span></td>
        <td class="right"><span class="tabular-nums">${fmtNumber(qtd)}</span></td>
        <td class="right">
          <div class="fin-cell">
            <span class="fin-symbol">${curSymbol}</span>
            <span class="tabular-nums" style="font-weight:600">${fmtCurrency(preco)}</span>
          </div>
          ${semCotacaoBadge}
        </td>
        <td class="right">
          <div class="fin-cell">
            <span class="fin-symbol">${curSymbol}</span>
            <span class="tabular-nums">${fmtCurrency(pm)}</span>
          </div>
        </td>
        <td class="right">
          <div class="fin-cell">
            <span class="fin-symbol">${vF > 0 ? curSymbol : ''}</span>
            <span class="tabular-nums" style="font-weight:600">${vF > 0 ? fmtCurrency(vF) : '—'}</span>
          </div>
        </td>
        <td class="right">
          ${pm > 0 && qtd > 0 ? `
            <div class="pl-cell">
              <div class="fin-cell">
                <span class="fin-symbol">${curSymbol}</span>
                <span class="tabular-nums num-color ${plClass}">${fmtCurrency(pL)}</span>
              </div>
              <span class="pl-pct-sub tabular-nums ${plClass}">${fmtPct(rentPct, true, 1)}</span>
            </div>
          ` : `<div class="right"><span class="tabular-nums">—</span></div>`}
        </td>
        <td class="right"><span class="tabular-nums">${pMeta.toFixed(2).replace('.', ',')}%</span></td>
        <td class="right"><span class="tabular-nums" style="font-weight:600">${pr.toFixed(2).replace('.', ',')}%</span></td>
        <td class="right">
          <div class="delta-wrapper">
            <div class="peso-bar-bg" title="Progresso da Meta: ${progressPct.toFixed(0)}%">
              <div class="peso-bar-fill" style="width:${progressPct}%;background:${barColor}"></div>
            </div>
            <span class="delta-pill tabular-nums ${deltaClass}">${fmtPct(delta)}</span>
          </div>
        </td>
        <td style="text-align:center">
          <select
            class="acao-select ${acaoCls}"
            onchange="handleInlineAcaoChange(${a._idx}, this)"
            aria-label="Recomendação para ${escapeHTML(a.ticker)}"
          >
            ${selectOptions}
          </select>
        </td>
        <td style="text-align:center">
          <button class="icon-action-btn" onclick="openEditModal(${a._idx})" title="Editar ${escapeHTML(a.ticker)}">
            ${ICONS.edit}
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Renderiza a Tela 3: Sugestão Inteligente de Aporte (Resumo da Simulação + Ranking Multicritério)
 */
function renderAporteSuggestions() {
  const container = document.getElementById('sugestoes-ranking-lista');
  if (!container) return;

  const rate = getEffectiveDolar();
  updateDolarUI();
  updateMetaThermometerUI();

  const currency = document.getElementById('sim-currency')?.value || 'BRL';
  const rawValue = parseFloat(document.getElementById('sim-value')?.value) || 0;
  const maxAssets = parseInt(document.getElementById('sim-max')?.value, 10) || 3;
  const blocoFiltro = document.getElementById('sim-bloco')?.value || 'todos';

  const result = calcSmartAporte(
    { currency, rawValue, maxAssets, blocoFiltro },
    window.assets || [],
    rate
  );

  if (result.status !== 'ok') {
    container.innerHTML = `
      <div class="alert-box">
        <div class="alert-title">${ICONS.alertTriangle} <span>Atenção na Simulação</span></div>
        <div class="alert-desc">${escapeHTML(result.message)}</div>
      </div>
    `;
    return;
  }

  const iqcDeltaSign = result.iqcDelta >= 0 ? '+' : '';
  const iqcDeltaClass = result.iqcDelta > 0.05 ? 'pos' : result.iqcDelta < -0.05 ? 'neg' : 'neutral';

  let html = `
    <!-- Resumo da Simulação no Topo do Ranking -->
    <div class="sim-summary-grid">
      <div class="card sim-kpi-card">
        <div class="card-header" style="margin-bottom:4px;">${buildKpiTitleWithInfo('Total Planejado', 'sim_total_planejado')}</div>
        <div class="card-value tabular-nums">R$ ${fmtCurrency(result.valorPlanejadoBRL)}</div>
        <div class="card-sub"><span class="badge-indicator neutral tabular-nums">≈ US$ ${fmtCurrency(result.valorPlanejadoUSD)}</span></div>
      </div>
      <div class="card sim-kpi-card">
        <div class="card-header" style="margin-bottom:4px;">${buildKpiTitleWithInfo('Efetivamente Alocado', 'sim_efetivamente_alocado')}</div>
        <div class="card-value tabular-nums" style="color:var(--green)">R$ ${fmtCurrency(result.totalAlocadoBRL)}</div>
        <div class="card-sub"><span class="badge-indicator pos tabular-nums">${fmtPct(result.eficienciaAlocacaoPct, false, 1)} aproveitado</span></div>
      </div>
      <div class="card sim-kpi-card">
        <div class="card-header" style="margin-bottom:4px;">${buildKpiTitleWithInfo('Troco Total Residual', 'sim_troco_residual')}</div>
        <div class="card-value tabular-nums" style="color:var(--yellow)">R$ ${fmtCurrency(result.trocoTotalBRL)}</div>
        <div class="card-sub"><span class="badge-indicator neutral tabular-nums">≈ US$ ${fmtCurrency(result.trocoTotalUSD)}</span></div>
      </div>
      <div class="card sim-kpi-card">
        <div class="card-header" style="margin-bottom:4px;">${buildKpiTitleWithInfo('Novo IQC Pós-Aporte', 'sim_novo_iqc')}</div>
        <div class="card-value tabular-nums" style="color:${result.iqcPosColor}">
          ${result.iqcAtualScore.toFixed(1)} &rarr; ${result.iqcPosScore.toFixed(1)}
        </div>
        <div class="card-sub">
          <span class="badge-indicator ${iqcDeltaClass} tabular-nums">${iqcDeltaSign}${result.iqcDelta.toFixed(1)} pts (${escapeHTML(result.iqcPosClass)})</span>
        </div>
      </div>
    </div>

    <!-- Box Metodológico dos 4 Critérios -->
    <div class="sug-info-box">
      <p>Motor Multicritério de Priorização de Aportes</p>
      <ul class="sug-info-list">
        <li><span class="dot" style="background:var(--blue);"></span> <strong>C1 — Gap do Bloco (30 pts):</strong> Prioriza blocos abaixo do alvo estratégico (metaBloco - atualBloco).</li>
        <li><span class="dot" style="background:var(--teal);"></span> <strong>C2 — Gap do Ativo (42 pts):</strong> Direciona capital aos ativos com maior defasagem proporcional até sua meta.</li>
        <li><span class="dot" style="background:var(--yellow);"></span> <strong>C3 — Penalização Quadrática por Excesso (20 pts):</strong> Nota cheia para ativos dentro do limite e redução quadrática se excederem a meta.</li>
        <li><span class="dot" style="background:var(--purple);"></span> <strong>C4 — Delta vs. Preço Médio (8 pts):</strong> Bonifica ativos negociados abaixo do PM atual (ou neutro = 4 pts se sem PM).</li>
      </ul>
    </div>
  `;

  result.items.forEach(r => {
    const curSym = r.ehUSD ? 'US$' : 'R$';
    const tipoMeta = getTipoMeta(r.ativo.tipo);
    const progressAtual = r.pMeta > 0 ? clamp((r.pReal / r.pMeta) * 100, 0, 100) : 0;
    const progressPos = r.pMeta > 0 ? clamp((r.pPosAporte / r.pMeta) * 100, 0, 100) : 0;

    let cotasBadgeHTML = '';
    if (r.ehRF) {
      cotasBadgeHTML = `<div class="rank-cotas rf-direct">Aporte direto em R$ (Sobra: R$ 0,00)</div>`;
    } else if (r.semCotacao) {
      cotasBadgeHTML = `<div class="rank-cotas warn-insuf">! Ativo sem cotação cadastrada</div>`;
    } else if (r.cotas === 0) {
      cotasBadgeHTML = `<div class="rank-cotas warn-insuf">Valor insuficiente p/ 1 cota (${curSym} ${fmtCurrency(r.ativo.preco)})</div>`;
    } else {
      cotasBadgeHTML = `<div class="rank-cotas tabular-nums"><strong>${fmtNumber(r.cotas)}</strong> ${r.cotas === 1 ? 'cota sugerida' : 'cotas sugeridas'} (un. ${curSym} ${fmtCurrency(r.ativo.preco)})</div>`;
    }

    const canExecute = r.ehRF ? r.financeiroGastoMoeda > 0 : r.cotas > 0;
    const execParamQtd = r.ehRF ? 1 : r.cotas;
    const execParamVal = r.ehRF ? r.financeiroGastoMoeda : r.ativo.preco;

    html += `
      <div class="rank-row">
        <div class="rank-main-line">
          <div class="rank-left">
            <div class="rank-number tabular-nums">#${r.rank}</div>
            <div class="rank-details">
              <div class="rank-title">
                <span class="rank-ticker">${escapeHTML(r.ativo.ticker)}</span>
                <span class="rank-company">${escapeHTML(r.ativo.empresa)}</span>
                <span class="bloco-badge">${escapeHTML(r.ativo.bloco)}</span>
                <span class="type-badge badge-${escapeHTML(String(r.ativo.tipo || 'acao').toLowerCase())}">${escapeHTML(tipoMeta.label)}</span>
              </div>
              <div class="rank-meta tabular-nums">
                <span>Peso: <strong>${r.pReal.toFixed(2).replace('.', ',')}%</strong> &rarr; <strong style="color:var(--green)">${r.pPosAporte.toFixed(2).replace('.', ',')}%</strong></span>
                <span class="meta-sep">|</span>
                <span>Meta: <strong class="highlight">${r.pMeta.toFixed(2).replace('.', ',')}%</strong></span>
                <span class="meta-sep">|</span>
                <span>Gap Atual: <span class="${r.gapAtivo > 0 ? 'pos' : 'neg'}">${fmtPct(r.gapAtivo)}</span></span>
                <span class="meta-sep">|</span>
                <span>Sobra: <strong>${curSym} ${fmtCurrency(r.sobraMoeda)}</strong></span>
              </div>
              <div class="rank-progress-bg" title="Atual: ${progressAtual.toFixed(0)}% da meta | Pós-Aporte: ${progressPos.toFixed(0)}% da meta">
                <div class="rank-progress-fill-pos" style="width:${progressPos}%;"></div>
                <div class="rank-progress-fill" style="width:${progressAtual}%;"></div>
              </div>
            </div>
          </div>

          <div class="rank-right">
            <div class="rank-val tabular-nums">${curSym} ${fmtCurrency(r.financeiroGastoMoeda)}</div>
            ${cotasBadgeHTML}
            <div class="rank-actions-row">
              <span class="rank-score tabular-nums">Score: <strong>${r.scoreTotal.toFixed(1)}</strong> pts</span>
              <button type="button" class="rank-toggle-btn" onclick="toggleRankBreakdown(this)">Auditar Pontos</button>
              <button
                type="button"
                class="btn btn-primary btn-sm"
                ${!canExecute ? 'disabled' : ''}
                onclick="openQuickBuyFromSuggestion(${r.originalIdx}, ${execParamQtd}, ${execParamVal})"
              >
                ${ICONS.bolt} Executar Compra
              </button>
            </div>
          </div>
        </div>

        <div class="rank-breakdown">
          <div class="rank-breakdown-row"><span class="crit-name">C1 — Gap do Bloco (Máx 30,00 pts)</span><span class="crit-pts tabular-nums">${r.ptBloco.toFixed(2)}</span></div>
          <div class="rank-breakdown-row"><span class="crit-name">C2 — Gap do Ativo (Máx 42,00 pts)</span><span class="crit-pts tabular-nums">${r.ptAtivo.toFixed(2)}</span></div>
          <div class="rank-breakdown-row"><span class="crit-name">C3 — Penalização Quadrática por Excesso (Máx 20,00 pts)</span><span class="crit-pts tabular-nums">${r.ptExcesso.toFixed(2)}</span></div>
          <div class="rank-breakdown-row"><span class="crit-name">C4 — Delta vs. Preço Médio (Máx 8,00 pts)</span><span class="crit-pts tabular-nums">${r.ptPM.toFixed(2)}</span></div>
          <div class="rank-breakdown-total subtotal">
            <span class="crit-name">Alocação Teórica Proporcional (${r.pesoAlocacaoPct.toFixed(1).replace('.', ',')}%)</span>
            <span class="crit-pts tabular-nums">${curSym} ${fmtCurrency(r.valorDisponivelMoeda)} (Sobra: ${curSym} ${fmtCurrency(r.sobraMoeda)})</span>
          </div>
          <div class="rank-breakdown-total">
            <span class="crit-name">Nota Final Sistêmica</span>
            <span class="crit-pts tabular-nums">${r.scoreTotal.toFixed(2)} / 100</span>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function toggleRankBreakdown(btn) {
  const row = btn.closest('.rank-row');
  if (!row) return;
  const bd = row.querySelector('.rank-breakdown');
  if (bd) bd.classList.toggle('open');
}

/**
 * Renderiza a Tela 4: Histórico de Aportes (KPIs + Filtros + Tabela Cronológica)
 */
function renderHistorico() {
  const rate = getEffectiveDolar();
  updateDolarUI();
  updateMetaThermometerUI();

  const search = document.getElementById('hist-search')?.value || '';
  const blocoMoeda = document.getElementById('hist-filter-bloco')?.value || 'todos';

  const metrics = calcHistoricoMetrics(
    window.historico || [],
    window.assets || [],
    rate,
    { search, blocoMoeda }
  );

  const kpiContainer = document.getElementById('summary-cards-historico');
  if (kpiContainer) {
    kpiContainer.innerHTML = `
      <div class="card">
        <div class="card-header">${buildKpiTitleWithInfo('Total Aportado (Ativos BRL)', 'hist_total_brl')}<div class="card-icon" style="background:var(--blue-bg);color:var(--blue);">${ICONS.wallet}</div></div>
        <div class="card-value tabular-nums">R$ ${fmtCurrency(metrics.totalAportadoBRLAtivos)}</div>
        <div class="card-sub"><span class="badge-indicator neutral">Operações Domésticas</span></div>
      </div>
      <div class="card">
        <div class="card-header">${buildKpiTitleWithInfo('Total Aportado (Ativos USD)', 'hist_total_usd')}<div class="card-icon" style="background:var(--purple-bg);color:var(--purple);">${ICONS.globe}</div></div>
        <div class="card-value tabular-nums">US$ ${fmtCurrency(metrics.totalAportadoUSDAtivos)}</div>
        <div class="card-sub"><span class="badge-indicator neutral tabular-nums">≈ R$ ${fmtCurrency(metrics.totalAportadoUSDAtivos * rate)}</span></div>
      </div>
      <div class="card">
        <div class="card-header">${buildKpiTitleWithInfo('Total Geral Convertido', 'hist_total_convertido')}<div class="card-icon" style="background:var(--green-bg);color:var(--green);">${ICONS.chart}</div></div>
        <div class="card-value tabular-nums">R$ ${fmtCurrency(metrics.totalGeralConvertidoBRL)}</div>
        <div class="card-sub"><span class="badge-indicator pos">Consolidado na Moeda Base</span></div>
      </div>
      <div class="card">
        <div class="card-header">${buildKpiTitleWithInfo('Número de Operações', 'hist_num_operacoes')}<div class="card-icon" style="background:var(--teal-bg);color:var(--teal);">${ICONS.clock}</div></div>
        <div class="card-value tabular-nums">${window.valuesHidden ? '••' : metrics.numOperacoes}</div>
        <div class="card-sub"><span class="badge-indicator neutral">Ordens Registradas</span></div>
      </div>
    `;
  }

  const tbody = document.getElementById('historico-table-body');
  if (!tbody) return;

  if (metrics.rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-table-cell">
          Nenhum registro de aporte encontrado para os filtros selecionados.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = metrics.rows.map(r => {
    const sym = r.ehUSD ? 'US$' : 'R$';
    return `
      <tr>
        <td class="sticky-col"><span class="ticker-name">${escapeHTML(r.ticker)}</span></td>
        <td class="tabular-nums">${fmtDateTime(r.data)}</td>
        <td><span class="cell-muted">${escapeHTML(r.empresa)}</span></td>
        <td><span class="bloco-badge">${escapeHTML(r.bloco)}</span></td>
        <td class="right tabular-nums">${fmtNumber(r.qtd)}</td>
        <td class="right">
          <div class="fin-cell">
            <span class="fin-symbol">${sym}</span>
            <span class="tabular-nums">${fmtCurrency(r.precoPago)}</span>
          </div>
        </td>
        <td class="right">
          <div class="fin-cell">
            <span class="fin-symbol">${sym}</span>
            <span class="tabular-nums" style="font-weight:700;color:var(--green)">${fmtCurrency(r.totalMoeda)}</span>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Limpa completamente qualquer dado financeiro renderizado no DOM antes de bloquear a sessão
 */
function purgeFinancialDOM() {
  const idsToClear = [
    'summary-cards-executiva',
    'summary-cards-consolidada',
    'summary-cards-historico',
    'table-body',
    'historico-table-body',
    'sugestoes-ranking-lista',
    'distribution-bloco',
    'distribution-tipo',
    'iqc-list-strengths',
    'iqc-list-improvements'
  ];
  idsToClear.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '';
  });

  const scoreEl = document.getElementById('iqc-score-val');
  if (scoreEl) scoreEl.textContent = '0';
  const dEl = document.getElementById('dolar-display');
  if (dEl) dEl.textContent = '••,••';
  const mEl = document.getElementById('badge-metas');
  if (mEl) mEl.innerHTML = '';
}

/**
 * Gerenciador Global do Popover Explicativo de KPIs (.kpi-info-btn)
 * Suporta clique e hover, posicionamento fixo inteligente anti-corte e fechamento ao clicar fora.
 */
function initKpiPopoverInteractions() {
  if (window.__kpiPopoverInit) return;
  window.__kpiPopoverInit = true;

  let activeBtn = null;
  let pinnedByClick = false;
  let hideTimer = null;

  const getPopoverEl = () => {
    let el = document.getElementById('kpi-info-popover');
    if (!el) {
      el = document.createElement('div');
      el.id = 'kpi-info-popover';
      el.className = 'kpi-popover';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-hidden', 'true');
      document.body.appendChild(el);
    }
    return el;
  };

  const closePopover = () => {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    const pop = document.getElementById('kpi-info-popover');
    if (pop) {
      pop.classList.remove('open');
      pop.setAttribute('aria-hidden', 'true');
    }
    if (activeBtn) {
      activeBtn.classList.remove('active');
      activeBtn = null;
    }
    pinnedByClick = false;
  };

  const positionPopover = (btn, pop) => {
    const rect = btn.getBoundingClientRect();
    const popWidth = Math.min(350, window.innerWidth - 24);
    pop.style.width = `${popWidth}px`;

    // Medir altura real
    const popHeight = pop.offsetHeight || 210;
    const margin = 10;

    let left = rect.left + (rect.width / 2) - (popWidth / 2);
    left = Math.max(12, Math.min(left, window.innerWidth - popWidth - 12));

    let top = rect.bottom + margin;
    if (top + popHeight > window.innerHeight - 12 && rect.top - popHeight - margin > 12) {
      top = rect.top - popHeight - margin;
    }

    pop.style.left = `${Math.round(left)}px`;
    pop.style.top = `${Math.round(top)}px`;
  };

  const showPopoverForBtn = (btn, pin = false) => {
    const key = btn.getAttribute('data-kpi-info');
    const doc = KPI_INFO_DOCS[key];
    if (!doc) return;

    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }

    const pop = getPopoverEl();
    if (activeBtn && activeBtn !== btn) {
      activeBtn.classList.remove('active');
    }
    activeBtn = btn;
    if (pin) pinnedByClick = true;
    btn.classList.add('active');

    pop.innerHTML = `
      <div class="kpi-pop-header">
        <span class="kpi-pop-title">${escapeHTML(doc.title)}</span>
      </div>
      <div class="kpi-pop-body">
        <div class="kpi-pop-topic"><strong>1. O que significa:</strong> ${escapeHTML(doc.meaning)}</div>
        <div class="kpi-pop-topic"><strong>2. Como interpretar:</strong> ${escapeHTML(doc.interpret)}</div>
        <div class="kpi-pop-topic">
          <strong>3. Fórmula de Cálculo:</strong>
          <code class="kpi-pop-formula">${escapeHTML(doc.formula)}</code>
        </div>
      </div>
    `;

    pop.classList.add('open');
    pop.setAttribute('aria-hidden', 'false');
    positionPopover(btn, pop);
  };

  document.addEventListener('click', (e) => {
    const btn = e.target.closest ? e.target.closest('.kpi-info-btn') : null;
    const pop = document.getElementById('kpi-info-popover');

    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      if (activeBtn === btn && pinnedByClick && pop && pop.classList.contains('open')) {
        closePopover();
      } else {
        showPopoverForBtn(btn, true);
      }
      return;
    }

    if (pop && pop.contains(e.target)) {
      return;
    }

    closePopover();
  });

  document.addEventListener('mouseover', (e) => {
    const btn = e.target.closest ? e.target.closest('.kpi-info-btn') : null;
    const pop = document.getElementById('kpi-info-popover');
    if (btn) {
      if (!pinnedByClick || activeBtn === btn) {
        showPopoverForBtn(btn, pinnedByClick);
      }
    } else if (pop && pop.contains(e.target)) {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    }
  });

  document.addEventListener('mouseout', (e) => {
    if (pinnedByClick) return;
    const fromBtn = e.target.closest ? e.target.closest('.kpi-info-btn') : null;
    const pop = document.getElementById('kpi-info-popover');
    const fromPop = pop && pop.contains(e.target);
    if (!fromBtn && !fromPop) return;

    const toEl = e.relatedTarget;
    if (toEl && ((toEl.closest && toEl.closest('.kpi-info-btn') === activeBtn) || (pop && pop.contains(toEl)))) {
      return;
    }

    hideTimer = setTimeout(() => {
      if (!pinnedByClick) closePopover();
    }, 130);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePopover();
  });

  window.addEventListener('scroll', () => {
    if (activeBtn) closePopover();
  }, { passive: true, capture: true });

  window.addEventListener('resize', () => {
    if (activeBtn) closePopover();
  }, { passive: true });
}

/* Inicializa interações visuais dos gráficos e popovers de KPI (delegação global, idempotente) */
initDonutInteractions();
initKpiPopoverInteractions();


