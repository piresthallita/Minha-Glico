import React, { useState } from 'react';
import {
  CheckCircle2,
  Droplets,
  Syringe,
  Activity,
  Heart,
  Moon,
  Plus,
  AlertTriangle,
  Clock,
  Sparkles,
  Info,
  Calendar,
  Check,
  RotateCcw,
  Footprints,
  ShieldAlert,
} from 'lucide-react';
import {
  DailyRoutineLog,
  PatientProfile,
  GlucoseReading,
  ReminderItem,
} from '../types';
import { getGlucoseContextLabel } from '../utils/clinicalCalculations';

interface DailyRoutineViewProps {
  routineLog: DailyRoutineLog;
  onUpdateRoutine: (updated: Partial<DailyRoutineLog>) => void;
  profile: PatientProfile;
  latestReading?: GlucoseReading;
  reminders: ReminderItem[];
  onToggleReminder: (id: string) => void;
  onDeleteReminder: (id: string) => void;
  onAddReminder: (reminder: ReminderItem) => void;
  onOpenManualReading: () => void;
  isDark: boolean;
}

export const DailyRoutineView: React.FC<DailyRoutineViewProps> = ({
  routineLog,
  onUpdateRoutine,
  profile,
  latestReading,
  reminders,
  onToggleReminder,
  onOpenManualReading,
}) => {
  // Local exercise input
  const [exerciseMinsInput, setExerciseMinsInput] = useState<number>(30);
  const [exerciseTypeInput, setExerciseTypeInput] = useState<string>('Caminhada');
  const [showExerciseForm, setShowExerciseForm] = useState(false);

  // Local basal dose input
  const [basalUnitsInput, setBasalUnitsInput] = useState<number>(
    routineLog.basalUnits || 22
  );
  const [basalTimeInput, setBasalTimeInput] = useState<string>(
    routineLog.basalTime || '08:00'
  );
  const [showBasalForm, setShowBasalForm] = useState(false);

  // Foot check checklist state
  const [footCheck1, setFootCheck1] = useState(true);
  const [footCheck2, setFootCheck2] = useState(true);
  const [footCheck3, setFootCheck3] = useState(true);

  // Water helper calculations
  const waterPct = Math.min(
    100,
    Math.round((routineLog.waterMl / routineLog.waterGoalMl) * 100)
  );

  const handleAddWater = (ml: number) => {
    const newAmount = Math.max(0, routineLog.waterMl + ml);
    onUpdateRoutine({ waterMl: newAmount });
  };

  const handleResetWater = () => {
    onUpdateRoutine({ waterMl: 0 });
  };

  // Goals completion count
  const goals = [
    {
      id: 'fasting',
      title: 'Glicemia em Jejum',
      completed: true, // initial readings have fasting
      subtitle: 'Meta matinal aferida',
    },
    {
      id: 'basal',
      title: 'Insulina Basal Diária',
      completed: routineLog.basalTaken,
      subtitle: routineLog.basalTaken
        ? `Aplicada (${routineLog.basalUnits}U às ${routineLog.basalTime || '08:00'})`
        : 'Pendente hoje',
    },
    {
      id: 'water',
      title: 'Hidratação (Água)',
      completed: routineLog.waterMl >= routineLog.waterGoalMl,
      subtitle: `${routineLog.waterMl} ml de ${routineLog.waterGoalMl} ml (${waterPct}%)`,
    },
    {
      id: 'exercise',
      title: 'Atividade Física Segura',
      completed: routineLog.exerciseMinutes > 0,
      subtitle:
        routineLog.exerciseMinutes > 0
          ? `${routineLog.exerciseMinutes} min (${routineLog.exerciseType || 'Exercício'})`
          : 'Pendente',
    },
    {
      id: 'feet',
      title: 'Exame Preventivo dos Pés',
      completed: routineLog.footCheckDone,
      subtitle: routineLog.footCheckDone ? 'Pés inspecionados hoje' : 'Pendente',
    },
    {
      id: 'bedtime',
      title: 'Glicemia Antes de Dormir',
      completed: routineLog.bedtimeCheckDone,
      subtitle: routineLog.bedtimeCheckDone
        ? 'Meta de sono seguro checada'
        : 'Pendente (ao deitar)',
    },
  ];

  const completedCount = goals.filter((g) => g.completed).length;
  const progressPercent = Math.round((completedCount / goals.length) * 100);

  // Pre-workout safety check
  const currentBg = latestReading?.value || 110;
  const isHypoPreWorkout = currentBg < 100;
  const isGoodPreWorkout = currentBg >= 100 && currentBg <= 250;
  const isHyperPreWorkout = currentBg > 250;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* HEADER CARD: Resumo das Metas Diárias */}
      <div className="bg-white dark:bg-[#161619] rounded-[28px] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#FF5A36]/15 text-[#FF5A36] flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </span>
            <h3 className="font-extrabold text-base sm:text-lg text-[#111111] dark:text-white tracking-tight">
              Objetivos Diários do Diabético
            </h3>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Acompanhe todos os pilares essenciais para evitar hipoglicemias, desidratação e complicações a longo prazo.
          </p>
        </div>

        {/* Circular / Progress Indicator */}
        <div className="flex items-center gap-4 bg-[#F6F6F7] dark:bg-[#222226] p-3 rounded-2xl shrink-0">
          <div className="w-12 h-12 rounded-full border-4 border-[#FF5A36] flex items-center justify-center font-mono font-extrabold text-xs text-[#111111] dark:text-white">
            {progressPercent}%
          </div>
          <div>
            <div className="text-xs font-bold text-[#111111] dark:text-white">
              {completedCount} de {goals.length} metas concluídas
            </div>
            <div className="text-[11px] text-neutral-500">
              {completedCount === goals.length
                ? '🎉 Parabéns! Todos os objetivos cumpridos!'
                : 'Mantenha o foco na sua rotina diária'}
            </div>
          </div>
        </div>
      </div>

      {/* GRID DE CARTOES DE ROTINA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-stretch">
        {/* CARD 1: HIDRATAÇÃO (ÁGUA) - lg:col-span-6 */}
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
                  / {routineLog.waterGoalMl} ml
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

          {/* Clinical Tip */}
          <div className="p-3 rounded-2xl bg-[#F0F9FF] dark:bg-[#0C2A3A] border border-[#BAE6FD] dark:border-[#0369A1] text-[11px] text-[#0369A1] dark:text-[#7DD3FC] flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>Por que beber água:</strong> A hiperglicemia causa perda de líquidos pela urina (efeito osmótico). Manter boa hidratação reduz a sobrecarga renal e ajuda a normalizar a glicose.
            </span>
          </div>
        </div>

        {/* CARD 2: INSULINA BASAL DIÁRIA - lg:col-span-6 */}
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
              {routineLog.basalTaken ? '✓ Aplicada Hoje' : '⚠️ Pendente'}
            </span>
          </div>

          {/* Status Display or Form */}
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
              <p className="text-xs text-amber-900 dark:text-amber-300">
                Você ainda não registrou a aplicação da sua insulina basal hoje. Nunca pule sua basal para evitar cetoacidose.
              </p>

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

          {/* Clinical Tip */}
          <div className="p-3 rounded-2xl bg-[#F6F6F7] dark:bg-[#222226] text-[11px] text-neutral-600 dark:text-neutral-400 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 text-[#FF5A36] mt-0.5" />
            <span>
              <strong>Dica de segurança:</strong> Aplicar a insulina basal sempre no mesmo horário todos os dias assegura uma liberação constante no sangue sem picos indesejados.
            </span>
          </div>
        </div>

        {/* CARD 3: ATIVIDADE FÍSICA SEGURA & ALERTA PRÉ-TREINO - lg:col-span-6 */}
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
              {routineLog.exerciseMinutes} min hoje
            </span>
          </div>

          {/* SEMÁFORO CLÍNICO PRÉ-TREINO */}
          <div className="rounded-2xl p-4 border transition-colors duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#111111] dark:text-white flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-[#FF5A36]" />
                Assistente Pré-Treino:
              </span>
              <span className="text-xs font-mono font-bold text-[#FF5A36]">
                Última Glicemia: {currentBg} mg/dL
              </span>
            </div>

            {isHypoPreWorkout && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 rounded-xl text-xs text-amber-900 dark:text-amber-300 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  ⚠️ Glicemia Baixa para Iniciar Exercício (&lt;100 mg/dL)
                </p>
                <p className="text-[11px]">
                  Consuma <strong>15g a 20g de carboidratos</strong> (ex: 1 fruta, 200ml de suco ou água de coco) antes de começar. O exercício muscular capta glicose sem insulina e pode causar hipoglicemia severa.
                </p>
              </div>
            )}

            {isGoodPreWorkout && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 rounded-xl text-xs text-emerald-900 dark:text-emerald-300 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  ✓ Faixa Ideal para Exercício (100 - 250 mg/dL)
                </p>
                <p className="text-[11px]">
                  Sua glicemia está excelente para treino aeróbico ou muscular. Leve sempre carboidratos rápidos para emergência e água.
                </p>
              </div>
            )}

            {isHyperPreWorkout && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 rounded-xl text-xs text-rose-900 dark:text-rose-300 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  🛑 Glicemia Muito Alta (&gt;250 mg/dL)
                </p>
                <p className="text-[11px]">
                  Verifique presença de cetonas no sangue/urina. Se houver cetose, adie treinos extenuantes e beba bastante água para prevenir cetoacidose.
                </p>
              </div>
            )}
          </div>

          {/* Quick Log Form */}
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
            <button
              onClick={() => onOpenManualReading()}
              className="py-2.5 px-3 rounded-2xl bg-[#FF5A36] text-white text-xs font-bold transition hover:bg-[#e84c29]"
              title="Medir glicemia pré/pós treino"
            >
              Medir
            </button>
          </div>
        </div>

        {/* CARD 4: EXAME DIÁRIO DOS PÉS (SBD/ADA) - lg:col-span-6 */}
        <div className="lg:col-span-6 bg-white dark:bg-[#161619] rounded-[28px] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Footprints className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm sm:text-base text-[#111111] dark:text-white tracking-tight">
                  Exame Diário dos Pés
                </h4>
                <p className="text-[11px] text-neutral-500">
                  Prevenção diária de lesões e pé diabético (SBD)
                </p>
              </div>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                routineLog.footCheckDone
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
              }`}
            >
              {routineLog.footCheckDone ? '✓ Realizado Hoje' : 'Pendente'}
            </span>
          </div>

          {/* 30-Second Checklist */}
          <div className="space-y-2 bg-[#F6F6F7] dark:bg-[#222226] p-4 rounded-2xl">
            <p className="text-xs font-bold text-[#111111] dark:text-white">
              Inspeção rápida de 30 segundos:
            </p>
            <div className="space-y-1.5 text-xs text-neutral-600 dark:text-neutral-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={footCheck1}
                  onChange={(e) => setFootCheck1(e.target.checked)}
                  className="rounded text-[#FF5A36] focus:ring-[#FF5A36]"
                />
                <span>Sem cortes, bolhas, calosidades ou rachaduras</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={footCheck2}
                  onChange={(e) => setFootCheck2(e.target.checked)}
                  className="rounded text-[#FF5A36] focus:ring-[#FF5A36]"
                />
                <span>Pele hidratada e sem áreas avermelhadas ou quentes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={footCheck3}
                  onChange={(e) => setFootCheck3(e.target.checked)}
                  className="rounded text-[#FF5A36] focus:ring-[#FF5A36]"
                />
                <span>Sensibilidade tátil preservada entre os dedos e na sola</span>
              </label>
            </div>
          </div>

          <button
            onClick={() => {
              onUpdateRoutine({
                footCheckDone: true,
                footCheckNotes: 'Exame de 30s concluído: pés íntegros e sem lesões.',
              });
            }}
            className="w-full py-2.5 rounded-full bg-[#111111] dark:bg-white text-white dark:text-[#111111] text-xs font-bold transition hover:opacity-90 flex items-center justify-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Confirmar Inspeção dos Pés Hoje</span>
          </button>
        </div>

        {/* CARD 5: GLICEMIA ANTES DE DORMIR - lg:col-span-6 */}
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

          <div className="bg-[#F6F6F7] dark:bg-[#222226] p-4 rounded-2xl space-y-2 text-xs">
            <p className="font-bold text-[#111111] dark:text-white">
              Meta Recomendada Antes de Dormir: 100 a 140 mg/dL
            </p>
            <p className="text-neutral-500 dark:text-neutral-400 text-[11px]">
              Se sua glicemia ao deitar estiver abaixo de 100 mg/dL ou com insulina rápida ativa alta, consuma uma ceia leve com carboidratos complexos e proteínas (ex: iogurte ou castanhas) para estabilizar durante a madrugada.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                onUpdateRoutine({ bedtimeCheckDone: true });
              }}
              className="flex-1 py-2.5 rounded-full bg-[#111111] dark:bg-white text-white dark:text-[#111111] text-xs font-bold transition hover:opacity-90 flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Marcar Conferência Feita</span>
            </button>
            <button
              onClick={onOpenManualReading}
              className="py-2.5 px-4 rounded-full bg-[#FF5A36] text-white text-xs font-bold transition hover:bg-[#e84c29]"
            >
              Registrar
            </button>
          </div>
        </div>

        {/* CARD 6: LEMBRETES E ALARMES ATIVOS - lg:col-span-6 */}
        <div className="lg:col-span-6 bg-white dark:bg-[#161619] rounded-[28px] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#FF5A36]/15 text-[#FF5A36] flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm sm:text-base text-[#111111] dark:text-white tracking-tight">
                  Lembretes & Alarmes Ativos
                </h4>
                <p className="text-[11px] text-neutral-500">
                  Notificações sonoras e na tela para a sua rotina
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
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
                    {r.timeString} · {r.type === 'basal' ? 'Insulina Basal' : 'Glicemia'}
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
    </div>
  );
};
