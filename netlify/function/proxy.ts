const BLOCKED_HEADERS = new Set([
  "x-frame-options","content-security-policy","content-security-policy-report-only",
  "strict-transport-security","x-content-type-options","transfer-encoding","connection","keep-alive",
]);

const INTERCEPTOR = `<script>(function(){
  var P='/api/proxy?url=';
  function resolve(url){try{return new URL(url,location.href).href}catch(e){return null}}
  function needsProxy(abs){return abs&&(abs.startsWith('http://')||abs.startsWith('https://'))&&!abs.includes('/api/proxy?url=')}
  function px(url){var abs=resolve(url);return needsProxy(abs)?P+encodeURIComponent(abs):null}
  document.addEventListener('click',function(e){
    var el=e.target;
    for(var i=0;i<6;i++){
      if(!el)break;
      if(el.tagName==='A'){
        var href=el.getAttribute('href');
        if(href&&!href.startsWith('javascript:')&&!href.startsWith('#')&&!href.startsWith('mailto:')){
          var p=px(href);if(p){e.preventDefault();e.stopImmediatePropagation();location.href=p;}
        }
        break;
      }
      el=el.parentElement;
    }
  },true);
  var _open=window.open;
  window.open=function(url,t,f){if(url){var p=px(String(url));if(p)return _open.call(this,p,'_self',f);}return _open.apply(this,arguments);};
  location.assign=function(url){var p=px(url);if(p)location.href=p;else location.href=url;};
  location.replace=function(url){var p=px(url);if(p)location.href=p;else location.href=url;};
}());<\/script>`;

function resolveUrl(base: string, rel: string): string {
  try {
    if (!rel||rel.startsWith("javascript:")||rel.startsWith("data:")||rel.startsWith("blob:")||rel.startsWith("#")||rel.startsWith("mailto:")||rel.startsWith("tel:")) return rel;
    return new URL(rel, base).href;
  } catch { return rel; }
}

function px(url: string) { return `/api/proxy?url=${encodeURIComponent(url)}`; }

function rewriteHtml(html: string, base: string): string {
  html = html.replace(/(\shref=)(["'])([^"']+)\2/g, (_m,a,q,url) => {
    if (/^(javascript:|#|mailto:|tel:|data:)/.test(url)) return `${a}${q}${url}${q}`;
    const r = resolveUrl(base, url);
    return r.startsWith("http") ? `${a}${q}${px(r)}${q}` : `${a}${q}${url}${q}`;
  });
  html = html.replace(/(\ssrc=)(["'])([^"']+)\2/g, (_m,a,q,url) => {
    if (/^(data:|blob:)/.test(url)) return `${a}${q}${url}${q}`;
    const r = resolveUrl(base, url);
    return r.startsWith("http") ? `${a}${q}${px(r)}${q}` : `${a}${q}${url}${q}`;
  });
  html = html.replace(/(\saction=)(["'])([^"']+)\2/g, (_m,a,q,url) => {
    if (/^(javascript:|#)/.test(url)) return `${a}${q}${url}${q}`;
    const r = resolveUrl(base, url);
    return r.startsWith("http") ? `${a}${q}${px(r)}${q}` : `${a}${q}${url}${q}`;
  });
  return html;
}

function rewriteCss(css: string, base: string): string {
  return css.replace(/url\(["']?([^"')]+)["']?\)/g, (_m, url) => {
    const t = url.trim();
    if (/^(data:|blob:)/.test(t)) return _m;
    const r = resolveUrl(base, t);
    return r.startsWith("http") ? `url("${px(r)}")` : _m;
  });
}

export const handler = async (event: any) => {
  const rawUrl = event.queryStringParameters?.url;

  if (!rawUrl) {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "url parameter required" }) };
  }

  let targetUrl: URL;
  try { targetUrl = new URL(rawUrl); }
  catch {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Invalid URL" }) };
  }

  try {
    const response = await fetch(targetUrl.href, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "identity",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });

    const contentType = response.headers.get("content-type") ?? "";
    const finalUrl = response.url;
    const outHeaders: Record<string, string> = {};
    response.headers.forEach((val, key) => {
      if (!BLOCKED_HEADERS.has(key.toLowerCase())) outHeaders[key] = val;
    });

    if (contentType.includes("text/html")) {
      let html = await response.text();
      html = rewriteHtml(html, finalUrl);
      html = html.includes("</head>") ? html.replace("</head>", `${INTERCEPTOR}</head>`) : INTERCEPTOR + html;
      return { statusCode: 200, headers: { ...outHeaders, "Content-Type": "text/html; charset=utf-8" }, body: html };
    } else if (contentType.includes("text/css")) {
      let css = await response.text();
      css = rewriteCss(css, finalUrl);
      return { statusCode: 200, headers: { ...outHeaders, "Content-Type": "text/css; charset=utf-8" }, body: css };
    } else {
      const buf = await response.arrayBuffer();
      return { statusCode: response.status, headers: { ...outHeaders, "Content-Type": contentType }, body: Buffer.from(buf).toString("base64"), isBase64Encoded: true };
    }
  } catch (err) {
    return {
      statusCode: 502,
      headers: { "Content-Type": "text/html; charset=utf-8" },
      body: `<html><body style="background:#000;color:#0f0;font-family:monospace;padding:2rem;"><h2>CONNECTION FAILED</h2><p>${rawUrl}</p><p>${err instanceof Error ? err.message : "Unknown error"}</p></body></html>`,
    };
  }
};
