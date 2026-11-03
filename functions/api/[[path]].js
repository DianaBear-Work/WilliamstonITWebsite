
const SESSION_COOKIE = "pelzer_it_admin";
const SESSION_SECONDS = 8 * 60 * 60;
const MAX_CONTENT_BYTES = 200_000;
const CONTENT_SCOPES = new Set(["equipment", "builds", "updates"]);
const MAX_ADMIN_USERS = 3;
const MIN_ADMIN_PASSWORD_LENGTH = 16;
const ADMIN_USER_ITERATIONS = 120_000;

function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers
    }
  });
}

function readCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  const cookie = header.split(";")
    .map(part => part.trim())
    .find(part => part.startsWith(`${name}=`));

  return cookie ? cookie.slice(name.length + 1) : "";
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  );

  return Array.from(new Uint8Array(signature), byte =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

async function verifySession(request, secret, env) {
  const token = readCookie(request, SESSION_COOKIE);
  const parts = token.split(".");

  if (parts.length === 2) {
    const [expiry, signature] = parts;
    if (!isValidExpiry(expiry)) return null;
    return await verifySignature(expiry, signature, secret)
      ? { username: "diana", isMaster: true }
      : null;
  }

  if (parts.length !== 4) return null;

  const [username, expiry, version, signature] = parts;
  const validVersion = /^[a-f0-9]{32}$/.test(version) ||
    (username === "diana" && version === "master");
  if (!/^[a-z0-9._-]{3,32}$/.test(username) ||
      !isValidExpiry(expiry) || !validVersion) return null;
  if (!await verifySignature(`${username}.${expiry}.${version}`, signature, secret)) {
    return null;
  }

  if (username === "diana" && version === "master") {
    return { username, isMaster: true };
  }

  if (!env.DB) return null;
  const user = await env.DB.prepare(
    "SELECT session_version FROM admin_users WHERE username = ?"
  ).bind(username).first();
  if (!user || String(user.session_version) !== version) return null;

  return { username, isMaster: false };
}

function isValidExpiry(expiry) {
  return /^\d{10}$/.test(expiry) &&
    Number(expiry) > Math.floor(Date.now() / 1000);
}

async function verifySignature(value, signature, secret) {
  const expected = await sign(value, secret);
  const a = new TextEncoder().encode(expected);
  const b = new TextEncoder().encode(signature);
  let difference = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) {
    difference |= a[i] ^ (b[i] || 0);
  }
  return difference === 0;
}

function bytesToHex(bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value) {
  return new Uint8Array(value.match(/.{2}/g).map(byte => parseInt(byte, 16)));
}

async function hashAdminPassword(password, salt) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const hash = await crypto.subtle.deriveBits({
    name: "PBKDF2",
    hash: "SHA-256",
    salt,
    iterations: ADMIN_USER_ITERATIONS
  }, key, 256);
  return bytesToHex(new Uint8Array(hash));
}

async function createSession(username, version, secret) {
  const expiry = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  const signature = await sign(`${username}.${expiry}.${version}`, secret);
  return `${username}.${expiry}.${version}.${signature}`;
}

async function passwordMatches(password, expected) {
  const submitted = new TextEncoder().encode(await sign(password, expected.secret));
  const stored = new TextEncoder().encode(await sign(expected.password, expected.secret));
  let difference = submitted.length ^ stored.length;
  for (let i = 0; i < stored.length; i++) {
    difference |= stored[i] ^ (submitted[i] || 0);
  }
  return difference === 0;
}

async function readJsonBody(request, maxBytes = 4096) {
  const declaredLength = Number(request.headers.get("Content-Length") || 0);
  if (declaredLength > maxBytes) return null;
  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).length > maxBytes) return null;
  try {
    const body = JSON.parse(rawBody);
    return body && typeof body === "object" && !Array.isArray(body)
      ? body
      : null;
  } catch {
    return null;
  }
}

function cookieHeader(value, maxAge) {
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

function requireSameOrigin(request) {
  const origin = request.headers.get("Origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

function isString(value, maxLength = 2000) {
  return typeof value === "string" && value.length <= maxLength;
}

function isEquipment(value) {
  return Array.isArray(value) &&
    value.length <= 500 &&
    value.every(item =>
      item &&
      (typeof item.id === "number" || isString(item.id, 100)) &&
      isString(item.name, 200) &&
      item.name.trim() !== "" &&
      isString(item.category, 100) &&
      (typeof item.quantity === "number" ||
        isString(item.quantity, 100)) &&
      isString(item.restockStatus, 200) &&
      isString(item.description, 2000) &&
      ["laptop", "accessory"].includes(item.requestType)
    );
}

function isBuilds(value) {
  return Array.isArray(value) &&
    value.length <= 500 &&
    value.every(build =>
      build &&
      isString(build.id, 200) &&
      build.id.trim() !== "" &&
      isString(build.laptopType, 200) &&
      build.laptopType.trim() !== "" &&
      ["building", "blocked", "ready", "complete"].includes(build.status) &&
      isString(build.stage, 200) &&
      isString(build.updated, 100) &&
      isString(build.notes, 4000) &&
      (build.completedAt === undefined ||
        isString(build.completedAt, 100)) &&
      Array.isArray(build.blockers) &&
      build.blockers.length <= 50 &&
      build.blockers.every(blocker => isString(blocker, 2000))
    );
}

function isValidContent(scope, content) {
  if (scope === "equipment") return isEquipment(content);
  if (scope === "builds") return isBuilds(content);
  return scope === "updates" && isString(content, 150_000);
}

async function getContent(scope, env) {
  const row = await env.DB.prepare(
    "SELECT content, updated_at FROM site_content WHERE scope = ?"
  ).bind(scope).first();

  if (!row) {
    return jsonResponse({ content: null, updatedAt: null });
  }

  return jsonResponse({
    content: JSON.parse(row.content),
    updatedAt: row.updated_at
  });
}

function validManagedUsername(username) {
  return typeof username === "string" &&
    /^[a-z0-9._-]{3,32}$/.test(username) &&
    username !== "diana";
}

function validManagedPassword(password) {
  return typeof password === "string" &&
    password.length >= MIN_ADMIN_PASSWORD_LENGTH &&
    password.length <= 256;
}

async function handleAdminUsers(request, env, pathname) {
  const usersPath = pathname === "/api/admin/users";
  const userMatch = pathname.match(
    /^\/api\/admin\/users\/([a-z0-9._-]+)(\/password)?$/
  );
  if (!usersPath && !userMatch) return null;

  if (
    typeof env.SESSION_SECRET !== "string" ||
    env.SESSION_SECRET.length < 32
  ) {
    return jsonResponse({ error: "Admin sessions are not configured." }, 503);
  }
  if (!env.DB) {
    return jsonResponse({ error: "The DB database binding is missing." }, 503);
  }

  const session = await verifySession(request, env.SESSION_SECRET, env);
  if (!session || !session.isMaster) {
    return jsonResponse({ error: "Only the master admin can manage accounts." }, 403);
  }

  if (usersPath && request.method === "GET") {
    const result = await env.DB.prepare(
      "SELECT username, display_name, created_at FROM admin_users ORDER BY username"
    ).all();
    return jsonResponse({ users: result.results });
  }

  if (!["POST", "DELETE"].includes(request.method)) {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }
  if (!requireSameOrigin(request)) {
    return jsonResponse({ error: "Invalid request origin." }, 403);
  }

  if (usersPath && request.method === "POST") {
    const body = await readJsonBody(request, 4096);
    if (
      !body ||
      typeof body.username !== "string" ||
      !validManagedUsername(body.username) ||
      typeof body.displayName !== "string" ||
      body.displayName.trim().length < 1 ||
      body.displayName.trim().length > 80 ||
      !validManagedPassword(body.password)
    ) {
      return jsonResponse({
        error: `Enter a valid username, display name, and password (at least ${MIN_ADMIN_PASSWORD_LENGTH} characters).`
      }, 400);
    }

    const username = body.username.trim().toLowerCase();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const sessionVersion = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
    const passwordHash = await hashAdminPassword(body.password, salt);
    const result = await env.DB.prepare(
      `INSERT INTO admin_users
         (username, display_name, password_salt, password_hash, session_version)
       SELECT ?, ?, ?, ?, ?
       WHERE (SELECT COUNT(*) FROM admin_users) < ?`
    ).bind(
      username,
      body.displayName.trim(),
      bytesToHex(salt),
      passwordHash,
      sessionVersion,
      MAX_ADMIN_USERS
    ).run();
    if (!result.meta.changes) {
      const exists = await env.DB.prepare(
        "SELECT username FROM admin_users WHERE username = ?"
      ).bind(username).first();
      return exists
        ? jsonResponse({ error: "That username already exists." }, 409)
        : jsonResponse({ error: `Only ${MAX_ADMIN_USERS} managed accounts are allowed.` }, 409);
    }
    return jsonResponse({ saved: true });
  }

  if (!userMatch) {
    return jsonResponse({ error: "Not found." }, 404);
  }

  const username = userMatch[1];
  if (request.method === "DELETE" && !userMatch[2]) {
    const result = await env.DB.prepare(
      "DELETE FROM admin_users WHERE username = ?"
    ).bind(username).run();
    return result.meta.changes
      ? jsonResponse({ deleted: true })
      : jsonResponse({ error: "Admin account not found." }, 404);
  }

  if (request.method === "POST" && userMatch[2]) {
    const body = await readJsonBody(request);
    if (!body || !validManagedPassword(body.password)) {
      return jsonResponse({
        error: `Enter a password with at least ${MIN_ADMIN_PASSWORD_LENGTH} characters.`
      }, 400);
    }
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const sessionVersion = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
    const passwordHash = await hashAdminPassword(body.password, salt);
    const result = await env.DB.prepare(
      `UPDATE admin_users
       SET password_salt = ?, password_hash = ?, session_version = ?
       WHERE username = ?`
    ).bind(bytesToHex(salt), passwordHash, sessionVersion, username).run();
    return result.meta.changes
      ? jsonResponse({ reset: true })
      : jsonResponse({ error: "Admin account not found." }, 404);
  }

  return jsonResponse({ error: "Method not allowed." }, 405);
}

async function login(request, env) {
  if (!requireSameOrigin(request)) {
    return jsonResponse({ error: "Invalid request origin." }, 403);
  }

  if (
    typeof env.ADMIN_PASSWORD !== "string" ||
    env.ADMIN_PASSWORD.length === 0
  ) {
    console.error("Missing ADMIN_PASSWORD runtime binding.");
    return jsonResponse({
      error: "ADMIN_PASSWORD is missing from the Cloudflare environment. Check the Worker secret and deployment."
    }, 503);
  }

  if (env.ADMIN_PASSWORD.length < 12) {
    return jsonResponse({
      error: "ADMIN_PASSWORD must be at least 12 characters."
    }, 503);
  }

  if (
    typeof env.SESSION_SECRET !== "string" ||
    env.SESSION_SECRET.length < 32
  ) {
    console.error("Missing or too-short SESSION_SECRET runtime binding.");
    return jsonResponse({
      error: "SESSION_SECRET is missing or too short. Configure a secret of at least 32 characters."
    }, 503);
  }

  if (!env.DB) {
    console.error("Missing DB runtime binding.");
    return jsonResponse({
      error: "The DB database binding is missing."
    }, 503);
  }

  const ipAddress =
    request.headers.get("CF-Connecting-IP") || "unknown";
  const ipKey = await sign(ipAddress, env.SESSION_SECRET);

  await env.DB.prepare(
    "DELETE FROM login_attempts WHERE attempt_at < unixepoch() - 86400"
  ).run();

  const attempts = await env.DB.prepare(
    "SELECT COUNT(*) AS total FROM login_attempts WHERE ip_key = ? AND attempt_at > unixepoch() - 900"
  ).bind(ipKey).first();

  if (attempts && attempts.total >= 10) {
    return jsonResponse({
      error: "Too many sign-in attempts. Try again in 15 minutes."
    }, 429);
  }

  const declaredLength = Number(request.headers.get("Content-Length") || 0);
  if (declaredLength > 4096) {
    return jsonResponse({ error: "Invalid sign-in request." }, 413);
  }
  const body = await readJsonBody(request);
  if (!body) {
    return jsonResponse({ error: "Invalid sign-in request." }, 400);
  }

  const username = typeof body.username === "string"
    ? body.username.trim().toLowerCase()
    : "diana";
  if (
    !/^[a-z0-9._-]{3,32}$/.test(username) ||
    typeof body.password !== "string" ||
    body.password.length > 256
  ) {
    return jsonResponse({ error: "Enter the admin password." }, 400);
  }

  let version;
  let accepted = false;
  if (username === "diana") {
    accepted = await passwordMatches(body.password, {
      password: env.ADMIN_PASSWORD,
      secret: env.SESSION_SECRET
    });
    version = "master";
  } else {
    const user = await env.DB.prepare(
      "SELECT password_salt, password_hash, session_version FROM admin_users WHERE username = ?"
    ).bind(username).first();
    if (user) {
      const actual = await hashAdminPassword(
        body.password,
        hexToBytes(user.password_salt)
      );
      accepted = await passwordMatches(actual, {
        password: user.password_hash,
        secret: env.SESSION_SECRET
      });
      version = String(user.session_version);
    }
  }

  if (!accepted) {
    await env.DB.prepare(
      "INSERT INTO login_attempts (ip_key) VALUES (?)"
    ).bind(ipKey).run();

    return jsonResponse({
      error: "The password was not accepted."
    }, 401);
  }

  await env.DB.prepare(
    "DELETE FROM login_attempts WHERE ip_key = ?"
  ).bind(ipKey).run();

  const token = await createSession(username, version, env.SESSION_SECRET);

  return jsonResponse(
    { authenticated: true, username, isMaster: username === "diana" },
    200,
    { "Set-Cookie": cookieHeader(token, SESSION_SECONDS) }
  );
}

async function handleRequest(context) {
  const { request, env } = context;
  const path = new URL(request.url).pathname;

  try {
    if (path === "/api/session" && request.method === "GET") {
      if (
        typeof env.SESSION_SECRET !== "string" ||
        env.SESSION_SECRET.length < 32
      ) {
        return jsonResponse({ authenticated: false });
      }

      const session = await verifySession(request, env.SESSION_SECRET, env);
      return jsonResponse({
        authenticated: Boolean(session),
        username: session ? session.username : null,
        isMaster: Boolean(session && session.isMaster)
      });
    }

    if (path === "/api/login" && request.method === "POST") {
      return await login(request, env);
    }

    if (path === "/api/logout" && request.method === "POST") {
      if (!requireSameOrigin(request)) {
        return jsonResponse({ error: "Invalid request origin." }, 403);
      }

      return jsonResponse(
        { authenticated: false },
        200,
        { "Set-Cookie": cookieHeader("", 0) }
      );
    }

    const adminUsersResponse = await handleAdminUsers(request, env, path);
    if (adminUsersResponse) return adminUsersResponse;

    const match = path.match(/^\/api\/content\/([a-z]+)$/);

    if (!match || !CONTENT_SCOPES.has(match[1])) {
      return jsonResponse({ error: "Not found." }, 404);
    }

    const scope = match[1];

    if (request.method === "GET") {
      if (!env.DB) {
        return jsonResponse({ error: "The DB binding is missing." }, 503);
      }

      return await getContent(scope, env);
    }

    if (!["POST", "DELETE"].includes(request.method)) {
      return jsonResponse({ error: "Method not allowed." }, 405);
    }

    if (!requireSameOrigin(request)) {
      return jsonResponse({ error: "Invalid request origin." }, 403);
    }

    if (!env.DB) {
      return jsonResponse({ error: "The DB binding is missing." }, 503);
    }

    if (
      typeof env.SESSION_SECRET !== "string" ||
      env.SESSION_SECRET.length < 32 ||
      !await verifySession(request, env.SESSION_SECRET, env)
    ) {
      return jsonResponse({
        error: "Sign in as an IT administrator to edit content."
      }, 401);
    }

    if (request.method === "DELETE") {
      await env.DB.prepare(
        "DELETE FROM site_content WHERE scope = ?"
      ).bind(scope).run();

      return jsonResponse({ saved: true, reset: true });
    }

    const declaredLength = Number(
      request.headers.get("Content-Length") || 0
    );

    if (declaredLength > MAX_CONTENT_BYTES) {
      return jsonResponse({ error: "Content is too large." }, 413);
    }

    let body;

    try {
      const rawBody = await request.text();

      if (
        new TextEncoder().encode(rawBody).length > MAX_CONTENT_BYTES
      ) {
        return jsonResponse({ error: "Content is too large." }, 413);
      }

      body = JSON.parse(rawBody);
    } catch {
      return jsonResponse({ error: "Invalid content request." }, 400);
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonResponse({ error: "Invalid content request." }, 400);
    }

    const serialized = JSON.stringify(body.content);

    if (
      new TextEncoder().encode(serialized).length > MAX_CONTENT_BYTES
    ) {
      return jsonResponse({ error: "Content is too large." }, 413);
    }

    if (!isValidContent(scope, body.content)) {
      return jsonResponse({
        error: "Content does not match the expected page format."
      }, 400);
    }

    await env.DB.prepare(
      `INSERT INTO site_content (scope, content, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(scope) DO UPDATE SET
         content = excluded.content,
         updated_at = excluded.updated_at`
    ).bind(scope, serialized).run();

    return jsonResponse({ saved: true });
  } catch (error) {
    console.error("Admin API request failed:", error);
    return jsonResponse({
      error: "The request could not be completed."
    }, 500);
  }
}

export async function onRequest(context) {
  return handleRequest(context);
}
