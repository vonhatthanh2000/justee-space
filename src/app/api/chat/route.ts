const CHAT_PATH = "/v1/chat";

export async function POST(request: Request) {
  const backendOrigin = process.env.JUSTBOT_BACKEND_URL;

  if (!backendOrigin) {
    return Response.json(
      { message: "JustBot is not configured." },
      { status: 503 },
    );
  }

  try {
    const requestBody = await request.text();
    const upstreamUrl = new URL(
      CHAT_PATH,
      `${backendOrigin.replace(/\/$/, "")}/`,
    );
    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        Accept: "text/event-stream, application/json",
        "Content-Type": "application/json",
      },
      body: requestBody,
      cache: "no-store",
      signal: request.signal,
    });

    const headers = new Headers({
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    });
    const contentType = upstream.headers.get("content-type");
    const retryAfter = upstream.headers.get("retry-after");

    if (contentType) headers.set("Content-Type", contentType);
    if (retryAfter) headers.set("Retry-After", retryAfter);

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return new Response(null, { status: 499 });
    }

    return Response.json(
      { message: "JustBot could not be reached. Please try again shortly." },
      { status: 502 },
    );
  }
}
