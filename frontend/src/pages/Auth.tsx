import React, { useState } from "react";
import { api } from "../utils/api";

interface AuthProps {
  onAuthSuccess: (token: string) => void;
}

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        const data = await api.post<{ access_token: string }>("/auth/login", {
          username,
          password,
        }, { auth: false });
        api.setToken(data.access_token);
        onAuthSuccess(data.access_token);
      } else {
        await api.post("/auth/signup", {
          username,
          password,
        }, { auth: false });
        
        // Log in immediately after signup
        const data = await api.post<{ access_token: string }>("/auth/login", {
          username,
          password,
        }, { auth: false });
        api.setToken(data.access_token);
        onAuthSuccess(data.access_token);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="w-full max-w-md bg-white neo-border-lg p-8 shadow-neo-lg relative">
        {/* Playful top-right badge */}
        <div className="absolute -top-5 -right-3 bg-secondary text-white font-bold px-3 py-1 neo-border text-sm rotate-6">
          {isLogin ? "WELCOME BACK!" : "HI THERE!"}
        </div>

        <h1 className="text-4xl font-extrabold text-ink tracking-tight mb-2">
          FlashMind <span className="bg-primary px-1 neo-border">AI</span>
        </h1>
        <p className="text-gray-700 font-semibold mb-6">
          Convert anything into smart study cards.
        </p>

        {error && (
          <div className="bg-secondary text-white font-bold p-3 neo-border mb-4 shadow-neo-sm text-sm">
            ERROR: {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-ink font-bold mb-1 uppercase text-sm">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full neo-input"
              placeholder="e.g., alex_learns"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-ink font-bold mb-1 uppercase text-sm">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full neo-input"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full neo-btn-primary py-3 text-lg mt-2 disabled:opacity-50"
          >
            {loading ? "PROCESSING..." : isLogin ? "LOG IN →" : "CREATE ACCOUNT →"}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t-2 border-black flex justify-between items-center">
          <p className="text-gray-700 font-medium">
            {isLogin ? "New to FlashMind?" : "Already have an account?"}
          </p>
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
            className="text-ink font-extrabold hover:underline bg-accent px-3 py-1 neo-border text-sm"
          >
            {isLogin ? "SIGN UP" : "LOG IN"}
          </button>
        </div>
      </div>
    </div>
  );
};
