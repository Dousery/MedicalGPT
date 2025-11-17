import { ChatPanel } from "@/components/ChatPanel";

const stats = [
  { label: "Rehber kapsamı", value: "40K+", detail: "klinik guideline" },
  { label: "Yanıt süresi", value: "≈2.4sn", detail: "ortalama üretim" },
  { label: "KVKK uyumu", value: "Tam", detail: "Türkiye veri lokasyonu" }
];

export default function Page() {
  return (
    <main
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "48px 20px 80px",
        display: "flex",
        flexDirection: "column",
        gap: 32,
      }}
    >
      <section className="hero-card hero">
        <p className="pill">
          <span aria-hidden="true">⚡</span> Modal GPU + Vercel Frontend
        </p>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            marginTop: 18,
          }}
        >
          <h1 style={{ fontSize: "2.5rem", margin: 0 }}>
            Medical GPT-OSS 20B Klinik Konsolu
          </h1>
          <p style={{ fontSize: "1.1rem", lineHeight: 1.6, margin: 0 }}>
            Modal üzerinde çalışan GPU inference fonksiyonunu, Vercel
            sunucusuz fonksiyonlarıyla güvenli bir şekilde son kullanıcıya açan
            referans web arayüzü.
          </p>
        </div>

        <div className="card-grid">
          {stats.map((stat) => (
            <div key={stat.label} className="card">
              <span style={{ fontSize: "2rem", fontWeight: 700 }}>
                {stat.value}
              </span>
              <p style={{ margin: "4px 0", fontWeight: 600 }}>{stat.label}</p>
              <p style={{ margin: 0, color: "#6b7c93" }}>{stat.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <ChatPanel />
    </main>
  );
}

