import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import { Folder, Plus, Search, Trash2, Zap, FileText, Globe, FileUp, X, ChevronRight } from "lucide-react";

interface Deck {
  id: number;
  name: string;
  folder_id: number | null;
  source_type: string;
  source_name: string | null;
  card_count: number;
  created_at: string;
}

interface FolderData { id: number; name: string; created_at: string; }

export function Dashboard({ onSelectDeck }: { onSelectDeck: (id: number) => void }) {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showDeckModal, setShowDeckModal] = useState(false);
  const [newDeckName, setNewDeckName] = useState("");
  const [newDeckFolderId, setNewDeckFolderId] = useState<number | null>(null);

  const [showAIModal, setShowAIModal] = useState(false);
  const [aiDeckName, setAiDeckName] = useState("");
  const [aiFolderId, setAiFolderId] = useState("");
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
      const [decksData, foldersData] = await Promise.all([
        api.get<Deck[]>("/decks"),
        api.get<FolderData[]>("/folders"),
      ]);
      setDecks(decksData);
      setFolders(foldersData);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    await api.post("/folders", { name: newFolderName });
    setNewFolderName(""); setShowFolderModal(false); fetchData();
  };

  const handleDeleteFolder = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this folder? Decks inside will be unassigned.")) return;
    await api.delete(`/folders/${id}`);
    if (selectedFolderId === id) setSelectedFolderId(null);
    fetchData();
  };

  const handleCreateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeckName.trim()) return;
    const data = await api.post<Deck>("/decks", { name: newDeckName, folder_id: newDeckFolderId || undefined, source_type: "manual" });
    setNewDeckName(""); setNewDeckFolderId(null); setShowDeckModal(false);
    onSelectDeck(data.id);
  };

  const handleDeleteDeck = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this deck?")) return;
    await api.delete(`/decks/${id}`); fetchData();
  };

  const handleAIGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiDeckName.trim()) { setAiError("Please name the deck."); return; }
    if (aiSourceType === "url" && !aiUrl.trim()) { setAiError("Provide a URL."); return; }
    if (aiSourceType === "text" && !aiTextContent.trim()) { setAiError("Paste some text."); return; }
    if (aiSourceType === "file" && !aiFile) { setAiError("Choose a file."); return; }

    setAiError(""); setAiGenerating(true);
    try {
      const fd = new FormData();
      fd.append("deck_name", aiDeckName);
      if (aiFolderId) fd.append("folder_id", aiFolderId);
      fd.append("source_type", aiSourceType);
      fd.append("num_cards", aiNumCards.toString());
      if (aiSourceType === "text") fd.append("text_content", aiTextContent);
      else if (aiSourceType === "url") fd.append("url", aiUrl);
      else if (aiFile) fd.append("file", aiFile);
      const res = await api.post<{ deck_id: number }>("/ai/generate", fd);
      setShowAIModal(false);
      setAiDeckName(""); setAiFolderId(""); setAiTextContent(""); setAiUrl(""); setAiFile(null);
      onSelectDeck(res.deck_id);
    } catch (err: any) {
      setAiError(err.message || "AI generation failed.");
    } finally { setAiGenerating(false); }
  };

  const filtered = decks.filter(d => {
    const inFolder = selectedFolderId === null || d.folder_id === selectedFolderId;
    const matches = d.name.toLowerCase().includes(searchQuery.toLowerCase());
    return inFolder && matches;
  });

  return (
    <div>
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">My Decks</h1>
          <p className="text-sm text-[#64748B] mt-0.5">{decks.length} deck{decks.length !== 1 ? "s" : ""} total</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowDeckModal(true)} className="btn-secondary cursor-pointer">
            <Plus size={16} /> New deck
          </button>
          <button onClick={() => setShowAIModal(true)} className="btn-primary cursor-pointer">
            <Zap size={16} /> Generate with AI
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <aside className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              className="input pl-9"
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search decks..."
            />
          </div>

          {/* Folders */}
          <div className="card !p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Folders</span>
              <button
                onClick={() => setShowFolderModal(true)}
                className="p-1 rounded-md hover:bg-[#F7F3FD] text-[#94A3B8] hover:text-[#7C3AED] transition-colors cursor-pointer"
                title="New folder"
              >
                <Plus size={15} />
              </button>
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedFolderId(null)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm transition-colors cursor-pointer ${
                  selectedFolderId === null ? "bg-[#F7F3FD] text-[#7C3AED] font-semibold" : "text-[#64748B] hover:bg-[#F7F3FD] hover:text-[#0F172A]"
                }`}
              >
                <span className="flex items-center gap-2"><Folder size={14} /> All decks</span>
                <span className="text-xs bg-[#EFE7FC] text-[#7C3AED] px-1.5 py-0.5 rounded-full font-medium">{decks.length}</span>
              </button>
              {folders.map(f => {
                const count = decks.filter(d => d.folder_id === f.id).length;
                return (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFolderId(f.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm transition-colors group cursor-pointer ${
                      selectedFolderId === f.id ? "bg-[#F7F3FD] text-[#7C3AED] font-semibold" : "text-[#64748B] hover:bg-[#F7F3FD] hover:text-[#0F172A]"
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate"><Folder size={14} /> {f.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs bg-[#EFE7FC] text-[#7C3AED] px-1.5 py-0.5 rounded-full font-medium">{count}</span>
                      <button
                        onClick={e => handleDeleteFolder(f.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500 transition-all cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Deck grid */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="text-center py-16 text-[#64748B] text-sm">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="card text-center py-16 border-dashed !border-[#EFE7FC]">
              <p className="text-[#64748B] text-sm mb-4">No decks here yet.</p>
              <button onClick={() => setShowAIModal(true)} className="btn-primary cursor-pointer">
                <Zap size={15} /> Generate with AI
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map((deck, i) => (
                <div
                  key={deck.id}
                  onClick={() => onSelectDeck(deck.id)}
                  className={`card cursor-pointer flex flex-col justify-between group animate-fade-up delay-${Math.min(i * 75, 225)}`}
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-[#0F172A] group-hover:text-[#7C3AED] transition-colors leading-snug pr-2">
                        {deck.name}
                      </h3>
                      <button
                        onClick={e => handleDeleteDeck(deck.id, e)}
                        className="shrink-0 p-1 text-[#CBD5E1] hover:text-red-500 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="badge bg-[#F7F3FD] text-[#7C3AED]">{deck.card_count} cards</span>
                      {deck.source_type !== "manual" && (
                        <span className="badge bg-amber-50 text-amber-700">
                          <Zap size={10} /> AI
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#EFE7FC]">
                    <span className="text-xs text-[#94A3B8] truncate">{deck.source_name || "Manual"}</span>
                    <ChevronRight size={15} className="text-[#CBD5E1] group-hover:text-[#7C3AED] transition-colors shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal backdrop helper */}
      {(showFolderModal || showDeckModal || showAIModal) && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => { if (!aiGenerating) { setShowFolderModal(false); setShowDeckModal(false); setShowAIModal(false); } }}
        />
      )}

      {/* Create Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-sm !p-6 animate-pop-in relative">
            <button onClick={() => setShowFolderModal(false)} className="absolute top-4 right-4 text-[#94A3B8] hover:text-[#0F172A] cursor-pointer"><X size={18} /></button>
            <h2 className="font-bold text-[#0F172A] mb-4">New folder</h2>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <input className="input" type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Biology Exam" required />
              <button type="submit" className="btn-primary w-full justify-center cursor-pointer">Create</button>
            </form>
          </div>
        </div>
      )}

      {/* Create Manual Deck Modal */}
      {showDeckModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-sm !p-6 animate-pop-in relative">
            <button onClick={() => setShowDeckModal(false)} className="absolute top-4 right-4 text-[#94A3B8] hover:text-[#0F172A] cursor-pointer"><X size={18} /></button>
            <h2 className="font-bold text-[#0F172A] mb-4">New deck</h2>
            <form onSubmit={handleCreateDeck} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">Deck name</label>
                <input className="input" type="text" value={newDeckName} onChange={e => setNewDeckName(e.target.value)} placeholder="Chemistry Formulas" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">Folder (optional)</label>
                <select className="input" value={newDeckFolderId || ""} onChange={e => setNewDeckFolderId(e.target.value ? Number(e.target.value) : null)}>
                  <option value="">No folder</option>
                  {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <button type="submit" className="btn-primary w-full justify-center cursor-pointer">Create</button>
            </form>
          </div>
        </div>
      )}

      {/* AI Generator Modal */}
      {showAIModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="card w-full max-w-lg !p-6 animate-pop-in relative my-8">
            <button
              onClick={() => !aiGenerating && setShowAIModal(false)}
              disabled={aiGenerating}
              className="absolute top-4 right-4 text-[#94A3B8] hover:text-[#0F172A] disabled:opacity-40 cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-[#7C3AED] flex items-center justify-center">
                <Zap size={14} className="text-white" />
              </div>
              <h2 className="font-bold text-[#0F172A]">Generate with AI</h2>
            </div>
            <p className="text-sm text-[#64748B] mb-5">Paste text, a URL, or upload a file — Gemini builds the deck.</p>

            {aiError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg mb-4">{aiError}</div>
            )}

            <form onSubmit={handleAIGenerate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">Deck name</label>
                  <input className="input" type="text" value={aiDeckName} onChange={e => setAiDeckName(e.target.value)} placeholder="Cellular Biology" disabled={aiGenerating} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">Folder</label>
                  <select className="input" value={aiFolderId} onChange={e => setAiFolderId(e.target.value)} disabled={aiGenerating}>
                    <option value="">No folder</option>
                    {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Source type tabs */}
              <div className="flex rounded-lg border border-[#EFE7FC] overflow-hidden">
                {(["text", "url", "file"] as const).map((type, i) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setAiSourceType(type)}
                    disabled={aiGenerating}
                    className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 transition-colors cursor-pointer ${
                      i > 0 ? "border-l border-[#EFE7FC]" : ""
                    } ${aiSourceType === type ? "bg-[#F7F3FD] text-[#7C3AED]" : "text-[#64748B] hover:bg-[#FAFAFA]"}`}
                  >
                    {type === "text" && <><FileText size={13} /> Notes</>}
                    {type === "url"  && <><Globe size={13} /> Website</>}
                    {type === "file" && <><FileUp size={13} /> File</>}
                  </button>
                ))}
              </div>

              {/* Source input */}
              {aiSourceType === "text" && (
                <textarea
                  className="input resize-none"
                  rows={5}
                  value={aiTextContent}
                  onChange={e => setAiTextContent(e.target.value)}
                  placeholder="Paste your notes, slides, or summaries here..."
                  disabled={aiGenerating}
                />
              )}
              {aiSourceType === "url" && (
                <input className="input" type="url" value={aiUrl} onChange={e => setAiUrl(e.target.value)} placeholder="https://en.wikipedia.org/wiki/Photosynthesis" disabled={aiGenerating} />
              )}
              {aiSourceType === "file" && (
                <label className="block border-2 border-dashed border-[#EFE7FC] rounded-xl p-6 text-center cursor-pointer hover:border-[#7C3AED] transition-colors">
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg,.txt" className="hidden" disabled={aiGenerating}
                    onChange={e => e.target.files?.[0] && setAiFile(e.target.files[0])} />
                  <FileUp size={24} className="mx-auto mb-2 text-[#94A3B8]" />
                  <p className="text-sm font-medium text-[#0F172A]">{aiFile ? aiFile.name : "Click to upload"}</p>
                  <p className="text-xs text-[#94A3B8] mt-1">PDF, TXT, PNG, JPG</p>
                </label>
              )}

              {/* Card count */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm font-medium text-[#0F172A]">Number of cards</label>
                  <span className="text-sm font-bold text-[#7C3AED]">{aiNumCards}</span>
                </div>
                <input type="range" min="3" max="20" value={aiNumCards} onChange={e => setAiNumCards(Number(e.target.value))}
                  className="w-full accent-[#7C3AED] cursor-pointer" disabled={aiGenerating} />
              </div>

              <button type="submit" disabled={aiGenerating} className="btn-primary w-full justify-center py-3 cursor-pointer">
                {aiGenerating ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</>
                ) : (
                  <><Zap size={16} /> Generate now</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
