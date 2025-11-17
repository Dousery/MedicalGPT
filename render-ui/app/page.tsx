import { ChatPanel } from "../components/ChatPanel";

export default function Page() {
  return (
    <main
      style={{
        maxWidth: 1000,
        margin: "0 auto",
        padding: "20px 20px 32px 20px",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <h1
        style={{
          fontSize: "2.5rem",
          margin: "0 0 20px 0",
          textAlign: "center",
          fontWeight: 400,
          letterSpacing: "-0.02em",
          color: "#e4e7eb",
        }}
      >
        <span
          style={{
            fontFamily: "system-ui, sans-serif",
            fontWeight: 400,
            background: "linear-gradient(135deg, #a78bfa 0%, #60a5fa 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          MEDICAL
        </span>
        <span
          style={{
            fontWeight: 400,
            margin: "0 8px",
            color: "#a78bfa",
          }}
        >
          GPT
        </span>
        <span
          style={{
            fontSize: "0.7em",
            fontWeight: 600,
            letterSpacing: "0.1em",
            color: "#60a5fa",
          }}
        >
          OSS
        </span>
      </h1>
      <ChatPanel />
    </main>
  );
}

