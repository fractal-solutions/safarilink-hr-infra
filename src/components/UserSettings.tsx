import { useState, useEffect } from "react";
import {
  X,
  Shield,
  ShieldOff,
  Trash2,
  Users,
  Crown,
  KeyRound,
} from "lucide-react";
import type { User } from "@/types";

interface UserSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
}

export function UserSettings({ isOpen, onClose, currentUser }: UserSettingsProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingPassword, setEditingPassword] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (isOpen) {
      load();
      setConfirmDelete(null);
      setEditingPassword(null);
      setNewPassword("");
      setPasswordError("");
    }
  }, [isOpen]);

  const load = async () => {
    const { getAllUsers } = await import("@/auth");
    const list = await getAllUsers();
    setUsers(list);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 border border-sf-cream-dark max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-sf-brown flex items-center gap-2">
            <Users className="w-5 h-5 text-sf-gold" /> User Management
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-sf-cream-dark border border-sf-cream-dark rounded-lg">
          {users.map((u) => (
            <div key={u.id} className="p-3 hover:bg-sf-cream transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                      u.role === "admin"
                        ? "bg-sf-gold/20 text-sf-brown-dark"
                        : "bg-sf-cream text-slate-600"
                    }`}
                  >
                    {u.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-slate-900 truncate">
                        {u.displayName}
                      </span>
                      {u.id === "usr-admin" && (
                        <Crown className="w-3.5 h-3.5 text-sf-gold shrink-0" />
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      @{u.username}
                      {u.role === "admin" && (
                        <span className="ml-1.5 text-sf-gold-dark font-medium">
                          Admin
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {u.id !== currentUser?.id && (
                    <>
                      {confirmDelete === u.id ? (
                        <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                          <span className="text-[11px] text-red-600 font-medium">
                            Remove?
                          </span>
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 px-2 py-0.5 rounded transition-colors"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="text-[11px] font-medium text-slate-500 hover:text-slate-700 px-1 transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingPassword(
                                editingPassword === u.id ? null : u.id
                              );
                              setNewPassword("");
                              setPasswordError("");
                            }}
                            className="p-1.5 rounded-md text-slate-400 hover:text-sf-brown hover:bg-sf-cream transition-colors"
                            title="Change Password"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          {u.role === "user" ? (
                            <button
                              onClick={() => handleElevate(u.id)}
                              className="p-1.5 rounded-md text-slate-400 hover:text-sf-gold-dark hover:bg-sf-gold/10 transition-colors"
                              title="Elevate to Admin"
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDemote(u.id)}
                              className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                              title="Demote to User"
                            >
                              <ShieldOff className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setConfirmDelete(u.id)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Remove User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              {editingPassword === u.id && (
                <div className="mt-3 pt-3 border-t border-sf-cream-dark flex items-center gap-2">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setPasswordError("");
                    }}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handlePasswordChange(u.id)
                    }
                    placeholder="New password"
                    className="flex-1 px-3 py-1.5 border border-sf-cream-dark rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sf-gold text-sm"
                    autoFocus
                  />
                  <button
                    onClick={() => handlePasswordChange(u.id)}
                    className="px-3 py-1.5 bg-sf-brown hover:bg-sf-brown-dark text-white text-xs font-medium rounded-lg transition-colors shrink-0"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingPassword(null);
                      setNewPassword("");
                      setPasswordError("");
                    }}
                    className="px-2 py-1.5 text-xs text-slate-500 hover:bg-sf-cream rounded-lg transition-colors shrink-0"
                  >
                    Cancel
                  </button>
                </div>
              )}
              {editingPassword === u.id && passwordError && (
                <p className="text-red-500 text-[11px] mt-1 font-medium">
                  {passwordError}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
