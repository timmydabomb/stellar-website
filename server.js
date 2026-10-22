import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

try {
  const envContents = await fs.readFile(path.join(__dirname, '.env'), 'utf8');
  for (const line of envContents.split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^"|"$/g, '');
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '127.0.0.1';
const adminPassword = process.env.ADMIN_PASSWORD || '';
if (adminPassword.length < 16) {
  throw new Error('Set ADMIN_PASSWORD to a password at least 16 characters long before starting the server.');
}

const root = __dirname;
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(root, 'data');
const dataFile = path.join(dataDir, 'inquiries.json');
const sessions = new Map();
const failedLogins = new Map();
let inquiries = [];
let persistQueue = Promise.resolve();
const allowedInterests = new Set([
  'Water Treatment',
  'Nanobubble Pool Technology',
  'Scent Diffuser Systems',
  'Something else',
]);
const staticFiles = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/script.js', ['script.js', 'text/javascript; charset=utf-8']],
  ['/admin', ['admin.html', 'text/html; charset=utf-8']],
  ['/admin.html', ['admin.html', 'text/html; charset=utf-8']],
  ['/admin.css', ['admin.css', 'text/css; charset=utf-8']],
  ['/admin.js', ['admin.js', 'text/javascript; charset=utf-8']],
  ['/assets/pool-hero.png', ['assets/pool-hero.png', 'image/png']],
]);

await fs.mkdir(dataDir, { recursive: true });
try {
  inquiries = JSON.parse(await fs.readFile(dataFile, 'utf8'));
  if (!Array.isArray(inquiries)) throw new Error('Expected an array in data/inquiries.json');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  await fs.writeFile(dataFile, '[]\n', { mode: 0o600 });
}

function sendJson(response, status, payload, headers = {}) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  response.end(JSON.stringify(payload));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > 20_000) {
        reject(Object.assign(new Error('Request is too large.'), { status: 413 }));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(Object.assign(new Error('Please submit valid form data.'), { status: 400 }));
      }
    });
    request.on('error', reject);
  });
}

function getCookie(request, name) {
  const cookie = request.headers.cookie || '';
  const match = cookie.split(';').map((value) => value.trim()).find((value) => value.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : '';
}

function isAdmin(request) {
  const token = getCookie(request, 'sts_admin');
  const expiresAt = sessions.get(token);
  if (!expiresAt || expiresAt < Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function passwordMatches(candidate) {
  const expected = crypto.createHash('sha256').update(adminPassword).digest();
  const actual = crypto.createHash('sha256').update(String(candidate || '')).digest();
  return crypto.timingSafeEqual(expected, actual);
}

function cleanText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function persistInquiries() {
  const snapshot = `${JSON.stringify(inquiries, null, 2)}\n`;
  persistQueue = persistQueue.then(async () => {
    const temporary = `${dataFile}.tmp`;
    await fs.writeFile(temporary, snapshot, { mode: 0o600 });
    await fs.rename(temporary, dataFile);
  });
  return persistQueue;
}

const server = http.createServer(async (request, response) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https://images.unsplash.com; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'");

  let pathname;
  try {
    pathname = new URL(request.url, `http://${request.headers.host || 'localhost'}`).pathname;
  } catch {
    sendJson(response, 400, { error: 'Invalid request.' });
    return;
  }

  if (request.method === 'POST' && pathname === '/api/inquiries') {
    try {
      const body = await readJson(request);
      if (cleanText(body.website, 200)) {
        sendJson(response, 201, { ok: true });
        return;
      }
      const name = cleanText(body.name, 100);
      const email = cleanText(body.email, 254).toLowerCase();
      const interest = cleanText(body.interest, 80);
      const message = cleanText(body.message, 3000);
      if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !allowedInterests.has(interest) || message.length < 5) {
        sendJson(response, 400, { error: 'Please check your details and try again.' });
        return;
      }

      const inquiry = {
        id: crypto.randomUUID(),
        submittedAt: new Date().toISOString(),
        name,
        email,
        interest,
        message,
      };
      inquiries.push(inquiry);
      try {
        await persistInquiries();
      } catch (error) {
        inquiries = inquiries.filter((entry) => entry.id !== inquiry.id);
        console.error('Could not save an inquiry:', error.message);
        sendJson(response, 500, { error: 'We could not save your inquiry. Please try again later.' });
        return;
      }
      sendJson(response, 201, { ok: true });
    } catch (error) {
      sendJson(response, error.status || 400, { error: error.message || 'Please try again.' });
    }
    return;
  }

  if (request.method === 'POST' && pathname === '/api/admin/login') {
    const clientIp = request.socket.remoteAddress || 'unknown';
    const attempt = failedLogins.get(clientIp);
    if (attempt && attempt.resetAt > Date.now() && attempt.count >= 5) {
      sendJson(response, 429, { error: 'Too many attempts. Please wait 15 minutes and try again.' });
      return;
    }
    try {
      const body = await readJson(request);
      if (!passwordMatches(body.password)) {
        const next = attempt && attempt.resetAt > Date.now() ? attempt : { count: 0, resetAt: Date.now() + 15 * 60 * 1000 };
        next.count += 1;
        failedLogins.set(clientIp, next);
        sendJson(response, 401, { error: 'That password was not accepted.' });
        return;
      }
      failedLogins.delete(clientIp);
      const token = crypto.randomBytes(32).toString('base64url');
      sessions.set(token, Date.now() + 60 * 60 * 1000);
      const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
      sendJson(response, 200, { ok: true }, {
        'Set-Cookie': `sts_admin=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600${secure}`,
      });
    } catch (error) {
      sendJson(response, error.status || 400, { error: error.message || 'Please try again.' });
    }
    return;
  }

  if (pathname === '/api/admin/session' && request.method === 'GET') {
    sendJson(response, 200, { authenticated: isAdmin(request) });
    return;
  }

  if (pathname === '/api/admin/logout' && request.method === 'POST') {
    sessions.delete(getCookie(request, 'sts_admin'));
    sendJson(response, 200, { ok: true }, { 'Set-Cookie': 'sts_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
    return;
  }

  if (pathname === '/api/admin/inquiries' && request.method === 'GET') {
    if (!isAdmin(request)) {
      sendJson(response, 401, { error: 'Please sign in again.' });
      return;
    }
    sendJson(response, 200, { inquiries: [...inquiries].reverse() });
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    sendJson(response, 404, { error: 'Not found.' });
    return;
  }

  const asset = staticFiles.get(pathname);
  if (!asset) {
    sendJson(response, 404, { error: 'Not found.' });
    return;
  }
  try {
    const content = await fs.readFile(path.join(root, asset[0]));
    response.writeHead(200, { 'Content-Type': asset[1], 'Cache-Control': 'no-cache' });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch {
    sendJson(response, 404, { error: 'Not found.' });
  }
});

server.listen(port, host, () => {
  console.log(`Stellar site running at http://${host}:${port}`);
  console.log(`Submissions dashboard: http://${host}:${port}/admin`);
  console.log(`Submissions are stored in ${dataFile}`);
});
