import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, Phone, Volume2, VolumeX, CheckCircle, RefreshCw } from 'lucide-react';
import { playEmergencyAlertSound } from '../utils/clinicalCalculations';
import { PatientProfile } from '../types';

interface HypoEmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBg?: number;
  profile: PatientProfile;
  onLogNewReading: (val: number) => void;
}

export const HypoEmergencyModal: React.FC<HypoEmergencyModalProps> = ({
  isOpen,
  onClose,
  currentBg,
  profile,
  onLogNewReading,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(15 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [stepChecked, setStepChecked] = useState<number[]>([1]);
  const [newBgInput, setNewBgInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSecondsLeft(15 * 60);
      setTimerRunning(true);
      if (soundEnabled) {
        playEmergencyAlertSound('hypo');
      }
    }
  }, [isOpen]);

  useEffect(() => {
    let interval: any = null;
    if (timerRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            if (soundEnabled) playEmergencyAlertSound('hypo');
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, secondsLeft, soundEnabled]);

  if (!isOpen) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const isSevere = currentBg ? currentBg < 54 : false;

  const toggleStep = (step: number) => {
    if (stepChecked.includes(step)) {
      setStepChecked(stepChecked.filter((s) => s !== step));
    } else {
      setStepChecked([...stepChecked, step]);
    }
  };

  const handleRetestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(newBgInput);
    if (val > 0) {
      onLogNewReading(val);
      setNewBgInput('');
      if (val >= 70) {
        onClose();
      } else {
        // restart 15 min
        setSecondsLeft(15 * 60);
        setTimerRunning(true);
        if (soundEnabled) playEmergencyAlertSound('hypo');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border-4 border-red-500 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b pb-4 border-red-100 dark:border-red-900/50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 dark:bg-red-950 text-red-600 rounded-xl">
              <AlertTriangle className="w-8 h-8 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-red-600 text-white text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                  {isSevere ? 'Hipoglicemia Severa (< 54)' : 'Alerta de Hipoglicemia (< 70)'}
                </span>
                {currentBg && (
                  <span className="font-mono text-xl font-extrabold text-red-700 dark:text-red-400">
                    {currentBg} mg/dL
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mt-1">
                Protocolo de Primeiros Socorros: Regra dos 15
              </h2>
            </div>
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg text-sm border ${
              soundEnabled
                ? 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-500'
            }`}
            title={soundEnabled ? 'Silenciar alarme' : 'Ativar alarme'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>

        {/* Timer Box */}
        <div className="my-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 rounded-xl p-4 text-center">
          <p className="text-xs uppercase tracking-wide font-semibold text-red-700 dark:text-red-300">
            Tempo restante para reteste de glicemia
          </p>
          <div className="flex items-center justify-center gap-2 my-1">
            <Clock className="w-6 h-6 text-red-600 dark:text-red-400 animate-spin" style={{ animationDuration: '4s' }} />
            <span className="font-mono text-3xl sm:text-4xl font-extrabold text-red-700 dark:text-red-400">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>
          <p className="text-xs text-red-600 dark:text-red-300">
            Aguarde 15 minutos em repouso após ingerir o carboidrato antes de medir novamente.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-2.5">
          {/* Step 1 */}
          <div
            onClick={() => toggleStep(1)}
            className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
              stepChecked.includes(1)
                ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                : 'bg-gray-50 dark:bg-slate-800/60 border-gray-200 dark:border-slate-700'
            }`}
          >
            <div className={`mt-0.5 rounded-full p-1 ${stepChecked.includes(1) ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white">
                1. Ingerir 15g de Carboidrato Simples (Ação Rápida)
              </p>
              <p className="text-xs text-gray-600 dark:text-slate-300 mt-0.5">
                Opções: 1 colher de sopa de açúcar na água, 150ml de suco de laranja/uva ou 1 sachê de mel. 
                <strong className="text-red-700 dark:text-red-400 font-medium"> Evite chocolates ou biscoitos</strong> (a gordura retarda o resgate).
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div
            onClick={() => toggleStep(2)}
            className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
              stepChecked.includes(2)
                ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                : 'bg-gray-50 dark:bg-slate-800/60 border-gray-200 dark:border-slate-700'
            }`}
          >
            <div className={`mt-0.5 rounded-full p-1 ${stepChecked.includes(2) ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white">
                2. Aguardar 15 Minutos em Repouso Absoluto
              </p>
              <p className="text-xs text-gray-600 dark:text-slate-300 mt-0.5">
                Não aplique insulina de correção. Sente-se ou deite-se para evitar quedas e reduzir o consumo muscular de glicose.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div
            onClick={() => toggleStep(3)}
            className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
              stepChecked.includes(3)
                ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                : 'bg-gray-50 dark:bg-slate-800/60 border-gray-200 dark:border-slate-700'
            }`}
          >
            <div className={`mt-0.5 rounded-full p-1 ${stepChecked.includes(3) ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white">
                3. Medir a Glicemia Capilar Novamente
              </p>
              <p className="text-xs text-gray-600 dark:text-slate-300 mt-0.5">
                Se continuar abaixo de 70 mg/dL: repita mais 15g de carboidrato e mais 15 min. Se normalizou (&gt; 70) e a próxima refeição for demorar mais de 1h, coma um lanche complexo.
              </p>
            </div>
          </div>
        </div>

        {/* Retest Input Form */}
        <form onSubmit={handleRetestSubmit} className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <input
              type="number"
              placeholder="Novo valor de teste (ex: 85 mg/dL)"
              value={newBgInput}
              onChange={(e) => setNewBgInput(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-red-500"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Registrar Reteste
          </button>
        </form>

        {/* Emergency contact button */}
        {profile.emergencyContactPhone && (
          <div className="mt-3 p-3 bg-red-100/60 dark:bg-red-950/60 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-red-900 dark:text-red-300">Contato de Emergência:</p>
              <p className="text-xs text-red-700 dark:text-red-400">{profile.emergencyContactName} - {profile.emergencyContactPhone}</p>
            </div>
            <a
              href={`tel:${profile.emergencyContactPhone.replace(/\D/g, '')}`}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition"
            >
              <Phone className="w-3.5 h-3.5" />
              Ligar
            </a>
          </div>
        )}

        {/* Footer actions */}
        <div className="mt-4 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            Fechar Alerta
          </button>
        </div>
      </div>
    </div>
  );
};
