import React from 'react';
import {
  PatientProfile,
  GlucoseReading,
  MealRecord,
  InsulinDoseRecord,
} from '../types';
import { calculateTIR, getGlucoseContextLabel } from '../utils/clinicalCalculations';
import {
  Printer,
  Download,
  Share2,
  Copy,
  X,
  FileSpreadsheet,
  Check,
  Stethoscope,
} from 'lucide-react';

interface PrintableReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PatientProfile;
  readings: GlucoseReading[];
  meals: MealRecord[];
  doses: InsulinDoseRecord[];
}

export const PrintableReportModal: React.FC<PrintableReportModalProps> = ({
  isOpen,
  onClose,
  profile,
  readings,
  meals,
  doses,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [reportWindow, setReportWindow] = React.useState<'7days' | '14days' | '30days' | 'all'>('14days');

  if (!isOpen) return null;

  // Filter by selected time window
  const now = Date.now();
  const windowDays =
    reportWindow === '7days' ? 7 : reportWindow === '14days' ? 14 : reportWindow === '30days' ? 30 : 99999;
  const cutoffTime = now - windowDays * 24 * 60 * 60 * 1000;

  const filteredReadings =
    reportWindow === 'all'
      ? readings
      : readings.filter((r) => new Date(r.timestamp).getTime() >= cutoffTime);

  const filteredMeals =
    reportWindow === 'all'
      ? meals
      : meals.filter((m) => new Date(m.timestamp).getTime() >= cutoffTime);

  const filteredDoses =
    reportWindow === 'all'
      ? doses
      : doses.filter((d) => new Date(d.timestamp).getTime() >= cutoffTime);

  const activeReadings = filteredReadings.length > 0 ? filteredReadings : readings;
  const tir = calculateTIR(activeReadings);

  const windowLabel =
    reportWindow === '7days'
      ? 'Últimos 7 dias'
      : reportWindow === '14days'
      ? 'Últimos 14 dias'
      : reportWindow === '30days'
      ? 'Últimos 30 dias'
      : 'Todo o Histórico';

  // Export CSV
  const handleExportCSV = () => {
    let csvContent = '\uFEFFData e Hora,Tipo de Registro,Valor / Descrição,Contexto / Medida,Insulina / CHO,Local Aplicação,Notas\n';

    // Readings
    filteredReadings.forEach((r) => {
      const dateStr = new Date(r.timestamp).toLocaleString('pt-BR');
      csvContent += `"${dateStr}","Glicemia","${r.value} mg/dL","${getGlucoseContextLabel(r.context)}","","","${r.notes || ''}"\n`;
    });

    // Meals
    filteredMeals.forEach((m) => {
      const dateStr = new Date(m.timestamp).toLocaleString('pt-BR');
      csvContent += `"${dateStr}","Refeição","${m.title}","${m.mealType}","${m.totalCarbs}g CHO (P:${m.totalProtein}g G:${m.totalFat}g)","","${m.aiAnalysisNotes || ''}"\n`;
    });

    // Doses
    filteredDoses.forEach((d) => {
      const dateStr = new Date(d.timestamp).toLocaleString('pt-BR');
      csvContent += `"${dateStr}","Insulina","${d.units}U (${d.insulinName})","${d.type}","","${d.injectionSite}","${d.notes || ''}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Minha_Glico_Relatorio_${reportWindow}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pre-formatted text summary for WhatsApp / Email
  const clinicalSummaryText = `*RELATÓRIO CLÍNICO DE DIABETES - MINHA GLICO*
*Paciente:* ${profile.name} (${profile.diabetesType.toUpperCase()})
*Período:* ${windowLabel} (${activeReadings.length} medições)

📊 *Métricas Clínicas:*
• Tempo no Alvo (70-180 mg/dL): *${tir.inRangePercent}%* (Meta: >70%)
• Hipoglicemia (<70 mg/dL): *${tir.lowPercent + tir.veryLowPercent}%* (Meta: <4%)
• Hiperglicemia (>180 mg/dL): *${tir.highPercent + tir.veryHighPercent}%* (Meta: <25%)
• Glicemia Média: *${tir.meanGlucose} mg/dL*
• Variabilidade (CV%): *${tir.coefficientOfVariation}%* (Meta: <=36%)
• HbA1c Estimada: *${tir.estimatedHbA1c}%* (GMI: ${tir.gmi}%)

💉 *Parâmetros Atuais:*
• Relação Insulina/CHO: Manhã 1:${profile.icrMorning}g | Tarde 1:${profile.icrAfternoon}g | Noite 1:${profile.icrNight}g
• Fator de Sensibilidade: 1U / ${profile.isf} mg/dL
• Meta Alvo: ${profile.targetBg} mg/dL
• Insulina Rápida: ${profile.rapidInsulinName} | Basal: ${profile.basalInsulinName}`;

  const handleShareWhatsApp = () => {
    const encoded = encodeURIComponent(clinicalSummaryText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(clinicalSummaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200 max-h-[92vh] flex flex-col text-slate-900 dark:text-slate-100">
        {/* Modal Top Actions (Hidden on Print) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-3 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-xl">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base sm:text-lg">Relatório Clínico para Médico / Nutricionista</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Padrão internacional AGP (Ambulatory Glucose Profile) com TIR, HbA1c e histórico
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Time Window Selector Pills */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-medium">
              <button
                onClick={() => setReportWindow('7days')}
                className={`px-2.5 py-1 rounded-lg transition text-[11px] font-bold ${
                  reportWindow === '7days'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-blue-600'
                }`}
              >
                7 Dias
              </button>
              <button
                onClick={() => setReportWindow('14days')}
                className={`px-2.5 py-1 rounded-lg transition text-[11px] font-bold ${
                  reportWindow === '14days'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-blue-600'
                }`}
              >
                14 Dias
              </button>
              <button
                onClick={() => setReportWindow('30days')}
                className={`px-2.5 py-1 rounded-lg transition text-[11px] font-bold ${
                  reportWindow === '30days'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-blue-600'
                }`}
              >
                30 Dias
              </button>
              <button
                onClick={() => setReportWindow('all')}
                className={`px-2.5 py-1 rounded-lg transition text-[11px] font-bold ${
                  reportWindow === 'all'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-blue-600'
                }`}
              >
                Tudo
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition"
            >
              <Printer className="w-4 h-4" />
              Imprimir / PDF
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
            >
              <Share2 className="w-4 h-4" />
              WhatsApp
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 p-1.5 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Document Area */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6 print:overflow-visible print:p-0">
          {/* Header Banner */}
          <div className="border-b-2 border-blue-600 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-black text-blue-900 dark:text-blue-400">Minha Glico</h1>
                <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                  Relatório Ambulatorial de Perfil Glicêmico & Nutricional
                </p>
              </div>
              <div className="text-right text-xs text-gray-500 dark:text-slate-400">
                <p>Data de emissão: <strong>{new Date().toLocaleDateString('pt-BR')}</strong></p>
                <p>Médico / Equipe: <strong>{profile.emergencyContactName || 'Não especificado'}</strong></p>
              </div>
            </div>

            {/* Patient details & Period */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <div>
                <span className="text-gray-500 dark:text-slate-400 block text-[11px]">Paciente:</span>
                <span className="font-bold text-gray-900 dark:text-white">{profile.name}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-slate-400 block text-[11px]">Tipo de Diabetes:</span>
                <span className="font-bold text-gray-900 dark:text-white uppercase">{profile.diabetesType}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-slate-400 block text-[11px]">Meta Glicêmica:</span>
                <span className="font-bold text-gray-900 dark:text-white">{profile.targetRangeLow} - {profile.targetRangeHigh} mg/dL</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-slate-400 block text-[11px]">Período Analisado:</span>
                <span className="font-bold text-blue-700 dark:text-blue-400">{windowLabel} ({activeReadings.length} pts)</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-slate-400 block text-[11px]">Insulinas em Uso:</span>
                <span className="font-bold text-gray-900 dark:text-white truncate block">
                  {profile.rapidInsulinName} / {profile.basalInsulinName}
                </span>
              </div>
            </div>
          </div>

          {/* Clinical Metrics Summary (TIR, HbA1c, Mean, CV) */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-3">
              1. Resumo de Métricas de Controle Glicêmico
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* TIR */}
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase block">Tempo no Alvo (TIR)</span>
                <span className="font-mono text-3xl font-black text-emerald-700 dark:text-emerald-400">{tir.inRangePercent}%</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-1">Meta internacional: &gt; 70%</span>
              </div>

              {/* Estimated HbA1c */}
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase block">HbA1c Estimada</span>
                <span className="font-mono text-3xl font-black text-blue-700 dark:text-blue-400">{tir.estimatedHbA1c}%</span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 block mt-1">GMI: {tir.gmi}% (Meta &lt; 7.0%)</span>
              </div>

              {/* Mean Glucose */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase block">Glicemia Média</span>
                <span className="font-mono text-3xl font-black text-slate-800 dark:text-slate-100">{tir.meanGlucose}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">mg/dL (Desvio: ±{tir.standardDeviation})</span>
              </div>

              {/* CV% */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase block">Variabilidade (CV%)</span>
                <span className="font-mono text-3xl font-black text-slate-800 dark:text-slate-100">{tir.coefficientOfVariation}%</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">Meta de estabilidade: &le; 36%</span>
              </div>
            </div>

            {/* Time in Range Bar */}
            <div className="mt-4 bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-gray-700 dark:text-slate-300 block mb-2">
                Distribuição de Faixas de Glicemia (% das Medições):
              </span>
              <div className="h-6 w-full rounded-lg overflow-hidden flex bg-gray-200">
                {tir.veryLowPercent > 0 && (
                  <div
                    style={{ width: `${tir.veryLowPercent}%` }}
                    className="bg-red-700 text-white text-[9px] flex items-center justify-center font-bold"
                    title={`Muito Baixa: ${tir.veryLowPercent}%`}
                  >
                    {tir.veryLowPercent}%
                  </div>
                )}
                {tir.lowPercent > 0 && (
                  <div
                    style={{ width: `${tir.lowPercent}%` }}
                    className="bg-red-400 text-white text-[9px] flex items-center justify-center font-bold"
                    title={`Baixa: ${tir.lowPercent}%`}
                  >
                    {tir.lowPercent}%
                  </div>
                )}
                {tir.inRangePercent > 0 && (
                  <div
                    style={{ width: `${tir.inRangePercent}%` }}
                    className="bg-emerald-500 text-white text-[10px] flex items-center justify-center font-bold"
                    title={`No Alvo: ${tir.inRangePercent}%`}
                  >
                    {tir.inRangePercent}%
                  </div>
                )}
                {tir.highPercent > 0 && (
                  <div
                    style={{ width: `${tir.highPercent}%` }}
                    className="bg-amber-400 text-white text-[9px] flex items-center justify-center font-bold"
                    title={`Alta: ${tir.highPercent}%`}
                  >
                    {tir.highPercent}%
                  </div>
                )}
                {tir.veryHighPercent > 0 && (
                  <div
                    style={{ width: `${tir.veryHighPercent}%` }}
                    className="bg-red-600 text-white text-[9px] flex items-center justify-center font-bold"
                    title={`Muito Alta: ${tir.veryHighPercent}%`}
                  >
                    {tir.veryHighPercent}%
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2 text-[10px]">
                <span className="text-red-700 font-bold">&lt; 54 mg/dL: {tir.veryLowPercent}% (Meta &lt;1%)</span>
                <span className="text-red-500 font-bold">54-69 mg/dL: {tir.lowPercent}% (Meta &lt;4%)</span>
                <span className="text-emerald-700 font-bold">70-180 mg/dL: {tir.inRangePercent}% (Meta &gt;70%)</span>
                <span className="text-amber-600 font-bold">181-250 mg/dL: {tir.highPercent}% (Meta &lt;25%)</span>
                <span className="text-red-600 font-bold">&gt; 250 mg/dL: {tir.veryHighPercent}% (Meta &lt;5%)</span>
              </div>
            </div>
          </div>

          {/* Medical Presets Table */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-2">
              2. Parâmetros Configurados de Terapia Insulínica
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="border p-2.5 rounded-lg bg-gray-50">
                <span className="text-gray-500 block text-[11px]">Relação Insulina/CHO (Manhã)</span>
                <span className="font-bold text-gray-900">1U para {profile.icrMorning}g CHO</span>
              </div>
              <div className="border p-2.5 rounded-lg bg-gray-50">
                <span className="text-gray-500 block text-[11px]">Relação Insulina/CHO (Tarde)</span>
                <span className="font-bold text-gray-900">1U para {profile.icrAfternoon}g CHO</span>
              </div>
              <div className="border p-2.5 rounded-lg bg-gray-50">
                <span className="text-gray-500 block text-[11px]">Fator Sensibilidade (ISF)</span>
                <span className="font-bold text-gray-900">1U reduz {profile.isf} mg/dL</span>
              </div>
              <div className="border p-2.5 rounded-lg bg-gray-50">
                <span className="text-gray-500 block text-[11px]">Duração Insulina Ativa (DIA)</span>
                <span className="font-bold text-gray-900">{profile.diaHours} horas</span>
              </div>
            </div>
          </div>

          {/* Diário de Registros Recentes */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-2">
              3. Diário de Medições e Refeições Recentes
            </h2>
            <div className="border rounded-xl overflow-x-auto max-w-full text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="p-2">Data / Hora</th>
                    <th className="p-2">Glicemia</th>
                    <th className="p-2">Momento</th>
                    <th className="p-2">Refeição & CHO</th>
                    <th className="p-2">Bolus / Insulina</th>
                    <th className="p-2">Local / Observação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {activeReadings.slice(-25).reverse().map((r) => {
                    const matchedMeal = filteredMeals.find(
                      (m) => Math.abs(new Date(m.timestamp).getTime() - new Date(r.timestamp).getTime()) < 45 * 60 * 1000
                    );
                    const matchedDose = filteredDoses.find(
                      (d) => Math.abs(new Date(d.timestamp).getTime() - new Date(r.timestamp).getTime()) < 45 * 60 * 1000
                    );

                    return (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="p-2 font-mono text-gray-600">
                          {new Date(r.timestamp).toLocaleString([], {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="p-2 font-bold font-mono">
                          <span
                            className={`px-1.5 py-0.5 rounded ${
                              r.value < 70
                                ? 'bg-red-100 text-red-700'
                                : r.value <= 180
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {r.value} mg/dL
                          </span>
                        </td>
                        <td className="p-2 text-gray-700 font-medium">{getGlucoseContextLabel(r.context)}</td>
                        <td className="p-2">
                          {matchedMeal ? (
                            <span>{matchedMeal.title} (<strong>{matchedMeal.totalCarbs}g CHO</strong>)</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-2">
                          {matchedDose ? (
                            <span className="font-bold text-blue-700">{matchedDose.units}U ({matchedDose.type})</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-2 text-gray-500">
                          {matchedDose?.injectionSite ? matchedDose.injectionSite.replace('_', ' ') : r.notes || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer (Hidden on print) */}
        <div className="pt-4 border-t flex items-center justify-between print:hidden">
          <button
            onClick={handleCopySummary}
            className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copiado!' : 'Copiar Resumo em Texto'}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition"
          >
            Fechar Visualização
          </button>
        </div>
      </div>
    </div>
  );
};
