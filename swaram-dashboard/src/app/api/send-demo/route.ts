import { NextRequest, NextResponse } from "next/server";

const N8N_WEBHOOK_URL = "https://app.workflow-tech.info/webhook/website";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `n8n webhook returned ${response.status}: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    console.error("[send-demo proxy] Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal proxy error" },
      { status: 500 }
    );
  }
}
