import { useState } from "react";
import { Lock, UserPlus } from "lucide-react";
import * as api from "@/api";

interface AuthModalProps {
  isOpen: boolean;
  onAuth: () => void;
}

export function AuthModal({ isOpen, onAuth }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleLogin = async () => {
    setError("");
    try {
      const result = await api.login(username, password);
      if (result) {
        setUsername("");
        setPassword("");
        onAuth();
      } else {
        setError("Invalid username or password");
      }
    } catch {
      setError("Invalid username or password");
    }
  };

  const handleSignup = async () => {
    setError("");
    if (!username.trim() || !password.trim() || !displayName.trim()) {
      setError("All fields are required");
      return;
    }
    if (password.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }
    try {
      const user = await api.register(username.trim(), password, displayName.trim());
      if (user) {
        await api.login(username.trim(), password);
        setUsername("");
        setPassword("");
        setDisplayName("");
        onAuth();
      } else {
        setError("Registration failed");
      }
    } catch (e: any) {
      setError(e.message || "Registration failed");
    }
  };

  const handleSubmit = () => {
    if (mode === "login") handleLogin();
    else handleSignup();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6 border border-slate-100 dark:border-slate-700">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            {mode === "login" ? (
              <><Lock className="w-5 h-5 text-sky-600" /> Sign In</>
            ) : (
              <><UserPlus className="w-5 h-5 text-sky-600" /> Create Account</>
            )}
          </h3>
        </div>

        <div className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-sm"
                placeholder="e.g., Joseph Kiprop"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-sm"
              placeholder="e.g., jkiprop"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-sm"
              placeholder={mode === "login" ? "••••" : "At least 4 characters"}
            />
          </div>

          {error && <p className="text-red-500 text-xs font-medium">{error}</p>}

          <button
            onClick={handleSubmit}
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-medium py-2 rounded-lg transition-colors shadow-xs"
          >
            {mode === "login" ? "Sign In" : "Create Account"}
          </button>

          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            {mode === "login" ? (
              <>Don&apos;t have an account? <button onClick={() => { setMode("signup"); setError(""); }} className="text-sky-600 hover:text-sky-700 font-semibold">Create one</button></>
            ) : (
              <>Already have an account? <button onClick={() => { setMode("login"); setError(""); }} className="text-sky-600 hover:text-sky-700 font-semibold">Sign in</button></>
            )}
          </p>

          {mode === "login" && (
            <p className="text-center text-[11px] text-slate-400">Default admin: admin / 1234</p>
          )}
        </div>
      </div>
    </div>
  );
}
