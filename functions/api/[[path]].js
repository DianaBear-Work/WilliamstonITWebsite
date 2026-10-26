
const SESSION_COOKIE = "pelzer_it_admin";
const SESSION_SECONDS = 8 * 60 * 60;
const MAX_CONTENT_BYTES = 200_000;
const CONTENT_SCOPES = new Set(["equipment", "builds", "updates"]);

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

async function verifySession(request, secret) {
  const token = readCookie(request, SESSION_COOKIE);
  const separator = token.indexOf(".");

  if (separator < 1) return false;

  const expiry = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  if (
    !/^\d{10}$/.test(expiry) ||
    Number(expiry) <= Math.floor(Date.now() / 1000)
  ) {
    return false;
  }

  const expected = await sign(expiry, secret);
  const a = new TextEncoder().encode(expected);
  const b = new TextEncoder().encode(signature);

  let difference = a.length ^ b.length;

  for (let i = 0; i < a.length; i++) {
    difference |= a[i] ^ (b[i] || 0);
  }

  return difference === 0;
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
      ["building", "blocked", "complete"].includes(build.status) &&
      isString(build.stage, 200) &&
      isString(build.updated, 100) &&
      isString(build.notes, 4000) &&
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

async function login(request, env) {
  if (!requireSameOrigin(request)) {
    return jsonResponse({ error: "Invalid request origin." }, 403);
  }

  if (
    typeof env.ADMINPASSWORD !== "string" ||
    env.ADMINPASSWORD.length === 0
  ) {
    console.error("Missing ADMINPASSWORD runtime binding.");
    return jsonResponse({
      error: "ADMINPASSWORD is missing from the Cloudflare environment. Check the Worker secret and deployment."
    }, 503);
  }

  if (env.ADMINPASSWORD.length < 12) {
    return jsonResponse({
      error: "ADMINPASSWORD must be at least 12 characters."
    }, 503);
  }

  if (
    typeof env.SESSIONSECRET !== "string" ||
    env.SESSIONSECRET.length < 32
  ) {
    console.error("Missing or too-short SESSIONSECRET runtime binding.");
    return jsonResponse({
      error: "SESSIONSECRET is missing or too short. Configure a secret of at least 32 characters."
    }, 503);
  }

  if (!env.DB) {
    console.error("Missing DB runtime binding.");
    return jsonResponse({
      error: "The DB database binding is missing."
    }, 503);
  }

  const declaredLength = Number(
    request.headers.get("Content-Length") || 0
  );

  if (declaredLength > 4096) {
    return jsonResponse({ error: "Invalid sign-in request." }, 413);
  }

  const ipAddress =
    request.headers.get("CF-Connecting-IP") || "unknown";
  const ipKey = await sign(ipAddress, env.SESSIONSECRET);

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

  let body;

  try {
    const rawBody = await request.text();

    if (new TextEncoder().encode(rawBody).length > 4096) {
      return jsonResponse({ error: "Invalid sign-in request." }, 413);
    }

    body = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "Invalid sign-in request." }, 400);
  }

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    typeof body.password !== "string" ||
    body.password.length > 256
  ) {
    return jsonResponse({ error: "Enter the admin password." }, 400);
  }

  const submitted = await sign(body.password, env.SESSIONSECRET);
  const expected = await sign(env.ADMINPASSWORD, env.SESSIONSECRET);
  const a = new TextEncoder().encode(expected);
  const b = new TextEncoder().encode(submitted);

  let difference = a.length ^ b.length;

  for (let i = 0; i < a.length; i++) {
    difference |= a[i] ^ (b[i] || 0);
  }

  if (difference !== 0) {
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

  const expiry = String(
    Math.floor(Date.now() / 1000) + SESSION_SECONDS
  );

  const token = `${expiry}.${await sign(
    expiry,
    env.SESSIONSECRET
  )}`;

  return jsonResponse(
    { authenticated: true },
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
        typeof env.SESSIONSECRET !== "string" ||
        env.SESSIONSECRET.length < 32
      ) {
        return jsonResponse({ authenticated: false });
      }

      return jsonResponse({
        authenticated: await verifySession(
          request,
          env.SESSIONSECRET
        )
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
      typeof env.SESSIONSECRET !== "string" ||
      env.SESSIONSECRET.length < 32 ||
      !await verifySession(request, env.SESSIONSECRET)
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
