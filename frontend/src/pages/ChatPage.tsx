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
    return <div className="text-center py-12 text-sm text-[#64748B]">Opening study chat...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-120px)] min-h-[500px]">
      {/* Back button */}
      <button onClick={onBack} className="btn-ghost mb-4 self-start cursor-pointer">
        <ArrowLeft size={16} /> Back to deck
      </button>

      {/* Chat Container */}
      <div className="card flex-1 flex flex-col overflow-hidden !p-0">
        {/* Header */}
        <div className="border-b border-[#EFE7FC] p-4 flex items-center justify-between bg-[#F7F3FD]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#7C3AED] flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#0F172A]">AI Tutor</h3>
              <p className="text-xs text-[#64748B]">Deck: <span className="font-semibold text-[#7C3AED]">{deck?.name}</span></p>
            </div>
          </div>
          <span className="badge bg-white text-[#7C3AED] border border-[#EFE7FC] text-[10px]">Gemini 1.5 Active</span>
        </div>

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
          {messages.map((msg, index) => {
            const isUser = msg.role === "user";
            return (
              <div key={index} className={`flex ${isUser ? "justify-end" : "justify-start"} animate-fade-up`}>
                <div className={`max-w-[80%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                  isUser 
                    ? "bg-[#7C3AED] text-white rounded-tr-none" 
                    : "bg-white border border-[#EFE7FC] text-[#0F172A] rounded-tl-none shadow-sm"
                }`}>
                  <span className={`text-[10px] font-bold block mb-1 uppercase tracking-wider ${
                    isUser ? "text-purple-200" : "text-[#7C3AED]"
                  }`}>
                    {isUser ? "You" : "AI Tutor"}
                  </span>
                  <div className="whitespace-pre-wrap font-medium">{msg.content}</div>
                </div>
              </div>
            );
          })}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-white border border-[#EFE7FC] p-3.5 rounded-2xl rounded-tl-none text-xs text-[#64748B] flex items-center gap-2 shadow-sm animate-pulse">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-[#7C3AED] rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-[#7C3AED] rounded-full animate-bounce delay-75"></div>
                  <div className="w-1.5 h-1.5 bg-[#7C3AED] rounded-full animate-bounce delay-150"></div>
                </div>
                <span>Tutor is thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="p-3 border-t border-[#EFE7FC] flex gap-2 bg-white">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question or request a quiz..."
            className="input flex-1"
            disabled={sending}
            required
          />
          <button type="submit" disabled={sending} className="btn-primary cursor-pointer">
            <Send size={14} />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
