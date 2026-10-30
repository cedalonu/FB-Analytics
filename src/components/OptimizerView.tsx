import React, { useState } from 'react';
import { ModelParameters, BacktestMetrics } from '../types/football';
import {
  Sliders,
  Zap,
  TrendingUp,
  BarChart3,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { DEFAULT_PARAMETERS } from '../services/predictiveModel';

interface OptimizerViewProps {
  parameters: ModelParameters;
  onParametersChange: (newParams: ModelParameters) => void;
  metrics: BacktestMetrics;
  onRunAutoOptimize: () => void;
  isOptimizing: boolean;
  optimizationResult: {
    bestParams: ModelParameters;
    bestMetrics: BacktestMetrics;
    improvementDelta: number;
  } | null;
  onApplyOptimized: () => void;
}

export const OptimizerView: React.FC<OptimizerViewProps> = ({
  parameters,
  onParametersChange,
  metrics,
  onRunAutoOptimize,
  isOptimizing,
  optimizationResult,
  onApplyOptimized,
}) => {
  const [localParams, setLocalParams] = useState<ModelParameters>(parameters);

  const handleSliderChange = (key: keyof ModelParameters, value: number) => {
    const updated = { ...localParams, [key]: value };
    setLocalParams(updated);
    onParametersChange(updated);
  };

  const handleReset = () => {
    setLocalParams(DEFAULT_PARAMETERS);
    onParametersChange(DEFAULT_PARAMETERS);
  };

  const cmBtts = metrics.confusionMatrix.btts;
  const cmOU = metrics.confusionMatrix.overUnder;

  // Calculate Precision and Recall
  const bttsPrecision = cmBtts.predictedYesActualYes + cmBtts.predictedYesActualNo > 0
    ? ((cmBtts.predictedYesActualYes / (cmBtts.predictedYesActualYes + cmBtts.predictedYesActualNo)) * 100).toFixed(1)
    : '0.0';
  const bttsRecall = cmBtts.predictedYesActualYes + cmBtts.predictedNoActualYes > 0
    ? ((cmBtts.predictedYesActualYes / (cmBtts.predictedYesActualYes + cmBtts.predictedNoActualYes)) * 100).toFixed(1)
    : '0.0';

  const ouPrecision = cmOU.predictedOverActualOver + cmOU.predictedOverActualUnder > 0
    ? ((cmOU.predictedOverActualOver / (cmOU.predictedOverActualOver + cmOU.predictedOverActualUnder)) * 100).toFixed(1)
    : '0.0';
  const ouRecall = cmOU.predictedOverActualOver + cmOU.predictedUnderActualOver > 0
    ? ((cmOU.predictedOverActualOver / (cmOU.predictedOverActualOver + cmOU.predictedUnderActualOver)) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-1">
            <span>CALIBRACIÓN & BACKTESTING</span>
            <span aria-hidden="true">·</span>
            <span>OPTIMIZACIÓN DE PARÁMETROS</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Motor de Optimización Predictiva
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
            Ajusta los hiperparámetros del modelo estadístico (Ventaja de Local, Tiros a puerta TheFishy, Forma y Umbrales de decisión) o ejecuta la búsqueda automática por grid search para maximizar la tasa de acierto.
          </p>
        </div>

        {/* Action button: Auto-Optimize */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleReset}
            className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg transition-colors flex items-center gap-1.5"
            title="Restablecer valores predeterminados"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Predeterminados</span>
          </button>
          <button
            onClick={onRunAutoOptimize}
            disabled={isOptimizing}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
          >
            <Zap className={`w-3.5 h-3.5 ${isOptimizing ? 'animate-bounce' : ''}`} />
            <span>{isOptimizing ? 'Optimizando...' : 'Auto-Optimizar Modelo'}</span>
          </button>
        </div>
      </div>

      {/* Optimization Result Callout */}
      {optimizationResult && (
        <div className="bg-emerald-950/20 border border-emerald-500/40 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-white">
                  Optimización completada con éxito
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  La búsqueda por grid search encontró una configuración que logra{' '}
                  <strong className="text-emerald-400 font-mono">
                    {optimizationResult.bestMetrics.overallAccuracy}%
                  </strong>{' '}
                  de precisión global{' '}
                  {optimizationResult.improvementDelta > 0 && (
                    <span className="text-emerald-300 font-bold font-mono">
                      (+{optimizationResult.improvementDelta}% de mejora)
                    </span>
                  )}
                  .
                </p>
              </div>
            </div>

            <button
              onClick={onApplyOptimized}
              className="px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded transition-colors whitespace-nowrap shadow-sm"
            >
              Aplicar a Partidos A y B
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Parameters Sliders & Confusion Matrices */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Sliders */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-lg p-5 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Parámetros del Modelo</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Tiempo Real</span>
          </div>

          {/* Slider 1: Home Advantage */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Ventaja de Local (Home Advantage)</span>
              <span className="font-mono text-emerald-400 font-semibold tabular-nums">
                {localParams.homeAdvantage.toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min="1.00"
              max="1.35"
              step="0.01"
              value={localParams.homeAdvantage}
              onChange={(e) => handleSliderChange('homeAdvantage', parseFloat(e.target.value))}
              className="w-full accent-emerald-400 bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Neutro (1.00x)</span>
              <span>Predeterminado (1.18x)</span>
              <span>Fuerte (1.35x)</span>
            </div>
          </div>

          {/* Slider 2: Extended Stats Weight */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Peso Stats TheFishy Ext. (Tiros/Posesión)</span>
              <span className="font-mono text-cyan-400 font-semibold tabular-nums">
                {Math.round(localParams.extendedStatsWeight * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.00"
              max="0.80"
              step="0.05"
              value={localParams.extendedStatsWeight}
              onChange={(e) => handleSliderChange('extendedStatsWeight', parseFloat(e.target.value))}
              className="w-full accent-cyan-400 bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Solo Goles (0%)</span>
              <span>Equilibrado (35%)</span>
              <span>Dominante (80%)</span>
            </div>
          </div>

          {/* Slider 3: Form Weight */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Peso de Forma Reciente (Racha)</span>
              <span className="font-mono text-indigo-400 font-semibold tabular-nums">
                {Math.round(localParams.formWeight * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.00"
              max="0.40"
              step="0.05"
              value={localParams.formWeight}
              onChange={(e) => handleSliderChange('formWeight', parseFloat(e.target.value))}
              className="w-full accent-indigo-400 bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Sin Racha (0%)</span>
              <span>Moderado (20%)</span>
              <span>Alto (40%)</span>
            </div>
          </div>

          {/* Slider 4: BTTS Decision Threshold */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Umbral de Decisión BTTS SÍ</span>
              <span className="font-mono text-amber-400 font-semibold tabular-nums">
                {Math.round(localParams.bttsThreshold * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.42"
              max="0.60"
              step="0.01"
              value={localParams.bttsThreshold}
              onChange={(e) => handleSliderChange('bttsThreshold', parseFloat(e.target.value))}
              className="w-full accent-amber-400 bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Agresivo (42%)</span>
              <span>Neutro (50%)</span>
              <span>Conservador (60%)</span>
            </div>
          </div>

          {/* Slider 5: Over 2.5 Decision Threshold */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Umbral de Decisión OVER 2.5</span>
              <span className="font-mono text-emerald-400 font-semibold tabular-nums">
                {Math.round(localParams.over25Threshold * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.42"
              max="0.60"
              step="0.01"
              value={localParams.over25Threshold}
              onChange={(e) => handleSliderChange('over25Threshold', parseFloat(e.target.value))}
              className="w-full accent-emerald-400 bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Agresivo (42%)</span>
              <span>Neutro (50%)</span>
              <span>Conservador (60%)</span>
            </div>
          </div>
        </div>

        {/* Right Column: Confusion Matrices & Calibration Metrics */}
        <div className="lg:col-span-7 space-y-6">
          {/* Matrices Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* BTTS Confusion Matrix */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Matriz BTTS (Ambos Marcan)
                </span>
                <span className="text-xs font-mono text-emerald-400 font-bold tabular-nums">
                  {metrics.bttsAccuracy}% Acierto
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-emerald-950/20 border border-emerald-500/30 p-2.5 rounded text-center">
                  <div className="text-[10px] text-slate-400 font-sans">Pred. SÍ / Real SÍ</div>
                  <div className="text-lg font-bold text-emerald-400 tabular-nums">
                    {cmBtts.predictedYesActualYes}
                  </div>
                  <div className="text-[9px] text-emerald-500/70 font-sans">Verdadero Positivo</div>
                </div>

                <div className="bg-rose-950/20 border border-rose-500/30 p-2.5 rounded text-center">
                  <div className="text-[10px] text-slate-400 font-sans">Pred. SÍ / Real NO</div>
                  <div className="text-lg font-bold text-rose-400 tabular-nums">
                    {cmBtts.predictedYesActualNo}
                  </div>
                  <div className="text-[9px] text-rose-500/70 font-sans">Falso Positivo</div>
                </div>

                <div className="bg-rose-950/20 border border-rose-500/30 p-2.5 rounded text-center">
                  <div className="text-[10px] text-slate-400 font-sans">Pred. NO / Real SÍ</div>
                  <div className="text-lg font-bold text-rose-400 tabular-nums">
                    {cmBtts.predictedNoActualYes}
                  </div>
                  <div className="text-[9px] text-rose-500/70 font-sans">Falso Negativo</div>
                </div>

                <div className="bg-emerald-950/20 border border-emerald-500/30 p-2.5 rounded text-center">
                  <div className="text-[10px] text-slate-400 font-sans">Pred. NO / Real NO</div>
                  <div className="text-lg font-bold text-emerald-400 tabular-nums">
                    {cmBtts.predictedNoActualNo}
                  </div>
                  <div className="text-[9px] text-emerald-500/70 font-sans">Verdadero Negativo</div>
                </div>
              </div>

              <div className="flex justify-between text-[11px] text-slate-400 font-mono mt-3 pt-2 border-t border-slate-800">
                <span>Precisión: <strong className="text-white">{bttsPrecision}%</strong></span>
                <span>Sensibilidad: <strong className="text-white">{bttsRecall}%</strong></span>
              </div>
            </div>

            {/* Over/Under Confusion Matrix */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Matriz Over/Under 2.5
                </span>
                <span className="text-xs font-mono text-cyan-400 font-bold tabular-nums">
                  {metrics.overUnderAccuracy}% Acierto
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-emerald-950/20 border border-emerald-500/30 p-2.5 rounded text-center">
                  <div className="text-[10px] text-slate-400 font-sans">Pred. Over / Real Over</div>
                  <div className="text-lg font-bold text-emerald-400 tabular-nums">
                    {cmOU.predictedOverActualOver}
                  </div>
                  <div className="text-[9px] text-emerald-500/70 font-sans">Verdadero Positivo</div>
                </div>

                <div className="bg-rose-950/20 border border-rose-500/30 p-2.5 rounded text-center">
                  <div className="text-[10px] text-slate-400 font-sans">Pred. Over / Real Under</div>
                  <div className="text-lg font-bold text-rose-400 tabular-nums">
                    {cmOU.predictedOverActualUnder}
                  </div>
                  <div className="text-[9px] text-rose-500/70 font-sans">Falso Positivo</div>
                </div>

                <div className="bg-rose-950/20 border border-rose-500/30 p-2.5 rounded text-center">
                  <div className="text-[10px] text-slate-400 font-sans">Pred. Under / Real Over</div>
                  <div className="text-lg font-bold text-rose-400 tabular-nums">
                    {cmOU.predictedUnderActualOver}
                  </div>
                  <div className="text-[9px] text-rose-500/70 font-sans">Falso Negativo</div>
                </div>

                <div className="bg-emerald-950/20 border border-emerald-500/30 p-2.5 rounded text-center">
                  <div className="text-[10px] text-slate-400 font-sans">Pred. Under / Real Under</div>
                  <div className="text-lg font-bold text-emerald-400 tabular-nums">
                    {cmOU.predictedUnderActualUnder}
                  </div>
                  <div className="text-[9px] text-emerald-500/70 font-sans">Verdadero Negativo</div>
                </div>
              </div>

              <div className="flex justify-between text-[11px] text-slate-400 font-mono mt-3 pt-2 border-t border-slate-800">
                <span>Precisión: <strong className="text-white">{ouPrecision}%</strong></span>
                <span>Sensibilidad: <strong className="text-white">{ouRecall}%</strong></span>
              </div>
            </div>
          </div>

          {/* Model Quality Indicators */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Métricas Estadísticas de Calibración
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-950 p-3 rounded border border-slate-800/80">
                <div className="text-[11px] text-slate-400">Brier Score</div>
                <div className="text-xl font-bold font-mono text-white mt-1 tabular-nums">
                  {metrics.brierScore}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Distancia cuadrática (0.00 es perfecto)
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded border border-slate-800/80">
                <div className="text-[11px] text-slate-400">Entropía Cruzada (Log-Loss)</div>
                <div className="text-xl font-bold font-mono text-white mt-1 tabular-nums">
                  {metrics.logLoss}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Penalización por sobreconfianza
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded border border-slate-800/80">
                <div className="text-[11px] text-slate-400">Rendimiento / Yield Simulado</div>
                <div className={`text-xl font-bold font-mono mt-1 tabular-nums ${metrics.simulatedRoi >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {metrics.simulatedRoi > 0 ? `+${metrics.simulatedRoi}%` : `${metrics.simulatedRoi}%`}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Apuesta plana 1U @ 1.91
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
