// test
const SESSION_COOKIE = "pelzer_it_admin";
const SESSION_SECONDS = 8 * 60 * 60;
const MASTER_USERNAME = "dianabear";
const MAX_CONTENT_BYTES = 200_000;
const CONTENT_SCOPES = new Set(["equipment", "builds", "updates"]);
const RESTOCK_STATUSES = new Set([
  "Not Yet Requested",
  "Ordered",
  "Requested",
  "Restocked"
]);

function getAdminPassword(env) {
  return typeof env.ADMIN_PASSWORD === "string"
    ? env.ADMIN_PASSWORD
    : env.ADMINPASSWORD;
}

function getSessionSecret(env) {
  return typeof env.SESSION_SECRET === "string"
    ? env.SESSION_SECRET
    : env.SESSIONSECRET;
}

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

async function verifySession(request, secret, db) {
  const token = readCookie(request, SESSION_COOKIE);
  const parts = token.split(".");

  if (parts.length === 2) {
    return null;
  }

  if (parts.length !== 4) return null;

  const [username, expiry, version, signature] = parts;
  if (!isValidExpiry(expiry)) return null;
  if (!await verifySignature(`${username}.${expiry}.${version}`, signature, secret)) {
    return null;
  }

  if (username === MASTER_USERNAME && version === "master") {
    return { username, isMaster: true };
  }

  if (!/^[a-z0-9._-]{3,32}$/.test(username) || !version || !db) {
    return null;
  }

  const account = await db.prepare(
    "SELECT session_version FROM admin_users WHERE username = ?"
  ).bind(username).first();

  return account && account.session_version === version
    ? { username, isMaster: false }
    : null;
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

async function createSession(username, version, secret) {
  const expiry = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  const signature = await sign(`${username}.${expiry}.${version}`, secret);
  return `${username}.${expiry}.${version}.${signature}`;
}

async function passwordMatches(password, expected) {
  const submitted = new TextEncoder().encode(await sign(password, expected.secret));
  const stored = new TextEncoder().encode(await sign(expected.password, expected.secret));
  return timingSafeEqual(submitted, stored);
}

function timingSafeEqual(a, b) {
  let difference = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    difference |= (a[i] || 0) ^ (b[i] || 0);
  }
  return difference === 0;
}

function randomHex(byteLength) {
  return Array.from(crypto.getRandomValues(new Uint8Array(byteLength)), byte =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

function hexToBytes(value) {
  return Uint8Array.from(value.match(/.{2}/g) || [], byte =>
    Number.parseInt(byte, 16)
  );
}

async function hashAdminPassword(password, salt) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const hash = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: hexToBytes(salt),
      iterations: 100000
    },
    key,
    256
  );

  return Array.from(new Uint8Array(hash), byte =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

async function passwordMatchesAccount(password, account) {
  const submitted = await hashAdminPassword(password, account.password_salt);
  return timingSafeEqual(
    new TextEncoder().encode(submitted),
    new TextEncoder().encode(account.password_hash)
  );
}

async function readAdminRequestBody(request) {
  const body = await readJsonBody(request);
  if (!body) {
    return { error: jsonResponse({ error: "Invalid account request." }, 400) };
  }
  return { body };
}

function validAdminPassword(password) {
  return typeof password === "string" &&
    password.length >= 12 &&
    password.length <= 256;
}

async function masterSession(request, env) {
  const secret = getSessionSecret(env);
  if (typeof secret !== "string" || secret.length < 32 || !env.DB) {
    return null;
  }
  const session = await verifySession(request, secret, env.DB);
  return session && session.isMaster ? session : null;
}

async function listAdminUsers(env) {
  const result = await env.DB.prepare(
    "SELECT username, display_name, created_at FROM admin_users ORDER BY username"
  ).all();

  return jsonResponse({ users: result.results || [] });
}

async function createAdminUser(request, env) {
  if (!requireSameOrigin(request)) {
    return jsonResponse({ error: "Invalid request origin." }, 403);
  }

  const authorization = await masterSession(request, env);
  if (!authorization) {
    return jsonResponse({ error: "Only the master admin can manage accounts." }, 403);
  }

  const parsed = await readAdminRequestBody(request);
  if (parsed.error) return parsed.error;
  const { username, displayName, password } = parsed.body;
  const normalizedUsername = typeof username === "string"
    ? username.trim().toLowerCase()
    : "";
  const normalizedDisplayName = typeof displayName === "string"
    ? displayName.trim()
    : "";

  if (!/^[a-z0-9._-]{3,32}$/.test(normalizedUsername)) {
    return jsonResponse({
      error: "Username must be 3 to 32 characters using letters, numbers, dots, underscores, or hyphens."
    }, 400);
  }
  if (normalizedUsername === MASTER_USERNAME || normalizedUsername === "diana") {
    return jsonResponse({
      error: "The master account is managed through the Cloudflare ADMIN_PASSWORD secret."
    }, 400);
  }
  if (!normalizedDisplayName || normalizedDisplayName.length > 80) {
    return jsonResponse({ error: "Enter a display name of up to 80 characters." }, 400);
  }
  if (!validAdminPassword(password)) {
    return jsonResponse({ error: "Passwords must be 12 to 256 characters long." }, 400);
  }

  const salt = randomHex(16);
  const passwordHash = await hashAdminPassword(password, salt);
  const result = await env.DB.prepare(
    `INSERT INTO admin_users
       (username, display_name, password_salt, password_hash, session_version)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(username) DO NOTHING`
  ).bind(normalizedUsername, normalizedDisplayName, salt, passwordHash, randomHex(16)).run();

  if (!result.meta || result.meta.changes !== 1) {
    return jsonResponse({ error: "That admin username already exists." }, 409);
  }
  return jsonResponse({ created: true }, 201);
}

async function updateAdminPassword(request, env, username) {
  if (!requireSameOrigin(request)) {
    return jsonResponse({ error: "Invalid request origin." }, 403);
  }

  const authorization = await masterSession(request, env);
  if (!authorization) {
    return jsonResponse({ error: "Only the master admin can manage account passwords." }, 403);
  }
  if (username === MASTER_USERNAME || username === "diana") {
    return jsonResponse({
      error: "The master password is managed through the Cloudflare ADMIN_PASSWORD secret."
    }, 400);
  }

  const parsed = await readAdminRequestBody(request);
  if (parsed.error) return parsed.error;
  if (!validAdminPassword(parsed.body.password)) {
    return jsonResponse({ error: "Passwords must be 12 to 256 characters long." }, 400);
  }

  const salt = randomHex(16);
  const passwordHash = await hashAdminPassword(parsed.body.password, salt);
  const result = await env.DB.prepare(
    `UPDATE admin_users
     SET password_salt = ?, password_hash = ?, session_version = ?
     WHERE username = ?`
  ).bind(salt, passwordHash, randomHex(16), username).run();

  if (!result.meta || result.meta.changes !== 1) {
    return jsonResponse({ error: "Admin account not found." }, 404);
  }
  return jsonResponse({ updated: true });
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
      RESTOCK_STATUSES.has(item.restockStatus) &&
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

function isProjectUpdates(value) {
  const circleColors = new Set(["orange", "yellow", "green", "gray"]);
  return Array.isArray(value) &&
    value.length <= 100 &&
    value.every(project =>
      project &&
      isString(project.title, 200) &&
      project.title.trim() !== "" &&
      isString(project.status, 100) &&
      project.status.trim() !== "" &&
      circleColors.has(project.circleColor) &&
      Array.isArray(project.descriptions) &&
      project.descriptions.length <= 10 &&
      project.descriptions.every(description =>
        isString(description, 2000) && description.trim() !== ""
      ) &&
      isString(project.detailLabel, 100) &&
      isString(project.detailText, 2000)
    );
}

function isValidContent(scope, content) {
  if (scope === "equipment") return isEquipment(content);
  if (scope === "builds") return isBuilds(content);
  return scope === "updates" &&
    (isString(content, 150_000) || isProjectUpdates(content));
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

async function login(request, env) {
  if (!requireSameOrigin(request)) {
    return jsonResponse({ error: "Invalid request origin." }, 403);
  }

  const sessionSecret = getSessionSecret(env);
  if (typeof sessionSecret !== "string" || sessionSecret.length < 32) {
    console.error("Missing or too-short SESSION_SECRET runtime binding.");
    return jsonResponse({
      error: "SESSION_SECRET (or legacy SESSIONSECRET) is missing or too short. Configure a secret of at least 32 characters."
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
  const ipKey = await sign(ipAddress, sessionSecret);

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
    : MASTER_USERNAME;
  if (
    !/^[a-z0-9._-]{3,32}$/.test(username) ||
    typeof body.password !== "string" ||
    body.password.length > 256
  ) {
    return jsonResponse({ error: "Enter the admin password." }, 400);
  }

  let accepted = false;
  let sessionVersion = "master";
  if (username === MASTER_USERNAME) {
    const adminPassword = getAdminPassword(env);
    if (typeof adminPassword !== "string" || adminPassword.length === 0) {
      console.error("Missing ADMIN_PASSWORD runtime binding.");
      return jsonResponse({
        error: "ADMIN_PASSWORD (or legacy ADMINPASSWORD) is missing from the Cloudflare environment. Check the Worker secret and deployment."
      }, 503);
    }
    if (adminPassword.length < 12) {
      return jsonResponse({
        error: "ADMIN_PASSWORD must be at least 12 characters."
      }, 503);
    }
    accepted = await passwordMatches(body.password, {
      password: adminPassword,
      secret: sessionSecret
    });
  } else {
    const account = await env.DB.prepare(
      "SELECT password_salt, password_hash, session_version FROM admin_users WHERE username = ?"
    ).bind(username).first();
    accepted = Boolean(account && await passwordMatchesAccount(body.password, account));
    if (accepted) sessionVersion = account.session_version;
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

  const token = await createSession(username, sessionVersion, sessionSecret);

  return jsonResponse(
    { authenticated: true, username, isMaster: username === MASTER_USERNAME },
    200,
    { "Set-Cookie": cookieHeader(token, SESSION_SECONDS) }
  );
}

async function handleRequest(context) {
  const { request, env } = context;
  const path = new URL(request.url).pathname;

  try {
    if (path === "/api/session" && request.method === "GET") {
      const sessionSecret = getSessionSecret(env);
      if (typeof sessionSecret !== "string" || sessionSecret.length < 32) {
        return jsonResponse({ authenticated: false });
      }

      const session = await verifySession(request, sessionSecret, env.DB);
      return jsonResponse({
        authenticated: Boolean(session),
        username: session ? session.username : null,
        isMaster: Boolean(session && session.isMaster)
      });
    }

    if (path === "/api/login" && request.method === "POST") {
      return await login(request, env);
    }

    if (path === "/api/admin-users") {
      if (!env.DB) {
        return jsonResponse({ error: "The DB database binding is missing." }, 503);
      }
      if (request.method === "GET") {
        if (!await masterSession(request, env)) {
          return jsonResponse({ error: "Only the master admin can manage accounts." }, 403);
        }
        return await listAdminUsers(env);
      }
      if (request.method === "POST") {
        return await createAdminUser(request, env);
      }
      return jsonResponse({ error: "Method not allowed." }, 405);
    }

    const passwordUpdate = path.match(
      /^\/api\/admin-users\/([a-z0-9._-]{3,32})\/password$/
    );
    if (passwordUpdate && request.method === "POST") {
      if (!env.DB) {
        return jsonResponse({ error: "The DB database binding is missing." }, 503);
      }
      return await updateAdminPassword(request, env, passwordUpdate[1]);
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

    const sessionSecret = getSessionSecret(env);
    if (
      typeof sessionSecret !== "string" ||
      sessionSecret.length < 32 ||
      !await verifySession(request, sessionSecret, env.DB)
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
      error: "The admin service failed (HTTP 500). Check the Cloudflare Pages Function logs and D1 database setup; details are recorded in the server logs."
    }, 500);
  }
}

export async function onRequest(context) {
  return handleRequest(context);
}
