import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import { ArrowLeft, BookOpen, MessageSquare, Plus, Trash2, Edit2, Download, Save, X, Calendar } from "lucide-react";

interface Card {
  id: number;
  deck_id: number;
  front: string;
  back: string;
  interval: number;
  ease_factor: number;
  repetitions: number;
  next_review: string;
  created_at: string;
}

interface Deck {
  id: number;
  name: string;
  folder_id: number | null;
  source_type: string;
  source_name: string | null;
  card_count: number;
  created_at: string;
}

interface Folder {
  id: number;
  name: string;
}

interface DeckDetailProps {
  deckId: number;
  onBack: () => void;
  onStartStudy: (deckId: number) => void;
  onOpenChat: (deckId: number) => void;
}

export const DeckDetail: React.FC<DeckDetailProps> = ({
  deckId,
  onBack,
  onStartStudy,
  onOpenChat,
}) => {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Deck
  const [isEditingDeck, setIsEditingDeck] = useState(false);
  const [editDeckName, setEditDeckName] = useState("");
  const [editFolderId, setEditFolderId] = useState<number | null>(null);

  // Add Card
  const [showAddCard, setShowAddCard] = useState(false);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");

  // Edit Card
  const [editingCardId, setEditingCardId] = useState<number | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const deckData = await api.get<Deck>(`/decks/${deckId}`);
      const cardsData = await api.get<Card[]>(`/decks/${deckId}/cards`);
      const foldersData = await api.get<Folder[]>("/folders");
      
      setDeck(deckData);
      setCards(cardsData);
      setFolders(foldersData);
      
      setEditDeckName(deckData.name);
      setEditFolderId(deckData.folder_id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [deckId]);

  const handleUpdateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDeckName.trim()) return;
    try {
      const data = await api.put<Deck>(`/decks/${deckId}`, {
        name: editDeckName,
        folder_id: editFolderId === null ? 0 : editFolderId // backend checks for folder reassignment
      });
      setDeck(data);
      setIsEditingDeck(false);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim()) return;
    try {
      const newCard = await api.post<Card>(`/decks/${deckId}/cards`, {
        front: newFront,
        back: newBack,
      });
      setCards([...cards, newCard]);
      setNewFront("");
      setNewBack("");
      setShowAddCard(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCard = async (cardId: number) => {
    if (!confirm("Delete this flashcard?")) return;
    try {
      await api.delete(`/flashcards/${cardId}`);
      setCards(cards.filter((c) => c.id !== cardId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartEditCard = (card: Card) => {
    setEditingCardId(card.id);
    setEditFront(card.front);
    setEditBack(card.back);
  };

  const handleSaveCard = async (cardId: number) => {
    if (!editFront.trim() || !editBack.trim()) return;
    try {
      const updated = await api.put<Card>(`/flashcards/${cardId}`, {
        front: editFront,
        back: editBack,
      });
      setCards(cards.map((c) => (c.id === cardId ? updated : c)));
      setEditingCardId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportDeck = () => {
    if (!deck) return;
    const exportData = {
      deck_name: deck.name,
      source_type: deck.source_type,
      source_name: deck.source_name,
      cards: cards.map(c => ({ front: c.front, back: c.back }))
    };
    
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(exportData, null, 2)
    )}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `${deck.name.replace(/\s+/g, "_")}_deck.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getDueCount = () => {
    const now = new Date();
    return cards.filter(c => new Date(c.next_review) <= now).length;
  };

  if (loading) {
    return <div className="text-center py-12 font-bold text-lg">LOADING DECK...</div>;
  }

  if (!deck) {
    return <div className="text-center py-12 font-bold text-lg text-secondary">DECK NOT FOUND.</div>;
  }

  const dueCount = getDueCount();

  return (
    <div className="max-w-6xl mx-auto px-4 pb-12">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="neo-btn bg-white hover:bg-gray-100 flex items-center gap-1.5 py-1 px-3 text-xs mb-6"
      >
        <ArrowLeft size={14} /> BACK TO DASHBOARD
      </button>

      {/* Deck Header */}
      <div className="bg-white neo-card shadow-neo p-6 mb-8 relative">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="flex-1">
            {isEditingDeck ? (
              <form onSubmit={handleUpdateDeck} className="space-y-3 max-w-md">
                <input
                  type="text"
                  value={editDeckName}
                  onChange={(e) => setEditDeckName(e.target.value)}
                  className="neo-input w-full text-xl font-bold"
                  required
                />
                <div className="flex items-center gap-2">
                  <select
                    value={editFolderId || ""}
                    onChange={(e) => setEditFolderId(e.target.value ? Number(e.target.value) : null)}
                    className="neo-input text-sm py-1"
                  >
                    <option value="">No Folder (Unassigned)</option>
                    {folders.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                  <button type="submit" className="neo-btn bg-primary hover:bg-yellow-400 py-1.5 px-3 text-xs flex items-center gap-1">
                    <Save size={12} /> SAVE
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingDeck(false)}
                    className="neo-btn bg-secondary text-white hover:bg-red-500 py-1.5 px-3 text-xs flex items-center gap-1"
                  >
                    <X size={12} /> CANCEL
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-3xl font-black tracking-tight text-ink">{deck.name}</h2>
                  <button
                    onClick={() => setIsEditingDeck(true)}
                    className="p-1.5 hover:bg-gray-200 neo-border bg-cream"
                    title="Edit Deck Details"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-600 mt-2">
                  <span className="bg-yellow-100 px-2 py-0.5 neo-border">
                    {deck.folder_id ? `Folder: ${folders.find(f => f.id === deck.folder_id)?.name || "Unknown"}` : "No Folder"}
                  </span>
                  <span>•</span>
                  <span>{cards.length} cards</span>
                  {dueCount > 0 && (
                    <>
                      <span>•</span>
                      <span className="bg-secondary text-white px-2 py-0.5 neo-border animate-pulse">
                        {dueCount} DUE FOR REVIEW
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onStartStudy(deck.id)}
              disabled={cards.length === 0}
              className="neo-btn-primary py-2.5 px-5 text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <BookOpen size={18} />
              STUDY CARDS ({dueCount > 0 ? `${dueCount} DUE` : "ALL"})
            </button>
            <button
              onClick={() => onOpenChat(deck.id)}
              disabled={cards.length === 0}
              className="neo-btn-secondary py-2.5 px-5 text-sm flex items-center gap-2 disabled:opacity-50 text-ink"
            >
              <MessageSquare size={18} />
              AI STUDY CHAT
            </button>
            <button
              onClick={handleExportDeck}
              className="neo-btn bg-white hover:bg-gray-100 text-sm flex items-center gap-2"
              title="Export as JSON"
            >
              <Download size={18} />
              EXPORT
            </button>
          </div>
        </div>
      </div>

      {/* Cards List Section Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold tracking-tight uppercase">Flashcard List</h3>
        <button
          onClick={() => setShowAddCard(!showAddCard)}
          className="neo-btn bg-primary hover:bg-yellow-400 text-xs py-1.5 px-3 flex items-center gap-1.5"
        >
          <Plus size={14} /> ADD CARD MANUALLY
        </button>
      </div>

      {/* --- ADD CARD PANEL --- */}
      {showAddCard && (
        <div className="bg-yellow-50 neo-card mb-8">
          <h4 className="font-bold text-lg mb-4 uppercase">New Manual Flashcard</h4>
          <form onSubmit={handleAddCard} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-xs uppercase mb-1">Front (Question / Concept)</label>
                <textarea
                  value={newFront}
                  onChange={(e) => setNewFront(e.target.value)}
                  placeholder="e.g., What is cellular respiration?"
                  className="w-full neo-input text-sm"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-xs uppercase mb-1">Back (Answer / Definition)</label>
                <textarea
                  value={newBack}
                  onChange={(e) => setNewBack(e.target.value)}
                  placeholder="e.g., The process by which cells break down glucose into energy (ATP)..."
                  className="w-full neo-input text-sm"
                  rows={3}
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="neo-btn-primary py-2 px-4 text-xs">
                ADD CARD
              </button>
              <button
                type="button"
                onClick={() => setShowAddCard(false)}
                className="neo-btn bg-white hover:bg-gray-100 py-2 px-4 text-xs"
              >
                CANCEL
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Cards Grid */}
      {cards.length === 0 ? (
        <div className="neo-card bg-white p-12 text-center text-gray-500 font-bold">
          No cards in this deck yet. Create some manually above or use AI!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cards.map((card, idx) => {
            const isEditing = editingCardId === card.id;
            const isDue = new Date(card.next_review) <= new Date();

            return (
              <div
                key={card.id}
                className={`neo-card bg-white flex flex-col justify-between relative ${
                  isDue ? "border-red-500 bg-red-50/20" : ""
                }`}
              >
                {/* Index badge */}
                <div className="absolute top-2 right-2 bg-black text-white px-2 py-0.5 text-xs font-bold neo-border">
                  #{idx + 1}
                </div>

                {isEditing ? (
                  <div className="space-y-4 flex-1">
                    <div>
                      <label className="block font-bold text-xs uppercase mb-1">Front</label>
                      <textarea
                        value={editFront}
                        onChange={(e) => setEditFront(e.target.value)}
                        className="w-full neo-input text-sm"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-xs uppercase mb-1">Back</label>
                      <textarea
                        value={editBack}
                        onChange={(e) => setEditBack(e.target.value)}
                        className="w-full neo-input text-sm"
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveCard(card.id)}
                        className="neo-btn-primary py-1 px-3 text-xs flex items-center gap-1"
                      >
                        <Save size={12} /> SAVE
                      </button>
                      <button
                        onClick={() => setEditingCardId(null)}
                        className="neo-btn bg-white hover:bg-gray-100 py-1 px-3 text-xs"
                      >
                        CANCEL
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-between pt-2">
                    <div className="space-y-4 mb-6">
                      <div>
                        <span className="font-bold text-xs text-gray-500 uppercase tracking-wider block">Front</span>
                        <p className="text-ink font-bold text-sm whitespace-pre-wrap">{card.front}</p>
                      </div>
                      <div className="border-t border-black/10 pt-3">
                        <span className="font-bold text-xs text-gray-500 uppercase tracking-wider block">Back</span>
                        <p className="text-gray-800 text-sm whitespace-pre-wrap">{card.back}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t-2 border-black pt-3 mt-4 text-xs font-bold text-gray-600">
                      <div className="flex items-center gap-1" title="Next scheduled review time">
                        <Calendar size={12} />
                        <span>
                          {isDue ? "DUE NOW" : `Next: ${new Date(card.next_review).toLocaleDateString()}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleStartEditCard(card)}
                          className="p-1 hover:bg-gray-100 neo-border bg-cream"
                          title="Edit Card"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteCard(card.id)}
                          className="p-1 hover:bg-red-50 text-secondary neo-border bg-white"
                          title="Delete Card"
                        >
                          <Trash2 size={12} />
                        </button>
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
};
