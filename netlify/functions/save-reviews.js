const https = require('https');

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

  const adminKey = process.env.ADMIN_KEY || '';
  const provided = event.headers['x-admin-key'] || event.headers['X-Admin-Key'] || '';
  if (!adminKey || !provided || provided !== adminKey) {
    return { statusCode: 401, body: 'No autorizado' };
  }

  const token = process.env.GITHUB_TOKEN || '';
  const gistId = process.env.GIST_ID || '';
  if (!token || !gistId) {
    return { statusCode: 500, body: 'Backend no configurado (GITHUB_TOKEN/GIST_ID)' };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, body: 'JSON inválido' }; }

  if (typeof body !== 'object' || Array.isArray(body)) {
    return { statusCode: 400, body: 'Se espera un objeto de reseñas' };
  }

  const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json', 'User-Agent': 'netlify-function' };

  try {
    const res = await httpsPatch(
      `https://api.github.com/gists/${gistId}`,
      headers,
      { files: { 'reviews.json': { content: JSON.stringify(body, null, 2) } } }
    );
    if (res.status !== 200) return { statusCode: res.status, body: res.body };
    return { statusCode: 200, body: 'OK' };
  } catch (e) {
    return { statusCode: 500, body: String(e.message || e) };
  }
};
