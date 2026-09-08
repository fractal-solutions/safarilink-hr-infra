import { useState, useEffect } from "react";
import {
  X,
  Shield,
  ShieldOff,
  Trash2,
  Users,
  Crown,
  KeyRound,
  Building2,
  Palette,
  Plus,
  Check,
  Timer,
} from "lucide-react";
import type { User, Department, SessionSettings } from "@/types";
import { DepartmentManager } from "./DepartmentManager";
import { ThemePicker } from "./ThemePicker";
import * as api from "@/api";
import { cn } from "@/lib/utils";

interface UserSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
  departments?: Department[];
  onRefreshDepartments?: () => void;
  onThemeChange?: (theme: string) => void;
}

export function UserSettings({ isOpen, onClose, currentUser, departments = [], onRefreshDepartments, onThemeChange }: UserSettingsProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingPassword, setEditingPassword] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [activeTab, setActiveTab] = useState<"my-depts" | "users" | "departments" | "theme" | "security">(
    currentUser?.role === "admin" ? "users" : "my-depts"
  );
  const [myDepts, setMyDepts] = useState<Department[]>([]);
  const [userDeptsMap, setUserDeptsMap] = useState<Record<string, Department[]>>({});
  const [managingUserDepts, setManagingUserDepts] = useState<string | null>(null);
  const [sessionSettings, setSessionSettings] = useState<SessionSettings | null>(null);
  const [timeoutMinutes, setTimeoutMinutes] = useState<string>("");
  const [capMinutes, setCapMinutes] = useState<string>("");
  const [sessionMsg, setSessionMsg] = useState("");

  const fmtDuration = (seconds: number): string => {
    if (!seconds || seconds <= 0) return "";
    const m = Math.round(seconds / 60);
    if (m < 60) return `${m} minute${m === 1 ? "" : "s"}`;
    const h = m / 60;
    if (h < 24 && Number.isInteger(h)) return `${h} hour${h === 1 ? "" : "s"}`;
    if (h < 24) return `${Math.round(h)} minutes`;
    const d = h / 24;
    if (Number.isInteger(d)) return `${d} day${d === 1 ? "" : "s"}`;
    return `${Math.floor(d)}d ${Math.round((d % 1) * 24)}h`;
  };

  const reloadSessionSettings = async () => {
    const s = await api.getSessionSettings();
    setSessionSettings(s);
    setTimeoutMinutes(s?.ownMinutes ? String(s.ownMinutes) : "");
    setCapMinutes(s?.capSeconds ? String(Math.round(s.capSeconds / 60)) : "");
  };

  useEffect(() => {
    if (isOpen) {
      if (currentUser?.role === "admin") load();
      loadMyDepts();
      reloadSessionSettings();
      setConfirmDelete(null);
      setEditingPassword(null);
      setNewPassword("");
      setPasswordError("");
      setManagingUserDepts(null);
      setSessionMsg("");
    }
  }, [isOpen]);

  const load = async () => {
    const { getAllUsers } = await import("@/auth");
    const list = await getAllUsers();
    setUsers(list);
  };

  const loadMyDepts = async () => {
    const depts = await api.getMyDepartments();
    setMyDepts(depts);
  };

  const loadUserDepts = async (userId: string) => {
    const depts = await api.getUserDepartments(userId);
    setUserDeptsMap((prev) => ({ ...prev, [userId]: depts }));
  };

  const handleAddMyDept = async (deptId: string) => {
    await api.addMyDepartment(deptId);
    await loadMyDepts();
  };

  const handleRemoveMyDept = async (deptId: string) => {
    await api.removeMyDepartment(deptId);
    await loadMyDepts();
  };

  const handleAddUserDept = async (userId: string, deptId: string) => {
    await api.addUserDepartment(userId, deptId);
    await loadUserDepts(userId);
    onRefreshDepartments?.();
  };

  const handleRemoveUserDept = async (userId: string, deptId: string) => {
    await api.removeUserDepartment(userId, deptId);
    await loadUserDepts(userId);
    onRefreshDepartments?.();
  };

  const handleElevate = async (userId: string) => {
    const { elevateUser } = await import("@/auth");
    await elevateUser(userId);
    load();
  };

  const handleDemote = async (userId: string) => {
    const { demoteUser } = await import("@/auth");
    await demoteUser(userId);
    load();
  };

  const handleDelete = async (userId: string) => {
    const { deleteUser } = await import("@/auth");
    await deleteUser(userId);
    setConfirmDelete(null);
    load();
  };

  const handlePasswordChange = async (userId: string) => {
    setPasswordError("");
    if (newPassword.length < 4) {
      setPasswordError("Must be at least 4 characters");
      return;
    }
    const { changePassword } = await import("@/auth");
    const result = await changePassword(userId, newPassword);
    if (result.ok) {
      setEditingPassword(null);
      setNewPassword("");
    } else {
      setPasswordError(result.error!);
    }
  };

  const saveSessionTimeout = async () => {
    let minutes: number | null = null;
    if (timeoutMinutes !== "") {
      const val = Number(timeoutMinutes);
      if (!Number.isFinite(val) || val < 5) {
        setSessionMsg("Enter at least 5 minutes, or pick 'Default'.");
        return;
      }
      minutes = Math.round(val);
    }
    const res = await api.updateSessionTimeout(minutes);
    if (res?.ok) {
      setSessionMsg(minutes
        ? `Saved — sessions time out after ${fmtDuration(minutes * 60)} of inactivity (applies to new sign-ins).`
        : "Saved — back to the default timeout (applies to new sign-ins).");
      await reloadSessionSettings();
    } else {
      setSessionMsg("Failed to save timeout.");
    }
  };

  const saveGlobalCap = async () => {
    let capSeconds: number | null = null;
    if (capMinutes !== "") {
      const val = Number(capMinutes);
      if (!Number.isFinite(val) || val < 5) {
        setSessionMsg("Global cap must be at least 5 minutes, or clear to disable.");
        return;
      }
      capSeconds = Math.round(val * 60);
    }
    const res = await api.setSessionTimeoutCap(capSeconds);
    if (res?.ok) {
      setSessionMsg(capSeconds
        ? `Global cap set to ${fmtDuration(capSeconds)}. Users with longer timeouts are capped at this.`
        : "Global cap cleared.");
      await reloadSessionSettings();
    } else {
      setSessionMsg("Failed to save global cap (admins only).");
    }
  };

  if (!isOpen) return null;

  const isAdmin = currentUser?.role === "admin";
  const myDeptIds = myDepts.map((d) => d.id);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg p-6 border border-sf-cream-dark dark:border-slate-700 max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-sf-brown dark:text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-sf-gold" /> Settings
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-sf-cream dark:bg-slate-700 rounded-lg p-1">
          {isAdmin && (
            <button onClick={() => setActiveTab("users")} className={cn("flex-1 px-3 py-2 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5", activeTab === "users" ? "bg-white dark:bg-slate-600 text-sf-brown dark:text-slate-100 shadow-xs" : "text-slate-500 hover:text-slate-700")}>
              <Users className="w-3.5 h-3.5" /> Users
            </button>
          )}
          <button onClick={() => setActiveTab("my-depts")} className={cn("flex-1 px-3 py-2 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5", activeTab === "my-depts" ? "bg-white dark:bg-slate-600 text-sf-brown dark:text-slate-100 shadow-xs" : "text-slate-500 hover:text-slate-700")}>
            <Building2 className="w-3.5 h-3.5" /> My Depts
          </button>
          {isAdmin && (
            <button onClick={() => setActiveTab("departments")} className={cn("flex-1 px-3 py-2 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5", activeTab === "departments" ? "bg-white dark:bg-slate-600 text-sf-brown dark:text-slate-100 shadow-xs" : "text-slate-500 hover:text-slate-700")}>
              <Building2 className="w-3.5 h-3.5" /> Manage
            </button>
          )}
          <button onClick={() => setActiveTab("security")} className={cn("flex-1 px-3 py-2 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5", activeTab === "security" ? "bg-white dark:bg-slate-600 text-sf-brown dark:text-slate-100 shadow-xs" : "text-slate-500 hover:text-slate-700")}>
            <Timer className="w-3.5 h-3.5" /> Timeout
          </button>
          <button onClick={() => setActiveTab("theme")} className={cn("flex-1 px-3 py-2 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5", activeTab === "theme" ? "bg-white dark:bg-slate-600 text-sf-brown dark:text-slate-100 shadow-xs" : "text-slate-500 hover:text-slate-700")}>
            <Palette className="w-3.5 h-3.5" /> Theme
          </button>
        </div>

        {/* My Departments Tab */}
        {activeTab === "my-depts" && (
          <div className="flex-1 overflow-y-auto space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">Select the departments you belong to. This determines which announcements you see.</p>
            <div className="flex flex-wrap gap-2">
              {departments.map((dept) => {
                const isMember = myDeptIds.includes(dept.id);
                return (
                  <button
                    key={dept.id}
                    onClick={() => isMember ? handleRemoveMyDept(dept.id) : handleAddMyDept(dept.id)}
                    className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all", isMember ? "border-sf-gold bg-sf-cream dark:bg-slate-700 text-sf-brown dark:text-slate-100" : "border-sf-cream-dark dark:border-slate-600 text-slate-500 hover:border-sf-gold/30")}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dept.color }} />
                    {dept.name}
                    {isMember && <Check className="w-3 h-3 text-sf-gold" />}
                  </button>
                );
              })}
            </div>
            {myDepts.length > 0 && (
              <div>
                <p className="text-[11px] text-slate-400 mb-2">Your departments:</p>
                <div className="flex flex-wrap gap-1.5">
                  {myDepts.map((d) => (
                    <span key={d.id} className="flex items-center gap-1 px-2 py-1 bg-sf-cream dark:bg-slate-700 rounded-full text-xs font-medium text-sf-brown dark:text-slate-200">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name}
                      <button onClick={() => handleRemoveMyDept(d.id)} className="ml-0.5 text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Departments Management (Admin) */}
        {activeTab === "departments" && isAdmin && (
          <div className="flex-1 overflow-y-auto">
            <DepartmentManager departments={departments} onRefresh={onRefreshDepartments ?? (() => {})} />
          </div>
        )}

        {/* Security / Session Timeout Tab */}
        {activeTab === "security" && (
          <div className="flex-1 overflow-y-auto p-1 space-y-4">
            <div>
              <p className="text-sm font-bold text-sf-brown dark:text-slate-100 flex items-center gap-2 mb-1">
                <Timer className="w-4 h-4 text-sf-gold" /> Session Timeout
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You'll be signed out automatically after this long without activity. Default is{" "}
                {sessionSettings ? fmtDuration(sessionSettings.defaultSeconds) : "7 days"}.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                My timeout
              </label>
              <div className="flex gap-2">
                <select
                  value={timeoutMinutes}
                  onChange={(e) => { setTimeoutMinutes(e.target.value); setSessionMsg(""); }}
                  className="flex-1 px-3 py-2 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-sm"
                >
                  <option value="">Default (7 days)</option>
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="120">2 hours</option>
                  <option value="240">4 hours</option>
                  <option value="480">8 hours</option>
                  <option value="720">12 hours</option>
                  <option value="1440">1 day</option>
                  <option value="2880">2 days</option>
                  <option value="10080">7 days</option>
                </select>
                <button
                  onClick={saveSessionTimeout}
                  className="px-3 py-2 bg-sf-brown hover:bg-sf-brown-dark text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
                >
                  Save
                </button>
              </div>
              {sessionSettings?.capSeconds && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                  An administrator cap of {fmtDuration(sessionSettings.capSeconds)} applies — anything longer is reduced to the cap.
                </p>
              )}
              <p className="text-[11px] text-slate-400 mt-1">
                {sessionSettings ? `Effective timeout: ${fmtDuration(sessionSettings.effectiveSeconds)} of inactivity.` : ""} Changes apply to your next sign-in.
              </p>
            </div>

            {isAdmin && (
              <div className="border-t border-sf-cream-dark dark:border-slate-600 pt-3">
                <label className="text-xs font-semibold text-sf-brown dark:text-slate-200 uppercase tracking-wider mb-1 block">
                  Global maximum (admin)
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  Caps how long any user can stay signed in. Leave blank to disable the cap.
                </p>
                <div className="flex gap-2">
                  <select
                    value={capMinutes}
                    onChange={(e) => { setCapMinutes(e.target.value); setSessionMsg(""); }}
                    className="flex-1 px-3 py-2 border border-sf-cream-dark dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-sm"
                  >
                    <option value="">No cap</option>
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="240">4 hours</option>
                    <option value="480">8 hours</option>
                    <option value="1440">1 day</option>
                    <option value="2880">2 days</option>
                    <option value="10080">7 days</option>
                  </select>
                  <button
                    onClick={saveGlobalCap}
                    className="px-3 py-2 bg-sf-brown hover:bg-sf-brown-dark text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {sessionMsg && (
              <p className="text-[11px] font-medium text-sf-gold-dark dark:text-sf-gold bg-sf-cream dark:bg-slate-700 border border-sf-cream-dark dark:border-slate-600 rounded-lg px-3 py-2">
                {sessionMsg}
              </p>
            )}
          </div>
        )}

        {/* Theme Tab */}
        {activeTab === "theme" && (
          <div className="flex-1 overflow-y-auto p-1">
            <ThemePicker currentTheme={currentUser?.theme || "safari"} onThemeChange={(t) => onThemeChange?.(t)} userId={currentUser?.id || ""} />
          </div>
        )}

        {/* Users Tab (Admin) */}
        {activeTab === "users" && isAdmin && (
          <div className="flex-1 overflow-y-auto divide-y divide-sf-cream-dark dark:divide-slate-700 border border-sf-cream-dark dark:border-slate-700 rounded-lg">
            {users.map((u) => (
              <div key={u.id} className="p-3 hover:bg-sf-cream dark:hover:bg-slate-700/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${u.role === "admin" ? "bg-sf-gold/20 text-sf-brown-dark" : "bg-sf-cream dark:bg-slate-600 text-slate-600 dark:text-slate-300"}`}>
                      {u.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{u.displayName}</span>
                        {u.id === "usr-admin" && <Crown className="w-3.5 h-3.5 text-sf-gold shrink-0" />}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        @{u.username}
                        {u.payrollId && <span className="ml-1.5 text-sf-gold-dark font-medium">{u.payrollId}</span>}
                        {u.role === "admin" && <span className="ml-1.5 text-sf-gold-dark font-medium">Admin</span>}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {u.id !== currentUser?.id && (
                      <>
                        {confirmDelete === u.id ? (
                          <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                            <span className="text-[11px] text-red-600 font-medium">Remove?</span>
                            <button onClick={() => handleDelete(u.id)} className="text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 px-2 py-0.5 rounded transition-colors">Yes</button>
                            <button onClick={() => setConfirmDelete(null)} className="text-[11px] font-medium text-slate-500 hover:text-slate-700 px-1 transition-colors">No</button>
                          </div>
                        ) : (
                          <>
                            <button onClick={() => { setEditingPassword(editingPassword === u.id ? null : u.id); setNewPassword(""); setPasswordError(""); }} className="p-1.5 rounded-md text-slate-400 hover:text-sf-brown hover:bg-sf-cream transition-colors" title="Change Password"><KeyRound className="w-4 h-4" /></button>
                            <button onClick={() => { setManagingUserDepts(managingUserDepts === u.id ? null : u.id); if (managingUserDepts !== u.id) loadUserDepts(u.id); }} className={cn("p-1.5 rounded-md transition-colors", managingUserDepts === u.id ? "text-sf-gold bg-sf-gold/10" : "text-slate-400 hover:text-sf-gold-dark hover:bg-sf-gold/10")} title="Manage Departments"><Building2 className="w-4 h-4" /></button>
                            {u.role === "user" ? (
                              <button onClick={() => handleElevate(u.id)} className="p-1.5 rounded-md text-slate-400 hover:text-sf-gold-dark hover:bg-sf-gold/10 transition-colors" title="Elevate to Admin"><Shield className="w-4 h-4" /></button>
                            ) : (
                              <button onClick={() => handleDemote(u.id)} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors" title="Demote to User"><ShieldOff className="w-4 h-4" /></button>
                            )}
                            <button onClick={() => setConfirmDelete(u.id)} className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Remove User"><Trash2 className="w-4 h-4" /></button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Password editing */}
                {editingPassword === u.id && (
                  <div className="mt-3 pt-3 border-t border-sf-cream-dark dark:border-slate-600 flex items-center gap-2">
                    <input type="password" value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setPasswordError(""); }} onKeyDown={(e) => e.key === "Enter" && handlePasswordChange(u.id)} placeholder="New password" className="flex-1 px-3 py-1.5 border border-sf-cream-dark dark:border-slate-600 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-sm" autoFocus />
                    <button onClick={() => handlePasswordChange(u.id)} className="px-3 py-1.5 bg-sf-brown hover:bg-sf-brown-dark text-white text-xs font-medium rounded-lg transition-colors shrink-0">Save</button>
                    <button onClick={() => { setEditingPassword(null); setNewPassword(""); setPasswordError(""); }} className="px-2 py-1.5 text-xs text-slate-500 hover:bg-sf-cream rounded-lg transition-colors shrink-0">Cancel</button>
                  </div>
                )}
                {editingPassword === u.id && passwordError && <p className="text-red-500 text-[11px] mt-1 font-medium">{passwordError}</p>}

                {/* Department management */}
                {managingUserDepts === u.id && (
                  <div className="mt-3 pt-3 border-t border-sf-cream-dark dark:border-slate-600 space-y-2">
                    <p className="text-[11px] text-slate-400 font-medium">Departments for {u.displayName}:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {departments.map((dept) => {
                        const userDeptIds = userDeptsMap[u.id]?.map((d) => d.id) ?? [];
                        const isMember = userDeptIds.includes(dept.id);
                        return (
                          <button key={dept.id} onClick={() => isMember ? handleRemoveUserDept(u.id, dept.id) : handleAddUserDept(u.id, dept.id)} className={cn("flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border transition-colors", isMember ? "border-sf-gold bg-sf-cream dark:bg-slate-700 text-sf-brown dark:text-slate-100" : "border-sf-cream-dark dark:border-slate-600 text-slate-400 hover:border-sf-gold/30")}>
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dept.color }} />
                          {dept.name}
                          {isMember && <Check className="w-3 h-3 text-sf-gold" />}
                        </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
