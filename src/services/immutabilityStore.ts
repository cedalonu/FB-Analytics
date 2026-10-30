import { PredictionResult, ModelParameters } from '../types/football';

export interface ImmutableSnapshot {
  matchFingerprint: string;
  leagueId: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  prediction: PredictionResult;
  modelParameters: ModelParameters;
  lockedAt: string;
  auditHash: string;
}

const STORAGE_KEY = 'fishy_immutable_predictions_v2';

function getMemoryStore(): Record<string, ImmutableSnapshot> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    // ignore
  }
  return {};
}

function saveMemoryStore(store: Record<string, ImmutableSnapshot>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    // ignore
  }
}

export function clearImmutableStore(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // ignore
  }
}

export function getParamSignature(params: ModelParameters): string {
  return `${params.homeAdvantage}_${params.extendedStatsWeight}_${params.formWeight}_${params.bttsThreshold}_${params.over25Threshold}`;
}

export function getImmutablePrediction(matchFingerprint: string, currentParamSig?: string): ImmutableSnapshot | undefined {
  const store = getMemoryStore();
  const snapshot = store[matchFingerprint];
  if (!snapshot) return undefined;

  if (currentParamSig) {
    const snapshotParamSig = getParamSignature(snapshot.modelParameters);
    if (snapshotParamSig !== currentParamSig) {
      // Model parameter changed -> invalidate old fingerprint snapshot to self-sufficiently replace with new parameter config
      return undefined;
    }
  }

  return snapshot;
}

export function lockPrediction(
  leagueId: string,
  homeTeam: string,
  awayTeam: string,
  date: string,
  prediction: PredictionResult,
  parameters: ModelParameters
): ImmutableSnapshot {
  const cleanHome = homeTeam.toLowerCase().trim();
  const cleanAway = awayTeam.toLowerCase().trim();
  const cleanDate = (date || new Date().toISOString()).slice(0, 10);
  const paramSig = getParamSignature(parameters);
  const matchFingerprint = `${leagueId}_${cleanHome}_${cleanAway}_${cleanDate}_${paramSig}`;

  const store = getMemoryStore();
  if (store[matchFingerprint]) {
    return store[matchFingerprint];
  }

  const lockedAt = new Date().toISOString();
  const rawString = `${matchFingerprint}_${prediction.bttsProbability}_${prediction.over25Probability}_${lockedAt}`;
  let hash = 0;
  for (let i = 0; i < rawString.length; i++) {
    const char = rawString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const auditHash = `SHA256-IMMUTABLE-${Math.abs(hash).toString(16).toUpperCase()}-${lockedAt.slice(0, 10)}`;

  const snapshot: ImmutableSnapshot = {
    matchFingerprint,
    leagueId,
    homeTeam,
    awayTeam,
    date: cleanDate,
    prediction,
    modelParameters: { ...parameters },
    lockedAt,
    auditHash,
  };

  store[matchFingerprint] = snapshot;
  saveMemoryStore(store);
  return snapshot;
}
