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
          fontSize: "2rem",
          margin: "0 0 32px 0",
          textAlign: "center",
          color: "#e4e7eb",
          fontWeight: 700,
        }}
      >
        Medical GPT-OSS 20B
      </h1>
      <ChatPanel />
    </main>
  );
}

