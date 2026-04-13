const https = require('https');

function httpsGet(url, headers) {
  return new Promise((resolve, reject) => {
    const opts = new URL(url);
    https.get({ hostname: opts.hostname, path: opts.pathname + opts.search, headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

function httpsPatch(url, headers, payload) {
  return new Promise((resolve, reject) => {
    const opts = new URL(url);
    const body = JSON.stringify(payload);
    const req = https.request({
      hostname: opts.hostname,
      path: opts.pathname,
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método no permitido' };
  }

  const token = process.env.GITHUB_TOKEN || '';
  const gistId = process.env.GIST_ID || '';
  if (!token || !gistId) {
    return { statusCode: 500, body: 'Backend no configurado' };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, body: 'JSON inválido' }; }

  const { slug, review } = body;
  if (!slug || !review || !review.name || !review.text) {
    return { statusCode: 400, body: 'Faltan campos requeridos' };
  }

  const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json', 'User-Agent': 'netlify-function' };

  try {
    // Leer reseñas actuales
    const getRes = await httpsGet(`https://api.github.com/gists/${gistId}`, headers);
    const gistData = JSON.parse(getRes.body);
    const file = gistData.files && (gistData.files['reviews.json'] || gistData.files['reviews-data.json']);
    let currentReviews = {};
    if (file && file.content) {
      try { currentReviews = JSON.parse(file.content); } catch {}
    }

    // Agregar nueva reseña
    const safeReview = {
      name: String(review.name || '').slice(0, 100),
      text: String(review.text || '').slice(0, 1000),
      rating: Math.min(5, Math.max(0, Number(review.rating) || 0)),
      at: new Date().toISOString()
    };
    if (!Array.isArray(currentReviews[slug])) currentReviews[slug] = [];
    currentReviews[slug].unshift(safeReview);
    if (currentReviews[slug].length > 100) currentReviews[slug] = currentReviews[slug].slice(0, 100);

    // Guardar de vuelta al Gist
    const saveRes = await httpsPatch(
      `https://api.github.com/gists/${gistId}`,
      headers,
      { files: { 'reviews.json': { content: JSON.stringify(currentReviews, null, 2) } } }
    );

    if (saveRes.status !== 200) {
      return { statusCode: saveRes.status, body: saveRes.body };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: true, review: safeReview })
    };
  } catch (e) {
    return { statusCode: 500, body: String(e.message || e) };
  }
};
