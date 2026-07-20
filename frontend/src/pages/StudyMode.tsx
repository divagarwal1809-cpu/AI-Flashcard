import { useState, useEffect } from "react";
import { api } from "../utils/api";
import { ArrowLeft, RotateCcw, Trophy, Volume2, CheckCircle } from "lucide-react";
import confetti from "canvas-confetti";

interface Card {
  id: number; front: string; back: string; next_review: string;
}

// Web Audio synth — no deps
const beep = (freq: number, type: OscillatorType, duration: number, vol = 0.08) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + duration);
  } catch { /* silently fail if audio not available */ }
};

const sounds = {
  flip:  () => beep(280, "sine", 0.1),
  good:  () => beep(660, "sine", 0.12),
  again: () => beep(180, "triangle", 0.2),
  win:   () => [440, 554, 659, 880].forEach((f, i) => setTimeout(() => beep(f, "square", 0.25, 0.05), i * 100)),
};

export function StudyMode({ deckId, onBack }: { deckId: number; onBack: () => void }) {
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [queue, setQueue] = useState<Card[]>([]);
  const [dueOnly, setDueOnly] = useState(true);
  const [loading, setLoading] = useState(true);

  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [studied, setStudied] = useState(0);
  const [correct, setCorrect] = useState(0);

  const loadCards = async () => {
    setLoading(true);
    const data = await api.get<Card[]>(`/decks/${deckId}/cards`);
    setAllCards(data);
    const now = new Date();
    const due = data.filter(c => new Date(c.next_review) <= now);
    const q = due.length > 0 ? due : data;
    setDueOnly(due.length > 0);
    setQueue(q);
    setIdx(0); setFlipped(false); setDone(false); setStudied(0); setCorrect(0);
    setLoading(false);
  };

  useEffect(() => { loadCards(); }, [deckId]);

  const switchMode = (wantDue: boolean) => {
    setDueOnly(wantDue);
    const now = new Date();
    setQueue(wantDue ? allCards.filter(c => new Date(c.next_review) <= now) : allCards);
    setIdx(0); setFlipped(false); setDone(false); setStudied(0); setCorrect(0);
  };

  const score = async (s: number) => {
    if (!queue.length) return;
    s >= 3 ? sounds.good() : sounds.again();
    const isCorrect = s >= 3;
    const newStudied = studied + 1;
    const newCorrect = correct + (isCorrect ? 1 : 0);
    setStudied(newStudied); setCorrect(newCorrect);

    try { await api.post(`/flashcards/${queue[idx].id}/score`, { score: s }); } catch { /* best effort */ }

    if (idx + 1 < queue.length) {
      setFlipped(false);
      setTimeout(() => setIdx(i => i + 1), 250);
    } else {
      setDone(true);
      sounds.win();
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ["#7C3AED", "#059669", "#F59E0B"] });
      try {
        await api.post("/stats/session", {
          deck_id: deckId,
          cards_studied: newStudied,
          accuracy: newStudied > 0 ? (newCorrect / newStudied) * 100 : 0,
        });
      } catch { /* best effort */ }
    }
  };

  const flip = () => { sounds.flip(); setFlipped(f => !f); };
  const speak = (text: string) => window.speechSynthesis?.speak(new SpeechSynthesisUtterance(text));

  if (loading) return <div className="text-center py-12 text-sm text-[#64748B]">Loading cards...</div>;

  if (!allCards.length) return (
    <div className="max-w-md mx-auto text-center py-16">
      <p className="text-[#64748B] mb-4 text-sm">This deck has no cards yet.</p>
      <button onClick={onBack} className="btn-primary cursor-pointer"><ArrowLeft size={15} /> Go back</button>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="btn-ghost cursor-pointer"><ArrowLeft size={16} /> Exit</button>
        {!done && queue.length > 0 && (
          <span className="text-sm font-medium text-[#64748B]">
            {idx + 1} <span className="text-[#CBD5E1]">/</span> {queue.length}
          </span>
        )}
      </div>

      {/* Mode filter */}
      {!done && (
        <div className="flex rounded-lg border border-[#EFE7FC] overflow-hidden mb-6 text-sm">
          {[true, false].map(d => (
            <button
              key={String(d)}
              onClick={() => switchMode(d)}
              className={`flex-1 py-2 font-semibold transition-colors cursor-pointer ${d !== dueOnly ? "border-l border-[#EFE7FC]" : ""} ${dueOnly === d ? "bg-[#F7F3FD] text-[#7C3AED]" : "text-[#64748B] hover:bg-[#FAFAFA]"}`}
            >
              {d ? `Due (${allCards.filter(c => new Date(c.next_review) <= new Date()).length})` : `All (${allCards.length})`}
            </button>
          ))}
        </div>
      )}

      {/* Done screen */}
      {done ? (
        <div className="card text-center py-10 animate-pop-in">
          <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4">
            <Trophy size={28} className="text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-[#0F172A] mb-1">Session complete!</h2>
          <p className="text-sm text-[#64748B] mb-6">You reviewed all {studied} cards.</p>
          <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto mb-8">
            <div className="bg-[#F7F3FD] rounded-xl p-4">
              <p className="text-2xl font-bold text-[#7C3AED]">{studied}</p>
              <p className="text-xs text-[#64748B] mt-0.5">Reviewed</p>
            </div>
            <div className="bg-[#F0FDF9] rounded-xl p-4">
              <p className="text-2xl font-bold text-[#059669]">
                {studied > 0 ? Math.round((correct / studied) * 100) : 0}%
              </p>
              <p className="text-xs text-[#64748B] mt-0.5">Accuracy</p>
            </div>
          </div>
          <div className="flex justify-center gap-3">
            <button onClick={loadCards} className="btn-secondary cursor-pointer"><RotateCcw size={15} /> Again</button>
            <button onClick={onBack} className="btn-primary cursor-pointer">Done</button>
          </div>
        </div>
      ) : queue.length === 0 ? (
        <div className="card text-center py-12">
          <CheckCircle size={36} className="mx-auto mb-3 text-[#059669]" />
          <h2 className="font-bold text-[#0F172A] mb-1">All caught up!</h2>
          <p className="text-sm text-[#64748B] mb-5">No cards are due right now.</p>
          <button onClick={() => switchMode(false)} className="btn-secondary cursor-pointer">Review all cards anyway</button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Progress bar */}
          <div className="h-1.5 bg-[#EFE7FC] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#7C3AED] rounded-full transition-all duration-300"
              style={{ width: `${((idx) / queue.length) * 100}%` }}
            />
          </div>

          {/* Card */}
          <div className="perspective" onClick={flip}>
            <div className={`preserve-3d transition-transform duration-500 relative min-h-[280px] cursor-pointer ${flipped ? "rotate-y-180" : ""}`}>
              {/* Front */}
              <div className="backface-hidden absolute inset-0 card flex flex-col justify-center items-center text-center p-8 !rounded-2xl select-none">
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); speak(queue[idx].front); }}
                  className="absolute top-4 right-4 p-1.5 text-[#CBD5E1] hover:text-[#7C3AED] hover:bg-[#F7F3FD] rounded-lg transition-colors cursor-pointer"
                  title="Read aloud"
                >
                  <Volume2 size={16} />
                </button>
                <span className="text-[10px] font-bold text-[#7C3AED] uppercase tracking-widest mb-4">Question</span>
                <p className="text-xl font-semibold text-[#0F172A] leading-snug">{queue[idx].front}</p>
                <span className="text-xs text-[#CBD5E1] mt-6">Tap to reveal answer</span>
              </div>

              {/* Back */}
              <div className="backface-hidden rotate-y-180 absolute inset-0 card flex flex-col justify-center items-center text-center p-8 !rounded-2xl !border-[#059669]/30 select-none" style={{ background: "#F0FDF9" }}>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); speak(queue[idx].back); }}
                  className="absolute top-4 right-4 p-1.5 text-[#CBD5E1] hover:text-[#059669] hover:bg-white rounded-lg transition-colors cursor-pointer"
                  title="Read aloud"
                >
                  <Volume2 size={16} />
                </button>
                <span className="text-[10px] font-bold text-[#059669] uppercase tracking-widest mb-4">Answer</span>
                <p className="text-lg text-[#0F172A] leading-relaxed">{queue[idx].back}</p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="card !p-4">
            {!flipped ? (
              <button onClick={flip} className="btn-primary w-full justify-center cursor-pointer">
                Reveal answer
              </button>
            ) : (
              <div className="animate-fade-in">
                <p className="text-xs text-center text-[#94A3B8] mb-3 font-medium">How well did you know this?</p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { s: 0, label: "Again", color: "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100" },
                    { s: 2, label: "Hard",  color: "bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100" },
                    { s: 3, label: "Good",  color: "bg-[#F7F3FD] text-[#7C3AED] border border-[#EFE7FC] hover:bg-[#EFE7FC]" },
                    { s: 5, label: "Easy",  color: "bg-[#F0FDF9] text-[#059669] border border-green-200 hover:bg-green-100" },
                  ].map(({ s, label, color }) => (
                    <button
                      key={s}
                      onClick={() => score(s)}
                      className={`py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${color}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
