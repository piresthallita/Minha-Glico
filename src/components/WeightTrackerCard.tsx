import React, { useState } from 'react';
import { WeightRecord, GlucoseReading } from '../types';
import { calculateTIR } from '../utils/clinicalCalculations';
import {
  Scale,
  TrendingDown,
  TrendingUp,
  Minus,
  Plus,
  HeartPulse,
  Calendar,
  X,
  Trash2,
  Check,
} from 'lucide-react';

interface WeightTrackerCardProps {
  weights: WeightRecord[];
  onAddWeight: (weightKg: number, heightCm: number, notes?: string) => void;
  onDeleteWeight: (id: string) => void;
  userHeightCm: number;
  onUpdateHeight: (heightCm: number) => void;
  readings: GlucoseReading[];
  isDark?: boolean;
}

export function getBmiCategory(bmi: number): {
  label: string;
  colorClass: string;
} {
  if (bmi < 18.5) {
    return {
      label: 'Abaixo do peso',
      colorClass: 'text-amber-600 dark:text-amber-400',
    };
  }
  if (bmi <= 24.9) {
    return {
      label: 'Peso Ideal',
      colorClass: 'text-emerald-600 dark:text-emerald-400',
    };
  }
  if (bmi <= 29.9) {
    return {
      label: 'Sobrepeso',
      colorClass: 'text-[#FF5A36]',
    };
  }
  return {
    label: 'Obesidade',
    colorClass: 'text-red-600 dark:text-red-400',
  };
}

export const WeightTrackerCard: React.FC<WeightTrackerCardProps> = ({
  weights,
  onAddWeight,
  onDeleteWeight,
  userHeightCm,
  onUpdateHeight,
  readings,
}) => {
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isEditingHeight, setIsEditingHeight] = useState(false);
  const [tempHeight, setTempHeight] = useState(String(userHeightCm || 172));

  // Form state for adding weight
  const [inputWeight, setInputWeight] = useState('');
  const [inputNotes, setInputNotes] = useState('');

  // Sort weights by date descending
  const sortedWeights = [...weights].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const latestWeight = sortedWeights[0];
  const previousWeight = sortedWeights[1];

  // Calculate weight delta
  const weightDelta =
    latestWeight && previousWeight
      ? Number((latestWeight.weightKg - previousWeight.weightKg).toFixed(1))
      : 0;

  // Current BMI
  const effectiveHeight = userHeightCm || 172;
  const currentBmi = latestWeight
    ? Number((latestWeight.weightKg / Math.pow(effectiveHeight / 100, 2)).toFixed(1))
    : 0;
  const bmiCategory = getBmiCategory(currentBmi);

  // Glycemic control correlation
  const tirStats = calculateTIR(readings);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(inputWeight);
    if (!val || val <= 20 || val > 350) return;
    onAddWeight(val, effectiveHeight, inputNotes.trim() || undefined);
    setInputWeight('');
    setInputNotes('');
    setIsLogModalOpen(false);
  };

  const handleSaveHeight = () => {
    const h = parseInt(tempHeight, 10);
    if (h >= 100 && h <= 250) {
      onUpdateHeight(h);
      setIsEditingHeight(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#161619] rounded-[28px] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-bold text-base text-[#111111] dark:text-white tracking-tight">
            Peso Corporal & Sensibilidade
          </h4>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            Correlação clínica entre IMC e Fator de Sensibilidade (ISF)
          </span>
        </div>

        <button
          onClick={() => setIsLogModalOpen(true)}
          className="px-4 py-2 bg-[#FF5A36] hover:bg-[#e84c29] text-white font-semibold text-xs rounded-full flex items-center gap-1.5 transition shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Registrar Peso</span>
        </button>
      </div>

      {/* Main KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
        {/* Weight KPI */}
        <div className="p-4 bg-[#F6F6F7] dark:bg-[#202024] rounded-2xl">
          <span className="text-xs text-neutral-500 dark:text-neutral-400 block">
            Peso Atual
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-[#FF5A36] font-bold text-sm">kg</span>
            <span className="font-mono text-2xl font-extrabold text-[#111111] dark:text-white tabular-nums">
              {latestWeight ? latestWeight.weightKg : '--'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] mt-1">
            {weightDelta < 0 ? (
              <span className="text-emerald-600 font-semibold flex items-center">
                <TrendingDown className="w-3 h-3 mr-0.5" />
                {weightDelta} kg
              </span>
            ) : weightDelta > 0 ? (
              <span className="text-[#FF5A36] font-semibold flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" />
                +{weightDelta} kg
              </span>
            ) : (
              <span className="text-neutral-400 flex items-center">
                <Minus className="w-3 h-3 mr-0.5" />
                Estável
              </span>
            )}
          </div>
        </div>

        {/* BMI KPI */}
        <div className="p-4 bg-[#F6F6F7] dark:bg-[#202024] rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              IMC
            </span>
            {isEditingHeight ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={tempHeight}
                  onChange={(e) => setTempHeight(e.target.value)}
                  className="w-12 px-1 py-0.5 text-[10px] border border-[#FF5A36] rounded bg-white dark:bg-neutral-800 text-center"
                />
                <button
                  onClick={handleSaveHeight}
                  className="p-0.5 text-emerald-600 hover:text-emerald-700"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingHeight(true)}
                className="text-[11px] text-[#FF5A36] font-semibold hover:underline"
                title="Editar Altura"
              >
                {effectiveHeight} cm
              </button>
            )}
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-mono text-2xl font-extrabold text-[#111111] dark:text-white tabular-nums">
              {currentBmi || '--'}
            </span>
            <span className="text-[11px] text-neutral-400">kg/m²</span>
          </div>
          <span className={`block text-[11px] font-semibold mt-1 ${bmiCategory.colorClass}`}>
            {bmiCategory.label}
          </span>
        </div>

        {/* Glycemic Metric Correlation 1: HbA1c / GMI */}
        <div className="p-4 bg-[#F6F6F7] dark:bg-[#202024] rounded-2xl">
          <span className="text-xs text-neutral-500 dark:text-neutral-400 block">
            HbA1c Estimada
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-[#FF5A36] font-bold text-sm">%</span>
            <span className="font-mono text-2xl font-extrabold text-[#111111] dark:text-white tabular-nums">
              {tirStats.estimatedHbA1c}
            </span>
          </div>
          <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block truncate mt-1">
            Média {tirStats.meanGlucose} mg/dL
          </span>
        </div>

        {/* Glycemic Metric Correlation 2: Time in Range */}
        <div className="p-4 bg-[#F6F6F7] dark:bg-[#202024] rounded-2xl">
          <span className="text-xs text-neutral-500 dark:text-neutral-400 block">
            Tempo no Alvo
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-[#FF5A36] font-bold text-sm">%</span>
            <span className="font-mono text-2xl font-extrabold text-[#111111] dark:text-white tabular-nums">
              {tirStats.inRangePercent}
            </span>
          </div>
          <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block truncate mt-1">
            CV {tirStats.coefficientOfVariation}%
          </span>
        </div>
      </div>

      {/* Recent Weight Evolution */}
      {weights.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
            <span className="font-semibold text-[#111111] dark:text-white">Histórico de Pesagens</span>
            <span>{weights.length} registros</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sortedWeights.slice(0, 4).map((w) => {
              const cat = getBmiCategory(w.bmi);
              return (
                <div
                  key={w.id}
                  className="flex items-center justify-between px-4 py-2.5 rounded-full bg-[#F6F6F7] dark:bg-[#202024] text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Calendar className="w-3.5 h-3.5 text-[#FF5A36] shrink-0" />
                    <span className="font-mono text-neutral-700 dark:text-neutral-300 text-[11px]">
                      {new Date(w.timestamp).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>
                    {w.notes && (
                      <span className="text-[11px] text-neutral-400 truncate max-w-[110px]">
                        · {w.notes}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="font-mono font-bold text-[#111111] dark:text-white tabular-nums">
                      <span className="text-[#FF5A36] mr-0.5">kg</span>
                      {w.weightKg}
                    </span>
                    <span className={`text-[10px] font-semibold ${cat.colorClass}`}>
                      IMC {w.bmi}
                    </span>
                    <button
                      onClick={() => onDeleteWeight(w.id)}
                      className="p-1 text-neutral-400 hover:text-red-500 rounded-full transition"
                      title="Excluir pesagem"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Weight Modal */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#161619] rounded-[28px] max-w-sm w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-[#FF5A36]" />
                <h4 className="font-bold text-sm text-[#111111] dark:text-white">Registrar Peso</h4>
              </div>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="py-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Peso Corporal (kg):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="30"
                    max="300"
                    placeholder="Ex: 73.5"
                    value={inputWeight}
                    onChange={(e) => setInputWeight(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-[#F6F6F7] dark:bg-[#202024] text-[#111111] dark:text-white font-mono font-bold text-base focus:ring-2 focus:ring-[#FF5A36]"
                    autoFocus
                    required
                  />
                  <span className="absolute right-3.5 top-3 text-xs text-[#FF5A36] font-bold">
                    kg
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Altura Atual (cm):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={effectiveHeight}
                    onChange={(e) => onUpdateHeight(parseInt(e.target.value, 10) || 172)}
                    className="w-24 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-[#F6F6F7] dark:bg-[#202024] text-[#111111] dark:text-white font-mono text-xs"
                  />
                  <span className="text-neutral-400 text-xs">cm (para cálculo do IMC)</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Observações (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ex: Em jejum, pós-treino..."
                  value={inputNotes}
                  onChange={(e) => setInputNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-[#F6F6F7] dark:bg-[#202024] text-[#111111] dark:text-white text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 text-neutral-600 dark:text-neutral-400 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#FF5A36] hover:bg-[#e84c29] text-white font-bold text-xs rounded-full shadow-xs transition"
                >
                  Salvar Pesagem
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
