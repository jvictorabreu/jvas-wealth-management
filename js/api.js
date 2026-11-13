/**
 * JVAS Wealth Management (JVAS11)
 * Módulo de Comunicação Autenticada com Google Apps Script (GET / POST)
 * Implementa blindagem de requisições (no-referrer, no-store, omit credentials)
 */

/**
 * Normaliza um objeto de ativo recebido da planilha
 * @param {Object} raw
 * @returns {Object}
 */
function normalizeAsset(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const ticker = String(raw.ticker || '').trim().toUpperCase();
  if (!ticker) return null;

  const parseNum = (val) => {
    if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
    if (typeof val === 'string') {
      const cleaned = val.replace(/\s/g, '').replace(',', '.');
      const n = parseFloat(cleaned);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  };

  let tipo = String(raw.tipo || 'acao').trim().toLowerCase();
  if (tipo === 'renda fixa' || tipo === 'rendafixa') tipo = 'renda_fixa';

  let bloco = String(raw.bloco || 'BR').trim();
  if (bloco.toLowerCase() === 'renda_fixa' || bloco.toLowerCase() === 'renda fixa') {
    bloco = 'Renda Fixa';
  } else if (bloco.toLowerCase() === 'internacional') {
    bloco = 'Internacional';
  } else if (bloco.toUpperCase() === 'BR') {
    bloco = 'BR';
  } else if (bloco.toUpperCase() === 'FII') {
    bloco = 'FII';
  } else if (bloco.toUpperCase() === 'BDR') {
    bloco = 'BDR';
  } else if (bloco.toUpperCase() === 'ETF') {
    bloco = 'ETF';
  }

  let acao = String(raw.acao || 'manter').trim().toLowerCase();
  if (acao === 'nao aportar' || acao === 'não_aportar' || acao === 'nao_aportar') {
    acao = 'não aportar';
  }

  const isRF = tipo === 'renda_fixa' || bloco === 'Renda Fixa';
  const rawQtd = parseNum(raw.qtd);

  return {
    ticker,
    empresa: String(raw.empresa || '').trim(),
    setor: String(raw.setor || '').trim(),
    tipo,
    bloco,
    qtd: isRF && rawQtd <= 0 ? 1 : rawQtd,
    preco: parseNum(raw.preco),
    pm: parseNum(raw.pm),
    pesoMeta: parseNum(raw.pesoMeta),
    acao,
    fundamentos: String(raw.fundamentos || 'positivo').trim().toLowerCase()
  };
}

/**
 * Normaliza um item do histórico de compras
 * @param {Object} raw
 * @returns {Object}
 */
function normalizeHistoricoItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const parseNum = (val) => {
    if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
    if (typeof val === 'string') {
      const cleaned = val.replace(/\s/g, '').replace(',', '.');
      const n = parseFloat(cleaned);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  };

  const ticker = String(raw.ticker || '').trim().toUpperCase();
  if (!ticker) return null;

  const qtd = parseNum(raw.qtd);
  const precoPago = parseNum(raw.precoPago);
  const totalRaw = parseNum(raw.total);

  return {
    data: raw.data || '',
    ticker,
    qtd,
    precoPago,
    total: totalRaw > 0 ? totalRaw : qtd * precoPago
  };
}

/**
 * Verifica se a resposta indica falha de autorização
 * @param {Object} result
 * @returns {boolean}
 */
function isUnauthorizedResponse(result) {
  if (!result) return false;
  const status = String(result.status || '').toLowerCase();
  const msg = String(result.message || result.error || '').toLowerCase();
  return (
    status === 'unauthorized' ||
    status === 'forbidden' ||
    status === '401' ||
    msg.includes('unauthorized') ||
    msg.includes('não autorizado') ||
    msg.includes('nao autorizado') ||
    msg.includes('token inválido') ||
    msg.includes('token invalido') ||
    msg.includes('acesso negado')
  );
}

/**
 * Busca todos os dados da carteira via GET autenticado
 * @param {string} [explicitToken]
 * @returns {Promise<{version: string, assets: Array, historico: Array, dolar: number}>}
 */
async function apiFetchPortfolio(explicitToken = null) {
  const token = explicitToken || getAuthToken();
  if (!token) {
    const err = new Error('Token de acesso ausente.');
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  const url = `${SCRIPT_URL}?token=${encodeURIComponent(token)}`;
  const response = await fetch(url, {
    method: 'GET',
    referrerPolicy: 'no-referrer',
    cache: 'no-store',
    credentials: 'omit'
  });

  const result = await response.json();

  if (isUnauthorizedResponse(result)) {
    if (typeof lockSession === 'function') {
      lockSession('Acesso negado: Chave de Acesso inválida ou revogada.');
    }
    const err = new Error(result.message || 'Não autorizado (Token inválido).');
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  if (result.status !== 'success') {
    throw new Error(result.message || 'Erro ao carregar dados do Google Sheets.');
  }

  const assets = Array.isArray(result.assets)
    ? result.assets.map(normalizeAsset).filter(Boolean)
    : [];

  const historico = Array.isArray(result.historico)
    ? result.historico.map(normalizeHistoricoItem).filter(Boolean)
    : [];

  const parsedDolar = parseFloat(String(result.dolar || '5.00').replace(',', '.'));
  const dolar = Number.isFinite(parsedDolar) && parsedDolar > 0 ? parsedDolar : 5.0;

  return {
    version: result.version || 'JVAS11',
    assets,
    historico,
    dolar
  };
}

/**
 * Envia comando de mutação via POST autenticado sem disparar preflight CORS
 * @param {string} action
 * @param {Object} data
 * @returns {Promise<Object>}
 */
async function apiPostAction(action, data = {}) {
  const token = getAuthToken();
  if (!token) {
    if (typeof lockSession === 'function') {
      lockSession('Sessão expirada. Autentique-se novamente.');
    }
    throw new Error('Sessão não autenticada.');
  }

  if (typeof setSyncStatus === 'function') {
    setSyncStatus('syncing');
  }

  try {
    const payload = {
      token,
      action,
      ...data
    };

    // Sem header Content-Type: application/json para evitar preflight OPTIONS no Apps Script
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
      credentials: 'omit'
    });

    const result = await response.json();

    if (isUnauthorizedResponse(result)) {
      if (typeof lockSession === 'function') {
        lockSession('Sessão bloqueada: Token recusado pelo servidor.');
      }
      const err = new Error(result.message || 'Não autorizado.');
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    if (result.status === 'success') {
      if (typeof setSyncStatus === 'function') {
        setSyncStatus('online');
      }
      return result;
    } else {
      throw new Error(result.message || `Falha na ação ${action}`);
    }
  } catch (err) {
    if (err.code !== 'UNAUTHORIZED') {
      console.error(`Erro no POST [${action}]:`, err);
      if (typeof setSyncStatus === 'function') {
        setSyncStatus('offline');
      }
      if (typeof showToast === 'function') {
        showToast('Alteração aplicada localmente, mas falhou ao sincronizar no Sheets.', 'error');
      }
    }
    throw err;
  }
}

/**
 * Helpers semânticos para as 6 ações do Contrato de API
 */
function apiUpdateField(ticker, field, value) {
  return apiPostAction('updateField', { ticker, field, value });
}

function apiUpdateAsset(asset) {
  return apiPostAction('updateAsset', { asset });
}

function apiUpdateRendaFixa(ticker, saldoAtual, custoTotal) {
  return apiPostAction('updateRendaFixa', { ticker, saldoAtual, custoTotal });
}

function apiRegisterBuy({ ticker, tipo, qtdAdquirida, precoPago, novaQtd, novoPm, valorAporteRF, novoSaldoRF }) {
  return apiPostAction('registerBuy', {
    ticker,
    tipo,
    qtdAdquirida,
    precoPago,
    novaQtd,
    novoPm,
    valorAporteRF,
    novoSaldoRF
  });
}

function apiAddAsset(asset) {
  return apiPostAction('addAsset', { asset });
}

function apiDeleteAsset(ticker) {
  return apiPostAction('deleteAsset', { ticker });
}
