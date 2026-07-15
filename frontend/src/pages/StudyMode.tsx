import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import { ArrowLeft, CheckCircle, RefreshCw, Trophy, Volume2 } from "lucide-react";

interface Card {
  id: number;
  deck_id: number;
  front: string;
  back: string;
  interval: number;
  ease_factor: number;
  repetitions: number;
  next_review: string;
}

interface StudyModeProps {
  deckId: number;
  onBack: () => void;
}

export const StudyMode: React.FC<StudyModeProps> = ({ deckId, onBack }) => {
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [studyQueue, setStudyQueue] = useState<Card[]>([]);
  const [filterDueOnly, setFilterDueOnly] = useState(true);
  const [loading, setLoading] = useState(true);

  // Active study state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Session stats
  const [studiedCount, setStudiedCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const loadCards = async () => {
    try {
      setLoading(true);
      const cardsData = await api.get<Card[]>(`/decks/${deckId}/cards`);
      setAllCards(cardsData);
      
      // Separate due cards
      const now = new Date();
      const due = cardsData.filter((c) => new Date(c.next_review) <= now);
      
      if (due.length > 0) {
        setStudyQueue(due);
        setFilterDueOnly(true);
      } else {
        setStudyQueue(cardsData);
        setFilterDueOnly(false);
      }
      
      setCurrentIndex(0);
      setIsFlipped(false);
      setIsFinished(false);
      setStudiedCount(0);
      setCorrectCount(0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
  }, [deckId]);

  // Adjust study queue filter
  const toggleFilter = (dueOnly: boolean) => {
    setFilterDueOnly(dueOnly);
    if (dueOnly) {
      const now = new Date();
      const due = allCards.filter((c) => new Date(c.next_review) <= now);
      setStudyQueue(due);
    } else {
      setStudyQueue(allCards);
    }
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsFinished(false);
    setStudiedCount(0);
    setCorrectCount(0);
  };

  const handleScoreCard = async (score: number) => {
    if (studyQueue.length === 0) return;
    const activeCard = studyQueue[currentIndex];
    
    // Track stats
    setStudiedCount((prev) => prev + 1);
    if (score >= 3) {
      setCorrectCount((prev) => prev + 1);
    }

    try {
      // Post score to SM-2 endpoint
      await api.post(`/flashcards/${activeCard.id}/score`, { score });
      
      // Transition card
      if (currentIndex + 1 < studyQueue.length) {
        setIsFlipped(false);
        setTimeout(() => {
          setCurrentIndex((prev) => prev + 1);
        }, 150);
      } else {
        // Finished study loop
        setIsFinished(true);
        // Post session stats to database
        const finalAccuracy = studiedCount + 1 > 0 
          ? ((correctCount + (score >= 3 ? 1 : 0)) / (studiedCount + 1)) * 100 
          : 0;
        await api.post("/stats/session", {
          deck_id: deckId,
          cards_studied: studiedCount + 1,
          accuracy: finalAccuracy
        });
      }
    } catch (err) {
      console.error("Failed to score card", err);
    }
  };

  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  if (loading) {
    return <div className="text-center py-12 font-bold text-lg">PREPARING FLASHCARDS...</div>;
  }

  if (allCards.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 text-center py-12 bg-white neo-card relative">
        <h3 className="text-xl font-black mb-4">DECK IS EMPTY</h3>
        <p className="font-semibold text-gray-600 mb-6">Create or import cards first before studying!</p>
        <button onClick={onBack} className="neo-btn-primary py-2 px-6">
          GO BACK
        </button>
      </div>
    );
  }

  const currentCard = studyQueue[currentIndex];

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 pb-12">
      {/* Back Header */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={onBack}
          className="neo-btn bg-white hover:bg-gray-100 flex items-center gap-1.5 py-1 px-3 text-xs"
        >
          <ArrowLeft size={14} /> EXIT STUDY
        </button>

        {!isFinished && studyQueue.length > 0 && (
          <span className="bg-black text-white px-3 py-1 font-bold text-sm neo-border">
            CARD {currentIndex + 1} OF {studyQueue.length}
          </span>
        )}
      </div>

      {/* Mode Filter Selector */}
      {!isFinished && (
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6">
          <button
            onClick={() => toggleFilter(true)}
            className={`py-1.5 px-4 font-bold text-xs neo-border ${
              filterDueOnly ? "bg-primary" : "bg-white hover:bg-gray-100"
            }`}
          >
            DUE CARDS ONLY (
            {allCards.filter((c) => new Date(c.next_review) <= new Date()).length}
            )
          </button>
          <button
            onClick={() => toggleFilter(false)}
            className={`py-1.5 px-4 font-bold text-xs neo-border ${
              !filterDueOnly ? "bg-primary" : "bg-white hover:bg-gray-100"
            }`}
          >
            ALL DECK CARDS ({allCards.length})
          </button>
        </div>
      )}

      {/* --- FINISHED PANEL --- */}
      {isFinished ? (
        <div className="bg-white neo-card shadow-neo p-8 text-center space-y-6 relative">
          <div className="absolute -top-5 right-1/2 translate-x-1/2 bg-yellow-400 p-2 rounded-none neo-border">
            <Trophy size={32} className="text-black fill-current" />
          </div>

          <h3 className="text-3xl font-black pt-4">SESSION COMPLETE!</h3>
          <p className="font-bold text-gray-700">
            Great job! You've reviewed all selected cards.
          </p>

          <div className="grid grid-cols-2 gap-4 border-2 border-black p-4 bg-cream">
            <div className="text-center">
              <span className="block text-gray-500 font-bold text-xs uppercase">Cards Reviewed</span>
              <span className="text-3xl font-black">{studiedCount}</span>
            </div>
            <div className="text-center">
              <span className="block text-gray-500 font-bold text-xs uppercase">Accuracy Rate</span>
              <span className="text-3xl font-black">
                {studiedCount > 0 ? Math.round((correctCount / studiedCount) * 100) : 0}%
              </span>
            </div>
          </div>

          <div className="flex justify-center gap-4 pt-2">
            <button onClick={loadCards} className="neo-btn bg-accent hover:bg-violet-300 text-sm flex items-center gap-1.5">
              <RefreshCw size={16} /> STUDY AGAIN
            </button>
            <button onClick={onBack} className="neo-btn-primary text-sm">
              RETURN TO DECK
            </button>
          </div>
        </div>
      ) : studyQueue.length === 0 ? (
        <div className="bg-white neo-card shadow-neo p-8 text-center space-y-6">
          <CheckCircle size={48} className="mx-auto text-green-500 fill-current" />
          <h3 className="text-2xl font-black">ALL CLEAN!</h3>
          <p className="font-bold text-gray-700">
            No cards are currently due for review. Take a break!
          </p>
          <button onClick={() => toggleFilter(false)} className="neo-btn bg-accent hover:bg-violet-300 text-sm">
            REVIEW ALL CARDS ANYWAY
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Flashcard container with flip effects */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="perspective-1000 w-full min-h-[300px] cursor-pointer group"
          >
            <div
              className={`transform-style-3d transition-transform duration-500 w-full min-h-[260px] sm:min-h-[300px] bg-white neo-border-lg shadow-neo-lg flex flex-col items-center justify-center p-6 sm:p-8 text-center relative ${
                isFlipped ? "rotate-y-180 bg-yellow-50/20" : ""
              }`}
            >
              {/* Audio Reader Trigger */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  speakText(isFlipped ? currentCard.back : currentCard.front);
                }}
                className="absolute top-3 left-3 p-1.5 hover:bg-gray-200 neo-border bg-white"
                title="Speak Text"
              >
                <Volume2 size={16} />
              </button>

              {/* Due Warning Banner */}
              <div className="absolute top-3 right-3 text-[10px] font-bold bg-black text-white px-2 py-0.5 neo-border">
                {isFlipped ? "ANSWER" : "QUESTION"}
              </div>

              {/* Front side */}
              <div className={`backface-hidden w-full flex flex-col justify-center items-center absolute p-8 ${
                isFlipped ? "opacity-0" : "opacity-100"
              }`}>
                <h4 className="text-2xl font-extrabold tracking-tight whitespace-pre-wrap leading-snug">
                  {currentCard.front}
                </h4>
                <span className="text-xs font-bold text-gray-400 uppercase mt-8 animate-bounce">
                  [ Click card to show answer ]
                </span>
              </div>

              {/* Back side */}
              <div className={`backface-hidden rotate-y-180 w-full flex flex-col justify-center items-center absolute p-8 ${
                isFlipped ? "opacity-100" : "opacity-0"
              }`}>
                <p className="text-xl font-bold text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {currentCard.back}
                </p>
                <span className="text-xs font-bold text-gray-400 uppercase mt-8">
                  [ Click card to view question ]
                </span>
              </div>
            </div>
          </div>

          {/* Controller buttons */}
          <div className="bg-white neo-card shadow-neo p-4">
            {!isFlipped ? (
              <button
                onClick={() => setIsFlipped(true)}
                className="w-full neo-btn-primary py-3 text-lg font-black"
              >
                REVEAL ANSWER SPACE ↵
              </button>
            ) : (
              <div>
                <span className="block text-center font-bold text-xs uppercase text-gray-500 mb-3 tracking-wider">
                  How well did you recall this card?
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button
                    onClick={() => handleScoreCard(0)}
                    className="neo-border py-2 px-3 bg-secondary text-white font-bold hover:bg-red-500 text-xs active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                    style={{ boxShadow: "3px 3px 0px #000" }}
                  >
                    AGAIN (0)
                  </button>
                  <button
                    onClick={() => handleScoreCard(2)}
                    className="neo-border py-2 px-3 bg-orange-400 font-bold hover:bg-orange-500 text-xs active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                    style={{ boxShadow: "3px 3px 0px #000" }}
                  >
                    HARD (2)
                  </button>
                  <button
                    onClick={() => handleScoreCard(3)}
                    className="neo-border py-2 px-3 bg-accent font-bold hover:bg-violet-400 text-xs active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                    style={{ boxShadow: "3px 3px 0px #000" }}
                  >
                    GOOD (3)
                  </button>
                  <button
                    onClick={() => handleScoreCard(5)}
                    className="neo-border py-2 px-3 bg-success font-bold hover:bg-green-400 text-xs active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                    style={{ boxShadow: "3px 3px 0px #000" }}
                  >
                    EASY (5)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
