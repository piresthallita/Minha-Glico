import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Droplet,
  Utensils,
  Calculator,
  Syringe,
  FileText,
  Settings,
  Plus,
  AlertTriangle,
  Clock,
  Sparkles,
  Search,
  Check,
  Radio,
  Download,
  Bell,
  BellRing,
  BellOff,
  Trash2,
  Sun,
  Moon,
  ShieldCheck,
  User as UserIcon,
  LogIn,
  LogOut,
  Cloud,
  Calendar,
  X,
  MoreVertical,
  Zap,
  Edit3,
  RefreshCw,
  ArrowUpRight,
  Percent,
  Home,
  Menu,
  CheckCircle2,
  Droplets,
  Footprints,
  ChevronLeft,
  ChevronRight,
  Star,
} from 'lucide-react';

import { motion, AnimatePresence } from 'motion/react';

import {
  GlucoseReading,
  MealRecord,
  MealPlateItem,
  InsulinDoseRecord,
  PatientProfile,
  FavoriteMeal,
  FoodItem,
  ReminderItem,
  GlucoseContext,
  CustomGlucoseMoment,
  MomentCategory,
  HealthFitnessSync,
  WeightRecord,
  DailyRoutineLog,
  NotificationPreferences,
  EnabledRoutineGoals,
} from './types';

import { OFFICIAL_FOOD_DATABASE } from './data/foodDatabase';
import {
  DEFAULT_PATIENT_PROFILE,
  getInitialReadings,
  getInitialMeals,
  getInitialDoses,
  INITIAL_FAVORITE_MEALS,
  INITIAL_REMINDERS,
  INITIAL_FITNESS_DATA,
  getInitialWeights,
  getInitialRoutineLog,
  isLegacyDemoId,
  DEFAULT_NOTIFICATION_PREFS,
  DEFAULT_ENABLED_ROUTINE_GOALS,
} from './data/initialData';

import {
  calculateTIR,
  calculateIOB,
  calculateBolus,
  playEmergencyAlertSound,
  getGlucoseContextLabel,
  getGlucoseContextBadgeColor,
  getEffectiveGlucoseMoments,
  getMomentCategory,
  getMealTypeLabel,
  DEFAULT_GLUCOSE_MOMENTS,
} from './utils/clinicalCalculations';

import {
  getNotificationPermission,
  requestNotificationPermission,
  sendWebNotification,
  playNotificationChime,
  getAppLogoUrl,
} from './utils/notifications';

import { auth, loginWithGoogle, logoutFirebase } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  loadUserDataFromFirestore,
  saveProfileToFirestore,
  saveReadingToFirestore,
  deleteReadingFromFirestore,
  saveMealToFirestore,
  deleteMealFromFirestore,
  saveDoseToFirestore,
  deleteDoseFromFirestore,
  saveReminderToFirestore,
  deleteReminderFromFirestore,
  saveWeightToFirestore,
  deleteWeightFromFirestore,
  resetAllUserDataInFirestore,
} from './services/firebaseSync';

import { GlucoseChart } from './components/GlucoseChart';
import { HypoEmergencyModal } from './components/HypoEmergencyModal';
import { BluetoothScannerModal } from './components/BluetoothScannerModal';
import { AiMealScannerModal } from './components/AiMealScannerModal';
import { PrintableReportModal } from './components/PrintableReportModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { WeightTrackerCard } from './components/WeightTrackerCard';
import { SidebarDrawer, AppPageId } from './components/SidebarDrawer';
import { DailyRoutineView } from './components/DailyRoutineView';
import { ReportsClinicalView } from './components/ReportsClinicalView';
import { AuthScreen } from './components/AuthScreen';
import { ResetAllModal } from './components/ResetAllModal';
import { InsulinApplicationsView } from './components/InsulinApplicationsView';

function toLocalDateTimeInputString(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getLocalDateKey(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function shiftDateKey(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  return getLocalDateKey(dt);
}

function formatMonitoringDayHeader(dateStr: string): { badge: string; formattedDate: string } {
  const todayStr = getLocalDateKey(new Date());
  const yesterdayStr = shiftDateKey(todayStr, -1);
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const formattedDate = dt.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  if (dateStr === todayStr) return { badge: 'Hoje', formattedDate };
  if (dateStr === yesterdayStr) return { badge: 'Ontem', formattedDate };
  return { badge: 'Dia Anterior', formattedDate };
}

export default function App() {
  // Default to Light Mode so the soft-gray + white + coral-orange + jet-black Bento design shines immediately
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('mg_theme_v2');
    if (saved) return saved === 'dark';
    return false;
  });

  // Apply dark class to document root
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('mg_theme_v2', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('mg_theme_v2', 'light');
    }
  }, [isDark]);

  // Push Notifications state
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(() => {
    return getNotificationPermission();
  });
  const [inAppToast, setInAppToast] = useState<{ title: string; body: string } | null>(null);

  // Persistence state (starts empty and strips any legacy sample IDs)
  const [readings, setReadings] = useState<GlucoseReading[]>(() => {
    const saved = localStorage.getItem('mg_readings');
    if (!saved) return getInitialReadings();
    try {
      const parsed = JSON.parse(saved) as GlucoseReading[];
      return Array.isArray(parsed) ? parsed.filter((r) => !isLegacyDemoId(r.id)) : [];
    } catch {
      return [];
    }
  });

  const [meals, setMeals] = useState<MealRecord[]>(() => {
    const saved = localStorage.getItem('mg_meals');
    if (!saved) return getInitialMeals();
    try {
      const parsed = JSON.parse(saved) as MealRecord[];
      return Array.isArray(parsed) ? parsed.filter((m) => !isLegacyDemoId(m.id)) : [];
    } catch {
      return [];
    }
  });

  const [doses, setDoses] = useState<InsulinDoseRecord[]>(() => {
    const saved = localStorage.getItem('mg_doses');
    if (!saved) return getInitialDoses();
    try {
      const parsed = JSON.parse(saved) as InsulinDoseRecord[];
      return Array.isArray(parsed) ? parsed.filter((d) => !isLegacyDemoId(d.id)) : [];
    } catch {
      return [];
    }
  });

  const [profile, setProfile] = useState<PatientProfile>(() => {
    const saved = localStorage.getItem('mg_profile');
    if (!saved) return DEFAULT_PATIENT_PROFILE;
    try {
      const parsed = JSON.parse(saved) as PatientProfile;
      if (parsed.name === 'Paciente Exemplo') parsed.name = 'Meu Perfil';
      if (parsed.emergencyContactName === 'Dr. Lucas (Endocrinologista)') {
        parsed.emergencyContactName = '';
        parsed.emergencyContactPhone = '';
      }
      return parsed;
    } catch {
      return DEFAULT_PATIENT_PROFILE;
    }
  });

  const [favorites, setFavorites] = useState<FavoriteMeal[]>(() => {
    const saved = localStorage.getItem('mg_favorites');
    if (!saved) return INITIAL_FAVORITE_MEALS;
    try {
      const parsed = JSON.parse(saved) as FavoriteMeal[];
      return Array.isArray(parsed) ? parsed.filter((f) => !isLegacyDemoId(f.id)) : [];
    } catch {
      return [];
    }
  });

  const [reminders, setReminders] = useState<ReminderItem[]>(() => {
    const saved = localStorage.getItem('mg_reminders');
    if (!saved) return INITIAL_REMINDERS;
    try {
      const parsed = JSON.parse(saved) as ReminderItem[];
      return Array.isArray(parsed) ? parsed.filter((r) => !isLegacyDemoId(r.id)) : [];
    } catch {
      return [];
    }
  });

  const [fitnessData, setFitnessData] = useState<HealthFitnessSync>(() => {
    const saved = localStorage.getItem('mg_fitness');
    if (!saved) return INITIAL_FITNESS_DATA;
    try {
      const parsed = JSON.parse(saved) as HealthFitnessSync;
      if (parsed.stepsToday === 7420 && parsed.exerciseMinutes === 45) {
        return INITIAL_FITNESS_DATA;
      }
      return parsed;
    } catch {
      return INITIAL_FITNESS_DATA;
    }
  });

  // Active navigation page
  const [activePage, setActivePage] = useState<AppPageId>('today');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Daily routine habits history & selected day state
  const [selectedRoutineDate, setSelectedRoutineDate] = useState<string>(() => getLocalDateKey());
  const [routineHistory, setRoutineHistory] = useState<DailyRoutineLog[]>(() => {
    const savedHistory = localStorage.getItem('mg_routine_history_v1');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory) as DailyRoutineLog[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // ignore
      }
    }
    const savedLegacy = localStorage.getItem('mg_routine_v2');
    if (savedLegacy) {
      try {
        const parsed = JSON.parse(savedLegacy);
        if (
          parsed &&
          parsed.date &&
          !(parsed.waterMl === 1750 && parsed.exerciseType === 'Caminhada aeróbica')
        ) {
          return [parsed];
        }
      } catch {
        // ignore
      }
    }
    return [getInitialRoutineLog(getLocalDateKey())];
  });

  useEffect(() => {
    localStorage.setItem('mg_routine_history_v1', JSON.stringify(routineHistory));
  }, [routineHistory]);

  const routineLog: DailyRoutineLog = React.useMemo(() => {
    const found = routineHistory.find((r) => r.date === selectedRoutineDate);
    if (found) return found;
    const latestEntry = routineHistory[0];
    return {
      ...getInitialRoutineLog(selectedRoutineDate),
      waterGoalMl: latestEntry?.waterGoalMl || 2500,
      basalUnits: latestEntry?.basalUnits || 0,
    };
  }, [routineHistory, selectedRoutineDate]);

  const handleUpdateRoutine = (updated: Partial<DailyRoutineLog>) => {
    setRoutineHistory((prev) => {
      const targetDate = updated.date || selectedRoutineDate;
      const exists = prev.some((item) => item.date === targetDate);
      const nextHistory = exists
        ? prev.map((item) => (item.date === targetDate ? { ...item, ...updated } : item))
        : [{ ...routineLog, ...updated, date: targetDate }, ...prev];

      const sorted = [...nextHistory].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 90);
      if (currentUser) {
        saveProfileToFirestore(currentUser.uid, { ...profile, routineHistory: sorted });
      }
      return sorted;
    });
  };

  const enabledRoutineGoals: EnabledRoutineGoals =
    profile.enabledRoutineGoals || DEFAULT_ENABLED_ROUTINE_GOALS;

  const handleToggleGoalEnabled = (goalKey: keyof EnabledRoutineGoals) => {
    const nextGoals: EnabledRoutineGoals = {
      ...enabledRoutineGoals,
      [goalKey]: !enabledRoutineGoals[goalKey],
    };
    const updatedProfile: PatientProfile = {
      ...profile,
      enabledRoutineGoals: nextGoals,
    };
    setProfile(updatedProfile);
    if (currentUser) {
      saveProfileToFirestore(currentUser.uid, updatedProfile);
    }
  };

  const notificationPrefs: NotificationPreferences =
    profile.notificationPrefs || DEFAULT_NOTIFICATION_PREFS;

  const handleUpdateNotificationPref = (
    key: keyof NotificationPreferences,
    value: boolean
  ) => {
    const nextPrefs: NotificationPreferences = {
      ...notificationPrefs,
      [key]: value,
    };
    const updatedProfile: PatientProfile = {
      ...profile,
      notificationPrefs: nextPrefs,
    };
    setProfile(updatedProfile);
    if (currentUser) {
      saveProfileToFirestore(currentUser.uid, updatedProfile);
    }
  };

  // Backwards compatibility alias
  const activeTab = activePage === 'today' ? 'dashboard' : activePage;
  const setActiveTab = (tab: string) => {
    if (tab === 'dashboard') setActivePage('today');
    else setActivePage(tab as AppPageId);
  };

  // Sub-tabs
  const [mealsSubTab, setMealsSubTab] = useState<'plate' | 'search' | 'favorites'>('plate');
  const [reportsSubTab, setReportsSubTab] = useState<'overview' | 'reminders' | 'profile'>('overview');

  // Time window range for reports summary: 7, 14, 30 days
  const [reportSummaryRange, setReportSummaryRange] = useState<'7days' | '14days' | '30days'>('14days');

  // Selected stem index in the Bento Lollipop widget
  const [selectedStemIdx, setSelectedStemIdx] = useState<number>(2);

  // Custom reminder creation form state
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('08:00');
  const [newReminderType, setNewReminderType] = useState<'post_prandial' | 'basal'>('post_prandial');
  const [newReminderNotes, setNewReminderNotes] = useState('');

  // Firebase Auth user state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    return localStorage.getItem('mg_is_guest') === 'true';
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Weight tracking state
  const [weights, setWeights] = useState<WeightRecord[]>(() => {
    const saved = localStorage.getItem('mg_weights');
    if (!saved) return getInitialWeights();
    try {
      const parsed = JSON.parse(saved) as WeightRecord[];
      return Array.isArray(parsed) ? parsed.filter((w) => !isLegacyDemoId(w.id)) : [];
    } catch {
      return [];
    }
  });

  // Modals state
  const [isHypoModalOpen, setIsHypoModalOpen] = useState(false);
  const [isBluetoothModalOpen, setIsBluetoothModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isManualReadingModalOpen, setIsManualReadingModalOpen] = useState(false);
  const [isResetAllModalOpen, setIsResetAllModalOpen] = useState(false);

  // Post meal 2h timer state
  const [isPostMealTimerActive, setIsPostMealTimerActive] = useState(false);
  const [postMealMinutesLeft, setPostMealMinutesLeft] = useState(120);

  // Meal builder state
  const [currentPlate, setCurrentPlate] = useState<MealPlateItem[]>([]);
  const [mealTitle, setMealTitle] = useState('Almoço');
  const [mealType, setMealType] = useState<MealRecord['mealType']>('almoco');
  const [foodSearchQuery, setFoodSearchQuery] = useState('');
  const [selectedCategory] = useState<string>('Todas');
  const [aiNotesForCurrentMeal, setAiNotesForCurrentMeal] = useState('');
  const [glycemicImpactCurrentMeal, setGlycemicImpactCurrentMeal] = useState('');

  // Quick manual reading form + Momentos customization + Meal/Post-Meal flow
  const [manualBgValue, setManualBgValue] = useState<string>('');
  const [manualDateTime, setManualDateTime] = useState<string>(() => toLocalDateTimeInputString());
  const [manualContext, setManualContext] = useState<GlucoseContext>('jejum');
  const [manualNotes, setManualNotes] = useState('');
  const [manualSymptoms, setManualSymptoms] = useState<string[]>([]);
  const [manualDidApplyInsulin, setManualDidApplyInsulin] = useState<boolean>(false);
  const [manualInsulinUnits, setManualInsulinUnits] = useState<string>('');
  const [manualInsulinType, setManualInsulinType] = useState<'rapid' | 'basal'>('rapid');

  // Custom Momentos da Medição management state
  const [isCustomizingMoments, setIsCustomizingMoments] = useState<boolean>(false);
  const [newMomentLabel, setNewMomentLabel] = useState<string>('');
  const [newMomentCategory, setNewMomentCategory] = useState<MomentCategory>('meal');
  const [newMomentDefaultMeal, setNewMomentDefaultMeal] = useState<MealRecord['mealType']>('almoco');
  const [newMomentNotifyTime, setNewMomentNotifyTime] = useState<string>('');

  // Meal flow inside Manual Reading Modal (when Momento is a Refeição)
  const [manualFlowMode, setManualFlowMode] = useState<'meal' | 'post_meal'>('post_meal');
  const [manualSelectedMealType, setManualSelectedMealType] = useState<MealRecord['mealType']>('almoco');
  const [manualCustomMealName, setManualCustomMealName] = useState<string>('');
  const [manualRegisterMealFoods, setManualRegisterMealFoods] = useState<boolean>(false);

  // Pending meal registration redirected from the Manual Reading Modal
  const [pendingMealFromReading, setPendingMealFromReading] = useState<{
    readingId: string;
    bgValue: number;
    mealType: MealRecord['mealType'];
    mealTitle: string;
    timestamp: string;
    context: GlucoseContext;
    notes?: string;
  } | null>(null);

  // Favorite meal nickname ("Apelido") states
  const [favoriteNicknameInput, setFavoriteNicknameInput] = useState<string>('');
  const [editingFavoriteId, setEditingFavoriteId] = useState<string | null>(null);
  const [editingFavoriteNickname, setEditingFavoriteNickname] = useState<string>('');

  // Selected date filter for Glucose Monitoring & Insulin Applications pages (defaults to Today)
  const [monitoringDate, setMonitoringDate] = useState<string>(() => getLocalDateKey());
  const [preselectedReadingForDose, setPreselectedReadingForDose] = useState<string | null>(null);

  // Bolus calculator state & linked measurement/meal context
  const [bolusCarbsInput, setBolusCarbsInput] = useState<number>(0);
  const [bolusBgInput, setBolusBgInput] = useState<string>('');
  const [bolusTimeOfDay, setBolusTimeOfDay] = useState<'morning' | 'afternoon' | 'night'>('afternoon');
  const [bolusWillApplyDose, setBolusWillApplyDose] = useState<boolean>(true);
  const [pendingBolusContext, setPendingBolusContext] = useState<{
    readingId?: string;
    mealId?: string;
    bgValue?: number;
    mealTitle?: string;
    mealCarbs?: number;
    timestamp?: string;
    context?: string;
  } | null>(null);

  // Insulin dose logger state
  const [doseUnitsInput, setDoseUnitsInput] = useState<string>('4.0');
  const [doseTypeInput, setDoseTypeInput] = useState<'rapid' | 'basal'>('rapid');
  const [doseNotesInput, setDoseNotesInput] = useState('');

  // Track triggered reminders in current session
  const lastTriggeredTimesRef = useRef<{ [reminderId: string]: string }>({});

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('mg_readings', JSON.stringify(readings));
  }, [readings]);

  useEffect(() => {
    localStorage.setItem('mg_meals', JSON.stringify(meals));
  }, [meals]);

  useEffect(() => {
    localStorage.setItem('mg_doses', JSON.stringify(doses));
  }, [doses]);

  useEffect(() => {
    localStorage.setItem('mg_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('mg_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('mg_reminders', JSON.stringify(reminders));
  }, [reminders]);

  useEffect(() => {
    localStorage.setItem('mg_fitness', JSON.stringify(fitnessData));
  }, [fitnessData]);

  useEffect(() => {
    localStorage.setItem('mg_weights', JSON.stringify(weights));
  }, [weights]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setCurrentUser(firebaseUser);
      setIsAuthLoading(false);

      if (firebaseUser) {
        setIsGuest(false);
        localStorage.removeItem('mg_is_guest');

        // If switching accounts or logging into a fresh account, reset local-only states
        const lastUid = localStorage.getItem('mg_last_uid');
        if (lastUid !== firebaseUser.uid) {
          localStorage.setItem('mg_last_uid', firebaseUser.uid);
          setFavorites([]);
          setRoutineHistory([getInitialRoutineLog(getLocalDateKey())]);
          setFitnessData(INITIAL_FITNESS_DATA);
          setCurrentPlate([]);
        }

        triggerToast(
          'Conta Firebase Conectada',
          `Sessão iniciada como ${firebaseUser.email || firebaseUser.displayName || 'Usuário'}. Dados sincronizados na nuvem.`
        );

        try {
          const cloudData = await loadUserDataFromFirestore(firebaseUser.uid);
          if (cloudData.profile) {
            setProfile(cloudData.profile);
            if (Array.isArray(cloudData.profile.routineHistory) && cloudData.profile.routineHistory.length > 0) {
              setRoutineHistory(cloudData.profile.routineHistory);
            }
            if (Array.isArray(cloudData.profile.favoriteMeals)) {
              setFavorites(cloudData.profile.favoriteMeals);
            }
          } else {
            const initialUserProfile: PatientProfile = {
              ...DEFAULT_PATIENT_PROFILE,
              name: firebaseUser.displayName || 'Meu Perfil',
            };
            setProfile(initialUserProfile);
            await saveProfileToFirestore(firebaseUser.uid, initialUserProfile);
          }

          // Always reflect the exact cloud state (empty arrays for new accounts!)
          setReadings(cloudData.readings || []);
          setMeals(cloudData.meals || []);
          setDoses(cloudData.doses || []);
          setReminders(cloudData.reminders || []);
          setWeights(cloudData.weights || []);
        } catch (err) {
          console.error('Error syncing from Firestore on login:', err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Handle Reset All Data (2-Step Confirmed)
  const handleResetAllData = async () => {
    const cleanProfile: PatientProfile = {
      ...DEFAULT_PATIENT_PROFILE,
      name: currentUser?.displayName || profile.name || 'Meu Perfil',
    };

    // Clear all React states
    setReadings([]);
    setMeals([]);
    setDoses([]);
    setWeights([]);
    setFavorites([]);
    setReminders([]);
    setCurrentPlate([]);
    setFitnessData(INITIAL_FITNESS_DATA);
    setRoutineHistory([getInitialRoutineLog(getLocalDateKey())]);
    setSelectedRoutineDate(getLocalDateKey());
    setProfile(cleanProfile);
    setIsPostMealTimerActive(false);

    // Clear localStorage
    [
      'mg_readings',
      'mg_meals',
      'mg_doses',
      'mg_weights',
      'mg_favorites',
      'mg_reminders',
      'mg_fitness',
      'mg_routine_v2',
      'mg_routine_history_v1',
    ].forEach((key) => localStorage.removeItem(key));
    localStorage.setItem('mg_profile', JSON.stringify(cleanProfile));

    // Delete all user documents in Firestore if logged in
    if (currentUser) {
      await resetAllUserDataInFirestore(currentUser.uid, cleanProfile);
    }

    triggerToast(
      'Conta Zerada com Sucesso!',
      'Todos os seus registros locais e na nuvem foram apagados. Você está começando do zero.'
    );
  };

  // Handle Google Login
  const handleGoogleLogin = async () => {
    try {
      const loggedUser = await loginWithGoogle();
      setIsGuest(false);
      localStorage.removeItem('mg_is_guest');
      setIsAuthModalOpen(false);
      triggerToast('Login com Sucesso', `Bem-vindo(a), ${loggedUser.displayName || loggedUser.email}!`);
      setIsUserMenuOpen(false);
    } catch (err) {
      console.error('Login error:', err);
      triggerToast('Falha no Login', 'Não foi possível completar o login com Google.');
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await logoutFirebase();
      setCurrentUser(null);
      setIsGuest(false);
      localStorage.removeItem('mg_is_guest');
      localStorage.removeItem('mg_last_uid');
      // Reset local state on logout so another user on the same device starts clean
      setReadings([]);
      setMeals([]);
      setDoses([]);
      setWeights([]);
      setFavorites([]);
      setReminders([]);
      setRoutineHistory([getInitialRoutineLog(getLocalDateKey())]);
      setProfile(DEFAULT_PATIENT_PROFILE);
      setIsUserMenuOpen(false);
      triggerToast('Sessão Encerrada', 'Você saiu da sua conta. Seus dados estão seguros no Firebase.');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Weight handlers
  const handleAddWeight = async (weightKg: number, heightCm: number, notes?: string) => {
    const effectiveHeight = heightCm || profile.heightCm || 172;
    const bmiVal = Number((weightKg / Math.pow(effectiveHeight / 100, 2)).toFixed(1));
    const newRecord: WeightRecord = {
      id: `weight_${Date.now()}`,
      weightKg,
      heightCm: effectiveHeight,
      bmi: bmiVal,
      timestamp: new Date().toISOString(),
      notes,
    };

    setWeights((prev) => [newRecord, ...prev]);

    if (currentUser) {
      await saveWeightToFirestore(currentUser.uid, newRecord);
    }

    triggerToast('Peso Registrado!', `${weightKg} kg (IMC ${bmiVal}) salvo com sucesso.`);
  };

  const handleDeleteWeight = async (id: string) => {
    setWeights((prev) => prev.filter((w) => w.id !== id));
    if (currentUser) {
      await deleteWeightFromFirestore(currentUser.uid, id);
    }
    triggerToast('Pesagem Removida', 'O registro foi excluído.');
  };

  const handleUpdateHeight = async (heightCm: number) => {
    setProfile((prev) => ({ ...prev, heightCm }));
    if (currentUser) {
      await saveProfileToFirestore(currentUser.uid, { ...profile, heightCm });
    }
  };

  // Request Web Notifications Permission
  const handleRequestNotificationPermission = async () => {
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
    if (perm === 'granted') {
      sendWebNotification('🩸 Minha Glico: Notificações Ativadas!', {
        body: 'Você receberá alertas no navegador para medir glicemia pós-prandial e aplicar insulina basal.',
      });
      triggerToast(
        'Notificações Push Ativadas',
        'Seu navegador agora enviará alertas nos horários programados!'
      );
    } else {
      triggerToast(
        'Permissão Bloqueada',
        'Permita as notificações nas configurações do seu navegador para receber alertas automáticos.'
      );
    }
  };

  const triggerToast = (title: string, body: string) => {
    setInAppToast({ title, body });
    playNotificationChime();
    setTimeout(() => setInAppToast(null), 5000);
  };

  // Test live notification
  const handleTestNotification = (type: 'post_prandial' | 'basal') => {
    const isPost = type === 'post_prandial';
    const title = isPost
      ? '🩸 Hora de Medir a Glicemia Pós-Prandial!'
      : '💉 Hora da Insulina Basal!';
    const body = isPost
      ? 'Já se passaram 2 horas desde sua última refeição. Meça sua glicemia para checar a excursão glicêmica.'
      : `Horário de aplicar ${profile.basalInsulinName} no rodízio de coxa/glúteo para manter a estabilidade.`;

    sendWebNotification(title, { body });
    triggerToast(title, body);
  };

  // Background reminder & Momentos notification checker (every 25 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const prefs = profile.notificationPrefs || DEFAULT_NOTIFICATION_PREFS;
      if (!prefs.enabled) return;

      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMins = String(now.getMinutes()).padStart(2, '0');
      const currentTimeString = `${currentHours}:${currentMins}`;
      const todayKey = now.toISOString().slice(0, 10);

      // 1. Check custom reminders & basal alerts
      reminders.forEach((r) => {
        if (!r.enabled) return;
        if (r.type === 'basal' && !prefs.basalReminder) return;
        if (r.type !== 'basal' && !prefs.customReminders) return;

        const triggerKey = `rem_${r.id}_${todayKey}_${currentTimeString}`;
        if (r.timeString === currentTimeString && lastTriggeredTimesRef.current[r.id] !== triggerKey) {
          lastTriggeredTimesRef.current[r.id] = triggerKey;

          const title =
            r.type === 'basal'
              ? '💉 Lembrete de Insulina Basal'
              : r.type === 'post_prandial'
              ? '🩸 Lembrete: Medir Glicemia Pós-Refeição'
              : `⏰ ${r.title}`;

          const body = r.notes || `Horário programado (${r.timeString}) para manter o controle glicêmico.`;
          sendWebNotification(title, { body });
          triggerToast(title, body);
        }
      });

      // 2. Check Momentos da Medição scheduled notification times
      if (prefs.momentAlerts) {
        const currentMoments = getEffectiveGlucoseMoments(profile.customMoments);
        currentMoments.forEach((m) => {
          if (!m.notifyTime || m.notifyEnabled === false) return;
          const triggerKey = `moment_${m.id}_${todayKey}_${currentTimeString}`;
          if (
            m.notifyTime === currentTimeString &&
            lastTriggeredTimesRef.current[`moment_${m.id}`] !== triggerKey
          ) {
            lastTriggeredTimesRef.current[`moment_${m.id}`] = triggerKey;
            const title = `🩸 Hora de Medir: ${m.label}`;
            const body = `Chegou o horário programado (${m.notifyTime}) para o momento "${m.label}". Registre sua glicemia!`;
            sendWebNotification(title, { body });
            triggerToast(title, body);
          }
        });
      }

      // 3. Check 2h Post-Meal Timer
      if (isPostMealTimerActive) {
        setPostMealMinutesLeft((prev) => {
          if (prev <= 1) {
            setIsPostMealTimerActive(false);
            if (prefs.postMealTimer) {
              const title = '🩸 Alerta: 2 Horas Pós-Refeição!';
              const body =
                'Atingido o tempo de pico glicêmico. Faça a medição para validar a contagem de carboidratos.';
              sendWebNotification(title, { body });
              triggerToast(title, body);
            }
            return 0;
          }
          return prev - 1;
        });
      }
    }, 25000);

    return () => clearInterval(interval);
  }, [reminders, isPostMealTimerActive, profile]);

  // Latest glucose reading
  const sortedReadings = [...readings].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const latestReading = sortedReadings[0];

  // Active insulin (IOB)
  const { totalIOB } = calculateIOB(doses, profile.diaHours);

  // Time in range metrics
  const tirStats = calculateTIR(readings);

  // Time in range metrics filtered by reportSummaryRange (7, 14, 30 days)
  const reportCutoffDays = reportSummaryRange === '7days' ? 7 : reportSummaryRange === '14days' ? 14 : 30;
  const reportCutoffTime = Date.now() - reportCutoffDays * 24 * 60 * 60 * 1000;
  const reportFilteredReadings = readings.filter(
    (r) => new Date(r.timestamp).getTime() >= reportCutoffTime
  );
  const reportTirStats = calculateTIR(
    reportFilteredReadings.length > 0 ? reportFilteredReadings : readings
  );

  // Averages by clinical context for the Profit Statistics-style Bento card
  const fastingReadings = readings.filter(
    (r) => r.context === 'jejum' || r.context === 'fasting' || r.context === 'cafe_manha'
  );
  const postMealReadings = readings.filter(
    (r) =>
      r.context === 'pos_cafe' ||
      r.context === 'pos_almoco' ||
      r.context === 'pos_jantar' ||
      r.context === 'post_meal_1h' ||
      r.context === 'post_meal_2h'
  );
  const dawnReadings = readings.filter(
    (r) => r.context === 'madrugada' || r.context === 'dawn' || r.context === 'jantar'
  );

  const avgFasting =
    fastingReadings.length > 0
      ? Math.round(fastingReadings.reduce((a, b) => a + b.value, 0) / fastingReadings.length)
      : 0;
  const avgPostMeal =
    postMealReadings.length > 0
      ? Math.round(postMealReadings.reduce((a, b) => a + b.value, 0) / postMealReadings.length)
      : 0;
  const avgDawn =
    dawnReadings.length > 0
      ? Math.round(dawnReadings.reduce((a, b) => a + b.value, 0) / dawnReadings.length)
      : 0;

  // Custom reminder creation handler
  const handleCreateCustomReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderTitle.trim() || !newReminderTime) {
      triggerToast('Campos Obrigatórios', 'Por favor, preencha o título e o horário do lembrete.');
      return;
    }

    const newReminder: ReminderItem = {
      id: `rem_${Date.now()}`,
      title: newReminderTitle.trim(),
      timeString: newReminderTime,
      type: newReminderType,
      enabled: true,
      notes:
        newReminderNotes.trim() ||
        (newReminderType === 'basal'
          ? `Horário de aplicar insulina basal (${profile.basalInsulinName})`
          : 'Horário de checar glicemia capilar'),
    };

    setReminders((prev) => [newReminder, ...prev]);
    if (currentUser) {
      saveReminderToFirestore(currentUser.uid, newReminder);
    }
    setNewReminderTitle('');
    setNewReminderNotes('');
    triggerToast(
      'Lembrete Criado!',
      `Lembrete "${newReminder.title}" agendado para ${newReminder.timeString}.`
    );
  };

  const handleDeleteReminder = (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    if (currentUser) {
      deleteReminderFromFirestore(currentUser.uid, id);
    }
    triggerToast('Lembrete Removido', 'O alerta foi excluído da sua rotina.');
  };

  // Check emergency state
  const isHypo = latestReading && latestReading.value < 70;
  const isSevereHypo = latestReading && latestReading.value < 54;
  const isHyper = latestReading && latestReading.value > 250;

  // Log new glucose reading
  const handleAddReading = (r: Omit<GlucoseReading, 'id'>, customId?: string) => {
    const newRecord: GlucoseReading = {
      ...r,
      id: customId || `reading_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
    setReadings((prev) => {
      const updated = [newRecord, ...prev];
      return updated.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    });
    if (currentUser) {
      saveReadingToFirestore(currentUser.uid, newRecord);
    }

    // Automatically focus the monitoring date on the day of the reading just added
    const readingDateKey = getLocalDateKey(new Date(newRecord.timestamp));
    setMonitoringDate(readingDateKey);

    // Auto-sync bedtime check in Daily Routine Goals if measuring at Ceia or Madrugada
    if (newRecord.context === 'ceia' || newRecord.context === 'madrugada') {
      handleUpdateRoutine({
        date: readingDateKey,
        bedtimeCheckDone: true,
      });
    }

    if (newRecord.value < 70) {
      playEmergencyAlertSound('hypo');
      setIsHypoModalOpen(true);
      if (notificationPrefs.enabled && notificationPrefs.hypoHyperAlerts) {
        sendWebNotification('⚠️ Alerta de Hipoglicemia!', {
          body: `Glicemia de ${newRecord.value} mg/dL registrada. Aplique a Regra dos 15 imediatamente.`,
        });
      }
    } else if (newRecord.value > 250) {
      playEmergencyAlertSound('hyper');
      if (notificationPrefs.enabled && notificationPrefs.hypoHyperAlerts) {
        sendWebNotification('⚠️ Alerta de Hiperglicemia!', {
          body: `Glicemia elevada (${newRecord.value} mg/dL). Confira sua insulina ativa e hidratação.`,
        });
      }
    }
    return newRecord;
  };

  // Effective customizable moments
  const effectiveMoments = getEffectiveGlucoseMoments(profile.customMoments);

  // Refresh modal timestamp and sync flow mode whenever the Manual Reading Modal opens
  useEffect(() => {
    if (isManualReadingModalOpen) {
      setManualDateTime(toLocalDateTimeInputString(new Date()));
      const selectedMom = effectiveMoments.find((m) => m.id === manualContext);
      if (selectedMom) {
        setManualFlowMode(selectedMom.category === 'meal' ? 'meal' : 'post_meal');
      }
    }
  }, [isManualReadingModalOpen]);

  const handleUpdateCustomMoments = (nextMoments: CustomGlucoseMoment[]) => {
    const updatedProfile: PatientProfile = {
      ...profile,
      customMoments: nextMoments,
    };
    setProfile(updatedProfile);
    localStorage.setItem('mg_profile', JSON.stringify(updatedProfile));
    if (currentUser) {
      saveProfileToFirestore(currentUser.uid, updatedProfile);
    }
  };

  const handleAddCustomMoment = () => {
    const trimmed = newMomentLabel.trim();
    if (!trimmed) return;
    const id = `moment_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newMoment: CustomGlucoseMoment = {
      id,
      label: trimmed,
      shortLabel: trimmed.slice(0, 12),
      category: newMomentCategory,
      defaultMealType: newMomentCategory === 'meal' ? newMomentDefaultMeal : undefined,
      notifyTime: newMomentNotifyTime || undefined,
      notifyEnabled: Boolean(newMomentNotifyTime),
    };
    const nextList = [...effectiveMoments, newMoment];
    handleUpdateCustomMoments(nextList);
    setNewMomentLabel('');
    setNewMomentNotifyTime('');
    handleSelectManualMoment(newMoment);
    triggerToast(
      'Momento Criado!',
      `"${newMoment.label}"${
        newMoment.notifyTime ? ` (Notificação às ${newMoment.notifyTime})` : ''
      } salvo nos seus momentos.`
    );
  };

  const handleChangeMomentCategory = (momentId: string, nextCat: MomentCategory) => {
    const nextList = effectiveMoments.map((m) =>
      m.id === momentId
        ? {
            ...m,
            category: nextCat,
            defaultMealType: nextCat === 'meal' ? m.defaultMealType || 'almoco' : m.defaultMealType,
          }
        : m
    );
    handleUpdateCustomMoments(nextList);
    if (manualContext === momentId) {
      setManualFlowMode(nextCat === 'meal' ? 'meal' : 'post_meal');
    }
  };

  const handleUpdateMomentNotifyTime = (momentId: string, timeStr: string) => {
    const nextList = effectiveMoments.map((m) =>
      m.id === momentId
        ? {
            ...m,
            notifyTime: timeStr || undefined,
            notifyEnabled: Boolean(timeStr),
          }
        : m
    );
    handleUpdateCustomMoments(nextList);
    if (timeStr) {
      triggerToast('Horário de Notificação Salvo', `Você será notificado às ${timeStr}.`);
    }
  };

  const handleToggleMomentNotify = (momentId: string) => {
    const nextList = effectiveMoments.map((m) =>
      m.id === momentId
        ? {
            ...m,
            notifyEnabled: m.notifyEnabled === false ? true : false,
          }
        : m
    );
    handleUpdateCustomMoments(nextList);
  };

  const handleDeleteMoment = (momentId: string) => {
    if (effectiveMoments.length <= 1) return;
    const nextList = effectiveMoments.filter((m) => m.id !== momentId);
    handleUpdateCustomMoments(nextList);
    if (manualContext === momentId && nextList[0]) {
      handleSelectManualMoment(nextList[0]);
    }
  };

  const handleRestoreDefaultMoments = () => {
    handleUpdateCustomMoments(DEFAULT_GLUCOSE_MOMENTS);
    triggerToast('Momentos Restaurados', 'Os momentos padrão foram restaurados.');
  };

  const handleSelectManualMoment = (moment: CustomGlucoseMoment) => {
    setManualContext(moment.id);
    if (moment.category === 'meal') {
      setManualFlowMode('meal');
      if (moment.defaultMealType) {
        setManualSelectedMealType(moment.defaultMealType);
      } else {
        const lower = moment.label.toLowerCase();
        if (lower.includes('café') || lower.includes('cafe')) setManualSelectedMealType('cafe');
        else if (lower.includes('almoço') || lower.includes('almoco')) setManualSelectedMealType('almoco');
        else if (lower.includes('lanche')) setManualSelectedMealType('lanche');
        else if (lower.includes('jantar')) setManualSelectedMealType('jantar');
        else if (lower.includes('ceia')) setManualSelectedMealType('ceia');
        else setManualSelectedMealType('outro');
      }
    } else {
      setManualFlowMode('post_meal');
    }
  };

  // Redirect directly to the Meals page when user chooses "Sim, cadastrar alimentos"
  const handleRedirectFromModalToMealsPage = () => {
    setManualRegisterMealFoods(true);
    const val = Number(manualBgValue);
    if (!val || val <= 0) {
      triggerToast(
        'Modo Cadastrar Alimentos Selecionado',
        'Digite o valor da sua glicemia (mg/dL) no topo e clique no botão laranja abaixo para ir direto à Página de Refeições!'
      );
      return;
    }

    const parsedDate = manualDateTime ? new Date(manualDateTime) : new Date();
    const finalTimestamp = isNaN(parsedDate.getTime())
      ? new Date().toISOString()
      : parsedDate.toISOString();

    const readingId = `reading_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const resolvedMealTitle =
      manualCustomMealName.trim() || getMealTypeLabel(manualSelectedMealType);

    handleAddReading(
      {
        timestamp: finalTimestamp,
        value: val,
        source: 'manual',
        deviceName: 'Glicosímetro Manual',
        context: manualContext,
        notes: manualNotes || `Refeição: ${resolvedMealTitle}`,
        symptoms: manualSymptoms,
        mealType: manualSelectedMealType,
        mealTitle: resolvedMealTitle,
      },
      readingId
    );

    setPendingMealFromReading({
      readingId,
      bgValue: val,
      mealType: manualSelectedMealType,
      mealTitle: resolvedMealTitle,
      timestamp: finalTimestamp,
      context: manualContext,
      notes: manualNotes,
    });

    setMealType(manualSelectedMealType);
    setMealTitle(resolvedMealTitle);

    // Reset modal inputs and close modal
    setManualBgValue('');
    setManualNotes('');
    setManualSymptoms([]);
    setManualCustomMealName('');
    setManualRegisterMealFoods(false);
    setManualDateTime(toLocalDateTimeInputString());
    setIsManualReadingModalOpen(false);

    // Navigate directly to Meals page (Meu Prato)
    setActivePage('meals');
    setMealsSubTab('plate');

    triggerToast(
      'Medição Salva! Monte sua Refeição',
      `Glicemia de ${val} mg/dL registrada. Escolha uma refeição favorita ou adicione os alimentos abaixo para calcular o Bolus!`
    );
  };

  // Register an insulin application (from the Aplicações page) and optionally link to a reading
  const handleAddDoseFromApplications = (
    doseData: Omit<InsulinDoseRecord, 'id'>,
    linkedReadingId?: string
  ) => {
    const doseId = `dose_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newDose: InsulinDoseRecord = {
      ...doseData,
      id: doseId,
    };

    setDoses((prev) => [newDose, ...prev]);
    if (currentUser) {
      saveDoseToFirestore(currentUser.uid, newDose);
    }

    // Auto-sync with Daily Routine Goals if this is a Basal insulin application
    if (doseData.type === 'basal') {
      const doseDateObj = new Date(doseData.timestamp);
      const doseDateKey = getLocalDateKey(doseDateObj);
      const doseTimeStr = doseDateObj.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      handleUpdateRoutine({
        date: doseDateKey,
        basalTaken: true,
        basalUnits: doseData.units,
        basalTime: doseTimeStr,
      });
    }

    // If linked to a glucose reading, update that reading with the applied insulin info
    if (linkedReadingId) {
      setReadings((prev) =>
        prev.map((r) => {
          if (r.id === linkedReadingId) {
            const updatedReading: GlucoseReading = {
              ...r,
              insulinUnitsApplied: doseData.units,
              insulinTypeApplied: doseData.type,
              insulinNameApplied: doseData.insulinName,
              linkedDoseId: doseId,
            };
            if (currentUser) {
              saveReadingToFirestore(currentUser.uid, updatedReading);
            }
            return updatedReading;
          }
          return r;
        })
      );
    }

    triggerToast(
      'Aplicação Registrada!',
      `Aplicação de ${doseData.units}U (${doseData.insulinName}) salva no histórico.`
    );
  };

  // Delete an insulin application and unlink from any associated reading
  const handleDeleteDose = (doseId: string) => {
    setDoses((prev) => prev.filter((d) => d.id !== doseId));
    if (currentUser) {
      deleteDoseFromFirestore(currentUser.uid, doseId);
    }

    setReadings((prev) =>
      prev.map((r) => {
        if (r.linkedDoseId === doseId) {
          const updatedReading: GlucoseReading = {
            ...r,
            insulinUnitsApplied: undefined,
            insulinTypeApplied: undefined,
            insulinNameApplied: undefined,
            linkedDoseId: undefined,
          };
          if (currentUser) {
            saveReadingToFirestore(currentUser.uid, updatedReading);
          }
          return updatedReading;
        }
        return r;
      })
    );

    triggerToast('Aplicação Removida', 'O registro de aplicação foi excluído.');
  };

  const handleManualReadingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(manualBgValue);
    if (!val || val <= 0) return;

    const parsedDate = manualDateTime ? new Date(manualDateTime) : new Date();
    const finalTimestamp = isNaN(parsedDate.getTime())
      ? new Date().toISOString()
      : parsedDate.toISOString();

    const readingId = `reading_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // CASE 1: É UMA REFEIÇÃO
    if (manualFlowMode === 'meal') {
      // Se o usuário marcou que quer cadastrar os alimentos, redireciona direto para a página de Refeições!
      if (manualRegisterMealFoods) {
        handleRedirectFromModalToMealsPage();
        return;
      }

      const mealId = `meal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const resolvedMealTitle =
        manualCustomMealName.trim() || getMealTypeLabel(manualSelectedMealType);

      const newMealRecord: MealRecord = {
        id: mealId,
        timestamp: finalTimestamp,
        mealType: manualSelectedMealType,
        title: resolvedMealTitle,
        items: [],
        totalCarbs: 0,
        totalProtein: 0,
        totalFat: 0,
        totalCalories: 0,
        linkedReadingId: readingId,
        bgAtMeal: val,
      };

      setMeals((prev) => [newMealRecord, ...prev]);
      if (currentUser) {
        saveMealToFirestore(currentUser.uid, newMealRecord);
      }

      handleAddReading(
        {
          timestamp: finalTimestamp,
          value: val,
          source: 'manual',
          deviceName: 'Glicosímetro Manual',
          context: manualContext,
          notes: manualNotes || `Refeição: ${resolvedMealTitle}`,
          symptoms: manualSymptoms,
          linkedMealId: mealId,
          mealType: manualSelectedMealType,
          mealTitle: resolvedMealTitle,
          mealCarbs: 0,
        },
        readingId
      );

      // Map mealType to Bolus time of day
      const mappedPeriod: 'morning' | 'afternoon' | 'night' =
        manualSelectedMealType === 'cafe'
          ? 'morning'
          : manualSelectedMealType === 'jantar' || manualSelectedMealType === 'ceia'
          ? 'night'
          : 'afternoon';

      setBolusBgInput(String(val));
      setBolusCarbsInput(0);
      setBolusTimeOfDay(mappedPeriod);

      const previewCalc = calculateBolus(0, val, profile, doses, mappedPeriod);
      setDoseUnitsInput(String(previewCalc.roundedBolus));
      setDoseTypeInput('rapid');
      setBolusWillApplyDose(previewCalc.roundedBolus > 0);
      setPendingBolusContext({
        readingId,
        mealId,
        bgValue: val,
        mealTitle: resolvedMealTitle,
        mealCarbs: 0,
        timestamp: finalTimestamp,
        context: manualContext,
      });

      setIsPostMealTimerActive(true);
      setPostMealMinutesLeft(120);

      // Reset modal state
      setManualBgValue('');
      setManualNotes('');
      setManualSymptoms([]);
      setManualCustomMealName('');
      setManualDateTime(toLocalDateTimeInputString());
      setIsManualReadingModalOpen(false);

      // Navigate directly to Bolus Calculator
      setActivePage('bolus');
      triggerToast(
        'Medição e Refeição Salvas!',
        `Direcionado para a Calculadora de Bolus para calcular a correção (${val} mg/dL).`
      );
      return;
    }

    // CASE 2: PÓS-REFEIÇÃO OU MEDIÇÃO AVULSA -> Registra Medição e Aplicação (ou não) + Dose
    const appliedUnits = manualDidApplyInsulin ? parseFloat(manualInsulinUnits) : 0;
    const hasValidDose = manualDidApplyInsulin && appliedUnits > 0;
    const doseId = hasValidDose
      ? `dose_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
      : undefined;
    const insulinName =
      manualInsulinType === 'rapid' ? profile.rapidInsulinName : profile.basalInsulinName;

    handleAddReading(
      {
        timestamp: finalTimestamp,
        value: val,
        source: 'manual',
        deviceName: 'Glicosímetro Manual',
        context: manualContext,
        notes: manualNotes,
        symptoms: manualSymptoms,
        insulinUnitsApplied: hasValidDose ? appliedUnits : undefined,
        insulinTypeApplied: hasValidDose ? manualInsulinType : undefined,
        insulinNameApplied: hasValidDose ? insulinName : undefined,
        linkedDoseId: doseId,
      },
      readingId
    );

    if (hasValidDose && doseId) {
      const newDose: InsulinDoseRecord = {
        id: doseId,
        timestamp: finalTimestamp,
        type: manualInsulinType,
        insulinName,
        units: appliedUnits,
        bgAtTime: val,
        notes:
          manualNotes ||
          `Aplicação registrada após medição (${getGlucoseContextLabel(
            manualContext,
            profile.customMoments
          )})`,
        linkedReadingId: readingId,
        context: manualContext,
      };
      setDoses((prev) => [newDose, ...prev]);
      if (currentUser) {
        saveDoseToFirestore(currentUser.uid, newDose);
      }

      if (manualInsulinType === 'basal') {
        const doseDateObj = new Date(finalTimestamp);
        handleUpdateRoutine({
          date: getLocalDateKey(doseDateObj),
          basalTaken: true,
          basalUnits: appliedUnits,
          basalTime: doseDateObj.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }),
        });
      }

      triggerToast(
        'Medição + Aplicação Salvas!',
        `Glicemia ${val} mg/dL com aplicação de ${appliedUnits}U (${insulinName}) registrada.`
      );
    } else {
      triggerToast(
        'Medição Registrada!',
        `Glicemia de ${val} mg/dL salva (sem aplicação de insulina).`
      );
    }

    setManualBgValue('');
    setManualNotes('');
    setManualSymptoms([]);
    setManualDidApplyInsulin(false);
    setManualInsulinUnits('');
    setManualDateTime(toLocalDateTimeInputString());
    setIsManualReadingModalOpen(false);
  };

  // Plate Management
  const handleAddFoodToPlate = (food: FoodItem) => {
    const existingIndex = currentPlate.findIndex((p) => p.foodId === food.id);
    if (existingIndex >= 0) {
      const updated = [...currentPlate];
      const item = updated[existingIndex];
      const newCount = item.portionCount + 1;
      const totalGrams = newCount * food.gramsPerServing;
      item.portionCount = newCount;
      item.totalGrams = totalGrams;
      item.carbs = Math.round(((food.carbsPer100g * totalGrams) / 100) * 10) / 10;
      item.protein = Math.round(((food.proteinPer100g * totalGrams) / 100) * 10) / 10;
      item.fat = Math.round(((food.fatPer100g * totalGrams) / 100) * 10) / 10;
      item.calories = Math.round((food.caloriesPer100g * totalGrams) / 100);
      setCurrentPlate(updated);
    } else {
      const totalGrams = food.gramsPerServing;
      const newItem: MealPlateItem = {
        id: `plate_${Date.now()}_${Math.random()}`,
        foodId: food.id,
        name: food.name,
        portionCount: 1,
        servingDescription: food.servingDescription,
        totalGrams,
        carbs: Math.round(((food.carbsPer100g * totalGrams) / 100) * 10) / 10,
        protein: Math.round(((food.proteinPer100g * totalGrams) / 100) * 10) / 10,
        fat: Math.round(((food.fatPer100g * totalGrams) / 100) * 10) / 10,
        calories: Math.round((food.caloriesPer100g * totalGrams) / 100),
      };
      setCurrentPlate([...currentPlate, newItem]);
    }
    triggerToast(
      `+ ${food.name} adicionado ao prato`,
      'Continue adicionando outros alimentos ou clique em Ver Meu Prato.'
    );
  };

  const handleUpdatePortion = (itemId: string, newCount: number) => {
    if (newCount <= 0) {
      setCurrentPlate(currentPlate.filter((p) => p.id !== itemId));
      return;
    }
    const updated = currentPlate.map((item) => {
      if (item.id === itemId) {
        const food = OFFICIAL_FOOD_DATABASE.find((f) => f.id === item.foodId);
        const gramsPerServing = food ? food.gramsPerServing : item.totalGrams / item.portionCount;
        const totalGrams = Math.round(newCount * gramsPerServing);
        const carbsPer100 = food ? food.carbsPer100g : (item.carbs / item.totalGrams) * 100;
        const proteinPer100 = food ? food.proteinPer100g : (item.protein / item.totalGrams) * 100;
        const fatPer100 = food ? food.fatPer100g : (item.fat / item.totalGrams) * 100;
        const calPer100 = food ? food.caloriesPer100g : (item.calories / item.totalGrams) * 100;

        return {
          ...item,
          portionCount: newCount,
          totalGrams,
          carbs: Math.round(((carbsPer100 * totalGrams) / 100) * 10) / 10,
          protein: Math.round(((proteinPer100 * totalGrams) / 100) * 10) / 10,
          fat: Math.round(((fatPer100 * totalGrams) / 100) * 10) / 10,
          calories: Math.round((calPer100 * totalGrams) / 100),
        };
      }
      return item;
    });
    setCurrentPlate(updated);
  };

  const plateTotalCarbs =
    Math.round(currentPlate.reduce((acc, curr) => acc + curr.carbs, 0) * 10) / 10;
  const plateTotalProtein =
    Math.round(currentPlate.reduce((acc, curr) => acc + curr.protein, 0) * 10) / 10;
  const plateTotalFat =
    Math.round(currentPlate.reduce((acc, curr) => acc + curr.fat, 0) * 10) / 10;
  const plateTotalCalories = Math.round(
    currentPlate.reduce((acc, curr) => acc + curr.calories, 0)
  );

  // Favorite Meals with Nicknames ("Apelidos") handlers
  const syncFavoritesToProfile = (nextFavorites: FavoriteMeal[]) => {
    setFavorites(nextFavorites);
    const updatedProfile: PatientProfile = {
      ...profile,
      favoriteMeals: nextFavorites,
    };
    setProfile(updatedProfile);
    if (currentUser) {
      saveProfileToFirestore(currentUser.uid, updatedProfile);
    }
  };

  const handleSaveCurrentPlateAsFavorite = (customNickname?: string) => {
    if (currentPlate.length === 0) {
      triggerToast('Prato Vazio', 'Adicione pelo menos 1 alimento ao prato para favoritar.');
      return;
    }
    const nick = (customNickname ?? favoriteNicknameInput).trim() || mealTitle || 'Refeição Favorita';
    const newFav: FavoriteMeal = {
      id: `fav_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: nick,
      nickname: nick,
      mealType,
      items: currentPlate.map((it) => ({ ...it })),
      totalCarbs: plateTotalCarbs,
      totalProtein: plateTotalProtein,
      totalFat: plateTotalFat,
      totalCalories: plateTotalCalories,
    };
    const nextList = [newFav, ...favorites];
    syncFavoritesToProfile(nextList);
    setFavoriteNicknameInput('');
    triggerToast(
      'Refeição Favoritada!',
      `Apelido "${nick}" (${plateTotalCarbs}g CHO) salvo para acesso em 1 clique.`
    );
  };

  const handleSaveHistoricalMealAsFavorite = (meal: MealRecord) => {
    const nick = meal.title || getMealTypeLabel(meal.mealType);
    const newFav: FavoriteMeal = {
      id: `fav_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: nick,
      nickname: nick,
      mealType: meal.mealType,
      items: meal.items.map((it) => ({ ...it })),
      totalCarbs: meal.totalCarbs,
      totalProtein: meal.totalProtein,
      totalFat: meal.totalFat,
      totalCalories: meal.totalCalories,
    };
    const nextList = [newFav, ...favorites];
    syncFavoritesToProfile(nextList);
    triggerToast(
      'Salva nas Favoritas!',
      `"${nick}" (${meal.totalCarbs}g CHO) foi adicionada às suas refeições favoritas.`
    );
  };

  const handleSelectFavoriteToPlate = (fav: FavoriteMeal) => {
    const clonedItems: MealPlateItem[] = fav.items.map((it, idx) => ({
      ...it,
      id: `plate_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
    }));
    setCurrentPlate(clonedItems);
    setMealTitle(fav.nickname || fav.name);
    setMealType(fav.mealType);
    setMealsSubTab('plate');
    triggerToast(
      `Favorita "${fav.nickname || fav.name}" Carregada!`,
      'Você pode alterar as porções (+ / -), remover itens ou adicionar novos alimentos antes de salvar.'
    );
  };

  const handleUpdateFavoriteNickname = (favId: string, nextNickname: string) => {
    const trimmed = nextNickname.trim();
    if (!trimmed) return;
    const nextList = favorites.map((f) =>
      f.id === favId ? { ...f, name: trimmed, nickname: trimmed } : f
    );
    syncFavoritesToProfile(nextList);
    setEditingFavoriteId(null);
    setEditingFavoriteNickname('');
    triggerToast('Apelido Atualizado!', `Refeição favorita renomeada para "${trimmed}".`);
  };

  const handleDeleteFavoriteMeal = (favId: string) => {
    const nextList = favorites.filter((f) => f.id !== favId);
    syncFavoritesToProfile(nextList);
    triggerToast('Favorita Removida', 'A refeição foi removida dos seus favoritos.');
  };

  const handleSaveMealRecord = () => {
    if (currentPlate.length === 0) return;
    const mealId = `meal_${Date.now()}`;
    const effectiveBg = pendingMealFromReading?.bgValue ?? latestReading?.value;
    const effectiveTimestamp = pendingMealFromReading?.timestamp || new Date().toISOString();

    const newMeal: MealRecord = {
      id: mealId,
      timestamp: effectiveTimestamp,
      mealType,
      title: mealTitle || getMealTypeLabel(mealType),
      items: currentPlate,
      totalCarbs: plateTotalCarbs,
      totalProtein: plateTotalProtein,
      totalFat: plateTotalFat,
      totalCalories: plateTotalCalories,
      aiAnalysisNotes: aiNotesForCurrentMeal,
      glycemicImpact: glycemicImpactCurrentMeal,
      bgAtMeal: effectiveBg,
      linkedReadingId: pendingMealFromReading?.readingId,
    };

    setMeals([newMeal, ...meals]);
    if (currentUser) {
      saveMealToFirestore(currentUser.uid, newMeal);
    }

    // If this meal was initiated from a glucose reading, link the meal back to that reading
    if (pendingMealFromReading?.readingId) {
      const targetReadingId = pendingMealFromReading.readingId;
      setReadings((prev) =>
        prev.map((r) => {
          if (r.id === targetReadingId) {
            const updatedReading: GlucoseReading = {
              ...r,
              linkedMealId: mealId,
              mealType,
              mealTitle: newMeal.title,
              mealCarbs: plateTotalCarbs,
              notes: r.notes || `Refeição: ${newMeal.title} (${plateTotalCarbs}g CHO)`,
            };
            if (currentUser) {
              saveReadingToFirestore(currentUser.uid, updatedReading);
            }
            return updatedReading;
          }
          return r;
        })
      );
    }

    setBolusCarbsInput(plateTotalCarbs);
    if (effectiveBg) {
      setBolusBgInput(String(effectiveBg));
    }

    const mappedPeriod: 'morning' | 'afternoon' | 'night' =
      mealType === 'cafe'
        ? 'morning'
        : mealType === 'jantar' || mealType === 'ceia'
        ? 'night'
        : 'afternoon';
    setBolusTimeOfDay(mappedPeriod);

    const previewCalc = calculateBolus(
      plateTotalCarbs,
      effectiveBg,
      profile,
      doses,
      mappedPeriod
    );
    setDoseUnitsInput(String(previewCalc.roundedBolus));
    setBolusWillApplyDose(true);
    setPendingBolusContext({
      readingId: pendingMealFromReading?.readingId,
      mealId,
      bgValue: effectiveBg,
      mealTitle: newMeal.title,
      mealCarbs: plateTotalCarbs,
      timestamp: newMeal.timestamp,
      context: pendingMealFromReading?.context,
    });

    setPendingMealFromReading(null);
    setCurrentPlate([]);
    setIsPostMealTimerActive(true);
    setPostMealMinutesLeft(120);

    if (notificationPrefs.enabled && notificationPrefs.postMealTimer) {
      sendWebNotification('🍽️ Refeição Registrada!', {
        body: `Você registrou ${plateTotalCarbs}g CHO. Um lembrete será enviado em 2 horas para medir a glicose.`,
      });
    }
    triggerToast(
      'Refeição Salva com Sucesso',
      `Redirecionado para a Calculadora de Bolus para calcular a correção e dose!`
    );

    setActiveTab('bolus');
  };

  const handleLogInsulinDose = () => {
    if (!bolusWillApplyDose) {
      setPendingBolusContext(null);
      triggerToast(
        'Registro Concluído',
        'Medição e refeição mantidas salvas (sem aplicação de insulina neste momento).'
      );
      setActivePage('glucose');
      return;
    }

    const units = Number(doseUnitsInput);
    if (!units || units <= 0) return;

    const doseId = `dose_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const insulinName =
      doseTypeInput === 'rapid' ? profile.rapidInsulinName : profile.basalInsulinName;
    const effectiveBg =
      Number(bolusBgInput) > 0
        ? Number(bolusBgInput)
        : pendingBolusContext?.bgValue ?? latestReading?.value;
    const effectiveTimestamp = pendingBolusContext?.timestamp || new Date().toISOString();

    const newDose: InsulinDoseRecord = {
      id: doseId,
      timestamp: effectiveTimestamp,
      type: doseTypeInput,
      insulinName,
      units,
      foodBolusUnits: bolusResult.foodBolus,
      correctionBolusUnits: bolusResult.netCorrectionBolus,
      iobDeductedUnits: bolusResult.iob,
      notes:
        doseNotesInput ||
        (pendingBolusContext?.mealTitle
          ? `Bolus / Correção: ${pendingBolusContext.mealTitle}${
              bolusCarbsInput > 0 ? ` (${bolusCarbsInput}g CHO)` : ''
            }`
          : 'Calculado na Calculadora de Bolus'),
      bgAtTime: effectiveBg,
      carbsCovered: doseTypeInput === 'rapid' ? bolusCarbsInput : undefined,
      linkedReadingId: pendingBolusContext?.readingId,
      linkedMealId: pendingBolusContext?.mealId,
      context: pendingBolusContext?.context,
    };

    setDoses((prev) => [newDose, ...prev]);
    if (currentUser) {
      saveDoseToFirestore(currentUser.uid, newDose);
    }

    // Link back to reading if originated from a measurement
    if (pendingBolusContext?.readingId) {
      const targetReadingId = pendingBolusContext.readingId;
      setReadings((prev) =>
        prev.map((r) => {
          if (r.id === targetReadingId) {
            const updatedReading: GlucoseReading = {
              ...r,
              insulinUnitsApplied: units,
              insulinTypeApplied: doseTypeInput,
              insulinNameApplied: insulinName,
              linkedDoseId: doseId,
            };
            if (currentUser) {
              saveReadingToFirestore(currentUser.uid, updatedReading);
            }
            return updatedReading;
          }
          return r;
        })
      );
    }

    // Link back to meal if originated from a meal
    if (pendingBolusContext?.mealId) {
      const targetMealId = pendingBolusContext.mealId;
      setMeals((prev) =>
        prev.map((m) => {
          if (m.id === targetMealId) {
            const updatedMeal: MealRecord = {
              ...m,
              linkedDoseId: doseId,
              insulinUnitsApplied: units,
            };
            if (currentUser) {
              saveMealToFirestore(currentUser.uid, updatedMeal);
            }
            return updatedMeal;
          }
          return m;
        })
      );
    }

    if (doseTypeInput === 'basal') {
      const doseDateObj = new Date(effectiveTimestamp);
      handleUpdateRoutine({
        date: getLocalDateKey(doseDateObj),
        basalTaken: true,
        basalUnits: units,
        basalTime: doseDateObj.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
      });
    }

    setDoseNotesInput('');
    setPendingBolusContext(null);
    setMonitoringDate(getLocalDateKey(new Date(effectiveTimestamp)));
    setActivePage('glucose');

    triggerToast(
      'Aplicação de Bolus Salva!',
      `Dose de ${units}U (${insulinName}) registrada e vinculada no Monitoramento Diário.`
    );
  };

  const filteredFoods = OFFICIAL_FOOD_DATABASE.filter((food) => {
    const matchesSearch =
      food.name.toLowerCase().includes(foodSearchQuery.toLowerCase()) ||
      (food.barcode && food.barcode.includes(foodSearchQuery));
    const matchesCategory = selectedCategory === 'Todas' || food.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Dynamic Bolus calculation
  const bolusBg = Number(bolusBgInput) > 0 ? Number(bolusBgInput) : latestReading?.value;
  const bolusResult = calculateBolus(
    bolusCarbsInput,
    bolusBg,
    profile,
    doses,
    bolusTimeOfDay
  );

  // Recent 6 readings for the Lollipop Stem Chart ("Minhas Medições")
  const stemReadings = [...sortedReadings].slice(0, 6).reverse();
  const safeSelectedStem = Math.min(selectedStemIdx, Math.max(0, stemReadings.length - 1));

  // Daily routine completion calculation (based on active user-selected goals, without foot check)
  const activeGoalChecks: boolean[] = [];
  if (enabledRoutineGoals.fasting) activeGoalChecks.push(Boolean(latestReading));
  if (enabledRoutineGoals.basal) activeGoalChecks.push(routineLog.basalTaken);
  if (enabledRoutineGoals.water) activeGoalChecks.push(routineLog.waterMl >= routineLog.waterGoalMl);
  if (enabledRoutineGoals.exercise) activeGoalChecks.push(routineLog.exerciseMinutes > 0);
  if (enabledRoutineGoals.bedtime) activeGoalChecks.push(routineLog.bedtimeCheckDone);

  const routineGoalsDone = activeGoalChecks.filter(Boolean).length;
  const routinePct =
    activeGoalChecks.length > 0
      ? Math.round((routineGoalsDone / activeGoalChecks.length) * 100)
      : 0;

  if (isAuthLoading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-200 ${
          isDark ? 'dark bg-[#0E0E11] text-[#F4F4F6]' : 'bg-[#EBEBEC] text-[#111111]'
        }`}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#161619] border border-neutral-200 dark:border-neutral-800 flex items-center justify-center p-2 shadow-lg shadow-orange-500/10 animate-pulse">
            <img
              src="./logo.png"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = './assets/aistudio/image_573043af.png';
              }}
              alt="Minha Glico Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="space-y-1">
            <h2 className="font-extrabold text-base tracking-tight">Minha Glico</h2>
            <p className="text-xs text-neutral-400">Carregando seus registros com segurança...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser && !isGuest) {
    return (
      <AuthScreen
        onAuthSuccess={(newProfile) => {
          setIsGuest(false);
          localStorage.removeItem('mg_is_guest');
          setIsAuthModalOpen(false);
          if (newProfile) {
            setProfile((prev) => ({ ...prev, ...newProfile }));
          }
        }}
        onContinueAsGuest={() => {
          setIsGuest(true);
          localStorage.setItem('mg_is_guest', 'true');
          setIsAuthModalOpen(false);
          triggerToast(
            'Modo Demonstração',
            'Você está navegando como visitante. Cadastre sua conta a qualquer momento para salvar seus dados na nuvem.'
          );
        }}
      />
    );
  }

  return (
    <div
      className={`min-h-screen max-w-full overflow-x-hidden w-full font-sans flex flex-col antialiased transition-colors duration-200 ${
        isDark ? 'dark bg-[#0E0E11] text-[#F4F4F6]' : 'bg-[#EBEBEC] text-[#111111]'
      }`}
    >
      {/* Top Header - Minimalist Bento Header */}
      <header className="sticky top-0 z-30 bg-[#EBEBEC]/90 dark:bg-[#0E0E11]/90 backdrop-blur-md w-full max-w-full overflow-hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-2">
          {/* Brand Wordmark & Menu Trigger */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="w-9 h-9 rounded-full bg-white dark:bg-[#161619] text-[#111111] dark:text-white flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              title="Abrir Menu Lateral"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div
              className="flex items-center gap-2.5 cursor-pointer select-none"
              onClick={() => setActivePage('today')}
            >
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#161619] border border-neutral-200/80 dark:border-neutral-800 flex items-center justify-center p-1.5 shadow-xs hover:scale-105 transition-transform shrink-0">
                <img
                  src="./logo.png"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = './assets/aistudio/image_573043af.png';
                  }}
                  alt="Minha Glico Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-bold text-base sm:text-lg tracking-tight text-[#111111] dark:text-white whitespace-nowrap hidden xs:inline">
                Minha Glico
              </span>
            </div>
          </div>

          {/* Desktop Navigation Pills */}
          <nav className="hidden lg:flex items-center gap-1 bg-white dark:bg-[#161619] p-1.5 rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            {[
              { id: 'today', label: 'Hoje' },
              { id: 'glucose', label: 'Glicemia' },
              { id: 'applications', label: 'Aplicações' },
              { id: 'meals', label: 'Refeições' },
              { id: 'routine', label: 'Rotina' },
              { id: 'reports', label: 'Relatórios' },
              { id: 'bolus', label: 'Bolus' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'glucose') {
                    setMonitoringDate(getLocalDateKey());
                  }
                  setActivePage(tab.id as AppPageId);
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition whitespace-nowrap ${
                  activePage === tab.id
                    ? 'bg-[#111111] dark:bg-[#FF5A36] text-white'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Latest Glucose Pill */}
            {latestReading && (
              <button
                onClick={() => setIsManualReadingModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#161619] text-xs font-bold shadow-[0_2px_10px_rgba(0,0,0,0.03)] transition hover:scale-[1.02] shrink-0"
                title="Registrar medição"
              >
                <span className="text-[#FF5A36] font-extrabold">●</span>
                <span className="font-mono font-extrabold text-[#111111] dark:text-white tabular-nums">
                  {latestReading.value}
                </span>
                <span className="text-[10px] text-neutral-400 hidden xs:inline">mg/dL</span>
              </button>
            )}

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              className="w-9 h-9 rounded-full bg-white dark:bg-[#161619] text-[#111111] dark:text-white flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              title={isDark ? 'Modo Claro' : 'Modo Escuro'}
            >
              {isDark ? <Sun className="w-4 h-4 text-[#FF5A36]" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Account Profile / Register Gateway */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="w-9 h-9 rounded-full bg-white dark:bg-[#161619] text-[#111111] dark:text-white flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:ring-2 hover:ring-[#FF5A36] transition relative"
                  title={currentUser.email || 'Minha Conta'}
                >
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'Usuário'}
                      referrerPolicy="no-referrer"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="font-extrabold text-xs text-[#FF5A36]">
                      {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                    </span>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#161619]" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#161619] shadow-2xl border border-neutral-200 dark:border-neutral-800 p-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800 mb-1">
                      <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                        {currentUser.displayName || profile.name}
                      </p>
                      <p className="text-[10px] text-neutral-400 truncate">{currentUser.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsAuthModalOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#FF5A36]" />
                      <span>Cadastrar Nova Conta</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sair da Conta</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-3 py-1.5 rounded-full bg-white dark:bg-[#161619] text-[#FF5A36] text-xs font-bold shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-[#FF5A36]/30 hover:bg-[#FF5A36]/10 transition flex items-center gap-1.5 shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Cadastrar / Entrar</span>
              </button>
            )}

            {/* Primary CTA: + Medir */}
            <button
              onClick={() => setIsManualReadingModalOpen(true)}
              className="px-4 py-2 bg-[#FF5A36] hover:bg-[#e84c29] text-white text-xs font-bold rounded-full flex items-center gap-1.5 shadow-xs transition whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Medir</span>
            </button>
          </div>
        </div>
      </header>

      {/* In-App Toast Alert with App Logo Icon */}
      {inAppToast && (
        <div className="fixed top-16 right-4 z-50 max-w-sm w-full bg-[#111111] text-white p-4 rounded-3xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200 flex items-start gap-3 border border-white/10">
          <div className="w-10 h-10 bg-white rounded-2xl p-1.5 flex items-center justify-center shrink-0 shadow-sm">
            <img
              src={getAppLogoUrl()}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = './assets/aistudio/image_573043af.png';
              }}
              alt="Minha Glico"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex-1 text-xs">
            <h5 className="font-bold text-white">{inAppToast.title}</h5>
            <p className="text-neutral-300 mt-0.5 leading-snug">{inAppToast.body}</p>
          </div>
        </div>
      )}

      {/* Emergency Hypo Banner */}
      {isHypo && (
        <div className="bg-red-600 text-white px-4 py-2.5 shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-yellow-300" />
              <span className="font-extrabold">
                {isSevereHypo ? 'HIPO SEVERA' : 'HIPOGLICEMIA'} ({latestReading.value} mg/dL):
              </span>
              <span className="hidden sm:inline">Ingerir 15g de carboidrato simples agora.</span>
            </div>
            <button
              onClick={() => setIsHypoModalOpen(true)}
              className="px-3 py-1 bg-white text-red-700 font-extrabold text-[11px] rounded-full shadow-2xs hover:bg-red-50"
            >
              Regra dos 15
            </button>
          </div>
        </div>
      )}

      {/* Active Post-Meal 2h Timer Banner */}
      {isPostMealTimerActive && postMealMinutesLeft > 0 && (
        <div className="bg-white dark:bg-[#161619] border-b border-neutral-200 dark:border-neutral-800 px-4 py-2 text-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px]">
              <Clock className="w-3.5 h-3.5 text-[#FF5A36]" />
              <span>
                Lembrete Pós-Refeição: faltam <strong>{postMealMinutesLeft} min</strong> para medir.
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleTestNotification('post_prandial')}
                className="text-[11px] text-[#FF5A36] font-bold hover:underline"
              >
                Testar Alerta
              </button>
              <button
                onClick={() => setIsPostMealTimerActive(false)}
                className="text-[11px] text-neutral-500 hover:underline"
              >
                Dispensar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 pb-28">
        <AnimatePresence mode="wait">
          {/* ============================================================== */}
          {/* TAB 1: PAINEL BENTO (ESTILO DE DESIGN DA IMAGEM ENVIADA)       */}
          {/* ============================================================== */}
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="space-y-4"
            >
              {/* HEADER DO DIA: Saudação & Resumo das Metas Diárias */}
              <div className="bg-white dark:bg-[#161619] rounded-[28px] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-[#FF5A36]/15 text-[#FF5A36]">
                      Hoje
                    </span>
                    <h2 className="font-extrabold text-base sm:text-lg text-[#111111] dark:text-white tracking-tight">
                      Olá, {profile.name} 👋
                    </h2>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {routineLog.basalTaken && routineLog.waterMl >= routineLog.waterGoalMl
                      ? 'Ótimo controle hoje! Mantenha a hidratação e a contagem de carboidratos.'
                      : 'Acompanhe seus objetivos diários para manter a glicemia estável.'}
                  </p>
                </div>

                {/* Resumo Rápido das Metas com Atalho para a Rotina */}
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <div
                    onClick={() => setActivePage('routine')}
                    className="flex items-center gap-3.5 bg-[#F6F6F7] dark:bg-[#222226] p-3 sm:px-4 rounded-2xl cursor-pointer hover:ring-1 hover:ring-[#FF5A36]/40 transition shrink-0"
                  >
                    <div className="w-10 h-10 rounded-full border-3 border-[#FF5A36] flex items-center justify-center font-mono font-extrabold text-xs text-[#111111] dark:text-white">
                      {routinePct}%
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#111111] dark:text-white block">
                        Rotina Diária
                      </span>
                      <span className="text-[11px] text-[#FF5A36] font-semibold flex items-center gap-1">
                        Ver Metas de Hoje →
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* BENTO ROW 1: 4 Signature Cards (Profile Orbit, Lollipop Stem Chart, Quick Deal, Employees/Rotation + Search) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-stretch">
                {/* CARD 1: Meu Perfil (Orbit Ring Widget - lg:col-span-3) */}
                <div className="lg:col-span-3 bg-white dark:bg-[#161619] rounded-[28px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[15px] text-[#111111] dark:text-white tracking-tight">
                      Meu Perfil
                    </h3>
                    <button
                      onClick={() => {
                        setActiveTab('reports');
                        setReportsSubTab('profile');
                      }}
                      className="text-neutral-400 hover:text-[#111111] dark:hover:text-white p-1 rounded-full"
                      title="Configurações do Perfil"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Concentric Orbit Ring Illustration with 3 Floating Jet-Black Action Circles */}
                  <div className="relative w-44 h-44 mx-auto my-2 flex items-center justify-center">
                    {/* Outer subtle ring */}
                    <div className="absolute inset-1 rounded-full border border-neutral-100 dark:border-neutral-800/80" />
                    {/* Middle subtle ring */}
                    <div className="absolute inset-6 rounded-full border border-neutral-100 dark:border-neutral-800" />
                    {/* Inner ring */}
                    <div className="absolute inset-11 rounded-full border border-neutral-200/60 dark:border-neutral-700/60" />

                    {/* Top Orbit Button: Bluetooth / Sensor */}
                    <button
                      onClick={() => setIsBluetoothModalOpen(true)}
                      className="absolute top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#111111] dark:bg-white text-white dark:text-[#111111] flex items-center justify-center shadow-md hover:scale-110 transition"
                      title="Conectar Sensor Bluetooth / NFC"
                    >
                      <Zap className="w-3.5 h-3.5" />
                    </button>

                    {/* Right Orbit Button: AI Meal Scanner */}
                    <button
                      onClick={() => setIsAiModalOpen(true)}
                      className="absolute right-2 top-1/2 translate-y-1 w-8 h-8 rounded-full bg-[#111111] dark:bg-white text-white dark:text-[#111111] flex items-center justify-center shadow-md hover:scale-110 transition"
                      title="Analisar Prato com IA"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>

                    {/* Bottom-Left Orbit Button: Edit Profile / Log */}
                    <button
                      onClick={() => setIsManualReadingModalOpen(true)}
                      className="absolute bottom-3 left-4 w-8 h-8 rounded-full bg-[#111111] dark:bg-white text-white dark:text-[#111111] flex items-center justify-center shadow-md hover:scale-110 transition"
                      title="Nova Medição Manual"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {/* Center Avatar */}
                    <div
                      onClick={() => {
                        setActiveTab('reports');
                        setReportsSubTab('profile');
                      }}
                      className="w-14 h-14 rounded-full bg-[#38BDF8]/20 border-2 border-white dark:border-neutral-800 shadow-md flex items-center justify-center overflow-hidden cursor-pointer"
                    >
                      {currentUser?.photoURL ? (
                        <img
                          src={currentUser.photoURL}
                          alt={profile.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-b from-[#38BDF8] to-[#0284C7] text-white flex items-center justify-center font-extrabold text-lg">
                          {profile.name ? profile.name[0].toUpperCase() : 'P'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-xs font-bold text-[#111111] dark:text-white truncate">
                      {currentUser?.displayName || profile.name}
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      Meta {profile.targetBg} mg/dL · ISF {profile.isf}
                    </p>
                  </div>
                </div>

                {/* CARD 2: Minhas Medições (Lollipop Stem Chart - lg:col-span-4) */}
                <div className="lg:col-span-4 bg-white dark:bg-[#161619] rounded-[28px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[15px] text-[#111111] dark:text-white tracking-tight">
                      Minhas Medições
                    </h3>
                    <button
                      onClick={() => setActiveTab('glucose')}
                      className="px-3 py-1 rounded-full bg-[#F6F6F7] dark:bg-[#222226] text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1 hover:bg-neutral-200 transition"
                    >
                      <span>Recentes</span>
                      <span className="text-[9px]">⌄</span>
                    </button>
                  </div>

                  {/* Vertical Stem / Lollipop Chart with Coral Callout Bubble */}
                  {stemReadings.length === 0 ? (
                    <div className="h-40 flex flex-col items-center justify-center text-center gap-2 px-4">
                      <p className="text-xs text-neutral-400">
                        Nenhuma medição registrada ainda.
                      </p>
                      <button
                        onClick={() => setIsManualReadingModalOpen(true)}
                        className="px-3.5 py-1.5 rounded-full bg-[#FF5A36] text-white text-[11px] font-bold hover:bg-[#e84c29] transition"
                      >
                        + Registrar 1ª Medição
                      </button>
                    </div>
                  ) : (
                    <div className="relative h-40 pt-8 pb-2 px-2 flex items-end justify-between gap-2">
                      {stemReadings.map((r, idx) => {
                        const heightPct = Math.max(25, Math.min(95, Math.round(((r.value - 50) / 220) * 100)));
                        const isSelected = idx === safeSelectedStem;
                        const labelText = getGlucoseContextLabel(r.context, profile.customMoments).split(' ')[0];
                        return (
                          <div
                            key={r.id}
                            onClick={() => setSelectedStemIdx(idx)}
                            className="flex-1 flex flex-col items-center justify-end h-full cursor-pointer group relative"
                          >
                            {/* Floating Coral-Orange Callout Pill on Selected Stem */}
                            {isSelected && (
                              <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-10 bg-[#FF5A36] text-white text-[11px] font-mono font-bold px-2.5 py-1 rounded-full shadow-md whitespace-nowrap">
                                {r.value} mg/dL
                              </div>
                            )}

                            {/* Stem Line */}
                            <div
                              style={{ height: `${heightPct}%` }}
                              className={`w-[2px] relative flex flex-col items-center justify-between transition-all duration-200 ${
                                isSelected
                                  ? 'bg-[#FF5A36]'
                                  : 'bg-[#111111] dark:bg-neutral-400 group-hover:bg-[#FF5A36]'
                              }`}
                            >
                              {/* Top Dot */}
                              <span
                                className={`w-2.5 h-2.5 rounded-full -mt-1 ${
                                  isSelected
                                    ? 'bg-[#FF5A36] ring-4 ring-[#FF5A36]/20'
                                    : 'bg-[#111111] dark:bg-white'
                                }`}
                              />
                              {/* Mid Dot */}
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isSelected ? 'bg-[#FF5A36]' : 'bg-[#111111] dark:bg-neutral-300'
                                }`}
                              />
                            </div>

                            {/* Bottom Moment / Time Label */}
                            <span
                              className={`text-[10px] mt-2 font-medium truncate max-w-[48px] ${
                                isSelected
                                  ? 'text-[#111111] dark:text-white font-bold'
                                  : 'text-neutral-400'
                              }`}
                            >
                              {labelText}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* CARD 3: Ação Rápida (Quick Deal Style - lg:col-span-2) */}
                <div className="lg:col-span-2 bg-white dark:bg-[#161619] rounded-[28px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[15px] text-[#111111] dark:text-white tracking-tight">
                      Resumo Ativo
                    </h3>
                    <MoreVertical className="w-4 h-4 text-neutral-400" />
                  </div>

                  {/* Two Coral-Outlined Pill Rows */}
                  <div className="space-y-2 my-auto">
                    <div
                      onClick={() => {
                        setActivePage('bolus');
                      }}
                      className="p-2 rounded-full border border-[#E6C7BE] dark:border-neutral-700 flex items-center gap-2.5 cursor-pointer hover:border-[#FF5A36] transition"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#F6F6F7] dark:bg-[#222226] flex items-center justify-center text-[#111111] dark:text-white shrink-0">
                        <Syringe className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 leading-tight">
                        <span className="text-[10px] font-bold text-neutral-500 block">IOB ATIVA</span>
                        <span className="font-mono text-xs font-extrabold text-[#111111] dark:text-white tabular-nums">
                          <span className="text-[#FF5A36] mr-0.5">U</span>
                          {totalIOB}
                        </span>
                      </div>
                    </div>

                    <div
                      onClick={() => {
                        setActiveTab('meals');
                        setMealsSubTab('plate');
                      }}
                      className="p-2 rounded-full border border-[#E6C7BE] dark:border-neutral-700 flex items-center gap-2.5 cursor-pointer hover:border-[#FF5A36] transition"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#F6F6F7] dark:bg-[#222226] flex items-center justify-center text-[#111111] dark:text-white shrink-0">
                        <Utensils className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 leading-tight">
                        <span className="text-[10px] font-bold text-neutral-500 block">CARBOIDRATOS</span>
                        <span className="font-mono text-xs font-extrabold text-[#111111] dark:text-white tabular-nums">
                          <span className="text-[#FF5A36] mr-0.5">g</span>
                          {plateTotalCarbs}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dual Pill Buttons at Bottom */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => {
                        setActiveTab('meals');
                        setMealsSubTab('plate');
                      }}
                      className="py-2 px-2 rounded-full bg-[#F4F4F5] dark:bg-[#222226] text-[#111111] dark:text-white text-[11px] font-bold hover:bg-neutral-200 transition truncate"
                    >
                      Prato
                    </button>
                    <button
                      onClick={() => {
                        setActivePage('bolus');
                      }}
                      className="py-2 px-2 rounded-full bg-[#FF5A36] hover:bg-[#e84c29] text-white text-[11px] font-bold transition truncate"
                    >
                      Bolus
                    </button>
                  </div>
                </div>

                {/* CARD 4: Minhas Aplicações + Quick Search Pill Below (lg:col-span-3) */}
                <div className="lg:col-span-3 flex flex-col justify-between gap-3">
                  <div className="bg-white dark:bg-[#161619] rounded-[28px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex-1 flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-[15px] text-[#111111] dark:text-white tracking-tight">
                        Minhas Aplicações
                      </h3>
                      <button
                        onClick={() => setActivePage('applications')}
                        className="text-neutral-400 hover:text-[#FF5A36] transition"
                        title="Ver Registro de Aplicações"
                      >
                        <Syringe className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Badge + Today's Applications Summary */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#FF5A36]/15 border border-[#FF5A36] text-[#FF5A36] flex items-center justify-center font-bold text-xs shrink-0">
                          <Syringe className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-[#111111] dark:text-white block truncate">
                            {doses.filter((d) => getLocalDateKey(new Date(d.timestamp)) === getLocalDateKey(new Date())).length} aplicações hoje
                          </span>
                          <span className="text-[10px] text-neutral-400 block truncate">
                            {doses[0] ? `Última: ${doses[0].units}U (${doses[0].insulinName})` : 'Nenhuma dose registrada'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Monospace Clinical Line */}
                    <div className="flex items-center justify-between text-[11px] font-mono tracking-wider pt-1">
                      <span className="text-[#FF5A36] font-extrabold">INSULINA</span>
                      <span className="text-neutral-600 dark:text-neutral-300 font-semibold truncate">
                        {profile.rapidInsulinName.toUpperCase()} · {profile.basalInsulinName.toUpperCase()}
                      </span>
                    </div>

                    {/* Full-width Coral Pill CTA */}
                    <button
                      onClick={() => setActivePage('applications')}
                      className="w-full py-2.5 rounded-full bg-[#FF5A36] hover:bg-[#e84c29] text-white text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Registrar Aplicação</span>
                    </button>
                  </div>

                  {/* Standalone Pill Search Bar (like "Quick Search..." in reference) */}
                  <div
                    onClick={() => {
                      setActiveTab('meals');
                      setMealsSubTab('search');
                    }}
                    className="bg-white dark:bg-[#161619] rounded-full px-4 py-3 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex items-center justify-between cursor-pointer hover:ring-1 hover:ring-[#FF5A36]/40 transition"
                  >
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <Search className="w-3.5 h-3.5 text-[#FF5A36]" />
                      <span>Buscar alimento TACO...</span>
                    </div>
                    <Settings className="w-4 h-4 text-[#111111] dark:text-neutral-300" />
                  </div>
                </div>
              </div>

              {/* BENTO ROW 2: Tempo no Alvo (My Businesses), Solid Coral + Solid Black Action Tiles, and 2 Waveform Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-stretch">
                {/* CARD 5: Tempo no Alvo (TIR) - lg:col-span-4 */}
                <div className="lg:col-span-4 bg-white dark:bg-[#161619] rounded-[28px] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[15px] text-[#111111] dark:text-white tracking-tight">
                      Tempo no Alvo (TIR)
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setIsManualReadingModalOpen(true)}
                        className="w-9 h-9 rounded-full bg-[#FF5A36] text-white flex items-center justify-center hover:bg-[#e84c29] transition"
                        title="Registrar Medição"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setActiveTab('glucose')}
                        className="w-9 h-9 rounded-full bg-[#111111] dark:bg-white text-white dark:text-[#111111] flex items-center justify-center hover:opacity-90 transition"
                        title="Ver Histórico"
                      >
                        <Activity className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Metric + Segmented Coral Progress Bar */}
                  <div className="space-y-2.5 my-auto">
                    <div className="flex items-baseline justify-between">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs text-neutral-400">Alvo:</span>
                        <span className="text-[#FF5A36] font-extrabold text-lg">%</span>
                        <span className="font-mono text-2xl sm:text-3xl font-extrabold text-[#111111] dark:text-white tabular-nums">
                          {tirStats.inRangePercent}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-[#FF5A36] tabular-nums">
                        HbA1c {tirStats.estimatedHbA1c}%
                      </span>
                    </div>

                    {/* 3-Segment Rounded Pill Bar (Coral / Medium Coral / Soft Peach) */}
                    <div className="h-3.5 w-full rounded-full bg-[#FADCD4] dark:bg-neutral-800 flex overflow-hidden gap-0.5">
                      <div
                        style={{ width: `${Math.max(12, tirStats.inRangePercent)}%` }}
                        className="bg-[#FF5A36] rounded-full transition-all duration-300"
                        title={`No Alvo: ${tirStats.inRangePercent}%`}
                      />
                      <div
                        style={{ width: `${Math.max(8, tirStats.highPercent + tirStats.veryHighPercent)}%` }}
                        className="bg-[#FF947B] rounded-full transition-all duration-300"
                        title={`Acima do Alvo: ${tirStats.highPercent}%`}
                      />
                      <div
                        style={{ width: `${Math.max(5, tirStats.lowPercent + tirStats.veryLowPercent)}%` }}
                        className="bg-[#F5C2B4] dark:bg-neutral-700 rounded-full transition-all duration-300"
                        title={`Hipo: ${tirStats.lowPercent}%`}
                      />
                    </div>
                  </div>

                  {/* Bottom Info Row */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#F6F6F7] dark:bg-[#222226] flex items-center justify-center font-bold text-xs">
                        <Activity className="w-4 h-4 text-[#111111] dark:text-white" />
                      </div>
                      <span className="text-xs font-bold text-[#111111] dark:text-white">
                        Padrão ADA
                      </span>
                    </div>
                    <div className="text-xs">
                      <span className="text-neutral-400 mr-1">Média:</span>
                      <span className="text-[#FF5A36] font-bold mr-0.5">mg/dL</span>
                      <span className="font-mono font-extrabold text-[#111111] dark:text-white tabular-nums">
                        {tirStats.meanGlucose}
                      </span>
                    </div>
                  </div>
                </div>

                {/* CENTER STACKED SOLID ACTION TILES (+ Nova Medição in Coral-Orange & Relatório.pdf in Jet-Black) - lg:col-span-3 */}
                <div className="lg:col-span-3 grid grid-rows-2 gap-4">
                  {/* Solid Coral-Orange Action Block */}
                  <button
                    onClick={() => setIsManualReadingModalOpen(true)}
                    className="bg-[#FF5A36] hover:bg-[#e84c29] text-white rounded-[28px] p-5 flex flex-col items-center justify-center gap-1.5 shadow-[0_8px_24px_rgba(255,90,54,0.25)] transition active:scale-[0.99] cursor-pointer"
                  >
                    <Plus className="w-6 h-6 stroke-[2.5]" />
                    <span className="text-xs font-semibold tracking-tight">
                      Nova medição manual
                    </span>
                  </button>

                  {/* Solid Jet-Black Action Block */}
                  <button
                    onClick={() => setIsReportModalOpen(true)}
                    className="bg-[#111111] hover:bg-neutral-800 dark:bg-[#1E1E22] dark:hover:bg-neutral-700 text-white rounded-[28px] p-5 flex flex-col items-center justify-center gap-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition active:scale-[0.99] cursor-pointer"
                  >
                    <Download className="w-5 h-5" />
                    <span className="text-xs font-semibold tracking-tight">
                      Relatório.pdf
                    </span>
                  </button>
                </div>

                {/* CARD 6: Glicemia Média (Waveform Card 1 - lg:col-span-2.5 -> lg:col-span-3) */}
                <div className="lg:col-span-3 bg-white dark:bg-[#161619] rounded-[28px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[15px] text-[#111111] dark:text-white tracking-tight">
                      Média Glicêmica
                    </h3>
                    <div className="w-8 h-8 rounded-full bg-[#F6F6F7] dark:bg-[#222226] flex items-center justify-center text-[#FF5A36]">
                      <Percent className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Coral Oscillation Waveform SVG */}
                  <div className="my-3">
                    <svg viewBox="0 0 200 70" className="w-full h-16 overflow-visible">
                      {[
                        18, 32, 45, 25, 38, 54, 42, 22, 30, 48, 60, 44, 28, 16, 35, 52, 62, 45,
                        26, 38, 55, 42, 20, 32, 48, 36, 22, 40,
                      ].map((h, i) => {
                        const x = 6 + i * 6.8;
                        const y1 = 35 - h / 2;
                        const y2 = 35 + h / 2;
                        return (
                          <line
                            key={i}
                            x1={x}
                            y1={y1}
                            x2={x}
                            y2={y2}
                            stroke="#D97F6C"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        );
                      })}
                    </svg>
                  </div>

                  {/* Bottom Metric Pill */}
                  <div className="bg-[#F6F6F7] dark:bg-[#222226] rounded-full py-2.5 px-4 flex items-center justify-center gap-1.5">
                    <span className="text-[10px] text-[#111111] dark:text-white">▲</span>
                    <span className="text-[#FF5A36] font-bold text-sm">mg/dL</span>
                    <span className="font-mono text-lg font-extrabold text-[#111111] dark:text-white tabular-nums">
                      {tirStats.meanGlucose}
                    </span>
                  </div>
                </div>

                {/* CARD 7: Variabilidade CV% (Waveform Card 2 - lg:col-span-2) */}
                <div className="lg:col-span-2 bg-white dark:bg-[#161619] rounded-[28px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[15px] text-[#111111] dark:text-white tracking-tight">
                      Variabilidade
                    </h3>
                    <div className="w-8 h-8 rounded-full bg-[#F6F6F7] dark:bg-[#222226] flex items-center justify-center text-[#FF5A36]">
                      <Percent className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Silver/Gray Oscillation Waveform SVG */}
                  <div className="my-3">
                    <svg viewBox="0 0 160 70" className="w-full h-16 overflow-visible">
                      {[
                        24, 40, 20, 35, 50, 30, 18, 42, 58, 34, 22, 46, 30, 16, 38, 52, 28, 40,
                        22, 34, 45, 26,
                      ].map((h, i) => {
                        const x = 6 + i * 7;
                        const y1 = 35 - h / 2;
                        const y2 = 35 + h / 2;
                        return (
                          <line
                            key={i}
                            x1={x}
                            y1={y1}
                            x2={x}
                            y2={y2}
                            stroke={isDark ? '#52525B' : '#DCDCE0'}
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        );
                      })}
                    </svg>
                  </div>

                  {/* Bottom Metric Pill */}
                  <div className="bg-[#F6F6F7] dark:bg-[#222226] rounded-full py-2.5 px-3 flex items-center justify-center gap-1">
                    <span className="text-[10px] text-[#111111] dark:text-white">▼</span>
                    <span className="text-[#FF5A36] font-bold text-xs">CV</span>
                    <span className="font-mono text-base font-extrabold text-[#111111] dark:text-white tabular-nums">
                      {tirStats.coefficientOfVariation}%
                    </span>
                  </div>
                </div>
              </div>

              {/* BENTO ROW 3: Glicemia Atual ("My Balance"), Momentos Matrix ("Transactions"), and Estatísticas Clínicas ("Profit Statistics") */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-stretch">
                {/* CARD 8: Glicemia Atual ("My Balance" style - lg:col-span-3) */}
                <div className="lg:col-span-3 bg-white dark:bg-[#161619] rounded-[28px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[15px] text-[#111111] dark:text-white tracking-tight">
                      Glicemia Atual
                    </h3>
                    <button
                      onClick={() => setIsManualReadingModalOpen(true)}
                      className="w-8 h-8 rounded-full bg-[#F6F6F7] dark:bg-[#222226] flex items-center justify-center text-[#FF5A36] hover:rotate-90 transition"
                      title="Atualizar Glicemia"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Smooth Coral Wave with Jet-Black Date Callout Pin */}
                  <div className="relative my-3 pt-6">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-[#111111] text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md">
                      {latestReading
                        ? getGlucoseContextLabel(latestReading.context, profile.customMoments)
                        : 'Hoje'}
                    </div>
                    <svg viewBox="0 0 220 70" className="w-full h-16 overflow-visible">
                      <defs>
                        <linearGradient id="miniCoralGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FF5A36" stopOpacity="0.22" />
                          <stop offset="100%" stopColor="#FF5A36" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M 0 52 Q 25 35, 45 45 T 90 30 T 135 38 T 180 22 T 220 26 L 220 70 L 0 70 Z"
                        fill="url(#miniCoralGrad)"
                      />
                      <path
                        d="M 0 52 Q 25 35, 45 45 T 90 30 T 135 38 T 180 22 T 220 26"
                        fill="none"
                        stroke="#E07A64"
                        strokeWidth="2"
                      />
                      <circle cx="110" cy="34" r="4.5" fill="#111111" />
                      <line x1="110" y1="12" x2="110" y2="34" stroke="#111111" strokeWidth="2.5" />
                    </svg>
                  </div>

                  <div className="bg-[#F6F6F7] dark:bg-[#222226] rounded-full py-2.5 px-4 text-center">
                    <span className="text-[#FF5A36] font-bold text-sm mr-1">mg/dL</span>
                    <span className="font-mono text-xl font-extrabold text-[#111111] dark:text-white tabular-nums">
                      {latestReading ? latestReading.value : 0}
                    </span>
                  </div>
                </div>

                {/* CARD 9: Momentos do Dia ("Transactions" Dot-Grid Style - lg:col-span-4) */}
                <div className="lg:col-span-4 bg-white dark:bg-[#161619] rounded-[28px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[15px] text-[#111111] dark:text-white tracking-tight">
                      Momentos da Medição
                    </h3>
                    <button
                      onClick={() => {
                        setIsCustomizingMoments(true);
                        setIsManualReadingModalOpen(true);
                      }}
                      className="px-2.5 py-0.5 rounded-full bg-[#FF5A36]/15 hover:bg-[#FF5A36] text-[#FF5A36] hover:text-white text-[11px] font-bold transition"
                    >
                      + Personalizar ({effectiveMoments.length})
                    </button>
                  </div>

                  {/* Quick Moment Chips Row */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                    {effectiveMoments.slice(0, 5).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          handleSelectManualMoment(m);
                          setIsManualReadingModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-full bg-[#F6F6F7] dark:bg-[#222226] hover:bg-[#FF5A36] hover:text-white text-[10px] font-bold transition whitespace-nowrap"
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {/* Signature Coral & Soft-Gray Circle Matrix */}
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="px-3.5 py-2.5 rounded-2xl bg-[#F6F6F7] dark:bg-[#222226] shrink-0">
                      <div className="font-mono font-extrabold text-sm text-[#111111] dark:text-white tabular-nums">
                        <span className="text-[#FF5A36] mr-0.5">🩸</span>
                        {readings.length}
                      </div>
                      <span className="text-[10px] text-neutral-400 block">Registros</span>
                    </div>

                    <div className="grid grid-cols-5 gap-1.5 flex-1 max-w-[190px] ml-auto">
                      {readings.slice(0, 10).map((r, i) => {
                        const inTarget = r.value >= 70 && r.value <= 180;
                        return (
                          <div
                            key={r.id || i}
                            title={`${r.value} mg/dL (${getGlucoseContextLabel(r.context, profile.customMoments)})`}
                            className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${
                              inTarget
                                ? 'bg-[#FF5A36]'
                                : 'bg-[#F2F2F4] dark:bg-[#27272B]'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* CARD 10: Estatísticas por Período ("Profit Statistics" Style - lg:col-span-5) */}
                <div className="lg:col-span-5 bg-white dark:bg-[#161619] rounded-[28px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[15px] text-[#111111] dark:text-white tracking-tight">
                      Estatísticas Glicêmicas
                    </h3>
                    <div className="flex items-center bg-[#F6F6F7] dark:bg-[#222226] rounded-full p-0.5">
                      <span className="px-3 py-1 rounded-full bg-[#FF5A36] text-white text-[10px] font-bold">
                        Sua meta
                      </span>
                      <span className="px-2.5 text-[11px] font-mono font-extrabold text-[#111111] dark:text-white">
                        70%
                      </span>
                    </div>
                  </div>

                  {/* Coral Dot-Matrix Strip + 3 Period Averages */}
                  <div className="space-y-2">
                    <div className="h-5 w-full rounded-lg bg-gradient-to-r from-transparent via-[#FF5A36]/25 to-transparent flex items-center justify-center overflow-hidden">
                      <div className="grid grid-cols-24 gap-1">
                        {Array.from({ length: 48 }).map((_, idx) => (
                          <span
                            key={idx}
                            className="w-1 h-1 rounded-full bg-[#FF5A36]"
                          />
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                      <div>
                        <span className="text-[10px] text-neutral-400 block">Jejum / Manhã</span>
                        <span className="font-mono font-extrabold text-sm text-[#111111] dark:text-white tabular-nums">
                          <span className="text-[#FF5A36] mr-0.5">mg</span>
                          {avgFasting}
                        </span>
                      </div>
                      <div className="border-l border-neutral-100 dark:border-neutral-800 pl-2.5">
                        <span className="text-[10px] text-[#FF5A36] font-semibold block">
                          Pós-Refeição
                        </span>
                        <span className="font-mono font-extrabold text-sm text-[#111111] dark:text-white tabular-nums">
                          <span className="text-[#FF5A36] mr-0.5">mg</span>
                          {avgPostMeal}
                        </span>
                      </div>
                      <div className="border-l border-neutral-100 dark:border-neutral-800 pl-2.5">
                        <span className="text-[10px] text-neutral-400 block">Noite / Madrug.</span>
                        <span className="font-mono font-extrabold text-sm text-[#111111] dark:text-white tabular-nums">
                          <span className="text-[#FF5A36] mr-0.5">mg</span>
                          {avgDawn}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Pill Row */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex-1 bg-[#F6F6F7] dark:bg-[#222226] rounded-full p-1.5 pr-4 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#111111] dark:bg-white text-white dark:text-[#111111] flex items-center justify-center text-xs font-bold shrink-0">
                        ↑
                      </div>
                      <div className="text-xs truncate">
                        <span className="text-neutral-500 mr-1">GMI Estimado:</span>
                        <span className="text-[#FF5A36] font-bold">%</span>
                        <span className="font-mono font-extrabold text-[#111111] dark:text-white tabular-nums">
                          {tirStats.gmi}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsReportModalOpen(true)}
                      className="px-3.5 py-2 rounded-full bg-[#F6F6F7] dark:bg-[#222226] hover:bg-[#111111] hover:text-white text-[11px] font-bold transition shrink-0"
                    >
                      Laudo AGP
                    </button>
                  </div>
                </div>
              </div>

            </motion.div>
          )}

          {/* ============================================================== */}
          {/* ============================================================== */}
          {/* TAB 2: GLICOSE & DISPOSITIVOS (FILTRADO POR DIA, CIMA P/ BAIXO) */}
          {/* ============================================================== */}
          {activeTab === 'glucose' && (() => {
            const todayKey = getLocalDateKey(new Date());
            const isViewingToday = monitoringDate === todayKey;
            const { badge: dayBadge, formattedDate: dayFormatted } = formatMonitoringDayHeader(monitoringDate);

            // Filter readings by the selected day AND sort top-to-bottom (earliest of the day on top, next below the last)
            const dayReadingsAsc = readings
              .filter((r) => getLocalDateKey(new Date(r.timestamp)) === monitoringDate)
              .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            return (
              <motion.div
                key="glucose"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="space-y-4"
              >
                {/* Header */}
                <div className="bg-white dark:bg-[#161619] p-5 rounded-[28px] shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-base text-[#111111] dark:text-white">
                      Monitoramento Diário de Glicose
                    </h4>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Medições organizadas por dia, de cima para baixo (da 1ª à última do dia), com registro de aplicação
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setIsCustomizingMoments(true);
                        setIsManualReadingModalOpen(true);
                      }}
                      className="px-3.5 py-2 bg-[#F6F6F7] dark:bg-[#222226] hover:bg-[#111111] hover:text-white text-[#111111] dark:text-white text-xs font-bold rounded-full flex items-center gap-1.5 transition"
                    >
                      <Settings className="w-3.5 h-3.5 text-[#FF5A36]" />
                      <span>Personalizar Momentos</span>
                    </button>
                    <button
                      onClick={() => setActivePage('applications')}
                      className="px-4 py-2 bg-[#F6F6F7] dark:bg-[#222226] hover:bg-[#111111] hover:text-white dark:hover:bg-[#FF5A36] text-[#111111] dark:text-white text-xs font-bold rounded-full flex items-center gap-1.5 transition"
                    >
                      <Syringe className="w-3.5 h-3.5 text-[#FF5A36]" />
                      <span>Aplicações de Insulina</span>
                    </button>
                    <button
                      onClick={() => setIsBluetoothModalOpen(true)}
                      className="px-4 py-2 bg-[#111111] dark:bg-[#222226] text-white text-xs font-semibold rounded-full flex items-center gap-1.5"
                    >
                      <Radio className="w-3.5 h-3.5 text-[#FF5A36]" />
                      <span>Sensor BLE/NFC</span>
                    </button>
                    <button
                      onClick={() => setIsManualReadingModalOpen(true)}
                      className="px-4 py-2 bg-[#FF5A36] hover:bg-[#e84c29] text-white text-xs font-bold rounded-full flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nova Medição</span>
                    </button>
                  </div>
                </div>

                {/* Day Filter Navigator Bar (Defaults to Today, allows stepping back to previous days) */}
                <div className="bg-white dark:bg-[#161619] rounded-[28px] p-4 sm:px-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setMonitoringDate(shiftDateKey(monitoringDate, -1))}
                      className="px-3.5 py-2 rounded-full bg-[#F6F6F7] dark:bg-[#222226] hover:bg-[#111111] hover:text-white dark:hover:bg-[#FF5A36] text-xs font-bold flex items-center gap-1 transition"
                      title="Voltar para o dia anterior"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Dia Anterior</span>
                    </button>

                    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F6F6F7] dark:bg-[#222226]">
                      <Calendar className="w-3.5 h-3.5 text-[#FF5A36]" />
                      <span className="px-2 py-0.5 rounded-full bg-[#FF5A36] text-white text-[10px] font-extrabold uppercase">
                        {dayBadge}
                      </span>
                      <input
                        type="date"
                        value={monitoringDate}
                        max={todayKey}
                        onChange={(e) => {
                          if (e.target.value) setMonitoringDate(e.target.value);
                        }}
                        className="bg-transparent text-xs font-mono font-bold text-[#111111] dark:text-white focus:outline-hidden cursor-pointer"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={isViewingToday}
                      onClick={() => setMonitoringDate(shiftDateKey(monitoringDate, 1))}
                      className="px-3.5 py-2 rounded-full bg-[#F6F6F7] dark:bg-[#222226] hover:bg-[#111111] hover:text-white dark:hover:bg-[#FF5A36] disabled:opacity-35 disabled:pointer-events-none text-xs font-bold flex items-center gap-1 transition"
                      title="Avançar para o próximo dia"
                    >
                      <span>Próximo Dia</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isViewingToday && (
                      <button
                        type="button"
                        onClick={() => setMonitoringDate(todayKey)}
                        className="px-3.5 py-1.5 rounded-full bg-[#FF5A36] text-white text-xs font-bold transition shadow-xs"
                      >
                        Voltar para Hoje
                      </button>
                    )}
                    <span className="px-3 py-1 rounded-full bg-[#F6F6F7] dark:bg-[#222226] text-[11px] font-mono font-bold text-[#111111] dark:text-white">
                      {dayReadingsAsc.length} {dayReadingsAsc.length === 1 ? 'medição no dia' : 'medições no dia'}
                    </span>
                  </div>
                </div>

                {dayReadingsAsc.length === 0 ? (
                  <div className="bg-white dark:bg-[#161619] rounded-[28px] p-8 text-center shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#FF5A36]/15 text-[#FF5A36] flex items-center justify-center mx-auto">
                      <Droplet className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h5 className="font-bold text-sm text-[#111111] dark:text-white">
                        Nenhuma medição registrada em {isViewingToday ? 'Hoje' : dayFormatted}
                      </h5>
                      <p className="text-xs text-neutral-400 max-w-md mx-auto">
                        Registre sua primeira medição do dia. As medições aparecerão de cima para baixo na ordem em que forem feitas.
                      </p>
                    </div>
                    <button
                      onClick={() => setIsManualReadingModalOpen(true)}
                      className="px-5 py-2.5 bg-[#FF5A36] hover:bg-[#e84c29] text-white text-xs font-bold rounded-full inline-flex items-center gap-1.5 shadow-xs transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Registrar Medição Agora</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Mobile View: Vertical Compact Cards (Top to Bottom: 1st of the day at top) */}
                    <div className="block sm:hidden space-y-2.5">
                      {dayReadingsAsc.map((r, idx) => {
                        const matchedDose = r.linkedDoseId
                          ? doses.find((d) => d.id === r.linkedDoseId)
                          : doses.find((d) => d.linkedReadingId === r.id);
                        const appliedUnits = r.insulinUnitsApplied ?? matchedDose?.units;
                        const appliedName =
                          r.insulinNameApplied ??
                          matchedDose?.insulinName ??
                          (r.insulinTypeApplied === 'basal'
                            ? profile.basalInsulinName
                            : profile.rapidInsulinName);

                        return (
                          <div
                            key={r.id}
                            className="bg-white dark:bg-[#161619] rounded-3xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-2.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                {/* Número de Ordem no Dia (1ª em cima, próxima abaixo) */}
                                <span className="w-6 h-6 rounded-full bg-[#111111] dark:bg-white text-white dark:text-[#111111] font-mono text-[11px] font-extrabold flex items-center justify-center shrink-0">
                                  {idx + 1}ª
                                </span>

                                <div className="px-3 py-1.5 rounded-full bg-[#F6F6F7] dark:bg-[#222226] font-mono text-xs font-extrabold shrink-0">
                                  <span className="text-[#FF5A36] mr-0.5">mg</span>
                                  <span className="text-[#111111] dark:text-white">{r.value}</span>
                                </div>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-bold text-[#111111] dark:text-white">
                                      {getGlucoseContextLabel(r.context, profile.customMoments)}
                                    </span>
                                    {r.mealTitle && (
                                      <span className="px-2 py-0.5 rounded-full bg-orange-500/15 text-[#FF5A36] text-[10px] font-bold">
                                        🍽️ {r.mealTitle} {r.mealCarbs ? `(${r.mealCarbs}g CHO)` : ''}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mt-0.5 font-mono">
                                    <span>
                                      {new Date(r.timestamp).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                    <span>·</span>
                                    <span className="truncate max-w-[100px]">{r.deviceName || r.source}</span>
                                  </div>
                                </div>
                              </div>

                              <button
                                onClick={() => {
                                  setReadings(readings.filter((it) => it.id !== r.id));
                                  if (currentUser) deleteReadingFromFirestore(currentUser.uid, r.id);
                                }}
                                className="text-neutral-400 hover:text-red-600 p-2 rounded-full shrink-0"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Status da Aplicação de Insulina nesta medição */}
                            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2 text-xs">
                              {appliedUnits && appliedUnits > 0 ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF5A36]/15 text-[#FF5A36] font-bold text-[11px]">
                                  <Syringe className="w-3 h-3" />
                                  <span>
                                    Aplicou <strong>{appliedUnits}U</strong> ({appliedName})
                                  </span>
                                </span>
                              ) : (
                                <span className="text-[11px] text-neutral-400 font-medium">
                                  Sem aplicação registrada
                                </span>
                              )}

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBolusBgInput(String(r.value));
                                    setBolusCarbsInput(r.mealCarbs || 0);
                                    const previewCalc = calculateBolus(
                                      r.mealCarbs || 0,
                                      r.value,
                                      profile,
                                      doses,
                                      bolusTimeOfDay
                                    );
                                    setDoseUnitsInput(String(previewCalc.roundedBolus));
                                    setBolusWillApplyDose(true);
                                    setPendingBolusContext({
                                      readingId: r.id,
                                      mealId: r.linkedMealId,
                                      bgValue: r.value,
                                      mealTitle: r.mealTitle,
                                      mealCarbs: r.mealCarbs || 0,
                                      timestamp: r.timestamp,
                                      context: r.context,
                                    });
                                    setActivePage('bolus');
                                  }}
                                  className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 hover:text-[#FF5A36] flex items-center gap-1"
                                >
                                  <Calculator className="w-3 h-3" />
                                  <span>Bolus</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPreselectedReadingForDose(r.id);
                                    setActivePage('applications');
                                  }}
                                  className="text-[11px] font-bold text-[#FF5A36] hover:underline flex items-center gap-1"
                                >
                                  <Syringe className="w-3 h-3" />
                                  <span>{appliedUnits ? 'Editar / Nova Dose' : '+ Registrar Aplicação'}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop / Tablet View: Full Table (Top to Bottom: 1st of the day at top) */}
                    <div className="hidden sm:block bg-white dark:bg-[#161619] rounded-[28px] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-2">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="text-neutral-400 font-semibold border-b border-neutral-100 dark:border-neutral-800">
                            <tr>
                              <th className="p-3.5">Ordem & Horário</th>
                              <th className="p-3.5">Glicose</th>
                              <th className="p-3.5">Momento</th>
                              <th className="p-3.5">Aplicação de Insulina</th>
                              <th className="p-3.5">Observações / Fonte</th>
                              <th className="p-3.5 text-right">Ação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                            {dayReadingsAsc.map((r, idx) => {
                              const matchedDose = r.linkedDoseId
                                ? doses.find((d) => d.id === r.linkedDoseId)
                                : doses.find((d) => d.linkedReadingId === r.id);
                              const appliedUnits = r.insulinUnitsApplied ?? matchedDose?.units;
                              const appliedName =
                                r.insulinNameApplied ??
                                matchedDose?.insulinName ??
                                (r.insulinTypeApplied === 'basal'
                                  ? profile.basalInsulinName
                                  : profile.rapidInsulinName);

                              return (
                                <tr
                                  key={r.id}
                                  className="hover:bg-[#F6F6F7] dark:hover:bg-[#202024] transition-colors"
                                >
                                  <td className="p-3.5 font-mono text-neutral-600 dark:text-neutral-300 tabular-nums">
                                    <div className="flex items-center gap-2.5">
                                      <span className="w-6 h-6 rounded-full bg-[#111111] dark:bg-white text-white dark:text-[#111111] text-[10px] font-extrabold flex items-center justify-center shrink-0">
                                        {idx + 1}ª
                                      </span>
                                      <div>
                                        <span className="font-bold text-[#111111] dark:text-white">
                                          {new Date(r.timestamp).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })}
                                        </span>
                                        <span className="text-[10px] text-neutral-400 block">
                                          {new Date(r.timestamp).toLocaleDateString('pt-BR', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                          })}
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-3.5">
                                    <span className="font-mono text-sm font-extrabold text-[#111111] dark:text-white tabular-nums">
                                      <span className="text-[#FF5A36] text-xs mr-1">mg/dL</span>
                                      {r.value}
                                    </span>
                                  </td>
                                  <td className="p-3.5">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span
                                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${getGlucoseContextBadgeColor(
                                          r.context,
                                          profile.customMoments
                                        )}`}
                                      >
                                        {getGlucoseContextLabel(r.context, profile.customMoments)}
                                      </span>
                                      {r.mealTitle && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/15 text-[#FF5A36]">
                                          🍽️ {r.mealTitle} {r.mealCarbs ? `(${r.mealCarbs}g)` : ''}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-3.5">
                                    {appliedUnits && appliedUnits > 0 ? (
                                      <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF5A36]/15 text-[#FF5A36] font-mono font-extrabold text-xs">
                                          💉 Aplicou {appliedUnits}U
                                        </span>
                                        <span className="text-[11px] text-neutral-500 truncate max-w-[120px]">
                                          {appliedName}
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[11px] text-neutral-400">
                                          Não aplicou
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setPreselectedReadingForDose(r.id);
                                            setActivePage('applications');
                                          }}
                                          className="px-2.5 py-1 rounded-full bg-[#F6F6F7] dark:bg-[#222226] hover:bg-[#FF5A36] hover:text-white text-[10px] font-bold text-[#FF5A36] transition"
                                        >
                                          + Aplicar
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setBolusBgInput(String(r.value));
                                            setBolusCarbsInput(r.mealCarbs || 0);
                                            const previewCalc = calculateBolus(
                                              r.mealCarbs || 0,
                                              r.value,
                                              profile,
                                              doses,
                                              bolusTimeOfDay
                                            );
                                            setDoseUnitsInput(String(previewCalc.roundedBolus));
                                            setBolusWillApplyDose(true);
                                            setPendingBolusContext({
                                              readingId: r.id,
                                              mealId: r.linkedMealId,
                                              bgValue: r.value,
                                              mealTitle: r.mealTitle,
                                              mealCarbs: r.mealCarbs || 0,
                                              timestamp: r.timestamp,
                                              context: r.context,
                                            });
                                            setActivePage('bolus');
                                          }}
                                          className="px-2.5 py-1 rounded-full bg-[#F6F6F7] dark:bg-[#222226] hover:bg-[#111111] hover:text-white dark:hover:bg-white dark:hover:text-[#111111] text-[10px] font-bold text-neutral-600 dark:text-neutral-300 transition"
                                        >
                                          Calcular Bolus
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-3.5 text-neutral-500 dark:text-neutral-400 truncate max-w-[160px]">
                                    {r.notes || r.deviceName || r.source}
                                  </td>
                                  <td className="p-3.5 text-right">
                                    <button
                                      onClick={() => {
                                        setReadings(readings.filter((it) => it.id !== r.id));
                                        if (currentUser) deleteReadingFromFirestore(currentUser.uid, r.id);
                                      }}
                                      className="text-neutral-400 hover:text-red-600 p-1.5 rounded-full"
                                      title="Excluir medição"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            );
          })()}

          {/* ============================================================== */}
          {/* PÁGINA: CADASTRO & MONITORAMENTO DE APLICAÇÕES DE INSULINA     */}
          {/* ============================================================== */}
          {activePage === 'applications' && (
            <motion.div
              key="applications"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <InsulinApplicationsView
                doses={doses}
                readings={readings}
                profile={profile}
                selectedDate={monitoringDate}
                onSelectDate={(d) => setMonitoringDate(d)}
                onAddDose={handleAddDoseFromApplications}
                onDeleteDose={handleDeleteDose}
                preselectedReadingId={preselectedReadingForDose}
                onClearPreselectedReading={() => setPreselectedReadingForDose(null)}
              />
            </motion.div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: REFEIÇÕES & IA (PRATO, FAVORITAS COM APELIDO, TACO)     */}
          {/* ============================================================== */}
          {activeTab === 'meals' && (
            <motion.div
              key="meals"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="space-y-4"
            >
              {/* Banner quando direcionado ao clicar em "Sim, cadastrar alimentos" na Medição */}
              {pendingMealFromReading && (
                <div className="bg-[#FF5A36]/10 border border-[#FF5A36]/30 rounded-[28px] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#FF5A36] text-white text-[10px] font-extrabold uppercase">
                        Medição Salva: {pendingMealFromReading.bgValue} mg/dL
                      </span>
                      <h5 className="font-extrabold text-sm text-[#111111] dark:text-white">
                        🍽️ Cadastre os alimentos de: {pendingMealFromReading.mealTitle}
                      </h5>
                    </div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-300">
                      Escolha uma <strong>Refeição Favorita pelo apelido</strong> abaixo (você pode alterar os itens depois de escolher) ou busque alimentos na Tabela TACO. Ao finalizar, clique em <strong>Salvar Refeição & Calcular Bolus</strong>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingMealFromReading(null)}
                    className="text-xs font-bold text-neutral-500 hover:text-[#111111] dark:hover:text-white self-end sm:self-center shrink-0"
                  >
                    Desvincular medição
                  </button>
                </div>
              )}

              {/* Sub-tab navigation */}
              <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 bg-white dark:bg-[#161619] p-2 rounded-full shadow-[0_4px_24px_rgba(0,0,0,0.03)] max-w-full">
                <div className="flex items-center gap-1 flex-wrap xs:flex-nowrap min-w-0">
                  <button
                    onClick={() => setMealsSubTab('plate')}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition ${
                      mealsSubTab === 'plate'
                        ? 'bg-[#111111] dark:bg-[#FF5A36] text-white'
                        : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    Meu Prato ({currentPlate.length}) · {plateTotalCarbs}g
                  </button>
                  <button
                    onClick={() => setMealsSubTab('search')}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition ${
                      mealsSubTab === 'search'
                        ? 'bg-[#111111] dark:bg-[#FF5A36] text-white'
                        : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    + Buscar Alimentos (TACO)
                  </button>
                  <button
                    onClick={() => setMealsSubTab('favorites')}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-1 ${
                      mealsSubTab === 'favorites'
                        ? 'bg-[#111111] dark:bg-[#FF5A36] text-white'
                        : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5" />
                    <span>Favoritas ({favorites.length})</span>
                  </button>
                </div>

                <button
                  onClick={() => setIsAiModalOpen(true)}
                  className="px-4 py-2 bg-[#FF5A36] hover:bg-[#e84c29] text-white font-bold text-xs rounded-full flex items-center gap-1.5 shrink-0 ml-auto"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Foto IA</span>
                </button>
              </div>

              {/* Barra de Acesso Rápido às Refeições Favoritas por Apelido */}
              {favorites.length > 0 && (
                <div className="bg-white dark:bg-[#161619] rounded-[24px] p-4 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#111111] dark:text-white flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-[#FF5A36] fill-[#FF5A36]" />
                      <span>Acesso Rápido: Refeições Favoritas (clique no apelido e altere se quiser)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setMealsSubTab('favorites')}
                      className="text-[11px] font-bold text-[#FF5A36] hover:underline"
                    >
                      Gerenciar apelidos
                    </button>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {favorites.map((fav) => (
                      <button
                        key={fav.id}
                        type="button"
                        onClick={() => handleSelectFavoriteToPlate(fav)}
                        className="px-3.5 py-2 rounded-2xl bg-[#F6F6F7] dark:bg-[#222226] hover:bg-[#FF5A36] hover:text-white text-xs font-bold transition flex items-center gap-2 shrink-0 group"
                      >
                        <span>⭐ {fav.nickname || fav.name}</span>
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-white dark:bg-[#161619] text-[#FF5A36] group-hover:bg-white/20 group-hover:text-white">
                          {fav.totalCarbs}g CHO
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-view: Current Plate Builder */}
              {mealsSubTab === 'plate' && (
                <div className="bg-white dark:bg-[#161619] rounded-[28px] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="text"
                        value={mealTitle}
                        onChange={(e) => setMealTitle(e.target.value)}
                        placeholder="Nome ou Apelido da Refeição"
                        className="font-bold text-base bg-transparent border-b border-dashed border-neutral-300 dark:border-neutral-700 px-1 py-0.5 focus:outline-hidden text-[#111111] dark:text-white"
                      />
                      <select
                        value={mealType}
                        onChange={(e) => setMealType(e.target.value as any)}
                        className="text-xs bg-[#F6F6F7] dark:bg-[#222226] rounded-full px-3 py-1.5 font-semibold text-[#111111] dark:text-white"
                      >
                        <option value="cafe">Café da Manhã</option>
                        <option value="almoco">Almoço</option>
                        <option value="lanche">Lanche</option>
                        <option value="jantar">Jantar</option>
                        <option value="ceia">Ceia</option>
                        <option value="outro">Outra Refeição</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => setMealsSubTab('search')}
                        className="px-3 py-1.5 rounded-full bg-[#FF5A36]/15 text-[#FF5A36] text-xs font-bold hover:bg-[#FF5A36] hover:text-white transition"
                      >
                        + Adicionar Alimentos
                      </button>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-2xl font-extrabold text-[#111111] dark:text-white tabular-nums">
                        <span className="text-[#FF5A36] text-base mr-0.5">g</span>
                        {plateTotalCarbs}
                      </span>
                      <span className="text-[10px] text-neutral-400 block font-bold">CHO TOTAL</span>
                    </div>
                  </div>

                  {/* Macro quick badges */}
                  <div className="grid grid-cols-3 gap-3 text-center text-xs">
                    <div className="p-3 bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl">
                      <span className="text-[11px] text-neutral-500 block">Carboidratos</span>
                      <span className="font-mono font-extrabold text-base text-[#111111] dark:text-white">
                        <span className="text-[#FF5A36] mr-0.5">g</span>
                        {plateTotalCarbs}
                      </span>
                    </div>
                    <div className="p-3 bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl">
                      <span className="text-[11px] text-neutral-500 block">Proteínas</span>
                      <span className="font-mono font-extrabold text-base text-[#111111] dark:text-white">
                        <span className="text-[#FF5A36] mr-0.5">g</span>
                        {plateTotalProtein}
                      </span>
                    </div>
                    <div className="p-3 bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl">
                      <span className="text-[11px] text-neutral-500 block">Gorduras</span>
                      <span className="font-mono font-extrabold text-base text-[#111111] dark:text-white">
                        <span className="text-[#FF5A36] mr-0.5">g</span>
                        {plateTotalFat}
                      </span>
                    </div>
                  </div>

                  {/* Plate items list (editable even after selecting a Favorite!) */}
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {currentPlate.length === 0 ? (
                      <div className="py-8 text-center space-y-3">
                        <p className="text-xs text-neutral-400">
                          Prato vazio. Escolha uma <strong>Refeição Favorita</strong> acima ou clique abaixo para buscar alimentos na Tabela TACO.
                        </p>
                        <button
                          type="button"
                          onClick={() => setMealsSubTab('search')}
                          className="px-4 py-2 rounded-full bg-[#111111] dark:bg-[#FF5A36] text-white text-xs font-bold hover:opacity-90 transition"
                        >
                          + Buscar Alimentos na Tabela TACO
                        </button>
                      </div>
                    ) : (
                      currentPlate.map((item) => (
                        <div
                          key={item.id}
                          className="px-4 py-3 rounded-2xl bg-[#F6F6F7] dark:bg-[#222226] flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0 flex-1 mr-2">
                            <p className="font-bold truncate text-[#111111] dark:text-white">
                              {item.name}
                            </p>
                            <span className="text-[10px] text-neutral-500">
                              {item.totalGrams}g ({item.portionCount} porção) — você pode ajustar ao lado
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center bg-white dark:bg-[#161619] rounded-full px-1 py-0.5">
                              <button
                                onClick={() => handleUpdatePortion(item.id, item.portionCount - 1)}
                                className="w-6 h-6 rounded-full font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800"
                              >
                                -
                              </button>
                              <span className="px-2 font-mono font-bold text-xs">
                                {item.portionCount}
                              </span>
                              <button
                                onClick={() => handleUpdatePortion(item.id, item.portionCount + 1)}
                                className="w-6 h-6 rounded-full font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800"
                              >
                                +
                              </button>
                            </div>
                            <span className="font-mono font-extrabold text-[#FF5A36] w-12 text-right">
                              {item.carbs}g
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdatePortion(item.id, 0)}
                              className="text-neutral-400 hover:text-red-500 p-1"
                              title="Remover item do prato"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {currentPlate.length > 0 && (
                    <div className="space-y-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                      {/* Favoritar este prato com um apelido personalizado */}
                      <div className="p-3.5 rounded-2xl bg-[#F6F6F7] dark:bg-[#222226] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#111111] dark:text-white">
                          <Star className="w-4 h-4 text-[#FF5A36] shrink-0" />
                          <span>Favoritar esta refeição com apelido:</span>
                        </div>
                        <div className="flex items-center gap-2 flex-1 max-w-md">
                          <input
                            type="text"
                            placeholder={`Apelido (ex: ${mealTitle} Campeão, Café Rápido...)`}
                            value={favoriteNicknameInput}
                            onChange={(e) => setFavoriteNicknameInput(e.target.value)}
                            className="flex-1 px-3.5 py-2 rounded-full bg-white dark:bg-[#161619] text-xs font-semibold text-[#111111] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#FF5A36]"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveCurrentPlateAsFavorite()}
                            className="px-4 py-2 rounded-full bg-[#111111] dark:bg-white text-white dark:text-[#111111] text-xs font-bold shrink-0 hover:opacity-90 transition"
                          >
                            ⭐ Favoritar
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={handleSaveMealRecord}
                        className="w-full py-3.5 bg-[#FF5A36] hover:bg-[#e84c29] text-white font-bold text-xs sm:text-sm rounded-full transition flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Check className="w-4 h-4" />
                        <span>
                          {pendingMealFromReading
                            ? `Salvar Refeição (${plateTotalCarbs}g CHO) + Medição (${pendingMealFromReading.bgValue} mg/dL) & Calcular Bolus`
                            : `Salvar Refeição & Calcular Bolus (${plateTotalCarbs}g CHO)`}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-view: Food Search */}
              {mealsSubTab === 'search' && (
                <div className="bg-white dark:bg-[#161619] rounded-[28px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
                  {/* Resumo ao vivo do Meu Prato enquanto busca alimentos */}
                  {currentPlate.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-[#FF5A36]/10 border border-[#FF5A36]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2 text-xs">
                        <Utensils className="w-4 h-4 text-[#FF5A36] shrink-0" />
                        <span className="font-bold text-[#111111] dark:text-white">
                          Meu Prato ({currentPlate.length}{' '}
                          {currentPlate.length === 1 ? 'item' : 'itens'}):{' '}
                          <strong className="text-[#FF5A36] font-mono">{plateTotalCarbs}g CHO</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setMealsSubTab('plate')}
                          className="px-3.5 py-1.5 rounded-full bg-[#111111] dark:bg-white text-white dark:text-[#111111] text-[11px] font-bold transition"
                        >
                          Ver Prato / Ajustar Porções
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveMealRecord}
                          className="px-3.5 py-1.5 rounded-full bg-[#FF5A36] text-white text-[11px] font-bold transition"
                        >
                          Salvar Refeição & Calcular Bolus
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="relative">
                    <Search className="w-4 h-4 text-[#FF5A36] absolute left-4 top-3" />
                    <input
                      type="text"
                      placeholder="Buscar alimento na Tabela TACO / SBD..."
                      value={foodSearchQuery}
                      onChange={(e) => setFoodSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#F6F6F7] dark:bg-[#222226] rounded-full focus:outline-hidden focus:ring-2 focus:ring-[#FF5A36]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
                    {filteredFoods.slice(0, 20).map((food) => {
                      const inPlateItem = currentPlate.find((p) => p.foodId === food.id);
                      return (
                        <div
                          key={food.id}
                          className="p-3.5 bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0 flex-1 mr-2">
                            <p className="font-bold truncate text-[#111111] dark:text-white">
                              {food.name}
                            </p>
                            <span className="text-[10px] text-neutral-500 block truncate">
                              {food.servingDescription}
                            </span>
                            <span className="font-mono font-extrabold text-[#FF5A36] text-[11px]">
                              {Math.round(((food.carbsPer100g * food.gramsPerServing) / 100) * 10) /
                                10}
                              g CHO
                            </span>
                          </div>
                          <button
                            onClick={() => handleAddFoodToPlate(food)}
                            className={`px-3.5 py-1.5 font-bold text-xs rounded-full hover:opacity-90 transition shrink-0 ${
                              inPlateItem
                                ? 'bg-[#FF5A36] text-white'
                                : 'bg-[#111111] dark:bg-[#FF5A36] text-white'
                            }`}
                          >
                            {inPlateItem
                              ? `+ Adicionar (${inPlateItem.portionCount}x no prato)`
                              : '+ Adicionar'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sub-view: Favorites with Nicknames ("Apelidos") & Editable after Choosing */}
              {mealsSubTab === 'favorites' && (
                <div className="bg-white dark:bg-[#161619] rounded-[28px] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                    <div>
                      <h5 className="font-extrabold text-sm sm:text-base text-[#111111] dark:text-white flex items-center gap-2">
                        <Star className="w-4 h-4 text-[#FF5A36] fill-[#FF5A36]" />
                        <span>Refeições Favoritas com Apelidos</span>
                      </h5>
                      <p className="text-xs text-neutral-500">
                        Escolha uma favorita para carregar no prato e altere livremente as porções ou alimentos depois de escolhida
                      </p>
                    </div>
                  </div>

                  {favorites.length === 0 ? (
                    <div className="py-8 text-center space-y-2">
                      <p className="text-xs text-neutral-400">
                        Você ainda não tem refeições favoritas salvas. Monte um prato na aba &ldquo;Meu Prato&rdquo; e clique em <strong>⭐ Favoritar</strong> com um apelido!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {favorites.map((fav) => {
                        const isEditingNick = editingFavoriteId === fav.id;
                        return (
                          <div
                            key={fav.id}
                            className="p-4 bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="space-y-1 min-w-0 flex-1">
                              {isEditingNick ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={editingFavoriteNickname}
                                    onChange={(e) => setEditingFavoriteNickname(e.target.value)}
                                    placeholder="Novo apelido da refeição"
                                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#161619] text-xs font-bold text-[#111111] dark:text-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateFavoriteNickname(fav.id, editingFavoriteNickname)
                                    }
                                    className="px-3 py-1.5 rounded-xl bg-[#FF5A36] text-white font-bold text-[11px]"
                                  >
                                    Salvar Apelido
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingFavoriteId(null)}
                                    className="text-neutral-400 hover:text-neutral-600 text-[11px] font-bold"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-extrabold text-sm text-[#111111] dark:text-white">
                                    ⭐ {fav.nickname || fav.name}
                                  </span>
                                  <span className="px-2.5 py-0.5 rounded-full bg-[#FF5A36]/15 text-[#FF5A36] font-mono font-extrabold text-[11px]">
                                    {fav.totalCarbs}g CHO
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white dark:bg-[#161619] text-neutral-500 font-semibold">
                                    {getMealTypeLabel(fav.mealType)}
                                  </span>
                                </div>
                              )}
                              <p className="text-[11px] text-neutral-500 truncate">
                                {fav.items.map((it) => `${it.name} (${it.carbs}g)`).join(' · ')}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleSelectFavoriteToPlate(fav)}
                                className="px-3.5 py-2 rounded-full bg-[#FF5A36] hover:bg-[#e84c29] text-white font-bold text-xs transition"
                              >
                                Escolher & Editar no Prato
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingFavoriteId(fav.id);
                                  setEditingFavoriteNickname(fav.nickname || fav.name);
                                }}
                                className="p-2 rounded-full bg-white dark:bg-[#161619] text-neutral-600 dark:text-neutral-300 hover:text-[#FF5A36]"
                                title="Alterar apelido"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteFavoriteMeal(fav.id)}
                                className="p-2 rounded-full bg-white dark:bg-[#161619] text-neutral-400 hover:text-red-500"
                                title="Remover dos favoritos"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Historical Saved Meals Section (from measurements or plate builder) */}
              <div className="bg-white dark:bg-[#161619] rounded-[28px] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-sm text-[#111111] dark:text-white">
                      Refeições Registradas ({meals.length})
                    </h5>
                    <p className="text-[11px] text-neutral-500">
                      Todas as refeições cadastradas ficam salvas aqui e podem ser favoritadas ou editadas
                    </p>
                  </div>
                </div>

                {meals.length === 0 ? (
                  <p className="text-xs text-neutral-400 py-4 text-center">
                    Nenhuma refeição registrada ainda.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {meals.slice(0, 20).map((m) => (
                      <div
                        key={m.id}
                        className="p-3.5 rounded-2xl bg-[#F6F6F7] dark:bg-[#222226] flex flex-wrap items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[#111111] dark:text-white">
                              🍽️ {m.title}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-[#FF5A36]/15 text-[#FF5A36] font-mono font-bold text-[11px]">
                              {m.totalCarbs}g CHO
                            </span>
                            {m.bgAtMeal && (
                              <span className="px-2 py-0.5 rounded-full bg-white dark:bg-[#161619] font-mono font-bold text-[11px] text-neutral-700 dark:text-neutral-300">
                                🩸 {m.bgAtMeal} mg/dL
                              </span>
                            )}
                            {m.insulinUnitsApplied ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-[11px]">
                                💉 Aplicou {m.insulinUnitsApplied}U
                              </span>
                            ) : null}
                          </div>
                          <div className="text-[11px] text-neutral-400 mt-1 flex items-center gap-2 flex-wrap">
                            <span className="font-mono">
                              {new Date(m.timestamp).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                              })}{' '}
                              às{' '}
                              {new Date(m.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {m.items.length > 0 && (
                              <span className="truncate max-w-xs">
                                · {m.items.map((it) => `${it.name} (${it.carbs}g)`).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {m.items.length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleSaveHistoricalMealAsFavorite(m)}
                              className="px-2.5 py-1.5 rounded-full bg-white dark:bg-[#161619] text-[#FF5A36] text-[11px] font-bold hover:bg-[#FF5A36] hover:text-white transition"
                              title="Favoritar esta refeição"
                            >
                              ⭐ Favoritar
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setBolusCarbsInput(m.totalCarbs);
                              if (m.bgAtMeal) setBolusBgInput(String(m.bgAtMeal));
                              setPendingBolusContext({
                                readingId: m.linkedReadingId,
                                mealId: m.id,
                                mealTitle: m.title,
                                bgValue: m.bgAtMeal || (latestReading ? latestReading.value : profile.targetBg),
                                mealCarbs: m.totalCarbs,
                                timestamp: m.timestamp,
                              });
                              setActivePage('bolus');
                            }}
                            className="px-3 py-1.5 rounded-full bg-[#FF5A36] text-white text-[11px] font-bold hover:bg-[#e84c29] transition"
                          >
                            Calcular Correção / Bolus
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMeals(meals.filter((item) => item.id !== m.id));
                              if (currentUser) deleteMealFromFirestore(currentUser.uid, m.id);
                            }}
                            className="p-1.5 text-neutral-400 hover:text-red-500"
                            title="Excluir refeição"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ============================================================== */}
          {/* TAB 4: CALCULADORA DE BOLUS & CORREÇÃO                         */}
          {/* ============================================================== */}
          {activeTab === 'bolus' && (
            <motion.div
              key="bolus"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="space-y-4"
            >
              {/* Context Banner when redirected from a Meal Measurement or Plate */}
              {pendingBolusContext && (
                <div className="bg-[#FF5A36]/10 border border-[#FF5A36]/30 rounded-[28px] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#FF5A36] text-white text-[10px] font-extrabold uppercase">
                        Refeição + Medição Salvas
                      </span>
                      <h5 className="font-extrabold text-sm text-[#111111] dark:text-white">
                        🍽️ {pendingBolusContext.mealTitle}
                      </h5>
                    </div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-300">
                      Glicemia registrada: <strong>{pendingBolusContext.bgValue} mg/dL</strong> · Carboidratos da refeição:{' '}
                      <strong>{pendingBolusContext.mealCarbs ?? 0}g CHO</strong>. Confira a dose exata abaixo e confirme se aplicou insulina.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingBolusContext(null)}
                    className="text-xs font-bold text-neutral-500 hover:text-[#111111] dark:hover:text-white self-end sm:self-center shrink-0"
                  >
                    Dispensar aviso
                  </button>
                </div>
              )}

              <div className="bg-white dark:bg-[#161619] rounded-[28px] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                  <div>
                    <h4 className="font-bold text-base text-[#111111] dark:text-white">
                      Calculadora de Bolus & Correção Exata
                    </h4>
                    <p className="text-xs text-neutral-500">
                      Alimentação + Correção Glicêmica com desconto de Insulina Ativa (IOB)
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-neutral-400 block font-bold">IOB ATIVA</span>
                    <span className="font-mono text-lg font-extrabold text-[#FF5A36]">
                      {totalIOB} U
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-neutral-600 dark:text-neutral-300 block mb-1.5">
                      Carboidratos da Refeição (g)
                    </label>
                    <input
                      type="number"
                      value={bolusCarbsInput || ''}
                      onChange={(e) => setBolusCarbsInput(Number(e.target.value))}
                      placeholder="0 (apenas correção)"
                      className="w-full px-4 py-2.5 text-base font-mono font-bold bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-[#FF5A36] text-[#111111] dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-neutral-600 dark:text-neutral-300 block mb-1.5">
                      Glicemia Atual (mg/dL)
                    </label>
                    <input
                      type="number"
                      value={bolusBgInput}
                      onChange={(e) => setBolusBgInput(e.target.value)}
                      placeholder={latestReading ? String(latestReading.value) : '100'}
                      className="w-full px-4 py-2.5 text-base font-mono font-bold bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-[#FF5A36] text-[#111111] dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-neutral-600 dark:text-neutral-300 block mb-1.5">
                      Período / Relação Insulina:CHO
                    </label>
                    <select
                      value={bolusTimeOfDay}
                      onChange={(e) => setBolusTimeOfDay(e.target.value as any)}
                      className="w-full px-4 py-3 text-xs font-bold bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl text-[#111111] dark:text-white"
                    >
                      <option value="morning">Manhã (1U : {profile.icrMorning}g)</option>
                      <option value="afternoon">Tarde (1U : {profile.icrAfternoon}g)</option>
                      <option value="night">Noite (1U : {profile.icrNight}g)</option>
                    </select>
                  </div>
                </div>

                {/* Formula Breakdown Cards */}
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl">
                    <span className="text-[10px] text-neutral-500 block">Bolus Alimentação</span>
                    <span className="font-mono font-extrabold text-sm text-[#111111] dark:text-white">
                      +{bolusResult.foodBolus}U
                    </span>
                  </div>
                  <div className="p-3.5 bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl">
                    <span className="text-[10px] text-neutral-500 block">Bolus Correção</span>
                    <span className="font-mono font-extrabold text-sm text-[#111111] dark:text-white">
                      +{bolusResult.correctionBolus}U
                    </span>
                  </div>
                  <div className="p-3.5 bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl">
                    <span className="text-[10px] text-neutral-500 block">Desconto IOB</span>
                    <span className="font-mono font-extrabold text-sm text-[#FF5A36]">
                      -{bolusResult.iob}U
                    </span>
                  </div>
                </div>

                {/* Result Hero + Direct Application Registration */}
                <div className="p-5 rounded-3xl bg-[#111111] text-white space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold text-neutral-400 block">
                        Dose Recomendada (Correção + Refeição)
                      </span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-[#FF5A36] font-extrabold text-2xl">U</span>
                        <span className="font-mono text-4xl font-extrabold text-white tabular-nums">
                          {bolusResult.roundedBolus}
                        </span>
                        <span className="text-xs text-neutral-400">
                          Unidades ({profile.rapidInsulinName})
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setDoseUnitsInput(String(bolusResult.roundedBolus));
                        setDoseTypeInput('rapid');
                        setBolusWillApplyDose(true);
                      }}
                      className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition self-start sm:self-center"
                    >
                      Usar {bolusResult.roundedBolus}U sugeridas
                    </button>
                  </div>

                  {/* Registrar Aplicação ou Não Aplicar */}
                  <div className="pt-4 border-t border-white/10 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-bold text-neutral-200">
                        Registrar aplicação desta correção / refeição:
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setBolusWillApplyDose(true)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
                            bolusWillApplyDose
                              ? 'bg-[#FF5A36] text-white'
                              : 'bg-white/10 text-neutral-300'
                          }`}
                        >
                          Sim, aplicar dose
                        </button>
                        <button
                          type="button"
                          onClick={() => setBolusWillApplyDose(false)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
                            !bolusWillApplyDose
                              ? 'bg-white text-[#111111]'
                              : 'bg-white/10 text-neutral-300'
                          }`}
                        >
                          Não aplicar agora
                        </button>
                      </div>
                    </div>

                    {bolusWillApplyDose ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 items-end">
                        <div>
                          <label className="text-[11px] text-neutral-400 block mb-1">
                            Dose Aplicada (U)
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            min="0.5"
                            max="150"
                            value={doseUnitsInput}
                            onChange={(e) => setDoseUnitsInput(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-2xl bg-white/10 text-white font-mono font-extrabold text-sm focus:outline-hidden focus:ring-2 focus:ring-[#FF5A36]"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-neutral-400 block mb-1">
                            Tipo de Insulina
                          </label>
                          <select
                            value={doseTypeInput}
                            onChange={(e) => setDoseTypeInput(e.target.value as 'rapid' | 'basal')}
                            className="w-full px-4 py-2.5 rounded-2xl bg-white/10 text-white text-xs font-bold"
                          >
                            <option value="rapid" className="text-black">
                              Rápida ({profile.rapidInsulinName})
                            </option>
                            <option value="basal" className="text-black">
                              Basal ({profile.basalInsulinName})
                            </option>
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={handleLogInsulinDose}
                          className="w-full py-2.5 px-5 bg-[#FF5A36] hover:bg-[#e84c29] text-white font-bold text-xs rounded-2xl transition flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Check className="w-4 h-4" />
                          <span>Salvar Aplicação ({doseUnitsInput}U)</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-neutral-400">
                          A medição e a refeição já estão salvas sem aplicação de insulina.
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setPendingBolusContext(null);
                            setActivePage('glucose');
                          }}
                          className="px-4 py-2 rounded-full bg-white text-[#111111] font-bold text-xs"
                        >
                          Concluir sem Aplicar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ============================================================== */}
          {/* TAB 5: RELATÓRIOS & CONFIGURAÇÕES (LEGACY DEPRECATED)          */}
          {/* ============================================================== */}
          {false && activeTab === 'reports' && (
            <motion.div
              key="reports"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="space-y-4"
            >
              <div className="flex bg-white dark:bg-[#161619] p-1.5 rounded-full shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
                <button
                  onClick={() => setReportsSubTab('overview')}
                  className={`flex-1 py-2 text-xs font-bold rounded-full transition ${
                    reportsSubTab === 'overview'
                      ? 'bg-[#111111] dark:bg-[#FF5A36] text-white'
                      : 'text-neutral-500'
                  }`}
                >
                  Relatório & Exportação
                </button>
                <button
                  onClick={() => setReportsSubTab('reminders')}
                  className={`flex-1 py-2 text-xs font-bold rounded-full transition ${
                    reportsSubTab === 'reminders'
                      ? 'bg-[#111111] dark:bg-[#FF5A36] text-white'
                      : 'text-neutral-500'
                  }`}
                >
                  Lembretes & Push
                </button>
                <button
                  onClick={() => setReportsSubTab('profile')}
                  className={`flex-1 py-2 text-xs font-bold rounded-full transition ${
                    reportsSubTab === 'profile'
                      ? 'bg-[#111111] dark:bg-[#FF5A36] text-white'
                      : 'text-neutral-500'
                  }`}
                >
                  Perfil & Conta
                </button>
              </div>

              <AnimatePresence mode="wait">
                {reportsSubTab === 'overview' && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="bg-white dark:bg-[#161619] rounded-[28px] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-base text-[#111111] dark:text-white">
                          Resumo Clínico Ambulatorial
                        </h4>
                        <p className="text-xs text-neutral-500">
                          Análise de {reportFilteredReadings.length} medições na janela selecionada
                        </p>
                      </div>

                      <div className="flex items-center flex-wrap gap-2">
                        <div className="flex bg-[#F6F6F7] dark:bg-[#222226] p-1 rounded-full text-xs">
                          {(['7days', '14days', '30days'] as const).map((rng) => (
                            <button
                              key={rng}
                              onClick={() => setReportSummaryRange(rng)}
                              className={`px-3 py-1 text-[11px] font-bold rounded-full transition ${
                                reportSummaryRange === rng
                                  ? 'bg-[#111111] dark:bg-[#FF5A36] text-white'
                                  : 'text-neutral-600 dark:text-neutral-300'
                              }`}
                            >
                              {rng === '7days' ? '7 Dias' : rng === '14days' ? '14 Dias' : '30 Dias'}
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() => setIsReportModalOpen(true)}
                          className="px-4 py-2 bg-[#FF5A36] hover:bg-[#e84c29] text-white font-bold text-xs rounded-full flex items-center gap-1.5 transition"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Relatório AGP</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                      <div className="p-4 bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl">
                        <span className="text-xs text-neutral-500 block">Tempo no Alvo</span>
                        <span className="font-mono text-2xl font-extrabold text-[#111111] dark:text-white">
                          <span className="text-[#FF5A36] text-sm mr-0.5">%</span>
                          {reportTirStats.inRangePercent}
                        </span>
                        <span className="text-[10px] text-neutral-400 block mt-0.5">Meta &gt;70%</span>
                      </div>
                      <div className="p-4 bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl">
                        <span className="text-xs text-neutral-500 block">HbA1c Estimada</span>
                        <span className="font-mono text-2xl font-extrabold text-[#111111] dark:text-white">
                          <span className="text-[#FF5A36] text-sm mr-0.5">%</span>
                          {reportTirStats.estimatedHbA1c}
                        </span>
                        <span className="text-[10px] text-neutral-400 block mt-0.5">
                          GMI {reportTirStats.gmi}%
                        </span>
                      </div>
                      <div className="p-4 bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl">
                        <span className="text-xs text-neutral-500 block">Glicemia Média</span>
                        <span className="font-mono text-2xl font-extrabold text-[#111111] dark:text-white">
                          <span className="text-[#FF5A36] text-sm mr-0.5">mg</span>
                          {reportTirStats.meanGlucose}
                        </span>
                        <span className="text-[10px] text-neutral-400 block mt-0.5">
                          ±{reportTirStats.standardDeviation} mg/dL
                        </span>
                      </div>
                      <div className="p-4 bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl">
                        <span className="text-xs text-neutral-500 block">Variabilidade CV</span>
                        <span className="font-mono text-2xl font-extrabold text-[#111111] dark:text-white">
                          <span className="text-[#FF5A36] text-sm mr-0.5">%</span>
                          {reportTirStats.coefficientOfVariation}
                        </span>
                        <span className="text-[10px] text-neutral-400 block mt-0.5">Meta &le;36%</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {reportsSubTab === 'reminders' && (
                  <motion.div
                    key="reminders"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="bg-white dark:bg-[#161619] rounded-[28px] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4"
                  >
                    <div className="p-4 bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#FF5A36] text-white flex items-center justify-center shrink-0">
                          <BellRing className="w-4 h-4" />
                        </div>
                        <div className="text-xs">
                          <h5 className="font-bold text-[#111111] dark:text-white">
                            Notificações Push no Navegador
                          </h5>
                          <p className="text-[11px] text-neutral-500">
                            Status:{' '}
                            <strong>
                              {notifPermission === 'granted'
                                ? 'Ativadas'
                                : notifPermission === 'denied'
                                ? 'Bloqueadas'
                                : 'Pendente'}
                            </strong>
                          </p>
                        </div>
                      </div>

                      {notifPermission !== 'granted' && (
                        <button
                          onClick={handleRequestNotificationPermission}
                          className="px-4 py-2 bg-[#111111] dark:bg-[#FF5A36] text-white font-bold text-xs rounded-full shrink-0"
                        >
                          Permitir Alertas
                        </button>
                      )}
                    </div>

                    <form
                      onSubmit={handleCreateCustomReminder}
                      className="p-4 bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl space-y-3"
                    >
                      <h5 className="font-bold text-xs text-[#111111] dark:text-white">
                        Novo Lembrete Personalizado
                      </h5>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <input
                          type="text"
                          placeholder="Título (ex: Medir Pós-Almoço)"
                          value={newReminderTitle}
                          onChange={(e) => setNewReminderTitle(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-full bg-white dark:bg-[#161619] text-xs"
                          required
                        />
                        <input
                          type="time"
                          value={newReminderTime}
                          onChange={(e) => setNewReminderTime(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-full bg-white dark:bg-[#161619] text-xs font-mono font-bold"
                          required
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="px-5 py-2 bg-[#FF5A36] text-white font-bold text-xs rounded-full"
                        >
                          + Agendar Lembrete
                        </button>
                      </div>
                    </form>

                    <div className="space-y-2">
                      {reminders.map((r) => (
                        <div
                          key={r.id}
                          className="px-4 py-3 rounded-2xl bg-[#F6F6F7] dark:bg-[#222226] flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-extrabold text-sm text-[#FF5A36]">
                              {r.timeString}
                            </span>
                            <div>
                              <p className="font-bold text-[#111111] dark:text-white">{r.title}</p>
                              <span className="text-[10px] text-neutral-500">{r.notes}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={r.enabled}
                              onChange={() => {
                                const updated = reminders.map((item) =>
                                  item.id === r.id ? { ...item, enabled: !item.enabled } : item
                                );
                                setReminders(updated);
                              }}
                              className="h-4 w-4 accent-[#FF5A36]"
                            />
                            <button
                              onClick={() => handleDeleteReminder(r.id)}
                              className="p-1 text-neutral-400 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {reportsSubTab === 'profile' && (
                  <motion.div
                    key="profile"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="bg-white dark:bg-[#161619] rounded-[28px] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4"
                  >
                    <div className="p-4 rounded-2xl bg-[#F6F6F7] dark:bg-[#222226] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-[#FF5A36] text-white flex items-center justify-center font-bold text-sm shrink-0">
                          {profile.name ? profile.name.slice(0, 1).toUpperCase() : 'P'}
                        </div>
                        <div className="text-xs">
                          <span className="font-bold text-[#111111] dark:text-white text-sm block">
                            {currentUser?.displayName || profile.name}
                          </span>
                          <span className="text-[11px] text-neutral-500">
                            {currentUser?.email ? 'Conta Sincronizada na Nuvem' : 'Conta Local / Convidado'}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {currentUser ? (
                          <button
                            onClick={handleLogout}
                            className="px-4 py-2 bg-[#111111] text-white font-semibold text-xs rounded-full flex items-center gap-1.5"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Sair</span>
                          </button>
                        ) : (
                          <button
                            onClick={handleGoogleLogin}
                            className="px-4 py-2 bg-[#FF5A36] hover:bg-[#e84c29] text-white font-bold text-xs rounded-full flex items-center gap-1.5"
                          >
                            <LogIn className="w-3.5 h-3.5" />
                            <span>Entrar com Google</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <PWAInstallButton variant="banner" />

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="text-[11px] text-neutral-500 block mb-1">Nome</label>
                        <input
                          type="text"
                          value={profile.name}
                          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                          className="w-full px-3.5 py-2 bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-neutral-500 block mb-1">
                          Meta Glicêmica (mg/dL)
                        </label>
                        <input
                          type="number"
                          value={profile.targetBg}
                          onChange={(e) =>
                            setProfile({ ...profile, targetBg: Number(e.target.value) })
                          }
                          className="w-full px-3.5 py-2 bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-neutral-500 block mb-1">
                          Fator Sensibilidade (ISF)
                        </label>
                        <input
                          type="number"
                          value={profile.isf}
                          onChange={(e) => setProfile({ ...profile, isf: Number(e.target.value) })}
                          className="w-full px-3.5 py-2 bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-neutral-500 block mb-1">
                          Relação Insulina/CHO (Tarde)
                        </label>
                        <input
                          type="number"
                          value={profile.icrAfternoon}
                          onChange={(e) =>
                            setProfile({ ...profile, icrAfternoon: Number(e.target.value) })
                          }
                          className="w-full px-3.5 py-2 bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl text-xs font-mono font-bold"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const data = JSON.stringify(
                          { profile, readings, meals, doses, reminders },
                          null,
                          2
                        );
                        const blob = new Blob([data], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `minha_glico_backup_${new Date()
                          .toISOString()
                          .slice(0, 10)}.json`;
                        a.click();
                      }}
                      className="w-full py-3 bg-[#111111] dark:bg-[#FF5A36] text-white font-bold text-xs rounded-full flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Exportar Backup JSON</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ============================================================== */}
          {/* PÁGINA: ROTINA & OBJETIVOS DIÁRIOS                            */}
          {/* ============================================================== */}
          {activePage === 'routine' && (
            <motion.div
              key="routine"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <DailyRoutineView
                routineLog={routineLog}
                routineHistory={routineHistory}
                selectedRoutineDate={selectedRoutineDate}
                onSelectRoutineDate={(dateStr) => setSelectedRoutineDate(dateStr)}
                onUpdateRoutine={handleUpdateRoutine}
                enabledGoals={enabledRoutineGoals}
                onToggleGoalEnabled={handleToggleGoalEnabled}
                profile={profile}
                readings={readings}
                latestReading={latestReading}
                reminders={reminders}
                moments={effectiveMoments}
                onToggleReminder={(id) => {
                  const updated = reminders.map((r) =>
                    r.id === id ? { ...r, enabled: !r.enabled } : r
                  );
                  setReminders(updated);
                }}
                onDeleteReminder={handleDeleteReminder}
                onAddReminder={(r) => {
                  setReminders([r, ...reminders]);
                  if (currentUser) saveReminderToFirestore(currentUser.uid, r);
                }}
                onOpenManualReading={() => setIsManualReadingModalOpen(true)}
                onOpenRemindersPage={() => setActivePage('reminders')}
                isDark={isDark}
              />
            </motion.div>
          )}

          {/* ============================================================== */}
          {/* PÁGINA: RELATÓRIOS CLÍNICOS & PERFIL AGP                      */}
          {/* ============================================================== */}
          {activePage === 'reports' && (
            <motion.div
              key="reports"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <ReportsClinicalView
                readings={readings}
                meals={meals}
                doses={doses}
                profile={profile}
                isDark={isDark}
                onOpenReportModal={() => setIsReportModalOpen(true)}
              />
            </motion.div>
          )}

          {/* ============================================================== */}
          {/* PÁGINA: CONTROLE DE PESO & IMC                                 */}
          {/* ============================================================== */}
          {activePage === 'weight' && (
            <motion.div
              key="weight"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="space-y-4"
            >
              <WeightTrackerCard
                weights={weights}
                onAddWeight={handleAddWeight}
                onDeleteWeight={handleDeleteWeight}
                userHeightCm={profile.heightCm || 172}
                onUpdateHeight={handleUpdateHeight}
                readings={readings}
                isDark={isDark}
              />
            </motion.div>
          )}

          {/* ============================================================== */}
          {/* PÁGINA: METAS DE TRATAMENTO & PERFIL                          */}
          {/* ============================================================== */}
          {activePage === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="space-y-4"
            >
              <div className="bg-white dark:bg-[#161619] rounded-[28px] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#FF5A36]/15 text-[#FF5A36] flex items-center justify-center font-bold shrink-0">
                      <Settings className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base sm:text-lg text-[#111111] dark:text-white tracking-tight">
                        Configurações Gerais & Tratamento
                      </h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Gerencie suas metas de glicemia, parâmetros de insulina, backup e redefinição total
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] text-neutral-500 block mb-1">Nome do Paciente</label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl text-xs font-semibold text-[#111111] dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-500 block mb-1">Tipo de Diabetes</label>
                    <select
                      value={profile.diabetesType}
                      onChange={(e) => setProfile({ ...profile, diabetesType: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl text-xs font-semibold text-[#111111] dark:text-white"
                    >
                      <option value="dm1">Diabetes Tipo 1 (DM1)</option>
                      <option value="dm2">Diabetes Tipo 2 (DM2)</option>
                      <option value="gestacional">Diabetes Gestacional</option>
                      <option value="lada">LADA</option>
                      <option value="mody">MODY / Outro</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-500 block mb-1">Glicemia Alvo (mg/dL)</label>
                    <input
                      type="number"
                      value={profile.targetBg}
                      onChange={(e) => setProfile({ ...profile, targetBg: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl text-xs font-mono font-bold text-[#111111] dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-500 block mb-1">Fator Sensibilidade (ISF)</label>
                    <input
                      type="number"
                      value={profile.isf}
                      onChange={(e) => setProfile({ ...profile, isf: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl text-xs font-mono font-bold text-[#111111] dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-500 block mb-1">Relação I:C Café (1U / X g)</label>
                    <input
                      type="number"
                      value={profile.icrMorning}
                      onChange={(e) => setProfile({ ...profile, icrMorning: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl text-xs font-mono font-bold text-[#111111] dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-500 block mb-1">Relação I:C Almoço (1U / X g)</label>
                    <input
                      type="number"
                      value={profile.icrAfternoon}
                      onChange={(e) => setProfile({ ...profile, icrAfternoon: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl text-xs font-mono font-bold text-[#111111] dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-500 block mb-1">Insulina Rápida / Ultrarrápida</label>
                    <input
                      type="text"
                      value={profile.rapidInsulinName}
                      onChange={(e) => setProfile({ ...profile, rapidInsulinName: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl text-xs font-semibold text-[#111111] dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-500 block mb-1">Insulina Basal</label>
                    <input
                      type="text"
                      value={profile.basalInsulinName}
                      onChange={(e) => setProfile({ ...profile, basalInsulinName: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl text-xs font-semibold text-[#111111] dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-500 block mb-1">Contato de Emergência</label>
                    <input
                      type="text"
                      value={profile.emergencyContactName}
                      onChange={(e) => setProfile({ ...profile, emergencyContactName: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl text-xs font-semibold text-[#111111] dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-500 block mb-1">Telefone de Emergência</label>
                    <input
                      type="text"
                      value={profile.emergencyContactPhone}
                      onChange={(e) => setProfile({ ...profile, emergencyContactPhone: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl text-xs font-mono font-bold text-[#111111] dark:text-white"
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    localStorage.setItem('mg_profile', JSON.stringify(profile));
                    if (currentUser) saveProfileToFirestore(currentUser.uid, profile);
                    triggerToast('Configurações Salvas', 'Parâmetros de tratamento atualizados.');
                  }}
                  className="w-full py-3 bg-[#FF5A36] hover:bg-[#e84c29] text-white font-bold text-xs rounded-full transition shadow-xs"
                >
                  Salvar Parâmetros
                </button>
              </div>

              {/* Zona de Redefinição / Zerar Tudo com Confirmação em 2 Etapas */}
              <div className="bg-white dark:bg-[#161619] rounded-[28px] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-red-500/20 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-extrabold text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                      <Trash2 className="w-4 h-4" />
                      <span>Zerar Tudo e Recomeçar do Zero</span>
                    </h4>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                      Apaga todas as medições de glicemia, refeições, doses de insulina, pesos, lembretes e rotina (com confirmação de segurança em duas etapas).
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsResetAllModalOpen(true)}
                  className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-full transition flex items-center justify-center gap-2 shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Zerar Tudo (Confirmação em 2 Etapas)</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* ============================================================== */}
          {/* PÁGINA: LEMBRETES, NOTIFICAÇÕES PUSH & PREFERÊNCIAS            */}
          {/* ============================================================== */}
          {activePage === 'reminders' && (
            <motion.div
              key="reminders"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="space-y-4"
            >
              {/* Card 1: Status das Notificações Push + Ícone da Logo + Preferências do Cliente */}
              <div className="bg-white dark:bg-[#161619] rounded-[28px] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#F6F6F7] dark:bg-[#222226] border border-neutral-200 dark:border-neutral-800 p-2 flex items-center justify-center shrink-0">
                      <img
                        src={getAppLogoUrl()}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = './assets/aistudio/image_573043af.png';
                        }}
                        alt="Logo Minha Glico"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base sm:text-lg text-[#111111] dark:text-white">
                        Notificações Push & Escolha do que Notificar
                      </h3>
                      <p className="text-xs text-neutral-500">
                        Todas as notificações usam a logo oficial do Minha Glico como ícone
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {notifPermission !== 'granted' ? (
                      <button
                        type="button"
                        onClick={handleRequestNotificationPermission}
                        className="px-4 py-2.5 bg-[#FF5A36] hover:bg-[#e84c29] text-white font-bold text-xs rounded-full transition shadow-xs"
                      >
                        Ativar Notificações Push
                      </button>
                    ) : (
                      <span className="px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold">
                        ● Push Ativo no Dispositivo
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleTestNotification('post_prandial')}
                      className="px-3.5 py-2 rounded-full bg-[#111111] dark:bg-white text-white dark:text-[#111111] text-xs font-bold transition"
                    >
                      Testar Push Agora
                    </button>
                  </div>
                </div>

                {/* Escolha do que o cliente quer ser notificado */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-xs sm:text-sm text-[#111111] dark:text-white">
                      Escolha o que você deseja ser notificado:
                    </h4>
                    <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationPrefs.enabled}
                        onChange={(e) => handleUpdateNotificationPref('enabled', e.target.checked)}
                        className="w-4 h-4 accent-[#FF5A36]"
                      />
                      <span>Chave Geral de Notificações</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(
                      [
                        {
                          key: 'momentAlerts',
                          title: '🩸 Horários dos Momentos da Medição',
                          desc: 'Notifica nos horários cadastrados em cada momento (Jejum, Almoço, Jantar...)',
                        },
                        {
                          key: 'postMealTimer',
                          title: '⏱️ Alerta 2h Pós-Refeição',
                          desc: 'Avise automaticamente 2 horas após salvar uma refeição',
                        },
                        {
                          key: 'basalReminder',
                          title: '💉 Lembrete de Insulina Basal',
                          desc: 'Alerta para não esquecer sua dose diária de insulina lenta',
                        },
                        {
                          key: 'hypoHyperAlerts',
                          title: '⚠️ Alertas de Hipo e Hiperglicemia',
                          desc: 'Notificação imediata quando a glicemia estiver <70 ou >250 mg/dL',
                        },
                        {
                          key: 'waterReminder',
                          title: '💧 Meta de Hidratação Diária',
                          desc: 'Lembretes para atingir sua meta de água do dia',
                        },
                        {
                          key: 'bedtimeReminder',
                          title: '🌙 Checagem Antes de Dormir',
                          desc: 'Alerta noturno para checar a glicemia de segurança',
                        },
                        {
                          key: 'customReminders',
                          title: '⏰ Meus Alarmes Personalizados',
                          desc: 'Notificar os horários personalizados criados na lista abaixo',
                        },
                      ] as const
                    ).map((pref) => {
                      const isChecked = notificationPrefs[pref.key];
                      return (
                        <div
                          key={pref.key}
                          onClick={() => handleUpdateNotificationPref(pref.key, !isChecked)}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-start justify-between gap-3 ${
                            isChecked && notificationPrefs.enabled
                              ? 'bg-[#FF5A36]/10 border-[#FF5A36]/40'
                              : 'bg-[#F6F6F7] dark:bg-[#222226] border-transparent opacity-60'
                          }`}
                        >
                          <div className="text-xs">
                            <p className="font-bold text-[#111111] dark:text-white">{pref.title}</p>
                            <p className="text-[11px] text-neutral-500 mt-0.5">{pref.desc}</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-4 h-4 accent-[#FF5A36] mt-0.5 shrink-0"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Card 2: Horários de Notificação nos Momentos da Medição */}
              <div className="bg-white dark:bg-[#161619] rounded-[28px] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-[#111111] dark:text-white">
                    Horários de Notificação nos Momentos da Medição
                  </h4>
                  <p className="text-xs text-neutral-500">
                    Defina o horário em que pretende ser notificado para cada Momento da Medição
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {effectiveMoments.map((m) => (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-2xl bg-[#F6F6F7] dark:bg-[#222226] flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-[#111111] dark:text-white truncate">
                          {m.label}
                        </p>
                        <span className="text-[10px] text-neutral-500">
                          {m.category === 'meal'
                            ? '🍽️ Refeição'
                            : m.category === 'post_meal'
                            ? '⏱️ Pós-Refeição'
                            : '🩸 Jejum / Rotina'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          type="time"
                          value={m.notifyTime || ''}
                          onChange={(e) => handleUpdateMomentNotifyTime(m.id, e.target.value)}
                          className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#161619] font-mono font-bold text-xs text-[#111111] dark:text-white"
                        />
                        {m.notifyTime && (
                          <input
                            type="checkbox"
                            checked={m.notifyEnabled !== false}
                            onChange={() => handleToggleMomentNotify(m.id)}
                            className="w-4 h-4 accent-[#FF5A36]"
                            title="Ativar/desativar notificação deste momento"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 3: Alarmes e Lembretes Extras */}
              <div className="bg-white dark:bg-[#161619] rounded-[28px] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                  <div>
                    <h3 className="font-extrabold text-base text-[#111111] dark:text-white">
                      Alarmes & Lembretes Extras
                    </h3>
                    <p className="text-xs text-neutral-500">
                      Adicione horários extras para água, medicamentos ou insulina basal
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={handleCreateCustomReminder}
                  className="p-4 bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl space-y-3"
                >
                  <h5 className="font-bold text-xs text-[#111111] dark:text-white">
                    Novo Lembrete Personalizado
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <input
                      type="text"
                      placeholder="Título (ex: Tomar Glifage, Beber Água)"
                      value={newReminderTitle}
                      onChange={(e) => setNewReminderTitle(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-full bg-white dark:bg-[#161619] text-xs text-[#111111] dark:text-white"
                      required
                    />
                    <input
                      type="time"
                      value={newReminderTime}
                      onChange={(e) => setNewReminderTime(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-full bg-white dark:bg-[#161619] text-xs font-mono font-bold text-[#111111] dark:text-white"
                      required
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#FF5A36] text-white font-bold text-xs rounded-full"
                    >
                      + Agendar Lembrete
                    </button>
                  </div>
                </form>

                <div className="space-y-2">
                  {reminders.map((r) => (
                    <div
                      key={r.id}
                      className="px-4 py-3 rounded-2xl bg-[#F6F6F7] dark:bg-[#222226] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-extrabold text-sm text-[#FF5A36]">
                          {r.timeString}
                        </span>
                        <div>
                          <p className="font-bold text-[#111111] dark:text-white">{r.title}</p>
                          <span className="text-[10px] text-neutral-500">{r.notes}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={r.enabled}
                          onChange={() => {
                            const updated = reminders.map((item) =>
                              item.id === r.id ? { ...item, enabled: !item.enabled } : item
                            );
                            setReminders(updated);
                          }}
                          className="h-4 w-4 accent-[#FF5A36]"
                        />
                        <button
                          onClick={() => handleDeleteReminder(r.id)}
                          className="p-1 text-neutral-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ============================================================== */}
      {/* FIXED BOTTOM NAVIGATION BAR (Exact 5 Essential Daily Tabs)     */}
      {/* ============================================================== */}
      <nav className="fixed bottom-3 left-0 right-0 z-40 px-3 pointer-events-none">
        <div className="max-w-md mx-auto bg-[#111111] dark:bg-[#1E1E24] text-white rounded-full p-1.5 shadow-2xl flex items-center justify-around pointer-events-auto">
          {[
            { id: 'today', label: 'Hoje', icon: Home },
            { id: 'glucose', label: 'Glicemia', icon: Droplet },
            { id: 'meals', label: 'Refeições', icon: Utensils },
            { id: 'routine', label: 'Rotina', icon: CheckCircle2 },
            { id: 'menu', label: 'Menu', icon: Menu },
          ].map((item) => {
            const Icon = item.icon;
            const isActive =
              item.id === 'menu'
                ? isSidebarOpen
                : activePage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'menu') {
                    setIsSidebarOpen(true);
                  } else {
                    setActivePage(item.id as AppPageId);
                  }
                }}
                className={`flex items-center gap-1.5 py-2 px-3 sm:px-3.5 rounded-full transition text-xs font-bold ${
                  isActive
                    ? 'bg-[#FF5A36] text-white shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className={isActive ? 'inline text-[11px]' : 'hidden sm:inline text-[11px]'}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ============================================================== */}
      {/* SIDEBAR DRAWER NAVIGATION (Complete Menu & Extended Features)  */}
      {/* ============================================================== */}
      <SidebarDrawer
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentPage={activePage}
        onNavigate={(page) => setActivePage(page)}
        profile={profile}
        currentUser={currentUser}
        onLoginGoogle={handleGoogleLogin}
        onLogout={handleLogout}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
        onOpenSos={() => setIsHypoModalOpen(true)}
        onOpenBluetooth={() => setIsBluetoothModalOpen(true)}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onOpenManualReading={() => setIsManualReadingModalOpen(true)}
      />

      {/* ============================================================== */}
      {/* MANUAL READING MODAL (Personalizar Momentos + Refeição / Pós)  */}
      {/* ============================================================== */}
      {isManualReadingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#161619] rounded-[28px] max-w-lg w-full p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in duration-150 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <h3 className="font-bold text-[#111111] dark:text-white text-base sm:text-lg tracking-tight">
                  Nova Medição de Glicemia
                </h3>
                <p className="text-[11px] text-neutral-500">
                  Personalize o momento e cadastre como Refeição (com calculadora de Bolus) ou Pós-Refeição
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsManualReadingModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F6F6F7] dark:bg-[#222226] text-neutral-500 hover:text-[#111111] dark:hover:text-white flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualReadingSubmit} className="space-y-4 my-4">
              {/* Valor da Glicemia */}
              <div>
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                  Valor da Glicemia (mg/dL) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    autoFocus
                    required
                    min="20"
                    max="600"
                    placeholder="Ex: 145"
                    value={manualBgValue}
                    onChange={(e) => setManualBgValue(e.target.value)}
                    className="w-full px-4 py-3 text-2xl font-mono font-extrabold bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-[#FF5A36] text-[#111111] dark:text-white"
                  />
                  <span className="absolute right-4 top-4 text-xs font-bold text-[#FF5A36]">
                    mg/dL
                  </span>
                </div>
              </div>

              {/* Data e Horário */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#FF5A36]" />
                    Data e Horário da Medição
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setManualDateTime(toLocalDateTimeInputString(new Date()))}
                      className="text-[10px] px-2.5 py-1 rounded-full bg-[#F6F6F7] dark:bg-[#222226] text-neutral-700 dark:text-neutral-300 hover:bg-[#FF5A36] hover:text-white font-bold transition"
                    >
                      Agora
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        setManualDateTime(toLocalDateTimeInputString(yesterday));
                      }}
                      className="text-[10px] px-2.5 py-1 rounded-full bg-[#F6F6F7] dark:bg-[#222226] text-neutral-700 dark:text-neutral-300 hover:bg-[#FF5A36] hover:text-white font-bold transition"
                    >
                      Ontem
                    </button>
                  </div>
                </div>
                <input
                  type="datetime-local"
                  required
                  value={manualDateTime}
                  onChange={(e) => setManualDateTime(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs font-mono font-bold bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl text-[#111111] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#FF5A36] cursor-pointer"
                />
              </div>

              {/* Momentos da Medição + Criar / Personalizar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    Momento da Medição *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomizingMoments(!isCustomizingMoments)}
                    className="text-[11px] font-bold text-[#FF5A36] hover:underline flex items-center gap-1"
                  >
                    <Settings className="w-3 h-3" />
                    <span>{isCustomizingMoments ? 'Fechar Personalização' : '+ Criar / Personalizar Momentos'}</span>
                  </button>
                </div>

                {/* Painel para Criar e Personalizar Momentos + Horário de Notificação */}
                {isCustomizingMoments && (
                  <div className="p-3.5 rounded-2xl bg-[#F6F6F7] dark:bg-[#222226] border border-[#FF5A36]/30 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#111111] dark:text-white">
                        Criar ou Personalizar Momentos & Notificações
                      </span>
                      <button
                        type="button"
                        onClick={handleRestoreDefaultMoments}
                        className="text-[10px] font-bold text-neutral-500 hover:text-[#FF5A36]"
                      >
                        Restaurar Padrão
                      </button>
                    </div>

                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Nome do novo momento (ex: Pré-Treino, Lanche da Manhã...)"
                        value={newMomentLabel}
                        onChange={(e) => setNewMomentLabel(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#161619] text-xs font-semibold text-[#111111] dark:text-white"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-neutral-500 block mb-1">
                            Tipo do Momento
                          </label>
                          <select
                            value={newMomentCategory}
                            onChange={(e) => setNewMomentCategory(e.target.value as MomentCategory)}
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#161619] text-xs font-bold text-[#111111] dark:text-white"
                          >
                            <option value="meal">🍽️ Refeição</option>
                            <option value="post_meal">⏱️ Pós-Refeição</option>
                            <option value="fasting">🩸 Jejum / Rotina</option>
                          </select>
                        </div>

                        {newMomentCategory === 'meal' && (
                          <div>
                            <label className="text-[10px] font-bold text-neutral-500 block mb-1">
                              Refeição Padrão
                            </label>
                            <select
                              value={newMomentDefaultMeal}
                              onChange={(e) => setNewMomentDefaultMeal(e.target.value as any)}
                              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#161619] text-xs font-bold text-[#111111] dark:text-white"
                            >
                              <option value="cafe">Café da Manhã</option>
                              <option value="almoco">Almoço</option>
                              <option value="lanche">Lanche</option>
                              <option value="jantar">Jantar</option>
                              <option value="ceia">Ceia</option>
                              <option value="outro">Outra Refeição</option>
                            </select>
                          </div>
                        )}

                        <div>
                          <label className="text-[10px] font-bold text-neutral-500 block mb-1">
                            🔔 Horário Notificação
                          </label>
                          <input
                            type="time"
                            value={newMomentNotifyTime}
                            onChange={(e) => setNewMomentNotifyTime(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#161619] text-xs font-mono font-bold text-[#111111] dark:text-white"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddCustomMoment}
                        className="w-full py-2 bg-[#FF5A36] hover:bg-[#e84c29] text-white font-bold text-xs rounded-xl transition"
                      >
                        + Adicionar Momento Personalizado
                      </button>
                    </div>

                    {/* Lista de momentos atuais para editar tipo, horário de notificação ou excluir */}
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pt-2 border-t border-neutral-200 dark:border-neutral-700">
                      <span className="text-[10px] font-bold text-neutral-500 block">
                        Defina o horário (🔔) para receber notificação push em cada momento:
                      </span>
                      {effectiveMoments.map((m) => (
                        <div
                          key={m.id}
                          className="flex flex-wrap items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#161619] text-[11px]"
                        >
                          <span className="font-bold text-[#111111] dark:text-white truncate max-w-[130px]">
                            {m.label}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                            <input
                              type="time"
                              value={m.notifyTime || ''}
                              onChange={(e) => handleUpdateMomentNotifyTime(m.id, e.target.value)}
                              title="Horário para notificar este momento"
                              className="px-2 py-0.5 rounded-lg bg-[#F6F6F7] dark:bg-[#222226] text-[10px] font-mono font-bold text-[#111111] dark:text-white"
                            />
                            <select
                              value={m.category}
                              onChange={(e) =>
                                handleChangeMomentCategory(m.id, e.target.value as MomentCategory)
                              }
                              className="px-2 py-0.5 rounded-lg bg-[#F6F6F7] dark:bg-[#222226] text-[10px] font-bold text-[#111111] dark:text-white"
                            >
                              <option value="meal">🍽️ Refeição</option>
                              <option value="post_meal">⏱️ Pós</option>
                              <option value="fasting">🩸 Jejum</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => handleDeleteMoment(m.id)}
                              className="text-neutral-400 hover:text-red-500 p-1"
                              title="Remover momento"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Botões de seleção do Momento da Medição */}
                <div className="grid grid-cols-2 gap-2">
                  {effectiveMoments.map((m) => {
                    const isSelected = manualContext === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelectManualMoment(m)}
                        className={`py-2.5 px-3 rounded-2xl text-xs font-bold transition flex items-center justify-between gap-1.5 ${
                          isSelected
                            ? 'bg-[#FF5A36] text-white shadow-sm'
                            : 'bg-[#F6F6F7] dark:bg-[#222226] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                        }`}
                      >
                        <span className="truncate">{m.label}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {m.notifyTime && m.notifyEnabled !== false && (
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ${
                                isSelected
                                  ? 'bg-white/25 text-white'
                                  : 'bg-[#FF5A36]/15 text-[#FF5A36]'
                              }`}
                            >
                              🔔{m.notifyTime}
                            </span>
                          )}
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-full shrink-0 ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-black/5 dark:bg-white/10 text-neutral-500 dark:text-neutral-400'
                            }`}
                          >
                            {m.category === 'meal' ? 'Refeição' : m.category === 'post_meal' ? 'Pós' : 'Jejum'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Escolha do Tipo de Registro: Refeição vs Pós-Refeição / Apenas Medição */}
              <div className="p-3.5 rounded-2xl bg-[#F6F6F7] dark:bg-[#222226] space-y-3">
                <label className="text-xs font-bold text-[#111111] dark:text-white block">
                  Como deseja cadastrar este momento?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setManualFlowMode('meal')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      manualFlowMode === 'meal'
                        ? 'bg-[#FF5A36] text-white shadow-xs'
                        : 'bg-white dark:bg-[#161619] text-neutral-600 dark:text-neutral-300'
                    }`}
                  >
                    <Utensils className="w-3.5 h-3.5" />
                    <span>Refeição (Ir p/ Bolus)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualFlowMode('post_meal')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      manualFlowMode === 'post_meal'
                        ? 'bg-[#111111] dark:bg-white text-white dark:text-[#111111] shadow-xs'
                        : 'bg-white dark:bg-[#161619] text-neutral-600 dark:text-neutral-300'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Pós-Refeição / Medição</span>
                  </button>
                </div>

                {/* FLUXO 1: SE FOR UMA REFEIÇÃO */}
                {manualFlowMode === 'meal' && (
                  <div className="space-y-3 pt-2 border-t border-neutral-200/70 dark:border-neutral-700/60 animate-in fade-in">
                    <div>
                      <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 block mb-1.5">
                        Qual é a refeição? *
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(
                          [
                            { id: 'cafe', label: 'Café da Manhã' },
                            { id: 'almoco', label: 'Almoço' },
                            { id: 'lanche', label: 'Lanche' },
                            { id: 'jantar', label: 'Jantar' },
                            { id: 'ceia', label: 'Ceia' },
                            { id: 'outro', label: 'Outra' },
                          ] as const
                        ).map((mt) => (
                          <button
                            key={mt.id}
                            type="button"
                            onClick={() => setManualSelectedMealType(mt.id)}
                            className={`py-2 px-2 rounded-xl text-[11px] font-bold transition ${
                              manualSelectedMealType === mt.id
                                ? 'bg-[#111111] dark:bg-white text-white dark:text-[#111111]'
                                : 'bg-white dark:bg-[#161619] text-neutral-600 dark:text-neutral-300'
                            }`}
                          >
                            {mt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Opção de Cadastrar os Alimentos (Redireciona direto para a página de Refeições!) */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 block">
                        Deseja cadastrar os alimentos para calcular a correção exata?
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={handleRedirectFromModalToMealsPage}
                          className="py-2.5 px-3 rounded-xl text-xs font-bold transition bg-[#FF5A36] hover:bg-[#e84c29] text-white shadow-xs flex items-center justify-center gap-1.5"
                        >
                          <Utensils className="w-3.5 h-3.5 shrink-0" />
                          <span>Sim, cadastrar alimentos</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setManualRegisterMealFoods(false)}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition ${
                            !manualRegisterMealFoods
                              ? 'bg-[#111111] dark:bg-white text-white dark:text-[#111111]'
                              : 'bg-white dark:bg-[#161619] text-neutral-600 dark:text-neutral-300'
                          }`}
                        >
                          Não cadastrar alimentos
                        </button>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#FF5A36]/10 text-[#FF5A36] text-[11px] font-semibold flex items-center gap-2">
                      <Calculator className="w-4 h-4 shrink-0" />
                      <span>
                        Ao clicar em <strong>Sim, cadastrar alimentos</strong>, sua medição será salva e você será levado direto para a <strong>Página de Refeições</strong> (sem poluir este modal).
                      </span>
                    </div>
                  </div>
                )}

                {/* FLUXO 2: SE FOR SOMENTE PÓS-REFEIÇÃO OU MEDIÇÃO ISOLADA */}
                {manualFlowMode === 'post_meal' && (
                  <div className="space-y-3 pt-2 border-t border-neutral-200/70 dark:border-neutral-700/60 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#111111] dark:text-white flex items-center gap-1.5">
                        <Syringe className="w-3.5 h-3.5 text-[#FF5A36]" />
                        <span>Aplicou insulina nesta medição pós-refeição?</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setManualDidApplyInsulin(false);
                          setManualInsulinUnits('');
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition ${
                          !manualDidApplyInsulin
                            ? 'bg-[#111111] dark:bg-white text-white dark:text-[#111111] shadow-xs'
                            : 'bg-white dark:bg-[#161619] text-neutral-600 dark:text-neutral-300'
                        }`}
                      >
                        Não apliquei
                      </button>
                      <button
                        type="button"
                        onClick={() => setManualDidApplyInsulin(true)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition ${
                          manualDidApplyInsulin
                            ? 'bg-[#FF5A36] text-white shadow-xs'
                            : 'bg-white dark:bg-[#161619] text-neutral-600 dark:text-neutral-300'
                        }`}
                      >
                        Sim, informar dose
                      </button>
                    </div>

                    {manualDidApplyInsulin && (
                      <div className="space-y-2.5 pt-2 border-t border-neutral-200/70 dark:border-neutral-700/60 animate-in fade-in">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 block mb-1">
                              Qual dose aplicada (U) *
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              min="0.5"
                              max="150"
                              required={manualDidApplyInsulin}
                              placeholder="Ex: 4.0"
                              value={manualInsulinUnits}
                              onChange={(e) => setManualInsulinUnits(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#161619] text-sm font-mono font-extrabold text-[#111111] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#FF5A36]"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 block mb-1">
                              Tipo de Insulina
                            </label>
                            <select
                              value={manualInsulinType}
                              onChange={(e) => setManualInsulinType(e.target.value as 'rapid' | 'basal')}
                              className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-[#161619] text-xs font-bold text-[#111111] dark:text-white"
                            >
                              <option value="rapid">Rápida ({profile.rapidInsulinName})</option>
                              <option value="basal">Basal ({profile.basalInsulinName})</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 flex-wrap">
                          {[2, 4, 6, 8, 10, 18].map((u) => (
                            <button
                              key={u}
                              type="button"
                              onClick={() => setManualInsulinUnits(String(u))}
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold transition ${
                                Number(manualInsulinUnits) === u
                                  ? 'bg-[#FF5A36] text-white'
                                  : 'bg-white dark:bg-[#161619] text-neutral-600 dark:text-neutral-300'
                              }`}
                            >
                              {u}U
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                  Observações
                </label>
                <input
                  type="text"
                  placeholder="Ex: após caminhada, estresse..."
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs bg-[#F6F6F7] dark:bg-[#222226] rounded-2xl text-[#111111] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#FF5A36]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsManualReadingModalOpen(false)}
                  className="py-2.5 px-4 text-xs font-bold bg-[#F6F6F7] dark:bg-[#222226] text-neutral-700 dark:text-neutral-300 rounded-full transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-[#FF5A36] hover:bg-[#e84c29] text-white font-bold text-xs rounded-full shadow-xs transition"
                >
                  {manualFlowMode === 'meal'
                    ? manualRegisterMealFoods
                      ? 'Salvar Medição & Ir para Página de Refeições'
                      : 'Salvar Refeição + Medição & Ir para Calculadora de Bolus'
                    : manualDidApplyInsulin
                    ? 'Salvar Medição + Aplicação'
                    : 'Salvar Medição'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Emergency Hypo Modal */}
      <HypoEmergencyModal
        isOpen={isHypoModalOpen}
        onClose={() => setIsHypoModalOpen(false)}
        currentBg={latestReading?.value}
        profile={profile}
        onLogNewReading={(val) => {
          handleAddReading({
            timestamp: new Date().toISOString(),
            value: val,
            source: 'manual',
            deviceName: 'Reteste Regra dos 15',
            context: 'other',
            notes: 'Reteste pós resgate com 15g de carboidrato',
          });
        }}
      />

      {/* Bluetooth & CGM NFC Scanner Modal */}
      <BluetoothScannerModal
        isOpen={isBluetoothModalOpen}
        onClose={() => setIsBluetoothModalOpen(false)}
        onReadingReceived={(reading) => handleAddReading(reading)}
      />

      {/* AI Plate Scanner Modal */}
      <AiMealScannerModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onApplyMealItems={(items, title, aiNotes, impact) => {
          setCurrentPlate(items);
          setMealTitle(title);
          setAiNotesForCurrentMeal(aiNotes || '');
          setGlycemicImpactCurrentMeal(impact || '');
          setActiveTab('meals');
          setMealsSubTab('plate');
        }}
      />

      {/* Printable Clinical Report Modal */}
      <PrintableReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        profile={profile}
        readings={readings}
        meals={meals}
        doses={doses}
      />

      {/* Auth / Register Modal (when switching accounts or triggered from guest mode) */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-md my-auto">
            <button
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-4 right-4 z-50 w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white flex items-center justify-center shadow-md transition"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
            <AuthScreen
              onAuthSuccess={(newProfile) => {
                setIsGuest(false);
                localStorage.removeItem('mg_is_guest');
                setIsAuthModalOpen(false);
                if (newProfile) {
                  setProfile((prev) => ({ ...prev, ...newProfile }));
                }
              }}
              onContinueAsGuest={() => {
                setIsGuest(true);
                setIsAuthModalOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Two-Step Confirmation Modal to Reset All Data */}
      <ResetAllModal
        isOpen={isResetAllModalOpen}
        onClose={() => setIsResetAllModalOpen(false)}
        onConfirmResetAll={handleResetAllData}
        counts={{
          readings: readings.length,
          meals: meals.length,
          doses: doses.length,
          weights: weights.length,
          reminders: reminders.length,
        }}
        isCloudConnected={Boolean(currentUser)}
      />
    </div>
  );
}
