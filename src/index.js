// Zara's Little Library — family invitation API.
// A family's invitation URL acts as its shared access key. Share links privately.
const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
const error = (message, status = 400) => json({ error: message }, status);
const validCode = code => typeof code === 'string' && /^[A-Za-z0-9_-]{8,128}$/.test(code);
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f-]{27,40}$/i.test(value);
const cleanName = value => typeof value === 'string' ? value.trim().slice(0, 60) : '';
const validCompanion = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(value);
const iso = () => new Date().toISOString();

async function family(env, code) {
  if (!validCode(code)) return null;
  return env.DB.prepare('SELECT FamilyID, FamilyName FROM Families WHERE InvitationCode = ? AND IsActive = 1').bind(code).first();
}
async function readBody(request) {
  if (!(request.headers.get('content-type') || '').includes('application/json')) throw new Error('Expected JSON body');
  if (Number(request.headers.get('content-length') || 0) > 12000) throw new Error('Request too large');
  return request.json();
}
function responseWithReferrerPolicy(response) {
  const h = new Headers(response.headers);
  h.set('Referrer-Policy', 'no-referrer');
  h.set('Cache-Control', 'no-store');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: h });
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path === '/api/health') {
      if (request.method !== 'GET') return error('Method not allowed', 405);
      try { await env.DB.prepare('SELECT 1 AS ok').first(); return json({ status: 'ok', database: 'connected' }); }
      catch (_) { return json({ status: 'unavailable', database: 'not connected' }, 503); }
    }
    // Family data is accessible only by presenting that family's private invitation code.
    const match = path.match(/^\/api\/families\/([A-Za-z0-9_-]+)(?:\/(readers|history))?\/?$/);
    if (match) {
      const code = match[1], resource = match[2];
      if (!validCode(code)) return error('Invalid invitation', 404);
      try {
        const f = await family(env, code);
        if (!f) return error('Invitation not found', 404);
        if (!resource && request.method === 'GET') return json({ family: f });
        if (resource === 'readers' && request.method === 'GET') {
          const result = await env.DB.prepare('SELECT ReaderID, DisplayName, CompanionID, CreatedAt, UpdatedAt FROM Readers WHERE FamilyID = ? ORDER BY CreatedAt').bind(f.FamilyID).all();
          return json({ family: f, readers: result.results || [] });
        }
        if (resource === 'readers' && request.method === 'POST') {
          const body = await readBody(request);
          const name = cleanName(body.displayName);
          if (!name || !validCompanion(body.companionId)) return error('A name and companion are required');
          const id = uuid(body.readerId) ? body.readerId : crypto.randomUUID();
          const now = iso();
          // Ignore duplicate retries for the same ID; never transfer an existing ID to another family.
          await env.DB.prepare('INSERT OR IGNORE INTO Readers (ReaderID, DisplayName, CompanionID, CreatedAt, UpdatedAt, FamilyID) VALUES (?, ?, ?, ?, ?, ?)').bind(id, name, body.companionId, now, now, f.FamilyID).run();
          const reader = await env.DB.prepare('SELECT ReaderID, DisplayName, CompanionID, CreatedAt, UpdatedAt FROM Readers WHERE ReaderID = ? AND FamilyID = ?').bind(id, f.FamilyID).first();
          return reader ? json({ reader }, 201) : error('Reader ID already exists', 409);
        }
        if (resource === 'readers' && request.method === 'PATCH') {
          const body = await readBody(request);
          if (!uuid(body.readerId)) return error('Invalid reader ID');
          const name = cleanName(body.displayName);
          if (!name || !validCompanion(body.companionId)) return error('A name and companion are required');
          const result = await env.DB.prepare('UPDATE Readers SET DisplayName = ?, CompanionID = ?, UpdatedAt = ? WHERE ReaderID = ? AND FamilyID = ?').bind(name, body.companionId, iso(), body.readerId, f.FamilyID).run();
          if (!result.meta?.changes) return error('Reader not found', 404);
          return json({ ok: true });
        }
        if (resource === 'history' && request.method === 'GET') {
          const result = await env.DB.prepare('SELECT h.ReadingID, h.ReaderID, h.BookID, h.CompletedAt FROM ReadingHistory h JOIN Readers r ON r.ReaderID = h.ReaderID WHERE r.FamilyID = ? ORDER BY h.CompletedAt DESC LIMIT 1000').bind(f.FamilyID).all();
          return json({ history: result.results || [] });
        }
        if (resource === 'history' && request.method === 'POST') {
          const body = await readBody(request);
          if (!uuid(body.readerId) || typeof body.bookId !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(body.bookId)) return error('Invalid completion');
          const belongs = await env.DB.prepare('SELECT ReaderID FROM Readers WHERE ReaderID = ? AND FamilyID = ?').bind(body.readerId, f.FamilyID).first();
          if (!belongs) return error('Reader not found', 404);
          const id = uuid(body.readingId) ? body.readingId : crypto.randomUUID();
          // Existing Books rows must contain the BookID if ReadingHistory has a foreign key.
          await env.DB.prepare('INSERT OR IGNORE INTO ReadingHistory (ReadingID, ReaderID, BookID, CompletedAt) VALUES (?, ?, ?, ?)').bind(id, body.readerId, body.bookId, iso()).run();
          return json({ readingId: id }, 201);
        }
        return error('Method not allowed', 405);
      } catch (e) {
        if (e instanceof SyntaxError || /Expected JSON|Request too large/.test(e.message)) return error('Invalid request body');
        console.error('Family API error', e);
        return error('Database request failed', 500);
      }
    }
    if (path.startsWith('/api/')) return error('API endpoint not found', 404);
    // A deep link to /invite/CODE should load the same website as the homepage.
    if (/^\/invite\/[A-Za-z0-9_-]+\/?$/.test(path)) {
      const homepage = new URL('/', url);
      const assetRequest = new Request(homepage, request);
      return responseWithReferrerPolicy(await env.ASSETS.fetch(assetRequest));
    }
    return env.ASSETS.fetch(request);
  }
};
