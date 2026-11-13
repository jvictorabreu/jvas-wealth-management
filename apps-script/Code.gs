/**
 * JVAS11 - BACKEND GOOGLE APPS SCRIPT (v2.0 - Blindado)
 * API JSON autenticada via API_TOKEN em ScriptProperties
 */

const SCRIPT_VERSION = "2.0";

const COLUNAS = {
  Ticker: 1, Empresa: 2, Setor: 3, Tipo: 4, Bloco: 5,
  Qtd: 6, Preco: 7, PM: 8, PesoMeta: 9, Acao: 10, Fundamentos: 11
};

// ==========================================
// VALIDAÇÃO DE SEGURANÇA (PORTEIRO)
// ==========================================
function isAuthorized(tokenRecebido) {
  const tokenEsperado = PropertiesService.getScriptProperties().getProperty("API_TOKEN");
  if (!tokenEsperado) return false; // Bloqueia tudo se a propriedade não estiver configurada
  return String(tokenRecebido || "").trim() === String(tokenEsperado).trim();
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// 1. ENDPOINT GET (Leitura Autenticada)
// ==========================================
function doGet(e) {
  try {
    const token = e && e.parameter ? e.parameter.token : "";
    if (!isAuthorized(token)) {
      return jsonResponse({ status: "unauthorized", message: "Chave de acesso inválida ou ausente." });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetCarteira = ss.getSheetByName("Carteira");
    const sheetMeta = ss.getSheetByName("Metadados");
    const sheetHist = ss.getSheetByName("HistoricoAportes");

    // Lê Dólar (mantém leitura da fórmula GOOGLEFINANCE em Metadados!B1)
    let dolar = 5.64;
    if (sheetMeta) {
      dolar = parseFloat(sheetMeta.getRange("B1").getValue()) || 5.64;
    }

    // Lê Carteira
    const data = sheetCarteira.getDataRange().getValues();
    const assets = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;
      assets.push({
        ticker: String(row[0]).trim(),
        empresa: String(row[1] || "").trim(),
        setor: String(row[2] || "").trim(),
        tipo: String(row[3] || "").trim(),
        bloco: String(row[4] || "").trim(),
        qtd: parseFloat(row[5]) || 0,
        preco: parseFloat(row[6]) || 0,
        pm: parseFloat(row[7]) || 0,
        pesoMeta: parseFloat(row[8]) || 0,
        acao: String(row[9] || "manter").trim(),
        fundamentos: String(row[10] || "positivo").trim()
      });
    }

    // Lê Histórico de Aportes
    const historico = [];
    if (sheetHist && sheetHist.getLastRow() > 1) {
      const histData = sheetHist.getDataRange().getValues();
      for (let i = 1; i < histData.length; i++) {
        const hRow = histData[i];
        if (!hRow[1]) continue;
        historico.push({
          data: hRow[0] instanceof Date ? hRow[0].toISOString() : String(hRow[0]),
          ticker: String(hRow[1]).trim(),
          qtd: parseFloat(hRow[2]) || 0,
          precoPago: parseFloat(hRow[3]) || 0,
          total: parseFloat(hRow[4]) || 0
        });
      }
    }

    return jsonResponse({
      status: "success",
      version: SCRIPT_VERSION,
      assets: assets,
      historico: historico.reverse(), // Mais recentes primeiro
      dolar: dolar
    });
  } catch (error) {
    return jsonResponse({ status: "error", message: error.toString() });
  }
}

// ==========================================
// 2. ENDPOINT POST (Escrita Atômica + LockService)
// ==========================================
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000); // Evita conflitos de escrita simultânea

    const payload = JSON.parse(e.postData.contents);
    if (!isAuthorized(payload.token)) {
      return jsonResponse({ status: "unauthorized", message: "Chave de acesso inválida ou ausente." });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const action = payload.action;

    if (action === "updateField") {
      updateFieldInSheet(ss, payload.ticker, payload.field, payload.value);
    } else if (action === "updateAsset") {
      updateAssetInSheet(ss, payload.asset);
    } else if (action === "updateRendaFixa") {
      updateRendaFixaInSheet(ss, payload.ticker, payload.saldoAtual, payload.custoTotal);
    } else if (action === "registerBuy") {
      registerBuyInSheet(ss, payload);
    } else if (action === "addAsset") {
      addAssetToSheet(ss, payload.asset);
    } else if (action === "deleteAsset") {
      deleteAssetFromSheet(ss, payload.ticker);
    } else {
      return jsonResponse({ status: "error", message: "Ação desconhecida: " + action });
    }

    return jsonResponse({ status: "success" });
  } catch (error) {
    return jsonResponse({ status: "error", message: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

// ==========================================
// FUNÇÕES AUXILIARES DE BANCO DE DADOS
// ==========================================
function getRowIndexByTicker(sheet, ticker) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  const data = sheet.getRange(1, 1, lastRow, 1).getValues();
  const target = String(ticker).trim().toUpperCase();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toUpperCase() === target) {
      return i + 1;
    }
  }
  return -1;
}

function updateFieldInSheet(ss, ticker, field, value) {
  const sheet = ss.getSheetByName("Carteira");
  const rowIndex = getRowIndexByTicker(sheet, ticker);
  if (rowIndex === -1) return;

  const fieldMap = {
    empresa: 2, setor: 3, tipo: 4, bloco: 5,
    qtd: 6, pm: 8, pesoMeta: 9, acao: 10, fundamentos: 11
  };
  if (fieldMap[field]) {
    sheet.getRange(rowIndex, fieldMap[field]).setValue(value);
  }
}

function updateAssetInSheet(ss, asset) {
  const sheet = ss.getSheetByName("Carteira");
  const rowIndex = getRowIndexByTicker(sheet, asset.ticker);
  if (rowIndex === -1) return;

  // Atualiza metadados e posição sem tocar na coluna 7 (Preco Atual / fórmula GOOGLEFINANCE)
  sheet.getRange(rowIndex, 2, 1, 5).setValues([[
    asset.empresa, asset.setor, asset.tipo, asset.bloco, asset.qtd
  ]]);
  sheet.getRange(rowIndex, 8, 1, 4).setValues([[
    asset.pm, asset.pesoMeta, asset.acao, asset.fundamentos
  ]]);

  // Caso seja Renda Fixa e tenha saldo atualizado informado
  if (asset.tipo === "renda_fixa" && typeof asset.preco === "number" && asset.preco > 0) {
    sheet.getRange(rowIndex, COLUNAS.Preco).setValue(asset.preco);
  }
}

function updateRendaFixaInSheet(ss, ticker, saldoAtual, custoTotal) {
  const sheet = ss.getSheetByName("Carteira");
  const rowIndex = getRowIndexByTicker(sheet, ticker || "RENDA_FIXA");
  if (rowIndex === -1) return;

  sheet.getRange(rowIndex, COLUNAS.Qtd).setValue(1);
  if (typeof saldoAtual === "number" && saldoAtual >= 0) {
    sheet.getRange(rowIndex, COLUNAS.Preco).setValue(saldoAtual);
  }
  if (typeof custoTotal === "number" && custoTotal >= 0) {
    sheet.getRange(rowIndex, COLUNAS.PM).setValue(custoTotal);
  }
}

function registerBuyInSheet(ss, payload) {
  const sheetCart = ss.getSheetByName("Carteira");
  const rowIndex = getRowIndexByTicker(sheetCart, payload.ticker);
  const isRF = payload.tipo === "renda_fixa" || payload.ticker === "RENDA_FIXA";

  if (rowIndex !== -1) {
    if (isRF) {
      // Renda fixa opera por saldo financeiro (Qtd permanece 1)
      sheetCart.getRange(rowIndex, COLUNAS.Qtd).setValue(1);
      sheetCart.getRange(rowIndex, COLUNAS.Preco).setValue(payload.novoSaldoRF);
      sheetCart.getRange(rowIndex, COLUNAS.PM).setValue(payload.novoPm);
    } else {
      sheetCart.getRange(rowIndex, COLUNAS.Qtd).setValue(payload.novaQtd);
      sheetCart.getRange(rowIndex, COLUNAS.PM).setValue(payload.novoPm);
    }
  }

  const sheetHist = ss.getSheetByName("HistoricoAportes");
  const qtdHist = isRF ? 1 : payload.qtdAdquirida;
  const precoHist = isRF ? payload.valorAporteRF : payload.precoPago;
  const totalHist = qtdHist * precoHist;

  sheetHist.appendRow([
    new Date(),
    payload.ticker,
    qtdHist,
    precoHist,
    totalHist
  ]);
}

function addAssetToSheet(ss, asset) {
  const sheet = ss.getSheetByName("Carteira");
  const isRF = asset.tipo === "renda_fixa" || asset.bloco === "Renda Fixa";
  const row = [
    asset.ticker, asset.empresa, asset.setor, asset.tipo, asset.bloco,
    isRF ? 1 : asset.qtd,
    "",
    asset.pm, asset.pesoMeta, asset.acao, asset.fundamentos
  ];
  sheet.appendRow(row);

  const lastRow = sheet.getLastRow();
  if (isRF) {
    sheet.getRange(lastRow, COLUNAS.Preco).setValue(asset.preco || asset.pm || 0);
  } else {
    const blocosB3 = ["BR", "FII", "BDR", "ETF"];
    const formula = blocosB3.includes(asset.bloco)
      ? `=IFERROR(GOOGLEFINANCE("BVMF:"&A${lastRow}); 0)`
      : `=IFERROR(GOOGLEFINANCE(A${lastRow}); 0)`;
    sheet.getRange(lastRow, COLUNAS.Preco).setFormula(formula);
  }
}

function deleteAssetFromSheet(ss, ticker) {
  const sheet = ss.getSheetByName("Carteira");
  const rowIndex = getRowIndexByTicker(sheet, ticker);
  if (rowIndex !== -1) {
    sheet.deleteRow(rowIndex);
  }
}