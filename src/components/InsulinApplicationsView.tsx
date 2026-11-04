import React, { useState, useEffect } from 'react';
import {
  Syringe,
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Trash2,
  ShieldCheck,
  Droplet,
  Clock,
  Check,
  Activity,
} from 'lucide-react';
import {
  InsulinDoseRecord,
  GlucoseReading,
  PatientProfile,
  InjectionSite,
} from '../types';
import {
  INJECTION_SITES,
  getNextRecommendedSite,
  calculateIOB,
  getGlucoseContextLabel,
} from '../utils/clinicalCalculations';

interface InsulinApplicationsViewProps {
  doses: InsulinDoseRecord[];
  readings: GlucoseReading[];
  profile: PatientProfile;
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  onAddDose: (
    dose: Omit<InsulinDoseRecord, 'id'>,
    linkedReadingId?: string
  ) => void;
  onDeleteDose: (doseId: string) => void;
  onOpenRotationMap: () => void;
  preselectedReadingId?: string | null;
  onClearPreselectedReading?: () => void;
}

function getLocalDateString(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toLocalDateTimeInput(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function shiftDateString(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  return getLocalDateString(dt);
}

function formatHumanDateLabel(dateStr: string): { badge: string; fullDate: string } {
  const todayStr = getLocalDateString(new Date());
  const yesterdayStr = shiftDateString(todayStr, -1);
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const fullDate = dt.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  if (dateStr === todayStr) return { badge: 'Hoje', fullDate };
  if (dateStr === yesterdayStr) return { badge: 'Ontem', fullDate };
  return { badge: 'Histórico', fullDate };
}

export const InsulinApplicationsView: React.FC<InsulinApplicationsViewProps> = ({
  doses,
  readings,
  profile,
  selectedDate,
  onSelectDate,
  onAddDose,
  onDeleteDose,
  onOpenRotationMap,
  preselectedReadingId,
  onClearPreselectedReading,
}) => {
  const recommendedSite = getNextRecommendedSite(doses);

  const [unitsInput, setUnitsInput] = useState<string>('');
  const [doseType, setDoseType] = useState<'rapid' | 'basal'>('rapid');
  const [dateTimeInput, setDateTimeInput] = useState<string>(() => toLocalDateTimeInput());
  const [selectedSite, setSelectedSite] = useState<InjectionSite>(recommendedSite.site.id);
  const [linkedReadingId, setLinkedReadingId] = useState<string>('');
  const [bgAtTimeInput, setBgAtTimeInput] = useState<string>('');
  const [notesInput, setNotesInput] = useState<string>('');

  // Readings for the selected date, sorted top-to-bottom (earliest of the day first)
  const dayReadingsAsc = readings
    .filter((r) => getLocalDateString(new Date(r.timestamp)) === selectedDate)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Doses for the selected date, sorted top-to-bottom (earliest of the day first)
  const dayDosesAsc = doses
    .filter((d) => getLocalDateString(new Date(d.timestamp)) === selectedDate)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Preselect reading if navigated from a reading row
  useEffect(() => {
    if (preselectedReadingId) {
      const found = readings.find((r) => r.id === preselectedReadingId);
      if (found) {
        setLinkedReadingId(found.id);
        setBgAtTimeInput(String(found.value));
        setDateTimeInput(toLocalDateTimeInput(new Date(found.timestamp)));
        const readingDay = getLocalDateString(new Date(found.timestamp));
        if (readingDay !== selectedDate) {
          onSelectDate(readingDay);
        }
      }
      onClearPreselectedReading?.();
    }
  }, [preselectedReadingId, readings]);

  // Update recommended site when doses change
  useEffect(() => {
    const next = getNextRecommendedSite(doses);
    setSelectedSite(next.site.id);
  }, [doses.length]);

  const handleSelectLinkedReading = (readingId: string) => {
    setLinkedReadingId(readingId);
    if (!readingId) return;
    const found = readings.find((r) => r.id === readingId);
    if (found) {
      setBgAtTimeInput(String(found.value));
      setDateTimeInput(toLocalDateTimeInput(new Date(found.timestamp)));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const units = parseFloat(unitsInput);
    if (!units || units <= 0) return;

    const parsedDate = dateTimeInput ? new Date(dateTimeInput) : new Date();
    const finalTimestamp = isNaN(parsedDate.getTime())
      ? new Date().toISOString()
      : parsedDate.toISOString();

    const matchedReading = linkedReadingId
      ? readings.find((r) => r.id === linkedReadingId)
      : undefined;

    const bgVal = Number(bgAtTimeInput) > 0 ? Number(bgAtTimeInput) : matchedReading?.value;

    onAddDose(
      {
        timestamp: finalTimestamp,
        type: doseType,
        insulinName:
          doseType === 'rapid' ? profile.rapidInsulinName : profile.basalInsulinName,
        units,
        injectionSite: selectedSite,
        bgAtTime: bgVal,
        notes: notesInput.trim() || undefined,
        linkedReadingId: linkedReadingId || undefined,
        context: matchedReading?.context,
      },
      linkedReadingId || undefined
    );

    // Ensure the date filter jumps to the date of the registered application
    const doseDay = getLocalDateString(new Date(finalTimestamp));
    if (doseDay !== selectedDate) {
      onSelectDate(doseDay);
    }

    setUnitsInput('');
    setNotesInput('');
    setLinkedReadingId('');
    setBgAtTimeInput('');
    setDateTimeInput(toLocalDateTimeInput());
  };

  const todayStr = getLocalDateString(new Date());
  const isToday = selectedDate === todayStr;
  const { badge, fullDate } = formatHumanDateLabel(selectedDate);

  // Daily totals
  const totalRapidUnits = Math.round(
    dayDosesAsc
      .filter((d) => d.type === 'rapid')
      .reduce((acc, d) => acc + d.units, 0) * 10
  ) / 10;
  const totalBasalUnits = Math.round(
    dayDosesAsc
      .filter((d) => d.type === 'basal')
      .reduce((acc, d) => acc + d.units, 0) * 10
  ) / 10;
  const totalDayUnits = Math.round((totalRapidUnits + totalBasalUnits) * 10) / 10;
  const { totalIOB } = calculateIOB(doses, profile.diaHours);

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="bg-white dark:bg-[#161619] p-5 sm:p-6 rounded-[28px] shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FF5A36]/15 text-[#FF5A36] flex items-center justify-center shrink-0">
            <Syringe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base sm:text-lg text-[#111111] dark:text-white tracking-tight">
              Cadastro & Monitoramento de Aplicações
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Registre doses aplicadas após medir a glicemia ou aplicações basais do dia
            </p>
          </div>
        </div>

        <button
          onClick={onOpenRotationMap}
          className="px-4 py-2 bg-[#111111] dark:bg-[#222226] text-white text-xs font-bold rounded-full flex items-center gap-1.5 hover:opacity-90 transition"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-[#FF5A36]" />
          <span>Ver Mapa Corporal</span>
        </button>
      </div>

      {/* GRID: CADASTRAR NOVA APLICAÇÃO (LEFT) + RESUMO DO DIA (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* FORMULÁRIO DE CADASTRO DE APLICAÇÃO */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 bg-white dark:bg-[#161619] rounded-[28px] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <div>
              <h4 className="font-bold text-sm sm:text-base text-[#111111] dark:text-white">
                Registrar Nova Aplicação de Insulina
              </h4>
              <p className="text-[11px] text-neutral-500">
                Informe quantas unidades aplicou e, se desejar, vincule à medição de glicemia
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#FF5A36]/15 text-[#FF5A36] text-[10px] font-extrabold">
              + Nova Dose
            </span>
          </div>

          {/* Tipo de Insulina + Quantidade de Unidades */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                Tipo de Insulina *
              </label>
              <div className="grid grid-cols-2 gap-1.5 bg-[#F6F6F7] dark:bg-[#222226] p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setDoseType('rapid')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition ${
                    doseType === 'rapid'
                      ? 'bg-[#FF5A36] text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  Rápida / Bolus
                </button>
                <button
                  type="button"
                  onClick={() => setDoseType('basal')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition ${
                    doseType === 'basal'
                      ? 'bg-[#111111] dark:bg-white text-white dark:text-[#111111] shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  Basal / Lenta
                </button>
              </div>
              <span className="text-[10px] text-neutral-400 mt-1 block px-1">
                Insulina:{' '}
                <strong className="text-neutral-600 dark:text-neutral-300">
                  {doseType === 'rapid' ? profile.rapidInsulinName : profile.basalInsulinName}
                </strong>
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                Quantidade Aplicada (Unidades) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="150"
                  required
                  placeholder="Ex: 4.0"
                  value={unitsInput}
                  onChange={(e) => setUnitsInput(e.target.value)}
                  className="w-full px-4 py-2.5 text-lg font-mono font-extrabold bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-[#FF5A36] text-[#111111] dark:text-white"
                />
                <span className="absolute right-4 top-3 text-xs font-extrabold text-[#FF5A36]">
                  Unidades (U)
                </span>
              </div>

              {/* Atalhos rápidos de unidades */}
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                {[2, 4, 6, 8, 10, 18, 22].map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnitsInput(String(u))}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition ${
                      Number(unitsInput) === u
                        ? 'bg-[#FF5A36] text-white'
                        : 'bg-[#F6F6F7] dark:bg-[#222226] text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200'
                    }`}
                  >
                    {u}U
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Vincular a uma Medição do Dia ou informar Glicemia */}
          <div className="p-3.5 rounded-2xl bg-[#F6F6F7] dark:bg-[#222226] space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#111111] dark:text-white flex items-center gap-1.5">
                <Droplet className="w-3.5 h-3.5 text-[#FF5A36]" />
                <span>Vincular a uma Medição de Glicemia (Opcional)</span>
              </label>
              {linkedReadingId && (
                <button
                  type="button"
                  onClick={() => {
                    setLinkedReadingId('');
                    setBgAtTimeInput('');
                  }}
                  className="text-[10px] text-neutral-500 hover:text-red-500 font-semibold"
                >
                  Desvincular
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <select
                  value={linkedReadingId}
                  onChange={(e) => handleSelectLinkedReading(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#161619] text-xs font-semibold text-[#111111] dark:text-white border border-neutral-200/80 dark:border-neutral-800"
                >
                  <option value="">-- Aplicação avulsa (ou selecione uma medição) --</option>
                  {dayReadingsAsc.map((r, idx) => {
                    const timeStr = new Date(r.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    return (
                      <option key={r.id} value={r.id}>
                        #{idx + 1} · {timeStr} · {r.value} mg/dL ({getGlucoseContextLabel(r.context)})
                        {r.insulinUnitsApplied ? ` [Já aplicou ${r.insulinUnitsApplied}U]` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <input
                  type="number"
                  placeholder="Glicemia (mg/dL)"
                  value={bgAtTimeInput}
                  onChange={(e) => setBgAtTimeInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#161619] text-xs font-mono font-bold text-[#111111] dark:text-white border border-neutral-200/80 dark:border-neutral-800"
                />
              </div>
            </div>
          </div>

          {/* Data/Hora + Local de Aplicação */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#FF5A36]" />
                  <span>Data e Horário</span>
                </label>
                <button
                  type="button"
                  onClick={() => setDateTimeInput(toLocalDateTimeInput(new Date()))}
                  className="text-[10px] font-bold text-[#FF5A36] hover:underline"
                >
                  Agora
                </button>
              </div>
              <input
                type="datetime-local"
                required
                value={dateTimeInput}
                onChange={(e) => setDateTimeInput(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-mono font-bold bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl text-[#111111] dark:text-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Local de Aplicação (Rodízio)
                </label>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                  Sugerido: {recommendedSite.site.name}
                </span>
              </div>
              <select
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value as InjectionSite)}
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl text-[#111111] dark:text-white"
              >
                {INJECTION_SITES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.region})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Observações */}
          <div>
            <input
              type="text"
              placeholder="Observações (ex: correção pós-almoço, refeição livre...)"
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              className="w-full px-4 py-2.5 text-xs bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl text-[#111111] dark:text-white"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#FF5A36] hover:bg-[#e84c29] text-white font-bold text-xs rounded-full transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Check className="w-4 h-4" />
            <span>Salvar Registro de Aplicação</span>
          </button>
        </form>

        {/* RESUMO DAS APLICAÇÕES DO DIA SELECIONADO */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-[#161619] rounded-[28px] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-[#111111] dark:text-white">
                Resumo de Insulina ({badge})
              </h4>
              <span className="text-[11px] font-mono text-neutral-400">{fullDate}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-[#F6F6F7] dark:bg-[#222226]">
                <span className="text-[10px] text-neutral-500 block font-bold uppercase">
                  Total no Dia
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-mono text-2xl font-extrabold text-[#111111] dark:text-white">
                    {totalDayUnits}
                  </span>
                  <span className="text-xs font-extrabold text-[#FF5A36]">U</span>
                </div>
                <span className="text-[10px] text-neutral-400">
                  {dayDosesAsc.length} {dayDosesAsc.length === 1 ? 'aplicação' : 'aplicações'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F6F6F7] dark:bg-[#222226]">
                <span className="text-[10px] text-neutral-500 block font-bold uppercase">
                  Insulina Ativa (IOB)
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-mono text-2xl font-extrabold text-[#FF5A36]">
                    {totalIOB}
                  </span>
                  <span className="text-xs font-extrabold text-[#FF5A36]">U</span>
                </div>
                <span className="text-[10px] text-neutral-400">
                  Ação de {profile.diaHours}h
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F6F6F7] dark:bg-[#222226]">
                <span className="text-[10px] text-neutral-500 block font-bold uppercase">
                  Rápida / Bolus
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-mono text-lg font-extrabold text-[#111111] dark:text-white">
                    {totalRapidUnits}
                  </span>
                  <span className="text-xs font-bold text-[#FF5A36]">U</span>
                </div>
                <span className="text-[10px] text-neutral-400 truncate block">
                  {profile.rapidInsulinName}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F6F6F7] dark:bg-[#222226]">
                <span className="text-[10px] text-neutral-500 block font-bold uppercase">
                  Basal / Lenta
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-mono text-lg font-extrabold text-[#111111] dark:text-white">
                    {totalBasalUnits}
                  </span>
                  <span className="text-xs font-bold text-[#FF5A36]">U</span>
                </div>
                <span className="text-[10px] text-neutral-400 truncate block">
                  {profile.basalInsulinName}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BARRA DE FILTRO POR DIA (Igual à de Monitoramento de Glicemia) */}
      <div className="bg-white dark:bg-[#161619] rounded-[28px] p-4 sm:px-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelectDate(shiftDateString(selectedDate, -1))}
            className="px-3.5 py-2 rounded-full bg-[#F6F6F7] dark:bg-[#222226] hover:bg-[#111111] hover:text-white dark:hover:bg-[#FF5A36] text-xs font-bold flex items-center gap-1 transition"
            title="Ver dia anterior"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Dia Anterior</span>
          </button>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F6F6F7] dark:bg-[#222226]">
            <Calendar className="w-3.5 h-3.5 text-[#FF5A36]" />
            <span className="px-2 py-0.5 rounded-full bg-[#FF5A36] text-white text-[10px] font-extrabold uppercase">
              {badge}
            </span>
            <input
              type="date"
              value={selectedDate}
              max={todayStr}
              onChange={(e) => {
                if (e.target.value) onSelectDate(e.target.value);
              }}
              className="bg-transparent text-xs font-mono font-bold text-[#111111] dark:text-white focus:outline-hidden cursor-pointer"
            />
          </div>

          <button
            type="button"
            disabled={isToday}
            onClick={() => onSelectDate(shiftDateString(selectedDate, 1))}
            className="px-3.5 py-2 rounded-full bg-[#F6F6F7] dark:bg-[#222226] hover:bg-[#111111] hover:text-white dark:hover:bg-[#FF5A36] disabled:opacity-35 disabled:pointer-events-none text-xs font-bold flex items-center gap-1 transition"
            title="Próximo dia"
          >
            <span>Próximo Dia</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {!isToday && (
            <button
              type="button"
              onClick={() => onSelectDate(todayStr)}
              className="px-3.5 py-1.5 rounded-full bg-[#FF5A36] text-white text-xs font-bold transition"
            >
              Voltar para Hoje
            </button>
          )}
          <span className="text-[11px] text-neutral-400 font-semibold">
            Ordem: 1ª do dia no topo ↓ última abaixo
          </span>
        </div>
      </div>

      {/* LISTA DE APLICAÇÕES DO DIA (DE CIMA PARA BAIXO) */}
      <div className="bg-white dark:bg-[#161619] rounded-[28px] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-sm sm:text-base text-[#111111] dark:text-white">
              Aplicações Registradas em {fullDate}
            </h4>
            <p className="text-xs text-neutral-500">
              Listadas de cima para baixo na ordem em que foram aplicadas ao longo do dia
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#F6F6F7] dark:bg-[#222226] text-xs font-mono font-extrabold text-[#FF5A36]">
            {dayDosesAsc.length} {dayDosesAsc.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        {dayDosesAsc.length === 0 ? (
          <div className="py-10 text-center space-y-2 bg-[#F6F6F7]/60 dark:bg-[#222226]/50 rounded-3xl p-6">
            <Syringe className="w-7 h-7 text-neutral-400 mx-auto" />
            <p className="text-xs font-bold text-neutral-600 dark:text-neutral-300">
              Nenhuma aplicação de insulina registrada em {badge === 'Hoje' ? 'hoje' : fullDate}.
            </p>
            <p className="text-[11px] text-neutral-400">
              Use o formulário acima para registrar uma dose aplicada ou registre direto ao medir sua glicemia.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {dayDosesAsc.map((dose, index) => {
              const siteInfo = INJECTION_SITES.find((s) => s.id === dose.injectionSite);
              const linkedReading = dose.linkedReadingId
                ? readings.find((r) => r.id === dose.linkedReadingId)
                : undefined;
              const displayBg = dose.bgAtTime ?? linkedReading?.value;

              return (
                <div
                  key={dose.id}
                  className="p-4 rounded-2xl bg-[#F6F6F7] dark:bg-[#222226] flex flex-wrap items-center justify-between gap-3 transition hover:ring-1 hover:ring-[#FF5A36]/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Número de Ordem no Dia (1º em cima, próximo abaixo) */}
                    <div className="w-7 h-7 rounded-full bg-[#111111] dark:bg-white text-white dark:text-[#111111] font-mono text-xs font-extrabold flex items-center justify-center shrink-0">
                      {index + 1}º
                    </div>

                    {/* Unidades Aplicadas */}
                    <div className="px-3.5 py-1.5 rounded-full bg-[#FF5A36] text-white font-mono text-sm font-extrabold shrink-0 shadow-xs">
                      💉 {dose.units}U
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-[#111111] dark:text-white">
                          {dose.insulinName}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            dose.type === 'rapid'
                              ? 'bg-orange-500/15 text-[#FF5A36]'
                              : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                          }`}
                        >
                          {dose.type === 'rapid' ? 'Rápida / Bolus' : 'Basal / Lenta'}
                        </span>
                        {displayBg && (
                          <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-white dark:bg-[#161619] text-[#111111] dark:text-white">
                            🩸 Glicemia: {displayBg} mg/dL
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 flex-wrap font-mono">
                        <span>
                          ⏰{' '}
                          {new Date(dose.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span>·</span>
                        <span>📍 {siteInfo ? siteInfo.name : dose.injectionSite}</span>
                        {dose.notes && (
                          <>
                            <span>·</span>
                            <span className="font-sans italic text-neutral-600 dark:text-neutral-300">
                              &ldquo;{dose.notes}&rdquo;
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteDose(dose.id)}
                    className="p-2 text-neutral-400 hover:text-red-600 rounded-full transition shrink-0"
                    title="Excluir aplicação"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
