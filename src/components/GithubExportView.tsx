import React, { useState } from 'react';
import { LeagueDataResponse } from '../types/football';
import * as XLSX from 'xlsx';
import {
  Download,
  Github,
  Terminal,
  Copy,
  Check,
  FileCode,
  Calendar,
  ExternalLink,
  FileSpreadsheet,
} from 'lucide-react';

interface GithubExportViewProps {
  data: LeagueDataResponse | null;
}

export const GithubExportView: React.FC<GithubExportViewProps> = ({ data }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState<boolean>(false);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleDownloadExcelGlobal = async () => {
    setIsDownloadingExcel(true);
    try {
      const [resFixtures, resResults] = await Promise.all([
        fetch('/api/screener?daysAhead=7').then((r) => r.json()),
        fetch('/api/screener-results?daysBehind=14').then((r) => r.json()),
      ]);

      const fixturesList = resFixtures.success && Array.isArray(resFixtures.fixtures) ? resFixtures.fixtures : [];
      const resultsList = resResults.success && Array.isArray(resResults.results) ? resResults.results : [];

      const fixturesData = fixturesList.map((f: any) => ({
        Liga: f.leagueName,
        Fecha: f.dateRaw,
        Hora: f.time,
        Local: f.homeTeam,
        Visitante: f.awayTeam,
        'Pronóstico BTTS': f.prediction?.bttsPick === 'BTTS_SI' ? 'BTTS SÍ' : 'BTTS NO',
        'Probabilidad BTTS %': f.prediction ? (f.prediction.bttsProbability * 100).toFixed(1) : 0,
        'Pronóstico Over/Under': f.prediction?.overUnderPick === 'OVER_2_5' ? 'OVER 2.5' : 'UNDER 2.5',
        'Probabilidad Over 2.5 %': f.prediction ? (f.prediction.over25Probability * 100).toFixed(1) : 0,
        'xG Local': f.prediction?.homeExpectedGoals ?? 0,
        'xG Visitante': f.prediction?.awayExpectedGoals ?? 0,
        'Confianza %': f.confidenceScore ?? 0,
        'Huella Inmutable (Audit Hash)': f.prediction?.auditHash || 'N/A',
        'Fecha Bloqueo': f.prediction?.lockedAt || 'N/A',
      }));

      const resultsData = resultsList.map((r: any) => ({
        Liga: r.leagueName,
        Fecha: r.dateRaw,
        Hora: r.time,
        Local: r.homeTeam,
        Visitante: r.awayTeam,
        'Marcador Real': r.score,
        'Pronóstico BTTS': r.prediction?.bttsPick === 'BTTS_SI' ? 'BTTS SÍ' : 'BTTS NO',
        'Probabilidad BTTS %': r.prediction ? (r.prediction.bttsProbability * 100).toFixed(1) : 0,
        'Resultado BTTS': r.evaluation?.bttsHit ? 'ACERTÓ' : 'FALLÓ',
        'Pronóstico Over/Under': r.prediction?.overUnderPick === 'OVER_2_5' ? 'OVER 2.5' : 'UNDER 2.5',
        'Probabilidad Over 2.5 %': r.prediction ? (r.prediction.over25Probability * 100).toFixed(1) : 0,
        'Resultado Over/Under': r.evaluation?.overUnderHit ? 'ACERTÓ' : 'FALLÓ',
        'Confianza %': r.prediction ? Math.round(Math.max(r.prediction.bttsProbability, r.prediction.bttsNoProbability, r.prediction.over25Probability, r.prediction.under25Probability) * 100) : 0,
        'Huella Inmutable (Audit Hash)': r.prediction?.auditHash || 'N/A',
        'Fecha Bloqueo': r.prediction?.lockedAt || 'N/A',
      }));

      const wb = XLSX.utils.book_new();
      const wsFixtures = XLSX.utils.json_to_sheet(fixturesData);
      const wsResults = XLSX.utils.json_to_sheet(resultsData);

      XLSX.utils.book_append_sheet(wb, wsFixtures, 'Próximos Global');
      XLSX.utils.book_append_sheet(wb, wsResults, 'Backtesting Global');

      XLSX.writeFile(wb, `FishyFootball_Screener_Global_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error('Error generating Excel:', err);
      alert('Error al generar el archivo Excel global.');
    } finally {
      setIsDownloadingExcel(false);
    }
  };

  const handleDownloadJson = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fishy_predictions_${data.leagueId}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = () => {
    if (!data) return;
    const headers = [
      'Tipo',
      'Fecha',
      'Hora',
      'Local',
      'Visitante',
      'Marcador Real',
      'xG_Local',
      'xG_Visita',
      'Pronostico_BTTS',
      'Prob_BTTS_Pct',
      'Pronostico_OverUnder25',
      'Prob_Over25_Pct',
      'Calificacion_BTTS',
      'Calificacion_OverUnder',
    ];

    const rows: string[] = [];

    // Add fixtures
    data.fixtures.forEach((f) => {
      rows.push([
        'PROXIMO',
        `"${f.dateRaw}"`,
        `"${f.time}"`,
        `"${f.homeTeam}"`,
        `"${f.awayTeam}"`,
        '-',
        f.prediction?.homeExpectedGoals ?? 0,
        f.prediction?.awayExpectedGoals ?? 0,
        f.prediction?.bttsPick ?? '-',
        f.prediction ? (f.prediction.bttsProbability * 100).toFixed(1) : 0,
        f.prediction?.overUnderPick ?? '-',
        f.prediction ? (f.prediction.over25Probability * 100).toFixed(1) : 0,
        '-',
        '-',
      ].join(','));
    });

    // Add results
    data.results.forEach((r) => {
      rows.push([
        'FINALIZADO',
        `"${r.dateRaw}"`,
        `"${r.time}"`,
        `"${r.homeTeam}"`,
        `"${r.awayTeam}"`,
        `"${r.score}"`,
        r.prediction?.homeExpectedGoals ?? 0,
        r.prediction?.awayExpectedGoals ?? 0,
        r.prediction?.bttsPick ?? '-',
        r.prediction ? (r.prediction.bttsProbability * 100).toFixed(1) : 0,
        r.prediction?.overUnderPick ?? '-',
        r.prediction ? (r.prediction.over25Probability * 100).toFixed(1) : 0,
        r.evaluation?.bttsHit ? 'ACERTO' : 'FALLO',
        r.evaluation?.overUnderHit ? 'ACERTO' : 'FALLO',
      ].join(','));
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fishy_partidos_${data.leagueId}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const gitCommands = `# 1. Inicializar repositorio git
git init
git add .
git commit -m "feat: Football Predictive Model & TheFishy Dashboard (BTTS + Over/Under 2.5)"

# 2. Conectar a tu cuenta de GitHub
git branch -M main
git remote add origin https://github.com/TU_USUARIO/fishy-football-predictor.git
git push -u origin main

# 3. Para levantar localmente en cualquier momento:
npm install
npm run dev # Abre http://localhost:3000
# O modo producción:
npm start`;

  const githubActionsYaml = `name: Actualizacion Diaria de Pronosticos

on:
  schedule:
    # Ejecutar todos los dias a las 06:00 UTC
    - cron: '0 6 * * *'
  workflow_dispatch: # Permite ejecucion manual con un clic

jobs:
  update-predictions:
    runs-on: ubuntu-latest
    steps:
      - name: Clonar repositorio
        uses: actions/checkout@v4

      - name: Configurar Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Instalar dependencias
        run: npm ci

      - name: Ejecutar consulta y predicciones
        run: |
          npx tsx -e "
            import { getUpcomingFixtures, getFinishedResults, getLeagueTableAndStats } from './src/services/theFishyScraper.ts';
            import { runBacktest, predictMatch } from './src/services/predictiveModel.ts';
            import fs from 'fs';

            async function run() {
              const leagues = ['1', '31', '33', '32', '34']; // EPL, LaLiga, SerieA, Bundesliga, Ligue1
              for (const l of leagues) {
                const teams = await getLeagueTableAndStats(l);
                const fixtures = await getUpcomingFixtures(l, 7);
                const results = await getFinishedResults(l, 30);
                const backtest = runBacktest(results, teams);
                const preds = fixtures.map(f => ({ ...f, pred: predictMatch(f.homeTeam, f.awayTeam, teams) }));
                fs.writeFileSync(\`data_league_\${l}.json\`, JSON.stringify({ fixtures: preds, backtest: backtest.metrics }, null, 2));
              }
              console.log('Pronósticos actualizados.');
            }
            run();
          "

      - name: Guardar o commitear datos actualizados
        run: |
          git config --global user.name "github-actions[bot]"
          git config --global user.email "github-actions@users.noreply.github.com"
          git add data_league_*.json
          git commit -m "chore(cron): actualización diaria de pronosticos TheFishy" || echo "Sin cambios"
          git push
`;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-1">
            <span>EXPORTACIÓN & DESPLIEGUE</span>
            <span aria-hidden="true">·</span>
            <span>PUBLICAR EN GITHUB</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Exportar Datos & Guía para Subir a GitHub
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
            Todo el código está diseñado modularmente con TypeScript, Express y Vite para ser clonado, versionado en GitHub y ejecutado periódicamente (local o mediante GitHub Actions).
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleDownloadExcelGlobal}
            disabled={isDownloadingExcel}
            className="px-3.5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            title="Descargar Excel con 2 hojas: Próximos Global y Backtesting Global de todas las ligas"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{isDownloadingExcel ? 'Generando Excel...' : 'Excel Global (2 Hojas)'}</span>
          </button>
          <button
            onClick={handleDownloadCsv}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>CSV Liga</span>
          </button>
          <button
            onClick={handleDownloadJson}
            className="px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <FileCode className="w-3.5 h-3.5 text-cyan-400" />
            <span>JSON Liga</span>
          </button>
        </div>
      </div>

      {/* Guide Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Step 1: Git Push */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Github className="w-4 h-4 text-emerald-400" />
              <span>1. Subir Proyecto a tu Repositorio GitHub</span>
            </div>
            <button
              onClick={() => copyToClipboard(gitCommands, 1)}
              className="px-2 py-1 text-xs text-slate-400 hover:text-white bg-slate-800 rounded flex items-center gap-1 transition-colors"
            >
              {copiedIndex === 1 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedIndex === 1 ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Ejecuta estos comandos en tu terminal local para inicializar el repositorio y subirlo a tu cuenta de GitHub:
          </p>

          <pre className="p-3 bg-slate-950 border border-slate-800 rounded text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre">
            {gitCommands}
          </pre>
        </div>

        {/* Step 2: Automated Scheduled Queries with GitHub Actions */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span>2. Automatización Diaria (.github/workflows)</span>
            </div>
            <button
              onClick={() => copyToClipboard(githubActionsYaml, 2)}
              className="px-2 py-1 text-xs text-slate-400 hover:text-white bg-slate-800 rounded flex items-center gap-1 transition-colors"
            >
              {copiedIndex === 2 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedIndex === 2 ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Crea el archivo <code className="text-slate-300">.github/workflows/daily-predictions.yml</code> en tu repo para que GitHub ejecute las consultas automáticamente todos los días:
          </p>

          <pre className="p-3 bg-slate-950 border border-slate-800 rounded text-xs font-mono text-cyan-300 overflow-x-auto max-h-64 whitespace-pre">
            {githubActionsYaml}
          </pre>
        </div>
      </div>

      {/* GitHub Pages 404 Troubleshooting Guide */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <ExternalLink className="w-4 h-4 text-amber-400" />
          <span>Nota sobre Despliegue en GitHub Pages (Evitar Error 404)</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Si subiste tu repositorio con un nombre personalizado (ej. <code className="text-emerald-400">FB-Analytics</code>) y GitHub Pages muestra un error 404, asegúrate de configurar la propiedad <code className="text-emerald-400">base</code> en tu archivo <code className="text-slate-200">vite.config.ts</code> coincidiendo con el nombre exacto de tu repositorio:
        </p>
        <pre className="p-3 bg-slate-950 border border-slate-800 rounded text-xs font-mono text-amber-300 overflow-x-auto">
{`export default defineConfig({
  base: '/FB-Analytics/', // <- Reemplaza con el nombre exacto de tu repo
  plugins: [react(), tailwindcss(), apiPlugin()],
  ...
});`}
        </pre>
      </div>
    </div>
  );
};
