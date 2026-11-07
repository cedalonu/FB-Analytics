export interface TeamStats {
  pos: number;
  team: string;
  p: number; // played
  hw: number; // home won
  hd: number; // home drawn
  hl: number; // home lost
  hf: number; // home goals for
  ha: number; // home goals against
  aw: number; // away won
  ad: number; // away drawn
  al: number; // away lost
  af: number; // away goals for
  aa: number; // away goals against
  gd: number; // goal difference
  pts: number;
  ppg: number;
  form: string; // e.g. "WWDLW"
  // Extended stats from leaguetableext.php
  ycF?: number;
  ycA?: number;
  rcF?: number;
  rcA?: number;
  psF?: number; // possession for %
  psA?: number; // possession against %
  cF?: number;  // corners for
  cA?: number;  // corners against
  stF?: number; // shots on target for
  stA?: number; // shots on target against
  sntF?: number;// shots not on target for
  sntA?: number;// shots not on target against
  agF?: number; // action goals
  agA?: number;
  spgF?: number;// shots per goal for
  spgA?: number;// shots per goal against
}

export interface MatchOdds {
  home: number | null;
  draw: number | null;
  away: number | null;
}

export interface PredictionResult {
  homeExpectedGoals: number; // lambda home
  awayExpectedGoals: number; // lambda away
  totalExpectedGoals: number;
  bttsProbability: number; // 0 to 1
  bttsNoProbability: number;
  over25Probability: number; // 0 to 1
  under25Probability: number;
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
  predictedScore: { home: number; away: number; probability: number };
  bttsPick: 'BTTS_SI' | 'BTTS_NO';
  bttsConfidence: number; // 0 to 100
  overUnderPick: 'OVER_2_5' | 'UNDER_2_5';
  overUnderConfidence: number; // 0 to 100
  // Immutability audit metadata
  matchFingerprint?: string;
  lockedAt?: string;
  auditHash?: string;
  isImmutable?: boolean;
  iicdScore?: number; // Information Completeness & Consistency Degree (0.0 to 1.0)
  eloBlend?: { homeElo: number; awayElo: number; eloWinProb: number };
}

export interface FixtureMatch {
  id: string;
  leagueId: string;
  leagueName: string;
  dateRaw: string;
  dateIso: string;
  daysFromNow: number;
  time: string;
  homeTeam: string;
  awayTeam: string;
  odds: MatchOdds;
  prediction?: PredictionResult;
}

export interface FinishedMatch {
  id: string;
  leagueId: string;
  leagueName: string;
  dateRaw: string;
  dateIso: string;
  daysAgo: number;
  time: string;
  homeTeam: string;
  awayTeam: string;
  score: string;
  homeGoals: number;
  awayGoals: number;
  totalGoals: number;
  actualBtts: boolean; // true = BTTS SI, false = BTTS NO
  actualOver25: boolean; // true = Over 2.5, false = Under 2.5
  prediction?: PredictionResult;
  // Verification evaluation
  evaluation?: {
    bttsHit: boolean; // did model predict actual BTTS correctly?
    overUnderHit: boolean; // did model predict actual Over/Under correctly?
    bothHit: boolean;
    exactScoreHit: boolean;
  };
}

export interface LeagueOption {
  id: string;
  name: string;
  group: string;
}

export interface ModelParameters {
  homeAdvantage: number; // 1.0 to 1.3
  extendedStatsWeight: number; // 0.0 to 1.0 (influence of shots on target & possession)
  formWeight: number; // 0.0 to 0.5 (influence of recent 6 match form)
  bttsThreshold: number; // default 0.50 (if bttsProb >= threshold -> BTTS SI)
  over25Threshold: number; // default 0.50 (if overProb >= threshold -> OVER 2.5)
}

export interface BacktestMetrics {
  totalMatches: number;
  bttsEvaluated: number;
  bttsHits: number;
  bttsAccuracy: number; // percentage 0-100
  overUnderEvaluated: number;
  overUnderHits: number;
  overUnderAccuracy: number; // percentage 0-100
  overallAccuracy: number; // combined
  exactScoreHits: number;
  exactScoreAccuracy: number;
  confusionMatrix: {
    btts: {
      predictedYesActualYes: number; // True Positive
      predictedYesActualNo: number;  // False Positive
      predictedNoActualYes: number;  // False Negative
      predictedNoActualNo: number;   // True Negative
    };
    overUnder: {
      predictedOverActualOver: number;
      predictedOverActualUnder: number;
      predictedUnderActualOver: number;
      predictedUnderActualUnder: number;
    };
  };
  logLoss: number;
  brierScore: number;
  simulatedRoi: number; // % yield
}

export interface LeagueDataResponse {
  leagueId: string;
  leagueName: string;
  timestamp: string;
  fixtures: FixtureMatch[];
  results: FinishedMatch[];
  teams: Record<string, TeamStats>;
  backtest: BacktestMetrics;
  parameters: ModelParameters;
}
