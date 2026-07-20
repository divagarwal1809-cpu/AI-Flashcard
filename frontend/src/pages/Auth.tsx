import { useState } from "react";
import { api } from "../utils/api";
import { BookOpen } from "lucide-react";

export function Auth({ onAuthSuccess }: { onAuthSuccess: (token: string) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { setError("Please fill in all fields."); return; }
    setError(""); setLoading(true);
    try {
      if (!isLogin) {
        await api.post("/auth/signup", { username, password }, { auth: false });
      }
      const data = await api.post<{ access_token: string }>("/auth/login", { username, password }, { auth: false });
      api.setToken(data.access_token);
      onAuthSuccess(data.access_token);
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF5FF] px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-8 h-8 rounded-lg bg-[#7C3AED] flex items-center justify-center">
            <BookOpen size={16} className="text-white" />
          </div>
          <span className="font-bold text-xl text-[#0F172A]">FlashMind AI</span>
        </div>

        <div className="card animate-fade-up">
          <h1 className="text-lg font-bold text-[#0F172A] mb-1">
            {isLogin ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-[#64748B] mb-6">
            {isLogin ? "Sign in to your study workspace." : "Start learning smarter today."}
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">Username</label>
              <input
                className="input"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="alex_learns"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? "Please wait..." : isLogin ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="text-sm text-center text-[#64748B] mt-5">
            {isLogin ? "No account?" : "Already have one?"}{" "}
            <button
              onClick={() => { setIsLogin(!isLogin); setError(""); }}
              className="text-[#7C3AED] font-semibold hover:underline cursor-pointer"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
