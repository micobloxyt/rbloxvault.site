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

exports.handler = async () => {
  const token = process.env.GITHUB_TOKEN || '';
  const gistId = process.env.GIST_ID || '';
  const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json', 'User-Agent': 'netlify-function' };

  try {
    const res = await httpsGet(`https://api.github.com/gists/${gistId}`, headers);
    if (res.status !== 200) throw new Error('Gist fetch failed');
    const data = JSON.parse(res.body);
    const file = data.files && data.files['articles-data.json'];
    const articles = file && file.content ? JSON.parse(file.content) : [];
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(Array.isArray(articles) ? articles : [])
    };
  } catch (e) {
    return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: '[]' };
  }
};
