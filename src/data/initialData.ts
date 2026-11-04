import {
  GlucoseReading,
  MealRecord,
  InsulinDoseRecord,
  PatientProfile,
  FavoriteMeal,
  ReminderItem,
  HealthFitnessSync,
  WeightRecord,
  DailyRoutineLog,
} from '../types';

export const DEFAULT_PATIENT_PROFILE: PatientProfile = {
  name: 'Paciente Exemplo',
  diabetesType: 'dm1',
  heightCm: 172,
  targetBg: 100,
  targetRangeLow: 70,
  targetRangeHigh: 180,
  icrMorning: 10,
  icrAfternoon: 12,
  icrNight: 10,
  isf: 40,
  diaHours: 3.5,
  rapidInsulinName: 'NovoRapid / Fiasp',
  basalInsulinName: 'Tresiba (Degludeca)',
  dailyCarbLimit: 190,
  mealCarbLimit: 65,
  emergencyContactName: 'Dr. Lucas (Endocrinologista)',
  emergencyContactPhone: '(11) 98765-4321',
};

// Generate realistic readings for up to 30 days to support 7, 14, and 30 day windows
export function getInitialReadings(): GlucoseReading[] {
  const readings: GlucoseReading[] = [];
  const now = new Date();

  // Daily test pattern throughout the day matching the 8 clinical moments
  const patterns = [
    { hour: 7, minute: 0, context: 'jejum', val: 96, trend: 'stable' },
    { hour: 8, minute: 15, context: 'cafe_manha', val: 108, trend: 'stable' },
    { hour: 10, minute: 15, context: 'pos_cafe', val: 138, trend: 'rise' },
    { hour: 12, minute: 30, context: 'almoco', val: 102, trend: 'stable' },
    { hour: 14, minute: 30, context: 'pos_almoco', val: 145, trend: 'fall' },
    { hour: 19, minute: 30, context: 'jantar', val: 110, trend: 'stable' },
    { hour: 21, minute: 30, context: 'pos_jantar', val: 132, trend: 'stable' },
    { hour: 3, minute: 30, context: 'madrugada', val: 99, trend: 'stable' },
  ];

  for (let d = 29; d >= 0; d--) {
    patterns.forEach((p, idx) => {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      date.setHours(p.hour, p.minute, 0, 0);

      // add minor natural variation (+/- 14) with circadian realism
      const variance = ((idx * 7 + d * 13) % 29) - 14;
      let finalVal = p.val + variance;
      if (finalVal < 65) finalVal = 70;
      if (finalVal > 220) finalVal = 195;

      readings.push({
        id: `reading_${d}_${idx}`,
        timestamp: date.toISOString(),
        value: finalVal,
        source: idx % 3 === 0 ? 'cgm_stream' : 'manual',
        deviceName: idx % 3 === 0 ? 'FreeStyle Libre 3' : 'Accu-Chek Guide',
        context: p.context as any,
        trendArrow: p.trend as any,
        notes: p.context === 'exercise' ? 'Caminhada moderada de 35 min' : undefined,
      });
    });
  }

  // Add 1 recent reading for today
  readings.push({
    id: 'reading_today_latest',
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    value: 116,
    source: 'cgm_stream',
    deviceName: 'FreeStyle Libre 3',
    context: 'post_meal_1h',
    trendArrow: 'stable',
    notes: 'Pós café da manhã',
  });

  return readings.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export function getInitialMeals(): MealRecord[] {
  const now = new Date();
  const meal1Time = new Date(now.getTime() - 2 * 3600 * 1000).toISOString();
  const meal2Time = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();

  return [
    {
      id: 'meal_1',
      timestamp: meal1Time,
      mealType: 'cafe',
      title: 'Café da Manhã com Tapioca e Ovos',
      totalCarbs: 35,
      totalProtein: 16,
      totalFat: 12,
      totalCalories: 312,
      glycemicImpact: 'Moderado',
      items: [
        {
          id: 'item_1',
          foodId: 'food_12',
          name: 'Tapioca',
          portionCount: 1,
          servingDescription: '3 colheres de sopa cheias (60g)',
          totalGrams: 60,
          carbs: 32,
          protein: 0.1,
          fat: 0.0,
          calories: 144,
        },
        {
          id: 'item_2',
          foodId: 'food_25',
          name: 'Ovo Cozido / Mexido',
          portionCount: 2,
          servingDescription: '2 unidades (100g)',
          totalGrams: 100,
          carbs: 1.2,
          protein: 13.3,
          fat: 9.5,
          calories: 146,
        },
        {
          id: 'item_3',
          foodId: 'food_21',
          name: 'Laranja Pera',
          portionCount: 0.5,
          servingDescription: '1/2 unidade (55g)',
          totalGrams: 55,
          carbs: 4.8,
          protein: 0.5,
          fat: 0.1,
          calories: 20,
        },
      ],
      aiAnalysisNotes: 'Refeição balanceada com fibras e lipídios dos ovos moderando a velocidade de absorção do carboidrato da tapioca.',
    },
    {
      id: 'meal_2',
      timestamp: meal2Time,
      mealType: 'almoco',
      title: 'Almoço Tradicional Brasileiro',
      totalCarbs: 58,
      totalProtein: 38,
      totalFat: 8,
      totalCalories: 456,
      glycemicImpact: 'Estável com absorção gradual',
      items: [
        {
          id: 'item_4',
          foodId: 'food_1',
          name: 'Arroz Branco Cozido',
          portionCount: 4,
          servingDescription: '4 colheres de sopa (100g)',
          totalGrams: 100,
          carbs: 28.1,
          protein: 2.5,
          fat: 0.2,
          calories: 128,
        },
        {
          id: 'item_5',
          foodId: 'food_3',
          name: 'Feijão Carioca Cozido',
          portionCount: 1,
          servingDescription: '1 concha média (140g)',
          totalGrams: 140,
          carbs: 19.0,
          protein: 6.7,
          fat: 0.7,
          calories: 106,
        },
        {
          id: 'item_6',
          foodId: 'food_23',
          name: 'Peito de Frango Grelhado',
          portionCount: 1,
          servingDescription: '1 filé médio (100g)',
          totalGrams: 100,
          carbs: 0.0,
          protein: 32.0,
          fat: 2.5,
          calories: 159,
        },
      ],
    },
  ];
}

export function getInitialDoses(): InsulinDoseRecord[] {
  const now = new Date();
  return [
    {
      id: 'dose_1',
      timestamp: new Date(now.getTime() - 100 * 60 * 1000).toISOString(),
      type: 'rapid',
      insulinName: 'NovoRapid',
      units: 3.5,
      foodBolusUnits: 3.5,
      correctionBolusUnits: 0,
      bgAtTime: 110,
      carbsCovered: 35,
      injectionSite: 'abdomen_bottom_right',
      notes: 'Bolus para café da manhã',
    },
    {
      id: 'dose_2',
      timestamp: new Date(now.getTime() - 22 * 3600 * 1000).toISOString(),
      type: 'basal',
      insulinName: 'Tresiba',
      units: 18,
      injectionSite: 'thigh_right',
      notes: 'Dose basal diária das 22h',
    },
    {
      id: 'dose_3',
      timestamp: new Date(now.getTime() - 26 * 3600 * 1000).toISOString(),
      type: 'rapid',
      insulinName: 'NovoRapid',
      units: 5.0,
      foodBolusUnits: 4.8,
      correctionBolusUnits: 0.2,
      bgAtTime: 125,
      carbsCovered: 58,
      injectionSite: 'abdomen_top_left',
      notes: 'Bolus para almoço',
    },
  ];
}

export const INITIAL_FAVORITE_MEALS: FavoriteMeal[] = [
  {
    id: 'fav_1',
    name: 'Meu Café Padrão (Tapioca + Ovo)',
    mealType: 'cafe',
    totalCarbs: 33,
    totalProtein: 14,
    totalFat: 9,
    totalCalories: 270,
    items: [
      {
        id: 'fi_1',
        foodId: 'food_12',
        name: 'Tapioca Preparada',
        portionCount: 1,
        servingDescription: '3 colheres de sopa cheias (60g)',
        totalGrams: 60,
        carbs: 32,
        protein: 0.1,
        fat: 0,
        calories: 144,
      },
      {
        id: 'fi_2',
        foodId: 'food_25',
        name: 'Ovo Cozido',
        portionCount: 2,
        servingDescription: '2 unidades (100g)',
        totalGrams: 100,
        carbs: 1.2,
        protein: 13.3,
        fat: 9.5,
        calories: 146,
      },
    ],
  },
  {
    id: 'fav_2',
    name: 'Almoço Prato Feito (Arroz, Feijão e Frango)',
    mealType: 'almoco',
    totalCarbs: 47,
    totalProtein: 41,
    totalFat: 3,
    totalCalories: 393,
    items: [
      {
        id: 'fi_3',
        foodId: 'food_1',
        name: 'Arroz Branco',
        portionCount: 4,
        servingDescription: '4 colheres de sopa (100g)',
        totalGrams: 100,
        carbs: 28.1,
        protein: 2.5,
        fat: 0.2,
        calories: 128,
      },
      {
        id: 'fi_4',
        foodId: 'food_3',
        name: 'Feijão Carioca',
        portionCount: 1,
        servingDescription: '1 concha média (140g)',
        totalGrams: 140,
        carbs: 19.0,
        protein: 6.7,
        fat: 0.7,
        calories: 106,
      },
      {
        id: 'fi_5',
        foodId: 'food_23',
        name: 'Peito de Frango',
        portionCount: 1,
        servingDescription: '1 filé médio (100g)',
        totalGrams: 100,
        carbs: 0.0,
        protein: 32.0,
        fat: 2.5,
        calories: 159,
      },
    ],
  },
];

export const INITIAL_REMINDERS: ReminderItem[] = [
  {
    id: 'rem_1',
    title: 'Glicemia Pós-Prandial (2h pós refeição)',
    timeString: '14:00',
    type: 'post_prandial',
    enabled: true,
    notes: 'Avaliar excursão glicêmica e acerto do bolus',
  },
  {
    id: 'rem_2',
    title: 'Insulina Basal Noturna (Tresiba)',
    timeString: '22:00',
    type: 'basal',
    enabled: true,
    notes: 'Dose padrão de 18U no rodízio de coxa/glúteo',
  },
  {
    id: 'rem_3',
    title: 'Meta de Hidratação (500ml de água)',
    timeString: '10:00',
    type: 'water',
    enabled: true,
    notes: 'Manter hidratação adequada auxilia na filtração renal de glicose',
  },
];

export const INITIAL_FITNESS_DATA: HealthFitnessSync = {
  connected: true,
  provider: 'Apple Health',
  stepsToday: 7420,
  sleepHours: 7.5,
  exerciseMinutes: 45,
  lastSyncTime: 'Hoje, há 15 minutos',
};

export function getInitialWeights(): WeightRecord[] {
  const now = new Date();
  return [
    {
      id: 'w_1',
      weightKg: 75.8,
      heightCm: 172,
      bmi: Number((75.8 / (1.72 * 1.72)).toFixed(1)),
      timestamp: new Date(now.getTime() - 28 * 24 * 3600 * 1000).toISOString(),
      notes: 'Início do acompanhamento metabólico',
    },
    {
      id: 'w_2',
      weightKg: 75.1,
      heightCm: 172,
      bmi: Number((75.1 / (1.72 * 1.72)).toFixed(1)),
      timestamp: new Date(now.getTime() - 21 * 24 * 3600 * 1000).toISOString(),
      notes: 'Pesagem matinal em jejum',
    },
    {
      id: 'w_3',
      weightKg: 74.4,
      heightCm: 172,
      bmi: Number((74.4 / (1.72 * 1.72)).toFixed(1)),
      timestamp: new Date(now.getTime() - 14 * 24 * 3600 * 1000).toISOString(),
      notes: 'Plano com menor densidade calórica',
    },
    {
      id: 'w_4',
      weightKg: 73.8,
      heightCm: 172,
      bmi: Number((73.8 / (1.72 * 1.72)).toFixed(1)),
      timestamp: new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString(),
      notes: 'Sensibilidade à insulina melhorando',
    },
    {
      id: 'w_5',
      weightKg: 73.2,
      heightCm: 172,
      bmi: Number((73.2 / (1.72 * 1.72)).toFixed(1)),
      timestamp: new Date(now.getTime() - 1 * 24 * 3600 * 1000).toISOString(),
      notes: 'Pesagem recente. Faixa de IMC normal atingida!',
    },
  ];
}

export function getInitialRoutineLog(): DailyRoutineLog {
  const todayStr = new Date().toISOString().split('T')[0];
  return {
    date: todayStr,
    waterMl: 1750,
    waterGoalMl: 2500,
    basalTaken: true,
    basalUnits: 22,
    basalTime: '08:00',
    exerciseMinutes: 30,
    exerciseType: 'Caminhada aeróbica',
    footCheckDone: true,
    footCheckNotes: 'Pele íntegra, sem feridas ou pontos de pressão.',
    bedtimeCheckDone: false,
    bedtimeBgValue: undefined,
  };
}
