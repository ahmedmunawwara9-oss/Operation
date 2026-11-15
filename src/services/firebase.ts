import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut as fbSignOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Trip, ScheduleArchive } from '../types';

// Bootstrapped General Manager email from runtime
export const BOOTSTRAPPED_GM_EMAIL = 'ahmedmunawwara9@gmail.com';

// Initialize Primary Firebase App
const app = getApps().find((a) => a.name === '[DEFAULT]') || initializeApp(firebaseConfig);

// Secondary Firebase App for creating new user accounts without signing out the General Manager
const SECONDARY_APP_NAME = 'dmtc-user-manager';
const secondaryApp =
  getApps().find((a) => a.name === SECONDARY_APP_NAME) ||
  initializeApp(firebaseConfig, SECONDARY_APP_NAME);

// Initialize Firestore with custom database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Auth instances
export const auth = getAuth(app);
export const secondaryAuth = getAuth(secondaryApp);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

class SafeFirestoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SafeFirestoreError';
  }
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new SafeFirestoreError('تعذّرت العملية. تحقق من صلاحياتك أو أعد المحاولة.');
}

export type UserRole = 'general_manager' | 'operations_manager' | 'supervisor' | 'operator';

export const ROLE_TITLES: Record<UserRole, string> = {
  general_manager: 'مدير عام',
  operations_manager: 'مدير تشغيل',
  supervisor: 'مشرف تشغيل',
  operator: 'مراقب حركة',
};

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  roleTitle: string;
  isActive: boolean;
  activatedAt?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  photoURL?: string;
}

function generateStrongRandomPassword(length = 16): string {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*_-';
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset[randomValues[i] % charset.length];
  }
  return password;
}

function formatFirestoreDate(val: unknown): string | undefined {
  if (!val) return undefined;
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (
    typeof val === 'object' &&
    val !== null &&
    'toDate' in val &&
    typeof (val as { toDate: () => Date }).toDate === 'function'
  ) {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return undefined;
}

function mapFirebaseAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code || '';

  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found'
  ) {
    return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
  }
  if (code === 'auth/invalid-email') {
    return 'صيغة البريد الإلكتروني غير صحيحة.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'هذا البريد الإلكتروني مسجل مسبقاً في النظام.';
  }
  if (code === 'auth/weak-password') {
    return 'كلمة المرور ضعيفة جداً. يجب أن تكون 6 أحرف أو أرقام على الأقل.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'AUTH_EMAIL_PROVIDER_DISABLED';
  }
  if (code === 'auth/too-many-requests') {
    return 'تم حظر المحاولات مؤقتاً لكثرة الطلبات. يرجى الانتظار قليلاً.';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.';
  }
  if (code === 'auth/network-request-failed') {
    return 'تعذر الاتصال بالشبكة. يرجى التحقق من اتصال الإنترنت.';
  }
  return 'حدث خطأ غير متوقع أثناء المصادقة.';
}

/**
 * Fetches the user's profile from Firestore or bootstraps the General Manager account.
 * Returns null and signs out if the user is not registered/authorized or is inactive.
 */
export async function fetchOrBootstrapUserProfile(
  fbUser: FirebaseUser,
  options?: { allowInactive?: boolean }
): Promise<AppUser | null> {
  const userPath = `users/${fbUser.uid}`;
  const isBootstrappedGM =
    fbUser.email?.toLowerCase() === BOOTSTRAPPED_GM_EMAIL.toLowerCase() && fbUser.emailVerified;

  try {
    const snap = await getDoc(doc(db, 'users', fbUser.uid));

    if (snap.exists()) {
      const data = snap.data();
      const role = (data.role as UserRole) || (isBootstrappedGM ? 'general_manager' : 'operator');
      let isActive = typeof data.isActive === 'boolean' ? data.isActive : isBootstrappedGM;

      // Ensure legacy bootstrapped GM doc gets updated with isActive: true
      if (isBootstrappedGM && data.isActive !== true) {
        isActive = true;
        await setDoc(doc(db, 'users', fbUser.uid), {
          userId: fbUser.uid,
          email: (data.email as string) || fbUser.email || BOOTSTRAPPED_GM_EMAIL,
          displayName: (data.displayName as string) || fbUser.displayName || 'المدير العام',
          role: 'general_manager',
          roleTitle: ROLE_TITLES.general_manager,
          isActive: true,
          activatedAt: serverTimestamp(),
          createdBy: (data.createdBy as string) || fbUser.uid,
          createdAt: data.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        }).catch((err) => {
          console.warn('Legacy GM profile update failed:', err);
        });
      }

      if (!isActive && !options?.allowInactive) {
        await fbSignOut(auth);
        return null;
      }

      return {
        uid: fbUser.uid,
        email: (data.email as string) || fbUser.email || '',
        displayName: (data.displayName as string) || fbUser.displayName || 'مستخدم النظام',
        role,
        roleTitle: (data.roleTitle as string) || ROLE_TITLES[role],
        isActive,
        activatedAt: formatFirestoreDate(data.activatedAt),
        createdBy: data.createdBy as string | undefined,
        createdAt: formatFirestoreDate(data.createdAt),
        updatedAt: formatFirestoreDate(data.updatedAt),
        photoURL: fbUser.photoURL || undefined,
      };
    }

    // Bootstrap the General Manager profile automatically on first login
    if (isBootstrappedGM) {
      const displayName = (fbUser.displayName || 'المدير العام').slice(0, 128);
      const email = (fbUser.email || BOOTSTRAPPED_GM_EMAIL).slice(0, 256);

      try {
        await setDoc(doc(db, 'users', fbUser.uid), {
          userId: fbUser.uid,
          email,
          displayName,
          role: 'general_manager',
          roleTitle: ROLE_TITLES.general_manager,
          isActive: true,
          activatedAt: serverTimestamp(),
          createdBy: fbUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (writeErr) {
        handleFirestoreError(writeErr, OperationType.CREATE, userPath);
      }

      return {
        uid: fbUser.uid,
        email,
        displayName,
        role: 'general_manager',
        roleTitle: ROLE_TITLES.general_manager,
        isActive: true,
        createdBy: fbUser.uid,
        photoURL: fbUser.photoURL || undefined,
      };
    }

    // Not authorized / deleted from Firestore users collection
    await fbSignOut(auth);
    return null;
  } catch (error) {
    if (error instanceof SafeFirestoreError) {
      throw error;
    }
    handleFirestoreError(error, OperationType.GET, userPath);
  }
}

let activeAuthTransitions = 0;

export function isAuthTransitionInProgress(): boolean {
  return activeAuthTransitions > 0;
}

/**
 * Email & Password Sign-In via Firebase Auth + Firestore profile & activation verification
 */
export async function loginWithEmailPassword(email: string, password: string): Promise<AppUser> {
  const cleanEmail = email.trim().toLowerCase();
  activeAuthTransitions++;
  try {
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
    const profile = await fetchOrBootstrapUserProfile(cred.user, { allowInactive: true });

    if (!profile) {
      throw new Error('هذا الحساب غير مسجل أو تم حذفه من قبل المدير العام.');
    }

    if (!profile.isActive) {
      await fbSignOut(auth);
      throw new Error('تم تعطيل هذا الحساب، تواصل مع المدير العام');
    }

    return profile;
  } catch (err) {
    if (err instanceof Error && !('code' in err)) {
      throw err;
    }
    throw new Error(mapFirebaseAuthError(err));
  } finally {
    activeAuthTransitions = Math.max(0, activeAuthTransitions - 1);
  }
}

/**
 * Google Sign-In via Firebase Auth (Bootstrapped General Manager or pre-registered active user)
 */
export async function loginWithGoogle(): Promise<AppUser> {
  activeAuthTransitions++;
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    const profile = await fetchOrBootstrapUserProfile(cred.user, { allowInactive: true });
    if (!profile) {
      throw new Error(
        'هذا الحساب غير مصرح له بالدخول. يجب إنشاء الحساب من قبل المدير العام أولاً.'
      );
    }
    if (!profile.isActive) {
      await fbSignOut(auth);
      throw new Error('هذا الحساب غير مفعل حالياً. يرجى تفعيله من لوحة المدير العام.');
    }
    return profile;
  } catch (err) {
    if (err instanceof Error && !('code' in err)) {
      throw err;
    }
    throw new Error(mapFirebaseAuthError(err));
  } finally {
    activeAuthTransitions = Math.max(0, activeAuthTransitions - 1);
  }
}

/**
 * Subscribe to the live users list in Firestore (General Manager only)
 */
export function subscribeToUsers(
  currentUser: AppUser,
  onUsers: (users: AppUser[]) => void,
  onError: (err: Error) => void
): () => void {
  const isBootstrappedGM =
    currentUser.email.toLowerCase() === BOOTSTRAPPED_GM_EMAIL.toLowerCase();

  const usersRef = collection(db, 'users');
  const q = isBootstrappedGM
    ? usersRef
    : query(usersRef, where('createdBy', '==', currentUser.uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: AppUser[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        const role = (d.role as UserRole) || 'operator';
        return {
          uid: (d.userId as string) || docSnap.id,
          email: (d.email as string) || '',
          displayName: (d.displayName as string) || '',
          role,
          roleTitle: (d.roleTitle as string) || ROLE_TITLES[role],
          isActive: typeof d.isActive === 'boolean' ? d.isActive : true,
          activatedAt: formatFirestoreDate(d.activatedAt),
          createdBy: d.createdBy as string | undefined,
          createdAt: formatFirestoreDate(d.createdAt),
          updatedAt: formatFirestoreDate(d.updatedAt),
        };
      });

      list.sort((a, b) => {
        if (a.role === 'general_manager' && b.role !== 'general_manager') return -1;
        if (b.role === 'general_manager' && a.role !== 'general_manager') return 1;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });

      onUsers(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'users');
      } catch (wrappedErr) {
        onError(wrappedErr instanceof Error ? wrappedErr : new Error(String(wrappedErr)));
      }
    }
  );
}

/**
 * Creates a new user account via Firebase Auth with a cryptographically random password,
 * stores their active profile & role in Firestore, and sends a password reset email so
 * the user can set their own password.
 */
export async function createUserByGeneralManager(params: {
  displayName: string;
  email: string;
  role: UserRole;
}): Promise<AppUser> {
  const cleanName = params.displayName.trim().slice(0, 128);
  const cleanEmail = params.email.trim().toLowerCase().slice(0, 256);
  const role = params.role;
  const roleTitle = ROLE_TITLES[role];
  const creatorUid = auth.currentUser?.uid || '';

  if (!creatorUid) {
    throw new Error('يجب تسجيل الدخول كمدير عام لإنشاء حسابات جديدة.');
  }
  if (!cleanName || cleanName.length < 1) {
    throw new Error('يرجى إدخال اسم المستخدم الكامل.');
  }
  if (!cleanEmail || cleanEmail.length < 3 || !cleanEmail.includes('@')) {
    throw new Error('يرجى إدخال بريد إلكتروني صحيح.');
  }

  const generatedPassword = generateStrongRandomPassword(16);

  let newUid = '';
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, generatedPassword);
    newUid = cred.user.uid;
    await updateProfile(cred.user, { displayName: cleanName });
    await fbSignOut(secondaryAuth);
  } catch (authErr) {
    throw new Error(mapFirebaseAuthError(authErr));
  }

  const payload: Record<string, unknown> = {
    userId: newUid,
    email: cleanEmail,
    displayName: cleanName,
    role,
    roleTitle,
    isActive: true,
    activatedAt: serverTimestamp(),
    createdBy: creatorUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'users', newUid), payload);
  } catch (fsErr) {
    console.error('Firestore user profile creation failed after Auth creation:', {
      email: cleanEmail,
      uid: newUid,
      error: fsErr instanceof Error ? fsErr.message : String(fsErr),
    });
    throw new Error(
      `تم إنشاء حساب المصادقة للبريد ${cleanEmail} لكن تعذّر حفظ بياناته في قاعدة البيانات؛ يرجى مراجعة الحساب وحذفه يدوياً من لوحة المصادقة قبل إعادة المحاولة.`
    );
  }

  try {
    await sendPasswordResetEmail(auth, cleanEmail);
  } catch (resetErr) {
    console.error('Password reset email error after user creation:', {
      email: cleanEmail,
      error: resetErr instanceof Error ? resetErr.message : String(resetErr),
    });
    throw new Error(
      `تم إنشاء الحساب للبريد ${cleanEmail} لكن تعذّر إرسال رابط ضبط كلمة المرور إلى البريد.`
    );
  }

  const nowIso = new Date().toISOString();
  return {
    uid: newUid,
    email: cleanEmail,
    displayName: cleanName,
    role,
    roleTitle,
    isActive: true,
    activatedAt: nowIso,
    createdBy: creatorUid,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

/**
 * Toggles user account activation status directly inside the site (General Manager only)
 */
export async function toggleUserActivationByGeneralManager(
  targetUid: string,
  activate: boolean
): Promise<void> {
  if (!activate && targetUid === auth.currentUser?.uid) {
    throw new Error('لا يمكن تعطيل حساب المدير العام النشط حالياً.');
  }

  const userPath = `users/${targetUid}`;
  const updates: Record<string, unknown> = {
    isActive: activate,
    updatedAt: serverTimestamp(),
  };

  if (activate) {
    updates.activatedAt = serverTimestamp();
  }

  try {
    await updateDoc(doc(db, 'users', targetUid), updates);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, userPath);
  }
}

/**
 * Updates a user's operational role in Firestore
 */
export async function updateUserRoleByGeneralManager(
  targetUid: string,
  newRole: UserRole
): Promise<void> {
  const userPath = `users/${targetUid}`;
  try {
    await updateDoc(doc(db, 'users', targetUid), {
      role: newRole,
      roleTitle: ROLE_TITLES[newRole],
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, userPath);
  }
}

/**
 * Deletes a user's profile from Firestore, revoking their system access immediately
 */
export async function deleteUserByGeneralManager(targetUid: string): Promise<void> {
  if (targetUid === auth.currentUser?.uid) {
    throw new Error('لا يمكن حذف حساب المدير العام النشط حالياً.');
  }
  const userPath = `users/${targetUid}`;
  try {
    await deleteDoc(doc(db, 'users', targetUid));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, userPath);
  }
}

/**
 * Signs out the current authenticated user
 */
export async function logoutUser(): Promise<void> {
  try {
    await fbSignOut(auth);
  } catch (err) {
    console.warn('Sign out warning:', err);
  }
}

function serializeTripForArchive(trip: Trip): Record<string, unknown> {
  const clean: Record<string, unknown> = {
    id: String(trip.id || '').slice(0, 128),
    tripNumber: String(trip.tripNumber || '').slice(0, 64),
    busId: String(trip.busId || 'غير محدد').slice(0, 64),
    driverName: String(trip.driverName || 'غير محدد').slice(0, 128),
    origin: String(trip.origin || '').slice(0, 160),
    destination: String(trip.destination || '').slice(0, 160),
    tripDate: String(trip.tripDate || '').slice(0, 32),
    departureTime: String(trip.departureTime || '').slice(0, 16),
    arrivalTime: String(trip.arrivalTime || '').slice(0, 16),
    departureDateTime: String(trip.departureDateTime || '').slice(0, 64),
    arrivalDateTime: String(trip.arrivalDateTime || '').slice(0, 64),
    isOvernight: Boolean(trip.isOvernight),
    durationMinutes: Number.isFinite(trip.durationMinutes) ? Math.round(trip.durationMinutes) : 0,
    status: String(trip.status || 'scheduled_upcoming').slice(0, 64),
    progress: typeof trip.progress === 'number' ? trip.progress : 0,
    elapsedMinutes: typeof trip.elapsedMinutes === 'number' ? Math.round(trip.elapsedMinutes) : 0,
    remainingMinutes: typeof trip.remainingMinutes === 'number' ? Math.round(trip.remainingMinutes) : 0,
    conflicts: [],
  };

  if (trip.plateNumber) clean.plateNumber = String(trip.plateNumber).slice(0, 64);
  if (trip.driverPhone) clean.driverPhone = String(trip.driverPhone).slice(0, 32);
  if (trip.route) clean.route = String(trip.route).slice(0, 160);
  if (trip.shift) clean.shift = String(trip.shift).slice(0, 64);
  if (typeof trip.passengerCount === 'number' && !isNaN(trip.passengerCount)) {
    clean.passengerCount = Math.round(trip.passengerCount);
  }
  if (trip.notes) clean.notes = String(trip.notes).slice(0, 300);
  if (trip.actualDepartureTime) clean.actualDepartureTime = String(trip.actualDepartureTime).slice(0, 32);
  if (trip.actualArrivalTime) clean.actualArrivalTime = String(trip.actualArrivalTime).slice(0, 32);
  if (trip.actualStatus) clean.actualStatus = trip.actualStatus;
  if (typeof trip.delayMinutes === 'number' && !isNaN(trip.delayMinutes)) {
    clean.delayMinutes = Math.round(trip.delayMinutes);
  }
  if (trip.isElapsedAtImport) clean.isElapsedAtImport = true;

  return clean;
}

/**
 * Subscribe to archived trip schedules in Firestore (shared across authorized team members)
 */
export function subscribeToScheduleArchives(
  onArchives: (archives: ScheduleArchive[]) => void,
  onError: (err: Error) => void
): () => void {
  const archivesRef = collection(db, 'schedule_archives');
  const q = query(archivesRef, where('visibility', '==', 'team'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: ScheduleArchive[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          archiveId: (d.archiveId as string) || docSnap.id,
          title: (d.title as string) || 'جدول رحلات محفوظ',
          scheduleDate: (d.scheduleDate as string) || '',
          notes: d.notes as string | undefined,
          visibility: 'team',
          totalTrips: typeof d.totalTrips === 'number' ? d.totalTrips : 0,
          totalBuses: typeof d.totalBuses === 'number' ? d.totalBuses : 0,
          completedTrips: typeof d.completedTrips === 'number' ? d.completedTrips : 0,
          trips: Array.isArray(d.trips) ? (d.trips as Trip[]) : [],
          createdBy: (d.createdBy as string) || '',
          createdByName: (d.createdByName as string) || 'مستخدم النظام',
          createdAt: formatFirestoreDate(d.createdAt) || new Date().toISOString(),
          updatedAt: formatFirestoreDate(d.updatedAt) || new Date().toISOString(),
        };
      });

      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      onArchives(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'schedule_archives');
      } catch (wrappedErr) {
        onError(wrappedErr instanceof Error ? wrappedErr : new Error(String(wrappedErr)));
      }
    }
  );
}

/**
 * Saves a trip schedule snapshot into Firestore under schedule_archives
 */
export async function saveScheduleToArchive(params: {
  title: string;
  scheduleDate: string;
  notes?: string;
  trips: Trip[];
  createdByName: string;
}): Promise<ScheduleArchive> {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('يجب تسجيل الدخول لحفظ الجدول في الأرشيف.');
  }

  const cleanTitle = params.title.trim().slice(0, 160);
  const cleanDate = params.scheduleDate.trim().slice(0, 32);
  const cleanNotes = params.notes ? params.notes.trim().slice(0, 500) : '';
  const cleanCreatorName = (params.createdByName || 'مستخدم النظام').trim().slice(0, 128);

  if (!cleanTitle) {
    throw new Error('يرجى إدخال عنوان للجدول قبل الحفظ في الأرشيف.');
  }
  if (!cleanDate || cleanDate.length < 4) {
    throw new Error('يرجى تحديد تاريخ التشغيل للجدول.');
  }
  if (!params.trips || params.trips.length === 0) {
    throw new Error('لا توجد رحلات حالية لحفظها في الأرشيف.');
  }
  if (params.trips.length > 500) {
    throw new Error('الحد الأقصى للرحلات في الأرشيف الواحد هو 500 رحلة.');
  }

  const archiveId = `arch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const archivePath = `schedule_archives/${archiveId}`;

  const uniqueBuses = new Set(params.trips.map((t) => t.busId).filter(Boolean)).size;
  const completedCount = params.trips.filter(
    (t) => t.status === 'completed_actual' || t.status === 'completed_scheduled'
  ).length;
  const serializedTrips = params.trips.slice(0, 500).map(serializeTripForArchive);

  const payload: Record<string, unknown> = {
    archiveId,
    title: cleanTitle,
    scheduleDate: cleanDate,
    visibility: 'team',
    totalTrips: serializedTrips.length,
    totalBuses: uniqueBuses,
    completedTrips: completedCount,
    trips: serializedTrips,
    createdBy: uid,
    createdByName: cleanCreatorName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (cleanNotes) {
    payload.notes = cleanNotes;
  }

  try {
    await setDoc(doc(db, 'schedule_archives', archiveId), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, archivePath);
  }

  const nowIso = new Date().toISOString();
  return {
    archiveId,
    title: cleanTitle,
    scheduleDate: cleanDate,
    notes: cleanNotes || undefined,
    visibility: 'team',
    totalTrips: serializedTrips.length,
    totalBuses: uniqueBuses,
    completedTrips: completedCount,
    trips: params.trips,
    createdBy: uid,
    createdByName: cleanCreatorName,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

/**
 * Deletes an archived trip schedule from Firestore
 */
export async function deleteScheduleArchive(archiveId: string): Promise<void> {
  const archivePath = `schedule_archives/${archiveId}`;
  try {
    await deleteDoc(doc(db, 'schedule_archives', archiveId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, archivePath);
  }
}
