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
  NotificationPreferences,
  EnabledRoutineGoals,
} from '../types';

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  enabled: true,
  momentAlerts: true,
  postMealTimer: true,
  basalReminder: true,
  waterReminder: true,
  hypoHyperAlerts: true,
  bedtimeReminder: true,
  customReminders: true,
};

export const DEFAULT_ENABLED_ROUTINE_GOALS: EnabledRoutineGoals = {
  fasting: true,
  basal: true,
  water: true,
  exercise: true,
  bedtime: true,
};

export const DEFAULT_PATIENT_PROFILE: PatientProfile = {
  name: 'Meu Perfil',
  diabetesType: 'dm1',
  heightCm: 170,
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
  emergencyContactName: '',
  emergencyContactPhone: '',
  notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
  enabledRoutineGoals: DEFAULT_ENABLED_ROUTINE_GOALS,
  routineHistory: [],
  favoriteMeals: [],
};

/**
 * Helper to detect legacy sample/demo IDs that were previously generated on new accounts
 */
export function isLegacyDemoId(id?: string): boolean {
  if (!id) return false;
  if (id === 'reading_today_latest') return true;
  if (/^reading_\d+_\d+$/.test(id)) return true;
  if (id === 'meal_1' || id === 'meal_2') return true;
  if (id === 'dose_1' || id === 'dose_2' || id === 'dose_3') return true;
  if (/^w_[1-5]$/.test(id)) return true;
  if (/^rem_[1-3]$/.test(id)) return true;
  if (id === 'fav_1' || id === 'fav_2') return true;
  return false;
}

// Start completely empty (zeroed out)
export function getInitialReadings(): GlucoseReading[] {
  return [];
}

export function getInitialMeals(): MealRecord[] {
  return [];
}

export function getInitialDoses(): InsulinDoseRecord[] {
  return [];
}

export const INITIAL_FAVORITE_MEALS: FavoriteMeal[] = [];

export const INITIAL_REMINDERS: ReminderItem[] = [];

export const INITIAL_FITNESS_DATA: HealthFitnessSync = {
  connected: false,
  provider: 'Apple Health',
  stepsToday: 0,
  sleepHours: 0,
  exerciseMinutes: 0,
  lastSyncTime: 'Não sincronizado',
};

export function getInitialWeights(): WeightRecord[] {
  return [];
}

export function getInitialRoutineLog(dateKey?: string): DailyRoutineLog {
  const todayStr = dateKey || new Date().toISOString().split('T')[0];
  return {
    date: todayStr,
    waterMl: 0,
    waterGoalMl: 2500,
    basalTaken: false,
    basalUnits: 0,
    basalTime: '22:00',
    exerciseMinutes: 0,
    exerciseType: '',
    bedtimeCheckDone: false,
    bedtimeBgValue: undefined,
  };
}
