import { useState } from "react";
import { Lock, UserPlus, Eye, EyeOff } from "lucide-react";
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
  const [payrollId, setPayrollId] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
        setError("Invalid credentials");
      }
    } catch {
      setError("Invalid credentials");
    }
  };

  const handleSignup = async () => {
    setError("");
    if (!username.trim() || !password.trim() || !displayName.trim() || !payrollId.trim()) {
      setError("All fields are required");
      return;
    }
    if (password.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }
    try {
      const user = await api.register(username.trim(), password, displayName.trim(), payrollId.trim());
      if (user) {
        await api.login(username.trim(), password);
        setUsername("");
        setPassword("");
        setDisplayName("");
        setPayrollId("");
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
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-8 border border-sf-cream-dark dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-sf-brown flex items-center justify-center mx-auto mb-4 shadow-lg">
            {mode === "login" ? (
              <Lock className="w-6 h-6 text-sf-gold" />
            ) : (
              <UserPlus className="w-6 h-6 text-sf-gold" />
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {mode === "login" ? "Sign in to access your policies" : "Join the team"}
          </p>
        </div>

        <div className="space-y-3.5">
          {mode === "signup" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-sf-gold/40 focus:border-sf-gold/50 text-sm transition-all"
                  placeholder="e.g., Joseph Kiprop"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Payroll ID</label>
                <input
                  type="text"
                  value={payrollId}
                  onChange={(e) => setPayrollId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-sf-gold/40 focus:border-sf-gold/50 text-sm transition-all"
                  placeholder="e.g., SL-00123"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              {mode === "login" ? "Username or Payroll ID" : "Username"}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-sf-gold/40 focus:border-sf-gold/50 text-sm transition-all"
              placeholder={mode === "login" ? "Username or Payroll ID" : "e.g., jkiprop"}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="w-full px-4 py-2.5 pr-10 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-sf-gold/40 focus:border-sf-gold/50 text-sm transition-all"
                placeholder={mode === "login" ? "Password or Payroll ID" : "At least 4 characters"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-red-600 dark:text-red-400 text-xs font-medium">{error}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            className="w-full bg-sf-brown hover:bg-sf-brown-dark text-white font-semibold py-2.5 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg hover:shadow-sf-brown/20 active:scale-[0.98]"
          >
            {mode === "login" ? "Sign In" : "Create Account"}
          </button>

          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            {mode === "login" ? (
              <>Don&apos;t have an account? <button onClick={() => { setMode("signup"); setError(""); }} className="text-sf-gold hover:text-sf-gold-dark font-semibold transition-colors">Create one</button></>
            ) : (
              <>Already have an account? <button onClick={() => { setMode("login"); setError(""); }} className="text-sf-gold hover:text-sf-gold-dark font-semibold transition-colors">Sign in</button></>
            )}
          </p>

          {mode === "login" && (
            <p className="text-center text-[11px] text-slate-400">You can log in with your password or payroll ID</p>
          )}
        </div>
      </div>
    </div>
  );
}
