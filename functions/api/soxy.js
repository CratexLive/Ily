export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return new Response("URL parameter is missing", { status: 400 });
  }

  try {
    const originHeaders = new Headers(request.headers);
    originHeaders.delete('host');
    originHeaders.delete('referer');

    const response = await fetch(targetUrl, {
      headers: originHeaders,
      redirect: 'follow'
    });

    const contentType = response.headers.get('content-type') || '';

    if (targetUrl.includes('.m3u8') || contentType.includes('mpegurl')) {
      let text = await response.text();
      const targetParsed = new URL(targetUrl);
      const baseUrl = `${targetParsed.protocol}//${targetParsed.host}${targetParsed.pathname.substring(0, targetParsed.pathname.lastIndexOf('/') + 1)}`;
      const proxyScriptUrl = `${url.origin}${url.pathname}`;

      const lines = text.split('\n');
      const rewrittenLines = lines.map(line => {
        line = line.trim();
        if (!line) return '';
        if (line.startsWith('#')) {
          if (line.includes('URI="')) {
            return line.replace(/URI="([^"]+)"/, (match, uri) => {
              const absoluteUri = new URL(uri, baseUrl).toString();
              return `URI="${proxyScriptUrl}?url=${encodeURIComponent(absoluteUri)}"`;
            });
          }
          return line;
        } else {
          const absoluteUrl = new URL(line, baseUrl).toString();
          return `${proxyScriptUrl}?url=${encodeURIComponent(absoluteUrl)}`;
        }
      });

      return new Response(rewrittenLines.join('\n'), {
        status: 200,
        headers: {
          'Content-Type': contentType || 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } else {
      const newHeaders = new Headers(response.headers);
      newHeaders.set('Access-Control-Allow-Origin', '*');
      return new Response(response.body, {
        status: response.status,
        headers: newHeaders
      });
    }
  } catch (err) {
    return new Response("Failed to fetch stream: " + err.message, { status: 500 });
  }
}
