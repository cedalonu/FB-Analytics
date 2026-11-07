import {
  TeamStats,
  PredictionResult,
  ModelParameters,
  FinishedMatch,
  BacktestMetrics
} from '../types/football';
import { getImmutablePrediction, lockPrediction, getParamSignature } from './immutabilityStore';

export const DEFAULT_PARAMETERS: ModelParameters = {
  homeAdvantage: 1.18,
  extendedStatsWeight: 0.35,
  formWeight: 0.20,
  bttsThreshold: 0.50,
  over25Threshold: 0.50,
};

// League-specific specialized baseline parameters to ensure high accuracy across diverse leagues
const LEAGUE_SPECIFIC_OVERRIDES: Record<string, Partial<ModelParameters>> = {
  '1': { homeAdvantage: 1.15, extendedStatsWeight: 0.40, formWeight: 0.20 }, // Premier League
  '31': { homeAdvantage: 1.20, extendedStatsWeight: 0.35, formWeight: 0.25 }, // La Liga
  '33': { homeAdvantage: 1.18, extendedStatsWeight: 0.30, formWeight: 0.25 }, // Serie A
  '32': { homeAdvantage: 1.22, extendedStatsWeight: 0.40, formWeight: 0.20 }, // Bundesliga
  '34': { homeAdvantage: 1.16, extendedStatsWeight: 0.35, formWeight: 0.20 }, // Ligue 1
  '2': { homeAdvantage: 1.22, extendedStatsWeight: 0.30, formWeight: 0.30 }, // Championship
};

export function getLeagueDefaultParameters(leagueId: string): ModelParameters {
  const override = LEAGUE_SPECIFIC_OVERRIDES[leagueId] || {};
  return {
    ...DEFAULT_PARAMETERS,
    ...override,
  };
}

// Factorial helper
function factorial(n: number): number {
  if (n <= 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

// Poisson probability function
export function poisson(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

// Dixon-Coles tau factor for low scoring dependency
function tau(x: number, y: number, lambda: number, mu: number, rho: number): number {
  if (x === 0 && y === 0) return 1 - lambda * mu * rho;
  if (x === 0 && y === 1) return 1 + lambda * rho;
  if (x === 1 && y === 0) return 1 + mu * rho;
  if (x === 1 && y === 1) return 1 - rho;
  return 1.0;
}

// Helper to calculate recent form PPG ("WWDLW" -> points / matches)
function calculateFormPoints(formStr: string = ''): number {
  if (!formStr || formStr.length === 0) return 1.35;
  let pts = 0;
  const chars = formStr.trim().toUpperCase().split('');
  for (const c of chars) {
    if (c === 'W') pts += 3;
    else if (c === 'D') pts += 1;
  }
  return pts / Math.max(1, chars.length);
}

/**
 * Computes or assigns an Elo rating for each team based on standings, points per game, and goal difference.
 * Base Elo = 1500, scaled by PPG and GD.
 */
export function computeTeamElos(teams: Record<string, TeamStats>): Record<string, number> {
  const elos: Record<string, number> = {};
  const teamArray = Object.values(teams);
  if (teamArray.length === 0) return elos;

  // Find max pts/ppg for normalization
  const maxPts = Math.max(...teamArray.map(t => t.pts || 10), 1);

  teamArray.forEach(t => {
    const ppgFactor = (t.ppg || 1.3) / 2.0; // typical ppg range 0.5 to 2.6
    const gdFactor = (t.gd || 0) * 3;
    const posBonus = (20 - (t.pos || 10)) * 4;
    const elo = Math.round(1500 + (t.pts / maxPts) * 250 + gdFactor + posBonus);
    elos[t.team] = Math.max(1200, Math.min(2100, elo));
  });

  return elos;
}

// Fuzzy team stats finder
export function findTeamStats(teamName: string, teams: Record<string, TeamStats>): TeamStats | undefined {
  if (!teamName) return undefined;
  if (teams[teamName]) return teams[teamName];
  const clean = teamName.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [name, stats] of Object.entries(teams)) {
    const candidate = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (candidate === clean || candidate.includes(clean) || clean.includes(candidate)) {
      return stats;
    }
  }
  return undefined;
}

/**
 * Calculates IICD (Information Completeness & Consistency Degree) from 0.0 to 1.0.
 * Penalizes missing data, sparse games played, or statistical contradictions.
 */
export function calculateIICD(homeStats?: TeamStats, awayStats?: TeamStats): number {
  if (!homeStats || !awayStats) return 0.5;

  let score = 1.0;
  const hMatches = (homeStats.hw ?? 0) + (homeStats.hd ?? 0) + (homeStats.hl ?? 0);
  const aMatches = (awayStats.aw ?? 0) + (awayStats.ad ?? 0) + (awayStats.al ?? 0);

  if (hMatches < 3 || aMatches < 3) score -= 0.20;
  if (!homeStats.form || homeStats.form.length < 3) score -= 0.10;
  if (!awayStats.form || awayStats.form.length < 3) score -= 0.10;
  if (homeStats.stF === undefined || homeStats.stA === undefined) score -= 0.15;
  if (awayStats.stF === undefined || awayStats.stA === undefined) score -= 0.15;

  return Math.max(0.35, Number(score.toFixed(2)));
}

/**
 * Computes Expected Goals (xG), Elo advantage, separated attack/defense, and IICD data quality penalty
 */
export function predictMatch(
  homeTeamName: string,
  awayTeamName: string,
  teams: Record<string, TeamStats>,
  params: ModelParameters = DEFAULT_PARAMETERS
): PredictionResult {
  // Point 1: Calendar, team identity & data verification
  const homeStats = findTeamStats(homeTeamName, teams);
  const awayStats = findTeamStats(awayTeamName, teams);
  const elos = computeTeamElos(teams);
  const iicdScore = calculateIICD(homeStats, awayStats);

  // Global league baselines
  let totalHomeGoals = 0;
  let totalAwayGoals = 0;
  let totalHomeGames = 0;
  let totalAwayGames = 0;

  Object.values(teams).forEach(t => {
    const homeMatches = (t.hw ?? 0) + (t.hd ?? 0) + (t.hl ?? 0);
    const awayMatches = (t.aw ?? 0) + (t.ad ?? 0) + (t.al ?? 0);
    totalHomeGames += homeMatches;
    totalAwayGames += awayMatches;
    totalHomeGoals += (t.hf ?? 0);
    totalAwayGoals += (t.af ?? 0);
  });

  const leagueAvgHomeGoals = totalHomeGames > 0 ? Math.max(1.1, totalHomeGoals / totalHomeGames) : 1.45;
  const leagueAvgAwayGoals = totalAwayGames > 0 ? Math.max(0.9, totalAwayGoals / totalAwayGames) : 1.15;

  // Point 3: Separated global strength, home/away attack & defense
  const hMatches = homeStats ? Math.max(1, (homeStats.hw ?? 0) + (homeStats.hd ?? 0) + (homeStats.hl ?? 0)) : 1;
  const hScored = homeStats ? (homeStats.hf ?? 0) : leagueAvgHomeGoals;
  const hConceded = homeStats ? (homeStats.ha ?? 0) : leagueAvgAwayGoals;

  const aMatches = awayStats ? Math.max(1, (awayStats.aw ?? 0) + (awayStats.ad ?? 0) + (awayStats.al ?? 0)) : 1;
  const aScored = awayStats ? (awayStats.af ?? 0) : leagueAvgAwayGoals;
  const aConceded = awayStats ? (awayStats.aa ?? 0) : leagueAvgHomeGoals;

  let homeAttack = (hScored / hMatches) / leagueAvgHomeGoals;
  let awayDefense = (aConceded / aMatches) / leagueAvgHomeGoals;
  let awayAttack = (aScored / aMatches) / leagueAvgAwayGoals;
  let homeDefense = (hConceded / hMatches) / leagueAvgAwayGoals;

  // Point 2: Elo ratings with chronological context
  const homeElo = elos[homeTeamName] || 1500;
  const awayElo = elos[awayTeamName] || 1500;
  const eloDiff = homeElo - awayElo;
  const eloAttackMultiplier = Math.pow(10, eloDiff / 750);

  // Elo win probability baseline for ensemble blend (Point 5)
  const homeAdvElo = 65;
  const eloWinProb = 1 / (1 + Math.pow(10, (awayElo - homeElo - homeAdvElo) / 400));

  // Point 4: Player/squad contribution weighting (Shots on Target efficiency)
  if (params.extendedStatsWeight > 0) {
    if (homeStats?.stF && homeStats?.stA) {
      const totalShots = Math.max(1, homeStats.stF + homeStats.stA);
      const shotRatio = homeStats.stF / totalShots;
      const shotMultiplier = 0.65 + shotRatio * 0.7;
      homeAttack = homeAttack * (1 - params.extendedStatsWeight) + (homeAttack * shotMultiplier) * params.extendedStatsWeight;
    }
    if (awayStats?.stF && awayStats?.stA) {
      const totalShots = Math.max(1, awayStats.stF + awayStats.stA);
      const shotRatio = awayStats.stF / totalShots;
      const shotMultiplier = 0.65 + shotRatio * 0.7;
      awayAttack = awayAttack * (1 - params.extendedStatsWeight) + (awayAttack * shotMultiplier) * params.extendedStatsWeight;
    }

    if (homeStats?.psF && awayStats?.psF) {
      const homePoss = homeStats.psF / 100;
      const awayPoss = awayStats.psF / 100;
      homeAttack *= 1 + (homePoss - 0.5) * 0.25 * params.extendedStatsWeight;
      awayAttack *= 1 + (awayPoss - 0.5) * 0.25 * params.extendedStatsWeight;
    }
  }

  let tacticalOpenness = 1.0;
  const homeShotsOnTarget = homeStats?.stF ?? 4.5;
  const awayShotsOnTarget = awayStats?.stF ?? 4.5;
  const homeDefConcededShots = homeStats?.stA ?? 4.5;
  const awayDefConcededShots = awayStats?.stA ?? 4.5;

  if ((homeShotsOnTarget + awayShotsOnTarget) > 9.0 && (homeDefConcededShots + awayDefConcededShots) > 9.0) {
    tacticalOpenness = 1.12;
  }

  if (params.formWeight > 0) {
    const homeFormPPG = calculateFormPoints(homeStats?.form);
    const awayFormPPG = calculateFormPoints(awayStats?.form);
    const avgPPG = 1.35;
    const homeFormMult = 1 + ((homeFormPPG - avgPPG) / 3) * params.formWeight;
    const awayFormMult = 1 + ((awayFormPPG - avgPPG) / 3) * params.formWeight;

    homeAttack *= homeFormMult;
    awayAttack *= awayFormMult;
  }

  const homeAdv = params.homeAdvantage ?? 1.18;
  let lambdaH = Math.max(0.25, homeAttack * awayDefense * leagueAvgHomeGoals * homeAdv * Math.sqrt(eloAttackMultiplier) * tacticalOpenness);
  let lambdaA = Math.max(0.20, awayAttack * homeDefense * leagueAvgAwayGoals * (1 / Math.sqrt(eloAttackMultiplier)) * tacticalOpenness);

  lambdaH = Math.min(4.5, lambdaH);
  lambdaA = Math.min(4.0, lambdaA);

  const maxGoals = 7;
  let bttsProb = 0;
  let over25Prob = 0;
  let homeWinProb = 0;
  let drawProb = 0;
  let awayWinProb = 0;

  const rho = -0.06;
  let maxScoreProb = -1;
  let bestScore = { home: 1, away: 0, probability: 0 };

  for (let i = 0; i <= maxGoals; i++) {
    for (let j = 0; j <= maxGoals; j++) {
      const pI = poisson(i, lambdaH);
      const pJ = poisson(j, lambdaA);
      const t = tau(i, j, lambdaH, lambdaA, rho);
      const prob = Math.max(0, pI * pJ * t);

      if (i > 0 && j > 0) bttsProb += prob;
      if (i + j > 2.5) over25Prob += prob;

      if (i > j) homeWinProb += prob;
      else if (i === j) drawProb += prob;
      else awayWinProb += prob;

      if (prob > maxScoreProb) {
        maxScoreProb = prob;
        bestScore = { home: i, away: j, probability: prob };
      }
    }
  }

  // Point 5: Hybrid Ensemble blend between Poisson and Elo win probability
  homeWinProb = homeWinProb * 0.65 + eloWinProb * 0.35;
  awayWinProb = awayWinProb * 0.65 + (1 - eloWinProb) * 0.35;

  bttsProb = Math.min(0.95, Math.max(0.05, bttsProb));
  const bttsNoProb = 1 - bttsProb;

  over25Prob = Math.min(0.95, Math.max(0.05, over25Prob));
  const under25Prob = 1 - over25Prob;

  const bttsThreshold = params.bttsThreshold ?? 0.50;
  const over25Threshold = params.over25Threshold ?? 0.50;

  const bttsPick: 'BTTS_SI' | 'BTTS_NO' = bttsProb >= bttsThreshold ? 'BTTS_SI' : 'BTTS_NO';
  const overUnderPick: 'OVER_2_5' | 'UNDER_2_5' = over25Prob >= over25Threshold ? 'OVER_2_5' : 'UNDER_2_5';

  // Point 7: Apply IICD penalty to confidence
  const bttsConfidence = Math.round(Math.abs(bttsProb - 0.50) * 200 * iicdScore);
  const overUnderConfidence = Math.round(Math.abs(over25Prob - 0.50) * 200 * iicdScore);

  return {
    homeExpectedGoals: Number(lambdaH.toFixed(2)),
    awayExpectedGoals: Number(lambdaA.toFixed(2)),
    totalExpectedGoals: Number((lambdaH + lambdaA).toFixed(2)),
    bttsProbability: Number(bttsProb.toFixed(4)),
    bttsNoProbability: Number(bttsNoProb.toFixed(4)),
    over25Probability: Number(over25Prob.toFixed(4)),
    under25Probability: Number(under25Prob.toFixed(4)),
    homeWinProbability: Number(homeWinProb.toFixed(4)),
    drawProbability: Number(drawProb.toFixed(4)),
    awayWinProbability: Number(awayWinProb.toFixed(4)),
    predictedScore: {
      home: bestScore.home,
      away: bestScore.away,
      probability: Number(bestScore.probability.toFixed(4)),
    },
    bttsPick,
    bttsConfidence: Math.min(100, Math.max(40, bttsConfidence)),
    overUnderPick,
    overUnderConfidence: Math.min(100, Math.max(40, overUnderConfidence)),
    iicdScore,
    eloBlend: {
      homeElo: Math.round(homeElo),
      awayElo: Math.round(awayElo),
      eloWinProb: Number(eloWinProb.toFixed(3)),
    },
  };
}

/**
 * Computes prediction with immutability locking (snapshot registry)
 */
export function predictMatchImmutable(
  leagueId: string,
  homeTeamName: string,
  awayTeamName: string,
  dateRaw: string,
  teams: Record<string, TeamStats>,
  params: ModelParameters = DEFAULT_PARAMETERS
): PredictionResult {
  const cleanHome = homeTeamName.toLowerCase().trim();
  const cleanAway = awayTeamName.toLowerCase().trim();
  const cleanDate = (dateRaw || new Date().toISOString()).slice(0, 10);
  const paramSig = getParamSignature(params);
  const fingerprint = `${leagueId}_${cleanHome}_${cleanAway}_${cleanDate}_${paramSig}`;

  const existing = getImmutablePrediction(fingerprint, paramSig);
  if (existing) {
    return {
      ...existing.prediction,
      matchFingerprint: existing.matchFingerprint,
      lockedAt: existing.lockedAt,
      auditHash: existing.auditHash,
      isImmutable: true,
    };
  }

  const freshPred = predictMatch(homeTeamName, awayTeamName, teams, params);
  const locked = lockPrediction(leagueId, homeTeamName, awayTeamName, dateRaw, freshPred, params);

  return {
    ...locked.prediction,
    matchFingerprint: locked.matchFingerprint,
    lockedAt: locked.lockedAt,
    auditHash: locked.auditHash,
    isImmutable: true,
  };
}

/**
 * Runs backtest evaluation on finished matches with immutable prediction auditing
 */
export function runBacktest(
  matches: FinishedMatch[],
  teams: Record<string, TeamStats>,
  params: ModelParameters = DEFAULT_PARAMETERS,
  leagueId: string = '1'
): { evaluatedMatches: FinishedMatch[]; metrics: BacktestMetrics } {
  let bttsHits = 0;
  let overUnderHits = 0;
  let exactScoreHits = 0;
  let brierScoreSum = 0;
  let logLossSum = 0;
  let simProfit = 0;

  const confusionMatrix = {
    btts: { predictedYesActualYes: 0, predictedYesActualNo: 0, predictedNoActualYes: 0, predictedNoActualNo: 0 },
    overUnder: { predictedOverActualOver: 0, predictedOverActualUnder: 0, predictedUnderActualOver: 0, predictedUnderActualUnder: 0 },
  };

  const evaluatedMatches: FinishedMatch[] = matches.map(match => {
    const lId = match.leagueId || leagueId;
    const pred = predictMatchImmutable(lId, match.homeTeam, match.awayTeam, match.dateRaw, teams, params);
    const actualBtts = match.actualBtts;
    const actualOver = match.actualOver25;

    const bttsHit = (pred.bttsPick === 'BTTS_SI' && actualBtts) || (pred.bttsPick === 'BTTS_NO' && !actualBtts);
    const overUnderHit = (pred.overUnderPick === 'OVER_2_5' && actualOver) || (pred.overUnderPick === 'UNDER_2_5' && !actualOver);
    const bothHit = bttsHit && overUnderHit;
    const exactScoreHit = pred.predictedScore.home === match.homeGoals && pred.predictedScore.away === match.awayGoals;

    if (bttsHit) bttsHits++;
    if (overUnderHit) overUnderHits++;
    if (exactScoreHit) exactScoreHits++;

    if (pred.bttsPick === 'BTTS_SI') {
      if (actualBtts) confusionMatrix.btts.predictedYesActualYes++;
      else confusionMatrix.btts.predictedYesActualNo++;
    } else {
      if (actualBtts) confusionMatrix.btts.predictedNoActualYes++;
      else confusionMatrix.btts.predictedNoActualNo++;
    }

    if (pred.overUnderPick === 'OVER_2_5') {
      if (actualOver) confusionMatrix.overUnder.predictedOverActualOver++;
      else confusionMatrix.overUnder.predictedOverActualUnder++;
    } else {
      if (actualOver) confusionMatrix.overUnder.predictedUnderActualOver++;
      else confusionMatrix.overUnder.predictedUnderActualUnder++;
    }

    const yBtts = actualBtts ? 1 : 0;
    const yOver = actualOver ? 1 : 0;
    brierScoreSum += Math.pow(pred.bttsProbability - yBtts, 2);
    brierScoreSum += Math.pow(pred.over25Probability - yOver, 2);

    const pBttsClamped = Math.max(0.01, Math.min(0.99, pred.bttsProbability));
    const pOverClamped = Math.max(0.01, Math.min(0.99, pred.over25Probability));
    logLossSum -= (yBtts * Math.log(pBttsClamped) + (1 - yBtts) * Math.log(1 - pBttsClamped));
    logLossSum -= (yOver * Math.log(pOverClamped) + (1 - yOver) * Math.log(1 - pOverClamped));

    const standardOdds = 1.91;
    if (bttsHit) simProfit += (standardOdds - 1);
    else simProfit -= 1;
    if (overUnderHit) simProfit += (standardOdds - 1);
    else simProfit -= 1;

    return {
      ...match,
      prediction: pred,
      evaluation: { bttsHit, overUnderHit, bothHit, exactScoreHit },
    };
  });

  const total = Math.max(1, matches.length);
  const totalPicks = total * 2;
  const bttsAccuracy = Number(((bttsHits / total) * 100).toFixed(1));
  const overUnderAccuracy = Number(((overUnderHits / total) * 100).toFixed(1));
  const overallAccuracy = Number((((bttsHits + overUnderHits) / totalPicks) * 100).toFixed(1));
  const exactScoreAccuracy = Number(((exactScoreHits / total) * 100).toFixed(1));
  const brierScore = Number((brierScoreSum / totalPicks).toFixed(4));
  const logLoss = Number((logLossSum / totalPicks).toFixed(4));
  const simulatedRoi = Number(((simProfit / totalPicks) * 100).toFixed(1));

  const metrics: BacktestMetrics = {
    totalMatches: matches.length,
    bttsEvaluated: matches.length,
    bttsHits,
    bttsAccuracy,
    overUnderEvaluated: matches.length,
    overUnderHits,
    overUnderAccuracy,
    overallAccuracy,
    exactScoreHits,
    exactScoreAccuracy,
    confusionMatrix,
    logLoss,
    brierScore,
    simulatedRoi,
  };

  return { evaluatedMatches, metrics };
}

/**
 * Optimizes model parameters via grid search over historical finished matches
 */
export function optimizeParameters(
  matches: FinishedMatch[],
  teams: Record<string, TeamStats>
): { bestParams: ModelParameters; bestMetrics: BacktestMetrics; improvementDelta: number } {
  const base = runBacktest(matches, teams, DEFAULT_PARAMETERS);
  let bestParams = { ...DEFAULT_PARAMETERS };
  let bestScore = base.metrics.overallAccuracy;
  let bestMetrics = base.metrics;

  if (matches.length < 3) {
    return { bestParams, bestMetrics, improvementDelta: 0 };
  }

  const homeAdvGrid = [1.12, 1.18, 1.25];
  const extStatsGrid = [0.20, 0.40, 0.60];
  const formWeightGrid = [0.10, 0.20, 0.30];
  const bttsThresholdGrid = [0.48, 0.50, 0.52];
  const over25ThresholdGrid = [0.48, 0.50, 0.52];

  for (const homeAdv of homeAdvGrid) {
    for (const extWeight of extStatsGrid) {
      for (const formWeight of formWeightGrid) {
        for (const bttsThresh of bttsThresholdGrid) {
          for (const overThresh of over25ThresholdGrid) {
            const candidateParams: ModelParameters = {
              homeAdvantage: homeAdv,
              extendedStatsWeight: extWeight,
              formWeight,
              bttsThreshold: bttsThresh,
              over25Threshold: overThresh,
            };

            const testResult = runBacktest(matches, teams, candidateParams);
            const score = testResult.metrics.overallAccuracy - (testResult.metrics.brierScore * 8);

            if (score > bestScore) {
              bestScore = score;
              bestParams = candidateParams;
              bestMetrics = testResult.metrics;
            }
          }
        }
      }
    }
  }

  const improvementDelta = Number((bestMetrics.overallAccuracy - base.metrics.overallAccuracy).toFixed(1));

  return { bestParams, bestMetrics, improvementDelta };
}
