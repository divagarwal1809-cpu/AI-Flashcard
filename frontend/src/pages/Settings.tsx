import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import { Key, BarChart3, Database, Save, Upload, CheckCircle } from "lucide-react";

interface Stats {
  total_folders: number;
  total_decks: number;
  total_cards: number;
  due_cards: number;
  total_sessions: number;
  cards_studied: number;
  average_accuracy: number;
}

interface Folder {
  id: number;
  name: string;
}

export const Settings: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  // API Key config
  const [apiKey, setApiKey] = useState("");
  const [keySaved, setKeySaved] = useState(false);

  // Import config
  const [importJson, setImportJson] = useState("");
  const [importFolderId, setImportFolderId] = useState<number | null>(null);
  const [importSuccess, setImportSuccess] = useState("");
  const [importError, setImportError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, foldersData] = await Promise.all([
        api.get<Stats>("/stats"),
        api.get<Folder[]>("/folders")
      ]);
      setStats(statsData);
      setFolders(foldersData);
      setApiKey(api.getApiKey());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    api.setApiKey(apiKey);
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportSuccess("");
    setImportError("");
    
    if (!importJson.trim()) return;

    try {
      const parsed = JSON.parse(importJson);
      if (!parsed.deck_name || !Array.isArray(parsed.cards)) {
        throw new Error("Invalid format. Must contain 'deck_name' (string) and 'cards' (array).");
      }

      const url = `/decks/import${importFolderId ? `?folder_id=${importFolderId}` : ""}`;
      const response = await api.post<{ deck_id: number; cards_imported: number }>(url, parsed);

      setImportSuccess(`Success! Imported deck with ${response.cards_imported} cards.`);
      setImportJson("");
      
      // Reload stats
      const statsData = await api.get<Stats>("/stats");
      setStats(statsData);
    } catch (err: any) {
      setImportError(err.message || "Failed to parse JSON. Check format.");
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-sm text-[#64748B]">Loading settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Workspace Settings</h1>
        <p className="text-sm text-[#64748B] mt-0.5">Manage study stats, API integrations, and import/export configurations.</p>
      </div>

      {/* Stats Cards Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card !p-5">
            <span className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1">Decks</span>
            <span className="text-2xl font-bold text-[#0F172A]">{stats.total_decks}</span>
          </div>
          <div className="card !p-5">
            <span className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1">Total Cards</span>
            <span className="text-2xl font-bold text-[#0F172A]">{stats.total_cards}</span>
          </div>
          <div className="card !p-5">
            <span className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1">Due Review</span>
            <span className="text-2xl font-bold text-amber-600">{stats.due_cards}</span>
          </div>
          <div className="card !p-5">
            <span className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1">Sessions</span>
            <span className="text-2xl font-bold text-[#7C3AED]">{stats.total_sessions}</span>
          </div>
        </div>
      )}

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Side: Stats & Key */}
        <div className="space-y-6">
          {/* Detailed Study Stats */}
          <div className="card">
            <h3 className="font-semibold text-[#0F172A] border-b border-[#EFE7FC] pb-3 mb-4 flex items-center gap-2 text-sm">
              <BarChart3 size={16} className="text-[#7C3AED]" /> Study Performance
            </h3>
            {stats && (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#64748B]">Total Cards Studied:</span>
                  <span className="font-semibold text-[#0F172A]">{stats.cards_studied}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#64748B]">Average Session Accuracy:</span>
                  <span className="font-semibold text-[#0F172A]">{Math.round(stats.average_accuracy)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#64748B]">Organized Folders:</span>
                  <span className="font-semibold text-[#0F172A]">{stats.total_folders}</span>
                </div>
              </div>
            )}
          </div>

          {/* API Key Panel */}
          <div className="card">
            <h3 className="font-semibold text-[#0F172A] border-b border-[#EFE7FC] pb-3 mb-3 flex items-center gap-2 text-sm">
              <Key size={16} className="text-[#7C3AED]" /> Gemini API Override
            </h3>
            <p className="text-xs text-[#64748B] mb-4 leading-relaxed">
              Provide your own Google Gemini API key to override the server configuration. The key is stored locally in your browser storage.
            </p>

            <form onSubmit={handleSaveKey} className="space-y-3">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="input"
              />
              <button type="submit" className="btn-primary w-full justify-center text-xs">
                {keySaved ? (
                  <>
                    <CheckCircle size={14} /> Saved!
                  </>
                ) : (
                  <>
                    <Save size={14} /> Save Key
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Import Deck */}
        <div className="card flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-[#0F172A] border-b border-[#EFE7FC] pb-3 mb-3 flex items-center gap-2 text-sm">
              <Database size={16} className="text-[#7C3AED]" /> Import Study Deck
            </h3>
            <p className="text-xs text-[#64748B] mb-4 leading-relaxed">
              Paste a JSON string matching the export schema to import an entire flashcard deck.
            </p>

            {importSuccess && (
              <div className="bg-[#F0FDF9] border border-green-200 text-[#059669] text-xs px-3 py-2 rounded-lg mb-4">
                {importSuccess}
              </div>
            )}
            {importError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg mb-4">
                {importError}
              </div>
            )}

            <form onSubmit={handleImport} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Assign to Folder</label>
                <select
                  value={importFolderId || ""}
                  onChange={(e) => setImportFolderId(e.target.value ? Number(e.target.value) : null)}
                  className="input"
                >
                  <option value="">No Folder (Unassigned)</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">JSON Content</label>
                <textarea
                  value={importJson}
                  onChange={(e) => setImportJson(e.target.value)}
                  rows={5}
                  placeholder={`{\n  "deck_name": "Biology Deck",\n  "cards": [\n    { "front": "Define ATP", "back": "Adenosine Triphosphate..." }\n  ]\n}`}
                  className="input font-mono text-xs"
                  required
                />
              </div>

              <button type="submit" className="btn-secondary w-full justify-center text-xs">
                <Upload size={14} /> Import Deck
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
