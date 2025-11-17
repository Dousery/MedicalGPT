import { NextResponse } from "next/server";

const DEFAULT_ENDPOINT =
  "https://doguser15--medical-gpt-oss-public-generate.modal.run";

export async function POST(request: Request) {
  const modalEndpoint =
    process.env.MODAL_ENDPOINT ?? process.env.NEXT_PUBLIC_MODAL_ENDPOINT ?? DEFAULT_ENDPOINT;

  try {
    const payload = (await request.json()) as { message?: string };
    const message = payload?.message?.trim();

    if (!message) {
      return NextResponse.json(
        { error: "message alanı zorunludur." },
        { status: 400 },
      );
    }

    const modalResponse = await fetch(modalEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    if (!modalResponse.ok) {
      const errorBody = await modalResponse
        .json()
        .catch(() => ({ error: "Modal API başarısız oldu." }));
      const status = modalResponse.status === 429 ? 429 : 502;
      return NextResponse.json(errorBody, { status });
    }

    const data = await modalResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Vercel API hatası:", error);
    return NextResponse.json(
      { error: "Sunucu hatası, lütfen tekrar deneyin." },
      { status: 500 },
    );
  }
}

