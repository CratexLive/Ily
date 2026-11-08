export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('u');

    if (!targetUrl) {
      return new Response('Missing target URL', { status: 400 });
    }

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://www.sonyliv.com/',
      'Origin': 'https://www.sonyliv.com'
    };

    try {
      const target = new URL(targetUrl);
      const response = await fetch(targetUrl, { headers });
      
      const contentType = response.headers.get('content-type') || '';

      // If it's an m3u8 playlist, rewrite internal chunk/variant URLs
      if (contentType.includes('mpegurl') || contentType.includes('vnd.apple.mpegurl') || targetUrl.includes('.m3u8')) {
        let manifestText = await response.text();
        const baseUrl = `${target.origin}${target.pathname.substring(0, target.pathname.lastIndexOf('/') + 1)}`;
        const originalQuery = target.search;

        const lines = manifestText.split('\n');
        const rewrittenLines = lines.map(line => {
          line = line.trim();
          if (!line || line.startsWith('#')) {
            return line;
          }

          let absoluteSegmentUrl;
          if (line.startsWith('http://') || line.startsWith('https://')) {
            absoluteSegmentUrl = line;
          } else if (line.startsWith('/')) {
            absoluteSegmentUrl = `${target.origin}${line}`;
          } else {
            absoluteSegmentUrl = `${baseUrl}${line}`;
          }

          if (!absoluteSegmentUrl.includes('?') && originalQuery) {
            absoluteSegmentUrl += originalQuery;
          }

          const workerOrigin = `${url.protocol}//${url.host}${url.pathname}`;
          return `${workerOrigin}?u=${encodeURIComponent(absoluteSegmentUrl)}`;
        });

        const modifiedManifest = rewrittenLines.join('\n');
        const newResponse = new Response(modifiedManifest, response);
        newResponse.headers.set('Access-Control-Allow-Origin', '*');
        newResponse.headers.set('Content-Type', 'application/vnd.apple.mpegurl');
        return newResponse;
      }

      // For video segments (.ts, .m4s), stream response back with CORS
      const newResponse = new Response(response.body, response);
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      return newResponse;

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }
};
