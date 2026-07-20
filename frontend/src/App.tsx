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
  const [currentView, setCurrentView] = useState<string>("dashboard");
  const [activeDeckId, setActiveDeckId] = useState<number | null>(null);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!token || !user) {
    return <Auth onAuthSuccess={(t) => { setToken(t); setCurrentView("dashboard"); }} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation
        currentView={currentView}
        onViewChange={(view) => { setCurrentView(view); if (view === "dashboard") setActiveDeckId(null); }}
        onLogout={() => { api.clearToken(); setToken(null); setUser(null); setCurrentView("dashboard"); setActiveDeckId(null); }}
        user={user}
      />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 animate-fade-in" key={currentView}>
        {currentView === "dashboard" && <Dashboard onSelectDeck={(id) => { setActiveDeckId(id); setCurrentView("deck-detail"); }} />}
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
