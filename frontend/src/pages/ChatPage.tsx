import React, { useState, useRef, useEffect } from "react";
import { api } from "../utils/api";
import { ArrowLeft, Send, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatPageProps {
  deckId: number;
  onBack: () => void;
}

interface Deck {
  id: number;
  name: string;
}

export const ChatPage: React.FC<ChatPageProps> = ({ deckId, onBack }) => {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I am your FlashMind AI tutor. Ask me any question, ask for details, or let me test you on the concepts in this flashcard deck!"
    }
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadDeck = async () => {
      try {
        setLoading(true);
        const deckData = await api.get<Deck>(`/decks/${deckId}`);
        setDeck(deckData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadDeck();
  }, [deckId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    try {
      const chatHistory = [...messages, userMessage];
      const data = await api.post<{ reply: string }>("/ai/chat", {
        deck_id: deckId,
        messages: chatHistory
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply }
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Failed to connect to AI: ${err.message || "Unknown error"}` }
      ]);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 font-bold text-lg">OPENING CHAT...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pb-12">
      {/* Back button */}
      <button
        onClick={onBack}
        className="neo-btn bg-white hover:bg-gray-100 flex items-center gap-1.5 py-1 px-3 text-xs mb-6"
      >
        <ArrowLeft size={14} /> BACK TO DECK
      </button>

      {/* Chat Box */}
      <div className="bg-white neo-card shadow-neo flex flex-col h-[550px] relative overflow-hidden">
        {/* Header */}
        <div className="bg-primary text-ink p-4 border-b-3 border-black flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="fill-current" />
            <div>
              <h3 className="font-black text-sm uppercase leading-none">
                AI STUDY COMPANION
              </h3>
              <span className="text-xs font-bold text-gray-800">
                Deck: {deck?.name}
              </span>
            </div>
          </div>
          <div className="bg-white text-ink text-xs font-extrabold px-2.5 py-1 neo-border">
            GEMINI 1.5 ACTIVE
          </div>
        </div>

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-cream/30">
          {messages.map((msg, index) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={index}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] p-3.5 neo-border text-sm font-semibold leading-relaxed shadow-neo-sm ${
                    isUser
                      ? "bg-accent text-ink"
                      : "bg-white text-ink"
                  }`}
                >
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-1">
                    {isUser ? "YOU" : "FLASHMIND AI"}
                  </span>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            );
          })}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-white p-3.5 neo-border text-sm font-bold text-gray-500 flex items-center gap-2 shadow-neo-sm animate-pulse">
                <div className="w-2.5 h-2.5 bg-black rounded-full animate-bounce"></div>
                <div className="w-2.5 h-2.5 bg-black rounded-full animate-bounce delay-100"></div>
                <div className="w-2.5 h-2.5 bg-black rounded-full animate-bounce delay-200"></div>
                <span>THINKING...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Form Input */}
        <form
          onSubmit={handleSend}
          className="p-3 border-t-3 border-black bg-white flex gap-2 shrink-0"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about this deck, or request a quiz..."
            className="flex-1 neo-input text-sm"
            disabled={sending}
            required
          />
          <button
            type="submit"
            disabled={sending}
            className="neo-btn-primary py-2 px-4 flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Send size={14} />
            <span>SEND</span>
          </button>
        </form>
      </div>
    </div>
  );
};
