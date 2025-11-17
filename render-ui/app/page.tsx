import { ChatPanel } from "../components/ChatPanel";

export default function Page() {
  return (
    <main
      style={{
        maxWidth: 1000,
        margin: "0 auto",
        padding: "32px 20px",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <h1
        style={{
          fontSize: "2.5rem",
          margin: "0 0 32px 0",
          textAlign: "center",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          background: "linear-gradient(135deg, #a78bfa 0%, #60a5fa 50%, #34d399 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          textShadow: "0 0 40px rgba(139, 92, 246, 0.3)",
        }}
      >
        <span style={{ fontFamily: "system-ui, sans-serif" }}>MEDICAL</span>
        <span style={{ fontWeight: 300, opacity: 0.8, margin: "0 8px" }}>GPT</span>
        <span style={{ fontSize: "0.7em", fontWeight: 600, opacity: 0.7, letterSpacing: "0.1em" }}>
          OSS
        </span>
      </h1>
      <ChatPanel />
    </main>
  );
}

