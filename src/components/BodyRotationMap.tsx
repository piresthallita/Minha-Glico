import React from 'react';
import { InjectionSite, InsulinDoseRecord } from '../types';
import { INJECTION_SITES, getNextRecommendedSite } from '../utils/clinicalCalculations';
import { ShieldCheck, MapPin, Clock } from 'lucide-react';

interface BodyRotationMapProps {
  selectedSite: InjectionSite;
  onSelectSite: (site: InjectionSite) => void;
  recentDoses: InsulinDoseRecord[];
}

export const BodyRotationMap: React.FC<BodyRotationMapProps> = ({
  selectedSite,
  onSelectSite,
  recentDoses,
}) => {
  const { site: recommendedSite, reason } = getNextRecommendedSite(recentDoses);

  // Group sites by region
  const abdomenSites = INJECTION_SITES.filter((s) => s.region === 'Abdomen');
  const armSites = INJECTION_SITES.filter((s) => s.region === 'Braço');
  const thighSites = INJECTION_SITES.filter((s) => s.region === 'Coxa');
  const buttockSites = INJECTION_SITES.filter((s) => s.region === 'Glúteo');

  const getDoseInfoForSite = (siteId: InjectionSite) => {
    return recentDoses.find((d) => d.injectionSite === siteId);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs transition-colors duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
              Mapa de Rodízio de Aplicações
            </h3>
            <span className="text-[10px] sm:text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Prevenção de Lipodistrofia
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Alternar os locais previne nódulos e garante absorção estável.
          </p>
        </div>
      </div>

      {/* Recommendation banner */}
      <div className="my-3 p-2.5 sm:p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-start gap-2.5">
        <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 animate-bounce" />
        <div className="text-xs">
          <p className="font-bold text-emerald-900 dark:text-emerald-200">
            Sugerido para Próxima Dose: <span className="underline">{recommendedSite.name}</span>
          </p>
          <p className="text-emerald-700 dark:text-emerald-400 text-[11px] mt-0.5">{reason}</p>
        </div>
      </div>

      {/* Visual Body Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Abdômen (Quadrantes) */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Abdômen (Rápida absorção)
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">2 dedos do umbigo</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {abdomenSites.map((site) => {
              const isSelected = selectedSite === site.id;
              const isRecommended = recommendedSite.id === site.id;
              const lastDose = getDoseInfoForSite(site.id);

              return (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => onSelectSite(site.id)}
                  className={`p-2.5 rounded-xl border text-left transition relative flex flex-col justify-between min-h-[64px] ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : isRecommended
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200 hover:bg-emerald-100'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-bold text-xs leading-tight">{site.name}</span>
                    {isRecommended && !isSelected && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    )}
                  </div>
                  <div className="mt-1 text-[10px] opacity-80">
                    {lastDose ? (
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(lastDose.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({lastDose.units}U)
                      </span>
                    ) : (
                      <span>Disponível</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Membros: Braços, Coxas e Glúteos */}
        <div className="space-y-2.5">
          {/* Braços */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
              Braços (Posterior externa)
            </span>
            <div className="grid grid-cols-2 gap-2">
              {armSites.map((site) => {
                const isSelected = selectedSite === site.id;
                const isRecommended = recommendedSite.id === site.id;
                const lastDose = getDoseInfoForSite(site.id);

                return (
                  <button
                    key={site.id}
                    type="button"
                    onClick={() => onSelectSite(site.id)}
                    className={`p-2 rounded-xl border text-left transition ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : isRecommended
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200 hover:bg-emerald-100'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs">{site.name}</span>
                      {isRecommended && !isSelected && (
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">Sugerido</span>
                      )}
                    </div>
                    <span className="text-[10px] opacity-75 block mt-0.5">
                      {lastDose ? `${lastDose.units}U recentes` : 'Livre'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Coxas e Glúteos */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
              Coxas & Glúteos (Absorção lenta - Ideal Basal)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[...thighSites, ...buttockSites].map((site) => {
                const isSelected = selectedSite === site.id;
                const isRecommended = recommendedSite.id === site.id;

                return (
                  <button
                    key={site.id}
                    type="button"
                    onClick={() => onSelectSite(site.id)}
                    className={`p-1.5 rounded-xl border text-left transition ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : isRecommended
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 text-emerald-950 dark:text-emerald-200'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="font-bold text-[11px] block truncate">{site.name}</span>
                    <span className="text-[9px] opacity-70">
                      {site.region === 'Coxa' ? 'Frente/Lado' : 'Glúteo'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
