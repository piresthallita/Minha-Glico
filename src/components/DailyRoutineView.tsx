import React, { useState } from 'react';
import {
  CheckCircle2,
  Droplets,
  Syringe,
  Activity,
  Moon,
  Plus,
  Clock,
  Info,
  Calendar,
  Check,
  RotateCcw,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Settings,
  BellRing,
  History,
  Droplet,
} from 'lucide-react';
import {
  DailyRoutineLog,
  PatientProfile,
  GlucoseReading,
  ReminderItem,
  EnabledRoutineGoals,
  CustomGlucoseMoment,
} from '../types';
import { DEFAULT_ENABLED_ROUTINE_GOALS } from '../data/initialData';

interface DailyRoutineViewProps {
  routineLog: DailyRoutineLog;
  routineHistory: DailyRoutineLog[];
  selectedRoutineDate: string;
  onSelectRoutineDate: (dateKey: string) => void;
  onUpdateRoutine: (updated: Partial<DailyRoutineLog>) => void;
  enabledGoals: EnabledRoutineGoals;
  onToggleGoalEnabled: (goalKey: keyof EnabledRoutineGoals) => void;
  profile: PatientProfile;
  readings: GlucoseReading[];
  latestReading?: GlucoseReading;
  reminders: ReminderItem[];
  moments: CustomGlucoseMoment[];
  onToggleReminder: (id: string) => void;
  onDeleteReminder: (id: string) => void;
  onAddReminder: (reminder: ReminderItem) => void;
  onOpenManualReading: () => void;
  onOpenRemindersPage: () => void;
  isDark: boolean;
}

function shiftDateString(dateKey: string, deltaDays: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + deltaDays);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function formatRoutineDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export const DailyRoutineView: React.FC<DailyRoutineViewProps> = ({
  routineLog,
  routineHistory,
  selectedRoutineDate,
  onSelectRoutineDate,
  onUpdateRoutine,
  enabledGoals,
  onToggleGoalEnabled,
  profile,
  readings,
  latestReading,
  reminders,
  moments,
  onToggleReminder,
  onOpenManualReading,
  onOpenRemindersPage,
}) => {
  const [isCustomizingGoals, setIsCustomizingGoals] = useState(false);

  // Local basal dose input
  const [basalUnitsInput, setBasalUnitsInput] = useState<number>(
    routineLog.basalUnits || 22
  );
  const [basalTimeInput, setBasalTimeInput] = useState<string>(
    routineLog.basalTime || '08:00'
  );

  const todayKey = new Date().toISOString().split('T')[0];
  const isViewingToday = selectedRoutineDate === todayKey;

  // Check if there is a reading on the selectedRoutineDate
  const dayReadings = readings.filter((r) => {
    const dt = new Date(r.timestamp);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
      dt.getDate()
    ).padStart(2, '0')}`;
    return key === selectedRoutineDate;
  });
  const fastingDoneForDay = dayReadings.length > 0;

  // Water helper calculations
  const waterGoal = routineLog.waterGoalMl || 2500;
  const waterPct = Math.min(100, Math.round((routineLog.waterMl / waterGoal) * 100));

  const handleAddWater = (ml: number) => {
    const newAmount = Math.max(0, routineLog.waterMl + ml);
    onUpdateRoutine({ waterMl: newAmount });
  };

  const handleResetWater = () => {
    onUpdateRoutine({ waterMl: 0 });
  };

  const effectiveEnabledGoals: EnabledRoutineGoals = {
    ...DEFAULT_ENABLED_ROUTINE_GOALS,
    ...(enabledGoals || {}),
  };

  // All available goals (Exame Diário dos Pés removido conforme solicitado)
  const allGoals = [
    {
      id: 'fasting' as const,
      title: 'Glicemia em Jejum / Diária',
      enabled: effectiveEnabledGoals.fasting,
      completed: fastingDoneForDay,
      subtitle: fastingDoneForDay
        ? `${dayReadings.length} medição(ões) no dia`
        : 'Pendente neste dia',
    },
    {
      id: 'basal' as const,
      title: 'Insulina Basal Diária',
      enabled: effectiveEnabledGoals.basal,
      completed: routineLog.basalTaken,
      subtitle: routineLog.basalTaken
        ? `Aplicada (${routineLog.basalUnits}U às ${routineLog.basalTime || '08:00'})`
        : 'Pendente neste dia',
    },
    {
      id: 'water' as const,
      title: 'Hidratação (Água)',
      enabled: effectiveEnabledGoals.water,
      completed: routineLog.waterMl >= waterGoal,
      subtitle: `${routineLog.waterMl} ml de ${waterGoal} ml (${waterPct}%)`,
    },
    {
      id: 'exercise' as const,
      title: 'Atividade Física Segura',
      enabled: effectiveEnabledGoals.exercise,
      completed: routineLog.exerciseMinutes > 0,
      subtitle:
        routineLog.exerciseMinutes > 0
          ? `${routineLog.exerciseMinutes} min (${routineLog.exerciseType || 'Exercício'})`
          : 'Pendente neste dia',
    },
    {
      id: 'bedtime' as const,
      title: 'Glicemia Antes de Dormir',
      enabled: effectiveEnabledGoals.bedtime,
      completed: routineLog.bedtimeCheckDone,
      subtitle: routineLog.bedtimeCheckDone
        ? 'Meta de sono seguro checada'
        : 'Pendente (ao deitar)',
    },
  ];

  const activeGoals = allGoals.filter((g) => g.enabled);
  const completedCount = activeGoals.filter((g) => g.completed).length;
  const progressPercent =
    activeGoals.length > 0 ? Math.round((completedCount / activeGoals.length) * 100) : 0;

  // Helper to compute completion for any historical log
  const computeLogProgress = (log: DailyRoutineLog) => {
    const hasReadingOnDate = readings.some((r) => {
      const dt = new Date(r.timestamp);
      const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
        dt.getDate()
      ).padStart(2, '0')}`;
      return k === log.date;
    });
    const checks: boolean[] = [];
    if (effectiveEnabledGoals.fasting) checks.push(hasReadingOnDate);
    if (effectiveEnabledGoals.basal) checks.push(Boolean(log.basalTaken));
    if (effectiveEnabledGoals.water)
      checks.push((log.waterMl || 0) >= (log.waterGoalMl || 2500));
    if (effectiveEnabledGoals.exercise) checks.push((log.exerciseMinutes || 0) > 0);
    if (effectiveEnabledGoals.bedtime) checks.push(Boolean(log.bedtimeCheckDone));

    const done = checks.filter(Boolean).length;
    const total = checks.length || 1;
    return {
      done,
      total,
      pct: Math.round((done / total) * 100),
      hasReadingOnDate,
    };
  };

  // Pre-workout safety check
  const currentBg = latestReading?.value || 110;
  const isHypoPreWorkout = currentBg < 100;
  const isGoodPreWorkout = currentBg >= 100 && currentBg <= 250;
  const isHyperPreWorkout = currentBg > 250;

  // Moments with scheduled notification time
  const momentsWithTime = moments.filter((m) => Boolean(m.notifyTime));

  // Sorted history logs (most recent first)
  const sortedHistory = [...routineHistory].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* HEADER CARD: Resumo das Metas Diárias + Seletor de Objetivos Ativos */}
      <div className="bg-white dark:bg-[#161619] rounded-[28px] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-8 h-8 rounded-full bg-[#FF5A36]/15 text-[#FF5A36] flex items-center justify-center font-bold">
                <CheckCircle2 className="w-4 h-4" />
              </span>
              <h3 className="font-extrabold text-base sm:text-lg text-[#111111] dark:text-white tracking-tight">
                Objetivos Diários do Diabético
              </h3>
              <button
                type="button"
                onClick={() => setIsCustomizingGoals(!isCustomizingGoals)}
                className="px-3 py-1 rounded-full bg-[#F6F6F7] dark:bg-[#222226] hover:bg-[#FF5A36] hover:text-white text-[11px] font-bold text-[#FF5A36] transition flex items-center gap-1"
              >
                <Settings className="w-3 h-3" />
                <span>
                  {isCustomizingGoals
                    ? 'Fechar Seleção de Objetivos'
                    : 'Escolher Objetivos Ativos'}
                </span>
              </button>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Escolha quais objetivos deseja manter ativos na sua rotina e acompanhe seu histórico diário completo.
            </p>
          </div>

          {/* Circular / Progress Indicator */}
          <div className="flex items-center gap-4 bg-[#F6F6F7] dark:bg-[#222226] p-3 rounded-2xl shrink-0">
            <div className="w-12 h-12 rounded-full border-4 border-[#FF5A36] flex items-center justify-center font-mono font-extrabold text-xs text-[#111111] dark:text-white">
              {progressPercent}%
            </div>
            <div>
              <div className="text-xs font-bold text-[#111111] dark:text-white">
                {completedCount} de {activeGoals.length} metas ativas concluídas
              </div>
              <div className="text-[11px] text-neutral-500">
                {activeGoals.length === 0
                  ? 'Ative pelo menos 1 objetivo abaixo'
                  : completedCount === activeGoals.length
                  ? '🎉 Parabéns! Todos os objetivos cumpridos!'
                  : `Visualizando: ${isViewingToday ? 'Hoje' : formatRoutineDateLabel(selectedRoutineDate)}`}
              </div>
            </div>
          </div>
        </div>

        {/* BARRA DE NAVEGAÇÃO DE DATA DO HISTÓRICO */}
        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onSelectRoutineDate(shiftDateString(selectedRoutineDate, -1))}
              className="px-3 py-1.5 rounded-full bg-[#F6F6F7] dark:bg-[#222226] hover:bg-[#111111] hover:text-white text-xs font-bold flex items-center gap-1 transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Dia Anterior</span>
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F6F6F7] dark:bg-[#222226]">
              <Calendar className="w-3.5 h-3.5 text-[#FF5A36]" />
              <span className="px-2 py-0.5 rounded-full bg-[#FF5A36] text-white text-[10px] font-extrabold uppercase">
                {isViewingToday ? 'HOJE' : 'HISTÓRICO'}
              </span>
              <input
                type="date"
                value={selectedRoutineDate}
                max={todayKey}
                onChange={(e) => {
                  if (e.target.value) onSelectRoutineDate(e.target.value);
                }}
                className="bg-transparent text-xs font-mono font-bold text-[#111111] dark:text-white focus:outline-hidden cursor-pointer"
              />
            </div>

            <button
              type="button"
              disabled={isViewingToday}
              onClick={() => onSelectRoutineDate(shiftDateString(selectedRoutineDate, 1))}
              className="px-3 py-1.5 rounded-full bg-[#F6F6F7] dark:bg-[#222226] hover:bg-[#111111] hover:text-white disabled:opacity-35 disabled:pointer-events-none text-xs font-bold flex items-center gap-1 transition"
            >
              <span>Próximo Dia</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {!isViewingToday && (
            <button
              type="button"
              onClick={() => onSelectRoutineDate(todayKey)}
              className="px-3.5 py-1.5 rounded-full bg-[#FF5A36] text-white text-xs font-bold transition"
            >
              Voltar para Hoje
            </button>
          )}
        </div>

        {/* PAINEL PARA ESCOLHER QUAIS OBJETIVOS FICAM ATIVOS OU NÃO */}
        {isCustomizingGoals && (
          <div className="p-4 rounded-2xl bg-[#F6F6F7] dark:bg-[#222226] border border-[#FF5A36]/30 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#111111] dark:text-white">
                Escolha quais Objetivos Diários você quer manter ativos:
              </span>
              <span className="text-[11px] font-bold text-[#FF5A36]">
                {activeGoals.length} ativos
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              {allGoals.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onToggleGoalEnabled(g.id)}
                  className={`p-3 rounded-2xl text-left transition flex items-center justify-between gap-2 border ${
                    g.enabled
                      ? 'bg-white dark:bg-[#161619] border-[#FF5A36] shadow-2xs'
                      : 'bg-white/50 dark:bg-[#161619]/40 border-transparent opacity-60'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#111111] dark:text-white truncate">
                      {g.title}
                    </p>
                    <span className="text-[10px] text-neutral-500">
                      {g.enabled ? 'Ativo na rotina' : 'Desativado'}
                    </span>
                  </div>
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      g.enabled
                        ? 'bg-[#FF5A36] text-white'
                        : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'
                    }`}
                  >
                    {g.enabled ? '✓' : ''}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* GRID DE CARTÕES DE ROTINA (Apenas os objetivos ativos pelo usuário) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-stretch">
        {/* CARD: GLICEMIA DO DIA */}
        {effectiveEnabledGoals.fasting && (
          <div className="lg:col-span-6 bg-white dark:bg-[#161619] rounded-[28px] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#FF5A36]/15 text-[#FF5A36] flex items-center justify-center">
                  <Droplet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-[#111111] dark:text-white tracking-tight">
                    Monitoramento Glicêmico do Dia
                  </h4>
                  <p className="text-[11px] text-neutral-500">
                    Medições realizadas em {isViewingToday ? 'Hoje' : formatRoutineDateLabel(selectedRoutineDate)}
                  </p>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  fastingDoneForDay
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                }`}
              >
                {fastingDoneForDay ? `✓ ${dayReadings.length} Medição(ões)` : 'Pendente'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#F6F6F7] dark:bg-[#222226] flex items-center justify-between">
              <div>
                <span className="text-xs text-neutral-500 block">Última glicemia registrada no dia:</span>
                <span className="font-mono font-extrabold text-lg text-[#111111] dark:text-white">
                  {dayReadings[0] ? `${dayReadings[0].value} mg/dL` : 'Nenhuma medição'}
                </span>
              </div>
              <button
                type="button"
                onClick={onOpenManualReading}
                className="px-4 py-2 rounded-full bg-[#FF5A36] hover:bg-[#e84c29] text-white text-xs font-bold transition"
              >
                + Nova Medição
              </button>
            </div>
          </div>
        )}

        {/* CARD 1: HIDRATAÇÃO (ÁGUA) - lg:col-span-6 */}
        {effectiveEnabledGoals.water && (
          <div className="lg:col-span-6 bg-white dark:bg-[#161619] rounded-[28px] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#38BDF8]/15 text-[#0284C7] dark:text-[#38BDF8] flex items-center justify-center">
                  <Droplets className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-[#111111] dark:text-white tracking-tight">
                    Hidratação Diária (Água)
                  </h4>
                  <p className="text-[11px] text-neutral-500">
                    Essencial para a função renal e diluição plasmática
                  </p>
                </div>
              </div>
              <button
                onClick={handleResetWater}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-full transition"
                title="Zerar contador"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Water Progress Bar and Volume */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-2xl sm:text-3xl font-extrabold text-[#111111] dark:text-white">
                    {routineLog.waterMl}
                  </span>
                  <span className="text-xs text-neutral-400">
                    / {waterGoal} ml
                  </span>
                </div>
                <span className="text-xs font-bold text-[#0284C7] dark:text-[#38BDF8]">
                  {waterPct}% da meta
                </span>
              </div>

              <div className="h-3 w-full rounded-full bg-[#E0F2FE] dark:bg-neutral-800 overflow-hidden">
                <div
                  style={{ width: `${waterPct}%` }}
                  className="h-full bg-gradient-to-r from-[#38BDF8] to-[#0284C7] rounded-full transition-all duration-300"
                />
              </div>
            </div>

            {/* Quick Increment Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleAddWater(250)}
                className="py-2.5 px-3 rounded-2xl bg-[#F6F6F7] dark:bg-[#222226] hover:bg-[#38BDF8]/15 hover:text-[#0284C7] dark:hover:text-[#38BDF8] text-xs font-bold text-[#111111] dark:text-white transition flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+250 ml (Copo)</span>
              </button>
              <button
                onClick={() => handleAddWater(500)}
                className="py-2.5 px-3 rounded-2xl bg-[#F6F6F7] dark:bg-[#222226] hover:bg-[#38BDF8]/15 hover:text-[#0284C7] dark:hover:text-[#38BDF8] text-xs font-bold text-[#111111] dark:text-white transition flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+500 ml (Squeeze)</span>
              </button>
              <button
                onClick={() => handleAddWater(1000)}
                className="py-2.5 px-3 rounded-2xl bg-[#0284C7] dark:bg-[#38BDF8] text-white dark:text-[#111111] hover:opacity-90 text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+1 L (Garrafa)</span>
              </button>
            </div>
          </div>
        )}

        {/* CARD 2: INSULINA BASAL DIÁRIA - lg:col-span-6 */}
        {effectiveEnabledGoals.basal && (
          <div className="lg:col-span-6 bg-white dark:bg-[#161619] rounded-[28px] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#FF5A36]/15 text-[#FF5A36] flex items-center justify-center">
                  <Syringe className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-[#111111] dark:text-white tracking-tight">
                    Insulina Basal Diária
                  </h4>
                  <p className="text-[11px] text-neutral-500">
                    {profile.basalInsulinName}
                  </p>
                </div>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                  routineLog.basalTaken
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                }`}
              >
                {routineLog.basalTaken ? '✓ Aplicada' : '⚠️ Pendente'}
              </span>
            </div>

            {routineLog.basalTaken ? (
              <div className="bg-[#F6F6F7] dark:bg-[#222226] p-4 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500">Dose tomada:</span>
                  <span className="font-mono font-extrabold text-sm text-[#111111] dark:text-white">
                    {routineLog.basalUnits} Unidades (U)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500">Horário registrado:</span>
                  <span className="font-mono text-xs font-bold text-[#FF5A36]">
                    {routineLog.basalTime || '08:00'}
                  </span>
                </div>
                <button
                  onClick={() => onUpdateRoutine({ basalTaken: false })}
                  className="text-[11px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 underline mt-1"
                >
                  Desmarcar ou alterar horário
                </button>
              </div>
            ) : (
              <div className="bg-[#FFF7ED] dark:bg-[#2A1C16] border border-[#FFEDD5] dark:border-[#542F1F] p-4 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-neutral-500 block mb-1">Dose (U)</label>
                    <input
                      type="number"
                      value={basalUnitsInput}
                      onChange={(e) => setBasalUnitsInput(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-[#161619] rounded-xl text-[#111111] dark:text-white"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-neutral-500 block mb-1">Horário</label>
                    <input
                      type="time"
                      value={basalTimeInput}
                      onChange={(e) => setBasalTimeInput(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-[#161619] rounded-xl text-[#111111] dark:text-white"
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    onUpdateRoutine({
                      basalTaken: true,
                      basalUnits: basalUnitsInput,
                      basalTime: basalTimeInput,
                    });
                  }}
                  className="w-full py-2.5 rounded-full bg-[#FF5A36] hover:bg-[#e84c29] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirmar Aplicação da Basal</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* CARD 3: ATIVIDADE FÍSICA SEGURA & ALERTA PRÉ-TREINO - lg:col-span-6 */}
        {effectiveEnabledGoals.exercise && (
          <div className="lg:col-span-6 bg-white dark:bg-[#161619] rounded-[28px] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-[#111111] dark:text-white tracking-tight">
                    Atividade Física Segura
                  </h4>
                  <p className="text-[11px] text-neutral-500">
                    Exercício com orientação glicêmica pré-treino
                  </p>
                </div>
              </div>

              <span className="text-xs font-mono font-extrabold text-[#111111] dark:text-white">
                {routineLog.exerciseMinutes} min
              </span>
            </div>

            <div className="rounded-2xl p-3.5 bg-[#F6F6F7] dark:bg-[#222226] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#111111] dark:text-white flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#FF5A36]" />
                  Assistente Pré-Treino:
                </span>
                <span className="text-xs font-mono font-bold text-[#FF5A36]">
                  Última Glicemia: {currentBg} mg/dL
                </span>
              </div>

              {isHypoPreWorkout && (
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  ⚠️ Abaixo de 100 mg/dL: consuma 15g de carboidrato antes de iniciar o treino.
                </p>
              )}
              {isGoodPreWorkout && (
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                  ✓ Faixa segura (100 - 250 mg/dL) para iniciar exercícios.
                </p>
              )}
              {isHyperPreWorkout && (
                <p className="text-[11px] text-rose-700 dark:text-rose-300">
                  🛑 Acima de 250 mg/dL: hidrate-se e verifique cetonas antes de esforço intenso.
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const updatedMins = routineLog.exerciseMinutes + 30;
                  onUpdateRoutine({
                    exerciseMinutes: updatedMins,
                    exerciseType: 'Caminhada aeróbica',
                  });
                }}
                className="flex-1 py-2.5 px-3 rounded-2xl bg-[#F6F6F7] dark:bg-[#222226] text-xs font-bold text-[#111111] dark:text-white hover:bg-neutral-200 transition text-center"
              >
                +30 min Caminhada
              </button>
              <button
                onClick={() => {
                  const updatedMins = routineLog.exerciseMinutes + 45;
                  onUpdateRoutine({
                    exerciseMinutes: updatedMins,
                    exerciseType: 'Musculação',
                  });
                }}
                className="flex-1 py-2.5 px-3 rounded-2xl bg-[#F6F6F7] dark:bg-[#222226] text-xs font-bold text-[#111111] dark:text-white hover:bg-neutral-200 transition text-center"
              >
                +45 min Musculação
              </button>
              {routineLog.exerciseMinutes > 0 && (
                <button
                  onClick={() => onUpdateRoutine({ exerciseMinutes: 0, exerciseType: '' })}
                  className="p-2.5 rounded-2xl bg-[#F6F6F7] dark:bg-[#222226] text-neutral-400 hover:text-red-500"
                  title="Zerar exercício do dia"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* CARD 4: GLICEMIA ANTES DE DORMIR - lg:col-span-6 */}
        {effectiveEnabledGoals.bedtime && (
          <div className="lg:col-span-6 bg-white dark:bg-[#161619] rounded-[28px] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Moon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-[#111111] dark:text-white tracking-tight">
                    Glicemia ao Deitar (Sono Seguro)
                  </h4>
                  <p className="text-[11px] text-neutral-500">
                    Prevenção de hipoglicemia noturna e pico da madrugada
                  </p>
                </div>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  routineLog.bedtimeCheckDone
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                    : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                }`}
              >
                {routineLog.bedtimeCheckDone ? '✓ Verificada' : 'Ao Deitar'}
              </span>
            </div>

            <div className="bg-[#F6F6F7] dark:bg-[#222226] p-4 rounded-2xl space-y-1.5 text-xs">
              <p className="font-bold text-[#111111] dark:text-white">
                Meta Recomendada Antes de Dormir: 100 a 140 mg/dL
              </p>
              <p className="text-neutral-500 dark:text-neutral-400 text-[11px]">
                Confira sua glicemia antes de dormir para evitar hipoglicemia durante a madrugada.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  onUpdateRoutine({ bedtimeCheckDone: !routineLog.bedtimeCheckDone });
                }}
                className="flex-1 py-2.5 rounded-full bg-[#111111] dark:bg-white text-white dark:text-[#111111] text-xs font-bold transition hover:opacity-90 flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>
                  {routineLog.bedtimeCheckDone ? 'Conferência Realizada ✓' : 'Marcar Conferência Feita'}
                </span>
              </button>
              <button
                onClick={onOpenManualReading}
                className="py-2.5 px-4 rounded-full bg-[#FF5A36] text-white text-xs font-bold transition hover:bg-[#e84c29]"
              >
                Medir
              </button>
            </div>
          </div>
        )}

        {/* CARD 5: NOTIFICAÇÕES PUSH & HORÁRIOS DOS MOMENTOS - lg:col-span-6 */}
        <div className="lg:col-span-6 bg-white dark:bg-[#161619] rounded-[28px] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#FF5A36]/15 text-[#FF5A36] flex items-center justify-center">
                <BellRing className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm sm:text-base text-[#111111] dark:text-white tracking-tight">
                  Notificações Push & Horários dos Momentos
                </h4>
                <p className="text-[11px] text-neutral-500">
                  Escolha o que quer ser notificado com o ícone oficial do app
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenRemindersPage}
              className="px-3 py-1.5 rounded-full bg-[#FF5A36] text-white text-[11px] font-bold hover:bg-[#e84c29] transition"
            >
              Configurar Push
            </button>
          </div>

          <div className="space-y-2">
            {momentsWithTime.length > 0 && (
              <div className="p-3 rounded-2xl bg-[#F6F6F7] dark:bg-[#222226] space-y-1.5">
                <span className="text-[10px] font-extrabold uppercase text-[#FF5A36] block">
                  Horários Programados nos Momentos da Medição:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {momentsWithTime.map((m) => (
                    <span
                      key={m.id}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                        m.notifyEnabled !== false
                          ? 'bg-white dark:bg-[#161619] text-[#111111] dark:text-white'
                          : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 line-through'
                      }`}
                    >
                      <Clock className="w-3 h-3 text-[#FF5A36]" />
                      <span>{m.label}:</span>
                      <strong className="font-mono text-[#FF5A36]">{m.notifyTime}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {reminders.slice(0, 3).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-[#F6F6F7] dark:bg-[#222226]"
              >
                <div className="min-w-0">
                  <span className="text-xs font-bold text-[#111111] dark:text-white block truncate">
                    {r.title}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {r.timeString} · {r.type === 'basal' ? 'Insulina Basal' : 'Alerta Glicemia'}
                  </span>
                </div>
                <button
                  onClick={() => onToggleReminder(r.id)}
                  className={`w-9 h-5 rounded-full transition-colors relative flex items-center ${
                    r.enabled ? 'bg-[#FF5A36]' : 'bg-neutral-300 dark:bg-neutral-700'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${
                      r.enabled ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* HISTÓRICO DOS OBJETIVOS DIÁRIOS DO DIABÉTICO */}
      <div className="bg-white dark:bg-[#161619] rounded-[28px] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#FF5A36]/15 text-[#FF5A36] flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-sm sm:text-base text-[#111111] dark:text-white tracking-tight">
                Histórico dos Objetivos Diários
              </h4>
              <p className="text-[11px] text-neutral-500">
                Registro diário salvo automaticamente para acompanhar sua evolução
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#F6F6F7] dark:bg-[#222226] text-xs font-mono font-bold text-[#111111] dark:text-white">
            {sortedHistory.length} {sortedHistory.length === 1 ? 'dia registrado' : 'dias registrados'}
          </span>
        </div>

        {sortedHistory.length === 0 ? (
          <p className="text-xs text-neutral-400 text-center py-4">
            Interaja com seus objetivos de hoje para iniciar seu histórico diário.
          </p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {sortedHistory.map((item) => {
              const stats = computeLogProgress(item);
              const isSelectedDay = item.date === selectedRoutineDate;
              return (
                <div
                  key={item.date}
                  onClick={() => onSelectRoutineDate(item.date)}
                  className={`p-3.5 rounded-2xl transition cursor-pointer flex flex-wrap items-center justify-between gap-3 text-xs border ${
                    isSelectedDay
                      ? 'bg-[#FF5A36]/10 border-[#FF5A36]'
                      : 'bg-[#F6F6F7] dark:bg-[#222226] border-transparent hover:border-neutral-300 dark:hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white dark:bg-[#161619] border-2 border-[#FF5A36] flex items-center justify-center font-mono font-extrabold text-[11px] text-[#111111] dark:text-white shrink-0">
                      {stats.pct}%
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#111111] dark:text-white">
                          {item.date === todayKey ? 'Hoje' : formatRoutineDateLabel(item.date)}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-400">
                          ({item.date.split('-').reverse().join('/')})
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-500">
                        {stats.done} de {stats.total} objetivos ativos concluídos
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {effectiveEnabledGoals.water && (
                      <span className="px-2.5 py-1 rounded-full bg-white dark:bg-[#161619] text-[11px] font-mono font-bold text-[#0284C7] dark:text-[#38BDF8]">
                        💧 {item.waterMl}ml
                      </span>
                    )}
                    {effectiveEnabledGoals.basal && (
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          item.basalTaken
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                            : 'bg-white dark:bg-[#161619] text-neutral-400'
                        }`}
                      >
                        💉 {item.basalTaken ? `${item.basalUnits}U Basal` : 'Sem Basal'}
                      </span>
                    )}
                    {effectiveEnabledGoals.exercise && item.exerciseMinutes > 0 && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold">
                        🏃 {item.exerciseMinutes} min
                      </span>
                    )}
                    {effectiveEnabledGoals.bedtime && item.bedtimeCheckDone && (
                      <span className="px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-400 text-[11px] font-bold">
                        🌙 Ao deitar ✓
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
