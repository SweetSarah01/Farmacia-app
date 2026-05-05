import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, 'dist');
const PORT = parseInt(process.env.PORT || '8080', 10);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }

  let filePath = path.join(distDir, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  let contentType = MIME[ext] || 'application/octet-stream';

  if (!fs.existsSync(filePath)) {
    filePath = path.join(distDir, 'index.html');
    contentType = 'text/html';
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end('Server Error');
      return;
    }

    let body = data.toString();

    if (filePath.endsWith('index.html')) {
      const escapedUrl = SUPABASE_URL.replace(/"/g, '\\"');
      const escapedKey = SUPABASE_ANON_KEY.replace(/"/g, '\\"').replace(/`/g, '\\`');
      const envScript = '<script>window.__ENV__={VITE_SUPABASE_URL:"' + escapedUrl + '",VITE_SUPABASE_ANON_KEY:"' + escapedKey + '"}</script>';
      body = body.replace('</head>', envScript + '</head>');
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(body);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
