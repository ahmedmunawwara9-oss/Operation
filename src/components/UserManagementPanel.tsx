import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Trash2,
  ShieldCheck,
  Mail,
  User,
  CheckCircle2,
  AlertCircle,
  Search,
  RefreshCw,
  Power,
  ExternalLink,
} from 'lucide-react';
import {
  AppUser,
  UserRole,
  ROLE_TITLES,
  subscribeToUsers,
  createUserByGeneralManager,
  deleteUserByGeneralManager,
  updateUserRoleByGeneralManager,
  toggleUserActivationByGeneralManager,
} from '../services/firebase';

interface UserManagementPanelProps {
  currentUser: AppUser;
}

const ROLE_BADGE_STYLES: Record<UserRole, string> = {
  general_manager: 'bg-[#483878]/10 text-[#483878] border-[#483878]/30',
  operations_manager: 'bg-[#4A9FD8]/12 text-[#483878] border-[#4A9FD8]/40',
  supervisor: 'bg-[#F5B13D]/15 text-[#483878] border-[#F5B13D]/45',
  operator: 'bg-[#E8742A]/10 text-[#E8742A] border-[#E8742A]/35',
};

export const UserManagementPanel: React.FC<UserManagementPanelProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [listError, setListError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Create form state
  const [displayName, setDisplayName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [role, setRole] = useState<UserRole>('supervisor');

  const [creating, setCreating] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isEmailProviderDisabled, setIsEmailProviderDisabled] = useState<boolean>(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Action states
  const [confirmDeleteUid, setConfirmDeleteUid] = useState<string | null>(null);
  const [deletingUid, setDeletingUid] = useState<string | null>(null);
  const [updatingRoleUid, setUpdatingRoleUid] = useState<string | null>(null);
  const [togglingActiveUid, setTogglingActiveUid] = useState<string | null>(null);

  useEffect(() => {
    setLoadingList(true);
    setListError(null);

    const unsubscribe = subscribeToUsers(
      currentUser,
      (fetchedUsers) => {
        setUsers(fetchedUsers);
        setLoadingList(false);
      },
      (err) => {
        setListError(err.message || 'تعذر تحميل قائمة المستخدمين.');
        setLoadingList(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setIsEmailProviderDisabled(false);

    try {
      setCreating(true);
      await createUserByGeneralManager({
        displayName,
        email,
        role,
      });

      setFormSuccess('تم إنشاء الحساب وإرسال رابط ضبط كلمة السر إلى البريد');
      setDisplayName('');
      setEmail('');
      setRole('supervisor');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'تعذر إنشاء الحساب.';
      if (msg === 'AUTH_EMAIL_PROVIDER_DISABLED') {
        setIsEmailProviderDisabled(true);
        setFormError(
          'يرجى تفعيل مزود الدخول (Email/Password) في إعدادات Firebase Authentication أولاً.'
        );
      } else {
        setFormError(msg);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (targetUid: string) => {
    setListError(null);
    try {
      setDeletingUid(targetUid);
      await deleteUserByGeneralManager(targetUid);
      setConfirmDeleteUid(null);
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'فشل حذف حساب المستخدم.');
    } finally {
      setDeletingUid(null);
    }
  };

  const handleRoleChange = async (targetUid: string, newRole: UserRole) => {
    setListError(null);
    try {
      setUpdatingRoleUid(targetUid);
      await updateUserRoleByGeneralManager(targetUid, newRole);
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'فشل تحديث صلاحية المستخدم.');
    } finally {
      setUpdatingRoleUid(null);
    }
  };

  const handleToggleActivation = async (userItem: AppUser) => {
    setListError(null);
    try {
      setTogglingActiveUid(userItem.uid);
      await toggleUserActivationByGeneralManager(userItem.uid, !userItem.isActive);
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'تعذر تحديث حالة تفعيل الحساب.');
    } finally {
      setTogglingActiveUid(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      u.displayName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.roleTitle.toLowerCase().includes(q)
    );
  });

  const activeCount = users.filter((u) => u.isActive).length;
  const pendingCount = users.filter((u) => !u.isActive).length;

  return (
    <div className="flex-1 flex flex-col gap-3.5 select-none">
      {/* Top Panel Header */}
      <div className="bg-white/95 dark:bg-[#131C31]/95 backdrop-blur-md rounded-2xl border border-[#A9DDF5] dark:border-slate-700 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#483878] flex items-center justify-center text-white shadow-sm">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#483878] dark:text-slate-100 tracking-tight">
              إدارة حسابات المستخدمين وتفعيل الحسابات
            </h2>
            <p className="text-xs text-[#444444] dark:text-slate-300 font-medium">
              إنشاء حسابات الموظفين، تفعيل الحسابات أو تعطيلها من داخل الموقع، وإدارة الصلاحيات
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-[#22A06B]/10 border border-[#22A06B]/30 text-xs font-bold text-[#22A06B] flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#22A06B]" />
            <span>مفعل:</span>
            <span className="font-mono font-black">{activeCount}</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-[#E5A100]/12 border border-[#E5A100]/40 text-xs font-bold text-[#9A6B00] dark:text-[#F5B13D] flex items-center gap-1.5 shadow-sm">
            <Power className="w-3.5 h-3.5 text-[#E5A100]" />
            <span>معطل:</span>
            <span className="font-mono font-black">{pendingCount}</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-[#F7FBFE] dark:bg-slate-800 border border-[#A9DDF5] dark:border-slate-700 text-xs font-bold text-[#444444] dark:text-slate-200 flex items-center gap-1.5 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-[#483878] dark:text-[#A9DDF5]" />
            <span>الإجمالي:</span>
            <span className="font-mono font-black text-[#483878] dark:text-slate-100">{users.length}</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 flex-1">
        {/* Create User Form */}
        <div className="lg:col-span-5 bg-white/95 dark:bg-[#131C31]/95 backdrop-blur-md rounded-2xl border border-[#A9DDF5] dark:border-slate-700 p-4 sm:p-5 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 pb-3 border-b border-[#A9DDF5]/60 dark:border-slate-700 mb-4">
            <div className="w-7 h-7 rounded-lg bg-[#483878]/10 dark:bg-[#483878]/40 border border-[#483878]/15 dark:border-[#A9DDF5]/20 flex items-center justify-center text-[#483878] dark:text-[#A9DDF5]">
              <UserPlus className="w-4 h-4" />
            </div>
            <h3 className="text-sm sm:text-base font-black text-[#483878] dark:text-slate-100">
              إنشاء حساب مستخدم جديد
            </h3>
          </div>

          {formError && (
            <div className="mb-4 p-3 rounded-xl bg-[#D92D20]/10 border border-[#D92D20]/35 text-[#D92D20] text-xs font-bold flex flex-col gap-2 leading-relaxed">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#D92D20] mt-0.5" />
                <span>{formError}</span>
              </div>
              {isEmailProviderDisabled && (
                <a
                  href="https://console.firebase.google.com/project/gen-lang-client-0104041039/authentication/providers"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-black text-[#483878] dark:text-[#A9DDF5] hover:underline mr-6"
                >
                  <span>تفعيل مزود Email/Password في Firebase Console</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}

          {formSuccess && (
            <div className="mb-4 p-3 rounded-xl bg-[#22A06B]/10 border border-[#22A06B]/30 text-[#22A06B] text-xs font-bold flex items-start gap-2 leading-relaxed">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#22A06B] mt-0.5" />
              <span>{formSuccess}</span>
            </div>
          )}

          <form onSubmit={handleCreateUser} className="space-y-3.5 flex-1 flex flex-col">
            <div>
              <label className="block text-xs font-bold text-[#444444] dark:text-slate-200 mb-1">
                الاسم الكامل للمستخدم
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={128}
                  placeholder="مثال: خالد العتيبي"
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-[#F7FBFE] dark:bg-slate-800 border border-[#A9DDF5] dark:border-slate-700 focus:border-[#4A9FD8] focus:bg-white dark:focus:bg-slate-900 text-[#483878] dark:text-slate-100 text-xs sm:text-sm font-medium outline-none transition-all placeholder:text-slate-500 dark:placeholder:text-slate-400"
                  required
                />
                <User className="w-4 h-4 text-[#4A9FD8] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#444444] dark:text-slate-200 mb-1">
                البريد الإلكتروني للدخول
              </label>
              <div className="relative">
                <input
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={256}
                  placeholder="operator@dmtc.sa"
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-[#F7FBFE] dark:bg-slate-800 border border-[#A9DDF5] dark:border-slate-700 focus:border-[#4A9FD8] focus:bg-white dark:focus:bg-slate-900 text-[#483878] dark:text-slate-100 text-xs sm:text-sm font-medium outline-none transition-all placeholder:text-slate-500 dark:placeholder:text-slate-400 text-right"
                  required
                />
                <Mail className="w-4 h-4 text-[#4A9FD8] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#444444] dark:text-slate-200 mb-1">
                الصلاحية الوظيفية
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7FBFE] dark:bg-slate-800 border border-[#A9DDF5] dark:border-slate-700 focus:border-[#4A9FD8] focus:bg-white dark:focus:bg-slate-900 text-[#483878] dark:text-slate-100 text-xs sm:text-sm font-bold outline-none transition-all cursor-pointer"
              >
                <option value="operations_manager">مدير تشغيل (Operations Manager)</option>
                <option value="supervisor">مشرف تشغيل (Supervisor)</option>
                <option value="operator">مراقب حركة (Operator)</option>
                <option value="general_manager">مدير عام (General Manager)</option>
              </select>
            </div>

            <div className="p-3 rounded-xl bg-[#F7FBFE] dark:bg-slate-800/70 border border-[#A9DDF5] dark:border-slate-700 text-xs text-[#444444] dark:text-slate-300 font-medium leading-relaxed">
              سيتم تفعيل الحساب مباشرة وإرسال رابط ضبط كلمة المرور إلى البريد الإلكتروني للمستخدم.
            </div>

            <div className="pt-2 mt-auto">
              <button
                type="submit"
                disabled={creating}
                className="w-full py-3 rounded-xl bg-[#E8742A] hover:bg-[#d5651e] active:scale-[0.98] disabled:opacity-60 text-white font-black text-xs sm:text-sm shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {creating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جارٍ إنشاء الحساب...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>إنشاء الحساب وإرسال رابط ضبط كلمة السر</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Users List Card */}
        <div className="lg:col-span-7 bg-white/95 dark:bg-[#131C31]/95 backdrop-blur-md rounded-2xl border border-[#A9DDF5] dark:border-slate-700 p-4 sm:p-5 shadow-sm flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#A9DDF5]/60 dark:border-slate-700 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#483878]/10 dark:bg-[#483878]/40 border border-[#483878]/15 dark:border-[#A9DDF5]/20 flex items-center justify-center text-[#483878] dark:text-[#A9DDF5]">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="text-sm sm:text-base font-black text-[#483878] dark:text-slate-100">
                المستخدمون المسجلون ({filteredUsers.length})
              </h3>
            </div>

            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالاسم أو البريد..."
                className="w-full pl-3 pr-9 py-1.5 rounded-xl bg-[#F7FBFE] dark:bg-slate-800 border border-[#A9DDF5] dark:border-slate-700 focus:border-[#4A9FD8] text-xs font-medium text-[#483878] dark:text-slate-100 outline-none placeholder:text-slate-500 dark:placeholder:text-slate-400"
              />
              <Search className="w-3.5 h-3.5 text-[#4A9FD8] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {listError && (
            <div className="mb-3 p-3 rounded-xl bg-[#D92D20]/10 border border-[#D92D20]/35 text-[#D92D20] text-xs font-bold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#D92D20] mt-0.5" />
              <span>{listError}</span>
            </div>
          )}

          {/* List Body */}
          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[500px] pr-1">
            {loadingList ? (
              <div className="py-16 flex flex-col items-center justify-center text-[#444444] dark:text-slate-300 gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-[#4A9FD8]" />
                <span className="text-xs font-bold">جارٍ تحميل قائمة المستخدمين من Firestore...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-16 text-center text-[#444444] dark:text-slate-300 text-xs font-medium">
                لا توجد حسابات مطابقة لنتيجة البحث.
              </div>
            ) : (
              filteredUsers.map((userItem) => {
                const isSelf = userItem.uid === currentUser.uid;
                const isConfirmingDelete = confirmDeleteUid === userItem.uid;
                const isDeleting = deletingUid === userItem.uid;
                const isUpdatingRole = updatingRoleUid === userItem.uid;
                const isTogglingActive = togglingActiveUid === userItem.uid;

                return (
                  <div
                    key={userItem.uid}
                    className={`p-3 sm:p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${
                      userItem.isActive
                        ? 'bg-[#F7FBFE] dark:bg-slate-800/70 border-[#A9DDF5] dark:border-slate-700 hover:border-[#4A9FD8]'
                        : 'bg-[#E5A100]/[0.06] dark:bg-[#E5A100]/12 border-[#E5A100]/45'
                    }`}
                  >
                    {/* User Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs text-white shrink-0 shadow-sm ${
                          !userItem.isActive
                            ? 'bg-slate-400'
                            : userItem.role === 'general_manager'
                            ? 'bg-gradient-to-br from-[#483878] to-[#E8742A]'
                            : userItem.role === 'operations_manager'
                            ? 'bg-gradient-to-br from-[#483878] to-[#4A9FD8]'
                            : 'bg-[#4A9FD8]'
                        }`}
                      >
                        {userItem.displayName.slice(0, 2)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-extrabold text-[#483878] dark:text-slate-100 truncate">
                            {userItem.displayName}
                          </span>
                          {isSelf && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-black bg-[#A9DDF5]/40 dark:bg-[#4A9FD8]/25 text-[#483878] dark:text-[#A9DDF5] border border-[#4A9FD8]/40">
                              الحساب النشط
                            </span>
                          )}
                          {userItem.isActive ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#22A06B]/12 text-[#22A06B] border border-[#22A06B]/30">
                              مفعل
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#E5A100]/15 text-[#9A6B00] dark:text-[#F5B13D] border border-[#E5A100]/40">
                              معطل
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-mono text-[#444444] dark:text-slate-300 truncate" dir="ltr">
                          {userItem.email}
                        </p>
                      </div>
                    </div>

                    {/* Role, Activation & Delete Actions */}
                    <div className="flex items-center justify-end gap-1.5 flex-wrap shrink-0">
                      {isSelf ? (
                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-black border dark:bg-slate-900 dark:text-[#A9DDF5] dark:border-slate-700 ${
                            ROLE_BADGE_STYLES[userItem.role]
                          }`}
                        >
                          {userItem.roleTitle || ROLE_TITLES[userItem.role]}
                        </span>
                      ) : (
                        <select
                          value={userItem.role}
                          disabled={isUpdatingRole}
                          onChange={(e) =>
                            handleRoleChange(userItem.uid, e.target.value as UserRole)
                          }
                          className={`px-2 py-1 rounded-lg text-xs font-bold border outline-none cursor-pointer transition-colors dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 ${
                            ROLE_BADGE_STYLES[userItem.role]
                          } disabled:opacity-50`}
                          aria-label={`تغيير صلاحية ${userItem.displayName}`}
                        >
                          <option value="operations_manager">مدير تشغيل</option>
                          <option value="supervisor">مشرف تشغيل</option>
                          <option value="operator">مراقب حركة</option>
                          <option value="general_manager">مدير عام</option>
                        </select>
                      )}

                      {/* Activate / Deactivate Toggle Button inside site */}
                      {!isSelf && (
                        <button
                          type="button"
                          disabled={isTogglingActive}
                          onClick={() => handleToggleActivation(userItem)}
                          title={
                            userItem.isActive
                              ? 'تعطيل الحساب مؤقتاً'
                              : 'تفعيل الحساب مباشرة'
                          }
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-black border transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50 ${
                            userItem.isActive
                              ? 'bg-[#E5A100]/12 hover:bg-[#E5A100]/20 text-[#9A6B00] dark:text-[#F5B13D] border-[#E5A100]/40'
                              : 'bg-[#22A06B] hover:bg-[#1c8559] text-white border-[#22A06B] shadow-sm'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>
                            {isTogglingActive
                              ? '...'
                              : userItem.isActive
                              ? 'تعطيل'
                              : 'تفعيل الحساب'}
                          </span>
                        </button>
                      )}

                      {/* Delete Action */}
                      {!isSelf && (
                        <>
                          {isConfirmingDelete ? (
                            <div className="flex items-center gap-1 bg-[#D92D20]/10 border border-[#D92D20]/35 rounded-lg p-1">
                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => handleDeleteUser(userItem.uid)}
                                className="px-2 py-1 rounded-md bg-[#D92D20] hover:bg-[#b8251a] text-white text-xs font-black cursor-pointer transition-colors disabled:opacity-50"
                              >
                                {isDeleting ? 'جارٍ الحذف...' : 'تأكيد'}
                              </button>
                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => setConfirmDeleteUid(null)}
                                className="px-2 py-1 rounded-md bg-white dark:bg-slate-900 hover:bg-[#EEF7FC] dark:hover:bg-slate-800 text-[#444444] dark:text-slate-200 text-xs font-bold border border-[#A9DDF5] dark:border-slate-700 cursor-pointer transition-colors"
                              >
                                إلغاء
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteUid(userItem.uid)}
                              title={`حذف حساب ${userItem.displayName}`}
                              className="p-2 rounded-lg text-[#444444] dark:text-slate-300 hover:text-[#D92D20] hover:bg-[#D92D20]/10 border border-transparent hover:border-[#D92D20]/35 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
