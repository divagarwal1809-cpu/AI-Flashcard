import { useState, useEffect } from "react";
import { api } from "./utils/api";
import { Auth } from "./pages/Auth";
import { Navigation } from "./components/Navigation";
import { Dashboard } from "./pages/Dashboard";
import { DeckDetail } from "./pages/DeckDetail";
import { StudyMode } from "./pages/StudyMode";
import { ChatPage } from "./pages/ChatPage";
import { Settings } from "./pages/Settings";

export default function App() {
  const [token, setToken] = useState<string | null>(api.getToken());
  const [user, setUser] = useState<{ id: number; username: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(() => localStorage.getItem("theme") === "dark");

  // Simple state router
  const [currentView, setCurrentView] = useState<string>("dashboard");
  const [activeDeckId, setActiveDeckId] = useState<number | null>(null);

  // Toggle dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) { root.classList.add("dark"); localStorage.setItem("theme", "dark"); }
    else { root.classList.remove("dark"); localStorage.setItem("theme", "light"); }
  }, [isDark]);

  const fetchCurrentUser = async () => {
    try {
      const userData = await api.get<{ id: number; username: string }>("/auth/me");
      setUser(userData);
    } catch {
      api.clearToken(); setToken(null); setUser(null);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (token) fetchCurrentUser(); else setLoading(false);
  }, [token]);

  const handleAuthSuccess = (newToken: string) => {
    setToken(newToken); setCurrentView("dashboard");
  };

  const handleLogout = () => {
    api.clearToken(); setToken(null); setUser(null);
    setCurrentView("dashboard"); setActiveDeckId(null);
  };

  const handleSelectDeck = (deckId: number) => {
    setActiveDeckId(deckId); setCurrentView("deck-detail");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream font-sans px-4">
        <div className="bg-white neo-border p-6 shadow-neo font-bold text-lg flex items-center gap-3 animate-bounce-in">
          <div className="w-6 h-6 border-3 border-black border-t-transparent rounded-full animate-spin" />
          INITIALIZING FLASHMIND AI...
        </div>
      </div>
    );
  }

  if (!token || !user) return <Auth onAuthSuccess={handleAuthSuccess} />;

  return (
    <div className="min-h-screen bg-cream font-sans flex flex-col">
      <Navigation
        currentView={currentView}
        onViewChange={(view) => { setCurrentView(view); if (view === "dashboard") setActiveDeckId(null); }}
        onLogout={handleLogout}
        user={user}
        isDark={isDark}
        onToggleTheme={() => setIsDark((d) => !d)}
      />

      <main className="flex-1 animate-fade-in" key={currentView}>
        {currentView === "dashboard" && <Dashboard onSelectDeck={handleSelectDeck} />}
        {currentView === "settings" && <Settings />}
        {currentView === "deck-detail" && activeDeckId !== null && (
          <DeckDetail
            deckId={activeDeckId}
            onBack={() => { setCurrentView("dashboard"); setActiveDeckId(null); }}
            onStartStudy={(id) => { setActiveDeckId(id); setCurrentView("study"); }}
            onOpenChat={(id) => { setActiveDeckId(id); setCurrentView("chat"); }}
          />
        )}
        {currentView === "study" && activeDeckId !== null && (
          <StudyMode deckId={activeDeckId} onBack={() => setCurrentView("deck-detail")} />
        )}
        {currentView === "chat" && activeDeckId !== null && (
          <ChatPage deckId={activeDeckId} onBack={() => setCurrentView("deck-detail")} />
        )}
      </main>
    </div>
  );
}
