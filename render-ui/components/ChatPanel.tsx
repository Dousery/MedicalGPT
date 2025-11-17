"use client";

import { useCallback, useMemo, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  thinking?: string;
  final?: string;
};

type ApiResponse = {
  response?: string;
  error?: string;
};

const INITIAL_PROMPT =
  "Örneğin: 58 yaşında diyabetik hastada göğüs ağrısı ve nefes darlığı.";

function parseAssistantMessage(raw: string): { thinking?: string; final?: string; plain?: string } {
  if (!raw) return { plain: "Empty response from model." };

  const thinkingMatch = raw.match(/Thinking:\s*([\s\S]*?)\n\s*Final:/i);
  const finalMatch = raw.match(/Final:\s*([\s\S]*)$/i);

  if (!thinkingMatch && !finalMatch) {
    return { plain: raw.trim() };
  }

  const thinking = thinkingMatch ? thinkingMatch[1].trim() : undefined;
  const final = finalMatch ? finalMatch[1].trim() : undefined;

  return { thinking, final };
}

function ThinkingDropdown({ thinking }: { thinking: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ marginBottom: "16px" }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          background: "rgba(139, 92, 246, 0.15)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid rgba(139, 92, 246, 0.4)",
          borderRadius: "8px",
          color: "#a78bfa",
          cursor: "pointer",
          fontSize: "0.9rem",
          fontWeight: 600,
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(139, 92, 246, 0.25)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(139, 92, 246, 0.15)";
        }}
      >
        <span>Thinking</span>
        <span style={{ fontSize: "0.8rem" }}>{isOpen ? "▼" : "▶"}</span>
      </button>
      {isOpen && (
        <div
          style={{
            marginTop: "8px",
            padding: "16px",
            background: "rgba(15, 20, 25, 0.4)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            borderRadius: "8px",
            border: "1px solid rgba(139, 92, 246, 0.3)",
            color: "#e4e7eb",
            whiteSpace: "pre-wrap",
            fontSize: "0.9rem",
            lineHeight: "1.6",
          }}
        >
          {thinking}
        </div>
      )}
    </div>
  );
}

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasConversation = useMemo(() => messages.length > 0, [messages]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const trimmed = input.trim();
      if (!trimmed) {
        setError("Lütfen bir klinik senaryo yazın.");
        return;
      }

      setError(null);
      setIsLoading(true);
      const timestamp = Date.now();

      setMessages((prev) => [
        ...prev,
        { role: "user", content: trimmed, timestamp },
      ]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: trimmed }),
        });

        if (!res.ok) {
          const payload = (await res.json().catch(() => ({}))) as ApiResponse;
          throw new Error(payload.error || "Sunucu hatası.");
        }

        const payload = (await res.json()) as ApiResponse;

        if (!payload.response || typeof payload.response !== "string") {
          throw new Error("Yanıt gövdesi boş döndü.");
        }

        // TypeScript type narrowing - after the check above, response is guaranteed to be string
        const responseText: string = payload.response;
        const parsed = parseAssistantMessage(responseText);

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: parsed.plain || parsed.final || "",
            thinking: parsed.thinking,
            final: parsed.final,
            timestamp: Date.now(),
          },
        ]);
        setInput("");
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "İstek gönderilirken beklenmeyen bir hata oluştu.";
        setError(msg);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `⚠️ **Hata:** ${msg}`,
            timestamp: Date.now(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [input],
  );

  const handleClear = useCallback(() => {
    setMessages([]);
    setError(null);
    setInput("");
  }, []);

  return (
    <section className="chat-container">
      <div className="chat-log">
        {hasConversation ? (
          <>
            {messages.map((message) => (
              <article className="message" key={message.timestamp}>
                <h4>
                  {message.role === "user" ? "You" : "Assistant"}
                </h4>
                {message.role === "assistant" && message.thinking && (
                  <ThinkingDropdown thinking={message.thinking} />
                )}
                {message.role === "assistant" && message.final && (
                  <div style={{ marginTop: message.thinking ? "0" : "0" }}>
                    <div
                      style={{
                        marginBottom: "8px",
                        color: "#60a5fa",
                        fontSize: "0.9rem",
                        fontWeight: 600,
                      }}
                    >
                      Final
                    </div>
                    <pre style={{ margin: 0 }}>{message.final}</pre>
                  </div>
                )}
                {message.role === "assistant" && !message.final && !message.thinking && (
                  <pre>{message.content}</pre>
                )}
                {message.role === "user" && <pre>{message.content}</pre>}
              </article>
            ))}
            {isLoading && (
              <article className="message">
                <h4>Assistant</h4>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="loading-spinner"></span>
                  <span style={{ color: "#9ca3af" }}>Thinking...</span>
                </div>
              </article>
            )}
          </>
        ) : (
          <p style={{ color: "#9ca3af", textAlign: "center", marginTop: "40px" }}>
            Start a conversation
          </p>
        )}
      </div>

      <form className="form" onSubmit={handleSubmit}>
        <textarea
          id="message"
          placeholder="Type your message..."
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={isLoading}
        />

        {error && (
          <p style={{ color: "#ef4444", margin: "4px 0 0", fontSize: "0.9rem" }}>
            {error}
          </p>
        )}

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          {hasConversation && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                color: "#e4e7eb",
              }}
              disabled={isLoading}
            >
              Clear
            </button>
          )}
          <button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="loading-spinner"></span>
                Sending...
              </>
            ) : (
              "Send"
            )}
          </button>
        </div>
      </form>
    </section>
  );
}

