import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import { ArrowLeft, BookOpen, MessageSquare, Plus, Trash2, Edit2, Download, Save, X, Calendar } from "lucide-react";

interface Card {
  id: number; deck_id: number; front: string; back: string;
  interval: number; ease_factor: number; repetitions: number;
  next_review: string; created_at: string;
}
interface Deck {
  id: number; name: string; folder_id: number | null;
  source_type: string; source_name: string | null;
  card_count: number; created_at: string;
}
interface Folder { id: number; name: string; }

interface Props { deckId: number; onBack: () => void; onStartStudy: (id: number) => void; onOpenChat: (id: number) => void; }

export function DeckDetail({ deckId, onBack, onStartStudy, onOpenChat }: Props) {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEditingDeck, setIsEditingDeck] = useState(false);
  const [editDeckName, setEditDeckName] = useState("");
  const [editFolderId, setEditFolderId] = useState<number | null>(null);

  const [showAddCard, setShowAddCard] = useState(false);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");

  const [editingCardId, setEditingCardId] = useState<number | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [deckData, cardsData, foldersData] = await Promise.all([
        api.get<Deck>(`/decks/${deckId}`),
        api.get<Card[]>(`/decks/${deckId}/cards`),
        api.get<Folder[]>("/folders"),
      ]);
      setDeck(deckData); setCards(cardsData); setFolders(foldersData);
      setEditDeckName(deckData.name); setEditFolderId(deckData.folder_id);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [deckId]);

  const handleUpdateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDeckName.trim()) return;
    const data = await api.put<Deck>(`/decks/${deckId}`, { name: editDeckName, folder_id: editFolderId === null ? 0 : editFolderId });
    setDeck(data); setIsEditingDeck(false); loadData();
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim()) return;
    const card = await api.post<Card>(`/decks/${deckId}/cards`, { front: newFront, back: newBack });
    setCards([...cards, card]); setNewFront(""); setNewBack(""); setShowAddCard(false);
  };

  const handleDeleteCard = async (id: number) => {
    if (!confirm("Delete this card?")) return;
    await api.delete(`/flashcards/${id}`);
    setCards(cards.filter(c => c.id !== id));
  };

  const handleSaveCard = async (id: number) => {
    if (!editFront.trim() || !editBack.trim()) return;
    const updated = await api.put<Card>(`/flashcards/${id}`, { front: editFront, back: editBack });
    setCards(cards.map(c => c.id === id ? updated : c)); setEditingCardId(null);
  };

  const handleExport = () => {
    if (!deck) return;
    const json = JSON.stringify({ deck_name: deck.name, source_type: deck.source_type, cards: cards.map(c => ({ front: c.front, back: c.back })) }, null, 2);
    const a = document.createElement("a");
    a.href = `data:text/json;charset=utf-8,${encodeURIComponent(json)}`;
    a.download = `${deck.name.replace(/\s+/g, "_")}.json`;
    a.click();
  };

  const dueCount = cards.filter(c => new Date(c.next_review) <= new Date()).length;

  if (loading) return <div className="text-center py-12 text-sm text-[#64748B]">Loading deck...</div>;
  if (!deck) return <div className="text-center py-12 text-sm text-[#64748B]">Deck not found.</div>;

  return (
    <div>
      {/* Back */}
      <button onClick={onBack} className="btn-ghost mb-6 cursor-pointer">
        <ArrowLeft size={16} /> Back
      </button>

      {/* Deck header */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {isEditingDeck ? (
              <form onSubmit={handleUpdateDeck} className="space-y-3 max-w-md">
                <input className="input font-semibold" value={editDeckName} onChange={e => setEditDeckName(e.target.value)} required />
                <select className="input" value={editFolderId || ""} onChange={e => setEditFolderId(e.target.value ? Number(e.target.value) : null)}>
                  <option value="">No folder</option>
                  {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary cursor-pointer"><Save size={14} /> Save</button>
                  <button type="button" onClick={() => setIsEditingDeck(false)} className="btn-ghost cursor-pointer"><X size={14} /> Cancel</button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h1 className="text-xl font-bold text-[#0F172A]">{deck.name}</h1>
                  <button onClick={() => setIsEditingDeck(true)} className="p-1 text-[#94A3B8] hover:text-[#7C3AED] hover:bg-[#F7F3FD] rounded-md transition-colors cursor-pointer">
                    <Edit2 size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-3 flex-wrap text-sm text-[#64748B]">
                  <span>{cards.length} cards</span>
                  {dueCount > 0 && (
                    <span className="badge bg-amber-50 text-amber-700 border border-amber-200">{dueCount} due</span>
                  )}
                  {deck.folder_id && (
                    <span className="badge bg-[#F7F3FD] text-[#7C3AED]">
                      {folders.find(f => f.id === deck.folder_id)?.name}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => onStartStudy(deck.id)} disabled={cards.length === 0} className="btn-primary cursor-pointer">
              <BookOpen size={15} /> Study{dueCount > 0 ? ` (${dueCount})` : ""}
            </button>
            <button onClick={() => onOpenChat(deck.id)} disabled={cards.length === 0} className="btn-secondary cursor-pointer">
              <MessageSquare size={15} /> AI chat
            </button>
            <button onClick={handleExport} className="btn-ghost cursor-pointer" title="Export JSON">
              <Download size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Cards section */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-[#0F172A]">Flashcards</h2>
        <button onClick={() => setShowAddCard(!showAddCard)} className="btn-secondary text-sm cursor-pointer">
          <Plus size={14} /> Add card
        </button>
      </div>

      {/* Add card form */}
      {showAddCard && (
        <div className="card mb-4 animate-fade-up">
          <h3 className="font-semibold text-[#0F172A] mb-3 text-sm">New card</h3>
          <form onSubmit={handleAddCard} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Front</label>
                <textarea className="input resize-none" rows={3} value={newFront} onChange={e => setNewFront(e.target.value)} placeholder="Question or concept" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Back</label>
                <textarea className="input resize-none" rows={3} value={newBack} onChange={e => setNewBack(e.target.value)} placeholder="Answer or definition" required />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary cursor-pointer">Add</button>
              <button type="button" onClick={() => setShowAddCard(false)} className="btn-ghost cursor-pointer">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Cards grid */}
      {cards.length === 0 ? (
        <div className="card text-center py-12 border-dashed !border-[#EFE7FC]">
          <p className="text-sm text-[#64748B]">No cards yet. Add one above or generate with AI.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cards.map((card, idx) => {
            const isDue = new Date(card.next_review) <= new Date();
            return (
              <div key={card.id} className={`card flex flex-col justify-between animate-fade-up ${isDue ? "border-amber-200" : ""}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[#94A3B8]">#{idx + 1}</span>
                  {isDue && <span className="badge bg-amber-50 text-amber-700 text-[10px]">Due</span>}
                </div>

                {editingCardId === card.id ? (
                  <div className="space-y-3 flex-1">
                    <div>
                      <label className="block text-xs font-medium text-[#64748B] mb-1">Front</label>
                      <textarea className="input resize-none" rows={2} value={editFront} onChange={e => setEditFront(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#64748B] mb-1">Back</label>
                      <textarea className="input resize-none" rows={2} value={editBack} onChange={e => setEditBack(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveCard(card.id)} className="btn-primary text-sm cursor-pointer"><Save size={13} /> Save</button>
                      <button onClick={() => setEditingCardId(null)} className="btn-ghost text-sm cursor-pointer">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="space-y-3 mb-4">
                      <div>
                        <span className="text-[10px] font-semibold text-[#7C3AED] uppercase tracking-wider">Front</span>
                        <p className="text-sm text-[#0F172A] font-medium mt-0.5 whitespace-pre-wrap">{card.front}</p>
                      </div>
                      <div className="border-t border-[#EFE7FC] pt-3">
                        <span className="text-[10px] font-semibold text-[#059669] uppercase tracking-wider">Back</span>
                        <p className="text-sm text-[#334155] mt-0.5 whitespace-pre-wrap">{card.back}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-[#EFE7FC] pt-3">
                      <span className="text-xs text-[#94A3B8] flex items-center gap-1">
                        <Calendar size={11} />
                        {isDue ? "Due now" : new Date(card.next_review).toLocaleDateString()}
                      </span>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingCardId(card.id); setEditFront(card.front); setEditBack(card.back); }} className="p-1 text-[#94A3B8] hover:text-[#7C3AED] hover:bg-[#F7F3FD] rounded-md cursor-pointer"><Edit2 size={13} /></button>
                        <button onClick={() => handleDeleteCard(card.id)} className="p-1 text-[#94A3B8] hover:text-red-500 hover:bg-red-50 rounded-md cursor-pointer"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
