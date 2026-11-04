import { GlucoseReading, PatientProfile, InsulinDoseRecord, InjectionSite, GlucoseContext } from '../types';

export interface TIRStatistics {
  veryLowCount: number;
  veryLowPercent: number;
  lowCount: number;
  lowPercent: number;
  inRangeCount: number;
  inRangePercent: number;
  highCount: number;
  highPercent: number;
  veryHighCount: number;
  veryHighPercent: number;
  totalReadings: number;
  meanGlucose: number;
  standardDeviation: number;
  coefficientOfVariation: number;
  estimatedHbA1c: number;
  gmi: number;
}

export function calculateTIR(readings: GlucoseReading[]): TIRStatistics {
  if (!readings || readings.length === 0) {
    return {
      veryLowCount: 0,
      veryLowPercent: 0,
      lowCount: 0,
      lowPercent: 0,
      inRangeCount: 0,
      inRangePercent: 0,
      highCount: 0,
      highPercent: 0,
      veryHighCount: 0,
      veryHighPercent: 0,
      totalReadings: 0,
      meanGlucose: 0,
      standardDeviation: 0,
      coefficientOfVariation: 0,
      estimatedHbA1c: 0,
      gmi: 0,
    };
  }

  let veryLow = 0; // < 54
  let low = 0;     // 54 - 69
  let inRange = 0; // 70 - 180
  let high = 0;    // 181 - 250
  let veryHigh = 0;// > 250

  let sum = 0;

  readings.forEach((r) => {
    const v = r.value;
    sum += v;
    if (v < 54) {
      veryLow++;
    } else if (v < 70) {
      low++;
    } else if (v <= 180) {
      inRange++;
    } else if (v <= 250) {
      high++;
    } else {
      veryHigh++;
    }
  });

  const total = readings.length;
  const mean = Math.round(sum / total);

  // Standard deviation
  const variance =
    readings.reduce((acc, curr) => acc + Math.pow(curr.value - mean, 2), 0) /
    (total > 1 ? total - 1 : 1);
  const sd = Math.round(Math.sqrt(variance) * 10) / 10;
  const cv = mean > 0 ? Math.round((sd / mean) * 1000) / 10 : 0;

  // ADA formula: eA1c (%) = (mean + 46.7) / 28.7
  const estimatedHbA1c = Math.round(((mean + 46.7) / 28.7) * 10) / 10;
  // GMI (%) = 3.31 + (0.02392 * mean)
  const gmi = Math.round((3.31 + 0.02392 * mean) * 10) / 10;

  return {
    veryLowCount: veryLow,
    veryLowPercent: Math.round((veryLow / total) * 100),
    lowCount: low,
    lowPercent: Math.round((low / total) * 100),
    inRangeCount: inRange,
    inRangePercent: Math.round((inRange / total) * 100),
    highCount: high,
    highPercent: Math.round((high / total) * 100),
    veryHighCount: veryHigh,
    veryHighPercent: Math.round((veryHigh / total) * 100),
    totalReadings: total,
    meanGlucose: mean,
    standardDeviation: sd,
    coefficientOfVariation: cv,
    estimatedHbA1c,
    gmi,
  };
}

// Calculate active insulin (IOB - Insulin On Board)
export function calculateIOB(
  doses: InsulinDoseRecord[],
  diaHours: number = 3.5,
  currentTime: Date = new Date()
): { totalIOB: number; activeDoses: { dose: InsulinDoseRecord; remainingUnits: number }[] } {
  const diaMs = diaHours * 3600 * 1000;
  const now = currentTime.getTime();

  let totalIOB = 0;
  const activeDoses: { dose: InsulinDoseRecord; remainingUnits: number }[] = [];

  doses
    .filter((d) => d.type === 'rapid')
    .forEach((d) => {
      const doseTime = new Date(d.timestamp).getTime();
      const elapsedMs = now - doseTime;

      if (elapsedMs >= 0 && elapsedMs < diaMs) {
        // Linear decay
        const remainingFraction = 1 - elapsedMs / diaMs;
        const remainingUnits = Math.round(d.units * remainingFraction * 10) / 10;
        if (remainingUnits > 0.05) {
          totalIOB += remainingUnits;
          activeDoses.push({ dose: d, remainingUnits });
        }
      }
    });

  return {
    totalIOB: Math.round(totalIOB * 10) / 10,
    activeDoses,
  };
}

// Bolus calculation breakdown
export interface BolusCalculationResult {
  currentBg?: number;
  targetBg: number;
  isf: number;
  icr: number;
  carbs: number;
  foodBolus: number;
  correctionBolus: number;
  iob: number;
  netCorrectionBolus: number;
  suggestedTotalBolus: number;
  roundedBolus: number;
  isHypoAlert: boolean;
  warnings: string[];
}

export function calculateBolus(
  carbs: number,
  currentBg: number | undefined,
  profile: PatientProfile,
  doses: InsulinDoseRecord[],
  timeOfDay: 'morning' | 'afternoon' | 'night' = 'afternoon'
): BolusCalculationResult {
  let icr = profile.icrAfternoon;
  if (timeOfDay === 'morning') icr = profile.icrMorning;
  if (timeOfDay === 'night') icr = profile.icrNight;

  const targetBg = profile.targetBg || 100;
  const isf = profile.isf || 40;
  const warnings: string[] = [];

  // Food bolus = carbs / ICR
  const foodBolus = icr > 0 ? Math.round((carbs / icr) * 10) / 10 : 0;

  // Active insulin (IOB)
  const { totalIOB } = calculateIOB(doses, profile.diaHours);

  let correctionBolus = 0;
  let isHypoAlert = false;

  if (currentBg !== undefined && currentBg > 0) {
    if (currentBg < 70) {
      isHypoAlert = true;
      warnings.push('Atenção: Hipoglicemia detectada! Trate primeiro a hipo (Regra dos 15) antes de aplicar insulina.');
      // When hypo, correction is negative or 0
      correctionBolus = Math.round(((currentBg - targetBg) / isf) * 10) / 10;
    } else if (currentBg > targetBg) {
      correctionBolus = Math.round(((currentBg - targetBg) / isf) * 10) / 10;
    }
  }

  // Net correction after IOB discount
  let netCorrectionBolus = 0;
  if (correctionBolus > 0) {
    netCorrectionBolus = Math.max(0, Math.round((correctionBolus - totalIOB) * 10) / 10);
    if (totalIOB > 0) {
      warnings.push(`Descontado ${totalIOB}U de insulina ativa (IOB) para evitar empilhamento.`);
    }
  } else if (correctionBolus < 0) {
    // When glucose is below target, can reduce food bolus slightly
    netCorrectionBolus = correctionBolus;
  }

  const suggestedRaw = Math.max(0, foodBolus + netCorrectionBolus);
  // Round to nearest 0.5 unit (standard for pediatric/pens) or 1 unit
  const roundedBolus = Math.round(suggestedRaw * 2) / 2;

  return {
    currentBg,
    targetBg,
    isf,
    icr,
    carbs,
    foodBolus,
    correctionBolus,
    iob: totalIOB,
    netCorrectionBolus,
    suggestedTotalBolus: Math.round(suggestedRaw * 10) / 10,
    roundedBolus,
    isHypoAlert,
    warnings,
  };
}

export const INJECTION_SITES: {
  id: InjectionSite;
  name: string;
  region: 'Abdomen' | 'Braço' | 'Coxa' | 'Glúteo';
  description: string;
}[] = [
  { id: 'abdomen_top_right', name: 'Abdômen Sup. Dir.', region: 'Abdomen', description: 'Superior direito (2 dedos do umbigo)' },
  { id: 'abdomen_top_left', name: 'Abdômen Sup. Esq.', region: 'Abdomen', description: 'Superior esquerdo (2 dedos do umbigo)' },
  { id: 'abdomen_bottom_right', name: 'Abdômen Inf. Dir.', region: 'Abdomen', description: 'Inferior direito (2 dedos do umbigo)' },
  { id: 'abdomen_bottom_left', name: 'Abdômen Inf. Esq.', region: 'Abdomen', description: 'Inferior esquerdo (2 dedos do umbigo)' },
  { id: 'arm_right', name: 'Braço Direito', region: 'Braço', description: 'Região posterior externa do braço direito' },
  { id: 'arm_left', name: 'Braço Esquerdo', region: 'Braço', description: 'Região posterior externa do braço esquerdo' },
  { id: 'thigh_right', name: 'Coxa Direita', region: 'Coxa', description: 'Face anterior e lateral externa da coxa direita' },
  { id: 'thigh_left', name: 'Coxa Esquerda', region: 'Coxa', description: 'Face anterior e lateral externa da coxa esquerda' },
  { id: 'buttock_right', name: 'Glúteo Direito', region: 'Glúteo', description: 'Quadrante superior externo glúteo direito' },
  { id: 'buttock_left', name: 'Glúteo Esquerdo', region: 'Glúteo', description: 'Quadrante superior externo glúteo esquerdo' },
];

export function getNextRecommendedSite(
  recentDoses: InsulinDoseRecord[]
): { site: (typeof INJECTION_SITES)[0]; reason: string } {
  if (!recentDoses || recentDoses.length === 0) {
    return { site: INJECTION_SITES[0], reason: 'Início do rodízio corporal recomendado.' };
  }

  const lastSiteId = recentDoses[0].injectionSite;
  const lastIndex = INJECTION_SITES.findIndex((s) => s.id === lastSiteId);
  const nextIndex = (lastIndex + 1) % INJECTION_SITES.length;

  return {
    site: INJECTION_SITES[nextIndex],
    reason: `Rodízio preventivo de lipohipertrofia após última aplicação em ${INJECTION_SITES[lastIndex]?.name || 'local anterior'}.`,
  };
}

// Sound alert generator for emergencies using Web Audio API
export function playEmergencyAlertSound(type: 'hypo' | 'hyper') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'hypo') {
      // Urgent fast high-pitch pulses
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.15);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } else {
      // Serious deep alert
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.setValueAtTime(392, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    }
  } catch (e) {
    console.warn('Audio alert not allowed or supported yet', e);
  }
}

// 8 Momentos clínicos de medição solicitados
export const GLUCOSE_MOMENTS: {
  value: GlucoseContext;
  label: string;
  shortLabel: string;
  badgeColor: string;
}[] = [
  { value: 'jejum', label: 'Jejum', shortLabel: 'Jejum', badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
  { value: 'cafe_manha', label: 'Café da Manhã', shortLabel: 'Café', badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
  { value: 'pos_cafe', label: 'Pós Café da Manhã', shortLabel: 'Pós Café', badgeColor: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300' },
  { value: 'almoco', label: 'Almoço', shortLabel: 'Almoço', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
  { value: 'pos_almoco', label: 'Pós Almoço', shortLabel: 'Pós Almoço', badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300' },
  { value: 'jantar', label: 'Jantar', shortLabel: 'Jantar', badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' },
  { value: 'pos_jantar', label: 'Pós Jantar', shortLabel: 'Pós Jantar', badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
  { value: 'madrugada', label: 'Madrugada', shortLabel: 'Madrugada', badgeColor: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300' },
];

export function getGlucoseContextLabel(context: GlucoseContext): string {
  switch (context) {
    case 'jejum':
    case 'fasting':
      return 'Jejum';
    case 'cafe_manha':
      return 'Café da Manhã';
    case 'pos_cafe':
    case 'post_meal_1h':
      return 'Pós Café da Manhã';
    case 'almoco':
    case 'pre_meal':
      return 'Almoço';
    case 'pos_almoco':
    case 'post_meal_2h':
      return 'Pós Almoço';
    case 'jantar':
    case 'bedtime':
      return 'Jantar';
    case 'pos_jantar':
      return 'Pós Jantar';
    case 'madrugada':
    case 'dawn':
      return 'Madrugada';
    case 'exercise':
      return 'Exercício';
    case 'other':
    default:
      return 'Outro Momento';
  }
}

export function getGlucoseContextBadgeColor(context: GlucoseContext): string {
  const match = GLUCOSE_MOMENTS.find((m) => m.value === context);
  if (match) return match.badgeColor;
  if (context === 'fasting') return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
  if (context === 'pre_meal') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
  if (context === 'post_meal_1h' || context === 'post_meal_2h') return 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300';
  if (context === 'dawn') return 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
}

