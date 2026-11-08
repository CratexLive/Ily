export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get("u");

  if (!targetUrl) {
    return new Response("Missing target URL parameter 'u'", { status: 400 });
  }

  try {
    // Extract incoming headers to forward client parameters if needed
    const clientUserAgent = request.headers.get("user-agent") || "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";

    const modifiedRequest = new Request(targetUrl, {
      headers: {
        "User-Agent": clientUserAgent,
        "Referer": "https://www.sonyliv.com/",
        "Origin": "https://www.sonyliv.com/",
        "Accept": "*/*"
      },
      method: request.method,
      redirect: "follow"
    });

    const response = await fetch(modifiedRequest);
    
    // Create a new response maintaining the underlying body stream
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });

    // Enforce CORS policies so your frontend domain can read the stream chunks
    newResponse.headers.set("Access-Control-Allow-Origin", "*");
    newResponse.headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS, POST");
    newResponse.headers.set("Access-Control-Allow-Headers", "*");
    
    // Prevent caching issues on live streams
    newResponse.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");

    return newResponse;
  } catch (err) {
    return new Response("Proxy fetch error: " + err.message, { status: 500 });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS, POST",
      "Access-Control-Allow-Headers": "*"
    }
  });
}
