// import PETS from "./pets.json";
// import fs from "fs";
/**
 * Simulador de BBB dos Pets
 * -------------------------
 * Entrada: array de pets com shape:
 * {
 *   nome: string,
 *   foto: string,
 *   especie: "Cachorro" | "Gato" | string,
 *   idade: string | number,
 *   atributos: {
 *     sociavel: 1-5,
 *     barulhento: 1-5,
 *     teimoso: 1-5,
 *     curioso: 1-5,
 *     carente: 1-5,
 *     drama: 1-5,
 *     energetico: 1-5,
 *     territorial: 1-5
 *   }
 * }
 *
 * Saída: { logs: string[], vencedor: string, historico: {...} }
 *
 * Eventos por “dia”: Festa → Treta → Prova do Líder e Anjo → Formação de Paredão → Eliminação
 * Repetir até restar 1 pet.
 */

// -------------------- RNG com seed (LCG simples) --------------------
function createRNG(seed = Date.now()) {
  let s = (typeof seed === "number" ? seed : hashString(seed)) >>> 0;
  return {
    next() {
      // LCG parâmetros (Numerical Recipes)
      s = (1664525 * s + 1013904223) >>> 0;
      return s / 2 ** 32;
    },
    pick(arr) {
      return arr[Math.floor(this.next() * arr.length)];
    },
    range(min, max) {
      return min + Math.floor(this.next() * (max - min + 1));
    },
    chance(p) {
      return this.next() < p;
    },
  };
}
function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < String(str).length; i++) {
    h ^= String(str).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// -------------------- Utilidades --------------------
function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
function shuffle(rng, array) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function weightedPick(rng, items, weightFn) {
  const weights = items.map(weightFn);
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  let x = rng.next() * total;
  for (let i = 0; i < items.length; i++) {
    x -= weights[i];
    if (x <= 0) return items[i];
  }
  return items[items.length - 1];
}

// Popularidade inicial: baseada em sociável + fofo (carente/curioso) e “potencial de entretenimento” (drama/barulhento)
function initialPopularity(pet, rng) {
  const a = pet.atributos;
  const base =
    10 +
    0.75 * (a.sociavel ?? 3) +
    0.6 * (a.carente ?? 3) +
    0.6 * (a.curioso ?? 3) +
    0.5 * (a.drama ?? 3) +
    0.2 * (a.barulhento ?? 3);
  // jitter inicial: ~N(0, 0.8) aproximado
  const jitter = (rng.next() + rng.next() + rng.next() - 1.5) * 0.8;
  return base + jitter;
}

// Afinidade entre dois pets (para amizades/alianças)
function affinityScore(a, b) {
  const A = a.atributos,
    B = b.atributos;
  const sociavel = (A.sociavel + B.sociavel) / 2;
  const curioso = (A.curioso + B.curioso) / 2;
  const territorial = (A.territorial + B.territorial) / 2;
  const dramaGap = Math.abs(A.drama - B.drama);
  // mais sociável e curioso = mais afinidade; territorial e diferença grande de drama atrapalham
  return 1.2 * sociavel + 0.8 * curioso - 0.8 * territorial - 0.5 * dramaGap;
}

// Chances de treta entre dois pets
function conflictScore(a, b) {
  const A = a.atributos,
    B = b.atributos;
  const teimosia = (A.teimoso + B.teimoso) / 2;
  const territorial = (A.territorial + B.territorial) / 2;
  const barulho = (A.barulhento + B.barulhento) / 2;
  const sociavel = (A.sociavel + B.sociavel) / 2;
  return 1.1 * teimosia + 1.0 * territorial + 0.7 * barulho - 0.9 * sociavel;
}

// Performance em prova (líder/anjo)
function trialPerformance(a) {
  const A = a.atributos;
  // energetico e curioso ajudam; teimoso às vezes ajuda (persistência), drama atrapalha um pouco
  return (
    1.2 * (A.energetico ?? 3) +
    1.0 * (A.curioso ?? 3) +
    0.4 * (A.teimoso ?? 3) -
    0.3 * (A.drama ?? 3)
  );
}

// Impactos na popularidade
function popularityDeltaFromParty(pet) {
  const A = pet.atributos;
  // pets enérgicos e sociáveis sobem; barulhentos/dramáticos podem subir ou cair (entretenimento vs irritação)
  return (
    0.5 * (A.energetico ?? 3) +
    0.8 * (A.sociavel ?? 3) +
    0.3 * (A.drama ?? 3) +
    0.7 * (A.barulhento ?? 3) -
    3.3
  );
}
function popularityDeltaFromFight(a, b, quemCausou = "ambos") {
  // brigas: entretenimento, mas desgasta; quem “causou” perde mais, mas às vezes o público gosta da treta
  const base = -1.0;
  let extraA = 0,
    extraB = 0;
  if (quemCausou === "a") extraA -= 0.8;
  if (quemCausou === "b") extraB -= 0.8;
  return { da: base + extraA, db: base + extraB };
}

// -------------------- Núcleo da Simulação --------------------
/**
 * @param {Array} inputPets
 * @param {Object} options
 * @param {number|string} [options.seed]  Seed para RNG
 * @param {number} [options.maxLogs=Infinity]  Limita quantidade de logs
 * @returns {{ logs: string[], vencedor: string, historico: any }}
 */
export function simulateReality(inputPets, options = {}) {
  const { seed, maxLogs = Infinity } = options;
  const rng = createRNG(seed);
  const logs = [];

  // ----------------- TUNING CENTRAL -----------------
  const tuning = {
    // humor e ruído do público
    moodSwing: 1.0, // amplitude do swing diário [-0.5..+0.5] * moodSwing
    publicNoise: 2.0, // ruído dentro do publicScore (↑ = mais aleatório)
    regression: 0.2, // força da regressão à média por dia (0.15 -> 0.20)
    antiDominance: 0.6, // penalidade por estar > 1 desvio acima da média

    // público: penalidades/bônus por traços (quanto maior, mais negativo)
    publico: {
      barulhentoNeg: 1.0, // era 0.8
      teimosoNeg: 0.8, // era 0.6
      barulhentoPos: 0.25, // bônus para baixo barulho
      teimosoPos: 0.2, // bônus para baixa teimosia
      alliesCap: 2, // até 2 aliados contam no público
      allyBonus: 0.45, // bônus por aliado vivo (capado)
      fatiguePerStreak: 0.35, // cansaço do público por streak (Leader/Anjo)
      underdogBoost: 0.6, // impulso diário para bottom quartile
    },

    // casa: antipatia por traços e mira os fortes
    casa: {
      barulhento: 0.22, // era 0.18
      territorial: 0.2, // era 0.15
      teimoso: 0.2, // era 0.15
      targetStrong: 0.2, // quanto mais popular, mais alvo
      nfMin: 0.7,
      nfMax: 2.4,
    },

    // provas: mérito x sorte
    trials: {
      merit: 0.5, // era 0.6
      luck: 0.5, // era 0.4 (agora 50/50)
      leaderBoost: 0.7, // era 0.8
      angelBoost: 0.45, // era 0.5
    },

    // limites / compressão
    softCap: {
      center: 14, // centro em torno do qual compressão atua
      strength: 0.12, // intensidade da compressão após cada bloco
    },
  };

  // --- jitter determinístico por pet (independente do rng acima) ---
  function jitterFromSeed(name, seedVal) {
    const s = String(seedVal ?? 0) + "|" + String(name ?? "");
    let h = 2166136261 >>> 0; // FNV-1a-like
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    // LCG local para gerar 3 U(0,1)
    let x = h >>> 0;
    const nextU = () => {
      x = (1664525 * x + 1013904223) >>> 0;
      return x / 2 ** 32;
    };
    // ~N(0, 0.8) pela soma de 3 uniformes
    return (nextU() + nextU() + nextU() - 1.5) * 0.8;
  }

  // compressão suave da popularidade (puxa para o centro com intensidade "strength")
  function softCompress(
    p,
    center = tuning.softCap.center,
    k = tuning.softCap.strength
  ) {
    // desloca em direção ao centro proporcionalmente à distância
    return p + k * (center - p);
  }

  const state = {
    dia: 1,
    participantes: clone(inputPets).map((p) => ({
      ...p,
      eliminado: false,
      popularidade: initialPopularity(p, rng) + jitterFromSeed(p.nome, seed),
      aliados: new Set(),
      inimizades: new Set(),
      leaderStreak: 0,
      angelStreak: 0,
    })),
    historico: {
      lideres: [],
      anjos: [],
      paredoes: [],
      votos: [],
      final: null,
    },
  };

  // humor do público global (muda a cada dia)
  const mood = { daySwing: 0 };

  function vivos() {
    return state.participantes.filter((p) => !p.eliminado);
  }
  function getByName(nome) {
    return state.participantes.find((p) => p.nome === nome);
  }
  function log(s) {
    if (logs.length < maxLogs) logs.push(`[Dia ${state.dia}] ${s}`);
  }

  // apoio do público (quanto maior, mais chance de ficar/ganhar)
  function publicScore(p) {
    const vivosNow = vivos();
    const media =
      vivosNow.reduce((s, x) => s + x.popularidade, 0) /
      Math.max(1, vivosNow.length);
    const vari =
      vivosNow.reduce((s, x) => s + Math.pow(x.popularidade - media, 2), 0) /
      Math.max(1, vivosNow.length);
    const desvio = Math.sqrt(vari);

    // aliados vivos com teto (retorno decrescente)
    const aliadosVivos = [...p.aliados].filter(
      (n) => !getByName(n)?.eliminado
    ).length;
    const aliadosContados = Math.min(tuning.publico.alliesCap, aliadosVivos);
    const bonusAliados = aliadosContados * tuning.publico.allyBonus;

    const inimVivos = [...p.inimizades].filter(
      (n) => !getByName(n)?.eliminado
    ).length;
    const penalidadeInimizades = Math.min(2.0, inimVivos * 0.3);

    let score = p.popularidade + bonusAliados - penalidadeInimizades;

    // penalidades/bônus por atributos (público)
    const a = p.atributos ?? {};
    const bar = a.barulhento ?? 3;
    const tei = a.teimoso ?? 3;

    const neg =
      tuning.publico.barulhentoNeg * Math.max(0, bar - 3) +
      tuning.publico.teimosoNeg * Math.max(0, tei - 3);
    score -= neg;

    const pos =
      tuning.publico.barulhentoPos * Math.max(0, 3 - bar) +
      tuning.publico.teimosoPos * Math.max(0, 3 - tei);
    score += pos;

    // penalidade anti-dominância por "favoritismo exagerado"
    const over = Math.max(0, p.popularidade - (media + desvio));
    score -= tuning.antiDominance * over;

    // cansaço do público com streaks de vitórias em provas
    score -= tuning.publico.fatiguePerStreak * Math.max(0, p.leaderStreak - 1);
    score -=
      tuning.publico.fatiguePerStreak * 0.6 * Math.max(0, p.angelStreak - 1);

    // humor diário do público
    score += mood.daySwing * tuning.moodSwing * 0.6;

    // ruído
    score += (rng.next() - 0.5) * tuning.publicNoise;

    return Math.max(0.1, score);
  }

  // arredonda percentuais (1 casa) e força soma 100.0
  function roundPercentsTo100(rawPercents) {
    const r = rawPercents.map((x) => Math.round(x * 10) / 10);
    let sum = Number(r.reduce((a, b) => a + b, 0).toFixed(1));
    let diff = Number((100 - sum).toFixed(1));
    if (diff === 0) return r;

    const idxOrder = r
      .map((val, idx) => ({ idx, val }))
      .sort((a, b) => b.val - a.val)
      .map((o) => o.idx);

    const step = diff > 0 ? 0.1 : -0.1;
    let i = 0;
    while (Number(diff.toFixed(1)) !== 0) {
      const k = idxOrder[i % idxOrder.length];
      r[k] = Number((r[k] + step).toFixed(1));
      diff = Number((diff - step).toFixed(1));
      i++;
      if (i > 1000) break; // segurança
    }
    return r;
  }

  while (vivos().length > 1) {
    const ativos = vivos();

    // humor do público do dia e regressão à média + underdog boost
    mood.daySwing = (rng.next() - 0.5) * 1.0; // [-0.5, +0.5]
    const mediaGrupo =
      ativos.reduce((s, p) => s + p.popularidade, 0) /
      Math.max(1, ativos.length);
    for (const p of ativos) {
      p.popularidade =
        p.popularidade + tuning.regression * (mediaGrupo - p.popularidade);
    }
    // underdog: dá um gás pros 25% com menor popularidade
    const sortedByPop = [...ativos].sort(
      (a, b) => a.popularidade - b.popularidade
    );
    const q = Math.max(1, Math.floor(sortedByPop.length * 0.25));
    for (let i = 0; i < q; i++) {
      sortedByPop[i].popularidade += tuning.publico.underdogBoost;
    }

    // compressão global leve no início do dia
    for (const p of ativos) p.popularidade = softCompress(p.popularidade);

    // abertura do dia
    log(
      `Mais um dia na casa mais vigiada do Brasil! Ainda no jogo: ${ativos
        .map((p) => p.nome)
        .join(", ")}.`
    );

    // FINAL direta com 4 (determinística; percentuais somam 100)
    if (ativos.length === 4) {
      log(`Final sem paredão! O público vota para decidir 1º, 2º e 3º lugar.`);

      const scores = ativos.map(publicScore);
      const total = scores.reduce((a, b) => a + b, 0);
      const rawPercents = scores.map((s) => (s / total) * 100);
      const percents = roundPercentsTo100(rawPercents);

      const order = ativos
        .map((p, i) => ({ p, s: scores[i], pct: percents[i] }))
        .sort((a, b) => b.s - a.s);

      state.historico.final = {
        dia: state.dia,
        ranking: order.map((o) => o.p.nome),
        percentuais: Object.fromEntries(
          order.map((o) => [o.p.nome, Number(o.pct.toFixed(1))])
        ),
        primeiro: order[0].p.nome,
        segundo: order[1].p.nome,
        terceiro: order[2].p.nome,
        quarto: order[3].p.nome,
      };

      const fmt = (x) => x.toFixed(1).replace(".", ",");
      logs.push(
        `🗳️ Percentuais (voto para vencer): ${order
          .map((o) => `${o.p.nome} ${fmt(o.pct)}%`)
          .join(" | ")}`
      );
      logs.push(`🥇 1º: ${order[0].p.nome}`);
      logs.push(`🥈 2º: ${order[1].p.nome}`);
      logs.push(`🥉 3º: ${order[2].p.nome}`);
      logs.push(`4º lugar: ${order[3].p.nome}`);
      logs.push(`🏆 Vencedor: ${order[0].p.nome}`);
      if (seed !== undefined) {
        logs.push(`🔑 Seed da simulação: ${seed}`);
      }

      return {
        logs,
        vencedor: order[0].p.nome,
        historico: state.historico,
        seed,
      };
    }

    // FESTA
    {
      const presentes = shuffle(rng, ativos);
      log(
        `Festa animada! ${presentes
          .map((p) => p.nome)
          .slice(0, Math.min(6, presentes.length))
          .join(", ")} e cia. brilharam na pista.`
      );
      for (const p of presentes) {
        p.popularidade += popularityDeltaFromParty(p) + rng.range(-1, 1) * 0.2;
        if (rng.chance(0.08)) p.popularidade += 1.0; // "momento viral"
        p.popularidade = softCompress(p.popularidade);
      }
      for (let i = 0; i < Math.min(6, presentes.length - 1); i++) {
        const a = presentes[i],
          b = presentes[i + 1];
        if (!a || !b) continue;
        const aff = affinityScore(a, b);
        if (aff > 2.5 && rng.chance(0.6)) {
          a.aliados.add(b.nome);
          b.aliados.add(a.nome);
          a.inimizades.delete(b.nome);
          b.inimizades.delete(a.nome);
          log(`${a.nome} e ${b.nome} fortaleceram uma amizade na festa.`);
          a.popularidade += 0.4;
          b.popularidade += 0.4;
          a.popularidade = softCompress(a.popularidade);
          b.popularidade = softCompress(b.popularidade);
        }
      }
    }

    // TRETA
    {
      const cand = [];
      for (let i = 0; i < ativos.length; i++) {
        for (let j = i + 1; j < ativos.length; j++) {
          const a = ativos[i],
            b = ativos[j];
          if (a.aliados.has(b.nome)) continue;
          const c = conflictScore(a, b);
          cand.push({
            a,
            b,
            score:
              c +
              (a.inimizades.has(b.nome) || b.inimizades.has(a.nome) ? 1.5 : 0),
          });
        }
      }
      if (cand.length > 0) {
        cand.sort((x, y) => y.score - x.score);
        const top = cand.slice(0, Math.min(4, cand.length));
        const pick = weightedPick(rng, top, (x) => Math.max(0.1, x.score));
        if (pick && pick.score > 2.0 && rng.chance(0.8)) {
          const { a, b } = pick;
          const culpado = rng.pick(["a", "b", "ambos"]);
          const delta = popularityDeltaFromFight(a, b, culpado);
          a.popularidade += delta.da + (a.atributos.drama ?? 0) * 0.05;
          b.popularidade += delta.db + (b.atributos.drama ?? 0) * 0.05;
          a.inimizades.add(b.nome);
          b.inimizades.add(a.nome);
          log(
            `Treta! ${a.nome} e ${b.nome} bateram boca${
              culpado !== "ambos"
                ? ` (culpa de ${culpado === "a" ? a.nome : b.nome})`
                : ""
            }.`
          );
          a.popularidade = softCompress(a.popularidade);
          b.popularidade = softCompress(b.popularidade);
        } else {
          log(
            `Climão evitado: possíveis ânimos exaltados foram contidos pelos brothers.`
          );
        }
      }
    }

    // PROVA DO LÍDER E ANJO (mais sorte)
    let lider = null;
    let anjo = null;
    {
      const competidores = shuffle(rng, vivos());
      const perfWeight = (p) =>
        tuning.trials.merit * trialPerformance(p) +
        tuning.trials.luck * (0.5 + rng.next()); // 0.5..1.5

      lider = weightedPick(rng, competidores, perfWeight);
      anjo = weightedPick(
        rng,
        competidores.filter((p) => p.nome !== lider.nome),
        perfWeight
      );

      // streaks
      for (const p of vivos()) {
        p.leaderStreak = p.nome === lider.nome ? p.leaderStreak + 1 : 0;
        p.angelStreak = p.nome === anjo.nome ? p.angelStreak + 1 : 0;
      }

      state.historico.lideres.push({ dia: state.dia, nome: lider.nome });
      state.historico.anjos.push({ dia: state.dia, nome: anjo.nome });

      lider.popularidade += tuning.trials.leaderBoost;
      anjo.popularidade += tuning.trials.angelBoost;
      lider.popularidade = softCompress(lider.popularidade);
      anjo.popularidade = softCompress(anjo.popularidade);
      log(
        `${lider.nome} venceu a Prova do Líder. ${anjo.nome} conquistou o Anjo.`
      );
    }

    // FORMAÇÃO DE PAREDÃO
    let imunePeloAnjo = null;
    let indicacaoLider = null;
    let indicacaoCasa = null;

    // Anjo salva (não líder) — salvo é imune ao paredão
    {
      const alvos = vivos().filter(
        (p) => p.nome !== anjo.nome && p.nome !== lider.nome
      );
      if (alvos.length > 0) {
        imunePeloAnjo = weightedPick(
          rng,
          alvos,
          (p) =>
            (anjo.aliados.has(p.nome) ? 2.5 : 1) +
            (p.atributos.sociavel ?? 3) * 0.2
        );
        log(`${anjo.nome} usou o Anjo para salvar ${imunePeloAnjo.nome}.`);
      }
    }

    // Indicação do líder (não pode líder nem salvo pelo anjo) — inclui nome do líder
    {
      const elegiveis = vivos().filter(
        (p) =>
          p.nome !== lider.nome &&
          (imunePeloAnjo ? p.nome !== imunePeloAnjo.nome : true)
      );
      indicacaoLider = weightedPick(rng, elegiveis, (p) => {
        const base = 1;
        const inim = lider.inimizades.has(p.nome) ? 3.0 : 1.0;
        const aff = Math.max(0, 2.5 - affinityScore(lider, p));
        return base + inim + aff;
      });
      log(
        `Indicação do Líder (${lider.nome}): ${indicacaoLider.nome} vai ao Paredão.`
      );
    }

    // Casa vota — líder NÃO vota e NÃO recebe voto — log de cada voto
    {
      const votantes = vivos().filter((p) => p.nome !== lider.nome);
      const votos = [];
      for (const de of votantes) {
        const alvos = vivos().filter(
          (p) =>
            p.nome !== de.nome &&
            p.nome !== lider.nome &&
            p.nome !== indicacaoLider.nome &&
            (imunePeloAnjo ? p.nome !== imunePeloAnjo.nome : true)
        );
        if (alvos.length === 0) continue;

        const em = weightedPick(rng, alvos, (p) => {
          let w = 1;
          if (de.aliados.has(p.nome)) w *= 0.2; // protege aliado
          if (de.inimizades.has(p.nome)) w *= 3.0; // pesa inimizade

          // antipatia da CASA por traços e mira fortes
          const aa = p.atributos ?? {};
          const nfRaw =
            1 +
            tuning.casa.barulhento * ((aa.barulhento ?? 3) - 3) +
            tuning.casa.territorial * ((aa.territorial ?? 3) - 3) +
            tuning.casa.teimoso * ((aa.teimoso ?? 3) - 3);

          const nf = Math.max(
            tuning.casa.nfMin,
            Math.min(tuning.casa.nfMax, nfRaw)
          );
          w *= nf;

          // alvo natural: quem está muito popular vira alvo
          const popBoost =
            1 +
            (tuning.casa.targetStrong * Math.max(0, p.popularidade - 12)) / 6; // normaliza levemente
          w *= popBoost;

          // afinidade e "pragmatismo"
          w *= 2.0 + Math.max(0, 2.5 - affinityScore(de, p));
          w *= 1.0 + Math.max(0, (p.popularidade - 12) * 0.06);

          return Math.max(0.05, w);
        });

        votos.push({ de: de.nome, em: em.nome });
        log(`Voto da casa: ${de.nome} votou em ${em.nome}.`);
      }

      state.historico.votos.push({ dia: state.dia, votos });

      // contagem da casa
      const contagem = new Map();
      for (const v of votos) contagem.set(v.em, (contagem.get(v.em) ?? 0) + 1);
      const ranking = [...contagem.entries()].sort((a, b) => b[1] - a[1]);

      const fallbackElegiveis = vivos().filter(
        (p) =>
          p.nome !== indicacaoLider.nome &&
          p.nome !== lider.nome &&
          (imunePeloAnjo ? p.nome !== imunePeloAnjo.nome : true)
      );

      indicacaoCasa = ranking.length
        ? getByName(ranking[0][0])
        : fallbackElegiveis.length
        ? weightedPick(rng, fallbackElegiveis, () => 1)
        : null;

      if (!indicacaoCasa) {
        log(`Sem elegíveis suficientes para indicação da casa neste dia.`);
      } else {
        const votosRecebidos = contagem.get(indicacaoCasa.nome) ?? 0;
        log(
          `Indicação da Casa: ${indicacaoCasa.nome} completa o Paredão com ${votosRecebidos} voto(s).`
        );
      }
    }

    if (!indicacaoCasa) {
      state.dia += 1;
      continue;
    }

    // ELIMINAÇÃO — determinística com percentuais que somam 100%
    {
      const paredao = [indicacaoLider, indicacaoCasa];
      const s0 = publicScore(paredao[0]);
      const s1 = publicScore(paredao[1]);
      const total = s0 + s1;

      // percentuais de ELIMINAR (inverso do “ficar”)
      let pctElim0 = (s1 / total) * 100;
      let pctElim1 = (s0 / total) * 100;

      const [show0, show1] = roundPercentsTo100([pctElim0, pctElim1]);

      // eliminação determinística: sai quem tiver MAIOR % de eliminar
      let eliminado, sobrevivente;
      if (pctElim0 > pctElim1) {
        eliminado = paredao[0];
        sobrevivente = paredao[1];
      } else if (pctElim1 > pctElim0) {
        eliminado = paredao[1];
        sobrevivente = paredao[0];
      } else {
        // empate 50/50 -> sai o de menor popularidade; se empatar, sorteia
        if (paredao[0].popularidade !== paredao[1].popularidade) {
          eliminado =
            paredao[0].popularidade < paredao[1].popularidade
              ? paredao[0]
              : paredao[1];
        } else {
          eliminado = rng.next() < 0.5 ? paredao[0] : paredao[1];
        }
        sobrevivente = eliminado === paredao[0] ? paredao[1] : paredao[0];
      }

      eliminado.eliminado = true;
      eliminado.popularidade -= 1.0;
      sobrevivente.popularidade += 0.8;
      eliminado.popularidade = softCompress(eliminado.popularidade);
      sobrevivente.popularidade = softCompress(sobrevivente.popularidade);

      const f = (x) => x.toFixed(1).replace(".", ",");
      log(
        `Paredão: ${paredao[0].nome} x ${
          paredao[1].nome
        }. Votos do público para eliminar: ${paredao[0].nome} ${f(show0)}% | ${
          paredao[1].nome
        } ${f(show1)}%.`
      );
      log(
        `O público decidiu: ${eliminado.nome} foi eliminado com ${f(
          eliminado === paredao[0] ? show0 : show1
        )}%.`
      );

      state.historico.paredoes.push({
        dia: state.dia,
        indicacaoLider: indicacaoLider.nome,
        indicacaoCasa: indicacaoCasa.nome,
        salvoPeloAnjo: imunePeloAnjo?.nome ?? null,
        final: paredao.map((p) => p.nome),
        porcentagens: {
          [paredao[0].nome]: Number(show0.toFixed(1)),
          [paredao[1].nome]: Number(show1.toFixed(1)),
        },
        eliminado: eliminado.nome,
      });
    }

    state.dia += 1;
  }

  // fallback (se começar com <=3 por algum motivo)
  const vencedor = vivos()[0].nome;
  logs.push(`🏆 Vencedor: ${vencedor}`);

  // >>> NOVO: mostra o seed usado
  if (seed !== undefined) {
    logs.push(`🔑 Seed da simulação: ${seed}`);
  }
  return { logs, vencedor, historico: state.historico, seed };
}

// -------------------- Exemplo de uso --------------------
// Descomente para testar rapidamente em Node:
// const PETS = JSON.parse(fs.readFileSync("./pets.json", "utf-8"));
// const resultado = simulateReality(PETS, { seed: 6 });
// const resultado = simulateReality(PETS, { seed: 7 });
// const resultado = simulateReality(PETS, { seed: 17 });

// const resultado = simulateReality(PETS);
// console.log(resultado.logs.join("\n"));
