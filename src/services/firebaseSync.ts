import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  GlucoseReading,
  MealRecord,
  InsulinDoseRecord,
  PatientProfile,
  ReminderItem,
  WeightRecord,
} from '../types';
import { isLegacyDemoId } from '../data/initialData';

export interface UserCloudData {
  profile?: PatientProfile;
  readings: GlucoseReading[];
  meals: MealRecord[];
  doses: InsulinDoseRecord[];
  reminders: ReminderItem[];
  weights: WeightRecord[];
}

/**
 * Loads all data for a specific authenticated user from Firestore.
 * Automatically filters out and cleans up any legacy demo/sample records.
 */
export async function loadUserDataFromFirestore(userId: string): Promise<UserCloudData> {
  const result: UserCloudData = {
    readings: [],
    meals: [],
    doses: [],
    reminders: [],
    weights: [],
  };

  // 1. Load Profile
  const profilePath = `users/${userId}`;
  try {
    const profileSnap = await getDoc(doc(db, 'users', userId));
    if (profileSnap.exists()) {
      const data = profileSnap.data() as PatientProfile;
      // Clean legacy default sample name if present
      if (data.name === 'Paciente Exemplo') {
        data.name = 'Meu Perfil';
      }
      if (data.emergencyContactName === 'Dr. Lucas (Endocrinologista)') {
        data.emergencyContactName = '';
        data.emergencyContactPhone = '';
      }
      result.profile = data;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, profilePath);
  }

  // 2. Load Readings
  const readingsPath = `users/${userId}/readings`;
  try {
    const q = query(collection(db, 'users', userId, 'readings'), orderBy('timestamp', 'desc'), limit(150));
    const snap = await getDocs(q);
    const validReadings: GlucoseReading[] = [];
    snap.docs.forEach((d) => {
      const item = d.data() as GlucoseReading;
      if (isLegacyDemoId(item.id || d.id)) {
        deleteDoc(d.ref).catch(() => {});
      } else {
        validReadings.push(item);
      }
    });
    result.readings = validReadings;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, readingsPath);
  }

  // 3. Load Meals
  const mealsPath = `users/${userId}/meals`;
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'meals'));
    const validMeals: MealRecord[] = [];
    snap.docs.forEach((d) => {
      const item = d.data() as MealRecord;
      if (isLegacyDemoId(item.id || d.id)) {
        deleteDoc(d.ref).catch(() => {});
      } else {
        validMeals.push(item);
      }
    });
    result.meals = validMeals;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, mealsPath);
  }

  // 4. Load Doses
  const dosesPath = `users/${userId}/doses`;
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'doses'));
    const validDoses: InsulinDoseRecord[] = [];
    snap.docs.forEach((d) => {
      const item = d.data() as InsulinDoseRecord;
      if (isLegacyDemoId(item.id || d.id)) {
        deleteDoc(d.ref).catch(() => {});
      } else {
        validDoses.push(item);
      }
    });
    result.doses = validDoses;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, dosesPath);
  }

  // 5. Load Reminders
  const remindersPath = `users/${userId}/reminders`;
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'reminders'));
    const validReminders: ReminderItem[] = [];
    snap.docs.forEach((d) => {
      const item = d.data() as ReminderItem;
      if (isLegacyDemoId(item.id || d.id)) {
        deleteDoc(d.ref).catch(() => {});
      } else {
        validReminders.push(item);
      }
    });
    result.reminders = validReminders;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, remindersPath);
  }

  // 6. Load Weights
  const weightsPath = `users/${userId}/weights`;
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'weights'));
    const validWeights: WeightRecord[] = [];
    snap.docs.forEach((d) => {
      const item = d.data() as WeightRecord;
      if (isLegacyDemoId(item.id || d.id)) {
        deleteDoc(d.ref).catch(() => {});
      } else {
        validWeights.push(item);
      }
    });
    result.weights = validWeights;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, weightsPath);
  }

  return result;
}

/**
 * Saves or updates profile in Firestore
 */
export async function saveProfileToFirestore(userId: string, profile: PatientProfile): Promise<void> {
  const path = `users/${userId}`;
  try {
    await setDoc(doc(db, 'users', userId), {
      ...profile,
      userId,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Saves a glucose reading in Firestore
 */
export async function saveReadingToFirestore(userId: string, reading: GlucoseReading): Promise<void> {
  const path = `users/${userId}/readings/${reading.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'readings', reading.id), {
      ...reading,
      userId,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Deletes a glucose reading from Firestore
 */
export async function deleteReadingFromFirestore(userId: string, readingId: string): Promise<void> {
  const path = `users/${userId}/readings/${readingId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'readings', readingId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Saves a meal record in Firestore
 */
export async function saveMealToFirestore(userId: string, meal: MealRecord): Promise<void> {
  const path = `users/${userId}/meals/${meal.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'meals', meal.id), {
      ...meal,
      userId,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Saves an insulin dose record in Firestore
 */
export async function saveDoseToFirestore(userId: string, dose: InsulinDoseRecord): Promise<void> {
  const path = `users/${userId}/doses/${dose.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'doses', dose.id), {
      ...dose,
      userId,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Saves a reminder in Firestore
 */
export async function saveReminderToFirestore(userId: string, reminder: ReminderItem): Promise<void> {
  const path = `users/${userId}/reminders/${reminder.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'reminders', reminder.id), {
      ...reminder,
      userId,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Deletes a reminder from Firestore
 */
export async function deleteReminderFromFirestore(userId: string, reminderId: string): Promise<void> {
  const path = `users/${userId}/reminders/${reminderId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'reminders', reminderId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Saves a weight record in Firestore
 */
export async function saveWeightToFirestore(userId: string, weight: WeightRecord): Promise<void> {
  const path = `users/${userId}/weights/${weight.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'weights', weight.id), {
      ...weight,
      userId,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Deletes a weight record from Firestore
 */
export async function deleteWeightFromFirestore(userId: string, weightId: string): Promise<void> {
  const path = `users/${userId}/weights/${weightId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'weights', weightId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Permanently deletes all user subcollection documents in Firestore and resets profile
 */
export async function resetAllUserDataInFirestore(
  userId: string,
  cleanProfile: PatientProfile
): Promise<void> {
  const subcollections = ['readings', 'meals', 'doses', 'reminders', 'weights'] as const;

  for (const subcol of subcollections) {
    const subPath = `users/${userId}/${subcol}`;
    try {
      const snap = await getDocs(collection(db, 'users', userId, subcol));
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, subPath);
    }
  }

  await saveProfileToFirestore(userId, cleanProfile);
}
