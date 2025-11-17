"use client";

import { useCallback, useMemo, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

type ApiResponse = {
  response?: string;
  error?: string;
};

const INITIAL_PROMPT =
  "Örneğin: 58 yaşında diyabetik hastada göğüs ağrısı ve nefes darlığı.";

function formatAssistantMessage(raw: string) {
  if (!raw) return "Modelden boş yanıt geldi.";

  const thinkingMatch = raw.match(/Thinking:\s*([\s\S]*?)\n\s*Final:/i);
  const finalMatch = raw.match(/Final:\s*([\s\S]*)$/i);

  if (!thinkingMatch && !finalMatch) {
    return raw.trim();
  }

  const thinking = thinkingMatch ? thinkingMatch[1].trim() : "";
  const final = finalMatch ? finalMatch[1].trim() : "";

  return [
    thinking && `🧠 **Düşünme Süreci**\n${thinking}`,
    final && `✅ **Sonuç**\n${final}`,
  ]
    .filter(Boolean)
    .join("\n\n");
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

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: formatAssistantMessage(responseText),
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
                <pre>{message.content}</pre>
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

