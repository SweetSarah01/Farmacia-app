import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Resend } from 'resend';
import { config as dotenvConfig } from 'dotenv';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

dotenvConfig({ path: '.env.local' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, 'dist');
const PORT = parseInt(process.env.PORT || process.env.RAILWAY_PORT || '8080', 10);

console.log('Starting server...');
console.log('PORT:', PORT);
console.log('distDir:', distDir);
console.log('distDir exists:', fs.existsSync(distDir));

if (!fs.existsSync(distDir)) {
  console.error('ERROR: dist directory does not exist!');
  process.exit(1);
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const resend = new Resend(RESEND_API_KEY);
const verificationCodes = new Map();

const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || '';
let mpClient = null;
if (MERCADOPAGO_ACCESS_TOKEN && MERCADOPAGO_ACCESS_TOKEN !== 'APP_USR-XXXXXXXX-XXXXXXX-XXXXXX-XXXXXXXX') {
  const client = new MercadoPagoConfig({ accessToken: MERCADOPAGO_ACCESS_TOKEN });
  mpClient = { client, preference: new Preference(client) };
  console.log('Mercado Pago SDK initialized');
} else {
  console.log('Mercado Pago not configured (set MERCADOPAGO_ACCESS_TOKEN in .env.local)');
}

const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

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

  if (req.url === '/api/send-verification' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { email } = JSON.parse(body);
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        verificationCodes.set(email, { code, expires: Date.now() + 300000 });
        const { data, error } = await resend.emails.send({
          from: 'FarmaciaApp <no-reply@farmacia-app.site>',
          to: [email],
          subject: 'Verifica tu correo - FarmaciaApp',
          html: `<p>Tu código de verificación es: <strong>${code}</strong></p><p>Este código expira en 5 minutos.</p>`
        });
        if (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        }
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.url === '/api/verify-code' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { email, code } = JSON.parse(body);
        const stored = verificationCodes.get(email);
        if (!stored) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No se encontró código para este correo' }));
          return;
        }
        if (Date.now() > stored.expires) {
          verificationCodes.delete(email);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'El código ha expirado' }));
          return;
        }
        if (stored.code !== code) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Código incorrecto' }));
          return;
        }
        verificationCodes.delete(email);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.url === '/api/create-preference' && req.method === 'POST') {
    if (!MERCADOPAGO_ACCESS_TOKEN) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Mercado Pago no configurado' }));
      return;
    }
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { items, payer, external_reference } = JSON.parse(body);
        const mpBody = {
          items: items.map((item) => ({
            title: item.title,
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            currency_id: 'COP',
          })),
          payer: { email: payer?.email || 'comprador@email.com' },
          external_reference,
          auto_return: 'approved',
          notification_url: `${BASE_URL}/api/mercadopago-webhook`,
        };

        const mpResp = await fetch('https://api.mercadopago.com/checkout/preferences', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mpBody),
        });

        const mpData = await mpResp.json();

        if (!mpResp.ok) {
          console.error('MP API error:', JSON.stringify(mpData));
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: mpData?.message || mpData?.cause?.[0]?.description || JSON.stringify(mpData) }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ init_point: mpData.init_point, preference_id: mpData.id }));
      } catch (err) {
        console.error('Error creando preferencia MP:', err?.message || err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err?.message || err?.toString() || 'Error interno' }));
      }
    });
    return;
  }

  if (req.url === '/api/mercadopago-webhook' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('Mercado Pago webhook received:', data);
      } catch (e) {
        console.log('Mercado Pago webhook raw body:', body);
      }
      res.writeHead(200);
      res.end('OK');
    });
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
      const encoded = Buffer.from(JSON.stringify({ VITE_SUPABASE_URL: SUPABASE_URL, VITE_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY })).toString('base64');
      const envScript = '<script>window.__ENV__=JSON.parse(atob("' + encoded + '"))</script>';
      body = body.replace('</head>', envScript + '</head>');
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(body);
  });
});

server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Healthcheck available at: http://localhost:' + PORT + '/health');
});
