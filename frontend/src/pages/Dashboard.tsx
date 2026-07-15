import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import { Folder, Plus, Search, Trash2, Zap, FileText, Globe, FileUp, Info } from "lucide-react";

interface Deck {
  id: number;
  name: string;
  folder_id: number | null;
  source_type: string;
  source_name: string | null;
  card_count: number;
  created_at: string;
}

interface FolderData {
  id: number;
  name: string;
  created_at: string;
}

interface DashboardProps {
  onSelectDeck: (deckId: number) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectDeck }) => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Folder & Deck creation
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showDeckModal, setShowDeckModal] = useState(false);
  const [newDeckName, setNewDeckName] = useState("");
  const [newDeckFolderId, setNewDeckFolderId] = useState<number | null>(null);

  // AI Generator states
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiDeckName, setAiDeckName] = useState("");
  const [aiFolderId, setAiFolderId] = useState<string>("");
  const [aiSourceType, setAiSourceType] = useState<"text" | "url" | "file">("text");
  const [aiTextContent, setAiTextContent] = useState("");
  const [aiUrl, setAiUrl] = useState("");
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [aiNumCards, setAiNumCards] = useState(10);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const decksData = await api.get<Deck[]>("/decks");
      const foldersData = await api.get<FolderData[]>("/folders");
      setDecks(decksData);
      setFolders(foldersData);
    } catch (err) {
      console.error("Error loading dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await api.post("/folders", { name: newFolderName });
      setNewFolderName("");
      setShowFolderModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFolder = async (folderId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this folder? Decks inside it will not be deleted, but they will be unassigned.")) return;
    try {
      await api.delete(`/folders/${folderId}`);
      if (selectedFolderId === folderId) {
        setSelectedFolderId(null);
      }
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeckName.trim()) return;
    try {
      const data = await api.post<Deck>("/decks", {
        name: newDeckName,
        folder_id: newDeckFolderId || undefined,
        source_type: "manual"
      });
      setNewDeckName("");
      setNewDeckFolderId(null);
      setShowDeckModal(false);
      onSelectDeck(data.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDeck = async (deckId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this deck?")) return;
    try {
      await api.delete(`/decks/${deckId}`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAIGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiDeckName.trim()) {
      setAiError("Please provide a name for the new deck.");
      return;
    }
    if (aiSourceType === "url" && !aiUrl.trim()) {
      setAiError("Please provide a website URL.");
      return;
    }
    if (aiSourceType === "text" && !aiTextContent.trim()) {
      setAiError("Please input text content.");
      return;
    }
    if (aiSourceType === "file" && !aiFile) {
      setAiError("Please upload a supported file.");
      return;
    }

    setAiError("");
    setAiGenerating(true);

    try {
      const formData = new FormData();
      formData.append("deck_name", aiDeckName);
      if (aiFolderId) {
        formData.append("folder_id", aiFolderId);
      }
      formData.append("source_type", aiSourceType);
      formData.append("num_cards", aiNumCards.toString());

      if (aiSourceType === "text") {
        formData.append("text_content", aiTextContent);
      } else if (aiSourceType === "url") {
        formData.append("url", aiUrl);
      } else if (aiSourceType === "file" && aiFile) {
        formData.append("file", aiFile);
      }

      const response = await api.post<{ deck_id: number }>("/ai/generate", formData);
      setShowAIModal(false);
      
      // Reset fields
      setAiDeckName("");
      setAiFolderId("");
      setAiTextContent("");
      setAiUrl("");
      setAiFile(null);
      
      onSelectDeck(response.deck_id);
    } catch (err: any) {
      setAiError(err.message || "Failed to generate AI flashcards.");
    } finally {
      setAiGenerating(false);
    }
  };

  const filteredDecks = decks.filter((deck) => {
    const matchesFolder = selectedFolderId === null || deck.folder_id === selectedFolderId;
    const matchesSearch = deck.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (deck.source_name && deck.source_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFolder && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 pb-12">
      {/* Top Banner */}
      <div className="bg-primary text-ink p-4 sm:p-6 neo-border shadow-neo mb-6 sm:mb-8 flex flex-col gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black mb-1">DASHBOARD</h2>
          <p className="font-bold text-gray-800 text-sm sm:text-base">
            Generate and review your AI cards. Accelerate your knowledge.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setShowAIModal(true)}
            className="neo-btn bg-accent hover:bg-violet-300 text-ink flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Zap size={18} className="fill-current" />
            AI GENERATE CARDS
          </button>
          <button
            onClick={() => setShowDeckModal(true)}
            className="neo-btn bg-white hover:bg-gray-100 text-ink flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Plus size={18} />
            NEW MANUAL DECK
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 sm:gap-8">
        {/* Sidebar - Folders & Search */}
        <div className="space-y-6 lg:col-span-1">
          {/* Search Card */}
          <div className="bg-white neo-card shadow-neo-sm p-4">
            <h3 className="font-bold uppercase mb-2 tracking-wider text-sm flex items-center gap-2">
              <Search size={16} /> SEARCH DECKS
            </h3>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type deck name..."
              className="w-full neo-input text-sm"
            />
          </div>

          {/* Folders Card */}
          <div className="bg-white neo-card shadow-neo-sm p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                <Folder size={16} /> FOLDERS
              </h3>
              <button
                onClick={() => setShowFolderModal(true)}
                className="p-1 hover:bg-gray-200 neo-border bg-cream"
                title="Create Folder"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setSelectedFolderId(null)}
                className={`w-full text-left font-bold py-1.5 px-3 neo-border text-sm flex justify-between items-center ${
                  selectedFolderId === null ? "bg-primary" : "bg-cream hover:bg-yellow-50"
                }`}
              >
                <span>📂 All Folders</span>
                <span className="bg-white px-2 py-0.5 neo-border text-xs">
                  {decks.length}
                </span>
              </button>

              {folders.map((f) => {
                const count = decks.filter(d => d.folder_id === f.id).length;
                return (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFolderId(f.id)}
                    className={`w-full text-left font-bold py-1.5 px-3 neo-border text-sm flex justify-between items-center group ${
                      selectedFolderId === f.id ? "bg-accent" : "bg-white hover:bg-violet-50"
                    }`}
                  >
                    <span className="truncate">📁 {f.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="bg-cream px-2 py-0.5 neo-border text-xs">
                        {count}
                      </span>
                      <button
                        onClick={(e) => handleDeleteFolder(f.id, e)}
                        className="text-secondary opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-100 neo-border bg-white"
                        title="Delete Folder"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Decks Grid */}
        <div className="lg:col-span-3">
          <h3 className="text-2xl font-black mb-4 tracking-tight flex items-center gap-2">
            DECKS IN {selectedFolderId === null ? "ALL FOLDERS" : folders.find(f => f.id === selectedFolderId)?.name.toUpperCase()}
          </h3>

          {loading ? (
            <div className="text-center py-12 font-bold text-lg">
              LOADING DECKS...
            </div>
          ) : filteredDecks.length === 0 ? (
            <div className="neo-card bg-white py-12 text-center text-gray-500 font-bold">
              NO DECKS FOUND. CREATE ONE ABOVE!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {filteredDecks.map((deck) => (
                <div
                  key={deck.id}
                  onClick={() => onSelectDeck(deck.id)}
                  className="neo-card bg-white cursor-pointer hover:-translate-y-1 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-xl font-bold tracking-tight text-ink hover:underline truncate">
                        {deck.name}
                      </h4>
                      <button
                        onClick={(e) => handleDeleteDeck(deck.id, e)}
                        className="text-secondary hover:text-red-700 p-1 hover:bg-red-50 neo-border bg-white"
                        title="Delete Deck"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      <span className="bg-yellow-100 text-ink text-xs font-bold px-2 py-0.5 neo-border">
                        {deck.card_count} CARDS
                      </span>
                      {deck.source_type !== "manual" && (
                        <span className="bg-violet-100 text-ink text-xs font-bold px-2 py-0.5 neo-border flex items-center gap-1 uppercase">
                          <Zap size={10} className="fill-current text-violet-500" />
                          AI: {deck.source_type}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-600 font-semibold border-t-2 border-black pt-3">
                    <span>
                      {deck.source_name ? `From: ${deck.source_name}` : "Created Manually"}
                    </span>
                    <span>
                      {new Date(deck.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- CREATE FOLDER MODAL --- */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white neo-border-lg p-6 w-full max-w-sm relative">
            <button
              onClick={() => setShowFolderModal(false)}
              className="absolute -top-3 -right-3 bg-secondary text-white font-bold w-8 h-8 rounded-none neo-border flex items-center justify-center cursor-pointer"
            >
              ×
            </button>
            <h3 className="text-xl font-black mb-4">CREATE FOLDER</h3>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block font-bold text-xs uppercase mb-1">Folder Name</label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g., Biology Exam"
                  className="w-full neo-input text-sm"
                  required
                />
              </div>
              <button type="submit" className="w-full neo-btn-primary py-2 text-sm">
                CREATE FOLDER
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- CREATE MANUAL DECK MODAL --- */}
      {showDeckModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white neo-border-lg p-6 w-full max-w-sm relative">
            <button
              onClick={() => setShowDeckModal(false)}
              className="absolute -top-3 -right-3 bg-secondary text-white font-bold w-8 h-8 rounded-none neo-border flex items-center justify-center cursor-pointer"
            >
              ×
            </button>
            <h3 className="text-xl font-black mb-4">NEW MANUAL DECK</h3>
            <form onSubmit={handleCreateDeck} className="space-y-4">
              <div>
                <label className="block font-bold text-xs uppercase mb-1">Deck Name</label>
                <input
                  type="text"
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  placeholder="e.g., Chemistry Formulas"
                  className="w-full neo-input text-sm"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-xs uppercase mb-1">Assign to Folder</label>
                <select
                  value={newDeckFolderId || ""}
                  onChange={(e) => setNewDeckFolderId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full neo-input text-sm"
                >
                  <option value="">No Folder (Unassigned)</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="w-full neo-btn-primary py-2 text-sm">
                CREATE DECK
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- AI GENERATOR MODAL --- */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white neo-border-lg p-6 w-full max-w-xl relative my-8">
            <button
              onClick={() => !aiGenerating && setShowAIModal(false)}
              className="absolute -top-3 -right-3 bg-secondary text-white font-bold w-8 h-8 rounded-none neo-border flex items-center justify-center cursor-pointer disabled:opacity-50"
              disabled={aiGenerating}
            >
              ×
            </button>
            
            <h3 className="text-2xl font-black mb-1 flex items-center gap-2">
              <Zap size={24} className="fill-current text-primary" /> AI FLASHCARD GENERATOR
            </h3>
            <p className="text-gray-600 text-sm font-semibold mb-6">
              Enter content, a website link, or upload notes. Our AI constructs QA pairs instantly.
            </p>

            {aiError && (
              <div className="bg-secondary text-white font-bold p-3 neo-border mb-4 text-xs">
                ERROR: {aiError}
              </div>
            )}

            <form onSubmit={handleAIGenerate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-xs uppercase mb-1">Deck Name</label>
                  <input
                    type="text"
                    value={aiDeckName}
                    onChange={(e) => setAiDeckName(e.target.value)}
                    placeholder="e.g., Cellular Biology"
                    className="w-full neo-input text-sm"
                    disabled={aiGenerating}
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-xs uppercase mb-1">Assign Folder</label>
                  <select
                    value={aiFolderId}
                    onChange={(e) => setAiFolderId(e.target.value)}
                    className="w-full neo-input text-sm"
                    disabled={aiGenerating}
                  >
                    <option value="">No Folder (Unassigned)</option>
                    {folders.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Source Switcher */}
              <div>
                <label className="block font-bold text-xs uppercase mb-1">Source Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAiSourceType("text")}
                    className={`py-2 px-3 font-bold text-xs neo-border flex items-center justify-center gap-1.5 ${
                      aiSourceType === "text" ? "bg-primary" : "bg-cream hover:bg-yellow-50"
                    }`}
                    disabled={aiGenerating}
                  >
                    <FileText size={14} /> NOTES
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiSourceType("url")}
                    className={`py-2 px-3 font-bold text-xs neo-border flex items-center justify-center gap-1.5 ${
                      aiSourceType === "url" ? "bg-primary" : "bg-cream hover:bg-yellow-50"
                    }`}
                    disabled={aiGenerating}
                  >
                    <Globe size={14} /> WEBSITE
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiSourceType("file")}
                    className={`py-2 px-3 font-bold text-xs neo-border flex items-center justify-center gap-1.5 ${
                      aiSourceType === "file" ? "bg-primary" : "bg-cream hover:bg-yellow-50"
                    }`}
                    disabled={aiGenerating}
                  >
                    <FileUp size={14} /> UPLOAD FILE
                  </button>
                </div>
              </div>

              {/* Input Area based on source type */}
              {aiSourceType === "text" && (
                <div>
                  <label className="block font-bold text-xs uppercase mb-1">Raw Notes / Text</label>
                  <textarea
                    value={aiTextContent}
                    onChange={(e) => setAiTextContent(e.target.value)}
                    rows={6}
                    placeholder="Paste notes, slides, transcripts, or summaries here..."
                    className="w-full neo-input text-sm font-sans"
                    disabled={aiGenerating}
                  />
                </div>
              )}

              {aiSourceType === "url" && (
                <div>
                  <label className="block font-bold text-xs uppercase mb-1">Website URL</label>
                  <input
                    type="url"
                    value={aiUrl}
                    onChange={(e) => setAiUrl(e.target.value)}
                    placeholder="https://en.wikipedia.org/wiki/Photosynthesis"
                    className="w-full neo-input text-sm"
                    disabled={aiGenerating}
                  />
                </div>
              )}

              {aiSourceType === "file" && (
                <div className="p-4 bg-yellow-50 neo-border border-dashed border-2 border-black text-center">
                  <input
                    type="file"
                    id="ai-upload"
                    accept=".pdf,.png,.jpg,.jpeg,.txt"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setAiFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                    disabled={aiGenerating}
                  />
                  <label htmlFor="ai-upload" className="cursor-pointer font-bold text-sm hover:underline block">
                    {aiFile ? `Selected: ${aiFile.name}` : "CLICK TO CHOOSE A FILE (PDF, TXT, or IMAGE)"}
                  </label>
                  <span className="text-xs text-gray-500 font-semibold mt-1 block">
                    Images are processed via Gemini Multimodal Vision OCR.
                  </span>
                </div>
              )}

              {/* Slider for card count */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-bold text-xs uppercase">Number of Cards to Generate</label>
                  <span className="bg-black text-white px-2 py-0.5 text-xs font-bold neo-border">
                    {aiNumCards} CARDS
                  </span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="20"
                  value={aiNumCards}
                  onChange={(e) => setAiNumCards(Number(e.target.value))}
                  className="w-full accent-black"
                  disabled={aiGenerating}
                />
              </div>

              {/* Submit / Info */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={aiGenerating}
                  className="w-full neo-btn-primary py-3 text-lg font-black flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {aiGenerating ? (
                    <>
                      <div className="w-5 h-5 border-3 border-black border-t-transparent rounded-full animate-spin"></div>
                      GENERATING DECK USING AI...
                    </>
                  ) : (
                    <>
                      <Zap size={18} className="fill-current" /> GENERATE NOW
                    </>
                  )}
                </button>
                <div className="flex gap-1.5 items-center mt-3 text-xs text-gray-500 font-semibold justify-center">
                  <Info size={12} />
                  <span>Uses gemini-1.5-flash for structured generation. Fallbacks enabled if offline.</span>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
