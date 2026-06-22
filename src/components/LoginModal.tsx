import { Lock, X } from "lucide-react";
import { useState } from "react";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
}

export function LoginModal({ isOpen, onClose, onLogin }: LoginModalProps) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (username === "admin" && password === "1234") {
      setError(false);
      setPassword("");
      onLogin();
    } else {
      setError(true);
      setTimeout(() => setError(false), 4000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 border border-slate-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Lock className="w-5 h-5 text-sky-600" /> Admin Authentication
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              placeholder="••••"
            />
          </div>
          {error && (
            <p className="text-red-500 text-xs font-medium">
              Invalid credentials. Hint: admin / 1234
            </p>
          )}
          <button
            onClick={handleSubmit}
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-medium py-2 rounded-lg transition-colors shadow-xs"
          >
            Verify & Login
          </button>
        </div>
      </div>
    </div>
  );
}
