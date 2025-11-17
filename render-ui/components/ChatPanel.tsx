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

        if (!payload.response) {
          throw new Error("Yanıt gövdesi boş döndü.");
        }

        const responseText = payload.response; // TypeScript now knows this is string

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
      <header>
        <p className="pill">
          <span aria-hidden="true">🩺</span> Klinik Diyalog Konsolu
        </p>
        <h2 style={{ marginTop: 12, marginBottom: 8 }}>
          Medical GPT-OSS 20B
        </h2>
        <p style={{ color: "#486377", margin: 0 }}>
          Bu arayüz Vercel üzerinde çalışır ve Modal üzerindeki GPU API&apos;sine
          bağlanır.
        </p>
      </header>

      <div className="chat-log">
        {hasConversation ? (
          messages.map((message) => (
            <article className="message" key={message.timestamp}>
              <h4>
                {message.role === "user" ? "🙋‍♂️ Kullanıcı" : "🤖 Asistan"}
              </h4>
              <pre>{message.content}</pre>
            </article>
          ))
        ) : (
          <p style={{ color: "#7c8da5" }}>
            Henüz mesaj yok. {INITIAL_PROMPT}
          </p>
        )}
      </div>

      <form className="form" onSubmit={handleSubmit}>
        <label htmlFor="message">Klinik soru</label>
        <textarea
          id="message"
          placeholder={INITIAL_PROMPT}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={isLoading}
        />

        {error && (
          <p style={{ color: "#b42318", margin: "4px 0 0" }}>{error}</p>
        )}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Yanıt oluşturuluyor..." : "Yanıt oluştur"}
          </button>
          <button
            type="button"
            onClick={handleClear}
            style={{
              background: "rgba(15, 122, 157, 0.12)",
              color: "#0f7a9d",
            }}
            disabled={isLoading || !hasConversation}
          >
            Sohbeti temizle
          </button>
        </div>
      </form>
    </section>
  );
}

