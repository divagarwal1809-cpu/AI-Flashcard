import React, { useState } from "react";
import { LogOut, LayoutDashboard, Settings, BookOpen, Sun, Moon, Menu, X } from "lucide-react";

interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
  user: { username: string } | null;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentView, onViewChange, onLogout, user, isDark, onToggleTheme,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const navBtn = (view: string, label: string, icon: React.ReactNode, activeColors: string) => (
    <button
      onClick={() => { onViewChange(view); setMenuOpen(false); }}
      className={`flex items-center gap-2 px-3 py-2 font-bold text-sm neo-border rounded-none transition-all w-full sm:w-auto justify-start sm:justify-center ${
        currentView === view || (view === "dashboard" && currentView.startsWith("deck-"))
          ? activeColors + " shadow-none"
          : "bg-white hover:bg-gray-100 shadow-neo-sm"
      }`}
    >
      {icon}{label}
    </button>
  );

  return (
    <nav className="bg-white border-b-4 border-black py-3 px-4 mb-6 shadow-neo-sm">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        {/* Brand */}
        <div
          onClick={() => { onViewChange("dashboard"); setMenuOpen(false); }}
          className="flex items-center gap-2 cursor-pointer select-none"
        >
          <div className="bg-primary text-ink p-1 neo-border rotate-[-3deg] font-black text-lg">FM</div>
          <span className="text-xl font-black tracking-tight text-ink">
            FlashMind <span className="text-secondary">AI</span>
          </span>
        </div>

        {/* Desktop nav buttons */}
        <div className="hidden sm:flex items-center gap-2">
          {navBtn("dashboard", "DASHBOARD", <LayoutDashboard size={15} />, "bg-primary")}
          {navBtn("settings", "SETTINGS", <Settings size={15} />, "bg-accent")}

          {user && (
            <div className="hidden md:flex items-center gap-1.5 bg-yellow-100 px-3 py-2 neo-border font-bold text-sm">
              <BookOpen size={15} />
              {user.username.toUpperCase()}
            </div>
          )}

          <button
            onClick={onToggleTheme}
            className="theme-toggle flex items-center gap-1.5"
            title={isDark ? "Switch to Light" : "Switch to Dark"}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
            {isDark ? "LIGHT" : "DARK"}
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-3 py-2 font-bold text-sm neo-border bg-secondary text-white hover:bg-red-500 rounded-none shadow-neo-sm transition-all"
          >
            <LogOut size={15} /> LOG OUT
          </button>
        </div>

        {/* Mobile: theme toggle + hamburger */}
        <div className="flex sm:hidden items-center gap-2">
          <button onClick={onToggleTheme} className="theme-toggle flex items-center gap-1" title="Toggle theme">
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="neo-border p-2 bg-white font-bold"
            aria-label="Menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="sm:hidden mt-3 flex flex-col gap-2 border-t-2 border-black pt-3 animate-slide-up">
          {navBtn("dashboard", "DASHBOARD", <LayoutDashboard size={15} />, "bg-primary")}
          {navBtn("settings", "SETTINGS", <Settings size={15} />, "bg-accent")}
          {user && (
            <div className="flex items-center gap-1.5 bg-yellow-100 px-3 py-2 neo-border font-bold text-sm">
              <BookOpen size={15} /> {user.username.toUpperCase()}
            </div>
          )}
          <button
            onClick={() => { onLogout(); setMenuOpen(false); }}
            className="flex items-center gap-2 px-3 py-2 font-bold text-sm neo-border bg-secondary text-white hover:bg-red-500 rounded-none shadow-neo-sm transition-all"
          >
            <LogOut size={15} /> LOG OUT
          </button>
        </div>
      )}
    </nav>
  );
};
