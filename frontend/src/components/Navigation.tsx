import { useState } from "react";
import { LayoutDashboard, Settings, BookOpen, LogOut, Menu, X } from "lucide-react";

interface Props {
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
  user: { username: string } | null;
}

export function Navigation({ currentView, onViewChange, onLogout, user }: Props) {
  const [open, setOpen] = useState(false);

  const active = (view: string) =>
    currentView === view || (view === "dashboard" && currentView.startsWith("deck-"));

  const NavLink = ({ view, icon, label }: { view: string; icon: React.ReactNode; label: string }) => (
    <button
      onClick={() => { onViewChange(view); setOpen(false); }}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
        active(view)
          ? "bg-[#F7F3FD] text-[#7C3AED]"
          : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F7F3FD]"
      }`}
    >
      {icon} {label}
    </button>
  );

  return (
    <header className="bg-white border-b border-[#EFE7FC] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <button
          onClick={() => onViewChange("dashboard")}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div className="w-7 h-7 rounded-lg bg-[#7C3AED] flex items-center justify-center">
            <BookOpen size={15} className="text-white" />
          </div>
          <span className="font-bold text-[#0F172A] text-base">FlashMind</span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1">
          <NavLink view="dashboard" icon={<LayoutDashboard size={15} />} label="Dashboard" />
          <NavLink view="settings" icon={<Settings size={15} />} label="Settings" />
        </nav>

        <div className="hidden sm:flex items-center gap-3">
          {user && (
            <span className="text-sm text-[#64748B] font-medium">{user.username}</span>
          )}
          <button onClick={onLogout} className="btn-ghost text-sm cursor-pointer">
            <LogOut size={15} /> Logout
          </button>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="sm:hidden p-2 text-[#64748B] hover:text-[#0F172A] cursor-pointer"
          onClick={() => setOpen(o => !o)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="sm:hidden border-t border-[#EFE7FC] px-4 py-3 flex flex-col gap-1 bg-white">
          <NavLink view="dashboard" icon={<LayoutDashboard size={15} />} label="Dashboard" />
          <NavLink view="settings" icon={<Settings size={15} />} label="Settings" />
          <button onClick={() => { onLogout(); setOpen(false); }} className="btn-ghost justify-start mt-1 cursor-pointer">
            <LogOut size={15} /> Logout
          </button>
        </div>
      )}
    </header>
  );
}
