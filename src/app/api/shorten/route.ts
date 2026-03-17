import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) throw new Error("TinyURL request failed");
    const short = await res.text();
    if (!short.startsWith("http")) throw new Error("Invalid response");
    return NextResponse.json({ short });
  } catch {
    return NextResponse.json({ error: "Could not shorten URL" }, { status: 500 });
  }
}
