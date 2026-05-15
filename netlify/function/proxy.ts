export const handler = async (event) => {
  const rawUrl = event.queryStringParameters && event.queryStringParameters.url;
  if (!rawUrl) {
    return { statusCode: 400, body: "Missing url parameter" };
  }

  const BLOCKED = new Set(["x-frame-options","content-security-policy","content-security-policy-report-only","strict-transport-security","x-content-type-options","transfer-encoding","connection","keep-alive"]);
  const INTERCEPTOR = `<script>(function(){var P='/api/proxy?url=';function res(u){try{return new URL(u,location.href).href}catch(e){return null}}function np(a){return a&&(a.startsWith('http://')||a.startsWith('https://'))&&!a.includes('/api/proxy?url=')}function px(u){var a=res(u);return np(a)?P+encodeURIComponent(a):null}document.addEventListener('click',function(e){var el=e.target;for(var i=0;i<6;i++){if(!el)break;if(el.tagName==='A'){var h=el.getAttribute('href');if(h&&!h.startsWith('javascript:')&&!h.startsWith('#')){var p=px(h);if(p){e.preventDefault();e.stopImmediatePropagation();location.href=p;}}break;}el=el.parentElement;}},true);}());<\/script>`;

  try {
    const response = await fetch(rawUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "identity",
      },
      redirect: "follow",
    });

    const contentType = response.headers.get("content-type") || "";
    const finalUrl = response.url;
    const outHeaders = { "Content-Type": contentType };
    response.headers.forEach((val, key) => {
      if (!BLOCKED.has(key.toLowerCase())) outHeaders[key] = val;
    });

    if (contentType.includes("text/html")) {
      let html = await response.text();
      html = html.replace(/(\shref=)(["'])([^"']+)\2/g, function(_m,a,q,url) {
        if (/^(javascript:|#|mailto:|tel:|data:)/.test(url)) return a+q+url+q;
        try { var r = new URL(url, finalUrl).href; return r.startsWith("http") ? a+q+'/api/proxy?url='+encodeURIComponent(r)+q : a+q+url+q; } catch(e) { return a+q+url+q; }
      });
      html = html.replace(/(\ssrc=)(["'])([^"']+)\2/g, function(_m,a,q,url) {
        if (/^(data:|blob:)/.test(url)) return a+q+url+q;
        try { var r = new URL(url, finalUrl).href; return r.startsWith("http") ? a+q+'/api/proxy?url='+encodeURIComponent(r)+q : a+q+url+q; } catch(e) { return a+q+url+q; }
      });
      html = html.includes("</head>") ? html.replace("</head>", INTERCEPTOR+"</head>") : INTERCEPTOR+html;
      return { statusCode: 200, headers: { ...outHeaders, "Content-Type": "text/html; charset=utf-8" }, body: html };
    } else {
      const buf = await response.arrayBuffer();
      return { statusCode: response.status, headers: outHeaders, body: Buffer.from(buf).toString("base64"), isBase64Encoded: true };
    }
  } catch (err) {
    return {
      statusCode: 502,
      headers: { "Content-Type": "text/html" },
      body: "<html><body style='background:#000;color:#0f0;font-family:monospace;padding:2rem'><h2>CONNECTION FAILED</h2><p>" + rawUrl + "</p><p>" + (err.message || "Unknown error") + "</p></body></html>",
    };
  }
};
