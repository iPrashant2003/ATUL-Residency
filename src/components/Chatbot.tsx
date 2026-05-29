"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const QUICK_REPLIES = [
  "How do I pay rent?",
  "What's the UPI ID?",
  "How to raise maintenance?",
  "When is rent due?",
];

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "👋 Hi! I'm **AtulBot**, your AI assistant for Atul Residency.\n\nI can help you with rent payments, maintenance requests, room info, and more! How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setHasNewMessage(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    const userMsg: Message = { role: "user", content: messageText, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.role !== "assistant" || messages.indexOf(m) > 0) // skip initial greeting from history
        .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText, history }),
      });

      const data = await res.json();
      const assistantMsg: Message = {
        role: "assistant",
        content: data.reply || "Sorry, I couldn't understand that.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      if (!isOpen) setHasNewMessage(true);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "❌ Something went wrong. Please try again.", timestamp: new Date() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = (content: string) => {
    // Simple markdown-like rendering
    return content
      .split("\n")
      .map((line, i) => {
        const boldLine = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        return (
          <p key={i} style={{ margin: "2px 0", lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: boldLine }} />
        );
      });
  };

  return (
    <>
      {/* Floating Button */}
      <div
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 9999,
        }}
      >
        {/* Notification dot */}
        {hasNewMessage && !isOpen && (
          <div
            style={{
              position: "absolute",
              top: "-4px",
              right: "-4px",
              width: "14px",
              height: "14px",
              background: "#10b981",
              borderRadius: "50%",
              border: "2px solid #050606",
              animation: "pulse-glow 2s ease-in-out infinite",
              zIndex: 1,
            }}
          />
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            width: "56px",
            height: "56px",
            background: "linear-gradient(135deg, #14B8A6, #0D9488)",
            border: "none",
            borderRadius: "50%",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 32px rgba(20,184,166,0.5), 0 0 0 0 rgba(20,184,166,0.4)",
            transition: "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease",
            transform: isOpen ? "scale(0.9) rotate(10deg)" : "scale(1)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = isOpen
              ? "scale(0.9) rotate(10deg)"
              : "scale(1.1)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              "0 12px 40px rgba(20,184,166,0.7), 0 0 0 0 rgba(20,184,166,0.4)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = isOpen ? "scale(0.9) rotate(10deg)" : "scale(1)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              "0 8px 32px rgba(20,184,166,0.5), 0 0 0 0 rgba(20,184,166,0.4)";
          }}
          title="Chat with AtulBot"
        >
          {isOpen ? (
            <X size={22} color="white" />
          ) : (
            <MessageCircle size={22} color="white" />
          )}
        </button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "96px",
            right: "24px",
            width: "360px",
            height: "520px",
            zIndex: 9998,
            display: "flex",
            flexDirection: "column",
            background: "rgba(10, 12, 12, 0.97)",
            backdropFilter: "blur(40px)",
            border: "1px solid rgba(20, 184, 166, 0.25)",
            borderRadius: "20px",
            overflow: "hidden",
            boxShadow: "0 25px 80px rgba(0,0,0,0.8), 0 0 40px rgba(20,184,166,0.15)",
            animation: "fade-in-up 0.3s ease",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "16px 20px",
              background: "linear-gradient(135deg, rgba(20,184,166,0.2), rgba(13,148,136,0.08))",
              borderBottom: "1px solid rgba(20,184,166,0.15)",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                background: "linear-gradient(135deg, #14B8A6, #0D9488)",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(20,184,166,0.4)",
                flexShrink: 0,
              }}
            >
              <Sparkles size={18} color="white" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#e2e8f0", fontFamily: "var(--font-display)" }}>
                AtulBot
              </div>
              <div style={{ fontSize: "11px", color: "rgba(20,184,166,0.8)", display: "flex", alignItems: "center", gap: "5px" }}>
                <div
                  style={{
                    width: "6px",
                    height: "6px",
                    background: "#10b981",
                    borderRadius: "50%",
                  }}
                />
                AI Assistant · Always Online
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px",
                padding: "6px",
                cursor: "pointer",
                color: "rgba(226,232,240,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: msg.role === "user" ? "row-reverse" : "row",
                  gap: "8px",
                  alignItems: "flex-end",
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "8px",
                    background:
                      msg.role === "user"
                        ? "linear-gradient(135deg, #8b5cf6, #6d28d9)"
                        : "linear-gradient(135deg, #14B8A6, #0D9488)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {msg.role === "user" ? (
                    <User size={14} color="white" />
                  ) : (
                    <Bot size={14} color="white" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  style={{
                    maxWidth: "80%",
                    padding: "10px 14px",
                    borderRadius: msg.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                    background:
                      msg.role === "user"
                        ? "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(109,40,217,0.2))"
                        : "rgba(255,255,255,0.05)",
                    border: `1px solid ${msg.role === "user" ? "rgba(139,92,246,0.25)" : "rgba(20,184,166,0.12)"}`,
                    fontSize: "13px",
                    color: "#e2e8f0",
                    lineHeight: 1.5,
                  }}
                >
                  {renderMessage(msg.content)}
                  <div
                    style={{
                      fontSize: "10px",
                      color: "rgba(226,232,240,0.25)",
                      marginTop: "4px",
                      textAlign: msg.role === "user" ? "right" : "left",
                    }}
                  >
                    {msg.timestamp.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #14B8A6, #0D9488)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Bot size={14} color="white" />
                </div>
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "4px 16px 16px 16px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(20,184,166,0.12)",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: "6px",
                        height: "6px",
                        background: "#14B8A6",
                        borderRadius: "50%",
                        animation: `bounce ${0.6}s ease-in-out ${i * 0.15}s infinite alternate`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies — only show if conversation is just starting */}
          {messages.length <= 1 && !loading && (
            <div
              style={{
                padding: "8px 16px",
                display: "flex",
                gap: "6px",
                overflowX: "auto",
                flexShrink: 0,
                borderTop: "1px solid rgba(20,184,166,0.08)",
              }}
            >
              {QUICK_REPLIES.map((reply) => (
                <button
                  key={reply}
                  onClick={() => sendMessage(reply)}
                  style={{
                    whiteSpace: "nowrap",
                    padding: "5px 10px",
                    background: "rgba(20,184,166,0.08)",
                    border: "1px solid rgba(20,184,166,0.2)",
                    borderRadius: "20px",
                    fontSize: "11px",
                    color: "#14B8A6",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    flexShrink: 0,
                  }}
                >
                  {reply}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div
            style={{
              padding: "12px 16px",
              borderTop: "1px solid rgba(20,184,166,0.12)",
              display: "flex",
              gap: "8px",
              flexShrink: 0,
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask AtulBot anything..."
              disabled={loading}
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(20,184,166,0.2)",
                borderRadius: "12px",
                padding: "10px 14px",
                fontSize: "13px",
                color: "#e2e8f0",
                outline: "none",
                fontFamily: "var(--font-primary)",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => ((e.target as HTMLInputElement).style.borderColor = "rgba(20,184,166,0.5)")}
              onBlur={(e) => ((e.target as HTMLInputElement).style.borderColor = "rgba(20,184,166,0.2)")}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              style={{
                width: "40px",
                height: "40px",
                background:
                  input.trim() && !loading
                    ? "linear-gradient(135deg, #14B8A6, #0D9488)"
                    : "rgba(255,255,255,0.05)",
                border: `1px solid ${input.trim() && !loading ? "transparent" : "rgba(255,255,255,0.08)"}`,
                borderRadius: "12px",
                cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
                flexShrink: 0,
              }}
            >
              {loading ? (
                <Loader2 size={16} color="rgba(226,232,240,0.4)" style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <Send size={16} color={input.trim() ? "white" : "rgba(226,232,240,0.3)"} />
              )}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          from { transform: translateY(0); opacity: 0.4; }
          to { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
