export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get("u");

  if (!targetUrl) {
    return new Response("Missing target URL parameter 'u'", { status: 400 });
  }

  try {
    const clientUserAgent = request.headers.get("user-agent") || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

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
    
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });

    newResponse.headers.set("Access-Control-Allow-Origin", "*");
    newResponse.headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS, POST");
    newResponse.headers.set("Access-Control-Allow-Headers", "*");
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
