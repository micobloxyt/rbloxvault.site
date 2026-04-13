const fs = require('fs');
const path = require('path');
const baseUrl = 'https://rbloxvault.site/';
function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}
async function readArticlesGist() {
  try {
    const token = process.env.GITHUB_TOKEN || "";
    const gistId = process.env.GIST_ID || "";
    if (!token || !gistId) return null;
    const resp = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'netlify-build'
      }
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const files = data && data.files ? data.files : {};
    const f = files['articles-data.json'] || files['articles.json'] || files['data.json'];
    if (!f || !f.content) return null;
    try {
      const parsed = JSON.parse(f.content);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && Array.isArray(parsed.articles)) return parsed.articles;
    } catch {}
    return null;
  } catch {
    return null;
  }
}
function readIndex() {
  const candidates = ['netlify/index.html', 'index.html'];
  for (const p of candidates) {
    const full = path.join(__dirname, p);
    if (fs.existsSync(full)) return fs.readFileSync(full, 'utf8');
  }
  return '';
}
function readArticlesJson() {
  const full = path.join(__dirname, 'articles-data.json');
  if (fs.existsSync(full)) {
    try {
      const txt = fs.readFileSync(full, 'utf8');
      const parsed = JSON.parse(txt);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return null;
}
function extractArticles(html) {
  const m = html.match(/<script\s+type="application\/json"\s+id="articles-data">([\s\S]*?)<\/script>/);
  if (!m) return [];
  try {
    const json = m[1].trim();
    const parsed = JSON.parse(json);
    const list = Array.isArray(parsed) ? parsed : (parsed.articles || []);
    return list;
  } catch {
    return [];
  }
}
function buildSitemap(urls) {
  const header = '<?xml version="1.0" encoding="UTF-8"?>\n';
  const open = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  const body = urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n');
  const close = '\n</urlset>\n';
  return header + open + body + close;
}
function readExtraUrls() {
  const txtPath = path.join(__dirname, 'extra-sitemap-urls.txt');
  const jsonPath = path.join(__dirname, 'extra-sitemap-urls.json');
  let out = [];
  if (fs.existsSync(txtPath)) {
    try {
      const content = fs.readFileSync(txtPath, 'utf8');
      out = out.concat(content.split(/\r?\n/).map(s => s.trim()).filter(s => /^https?:\/\//i.test(s)));
    } catch {}
  }
  if (fs.existsSync(jsonPath)) {
    try {
      const content = fs.readFileSync(jsonPath, 'utf8');
      const arr = JSON.parse(content);
      if (Array.isArray(arr)) out = out.concat(arr.filter(s => typeof s === 'string' && /^https?:\/\//i.test(s)));
    } catch {}
  }
  return Array.from(new Set(out));
}
function escapeHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function renderArticlePage(a) {
  const slug = a.slug || '';
  const title = a.title || 'Artículo';
  const desc = a.excerpt || (a.content ? a.content.split(/\n/)[0] : '');
  const image = a.image_url || '';
  const cat = a.category || '';
  const date = a.created_at || '';
  const raw = (a.content || a.excerpt || '').trim();
  const looksHtml = /<[^>]+>/.test(raw);
  const bodyContent = looksHtml
    ? `<div class="article-body">${raw}</div>`
    : raw.split(/\n\s*\n/).map(p => `<p>${escapeHtml(p)}</p>`).join('\n');
  const canonical = `${baseUrl}${slug}`;
  const dateFormatted = date ? new Date(date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} - Roblox Vault</title>
<link rel="canonical" href="${canonical}">
<meta name="description" content="${escapeHtml(desc)}">
<meta name="robots" content="index, follow">
<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(desc)}">
<meta property="og:url" content="${canonical}">
${image ? `<meta property="og:image" content="${escapeHtml(image)}">` : ''}
<meta name="google-adsense-account" content="ca-pub-3048023598545728">
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('consent', 'default', {
    'ad_storage': 'denied',
    'analytics_storage': 'denied',
    'ad_user_data': 'denied',
    'ad_personalization': 'denied'
  });
</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-9E5JV97Y4F"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-9E5JV97Y4F');
</script>
<script>
  (function(){
    if(window.navigator.webdriver || /bot|crawler|spider|headless/i.test(window.navigator.userAgent)) return;
    let adsLoaded = false;
    const loadAds = function() {
      if(adsLoaded) return; adsLoaded = true;
      const script = document.createElement('script');
      script.async = true; script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3048023598545728";
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
    };
    window.addEventListener('scroll', loadAds, {once:true, passive:true});
    window.addEventListener('mousemove', loadAds, {once:true, passive:true});
    window.addEventListener('touchstart', loadAds, {once:true, passive:true});
    setTimeout(loadAds, 6000);
  })();
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "${escapeHtml(title)}",
  "description": "${escapeHtml(desc)}",
  "image": "${escapeHtml(image)}",
  "datePublished": "${escapeHtml(date)}",
  "author": { "@type": "Person", "name": "${escapeHtml(a.author || 'Admin')}" },
  "publisher": { "@type": "Organization", "name": "Roblox Vault", "url": "${baseUrl}" }
}
</script>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8f9fa; color: #1a1a1a; line-height: 1.6; }
  a { color: #2ecc71; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .header { background: linear-gradient(to right, #fff, #f4fbf6, #fff); border-bottom: 1px solid #e5e7eb; }
  .header-inner { max-width: 1152px; margin: 0 auto; padding: 0 1rem; display: flex; align-items: center; justify-content: space-between; height: 5rem; }
  .logo { font-size: 1.875rem; font-weight: 800; background: linear-gradient(to right, #15803d, #0d9488); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  nav a { font-size: 0.875rem; color: #374151; margin-left: 2rem; }
  nav a:hover { color: #0d9488; }
  .container { max-width: 768px; margin: 0 auto; padding: 2rem 1rem 4rem; }
  .back-link { font-size: 0.875rem; color: #2ecc71; }
  .category-badge { display: inline-block; background: linear-gradient(to right, #10b981, #0d9488); color: #fff; font-size: 0.75rem; font-weight: 600; padding: 0.25rem 0.75rem; border-radius: 9999px; }
  .meta { display: flex; align-items: center; gap: 1rem; margin: 0.75rem 0 1.5rem; font-size: 0.8rem; color: #6b7280; }
  h1 { font-size: 2rem; font-weight: 800; color: #14532d; margin: 1rem 0; line-height: 1.2; }
  .hero-img { width: 100%; max-height: 480px; object-fit: cover; border-radius: 0.75rem; margin-bottom: 1.5rem; }
  .article-body p { margin-bottom: 1rem; font-size: 1.0625rem; color: #374151; }
  .article-body h2 { font-size: 1.5rem; font-weight: 700; color: #14532d; margin: 2rem 0 0.75rem; }
  .article-body h3 { font-size: 1.25rem; font-weight: 600; color: #14532d; margin: 1.5rem 0 0.5rem; }
  .article-body ul, .article-body ol { padding-left: 1.5rem; margin-bottom: 1rem; color: #374151; }
  .article-body li { margin-bottom: 0.25rem; }
  .ad-slot { margin: 2rem 0; text-align: center; min-height: 90px; }
  footer { background: linear-gradient(to right, #14532d, #0d4f49); color: #fff; text-align: center; padding: 2rem 1rem; font-size: 0.875rem; margin-top: 3rem; }
  footer a { color: #6ee7b7; }
  @media (max-width: 640px) { h1 { font-size: 1.5rem; } nav { display: none; } }
</style>
</head>
<body>
<header class="header">
  <div class="header-inner">
    <a href="/" class="logo">Roblox Vault</a>
    <nav>
      <a href="/privacidad">Privacidad</a>
      <a href="/contacto">Contacto</a>
      <a href="/sobre">Sobre</a>
      <a href="/terminos">Términos</a>
    </nav>
  </div>
</header>
<div class="container">
  <a href="/" class="back-link">← Volver al inicio</a>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">
    <span class="category-badge">${escapeHtml(cat)}</span>
    <span>Por ${escapeHtml(a.author || 'Admin')}</span>
    ${dateFormatted ? `<span>${dateFormatted}</span>` : ''}
  </div>
  ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" class="hero-img">` : ''}
  <article class="article-body">
    ${bodyContent}
  </article>
  <div class="ad-slot">
    <ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-9330448485268610" data-ad-slot="auto" data-ad-format="auto" data-full-width-responsive="true"></ins>
    <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
  </div>

  <!-- REVIEWS SECTION -->
  <section class="reviews-section">
    <h2 class="reviews-title">Reseñas</h2>
    <div class="reviews-summary">
      <span class="reviews-avg-stars" id="rv-avg-stars"></span>
      <span class="reviews-avg-text" id="rv-avg-text">Sin reseñas aún</span>
    </div>
    <div class="reviews-list" id="rv-list"></div>
    <div class="reviews-form-wrap">
      <h3>Deja tu reseña</h3>
      <form id="rv-form">
        <div class="review-field">
          <label for="rv-name">Nombre *</label>
          <input type="text" id="rv-name" required placeholder="Tu nombre">
        </div>
        <div class="review-field">
          <label for="rv-email">Correo (opcional)</label>
          <input type="email" id="rv-email" placeholder="tu@email.com">
        </div>
        <div class="review-field">
          <label>Calificación: <strong id="rv-rating-display">5.0</strong> / 5</label>
          <input type="range" id="rv-rating" min="1" max="10" value="10" step="1">
          <div class="rv-stars-preview" id="rv-stars-preview">★★★★★</div>
        </div>
        <div class="review-field">
          <label for="rv-text">Tu opinión *</label>
          <textarea id="rv-text" required placeholder="Escribe tu reseña aquí..." rows="4"></textarea>
        </div>
        <button type="submit" class="rv-submit-btn">Enviar reseña</button>
      </form>
    </div>
  </section>
  <style>
  .reviews-section{margin:2.5rem 0 1rem;border-top:2px solid #e5e7eb;padding-top:2rem}
  .reviews-title{font-size:1.5rem;font-weight:700;color:#14532d;margin-bottom:.75rem}
  .reviews-summary{display:flex;align-items:center;gap:.75rem;margin-bottom:1.5rem;font-size:1rem;color:#374151}
  .reviews-avg-stars{font-size:1.25rem;color:#f59e0b}
  .reviews-avg-text{font-weight:600}
  .reviews-list{display:flex;flex-direction:column;gap:1rem;margin-bottom:2rem}
  .review-card{background:#fff;border:1px solid #e5e7eb;border-radius:.75rem;padding:1rem 1.25rem}
  .review-card-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem}
  .review-card-name{font-weight:700;color:#14532d}
  .review-card-date{font-size:.75rem;color:#9ca3af}
  .review-card-stars{color:#f59e0b;font-size:1rem;margin-bottom:.5rem}
  .review-card-text{font-size:.9375rem;color:#374151}
  .reviews-empty{color:#9ca3af;font-style:italic;text-align:center;padding:1.5rem 0}
  .reviews-form-wrap{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:.75rem;padding:1.5rem}
  .reviews-form-wrap h3{font-size:1.125rem;font-weight:700;color:#14532d;margin-bottom:1rem}
  .review-field{margin-bottom:1rem}
  .review-field label{display:block;font-size:.875rem;font-weight:600;color:#374151;margin-bottom:.35rem}
  .review-field input[type="text"],.review-field input[type="email"],.review-field textarea{width:100%;padding:.5rem .75rem;border:1px solid #d1fae5;border-radius:.5rem;font-size:.9375rem;background:#fff;color:#1a1a1a;outline:none;font-family:inherit}
  .review-field input[type="text"]:focus,.review-field input[type="email"]:focus,.review-field textarea:focus{border-color:#10b981;box-shadow:0 0 0 2px #d1fae5}
  .review-field input[type="range"]{width:100%;accent-color:#10b981;margin-top:.25rem}
  .rv-stars-preview{font-size:1.25rem;color:#f59e0b;margin-top:.25rem}
  .rv-submit-btn{background:linear-gradient(to right,#10b981,#0d9488);color:#fff;border:none;padding:.6rem 1.5rem;border-radius:.5rem;font-size:.9375rem;font-weight:600;cursor:pointer}
  .rv-submit-btn:hover{opacity:.9}
  .rv-success-msg{color:#059669;font-weight:600;margin-top:.75rem;font-size:.9375rem}
  </style>
  <script type="application/json" id="adm-article-data">${JSON.stringify(a).replace(/<\/script>/gi,'<\\/script>')}</script>
  <script>
  (function(){
    var SLUG='${slug}';
    function stars(n){var s='',f=Math.floor(n),h=(n%1)>=.5;for(var i=0;i<f;i++)s+='★';if(h)s+='½';for(var i=f+(h?1:0);i<5;i++)s+='☆';return s}
    function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
    function render(rv){
      var list=document.getElementById('rv-list'),avgT=document.getElementById('rv-avg-text'),avgS=document.getElementById('rv-avg-stars');
      if(!rv||!rv.length){list.innerHTML='<p class="reviews-empty">Sé el primero en opinar</p>';avgT.textContent='Sin reseñas aún';avgS.textContent='';return}
      var avg=rv.reduce(function(a,b){return a+(b.rating||b.r||0)},0)/rv.length;
      avgS.textContent=stars(avg);
      avgT.textContent=avg.toFixed(1)+' / 5 ('+rv.length+' reseña'+(rv.length!==1?'s':'')+')';
      list.innerHTML=rv.map(function(r){
        var name=esc(r.name||r.n||'');
        var text=esc(r.text||r.t||'');
        var rating=r.rating||r.r||0;
        var date=r.at?new Date(r.at).toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'}):(r.d||'');
        return'<div class="review-card"><div class="review-card-header"><span class="review-card-name">'+name+'</span><span class="review-card-date">'+date+'</span></div><div class="review-card-stars">'+stars(rating)+' '+Number(rating).toFixed(1)+'</div><p class="review-card-text">'+text+'</p></div>';
      }).join('')
    }
    // Cargar reseñas desde el Gist
    fetch('/.netlify/functions/get-reviews',{cache:'no-store'})
      .then(function(r){return r.json()})
      .then(function(all){render(all[SLUG]||[])})
      .catch(function(){render([])});
    document.getElementById('rv-rating').addEventListener('input',function(){
      var v=parseInt(this.value)/2;
      document.getElementById('rv-rating-display').textContent=v.toFixed(1);
      document.getElementById('rv-stars-preview').textContent=stars(v);
    });
    document.getElementById('rv-form').addEventListener('submit',function(e){
      e.preventDefault();
      var form=this;
      var n=document.getElementById('rv-name').value.trim(),t=document.getElementById('rv-text').value.trim(),r=parseInt(document.getElementById('rv-rating').value)/2;
      if(!n||!t)return;
      var btn=form.querySelector('button[type=submit]');
      if(btn){btn.disabled=true;btn.textContent='Enviando...';}
      fetch('/.netlify/functions/submit-review',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({slug:SLUG,review:{name:n,text:t,rating:r}})
      }).then(function(res){return res.json()}).then(function(data){
        if(btn){btn.disabled=false;btn.textContent='Publicar reseña';}
        if(data.ok){
          form.reset();
          document.getElementById('rv-rating-display').textContent='5.0';
          document.getElementById('rv-stars-preview').textContent='★★★★★';
          var msg=document.createElement('p');msg.className='rv-success-msg';msg.textContent='¡Gracias por tu reseña!';form.appendChild(msg);
          setTimeout(function(){if(msg.parentNode)msg.parentNode.removeChild(msg)},3000);
          // Recargar reseñas
          fetch('/.netlify/functions/get-reviews',{cache:'no-store'}).then(function(r){return r.json()}).then(function(all){render(all[SLUG]||[])});
        }
      }).catch(function(){
        if(btn){btn.disabled=false;btn.textContent='Publicar reseña';}
        alert('Error enviando la reseña. Intenta de nuevo.');
      });
    });
    window.enableAdmin=function(p){if(String(p)==='RBXADMIN2025'){localStorage.setItem('admin_mode','1');location.reload();}};
    window.disableAdmin=function(){localStorage.removeItem('admin_mode');location.reload();};
    if(localStorage.getItem('admin_mode')==='1'){
      var bar=document.createElement('div');
      bar.id='admin-bar';
      bar.style.cssText='background:#faf5ff;border:1px solid #c4b5fd;border-radius:.75rem;padding:1rem 1.25rem;margin-top:2rem';
      var savedKey=localStorage.getItem('admin_key')||'';
      var ARTICLE_DATA=JSON.parse(document.getElementById('adm-article-data').textContent||'{}');
      bar.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem"><strong style="color:#4c1d95;font-size:1rem">Panel Admin</strong><button id="adm-logout" style="font-size:.75rem;color:#6b7280;background:none;border:none;cursor:pointer">✕ Salir</button></div>'
        +'<div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin-bottom:1rem">'
        +'<input id="adm-key" type="password" placeholder="Clave admin" value="'+savedKey+'" style="border:1px solid #d1d5db;border-radius:.375rem;padding:.35rem .6rem;font-size:.85rem;width:180px">'
        +'<button id="adm-toggle-edit" style="background:#7c3aed;color:#fff;border:none;border-radius:.375rem;padding:.35rem .75rem;font-size:.85rem;cursor:pointer">✏️ Editar artículo</button>'
        +'<button id="adm-del-article" style="background:#dc2626;color:#fff;border:none;border-radius:.375rem;padding:.35rem .75rem;font-size:.85rem;cursor:pointer">Eliminar artículo</button>'
        +'</div>'
        +'<div id="adm-edit-wrap" style="display:none;margin-bottom:1rem;background:#fff;border:1px solid #c4b5fd;border-radius:.5rem;padding:1rem">'
        +'<p style="font-size:.85rem;font-weight:600;color:#4c1d95;margin-bottom:.75rem">Editar artículo</p>'
        +'<div style="display:flex;flex-direction:column;gap:.5rem">'
        +'<input id="adm-edit-title" placeholder="Título" style="border:1px solid #d1d5db;border-radius:.375rem;padding:.4rem .6rem;font-size:.85rem;width:100%">'
        +'<input id="adm-edit-slug" placeholder="Slug (URL)" style="border:1px solid #d1d5db;border-radius:.375rem;padding:.4rem .6rem;font-size:.85rem;width:100%">'
        +'<input id="adm-edit-category" placeholder="Categoría" style="border:1px solid #d1d5db;border-radius:.375rem;padding:.4rem .6rem;font-size:.85rem;width:100%">'
        +'<input id="adm-edit-image" placeholder="Imagen (URL)" style="border:1px solid #d1d5db;border-radius:.375rem;padding:.4rem .6rem;font-size:.85rem;width:100%">'
        +'<input id="adm-edit-excerpt" placeholder="Resumen" style="border:1px solid #d1d5db;border-radius:.375rem;padding:.4rem .6rem;font-size:.85rem;width:100%">'
        +'<textarea id="adm-edit-content" placeholder="Contenido" style="border:1px solid #d1d5db;border-radius:.375rem;padding:.4rem .6rem;font-size:.85rem;width:100%;min-height:120px"></textarea>'
        +'<input id="adm-edit-author" placeholder="Autor" style="border:1px solid #d1d5db;border-radius:.375rem;padding:.4rem .6rem;font-size:.85rem;width:100%">'
        +'<div style="display:flex;gap:.5rem;justify-content:flex-end">'
        +'<button id="adm-edit-cancel" type="button" style="border:1px solid #d1d5db;border-radius:.375rem;padding:.4rem .75rem;font-size:.85rem;cursor:pointer;background:#fff">Cancelar</button>'
        +'<button id="adm-edit-save" type="button" style="background:#7c3aed;color:#fff;border:none;border-radius:.375rem;padding:.4rem .75rem;font-size:.85rem;cursor:pointer">Guardar cambios</button>'
        +'</div></div></div>'
        +'<div id="adm-reviews-wrap"><p style="font-size:.85rem;color:#9ca3af">Cargando reseñas...</p></div>';
      document.querySelector('.container').appendChild(bar);
      document.getElementById('adm-logout').addEventListener('click',function(){localStorage.removeItem('admin_mode');location.reload();});
      document.getElementById('adm-key').addEventListener('input',function(){localStorage.setItem('admin_key',this.value);});
      function getKey(){return document.getElementById('adm-key').value||localStorage.getItem('admin_key')||'';}
      // Pre-fill edit form
      document.getElementById('adm-edit-title').value=ARTICLE_DATA.title||'';
      document.getElementById('adm-edit-slug').value=ARTICLE_DATA.slug||'';
      document.getElementById('adm-edit-category').value=ARTICLE_DATA.category||'';
      document.getElementById('adm-edit-image').value=ARTICLE_DATA.image_url||'';
      document.getElementById('adm-edit-excerpt').value=ARTICLE_DATA.excerpt||'';
      document.getElementById('adm-edit-content').value=ARTICLE_DATA.content||'';
      document.getElementById('adm-edit-author').value=ARTICLE_DATA.author||'';
      // Toggle edit form
      document.getElementById('adm-toggle-edit').addEventListener('click',function(){
        var w=document.getElementById('adm-edit-wrap');
        w.style.display=w.style.display==='none'?'block':'none';
      });
      document.getElementById('adm-edit-cancel').addEventListener('click',function(){
        document.getElementById('adm-edit-wrap').style.display='none';
      });
      document.getElementById('adm-edit-save').addEventListener('click',function(){
        var k=getKey();
        if(!k){alert('Escribe la clave admin primero.');return;}
        var title=document.getElementById('adm-edit-title').value.trim();
        var newSlug=document.getElementById('adm-edit-slug').value.trim();
        var category=document.getElementById('adm-edit-category').value.trim();
        var image_url=document.getElementById('adm-edit-image').value.trim();
        var excerpt=document.getElementById('adm-edit-excerpt').value.trim();
        var content=document.getElementById('adm-edit-content').value.trim();
        var author=document.getElementById('adm-edit-author').value.trim()||'Admin';
        if(!title||!category||!image_url||!content){alert('Título, categoría, imagen y contenido son obligatorios.');return;}
        var btn=document.getElementById('adm-edit-save');
        btn.disabled=true;btn.textContent='Guardando...';
        fetch('/.netlify/functions/get-articles').then(function(r){return r.json();}).then(function(arts){
          var updated=Object.assign({},ARTICLE_DATA,{title:title,category:category,image_url:image_url,excerpt:excerpt,content:content,author:author});
          if(newSlug&&newSlug!==SLUG){
            updated.slug=newSlug;
            var prev=Array.isArray(ARTICLE_DATA.old_slugs)?ARTICLE_DATA.old_slugs:[];
            updated.old_slugs=Array.from(new Set(prev.concat([SLUG])));
          }
          var next=arts.map(function(a){return a.slug===SLUG?updated:a;});
          if(!next.some(function(a){return a.slug===SLUG;}))next=[updated].concat(arts);
          var payload=next.map(function(a,i){return i===0?Object.assign({},a,{__source:'admin'}):a;});
          return fetch('/.netlify/functions/save-articles',{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Key':k},body:JSON.stringify(payload)});
        }).then(function(r){
          btn.disabled=false;btn.textContent='Guardar cambios';
          if(r.ok){alert('Artículo actualizado. Los cambios se verán tras el próximo build.');}
          else{r.text().then(function(t){alert('Error: '+t);});}
        }).catch(function(e){
          btn.disabled=false;btn.textContent='Guardar cambios';
          alert('Fallo de red: '+(e.message||e));
        });
      });
      document.getElementById('adm-del-article').addEventListener('click',function(){
        if(!confirm('¿Eliminar este artículo? Esta acción no se puede deshacer.'))return;
        var k=getKey();
        if(!k){alert('Escribe la clave admin primero.');return;}
        fetch('/.netlify/functions/get-articles').then(function(r){return r.json()}).then(function(arts){
          var next=arts.filter(function(a){return a.slug!==SLUG});
          var payload=next.length>0?next.map(function(a,i){return i===0?Object.assign({},a,{__source:'admin'}):a}):[];
          return fetch('/.netlify/functions/save-articles',{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Key':k},body:JSON.stringify(payload)});
        }).then(function(r){if(r.ok){alert('Artículo eliminado.');window.location.href='/';}else{r.text().then(function(t){alert('Error: '+t)});}})
        .catch(function(e){alert('Fallo de red: '+(e.message||e));});
      });
      function renderAdmReviews(reviews){
        var el=document.getElementById('adm-rv-list');
        if(!el)return;
        if(!reviews.length){el.innerHTML='<p style="font-size:.85rem;color:#6b7280">Sin reseñas.</p>';return;}
        el.innerHTML=reviews.map(function(r,i){
          return '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:.5rem;padding:.6rem .85rem;display:flex;align-items:flex-start;justify-content:space-between;gap:.75rem">'
            +'<div style="flex:1;min-width:0"><span style="font-weight:600;font-size:.85rem">'+esc(r.name||r.n||'')+'</span>'
            +' <span style="color:#f59e0b;font-size:.8rem">'+('★'.repeat(Math.round(r.rating||r.r||0)))+'</span>'
            +' <span style="color:#9ca3af;font-size:.75rem">'+(r.at?new Date(r.at).toLocaleDateString('es-ES'):r.d||'')+'</span>'
            +'<p style="font-size:.82rem;color:#374151;margin-top:.2rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(r.text||r.t||'')+'</p></div>'
            +'<button data-idx="'+i+'" class="adm-del-rv" style="background:#dc2626;color:#fff;border:none;border-radius:.375rem;padding:.3rem .6rem;font-size:.78rem;cursor:pointer;white-space:nowrap">Eliminar</button>'
            +'</div>';
        }).join('');
        el.querySelectorAll('.adm-del-rv').forEach(function(btn){
          btn.addEventListener('click',function(){
            var idx=parseInt(this.getAttribute('data-idx'));
            if(!confirm('¿Eliminar esta reseña?'))return;
            var k=getKey();
            if(!k){alert('Escribe la clave admin primero.');return;}
            var updated=Object.assign({},window._allReviews);
            updated[SLUG]=window._adminReviews.filter(function(_,i){return i!==idx});
            fetch('/.netlify/functions/save-reviews',{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Key':k},body:JSON.stringify(updated)})
              .then(function(r){
                if(r.ok){window._adminReviews=updated[SLUG];window._allReviews=updated;renderAdmReviews(window._adminReviews);}
                else{r.text().then(function(t){alert('Error: '+t)});}
              }).catch(function(e){alert('Fallo de red: '+(e.message||e));});
          });
        });
      }
      fetch('/.netlify/functions/get-reviews').then(function(r){return r.json()}).then(function(all){
        var list=all[SLUG]||[];
        var wrap=document.getElementById('adm-reviews-wrap');
        wrap.innerHTML='<p style="font-size:.85rem;font-weight:600;color:#4c1d95;margin-bottom:.5rem">Reseñas ('+list.length+')</p><div id="adm-rv-list" style="display:flex;flex-direction:column;gap:.5rem"></div>';
        window._adminReviews=list;
        window._allReviews=all;
        renderAdmReviews(list);
      }).catch(function(){
        document.getElementById('adm-reviews-wrap').innerHTML='<p style="font-size:.85rem;color:#dc2626">Error cargando reseñas.</p>';
      });
    }
  })();
  </script>
</div>
<footer>
  <p>© 2025 Roblox Vault. Todos los derechos reservados. &nbsp;|&nbsp; <a href="/privacidad">Privacidad</a> &nbsp;|&nbsp; <a href="/terminos">Términos</a> &nbsp;|&nbsp; <a href="/contacto">Contacto</a></p>
  <p style="margin-top:0.5rem;font-size:0.75rem;color:#a7f3d0;">Roblox Vault no está afiliado con Roblox Corporation.</p>
</footer>
</body>
</html>`;
}

function renderStaticPage(slug, titleText, bodyHtml) {
  const canonical = `${baseUrl}${slug}`;
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(titleText)} - Roblox Vault</title>
<link rel="canonical" href="${canonical}">
<meta name="robots" content="index, follow">
<meta name="google-adsense-account" content="ca-pub-3048023598545728">
<script>
  (function(){
    if(window.navigator.webdriver || /bot|crawler|spider|headless/i.test(window.navigator.userAgent)) return;
    let adsLoaded = false;
    const loadAds = function() {
      if(adsLoaded) return; adsLoaded = true;
      const script = document.createElement('script');
      script.async = true; script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3048023598545728";
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
    };
    window.addEventListener('scroll', loadAds, {once:true, passive:true});
    window.addEventListener('mousemove', loadAds, {once:true, passive:true});
    window.addEventListener('touchstart', loadAds, {once:true, passive:true});
    setTimeout(loadAds, 6000);
  })();
</script>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8f9fa; color: #1a1a1a; line-height: 1.6; }
  a { color: #2ecc71; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .header { background: linear-gradient(to right, #fff, #f4fbf6, #fff); border-bottom: 1px solid #e5e7eb; }
  .header-inner { max-width: 1152px; margin: 0 auto; padding: 0 1rem; display: flex; align-items: center; justify-content: space-between; height: 5rem; }
  .logo { font-size: 1.875rem; font-weight: 800; background: linear-gradient(to right, #15803d, #0d9488); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  nav a { font-size: 0.875rem; color: #374151; margin-left: 2rem; }
  nav a:hover { color: #0d9488; }
  .container { max-width: 768px; margin: 0 auto; padding: 2rem 1rem 4rem; }
  h1 { font-size: 2rem; font-weight: 800; color: #14532d; margin: 1rem 0 1.5rem; }
  h2 { font-size: 1.25rem; font-weight: 600; color: #14532d; margin: 1.5rem 0 0.5rem; }
  p { margin-bottom: 1rem; color: #374151; }
  ul { padding-left: 1.5rem; margin-bottom: 1rem; color: #374151; }
  li { margin-bottom: 0.25rem; }
  footer { background: linear-gradient(to right, #14532d, #0d4f49); color: #fff; text-align: center; padding: 2rem 1rem; font-size: 0.875rem; margin-top: 3rem; }
  footer a { color: #6ee7b7; }
  @media (max-width: 640px) { nav { display: none; } }
</style>
</head>
<body>
<header class="header">
  <div class="header-inner">
    <a href="/" class="logo">Roblox Vault</a>
    <nav>
      <a href="/privacidad">Privacidad</a>
      <a href="/contacto">Contacto</a>
      <a href="/sobre">Sobre</a>
      <a href="/terminos">Términos</a>
    </nav>
  </div>
</header>
<div class="container">
  <a href="/" style="font-size:0.875rem;color:#2ecc71;">← Volver al inicio</a>
  ${bodyHtml}
</div>
<footer>
  <p>© 2025 Roblox Vault. Todos los derechos reservados. &nbsp;|&nbsp; <a href="/privacidad">Privacidad</a> &nbsp;|&nbsp; <a href="/terminos">Términos</a> &nbsp;|&nbsp; <a href="/contacto">Contacto</a></p>
</footer>
</body>
</html>`;
}

const staticPages = {
  privacidad: {
    title: 'Política de Privacidad',
    body: `<h1>Política de Privacidad</h1>
<p>En Roblox Vault valoramos y respetamos la privacidad de nuestros usuarios. Esta Política de Privacidad describe cómo se recopila, utiliza y protege la información cuando visitas nuestro sitio web.</p>
<h2>Información que recopilamos</h2>
<p>No recopilamos información personal sensible de forma directa. Sin embargo, podemos recopilar información no personal como:</p>
<ul><li>Dirección IP (anonimizada)</li><li>Tipo de navegador</li><li>Páginas visitadas</li><li>Tiempo de permanencia en el sitio</li></ul>
<p>Esta información se utiliza únicamente con fines estadísticos y de mejora del contenido.</p>
<h2>Uso de cookies</h2>
<p>Este sitio utiliza cookies para mejorar la experiencia del usuario y mostrar anuncios relevantes.</p>
<p><strong>Google AdSense:</strong> Google es un proveedor externo que utiliza cookies, incluida la cookie de DoubleClick, para mostrar anuncios a los usuarios según sus visitas a este y otros sitios web.</p>
<p>Los usuarios pueden gestionar o desactivar las cookies desde la configuración de su navegador.</p>
<h2>Consentimiento</h2>
<p>Al utilizar este sitio web, aceptas esta Política de Privacidad.</p>
<h2>Responsable del sitio</h2>
<p>Nombre del sitio: Roblox Vault</p>
<p>Correo de contacto: <a href="mailto:rbloxvault@gmail.com">rbloxvault@gmail.com</a></p>`
  },
  contacto: {
    title: 'Contacto',
    body: `<h1>Contacto</h1>
<p>Para soporte, consultas o solicitudes de contenido, puedes escribirnos a:</p>
<p>📧 <a href="mailto:rbloxvault@gmail.com">rbloxvault@gmail.com</a></p>
<p>Indica en tu mensaje el artículo o categoría relacionada para una mejor atención.</p>`
  },
  sobre: {
    title: 'Sobre Roblox Vault',
    body: `<h1>Sobre Roblox Vault</h1>
<p>Roblox Vault publica guías y artículos informativos sobre Roblox y juegos relacionados, con enfoque en seguridad, buenas prácticas y experiencia del usuario.</p>
<p>Este sitio no está afiliado, patrocinado ni aprobado por Roblox Corporation. Roblox es una marca registrada de Roblox Corporation.</p>
<p>El contenido se actualiza periódicamente con el objetivo de aportar valor a la comunidad de jugadores.</p>`
  },
  terminos: {
    title: 'Términos y Condiciones',
    body: `<h1>Términos y Condiciones</h1>
<p>Al acceder a Roblox Vault, aceptas cumplir con los siguientes términos y condiciones:</p>
<h2>Uso del contenido</h2>
<p>Todo el contenido publicado en este sitio es únicamente informativo y educativo. No garantizamos resultados específicos al aplicar las guías o recomendaciones.</p>
<h2>Propiedad intelectual</h2>
<p>Los textos, guías y artículos publicados son propiedad de Roblox Vault, salvo que se indique lo contrario. No está permitida la reproducción total o parcial sin autorización.</p>
<h2>Responsabilidad</h2>
<p>Roblox Vault no se hace responsable por daños o pérdidas derivadas del uso de la información publicada en el sitio.</p>
<h2>Cambios</h2>
<p>Nos reservamos el derecho de modificar estos términos en cualquier momento.</p>`
  }
};

async function main() {
  const gistArticles = await readArticlesGist();
  const jsonArticles = readArticlesJson();
  const html = readIndex();
  const embedded = extractArticles(html);
  const articles = Array.isArray(gistArticles) && gistArticles.length ? gistArticles : (Array.isArray(jsonArticles) && jsonArticles.length ? jsonArticles : embedded);
  const dirRoot = __dirname;
  const exclude = new Set([]);
  const now = new Date().toISOString();
  const urls = [];

  // Generate static article pages
  let generated = 0;
  let skipped = 0;
  (articles || []).forEach(a => {
    const slug = (a.slug && a.slug.trim()) ? a.slug : slugify(a.title);
    if (!slug || exclude.has(slug)) { skipped++; return; }
    const lm = a.created_at || now;
    urls.push({ loc: `${baseUrl}${slug}`, lastmod: lm });

    const dir = path.join(dirRoot, slug);
    try {
      fs.mkdirSync(dir, { recursive: true });
      const pageHtml = renderArticlePage(a);
      fs.writeFileSync(path.join(dir, 'index.html'), pageHtml, 'utf8');
      generated++;
      
      // Generate redirects for old slugs
      if (Array.isArray(a.old_slugs)) {
        a.old_slugs.forEach(oldSlug => {
          if (!oldSlug || oldSlug === slug) return;
          const oldDir = path.join(dirRoot, oldSlug);
          try {
            fs.mkdirSync(oldDir, { recursive: true });
            const redirectHtml = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="0; url=/${slug}">
<link rel="canonical" href="${baseUrl}${slug}">
<title>Redirigiendo... - Roblox Vault</title>
</head>
<body>
<p>Este artículo ha sido movido. Si no eres redirigido, <a href="/${slug}">haz clic aquí</a>.</p>
</body>
</html>`;
            fs.writeFileSync(path.join(oldDir, 'index.html'), redirectHtml, 'utf8');
          } catch (err) {
            console.error(`Error generating redirect for old slug ${oldSlug}:`, err.message);
          }
        });
      }
    } catch (err) {
      console.error(`Error generating page for ${slug}:`, err.message);
    }
  });
  console.log(`Generated ${generated} article pages (${skipped} excluded).`);

  // Generate static pages (privacidad, contacto, sobre, terminos)
  Object.entries(staticPages).forEach(([slug, { title, body }]) => {
    const dir = path.join(dirRoot, slug);
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'index.html'), renderStaticPage(slug, title, body), 'utf8');
      console.log(`Generated static page: ${slug}`);
    } catch (err) {
      console.error(`Error generating ${slug}:`, err.message);
    }
  });

  // Build sitemap
  const baseNow = now;
  const staticPageSlugs = ['', 'privacidad', 'contacto', 'sobre', 'terminos'];
  staticPageSlugs.forEach(p => {
    const loc = p ? `${baseUrl}${p}` : `${baseUrl}`;
    urls.unshift({ loc, lastmod: baseNow });
  });
  const cats = Array.from(new Set((articles || []).map(a => a && a.category).filter(Boolean)));
  cats.forEach(c => {
    const enc = encodeURIComponent(c);
    urls.push({ loc: `${baseUrl}cat/${enc}`, lastmod: baseNow });
  });
  const extras = readExtraUrls();
  extras.forEach(u => urls.push({ loc: u, lastmod: baseNow }));
  const xml = buildSitemap(urls);
  fs.writeFileSync(path.join(dirRoot, 'sitemap.xml'), xml, 'utf8');
  console.log(`Generated sitemap.xml with ${urls.length} URLs.`);

  // Inject prerendered links into index.html for SEO / non-SPA fallback
  try {
    const indexPath = path.join(dirRoot, 'index.html');
    if (fs.existsSync(indexPath)) {
      let indexContent = fs.readFileSync(indexPath, 'utf8');
      const prerenderedHtml = (articles || []).map(a => {
        const slug = (a.slug && a.slug.trim()) ? a.slug : slugify(a.title);
        if (!slug || exclude.has(slug)) return '';
        return `<div><a href="/${slug}" style="font-size:1.2rem;font-weight:bold;color:#10b981;">${escapeHtml(a.title)}</a><p>${escapeHtml(a.excerpt)}</p></div>`;
      }).join('\\n<hr style="margin:1rem 0;border:none;border-top:1px solid #e5e7eb;">\\n');
      
      const newNoscript = `<div id="noscript-articles">\\n${prerenderedHtml}\\n</div>`;
      indexContent = indexContent.replace(/<div id="noscript-articles">[\s\S]*?<\/div>/, newNoscript);
      fs.writeFileSync(indexPath, indexContent, 'utf8');
      console.log('Injected pre-rendered HTML links into index.html for SEO bots');
    }
  } catch (err) {
    console.error('Error updating index.html noscript block:', err.message);
  }
}
main();
