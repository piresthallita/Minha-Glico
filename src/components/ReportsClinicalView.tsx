import React, { useState } from 'react';
import {
  FileText,
  Download,
  Calendar,
  Activity,
  ArrowUpRight,
  Sparkles,
  TrendingUp,
  Percent,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { GlucoseReading, MealRecord, InsulinDoseRecord, PatientProfile } from '../types';
import { calculateTIR, getGlucoseContextLabel } from '../utils/clinicalCalculations';
import { GlucoseChart } from './GlucoseChart';

interface ReportsClinicalViewProps {
  readings: GlucoseReading[];
  meals: MealRecord[];
  doses: InsulinDoseRecord[];
  profile: PatientProfile;
  isDark: boolean;
  onOpenReportModal: () => void;
}

export const ReportsClinicalView: React.FC<ReportsClinicalViewProps> = ({
  readings,
  meals,
  doses,
  profile,
  isDark,
  onOpenReportModal,
}) => {
  const [timeRange, setTimeRange] = useState<'7days' | '14days' | '30days'>('14days');

  // Filter readings by selected range
  const days = timeRange === '7days' ? 7 : timeRange === '14days' ? 14 : 30;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const filteredReadings = readings.filter(
    (r) => new Date(r.timestamp).getTime() >= cutoff
  );

  const activeReadings = filteredReadings.length > 0 ? filteredReadings : readings;
  const tir = calculateTIR(activeReadings);

  // Context averages
  const fasting = activeReadings.filter(
    (r) => r.context === 'jejum' || r.context === 'fasting' || r.context === 'cafe_manha'
  );
  const postMeal = activeReadings.filter(
    (r) =>
      r.context === 'pos_cafe' ||
      r.context === 'pos_almoco' ||
      r.context === 'pos_jantar' ||
      r.context === 'post_meal_1h' ||
      r.context === 'post_meal_2h'
  );
  const dawn = activeReadings.filter(
    (r) => r.context === 'madrugada' || r.context === 'dawn' || r.context === 'jantar'
  );

  const avgFasting =
    fasting.length > 0
      ? Math.round(fasting.reduce((a, b) => a + b.value, 0) / fasting.length)
      : 104;
  const avgPostMeal =
    postMeal.length > 0
      ? Math.round(postMeal.reduce((a, b) => a + b.value, 0) / postMeal.length)
      : 142;
  const avgDawn =
    dawn.length > 0
      ? Math.round(dawn.reduce((a, b) => a + b.value, 0) / dawn.length)
      : 112;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* HEADER: Título & Seletor de Período + Botão PDF */}
      <div className="bg-white dark:bg-[#161619] rounded-[28px] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-8 rounded-full bg-[#FF5A36]/15 text-[#FF5A36] flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </span>
            <h3 className="font-extrabold text-base sm:text-lg text-[#111111] dark:text-white tracking-tight">
              Relatórios & Análise Clínica
            </h3>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Tempo no Alvo (TIR), Perfil Ambulatorial de Glicose (AGP) e indicadores médicos
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time range pills */}
          <div className="flex bg-[#F6F6F7] dark:bg-[#222226] p-1 rounded-full text-xs font-bold">
            {(['7days', '14days', '30days'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-full transition ${
                  timeRange === range
                    ? 'bg-[#111111] text-white dark:bg-[#FF5A36]'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white'
                }`}
              >
                {range === '7days' ? '7 Dias' : range === '14days' ? '14 Dias (AGP)' : '30 Dias'}
              </button>
            ))}
          </div>

          {/* Export PDF Button */}
          <button
            onClick={onOpenReportModal}
            className="px-4 py-2 bg-[#FF5A36] hover:bg-[#e84c29] text-white text-xs font-bold rounded-full flex items-center gap-1.5 transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Gerar Laudo PDF</span>
          </button>
        </div>
      </div>

      {/* BENTO GRID: TIR Card, Estatísticas por Contexto, Métricas Clínicas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-stretch">
        {/* CARD 1: TEMPO NO ALVO (TIR) - lg:col-span-6 */}
        <div className="lg:col-span-6 bg-white dark:bg-[#161619] rounded-[28px] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm sm:text-base text-[#111111] dark:text-white tracking-tight">
                Tempo no Alvo (TIR)
              </h4>
              <p className="text-[11px] text-neutral-400">
                Padrão Internacional ADA / SBD ({profile.targetRangeLow}-{profile.targetRangeHigh} mg/dL)
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 text-xs font-bold">
              Meta ADA: &gt;70%
            </span>
          </div>

          {/* Big TIR Metric + Multi-segment Bar */}
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-[#FF5A36] font-extrabold text-2xl">%</span>
                <span className="font-mono text-3xl sm:text-4xl font-extrabold text-[#111111] dark:text-white">
                  {tir.inRangePercent}
                </span>
                <span className="text-xs text-neutral-400 ml-1">No Alvo</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-[#FF5A36] block">
                  HbA1c Est. {tir.estimatedHbA1c}%
                </span>
                <span className="text-[10px] text-neutral-400">
                  GMI {tir.gmi}%
                </span>
              </div>
            </div>

            {/* Segmented Bar */}
            <div className="h-4 w-full rounded-full bg-[#F6F6F7] dark:bg-neutral-800 flex overflow-hidden gap-0.5">
              <div
                style={{ width: `${Math.max(5, tir.veryLowPercent + tir.lowPercent)}%` }}
                className="bg-red-500 rounded-full"
                title={`Hipo: ${tir.lowPercent}%`}
              />
              <div
                style={{ width: `${Math.max(15, tir.inRangePercent)}%` }}
                className="bg-[#FF5A36] rounded-full"
                title={`No Alvo: ${tir.inRangePercent}%`}
              />
              <div
                style={{ width: `${Math.max(5, tir.highPercent)}%` }}
                className="bg-[#FFA07A] rounded-full"
                title={`Alta: ${tir.highPercent}%`}
              />
              <div
                style={{ width: `${Math.max(3, tir.veryHighPercent)}%` }}
                className="bg-orange-700 rounded-full"
                title={`Muito Alta: ${tir.veryHighPercent}%`}
              />
            </div>

            {/* Legend Breakdown */}
            <div className="grid grid-cols-4 gap-1 pt-1 text-center text-[10px]">
              <div className="p-1.5 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300">
                <span className="font-bold block">&lt;70 (Hipo)</span>
                <span className="font-mono font-extrabold">{tir.lowPercent}%</span>
              </div>
              <div className="p-1.5 rounded-xl bg-[#FFF0ED] dark:bg-[#2A1612] text-[#FF5A36]">
                <span className="font-bold block">70-180 (Alvo)</span>
                <span className="font-mono font-extrabold">{tir.inRangePercent}%</span>
              </div>
              <div className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300">
                <span className="font-bold block">181-250 (Alta)</span>
                <span className="font-mono font-extrabold">{tir.highPercent}%</span>
              </div>
              <div className="p-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-orange-800 dark:text-orange-300">
                <span className="font-bold block">&gt;250 (M. Alta)</span>
                <span className="font-mono font-extrabold">{tir.veryHighPercent}%</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#F6F6F7] dark:bg-[#222226] flex items-center justify-between text-xs">
            <span className="text-neutral-500">Média Geral do Período:</span>
            <span className="font-mono font-extrabold text-[#111111] dark:text-white">
              {tir.meanGlucose} mg/dL
            </span>
          </div>
        </div>

        {/* CARD 2: MÉDIAS POR CONTEXTO CLÍNICO - lg:col-span-6 */}
        <div className="lg:col-span-6 bg-white dark:bg-[#161619] rounded-[28px] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm sm:text-base text-[#111111] dark:text-white tracking-tight">
                Médias por Momento Clínico
              </h4>
              <p className="text-[11px] text-neutral-400">
                Comportamento nos momentos cruciais do dia
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-[#FF5A36]">
              {activeReadings.length} medições
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 my-auto">
            <div className="bg-[#F6F6F7] dark:bg-[#222226] p-3.5 rounded-2xl text-center space-y-1">
              <span className="text-[11px] font-bold text-neutral-500 block truncate">
                Jejum / Manhã
              </span>
              <span className="font-mono font-extrabold text-xl sm:text-2xl text-[#111111] dark:text-white block">
                {avgFasting}
              </span>
              <span className="text-[10px] text-neutral-400">mg/dL</span>
            </div>

            <div className="bg-[#FFF0ED] dark:bg-[#2A1612] p-3.5 rounded-2xl text-center space-y-1 border border-[#FF5A36]/20">
              <span className="text-[11px] font-bold text-[#FF5A36] block truncate">
                Pós-Refeições
              </span>
              <span className="font-mono font-extrabold text-xl sm:text-2xl text-[#FF5A36] block">
                {avgPostMeal}
              </span>
              <span className="text-[10px] text-[#FF5A36]/70">mg/dL</span>
            </div>

            <div className="bg-[#F6F6F7] dark:bg-[#222226] p-3.5 rounded-2xl text-center space-y-1">
              <span className="text-[11px] font-bold text-neutral-500 block truncate">
                Madrugada / Noite
              </span>
              <span className="font-mono font-extrabold text-xl sm:text-2xl text-[#111111] dark:text-white block">
                {avgDawn}
              </span>
              <span className="text-[10px] text-neutral-400">mg/dL</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#F0F9FF] dark:bg-[#0C2A3A] border border-[#BAE6FD] dark:border-[#0369A1] text-[11px] text-[#0369A1] dark:text-[#7DD3FC] flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>Avaliação Clínica:</strong> Glicemias pós-prandiais abaixo de 160 mg/dL indicam que a relação carboidrato-insulina (ICR) está adequada.
            </span>
          </div>
        </div>
      </div>

      {/* GRÁFICO COMPLETO AGP */}
      <div className="bg-white dark:bg-[#161619] rounded-[28px] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-base text-[#111111] dark:text-white tracking-tight">
              Perfil Ambulatorial de Glicose (AGP) & Curva Contínua
            </h4>
            <p className="text-xs text-neutral-500">
              Distribuição e variabilidade com marcadores de refeições e insulina
            </p>
          </div>
        </div>
        <GlucoseChart readings={activeReadings} meals={meals} doses={doses} isDark={isDark} />
      </div>
    </div>
  );
};
