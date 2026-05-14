import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { Resend } from 'resend';
import { config as dotenvConfig } from 'dotenv';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';

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
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
let supabaseAdmin = null;
try {
  supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) : null;
} catch (e) {
  console.error('supabaseAdmin init error:', e?.message || e);
}

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const resend = new Resend(RESEND_API_KEY);
const pendingVerifications = new Map();
setInterval(() => {
  if (supabase) {
    supabase.from('pending_verifications').delete().lt('expires', Date.now()).then(() => {}).catch(() => {});
  }
}, 300000);

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
        const parsed = JSON.parse(body);
        console.log('send-verification body:', JSON.stringify(parsed));
        const { email, name, password, documento, telefono, direccion, ciudad, tipo, nombre_usuario, barrio, fecha_nacimiento, nombre_farmacia, nit, responsable_nombre, responsable_documento } = parsed;
        const missing = [];
        if (!email) missing.push('email');
        if (!name) missing.push('name');
        if (!password) missing.push('password');
        if (missing.length) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Faltan campos obligatorios: ' + missing.join(', ') }));
          return;
        }
        const token = crypto.randomUUID();
        let saved = false;
        if (supabase) {
          const fullInsert = {
            token,
            email, name, password,
            documento: documento || '', telefono: telefono || '',
            direccion: direccion || '', ciudad: ciudad || '',
            tipo: tipo || 'auth',
            nombre_usuario: nombre_usuario || '',
            barrio: barrio || '',
            fecha_nacimiento: fecha_nacimiento || '',
            nombre_farmacia: nombre_farmacia || '',
            nit: nit || '',
            responsable_nombre: responsable_nombre || '',
            responsable_documento: responsable_documento || '',
            expires: Date.now() + 900000
          };
          let { error: insErr } = await supabase.from('pending_verifications').insert(fullInsert);
          if (insErr && insErr.message && insErr.message.includes('column') && insErr.message.includes('schema cache')) {
            const optional = ['documento', 'telefono', 'direccion', 'ciudad', 'tipo'];
            for (let i = optional.length; i >= 0; i--) {
              const cols = ['token', 'email', 'name', 'password', ...optional.slice(0, i), 'expires'];
              if (cols.length <= 4) break;
              const attempt = {};
              for (const c of cols) {
                if (c === 'token') attempt.token = token;
                else if (c === 'email') attempt.email = email;
                else if (c === 'name') attempt.name = name;
                else if (c === 'password') attempt.password = password;
                else if (c === 'expires') attempt.expires = Date.now() + 900000;
                else if (c === 'tipo') attempt.tipo = tipo || 'auth';
                else if (c === 'documento') attempt.documento = documento || '';
                else if (c === 'telefono') attempt.telefono = telefono || '';
                else if (c === 'direccion') attempt.direccion = direccion || '';
                else if (c === 'ciudad') attempt.ciudad = ciudad || '';
              }
              if (cols.length <= 4) break;
              const { error: attemptErr } = await supabase.from('pending_verifications').insert(attempt);
              if (!attemptErr) { saved = true; break; }
            }
            if (!saved) console.log('DB insert falló con todas las combinaciones');
          } else if (!insErr) {
            saved = true;
          } else {
            console.log('DB insert falló:', insErr.message);
          }
        }
        if (!saved) {
          pendingVerifications.set(token, {
            email, name, password,
            documento: documento || '', telefono: telefono || '',
            direccion: direccion || '', ciudad: ciudad || '',
            tipo: tipo || 'auth',
            nombre_usuario: nombre_usuario || '',
            barrio: barrio || '',
            fecha_nacimiento: fecha_nacimiento || '',
            nombre_farmacia: nombre_farmacia || '',
            nit: nit || '',
            responsable_nombre: responsable_nombre || '',
            responsable_documento: responsable_documento || '',
            expires: Date.now() + 900000
          });
        }
        const domain = req.headers['x-forwarded-host'] || req.headers['host'] || 'localhost:8080';
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const verificationLink = `${protocol}://${domain}/verificar?token=${token}&email=${encodeURIComponent(email)}`;
        const { data, error } = await resend.emails.send({
          from: 'FarmaciaApp <no-reply@farmacia-app.site>',
          to: [email],
          subject: 'Verifica tu correo - FarmaciaApp',
          template: {
            id: 'fbacd73d-3eb5-4fc4-ae2e-3d8528af6415',
            variables: {
              name,
              verificationLink,
            },
          },
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

  if (req.url === '/api/confirmar-verificacion' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { email, token } = JSON.parse(body);
        let pending = null;
        if (supabase) {
          const { data: rows } = await supabase
            .from('pending_verifications')
            .select('*')
            .eq('token', token)
            .eq('email', email);
          if (rows && rows.length > 0) pending = rows[0];
        }
        if (!pending) {
          pending = pendingVerifications.get(token);
          if (pending && pending.email !== email) pending = null;
        }
        if (!pending) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Enlace inválido' }));
          return;
        }
        if (Date.now() > pending.expires) {
          if (supabase) supabase.from('pending_verifications').delete().eq('token', token).then(() => {}).catch(() => {});
          pendingVerifications.delete(token);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'El enlace ha expirado' }));
          return;
        }
        if (supabase) supabase.from('pending_verifications').delete().eq('token', token).then(() => {}).catch(() => {});
        pendingVerifications.delete(token);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: {
          email: pending.email, name: pending.name, password: pending.password,
          documento: pending.documento, telefono: pending.telefono,
          direccion: pending.direccion, ciudad: pending.ciudad,
          tipo: pending.tipo, nombre_usuario: pending.nombre_usuario,
          barrio: pending.barrio, fecha_nacimiento: pending.fecha_nacimiento,
          nombre_farmacia: pending.nombre_farmacia, nit: pending.nit,
          responsable_nombre: pending.responsable_nombre, responsable_documento: pending.responsable_documento
        } }));
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
        const domain = req.headers['x-forwarded-host'] || req.headers['host'] || 'farmacia-app.site';
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const siteUrl = `${protocol}://${domain}`;
        const mpBody = {
          items: items.map((item) => ({
            title: item.title,
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            currency_id: 'COP',
          })),
          payer: { email: payer?.email || 'comprador@email.com' },
          external_reference,
          back_urls: {
            success: `${siteUrl}/ok`,
            failure: `${siteUrl}/no`,
            pending: `${siteUrl}/esp`,
          },
          auto_return: 'approved',
          notification_url: `${siteUrl}/api/mercadopago-webhook`,
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

  if (req.url === '/api/create-card-payment' && req.method === 'POST') {
    if (!MERCADOPAGO_ACCESS_TOKEN) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Mercado Pago no configurado' }));
      return;
    }
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { token, transaction_amount, description, payer_email, installments } = JSON.parse(body);
        const payBody = {
          token,
          transaction_amount: Number(transaction_amount),
          description: description || 'Compra FarmaciaApp',
          installments: installments || 1,
          payer: { email: payer_email || 'comprador@email.com' },
        };
        const idempotencyKey = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const payResp = await fetch('https://api.mercadopago.com/v1/payments', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify(payBody),
        });
        const payData = await payResp.json();
        if (!payResp.ok) {
          console.error('MP payment error:', JSON.stringify(payData));
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: payData?.message || payData?.cause?.[0]?.description || JSON.stringify(payData) }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          id: payData.id,
          status: payData.status,
          status_detail: payData.status_detail,
        }));
      } catch (err) {
        console.error('Error creando pago MP:', err?.message || err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err?.message || err?.toString() || 'Error interno' }));
      }
    });
    return;
  }

  if (req.url === '/api/crear-usuario' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { email, password, userData } = JSON.parse(body);
        if (!supabaseAdmin) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'supabaseAdmin no disponible - falta SUPABASE_SERVICE_ROLE_KEY' }));
          return;
        }
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: userData || {},
        });
        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes('already registered') || msg.includes('user already')) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, alreadyExists: true }));
          } else {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
          }
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, user: data.user }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err?.message || 'Error interno' }));
      }
    });
    return;
  }

  if (req.url === '/api/eliminar-usuario' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { userId } = JSON.parse(body);
        if (!userId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Falta userId' }));
          return;
        }
        if (!supabaseAdmin) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'supabaseAdmin no disponible - falta SUPABASE_SERVICE_ROLE_KEY' }));
          return;
        }
        await supabaseAdmin.auth.admin.deleteUser(userId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err?.message || 'Error interno' }));
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

    let headers = { 'Content-Type': contentType };

    if (filePath.endsWith('index.html')) {
      headers['Cache-Control'] = 'private, no-cache, no-store, must-revalidate';
      headers['Pragma'] = 'no-cache';
      headers['Expires'] = '0';
      headers['Vary'] = 'Cookie, Authorization, Accept-Encoding';

      const encoded = Buffer.from(JSON.stringify({
        VITE_SUPABASE_URL: SUPABASE_URL,
        VITE_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
        VITE_MERCADOPAGO_PUBLIC_KEY: process.env.VITE_MERCADOPAGO_PUBLIC_KEY || '',
      })).toString('base64');
      const envScript = '<script>window.__ENV__=JSON.parse(atob("' + encoded + '"))</script>';
      body = body.replace('</head>', envScript + '</head>');
    } else {
      headers['Cache-Control'] = 'max-age=31536000, immutable';
    }

    res.writeHead(200, headers);
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
