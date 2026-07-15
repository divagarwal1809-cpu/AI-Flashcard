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
      const statsData = await api.get<Stats>("/stats");
      const foldersData = await api.get<Folder[]>("/folders");
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
      
      // Simple schema check
      if (!parsed.deck_name || !Array.isArray(parsed.cards)) {
        throw new Error("Invalid format. Must contain 'deck_name' (string) and 'cards' (array of {front, back}).");
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
    return <div className="text-center py-12 font-bold text-lg">LOADING SETTINGS...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pb-12 space-y-8">
      <h2 className="text-3xl font-black mb-6 tracking-tight flex items-center gap-2">
        <Database size={28} /> STATS & CONFIGURATIONS
      </h2>

      {/* Stats Cards Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white neo-card p-4 text-center">
            <span className="block text-gray-500 font-bold text-xs uppercase tracking-wider">Decks</span>
            <span className="text-3xl font-black">{stats.total_decks}</span>
          </div>
          <div className="bg-white neo-card p-4 text-center">
            <span className="block text-gray-500 font-bold text-xs uppercase tracking-wider">Total Cards</span>
            <span className="text-3xl font-black">{stats.total_cards}</span>
          </div>
          <div className="bg-white neo-card p-4 text-center">
            <span className="block text-gray-500 font-bold text-xs uppercase tracking-wider">Due Review</span>
            <span className="text-3xl font-black text-secondary">{stats.due_cards}</span>
          </div>
          <div className="bg-white neo-card p-4 text-center">
            <span className="block text-gray-500 font-bold text-xs uppercase tracking-wider">Sessions</span>
            <span className="text-3xl font-black text-accent-primary">{stats.total_sessions}</span>
          </div>
        </div>
      )}

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Side: Stats & Key */}
        <div className="space-y-8">
          {/* Detailed Study Stats */}
          <div className="bg-white neo-card shadow-neo p-6 space-y-4">
            <h3 className="text-xl font-black border-b-2 border-black pb-2 flex items-center gap-2">
              <BarChart3 size={18} /> STUDY PERFORMANCE
            </h3>
            {stats && (
              <div className="space-y-3">
                <div className="flex justify-between font-bold text-sm">
                  <span className="text-gray-600">Total Cards Studied:</span>
                  <span>{stats.cards_studied}</span>
                </div>
                <div className="flex justify-between font-bold text-sm">
                  <span className="text-gray-600">Average Session Accuracy:</span>
                  <span>{Math.round(stats.average_accuracy)}%</span>
                </div>
                <div className="flex justify-between font-bold text-sm">
                  <span className="text-gray-600">Organized Folders:</span>
                  <span>{stats.total_folders}</span>
                </div>
              </div>
            )}
          </div>

          {/* API Key Panel */}
          <div className="bg-white neo-card shadow-neo p-6 space-y-4">
            <h3 className="text-xl font-black border-b-2 border-black pb-2 flex items-center gap-2">
              <Key size={18} /> GEMINI API OVERRIDE
            </h3>
            <p className="text-xs font-semibold text-gray-600">
              Provide your own Google Gemini API key to override the server configuration. The key is stored locally in your browser storage.
            </p>

            <form onSubmit={handleSaveKey} className="space-y-3">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full neo-input text-xs"
              />
              <button type="submit" className="neo-btn-primary py-2 px-4 text-xs flex items-center gap-1.5">
                {keySaved ? (
                  <>
                    <CheckCircle size={14} /> SAVED!
                  </>
                ) : (
                  <>
                    <Save size={14} /> SAVE KEY
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Import Deck */}
        <div className="bg-white neo-card shadow-neo p-6 space-y-4">
          <h3 className="text-xl font-black border-b-2 border-black pb-2 flex items-center gap-2">
            <Database size={18} /> IMPORT STUDY DECK
          </h3>
          <p className="text-xs font-semibold text-gray-600">
            Paste a JSON string matching the export schema to import an entire flashcard deck.
          </p>

          {importSuccess && (
            <div className="bg-success/20 neo-border p-3 font-bold text-xs text-green-800">
              {importSuccess}
            </div>
          )}
          {importError && (
            <div className="bg-secondary text-white p-3 neo-border font-bold text-xs">
              {importError}
            </div>
          )}

          <form onSubmit={handleImport} className="space-y-4">
            <div>
              <label className="block font-bold text-xs uppercase mb-1">Assign to Folder</label>
              <select
                value={importFolderId || ""}
                onChange={(e) => setImportFolderId(e.target.value ? Number(e.target.value) : null)}
                className="w-full neo-input text-xs"
              >
                <option value="">No Folder (Unassigned)</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block font-bold text-xs uppercase mb-1">JSON Content</label>
              <textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                rows={6}
                placeholder={`{
  "deck_name": "My Biology Deck",
  "cards": [
    { "front": "Define ATP", "back": "Adenosine Triphosphate..." }
  ]
}`}
                className="w-full neo-input text-xs font-mono"
                required
              />
            </div>

            <button type="submit" className="neo-btn-secondary py-2.5 px-5 text-xs flex items-center gap-1.5 text-ink">
              <Upload size={14} /> IMPORT DECK
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
