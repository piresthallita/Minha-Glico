import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Trash2,
  X,
  ArrowRight,
  RotateCcw,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';

interface ResetAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmResetAll: () => Promise<void>;
  counts: {
    readings: number;
    meals: number;
    doses: number;
    weights: number;
    reminders: number;
  };
  isCloudConnected: boolean;
}

export const ResetAllModal: React.FC<ResetAllModalProps> = ({
  isOpen,
  onClose,
  onConfirmResetAll,
  counts,
  isCloudConnected,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [acknowledged, setAcknowledged] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setAcknowledged(false);
      setIsResetting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFinalReset = async () => {
    if (!acknowledged || isResetting) return;
    setIsResetting(true);
    try {
      await onConfirmResetAll();
      onClose();
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#161619] rounded-[28px] max-w-md w-full p-5 sm:p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header with Step Indicator */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                step === 1
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'bg-red-600 text-white shadow-md shadow-red-600/25'
              }`}
            >
              {step === 1 ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <ShieldAlert className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    step === 1
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      : 'bg-red-500/15 text-red-600 dark:text-red-400'
                  }`}
                >
                  Etapa {step} de 2
                </span>
              </div>
              <h3 className="font-extrabold text-base sm:text-lg text-[#111111] dark:text-white tracking-tight mt-0.5">
                {step === 1 ? 'Zerar Todos os Dados?' : 'Confirmação Definitiva'}
              </h3>
            </div>
          </div>

          <button
            type="button"
            disabled={isResetting}
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F6F6F7] dark:bg-[#222226] text-neutral-500 hover:text-[#111111] dark:hover:text-white flex items-center justify-center transition"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="grid grid-cols-2 gap-2 my-3.5">
          <div className="h-1.5 rounded-full bg-[#FF5A36]" />
          <div
            className={`h-1.5 rounded-full transition-colors ${
              step === 2 ? 'bg-red-600' : 'bg-neutral-200 dark:bg-neutral-800'
            }`}
          />
        </div>

        {step === 1 ? (
          /* ============================================================ */
          /* STEP 1: FIRST CONFIRMATION & SUMMARY OF DATA TO BE WIPED     */
          /* ============================================================ */
          <div className="space-y-4">
            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Esta ação vai <strong className="text-[#111111] dark:text-white">zerar completamente</strong> o seu aplicativo para que você comece do zero absoluto, sem nenhum histórico anterior.
            </p>

            <div className="p-3.5 rounded-2xl bg-[#F6F6F7] dark:bg-[#222226] space-y-2 text-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 block">
                O que será apagado:
              </span>
              <ul className="space-y-1.5 text-neutral-700 dark:text-neutral-300 font-medium">
                <li className="flex items-center justify-between">
                  <span>• Medições de glicemia</span>
                  <span className="font-mono font-bold text-[#FF5A36]">{counts.readings} reg.</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>• Refeições, pratos e favoritos</span>
                  <span className="font-mono font-bold text-[#FF5A36]">{counts.meals} reg.</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>• Doses de insulina e rodízio</span>
                  <span className="font-mono font-bold text-[#FF5A36]">{counts.doses} reg.</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>• Histórico de peso e IMC</span>
                  <span className="font-mono font-bold text-[#FF5A36]">{counts.weights} reg.</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>• Lembretes e rotina diária (água/metas)</span>
                  <span className="font-mono font-bold text-[#FF5A36]">{counts.reminders} reg.</span>
                </li>
              </ul>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-full bg-[#F6F6F7] dark:bg-[#222226] text-neutral-700 dark:text-neutral-300 text-xs font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 py-2.5 px-4 rounded-full bg-[#FF5A36] hover:bg-[#e84c29] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition"
              >
                <span>Continuar (1/2)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* STEP 2: FINAL CONFIRMATION                                   */
          /* ============================================================ */
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-800 dark:text-red-200 space-y-1">
              <p className="font-extrabold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                Atenção: Exclusão Permanente!
              </p>
              <p className="text-[11px] leading-relaxed opacity-90">
                {isCloudConnected
                  ? 'Todos os dados salvos neste dispositivo e na sua conta na nuvem (Firebase) serão removidos e não poderão ser desfeitos.'
                  : 'Todos os dados salvos neste dispositivo serão removidos e não poderão ser desfeitos.'}
              </p>
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#F6F6F7] dark:bg-[#222226] cursor-pointer select-none border border-transparent hover:border-red-500/40 transition">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-red-600 rounded shrink-0"
              />
              <span className="text-xs font-semibold text-[#111111] dark:text-white leading-snug">
                Confirmo que desejo apagar todos os registros e deixar minha conta totalmente zerada.
              </span>
            </label>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setStep(1)}
                className="py-2.5 px-4 rounded-full bg-[#F6F6F7] dark:bg-[#222226] text-neutral-700 dark:text-neutral-300 text-xs font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Voltar</span>
              </button>

              <button
                type="button"
                disabled={!acknowledged || isResetting}
                onClick={handleFinalReset}
                className="flex-1 py-2.5 px-4 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-red-600/20 transition"
              >
                {isResetting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Zerando tudo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sim, Zerar Tudo Agora (2/2)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
