exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Método no permitido' };
    }
    const adminKey = process.env.ADMIN_KEY || "";
    const provided = event.headers['x-admin-key'] || event.headers['X-Admin-Key'] || "";
    if (!adminKey || !provided || provided !== adminKey) {
      return { statusCode: 401, body: 'No autorizado' };
    }
    const token = process.env.GITHUB_TOKEN || "";
    const gistId = process.env.GIST_ID || "";
    if (!token || !gistId) {
      return { statusCode: 500, body: 'Backend no configurado (GITHUB_TOKEN/GIST_ID)' };
    }
    let body;
    try {
      body = JSON.parse(event.body || '[]');
    } catch {
      return { statusCode: 400, body: 'JSON inválido' };
    }
    if (!Array.isArray(body)) {
      return { statusCode: 400, body: 'Se espera un arreglo de artículos' };
    }
    const content = JSON.stringify(body, null, 2);
    const resp = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'netlify-function'
      },
      body: JSON.stringify({
        files: {
          'articles-data.json': { content }
        }
      })
    });
    if (!resp.ok) {
      return { statusCode: resp.status, body: await resp.text() };
    }
    return { statusCode: 200, body: 'OK' };
  } catch (e) {
    return { statusCode: 500, body: String(e && e.message ? e.message : e) };
  }
};
