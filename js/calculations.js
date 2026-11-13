/**
 * JVAS Wealth Management (JVAS11)
 * Motor Financeiro Puro: Câmbio, KPIs Executivos, IQC (4 Pilares),
 * Matriz de Rebalanceamento Macro e Algoritmo Multicritério de Aportes
 */

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function isUSD(asset) {
  return Boolean(asset && asset.bloco === 'Internacional');
}

function isRendaFixa(asset) {
  if (!asset) return false;
  const t = String(asset.tipo || '').toLowerCase();
  const b = String(asset.bloco || '').toLowerCase();
  return t === 'renda_fixa' || b === 'renda fixa' || b === 'renda_fixa';
}

function calcValorMoeda(asset) {
  if (!asset) return 0;
  const qtd = Number(asset.qtd) || 0;
  const preco = Number(asset.preco) || 0;
  if (isRendaFixa(asset)) {
    return qtd > 0 ? qtd * preco : preco;
  }
  return qtd * preco;
}

function calcCustoMoeda(asset) {
  if (!asset) return 0;
  const qtd = Number(asset.qtd) || 0;
  const pm = Number(asset.pm) || 0;
  if (isRendaFixa(asset)) {
    return qtd > 0 ? qtd * pm : pm;
  }
  return qtd * pm;
}

function calcValorBRL(asset, dolarRate) {
  const rate = Number(dolarRate) > 0 ? Number(dolarRate) : 5.0;
  const val = calcValorMoeda(asset);
  return isUSD(asset) ? val * rate : val;
}

function calcCustoBRL(asset, dolarRate) {
  const rate = Number(dolarRate) > 0 ? Number(dolarRate) : 5.0;
  const cost = calcCustoMoeda(asset);
  return isUSD(asset) ? cost * rate : cost;
}

function calcResultadoMoeda(asset) {
  if (!asset || !(Number(asset.pm) > 0)) return 0;
  return calcValorMoeda(asset) - calcCustoMoeda(asset);
}

function calcResultadoBRL(asset, dolarRate) {
  if (!asset || !(Number(asset.pm) > 0)) return 0;
  return calcValorBRL(asset, dolarRate) - calcCustoBRL(asset, dolarRate);
}

function calcRentabilidadeAtivoPct(asset) {
  if (!asset) return 0;
  const pm = Number(asset.pm) || 0;
  const preco = Number(asset.preco) || 0;
  if (pm <= 0 || preco <= 0) return 0;
  return ((preco - pm) / pm) * 100;
}

function calcTotalValorBRL(assetList, dolarRate) {
  if (!Array.isArray(assetList)) return 0;
  return assetList.reduce((sum, a) => sum + calcValorBRL(a, dolarRate), 0);
}

function calcPesoReal(asset, totalValorBRL, dolarRate) {
  const tv = totalValorBRL !== null && totalValorBRL !== undefined
    ? totalValorBRL
    : calcTotalValorBRL(window.assets || [], dolarRate);
  if (tv <= 0) return 0;
  return (calcValorBRL(asset, dolarRate) / tv) * 100;
}

function calcSomaMetas(assetList) {
  if (!Array.isArray(assetList)) return 0;
  return assetList.reduce((sum, a) => sum + (Number(a.pesoMeta) || 0), 0);
}

/**
 * Calcula todos os 8 Cards Executivos (Tela 1) e os 5 Cards de Resumo (Tela 2)
 */
function calcPortfolioKPIs(assetList, dolarRate) {
  const list = Array.isArray(assetList) ? assetList : [];
  const rate = Number(dolarRate) > 0 ? Number(dolarRate) : 5.0;

  const tvBRL = calcTotalValorBRL(list, rate);
  const tvUSD = tvBRL / rate;
  const tcBRL = list.reduce((sum, a) => sum + calcCustoBRL(a, rate), 0);

  // Card 2: Internacional
  const intlAssets = list.filter(a => isUSD(a));
  const intlUSD = intlAssets.reduce((sum, a) => sum + calcValorMoeda(a), 0);
  const intlBRL = intlUSD * rate;
  const intlPct = tvBRL > 0 ? (intlBRL / tvBRL) * 100 : 0;

  // Card 3: Renda Fixa / Liquidez
  const rfAssets = list.filter(a => isRendaFixa(a));
  const rfBRL = rfAssets.reduce((sum, a) => sum + calcValorBRL(a, rate), 0);
  const rfCostBRL = rfAssets.reduce((sum, a) => sum + calcCustoBRL(a, rate), 0);
  const rfProfitBRL = rfAssets.reduce((sum, a) => sum + calcResultadoBRL(a, rate), 0);
  const rfProfitPct = rfCostBRL > 0 ? (rfProfitBRL / rfCostBRL) * 100 : 0;
  const rfSharePct = tvBRL > 0 ? (rfBRL / tvBRL) * 100 : 0;

  // Card 4: Renda Variável Total
  const rvAssets = list.filter(a => !isRendaFixa(a));
  const rvBRL = rvAssets.reduce((sum, a) => sum + calcValorBRL(a, rate), 0);
  const rvUSD = rvBRL / rate;
  const rvCostBRL = rvAssets.reduce((sum, a) => sum + calcCustoBRL(a, rate), 0);
  const rvProfitBRL = rvAssets.reduce((sum, a) => sum + calcResultadoBRL(a, rate), 0);
  const rvProfitPct = rvCostBRL > 0 ? (rvProfitBRL / rvCostBRL) * 100 : 0;
  const rvSharePct = tvBRL > 0 ? (rvBRL / tvBRL) * 100 : 0;

  // Card 5: P/L Aberto Consolidado (ativos com pm > 0)
  const assetsWithPM = list.filter(a => (Number(a.pm) || 0) > 0 && (Number(a.qtd) || 0) > 0);
  const plValorBRL = assetsWithPM.reduce((sum, a) => sum + calcValorBRL(a, rate), 0);
  const plCustoBRL = assetsWithPM.reduce((sum, a) => sum + calcCustoBRL(a, rate), 0);
  const plAbertoBRL = plValorBRL - plCustoBRL;
  const plAbertoPct = plCustoBRL > 0 ? (plAbertoBRL / plCustoBRL) * 100 : 0;

  // Card 6: Exposição Cambial (Moeda Forte vs. BRL)
  // Dolarização Direta = Internacional
  // Dolarização Indireta B3 = BDR + ETF local (não Internacional)
  // Exposição Doméstica BRL = BR + FII + Renda Fixa (restante doméstico)
  const dolDiretaBRL = intlBRL;
  const dolIndiretaBRL = list
    .filter(a => !isUSD(a) && (a.bloco === 'BDR' || a.tipo === 'bdr' || a.bloco === 'ETF' || a.tipo === 'etf'))
    .reduce((sum, a) => sum + calcValorBRL(a, rate), 0);
  const moedaForteBRL = dolDiretaBRL + dolIndiretaBRL;
  const domesticaBRL = Math.max(0, tvBRL - moedaForteBRL);

  const dolDiretaPct = tvBRL > 0 ? (dolDiretaBRL / tvBRL) * 100 : 0;
  const dolIndiretaPct = tvBRL > 0 ? (dolIndiretaBRL / tvBRL) * 100 : 0;
  const moedaFortePct = dolDiretaPct + dolIndiretaPct;
  const domesticaPct = tvBRL > 0 ? (domesticaBRL / tvBRL) * 100 : 0;

  // Card 7: Saúde Estratégica (Alvo vs. Legado)
  // Ativos do Plano (pesoMeta > 0) vs. Ativos Fora da Meta / Legado (pesoMeta === 0 ou acao !== 'aportar')
  const ativosEmCarteira = list.filter(a => calcValorBRL(a, rate) > 0);
  const planoAssets = ativosEmCarteira.filter(a => (Number(a.pesoMeta) || 0) > 0);
  const legadoZeroMetaAssets = ativosEmCarteira.filter(a => (Number(a.pesoMeta) || 0) <= 0);
  const transicaoAssets = ativosEmCarteira.filter(
    a => (Number(a.pesoMeta) || 0) <= 0 || String(a.acao || '').toLowerCase() !== 'aportar'
  );

  const capitalPlanoBRL = planoAssets.reduce((sum, a) => sum + calcValorBRL(a, rate), 0);
  const capitalPlanoPct = tvBRL > 0 ? (capitalPlanoBRL / tvBRL) * 100 : 0;

  const capitalLegadoBRL = legadoZeroMetaAssets.reduce((sum, a) => sum + calcValorBRL(a, rate), 0);
  const capitalLegadoPct = tvBRL > 0 ? (capitalLegadoBRL / tvBRL) * 100 : 0;

  const capitalTransicaoBRL = transicaoAssets.reduce((sum, a) => sum + calcValorBRL(a, rate), 0);
  const capitalTransicaoPct = tvBRL > 0 ? (capitalTransicaoBRL / tvBRL) * 100 : 0;

  // Card 8: Destaques da Carteira
  // 1. Maior Posição Atual (Ticker + %)
  let maiorPosicao = { ticker: '—', pct: 0, valorBRL: 0 };
  if (ativosEmCarteira.length > 0 && tvBRL > 0) {
    const sortedByWeight = [...ativosEmCarteira].sort(
      (a, b) => calcValorBRL(b, rate) - calcValorBRL(a, rate)
    );
    const top = sortedByWeight[0];
    maiorPosicao = {
      ticker: top.ticker,
      pct: calcPesoReal(top, tvBRL, rate),
      valorBRL: calcValorBRL(top, rate)
    };
  }

  // 2. Maior Valorização sobre PM (Ticker + %)
  let maiorValorizacao = { ticker: '—', pct: 0 };
  const ativosComCotacaoEPM = ativosEmCarteira.filter(
    a => (Number(a.pm) || 0) > 0 && (Number(a.preco) || 0) > 0
  );
  if (ativosComCotacaoEPM.length > 0) {
    const sortedByRent = [...ativosComCotacaoEPM].sort(
      (a, b) => calcRentabilidadeAtivoPct(b) - calcRentabilidadeAtivoPct(a)
    );
    const best = sortedByRent[0];
    maiorValorizacao = {
      ticker: best.ticker,
      pct: calcRentabilidadeAtivoPct(best)
    };
  }

  // 3. Maior Gap de Aporte (Ticker + Gap %)
  let maiorGap = { ticker: '—', gapPct: 0 };
  const ativosComMeta = list.filter(a => (Number(a.pesoMeta) || 0) > 0);
  if (ativosComMeta.length > 0) {
    const sortedByGap = [...ativosComMeta].sort((a, b) => {
      const gapA = (Number(a.pesoMeta) || 0) - calcPesoReal(a, tvBRL, rate);
      const gapB = (Number(b.pesoMeta) || 0) - calcPesoReal(b, tvBRL, rate);
      return gapB - gapA;
    });
    const topGap = sortedByGap[0];
    maiorGap = {
      ticker: topGap.ticker,
      gapPct: (Number(topGap.pesoMeta) || 0) - calcPesoReal(topGap, tvBRL, rate)
    };
  }

  return {
    tvBRL,
    tvUSD,
    tcBRL,
    intlUSD,
    intlBRL,
    intlPct,
    rfBRL,
    rfCostBRL,
    rfProfitBRL,
    rfProfitPct,
    rfSharePct,
    rvBRL,
    rvUSD,
    rvCostBRL,
    rvProfitBRL,
    rvProfitPct,
    rvSharePct,
    plAbertoBRL,
    plAbertoPct,
    plCustoBRL,
    dolDiretaBRL,
    dolDiretaPct,
    dolIndiretaBRL,
    dolIndiretaPct,
    moedaForteBRL,
    moedaFortePct,
    domesticaBRL,
    domesticaPct,
    capitalPlanoBRL,
    capitalPlanoPct,
    capitalLegadoBRL,
    capitalLegadoPct,
    capitalTransicaoBRL,
    capitalTransicaoPct,
    countTransicao: transicaoAssets.length,
    countLegadoZeroMeta: legadoZeroMetaAssets.length,
    maiorPosicao,
    maiorValorizacao,
    maiorGap
  };
}

/**
 * Calcula o Índice de Qualidade da Carteira (IQC - 0 a 100 pts) nos 4 Pilares
 */
function calcIQC(assetList, dolarRate) {
  const list = Array.isArray(assetList) ? assetList : [];
  const rate = Number(dolarRate) > 0 ? Number(dolarRate) : 5.0;
  const tvBRL = calcTotalValorBRL(list, rate);

  if (tvBRL <= 0 || list.length === 0) {
    return {
      hasData: false,
      scoreTotal: 0,
      notaAderencia: 0,
      notaDiv: 0,
      notaConc: 0,
      notaExp: 0,
      classification: 'Sem Dados',
      colorVar: 'var(--text-muted)',
      strengths: [],
      improvements: [
        { icon: 'alertTriangle', title: 'Carteira Vazia', text: 'Adicione ativos com saldo positivo para calcular o IQC.' }
      ],
      details: {}
    };
  }

  // Pilar 1: Aderência à Estratégia (35%)
  // somaDesvios = Σ |pesoReal - pesoMeta|; notaAderencia = clamp(100 - (somaDesvios / 2), 0, 100)
  let somaDesvios = 0;
  list.forEach(a => {
    const pReal = calcPesoReal(a, tvBRL, rate);
    const pMeta = Number(a.pesoMeta) || 0;
    somaDesvios += Math.abs(pReal - pMeta);
  });
  const notaAderencia = clamp(100 - (somaDesvios / 2), 0, 100);

  // Pilar 2: Diversificação Global (30%)
  // Considera ativos com valorBRL > 0. Média de 4 sub-notas (0-100):
  // Setores: ((setoresUnicos + Math.min(4, numEtfs * 2)) / 12 * 100)
  // Classes: (classesUnicas / 5 * 100)
  // Blocos: (blocosUnicos / 4 * 100)
  // Volume: ((ativosAtivos.length + Math.min(10, numEtfs * 5)) / 20 * 100)
  const ativosAtivos = list.filter(a => calcValorBRL(a, rate) > 0);
  const numEtfs = ativosAtivos.filter(a => String(a.tipo || '').toLowerCase() === 'etf').length;

  const setoresUnicos = new Set(
    ativosAtivos.map(a => String(a.setor || '').trim().toLowerCase()).filter(Boolean)
  ).size;
  const classesUnicas = new Set(
    ativosAtivos.map(a => String(a.tipo || '').trim().toLowerCase()).filter(Boolean)
  ).size;
  const blocosUnicos = new Set(
    ativosAtivos.map(a => String(a.bloco || '').trim().toLowerCase()).filter(Boolean)
  ).size;

  const setoresEfetivos = setoresUnicos + Math.min(4, numEtfs * 2);
  const volumeEfetivo = ativosAtivos.length + Math.min(10, numEtfs * 5);

  const nSet = clamp((setoresEfetivos / 12) * 100, 0, 100);
  const nCls = clamp((classesUnicas / 5) * 100, 0, 100);
  const nBlc = clamp((blocosUnicos / 4) * 100, 0, 100);
  const nVol = clamp((volumeEfetivo / 20) * 100, 0, 100);

  const notaDiv = clamp((nSet + nCls + nBlc + nVol) / 4, 0, 100);

  // Pilar 3: Concentração de Risco (20%)
  // Ativos individuais de risco (exclui etf e renda_fixa): penaliza se Top 1 > 8%, Top 5 > 30% ou Top 10 > 55% (peso 70%)
  // ETFs individuais (tipo === 'etf'): penaliza apenas se um único ETF ultrapassar 25% do patrimônio total (peso 30%)
  // Nota: renda_fixa não sofre penalidade de risco de ruína.
  const riscoAtivos = ativosAtivos.filter(
    a => String(a.tipo || '').toLowerCase() !== 'etf' && !isRendaFixa(a)
  );
  const etfAtivos = ativosAtivos.filter(
    a => String(a.tipo || '').toLowerCase() === 'etf'
  );

  const pesosRisco = riscoAtivos
    .map(a => calcPesoReal(a, tvBRL, rate))
    .sort((a, b) => b - a);

  const top1 = pesosRisco[0] || 0;
  const top5 = pesosRisco.slice(0, 5).reduce((s, v) => s + v, 0);
  const top10 = pesosRisco.slice(0, 10).reduce((s, v) => s + v, 0);

  const notaTop1 = clamp(100 - Math.max(0, top1 - 8) * (100 / (100 - 8)), 0, 100);
  const notaTop5 = clamp(100 - Math.max(0, top5 - 30) * (100 / (100 - 30)), 0, 100);
  const notaTop10 = clamp(100 - Math.max(0, top10 - 55) * (100 / (100 - 55)), 0, 100);
  const notaRisco = (notaTop1 + notaTop5 + notaTop10) / 3;

  let excessoEtf = 0;
  etfAtivos.forEach(a => {
    const p = calcPesoReal(a, tvBRL, rate);
    if (p > 25) excessoEtf += (p - 25);
  });
  const notaEtf = clamp(100 - (excessoEtf * (100 / 75)), 0, 100);

  const notaConc = clamp((notaRisco * 0.7) + (notaEtf * 0.3), 0, 100);

  // Pilar 4: Exposição Internacional (15%)
  // Escala progressiva linear por faixas do % Internacional:
  // 0%->0 pts, 15%->30 pts, 30%->60 pts, 43%->85 pts, >=55%->100 pts
  const valIntl = ativosAtivos
    .filter(a => isUSD(a))
    .reduce((s, a) => s + calcValorBRL(a, rate), 0);
  const expPct = (valIntl / tvBRL) * 100;

  let notaExp = 0;
  if (expPct <= 0) notaExp = 0;
  else if (expPct <= 15) notaExp = expPct * (30 / 15);
  else if (expPct <= 30) notaExp = 30 + (expPct - 15) * (30 / 15);
  else if (expPct <= 43) notaExp = 60 + (expPct - 30) * (25 / 13);
  else if (expPct < 55) notaExp = 85 + (expPct - 43) * (15 / 12);
  else notaExp = 100;
  notaExp = clamp(notaExp, 0, 100);

  // Nota Final Ponderada
  const scoreTotal = clamp(
    (notaAderencia * 0.35) +
    (notaDiv * 0.30) +
    (notaConc * 0.20) +
    (notaExp * 0.15),
    0,
    100
  );

  let classification = 'Excelente';
  let colorVar = 'var(--green)';
  if (scoreTotal < 60) {
    classification = 'Necessita Ajustes';
    colorVar = 'var(--red)';
  } else if (scoreTotal < 70) {
    classification = 'Regular';
    colorVar = 'var(--yellow)';
  } else if (scoreTotal < 80) {
    classification = 'Boa';
    colorVar = 'var(--teal)';
  } else if (scoreTotal < 90) {
    classification = 'Muito Boa';
    colorVar = 'var(--blue)';
  }

  // Insights Automáticos com Ícones SVG (Sem Emojis)
  const strengths = [];
  const improvements = [];

  if (notaAderencia >= 75) {
    strengths.push({
      icon: 'target',
      title: 'Aderência',
      text: 'Portfólio bem alinhado à estratégia. Desvios em relação às metas sob controle.'
    });
  } else if (notaAderencia <= 65) {
    improvements.push({
      icon: 'alertTriangle',
      title: 'Aderência',
      text: 'Alto desvio acumulado em relação às metas. Priorize aportes nos ativos defasados.'
    });
  }

  if (notaDiv >= 75) {
    strengths.push({
      icon: 'globe',
      title: 'Diversificação',
      text: 'Estrutura robusta com boa distribuição entre setores, classes e blocos.'
    });
  } else if (notaDiv <= 65) {
    improvements.push({
      icon: 'layers',
      title: 'Diversificação',
      text: 'Amplie a pluralidade de setores, classes ou ETFs para elevar a proteção cruzada.'
    });
  }

  if (notaConc >= 75) {
    strengths.push({
      icon: 'scale',
      title: 'Concentração',
      text: 'Risco diluído adequadamente. Nenhuma dependência excessiva em tese isolada.'
    });
  } else if (notaConc <= 65) {
    improvements.push({
      icon: 'flame',
      title: 'Concentração',
      text: 'Posições individuais de risco pesando acima dos limites prudenciais (Top 1/5/10).'
    });
  }

  if (notaExp >= 80) {
    strengths.push({
      icon: 'currency',
      title: 'Exposição Global',
      text: 'Forte proteção cambial em moeda forte mitigando o risco-país doméstico.'
    });
  } else if (notaExp <= 65) {
    improvements.push({
      icon: 'compass',
      title: 'Exposição Global',
      text: 'Baixa participação internacional na carteira atual, elevando a exposição ao risco local.'
    });
  }

  return {
    hasData: true,
    scoreTotal,
    notaAderencia,
    notaDiv,
    notaConc,
    notaExp,
    classification,
    colorVar,
    strengths,
    improvements,
    details: {
      somaDesvios,
      setoresUnicos,
      setoresEfetivos,
      classesUnicas,
      blocosUnicos,
      volumeEfetivo,
      numEtfs,
      top1,
      top5,
      top10,
      expPct
    }
  };
}

/**
 * Calcula a Alocação Patrimonial e Matriz de Rebalanceamento Macro (por Bloco e por Classe)
 */
function calcMacroAllocations(assetList, dolarRate) {
  const list = Array.isArray(assetList) ? assetList : [];
  const rate = Number(dolarRate) > 0 ? Number(dolarRate) : 5.0;
  const tvBRL = calcTotalValorBRL(list, rate);

  // Mapa de Blocos (inclui os 6 blocos padrão + eventuais extras)
  const blocosMap = {};
  BLOCO_ORDER.forEach(b => {
    const meta = getBlocoMeta(b);
    blocosMap[b] = {
      bloco: b,
      label: meta.label,
      color: meta.color,
      valorBRL: 0,
      atualPct: 0,
      metaPct: 0,
      gapPct: 0,
      gapBRL: 0,
      count: 0
    };
  });

  // Mapa de Classes
  const tiposMap = {};
  TIPO_ORDER.forEach(t => {
    const meta = getTipoMeta(t);
    tiposMap[t] = {
      tipo: t,
      label: meta.label,
      color: meta.color,
      valorBRL: 0,
      atualPct: 0,
      metaPct: 0,
      count: 0
    };
  });

  list.forEach(a => {
    const val = calcValorBRL(a, rate);
    const pMeta = Number(a.pesoMeta) || 0;
    const bKey = a.bloco || 'BR';
    const tKey = String(a.tipo || 'acao').toLowerCase();

    if (!blocosMap[bKey]) {
      const bMeta = getBlocoMeta(bKey);
      blocosMap[bKey] = {
        bloco: bKey,
        label: bMeta.label,
        color: bMeta.color,
        valorBRL: 0,
        atualPct: 0,
        metaPct: 0,
        gapPct: 0,
        gapBRL: 0,
        count: 0
      };
    }
    blocosMap[bKey].valorBRL += val;
    blocosMap[bKey].metaPct += pMeta;
    if (val > 0 || pMeta > 0) blocosMap[bKey].count += 1;

    if (!tiposMap[tKey]) {
      const tMeta = getTipoMeta(tKey);
      tiposMap[tKey] = {
        tipo: tKey,
        label: tMeta.label,
        color: tMeta.color,
        valorBRL: 0,
        atualPct: 0,
        metaPct: 0,
        count: 0
      };
    }
    tiposMap[tKey].valorBRL += val;
    tiposMap[tKey].metaPct += pMeta;
    if (val > 0) tiposMap[tKey].count += 1;
  });

  const byBloco = Object.values(blocosMap)
    .filter(item => item.valorBRL > 0 || item.metaPct > 0 || BLOCO_ORDER.includes(item.bloco))
    .map(item => {
      const atualPct = tvBRL > 0 ? (item.valorBRL / tvBRL) * 100 : 0;
      // Gap: Atual % - Meta % (negativo significa abaixo da meta / precisa de aporte)
      const deltaPct = atualPct - item.metaPct;
      const alvoBRL = (item.metaPct / 100) * tvBRL;
      const gapBRL = item.valorBRL - alvoBRL;
      return {
        ...item,
        atualPct,
        deltaPct,
        alvoBRL,
        gapBRL
      };
    })
    .sort((a, b) => (b.valorBRL - a.valorBRL) || (b.metaPct - a.metaPct));

  const byTipo = Object.values(tiposMap)
    .filter(item => item.valorBRL > 0 || item.metaPct > 0 || TIPO_ORDER.includes(item.tipo))
    .map(item => {
      const atualPct = tvBRL > 0 ? (item.valorBRL / tvBRL) * 100 : 0;
      return {
        ...item,
        atualPct
      };
    })
    .sort((a, b) => (b.valorBRL - a.valorBRL) || (b.metaPct - a.metaPct));

  return { tvBRL, byBloco, byTipo };
}

/**
 * Motor Multicritério de Sugestão Inteligente de Aporte (Tela 3)
 * Pesos Exatos:
 * - C1: Gap do Bloco (30 pts)
 * - C2: Gap do Ativo (42 pts)
 * - C3: Penalização Quadrática por Excesso (20 pts)
 * - C4: Delta vs. Preço Médio (8 pts)
 * Regra Especial de Cotas:
 * - Renda Fixa: Aporte direto em R$ (sobra = R$ 0,00)
 * - Demais: Math.floor(valorDisponivelMoeda / preco)
 */
function calcSmartAporte({ currency = 'BRL', rawValue = 0, maxAssets = 3, blocoFiltro = 'todos' }, assetList, dolarRate) {
  const list = Array.isArray(assetList) ? assetList : [];
  const rate = Number(dolarRate) > 0 ? Number(dolarRate) : 5.0;
  const valInput = Number(rawValue) || 0;
  const maxN = clamp(parseInt(maxAssets, 10) || 3, 1, 10);

  if (valInput <= 0) {
    return { status: 'invalid_value', message: 'Insira um valor de aporte maior que zero.' };
  }

  const valorAporteBRL = currency === 'USD' ? valInput * rate : valInput;
  const valorAporteUSD = currency === 'USD' ? valInput : valInput / rate;
  const tvBRL = calcTotalValorBRL(list, rate);

  // Consolida pesos por bloco
  const blocos = {};
  list.forEach(a => {
    const b = a.bloco || 'BR';
    if (!blocos[b]) blocos[b] = { meta: 0, atual: 0 };
    blocos[b].meta += (Number(a.pesoMeta) || 0);
    blocos[b].atual += calcPesoReal(a, tvBRL, rate);
  });

  // Elegíveis: acao.toLowerCase() === 'aportar' e pesoMeta > 0
  let elegiveis = list
    .map((a, idx) => ({ ...a, _originalIdx: idx }))
    .filter(a => String(a.acao || '').toLowerCase() === 'aportar' && (Number(a.pesoMeta) || 0) > 0);

  if (blocoFiltro && blocoFiltro !== 'todos') {
    elegiveis = elegiveis.filter(a => a.bloco === blocoFiltro);
  }

  if (elegiveis.length === 0) {
    return {
      status: 'no_eligible',
      message: 'Não há ativos marcados com recomendação "Aportar" e Meta > 0% para o filtro selecionado.'
    };
  }

  let ranqueados = elegiveis.map(a => {
    const bInfo = blocos[a.bloco] || { meta: 0, atual: 0 };
    const pReal = calcPesoReal(a, tvBRL, rate);
    const pMeta = Number(a.pesoMeta) || 0;
    const pm = Number(a.pm) || 0;
    const preco = Number(a.preco) || 0;

    // C1 — Gap do Bloco (30 pts): clamp((metaBloco - atualBloco) / metaBloco, 0, 1) * 30
    const scoreBloco = bInfo.meta > 0
      ? clamp((bInfo.meta - bInfo.atual) / bInfo.meta, 0, 1)
      : 0;
    const ptBloco = scoreBloco * 30;

    // C2 — Gap do Ativo (42 pts): clamp((pesoMeta - pesoReal) / pesoMeta, 0, 1) * 42
    const gapAtivo = pMeta - pReal;
    const scoreAtivo = pMeta > 0
      ? clamp((pMeta - pReal) / pMeta, 0, 1)
      : 0;
    const ptAtivo = scoreAtivo * 42;

    // C3 — Penalização Quadrática por Excesso (20 pts):
    // Se pesoReal > pesoMeta, max(0, 1 - min(1, (pesoReal - pesoMeta) / pesoMeta)^2) * 20; senão 20
    let scoreExcesso = 1;
    if (pReal > pMeta && pMeta > 0) {
      const excessoRel = Math.min(1, (pReal - pMeta) / pMeta);
      scoreExcesso = Math.max(0, 1 - Math.pow(excessoRel, 2));
    }
    const ptExcesso = scoreExcesso * 20;

    // C4 — Delta vs. Preço Médio (8 pts):
    // Se pm > 0 && preco > 0, clamp(0.5 + ((pm - preco) / pm), 0, 1) * 8; senão 4
    let ptPM = 4;
    if (pm > 0 && preco > 0) {
      const scoreDelta = clamp(0.5 + ((pm - preco) / pm), 0, 1);
      ptPM = scoreDelta * 8;
    }

    const scoreTotal = clamp(ptBloco + ptAtivo + ptExcesso + ptPM, 0, 100);

    return {
      ativo: a,
      originalIdx: a._originalIdx,
      ptBloco,
      ptAtivo,
      ptExcesso,
      ptPM,
      scoreTotal,
      pReal,
      pMeta,
      gapAtivo,
      gapBloco: bInfo.meta - bInfo.atual
    };
  });

  ranqueados = ranqueados.filter(r => r.scoreTotal > 0);
  ranqueados.sort((a, b) => b.scoreTotal - a.scoreTotal);

  const topN = ranqueados.slice(0, maxN);
  if (topN.length === 0) {
    return {
      status: 'no_valid_score',
      message: 'Todos os ativos avaliados pontuaram zero pelas regras de teto e penalizações.'
    };
  }

  const somaScoreTopN = topN.reduce((acc, r) => acc + r.scoreTotal, 0);

  // Primeira passagem: calcular alocação ideal, cotas, gasto efetivo e sobra por ativo
  let totalAlocadoBRL = 0;

  const items = topN.map((r, idx) => {
    const pesoAlocacao = somaScoreTopN > 0 ? r.scoreTotal / somaScoreTopN : 0;
    const valorDestinadoBRL = valorAporteBRL * pesoAlocacao;
    const ehUSD = isUSD(r.ativo);
    const ehRF = isRendaFixa(r.ativo);
    const preco = Number(r.ativo.preco) || 0;

    const valorDisponivelMoeda = ehUSD ? (valorDestinadoBRL / rate) : valorDestinadoBRL;

    let cotas = 0;
    let financeiroGastoMoeda = 0;
    let sobraMoeda = 0;
    let semCotacao = false;

    if (ehRF) {
      // Regra Especial Renda Fixa: aporte financeiro direto em R$, sem dividir pelo saldo atual
      cotas = 1;
      financeiroGastoMoeda = Math.round(valorDisponivelMoeda * 100) / 100;
      sobraMoeda = 0;
    } else if (preco > 0) {
      cotas = Math.floor(valorDisponivelMoeda / preco);
      financeiroGastoMoeda = cotas * preco;
      sobraMoeda = Math.max(0, valorDisponivelMoeda - financeiroGastoMoeda);
    } else {
      cotas = 0;
      financeiroGastoMoeda = 0;
      sobraMoeda = valorDisponivelMoeda;
      semCotacao = true;
    }

    const financeiroGastoBRL = ehUSD ? financeiroGastoMoeda * rate : financeiroGastoMoeda;
    totalAlocadoBRL += financeiroGastoBRL;

    return {
      ...r,
      rank: idx + 1,
      ehUSD,
      ehRF,
      semCotacao,
      pesoAlocacaoPct: pesoAlocacao * 100,
      valorDestinadoBRL,
      valorDisponivelMoeda,
      cotas,
      financeiroGastoMoeda,
      financeiroGastoBRL,
      sobraMoeda,
      sobraBRL: ehUSD ? sobraMoeda * rate : sobraMoeda
    };
  });

  const novoTvBRL = tvBRL + totalAlocadoBRL;
  const trocoTotalBRL = Math.max(0, valorAporteBRL - totalAlocadoBRL);
  const trocoTotalUSD = trocoTotalBRL / rate;
  const totalAlocadoUSD = totalAlocadoBRL / rate;

  // Segunda passagem: calcular Peso Pós-Aporte % e carteira simulada para o Novo IQC
  const simulatedAssets = list.map(a => ({ ...a }));

  const enrichedItems = items.map(item => {
    const valAtualAtivoBRL = calcValorBRL(item.ativo, rate);
    const valPosAtivoBRL = valAtualAtivoBRL + item.financeiroGastoBRL;
    const pPosAporte = novoTvBRL > 0 ? (valPosAtivoBRL / novoTvBRL) * 100 : item.pReal;

    // Atualiza ativo simulado para projeção do IQC Pós-Aporte
    const simTarget = simulatedAssets[item.originalIdx];
    if (simTarget && item.financeiroGastoMoeda > 0) {
      if (item.ehRF) {
        simTarget.qtd = 1;
        simTarget.preco = (Number(simTarget.preco) || 0) + item.financeiroGastoMoeda;
        simTarget.pm = (Number(simTarget.pm) || 0) + item.financeiroGastoMoeda;
      } else {
        const oldQtd = Number(simTarget.qtd) || 0;
        const oldPm = Number(simTarget.pm) || 0;
        const newQtd = oldQtd + item.cotas;
        simTarget.pm = (oldQtd > 0 && oldPm > 0)
          ? ((oldQtd * oldPm) + (item.cotas * simTarget.preco)) / newQtd
          : simTarget.preco;
        simTarget.qtd = newQtd;
      }
    }

    return {
      ...item,
      pPosAporte
    };
  });

  const iqcAtual = calcIQC(list, rate);
  const iqcPosAporte = calcIQC(simulatedAssets, rate);

  return {
    status: 'ok',
    currency,
    valorPlanejadoBRL: valorAporteBRL,
    valorPlanejadoUSD: valorAporteUSD,
    totalAlocadoBRL,
    totalAlocadoUSD,
    trocoTotalBRL,
    trocoTotalUSD,
    eficienciaAlocacaoPct: valorAporteBRL > 0 ? (totalAlocadoBRL / valorAporteBRL) * 100 : 0,
    iqcAtualScore: iqcAtual.scoreTotal,
    iqcPosScore: iqcPosAporte.scoreTotal,
    iqcDelta: iqcPosAporte.scoreTotal - iqcAtual.scoreTotal,
    iqcPosColor: iqcPosAporte.colorVar,
    iqcPosClass: iqcPosAporte.classification,
    items: enrichedItems
  };
}

/**
 * Consolida KPIs e linhas enriquecidas do Histórico de Aportes (Tela 4)
 */
function calcHistoricoMetrics(historicoList, assetList, dolarRate, filters = {}) {
  const hist = Array.isArray(historicoList) ? historicoList : [];
  const assetsArr = Array.isArray(assetList) ? assetList : [];
  const rate = Number(dolarRate) > 0 ? Number(dolarRate) : 5.0;

  // Mapa rápido por ticker para enriquecer empresa, bloco e moeda
  const assetMap = {};
  assetsArr.forEach(a => {
    assetMap[a.ticker] = a;
  });

  const enriched = hist.map((item, idx) => {
    const linked = assetMap[item.ticker];
    const bloco = item.bloco || (linked ? linked.bloco : 'BR');
    const empresa = item.empresa || (linked ? linked.empresa : 'Ativo Registrado');
    const tipo = item.tipo || (linked ? linked.tipo : 'acao');
    const ehUSD = bloco === 'Internacional';
    const totalMoeda = (Number(item.total) || 0) > 0
      ? Number(item.total)
      : (Number(item.qtd) || 0) * (Number(item.precoPago) || 0);
    const totalBRL = ehUSD ? totalMoeda * rate : totalMoeda;

    return {
      ...item,
      _idx: idx,
      empresa,
      bloco,
      tipo,
      ehUSD,
      totalMoeda,
      totalBRL
    };
  });

  // Filtros
  const q = String(filters.search || '').trim().toLowerCase();
  const blocoMoeda = String(filters.blocoMoeda || 'todos');

  const filtered = enriched.filter(row => {
    if (q) {
      const matchTicker = row.ticker.toLowerCase().includes(q);
      const matchEmpresa = String(row.empresa || '').toLowerCase().includes(q);
      if (!matchTicker && !matchEmpresa) return false;
    }
    if (blocoMoeda === 'BRL' && row.ehUSD) return false;
    if (blocoMoeda === 'USD' && !row.ehUSD) return false;
    if (!['todos', 'BRL', 'USD'].includes(blocoMoeda) && row.bloco !== blocoMoeda) return false;
    return true;
  });

  const totalAportadoBRLAtivos = filtered
    .filter(r => !r.ehUSD)
    .reduce((sum, r) => sum + r.totalMoeda, 0);

  const totalAportadoUSDAtivos = filtered
    .filter(r => r.ehUSD)
    .reduce((sum, r) => sum + r.totalMoeda, 0);

  const totalGeralConvertidoBRL = totalAportadoBRLAtivos + (totalAportadoUSDAtivos * rate);

  return {
    totalAportadoBRLAtivos,
    totalAportadoUSDAtivos,
    totalGeralConvertidoBRL,
    numOperacoes: filtered.length,
    rows: filtered
  };
}
