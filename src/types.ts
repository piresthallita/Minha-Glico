export type GlucoseContext = string;

export type MomentCategory = 'meal' | 'post_meal' | 'fasting';

export interface CustomGlucoseMoment {
  id: string;
  label: string;
  shortLabel: string;
  category: MomentCategory;
  defaultMealType?: MealRecord['mealType'];
  badgeColor?: string;
  notifyTime?: string; // HH:MM format (ex: "07:30")
  notifyEnabled?: boolean;
}

export interface NotificationPreferences {
  enabled: boolean;
  momentAlerts: boolean; // Alertas nos horários dos Momentos da Medição
  postMealTimer: boolean; // Alerta de 2h pós-refeição
  basalReminder: boolean; // Lembrete da insulina basal diária
  waterReminder: boolean; // Lembretes de hidratação (água)
  hypoHyperAlerts: boolean; // Alertas críticos de hipo (<70) e hiper (>250)
  bedtimeReminder: boolean; // Lembrete de glicemia ao deitar
  customReminders: boolean; // Alarmes personalizados
}

export interface EnabledRoutineGoals {
  fasting: boolean;
  basal: boolean;
  water: boolean;
  exercise: boolean;
  bedtime: boolean;
}

export type GlucoseTrendArrow =
  | 'rapid_rise'
  | 'rise'
  | 'stable'
  | 'fall'
  | 'rapid_fall';

export interface GlucoseReading {
  id: string;
  timestamp: string; // ISO string
  value: number; // mg/dL
  source: 'manual' | 'bluetooth' | 'cgm_nfc' | 'cgm_stream';
  deviceName?: string;
  context: GlucoseContext;
  notes?: string;
  symptoms?: string[];
  trendArrow?: GlucoseTrendArrow;
  ketosisChecked?: boolean;
  insulinUnitsApplied?: number;
  insulinTypeApplied?: 'rapid' | 'basal';
  insulinNameApplied?: string;
  linkedDoseId?: string;
  linkedMealId?: string;
  mealType?: MealRecord['mealType'];
  mealTitle?: string;
  mealCarbs?: number;
}

export interface FoodItem {
  id: string;
  name: string;
  category: string;
  servingDescription: string; // Ex: "1 colher de sopa (25g)"
  gramsPerServing: number;
  carbsPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  caloriesPer100g: number;
  fiberPer100g?: number;
  barcode?: string;
  isCustom?: boolean;
  sourceTable?: 'TACO' | 'SBD' | 'Usuario' | 'Industrializado';
}

export interface MealPlateItem {
  id: string;
  foodId: string;
  name: string;
  portionCount: number;
  servingDescription: string;
  totalGrams: number;
  carbs: number;
  protein: number;
  fat: number;
  calories: number;
}

export interface MealRecord {
  id: string;
  timestamp: string;
  mealType: 'cafe' | 'almoco' | 'lanche' | 'jantar' | 'ceia' | 'outro';
  title: string;
  items: MealPlateItem[];
  totalCarbs: number;
  totalProtein: number;
  totalFat: number;
  totalCalories: number;
  photoUrl?: string;
  aiAnalysisNotes?: string;
  glycemicImpact?: string;
  linkedReadingId?: string;
  bgAtMeal?: number;
  linkedDoseId?: string;
  insulinUnitsApplied?: number;
}

export interface FavoriteMeal {
  id: string;
  name: string; // Apelido / Nome de fácil acesso (ex: "Café Campeão")
  nickname?: string;
  mealType: MealRecord['mealType'];
  items: MealPlateItem[];
  totalCarbs: number;
  totalProtein: number;
  totalFat: number;
  totalCalories: number;
}

export type InjectionSite =
  | 'abdomen_top_right'
  | 'abdomen_top_left'
  | 'abdomen_bottom_right'
  | 'abdomen_bottom_left'
  | 'arm_left'
  | 'arm_right'
  | 'thigh_left'
  | 'thigh_right'
  | 'buttock_left'
  | 'buttock_right';

export interface InsulinDoseRecord {
  id: string;
  timestamp: string;
  type: 'rapid' | 'basal';
  insulinName: string;
  units: number;
  foodBolusUnits?: number;
  correctionBolusUnits?: number;
  iobDeductedUnits?: number;
  bgAtTime?: number;
  carbsCovered?: number;
  injectionSite?: InjectionSite;
  notes?: string;
  linkedReadingId?: string;
  linkedMealId?: string;
  context?: GlucoseContext;
}

export interface PatientProfile {
  name: string;
  diabetesType: 'dm1' | 'dm2' | 'gestacional' | 'lada' | 'mody' | 'outro';
  targetBg: number; // ex: 100 mg/dL
  targetRangeLow: number; // 70 mg/dL
  targetRangeHigh: number; // 180 mg/dL
  icrMorning: number; // 1U / X g CHO
  icrAfternoon: number;
  icrNight: number;
  isf: number; // Fator Sensibilidade (1U reduz X mg/dL)
  diaHours: number; // Duração da Ação da Insulina (ex: 3.5 horas)
  rapidInsulinName: string; // ex: 'NovoRapid / Fiasp'
  basalInsulinName: string; // ex: 'Tresiba / Toujeo'
  dailyCarbLimit: number; // ex: 180g
  mealCarbLimit: number; // ex: 60g
  emergencyContactName: string;
  emergencyContactPhone: string;
  heightCm?: number;
  customMoments?: CustomGlucoseMoment[];
  notificationPrefs?: NotificationPreferences;
  enabledRoutineGoals?: EnabledRoutineGoals;
  routineHistory?: DailyRoutineLog[];
  favoriteMeals?: FavoriteMeal[];
}

export interface WeightRecord {
  id: string;
  weightKg: number;
  heightCm: number;
  bmi: number;
  timestamp: string;
  notes?: string;
}

export interface ReminderItem {
  id: string;
  title: string;
  timeString: string;
  type: 'post_prandial' | 'basal' | 'water' | 'exercise' | 'custom';
  enabled: boolean;
  notes?: string;
}

export interface HealthFitnessSync {
  connected: boolean;
  provider: 'Apple Health' | 'Google Fit' | 'Simulado';
  stepsToday: number;
  sleepHours: number;
  exerciseMinutes: number;
  lastSyncTime: string;
}

export interface DailyRoutineLog {
  date: string; // YYYY-MM-DD
  waterMl: number;
  waterGoalMl: number;
  basalTaken: boolean;
  basalUnits: number;
  basalTime?: string;
  exerciseMinutes: number;
  exerciseType?: string;
  footCheckDone?: boolean;
  footCheckNotes?: string;
  bedtimeCheckDone: boolean;
  bedtimeBgValue?: number;
}
