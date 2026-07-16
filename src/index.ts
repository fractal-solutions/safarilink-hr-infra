import { serve } from "bun";
import index from "./index.html";
import db, { getSessionUser, createSession, setSessionCookie, clearSessionCookie, addAuditLog } from "./db";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join, extname } from "path";

const UPLOADS_DIR = join(import.meta.dir, "..", "data", "uploads");
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB

async function fireWebhook(webhookUrl: string, payload: any) {
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) {
    console.error(`Webhook POST failed to ${webhookUrl}:`, (e as Error).message);
  }
}

// Rate limiter
const rateLimits = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimits.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimits) {
    if (now > entry.resetAt) rateLimits.delete(key);
  }
}, 60_000);

function json(data: any, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function unauthorized() {
  return json({ error: "Unauthorized" }, 401);
}

function forbidden() {
  return json({ error: "Forbidden" }, 403);
}

function notFound() {
  return json({ error: "Not Found" }, 404);
}

async function readBody(req: Request) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

function cookieSet(res: Response, token: string): Response {
  return setSessionCookie(res, token);
}

function cookieClear(res: Response): Response {
  return clearSessionCookie(res);
}

const server = serve({
  routes: {
    "/*": index,

    // ─── Auth ────────────────────────────────────────────────

    "/api/auth/login": {
      async POST(req) {
        const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
        if (!checkRateLimit(`login:${ip}`, 10, 60_000)) {
          return json({ error: "Too many login attempts. Try again in a minute." }, 429);
        }
        const { username, password } = await readBody(req);
        if (!username || !password) return json({ error: "Username and password required" }, 400);

        const user = db.query(
          `SELECT * FROM users WHERE (username = ? OR payroll_id = ?) AND (password = ? OR payroll_id = ?)`
        ).get(username, username, password, password) as any;
        if (!user) return json({ error: "Invalid credentials" }, 401);

        const token = createSession(user.id);
        const res = json({ user: { id: user.id, username: user.username, displayName: user.display_name, email: user.email, payrollId: user.payroll_id, role: user.role, theme: user.theme || "safari" } });
        return cookieSet(res, token);
      },
    },

    "/api/auth/register": {
      async POST(req) {
        const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
        if (!checkRateLimit(`register:${ip}`, 5, 60_000)) {
          return json({ error: "Too many registration attempts. Try again in a minute." }, 429);
        }
        const { username, password, displayName, payrollId } = await readBody(req);
        if (!username || !password || !displayName || !payrollId) return json({ error: "All fields required" }, 400);

        const existing = db.query("SELECT id FROM users WHERE username = ?").get(username);
        if (existing) return json({ error: "Username already exists" }, 409);

        const existingPayroll = db.query("SELECT id FROM users WHERE payroll_id = ?").get(payrollId);
        if (existingPayroll) return json({ error: "Payroll ID already registered" }, 409);

        const id = `usr-${crypto.randomUUID()}`;
        const now = new Date().toISOString();
        db.query(
          "INSERT INTO users (id, username, password, display_name, payroll_id, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).run(id, username, password, displayName, payrollId, "user", now);

        // Auto-assign to "general" department
        const generalDept = db.query("SELECT id FROM departments WHERE slug = 'general'").get() as any;
        if (generalDept) {
          db.run("INSERT OR IGNORE INTO user_departments (user_id, department_id) VALUES (?, ?)", [id, generalDept.id]);
        }

        const token = createSession(id);
        const res = json({ user: { id, username, displayName, email: null, payrollId, role: "user", theme: "safari" } });
        return cookieSet(res, token);
      },
    },

    "/api/auth/logout": {
      async POST(req) {
        const user = getSessionUser(req);
        if (user) {
          const cookie = req.headers.get("cookie") || "";
          const match = cookie.match(/session=([^;]+)/);
          if (match) {
            db.query("DELETE FROM sessions WHERE token = ?").run(match[1]);
          }
        }
        const res = json({ ok: true });
        return cookieClear(res);
      },
    },

    "/api/auth/session": {
      async GET(req) {
        const user = getSessionUser(req);
        if (!user) return unauthorized();
        return json({ user: { id: user.id, username: user.username, displayName: user.display_name, email: user.email, payrollId: user.payroll_id, role: user.role, theme: user.theme || "safari" } });
      },
    },

    // ─── Users ───────────────────────────────────────────────

    "/api/users": {
      async GET(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const users = db.query("SELECT id, username, display_name, email, payroll_id, role, created_at FROM users").all();
        return json({ users: users.map((u: any) => ({ id: u.id, username: u.username, displayName: u.display_name, email: u.email, payrollId: u.payroll_id, role: u.role, createdAt: u.created_at })) });
      },
    },

    "/api/users/:id/password": {
      async PUT(req) {
        const user = getSessionUser(req);
        if (!user) return unauthorized();
        const { id } = req.params;
        const { password } = await readBody(req);
        if (!password || password.length < 4) return json({ error: "Password must be at least 4 characters" }, 400);
        if (user.role !== "admin" && user.id !== id) return forbidden();
        const target = db.query("SELECT id FROM users WHERE id = ?").get(id);
        if (!target) return notFound();
        db.query("UPDATE users SET password = ? WHERE id = ?").run(password, id);
        addAuditLog(null, user.id, "password_change", `Changed password for user ${id}`);
        return json({ ok: true });
      },
    },

    "/api/users/:id/email": {
      async PUT(req) {
        const user = getSessionUser(req);
        if (!user) return unauthorized();
        const { id } = req.params;
        if (user.id !== id) return forbidden();
        const { email } = await readBody(req);
        if (!email || !email.includes("@")) return json({ error: "Valid email required" }, 400);
        db.query("UPDATE users SET email = ? WHERE id = ?").run(email, id);
        return json({ ok: true });
      },
    },

    "/api/users/:id/theme": {
      async PUT(req) {
        const user = getSessionUser(req);
        if (!user) return unauthorized();
        const { id } = req.params;
        if (user.id !== id) return forbidden();
        const { theme } = await readBody(req);
        const validThemes = ["safari", "ocean", "forest", "sunset", "royal", "midnight", "rose", "emerald"];
        if (!theme || !validThemes.includes(theme)) return json({ error: "Invalid theme" }, 400);
        db.query("UPDATE users SET theme = ? WHERE id = ?").run(theme, id);
        return json({ ok: true, theme });
      },
    },

    "/api/users/:id/role": {
      async PUT(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const { id } = req.params;
        const { role } = await readBody(req);
        if (role !== "admin" && role !== "user") return json({ error: "Invalid role" }, 400);
        if (user.id === id) return json({ error: "Cannot change your own role" }, 400);
        const target = db.query("SELECT id FROM users WHERE id = ?").get(id);
        if (!target) return notFound();
        db.query("UPDATE users SET role = ? WHERE id = ?").run(role, id);
        addAuditLog(null, user.id, "role_change", `Changed role of user ${id} to ${role}`);
        return json({ ok: true });
      },
    },

    "/api/users/:id": {
      async DELETE(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const { id } = req.params;
        if (user.id === id) return json({ error: "Cannot delete yourself" }, 400);
        const target = db.query("SELECT id FROM users WHERE id = ?").get(id);
        if (!target) return notFound();
        db.query("DELETE FROM users WHERE id = ?").run(id);
        addAuditLog(null, user.id, "user_delete", `Deleted user ${id}`);
        return json({ ok: true });
      },
    },

    // ─── User Departments ─────────────────────────────────────

    "/api/users/:id/departments": {
      async GET(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const { id } = req.params;
        const depts = db.query(
          `SELECT d.* FROM departments d JOIN user_departments ud ON d.id = ud.department_id WHERE ud.user_id = ? ORDER BY d.sort_order`
        ).all(id);
        return json(depts.map((d: any) => ({
          id: d.id, name: d.name, slug: d.slug, color: d.color, icon: d.icon, sortOrder: d.sort_order, createdAt: d.created_at,
        })));
      },

      async POST(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const { id } = req.params;
        const { departmentId } = await readBody(req);
        if (!departmentId) return json({ error: "departmentId required" }, 400);
        const target = db.query("SELECT id FROM users WHERE id = ?").get(id);
        if (!target) return notFound();
        const dept = db.query("SELECT id FROM departments WHERE id = ?").get(departmentId);
        if (!dept) return json({ error: "Department not found" }, 404);
        db.run("INSERT OR IGNORE INTO user_departments (user_id, department_id) VALUES (?, ?)", [id, departmentId]);
        return json({ ok: true });
      },
    },

    "/api/users/:id/departments/:deptId": {
      async DELETE(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const { id, deptId } = req.params;
        db.run("DELETE FROM user_departments WHERE user_id = ? AND department_id = ?", [id, deptId]);
        return json({ ok: true });
      },
    },

    // ─── Current User Departments ─────────────────────────────

    "/api/user/departments": {
      async GET(req) {
        const user = getSessionUser(req);
        if (!user) return unauthorized();
        const depts = db.query(
          `SELECT d.* FROM departments d JOIN user_departments ud ON d.id = ud.department_id WHERE ud.user_id = ? ORDER BY d.sort_order`
        ).all(user.id);
        return json(depts.map((d: any) => ({
          id: d.id, name: d.name, slug: d.slug, color: d.color, icon: d.icon, sortOrder: d.sort_order, createdAt: d.created_at,
        })));
      },

      async POST(req) {
        const user = getSessionUser(req);
        if (!user) return unauthorized();
        const { departmentId } = await readBody(req);
        if (!departmentId) return json({ error: "departmentId required" }, 400);
        const dept = db.query("SELECT id FROM departments WHERE id = ?").get(departmentId);
        if (!dept) return json({ error: "Department not found" }, 404);
        db.run("INSERT OR IGNORE INTO user_departments (user_id, department_id) VALUES (?, ?)", [user.id, departmentId]);
        return json({ ok: true });
      },
    },

    "/api/user/departments/:deptId": {
      async DELETE(req) {
        const user = getSessionUser(req);
        if (!user) return unauthorized();
        const { deptId } = req.params;
        db.run("DELETE FROM user_departments WHERE user_id = ? AND department_id = ?", [user.id, deptId]);
        return json({ ok: true });
      },
    },

    // ─── File Upload ──────────────────────────────────────────

    "/api/upload": {
      async POST(req) {
        const user = getSessionUser(req);
        if (!user) return unauthorized();
        const contentType = req.headers.get("content-type") || "";
        if (!contentType.includes("multipart/form-data")) {
          return json({ error: "Expected multipart/form-data" }, 400);
        }
        const formData = await req.formData();
        const file = formData.get("file");
        if (!file || typeof file === "string") {
          return json({ error: "No file provided" }, 400);
        }
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
          return json({ error: "Only JPG, PNG, GIF, WebP images allowed" }, 400);
        }
        if (file.size > MAX_UPLOAD_SIZE) {
          return json({ error: "File too large (max 5MB)" }, 400);
        }
        const ext = extname(file.name) || ".jpg";
        const filename = `${crypto.randomUUID()}${ext}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        writeFileSync(join(UPLOADS_DIR, filename), buffer);
        return json({ url: `/uploads/${filename}` });
      },
    },

    // ─── Documents ───────────────────────────────────────────

    "/api/documents": {
      async GET(req) {
        const user = getSessionUser(req);
        if (!user) return unauthorized();
        const url = new URL(req.url);
        const archived = url.searchParams.get("archived") === "true" ? 1 : 0;
        const docs = db.query("SELECT * FROM documents WHERE archived = ? AND deleted_at IS NULL ORDER BY sort_order").all(archived);
        const result = docs.map((doc: any) => {
          const sections = db.query("SELECT * FROM sections WHERE document_id = ? ORDER BY sort_order").all(doc.id);
          const tags = db.query("SELECT tag FROM document_tags WHERE document_id = ?").all(doc.id).map((t: any) => t.tag);
          return {
            id: doc.id,
            title: doc.title,
            sortOrder: doc.sort_order,
            archived: !!doc.archived,
            dueDate: doc.due_date,
            departmentId: doc.department_id,
            createdAt: doc.created_at,
            updatedAt: doc.updated_at,
            tags,
            sections: sections.map((s: any) => ({
              id: s.id,
              title: s.title,
              content: s.content,
              sortOrder: s.sort_order,
              createdAt: s.created_at,
              updatedAt: s.updated_at,
            })),
          };
        });
        return json(result);
      },

      async POST(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const { title, departmentId } = await readBody(req);
        if (!title) return json({ error: "Title required" }, 400);
        const id = `doc-${crypto.randomUUID()}`;
        const now = new Date().toISOString();
        const maxOrder = (db.query("SELECT MAX(sort_order) as m FROM documents").get() as any).m ?? -1;
        db.query(
          "INSERT INTO documents (id, title, sort_order, archived, created_at, department_id) VALUES (?, ?, ?, ?, ?, ?)"
        ).run(id, title, maxOrder + 1, 0, now, departmentId || null);
        addAuditLog(id, user.id, "document_create", `Created document "${title}"`);
        return json({ id, title, sortOrder: maxOrder + 1, archived: false, departmentId: departmentId || null, sections: [] }, 201);
      },
    },

    "/api/documents/trash": {
      async GET(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const docs = db.query("SELECT * FROM documents WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC").all() as any[];
        return json(docs.map((d: any) => ({ id: d.id, title: d.title, deletedAt: d.deleted_at })));
      },
    },

    "/api/documents/:id": {
      async PUT(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const { id } = req.params;
        const doc = db.query("SELECT * FROM documents WHERE id = ?").get(id) as any;
        if (!doc) return notFound();
        const body = await readBody(req);
        const title = body.title ?? doc.title;
        const archived = body.archived !== undefined ? (body.archived ? 1 : 0) : doc.archived;
        const dueDate = body.dueDate !== undefined ? body.dueDate : doc.due_date;
        const departmentId = body.departmentId !== undefined ? (body.departmentId || null) : doc.department_id;
        const now = new Date().toISOString();
        db.query("UPDATE documents SET title = ?, archived = ?, due_date = ?, department_id = ?, updated_at = ? WHERE id = ?").run(title, archived, dueDate, departmentId, now, id);
        addAuditLog(id, user.id, "document_update", `Updated document "${title}"`);
        return json({ ok: true });
      },

      async DELETE(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const { id } = req.params;
        const doc = db.query("SELECT * FROM documents WHERE id = ? AND (deleted_at IS NULL)").get(id) as any;
        if (!doc) return notFound();
        db.query("UPDATE documents SET deleted_at = ? WHERE id = ?").run(new Date().toISOString(), id);
        addAuditLog(id, user.id, "document_trash", `Moved "${doc.title}" to trash`);
        return json({ ok: true });
      },
    },

    "/api/documents/:id/restore": {
      async POST(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const { id } = req.params;
        const doc = db.query("SELECT * FROM documents WHERE id = ? AND deleted_at IS NOT NULL").get(id) as any;
        if (!doc) return notFound();
        db.query("UPDATE documents SET deleted_at = NULL WHERE id = ?").run(id);
        addAuditLog(id, user.id, "document_restore", `Restored "${doc.title}" from trash`);
        return json({ ok: true });
      },
    },

    "/api/documents/:id/duplicate": {
      async POST(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const { id } = req.params;
        const doc = db.query("SELECT * FROM documents WHERE id = ?").get(id) as any;
        if (!doc) return notFound();

        const newDocId = `doc-${crypto.randomUUID()}`;
        const now = new Date().toISOString();
        const maxOrder = (db.query("SELECT MAX(sort_order) as m FROM documents").get() as any).m ?? -1;
        db.query(
          "INSERT INTO documents (id, title, sort_order, archived, due_date, department_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).run(newDocId, `${doc.title} (Copy)`, maxOrder + 1, doc.archived, doc.due_date, doc.department_id, now);

        const sections = db.query("SELECT * FROM sections WHERE document_id = ? ORDER BY sort_order").all(id);
        for (const sec of sections) {
          db.query(
            "INSERT INTO sections (id, document_id, title, content, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
          ).run(crypto.randomUUID(), newDocId, (sec as any).title, (sec as any).content, (sec as any).sort_order, now, now);
        }

        addAuditLog(newDocId, user.id, "document_duplicate", `Duplicated document "${doc.title}"`);
        const newSections = db.query("SELECT * FROM sections WHERE document_id = ? ORDER BY sort_order").all(newDocId);
        return json({
          id: newDocId,
          title: `${doc.title} (Copy)`,
          sortOrder: maxOrder + 1,
          archived: !!doc.archived,
          sections: newSections.map((s: any) => ({ id: s.id, title: s.title, content: s.content, sortOrder: s.sort_order })),
        }, 201);
      },
    },

    // ─── Sections ────────────────────────────────────────────

    "/api/documents/:docId/sections": {
      async POST(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const { docId } = req.params;
        const doc = db.query("SELECT id FROM documents WHERE id = ?").get(docId);
        if (!doc) return notFound();
        const { title, content } = await readBody(req);
        if (!title) return json({ error: "Title required" }, 400);
        const id = `sec-${crypto.randomUUID()}`;
        const now = new Date().toISOString();
        const maxOrder = (db.query("SELECT MAX(sort_order) as m FROM sections WHERE document_id = ?").get(docId) as any).m ?? -1;
        db.query(
          "INSERT INTO sections (id, document_id, title, content, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).run(id, docId, title, content || "", maxOrder + 1, now, now);
        addAuditLog(docId, user.id, "section_create", `Created section "${title}"`);
        return json({ id, title, content: content || "", sortOrder: maxOrder + 1 }, 201);
      },
    },

    "/api/sections/:id": {
      async PUT(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const { id } = req.params;
        const sec = db.query("SELECT * FROM sections WHERE id = ?").get(id) as any;
        if (!sec) return notFound();
        const body = await readBody(req);
        const title = body.title ?? sec.title;
        const content = body.content !== undefined ? body.content : sec.content;
        const sortOrder = body.sort_order ?? sec.sort_order;

        if (body.title !== undefined || body.content !== undefined) {
          db.query(
            "INSERT INTO section_versions (id, section_id, title, content, edited_by, created_at) VALUES (?, ?, ?, ?, ?, ?)"
          ).run(crypto.randomUUID(), id, sec.title, sec.content, user.id, new Date().toISOString());
        }

        const now = new Date().toISOString();
        db.query("UPDATE sections SET title = ?, content = ?, sort_order = ?, updated_at = ? WHERE id = ?").run(title, content, sortOrder, now, id);
        addAuditLog(sec.document_id, user.id, "section_update", `Updated section "${title}"`);
        return json({ ok: true });
      },

      async DELETE(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const { id } = req.params;
        const sec = db.query("SELECT * FROM sections WHERE id = ?").get(id) as any;
        if (!sec) return notFound();
        db.query("DELETE FROM sections WHERE id = ?").run(id);
        addAuditLog(sec.document_id, user.id, "section_delete", `Deleted section "${sec.title}"`);
        return json({ ok: true });
      },
    },

    "/api/sections/reorder": {
      async PUT(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const { order } = await readBody(req);
        if (!Array.isArray(order)) return json({ error: "order array required" }, 400);
        for (const item of order) {
          db.query("UPDATE sections SET sort_order = ? WHERE id = ?").run(item.sort_order, item.id);
        }
        return json({ ok: true });
      },
    },

    // ─── Tracking ────────────────────────────────────────────

    "/api/tracking": {
      async GET(req) {
        const user = getSessionUser(req);
        if (!user) return unauthorized();
        const rows = db.query("SELECT section_id, read_at FROM tracking WHERE user_id = ?").all(user.id);
        const tracking: Record<string, string> = {};
        for (const row of rows) {
          tracking[(row as any).section_id] = (row as any).read_at;
        }
        return json(tracking);
      },
    },

    "/api/tracking/all": {
      async GET(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const rows = db.query(
          "SELECT t.user_id, t.section_id, t.read_at FROM tracking t JOIN users u ON t.user_id = u.id WHERE u.role != 'admin'"
        ).all();
        const tracking: Record<string, string> = {};
        for (const row of rows) {
          tracking[`${(row as any).user_id}_${(row as any).section_id}`] = (row as any).read_at;
        }
        return json(tracking);
      },
    },

    "/api/tracking/:sectionId": {
      async PUT(req) {
        const user = getSessionUser(req);
        if (!user) return unauthorized();
        const { sectionId } = req.params;
        const { read } = await readBody(req);
        const sec = db.query("SELECT id, document_id, title FROM sections WHERE id = ?").get(sectionId) as any;
        if (!sec) return notFound();
        if (read) {
          const existing = db.query("SELECT user_id FROM tracking WHERE user_id = ? AND section_id = ?").get(user.id, sectionId);
          if (!existing) {
            db.query("INSERT INTO tracking (user_id, section_id, read_at) VALUES (?, ?, ?)").run(user.id, sectionId, new Date().toISOString());
            db.query("INSERT INTO tracking_history (id, user_id, section_id, action, created_at) VALUES (?, ?, ?, ?, ?)").run(
              crypto.randomUUID(), user.id, sectionId, "read", new Date().toISOString()
            );
            addAuditLog(sec.document_id, user.id, "section_read", `Marked "${sec.title}" as read`);
          }
        } else {
          db.query("DELETE FROM tracking WHERE user_id = ? AND section_id = ?").run(user.id, sectionId);
          db.query("INSERT INTO tracking_history (id, user_id, section_id, action, created_at) VALUES (?, ?, ?, ?, ?)").run(
            crypto.randomUUID(), user.id, sectionId, "unread", new Date().toISOString()
          );
          addAuditLog(sec.document_id, user.id, "section_unread", `Unmarked "${sec.title}"`);
        }
        return json({ ok: true });
      },
    },

    // ─── Search ──────────────────────────────────────────────

    "/api/search": {
      async GET(req) {
        const user = getSessionUser(req);
        if (!user) return unauthorized();
        const url = new URL(req.url);
        const q = url.searchParams.get("q") || "";
        if (!q) return json({ documents: [], sections: [] });
        const like = `%${q}%`;
        const docs = db.query(
          "SELECT DISTINCT d.* FROM documents d LEFT JOIN sections s ON s.document_id = d.id WHERE d.archived = 0 AND (d.title LIKE ? OR s.title LIKE ? OR s.content LIKE ?) ORDER BY d.sort_order"
        ).all(like, like, like);
        const documents = docs.map((doc: any) => {
          const sections = db.query("SELECT * FROM sections WHERE document_id = ? ORDER BY sort_order").all(doc.id);
          return {
            id: doc.id,
            title: doc.title,
            sortOrder: doc.sort_order,
            archived: !!doc.archived,
            dueDate: doc.due_date,
            sections: sections.map((s: any) => ({ id: s.id, title: s.title, content: s.content, sortOrder: s.sort_order })),
          };
        });
        return json({ documents, sections: [] });
      },
    },

    // ─── Audit ───────────────────────────────────────────────

    "/api/documents/:docId/audit": {
      async GET(req) {
        const user = getSessionUser(req);
        if (!user) return unauthorized();
        const { docId } = req.params;
        const entries = db.query(
          "SELECT a.*, u.username FROM audit_log a LEFT JOIN users u ON a.user_id = u.id WHERE a.document_id = ? ORDER BY a.created_at DESC"
        ).all(docId);
        return json(entries.map((e: any) => ({
          id: e.id,
          documentId: e.document_id,
          userId: e.user_id,
          username: e.username,
          action: e.action,
          details: e.details,
          createdAt: e.created_at,
        })));
      },
    },

    "/api/users/:id/audit": {
      async GET(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const { id } = req.params;
        const entries = db.query(
          "SELECT a.*, u.username FROM audit_log a LEFT JOIN users u ON a.user_id = u.id WHERE a.user_id = ? ORDER BY a.created_at DESC LIMIT 100"
        ).all(id);
        return json(entries.map((e: any) => ({
          id: e.id,
          documentId: e.document_id,
          userId: e.user_id,
          username: e.username,
          action: e.action,
          details: e.details,
          createdAt: e.created_at,
        })));
      },
    },

    // ─── Stats ───────────────────────────────────────────────

    "/api/stats": {
      async GET(req) {
        const user = getSessionUser(req);
        if (!user) return unauthorized();
        const totalDocs = (db.query("SELECT COUNT(*) as c FROM documents WHERE archived = 0").get() as any).c;
        const totalUsers = (db.query("SELECT COUNT(*) as c FROM users WHERE role != 'admin'").get() as any).c;
        const totalSections = (db.query("SELECT COUNT(*) as c FROM sections").get() as any).c;
        const staffReadSections = (db.query(
          "SELECT COUNT(DISTINCT t.section_id) as c FROM tracking t JOIN users u ON t.user_id = u.id WHERE u.role != 'admin'"
        ).get() as any).c;
        const overallCompletion = totalSections > 0 && totalUsers > 0
          ? Math.round((staffReadSections / (totalSections * totalUsers)) * 100)
          : 0;
        const archivedDocs = (db.query("SELECT COUNT(*) as c FROM documents WHERE archived = 1").get() as any).c;
        return json({ totalDocs, totalUsers, totalSections, overallCompletion, archivedDocs });
      },
    },

    "/api/trend": {
      async GET(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const totalSections = (db.query("SELECT COUNT(*) as c FROM sections").get() as any).c;
        const totalStaff = (db.query("SELECT COUNT(*) as c FROM users WHERE role != 'admin'").get() as any).c;
        const maxPossible = totalSections * totalStaff;

        const history = db.query(
          "SELECT DATE(created_at) as day, action, COUNT(*) as cnt FROM tracking_history GROUP BY day, action ORDER BY day"
        ).all() as any[];

        const dayMap = new Map<string, { read: number; unread: number }>();
        for (const row of history) {
          const existing = dayMap.get(row.day) || { read: 0, unread: 0 };
          if (row.action === "read") existing.read += row.cnt;
          else existing.unread += row.cnt;
          dayMap.set(row.day, existing);
        }

        let cumulative = 0;
        const trend = Array.from(dayMap.entries()).map(([day, counts]) => {
          cumulative += counts.read - counts.unread;
          const pct = maxPossible > 0 ? Math.round((Math.max(0, cumulative) / maxPossible) * 100) : 0;
          return { date: day, completionPct: pct, readCount: counts.read, unreadCount: counts.unread };
        });

        return json({ trend, totalSections, totalStaff, maxPossible });
      },
    },

    // ─── Tags ────────────────────────────────────────────────

    "/api/documents/:docId/tags": {
      async GET(req) {
        const user = getSessionUser(req);
        if (!user) return unauthorized();
        const { docId } = req.params;
        const tags = db.query("SELECT tag FROM document_tags WHERE document_id = ?").all(docId).map((t: any) => t.tag);
        return json({ tags });
      },

      async POST(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const { docId } = req.params;
        const { tag } = await readBody(req);
        if (!tag || !tag.trim()) return json({ error: "Tag required" }, 400);
        const trimmed = tag.trim().toLowerCase();
        const existing = db.query("SELECT tag FROM document_tags WHERE document_id = ? AND tag = ?").get(docId, trimmed);
        if (!existing) {
          db.query("INSERT INTO document_tags (document_id, tag) VALUES (?, ?)").run(docId, trimmed);
        }
        return json({ ok: true });
      },

      async DELETE(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const { docId } = req.params;
        const url = new URL(req.url);
        const tag = url.searchParams.get("tag");
        if (!tag) return json({ error: "Tag param required" }, 400);
        db.query("DELETE FROM document_tags WHERE document_id = ? AND tag = ?").run(docId, tag.toLowerCase());
        return json({ ok: true });
      },
    },

    // ─── Section Versions ────────────────────────────────────

    "/api/sections/:id/versions": {
      async GET(req) {
        const user = getSessionUser(req);
        if (!user) return unauthorized();
        const { id } = req.params;
        const versions = db.query(
          "SELECT v.*, u.display_name as editor_name FROM section_versions v LEFT JOIN users u ON v.edited_by = u.id WHERE v.section_id = ? ORDER BY v.created_at DESC"
        ).all(id);
        return json(versions.map((v: any) => ({
          id: v.id,
          sectionId: v.section_id,
          title: v.title,
          content: v.content,
          editedBy: v.edited_by,
          editorName: v.editor_name,
          createdAt: v.created_at,
        })));
      },
    },

    "/api/sections/:id/restore": {
      async POST(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const { id } = req.params;
        const { versionId } = await readBody(req);
        const version = db.query("SELECT * FROM section_versions WHERE id = ? AND section_id = ?").get(versionId, id) as any;
        if (!version) return notFound();
        const section = db.query("SELECT * FROM sections WHERE id = ?").get(id) as any;
        if (!section) return notFound();
        db.query("UPDATE sections SET title = ?, content = ?, updated_at = ? WHERE id = ?").run(version.title, version.content, new Date().toISOString(), id);
        addAuditLog(section.document_id, user.id, "section_restore", `Restored "${version.title}" to version from ${new Date(version.created_at).toLocaleDateString()}`);
        return json({ ok: true });
      },
    },

    // ─── Import / Export ─────────────────────────────────────

    "/api/export": {
      async GET(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const docs = db.query("SELECT * FROM documents ORDER BY sort_order").all();
        const allSections = db.query("SELECT * FROM sections ORDER BY sort_order").all();
        const allTags = db.query("SELECT * FROM document_tags").all();
        const allUsers = db.query("SELECT id, username, display_name, role, created_at FROM users").all();
        const allTracking = db.query("SELECT * FROM tracking").all();
        const allAudit = db.query("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 500").all();
        return json({
          exportedAt: new Date().toISOString(),
          documents: docs,
          sections: allSections,
          tags: allTags,
          users: allUsers,
          tracking: allTracking,
          auditLog: allAudit,
        });
      },
    },

    "/api/import": {
      async POST(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const data = await readBody(req);
        if (!data || !data.documents) return json({ error: "Invalid import data" }, 400);

        db.exec("PRAGMA foreign_keys = OFF");

        for (const doc of data.documents) {
          const existing = db.query("SELECT id FROM documents WHERE id = ?").get(doc.id);
          if (existing) {
            db.query("UPDATE documents SET title = ?, sort_order = ?, archived = ?, due_date = ?, created_at = ? WHERE id = ?").run(
              doc.title, doc.sort_order ?? 0, doc.archived ? 1 : 0, doc.due_date ?? null, doc.created_at ?? new Date().toISOString(), doc.id
            );
          } else {
            db.query("INSERT OR IGNORE INTO documents (id, title, sort_order, archived, due_date, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
              doc.id, doc.title, doc.sort_order ?? 0, doc.archived ? 1 : 0, doc.due_date ?? null, doc.created_at ?? new Date().toISOString()
            );
          }
        }

        if (data.sections) {
          for (const sec of data.sections) {
            const existing = db.query("SELECT id FROM sections WHERE id = ?").get(sec.id);
            if (existing) {
              db.query("UPDATE sections SET title = ?, content = ?, sort_order = ?, updated_at = ? WHERE id = ?").run(
                sec.title, sec.content, sec.sort_order ?? 0, sec.updated_at ?? new Date().toISOString(), sec.id
              );
            } else {
              db.query("INSERT OR IGNORE INTO sections (id, document_id, title, content, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
                sec.id, sec.document_id, sec.title, sec.content, sec.sort_order ?? 0, sec.created_at ?? new Date().toISOString(), sec.updated_at ?? new Date().toISOString()
              );
            }
          }
        }

        if (data.tags) {
          for (const t of data.tags) {
            db.query("INSERT OR IGNORE INTO document_tags (document_id, tag) VALUES (?, ?)").run(t.document_id, t.tag);
          }
        }

        db.exec("PRAGMA foreign_keys = ON");
        addAuditLog(null, user.id, "data_import", `Imported ${data.documents?.length ?? 0} documents`);
        return json({ ok: true, imported: { documents: data.documents?.length ?? 0, sections: data.sections?.length ?? 0 } });
      },
    },

    // ─── Departments ─────────────────────────────────────────

    "/api/departments": {
      async GET(req) {
        const user = getSessionUser(req);
        if (!user) return unauthorized();
        const depts = db.query("SELECT * FROM departments ORDER BY sort_order").all();
        return json(depts.map((d: any) => ({
          id: d.id,
          name: d.name,
          slug: d.slug,
          color: d.color,
          icon: d.icon,
          sortOrder: d.sort_order,
          createdAt: d.created_at,
        })));
      },

      async POST(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const { name, color, icon } = await readBody(req);
        if (!name || !name.trim()) return json({ error: "Name required" }, 400);
        const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        const existing = db.query("SELECT id FROM departments WHERE slug = ?").get(slug);
        if (existing) return json({ error: "Department already exists" }, 409);
        const id = `dept-${crypto.randomUUID()}`;
        const now = new Date().toISOString();
        const maxOrder = (db.query("SELECT MAX(sort_order) as m FROM departments").get() as any).m ?? -1;
        db.query(
          "INSERT INTO departments (id, name, slug, color, icon, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).run(id, name.trim(), slug, color || "#5C3A1E", icon || "building", maxOrder + 1, now);
        addAuditLog(null, user.id, "department_create", `Created department "${name.trim()}"`);
        return json({ id, name: name.trim(), slug, color: color || "#5C3A1E", icon: icon || "building", sortOrder: maxOrder + 1 }, 201);
      },
    },

    "/api/departments/:id": {
      async PUT(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const { id } = req.params;
        const dept = db.query("SELECT * FROM departments WHERE id = ?").get(id) as any;
        if (!dept) return notFound();
        const body = await readBody(req);
        const name = body.name ?? dept.name;
        const color = body.color ?? dept.color;
        const icon = body.icon ?? dept.icon;
        const sortOrder = body.sortOrder ?? dept.sort_order;
        db.query("UPDATE departments SET name = ?, color = ?, icon = ?, sort_order = ? WHERE id = ?").run(name, color, icon, sortOrder, id);
        addAuditLog(null, user.id, "department_update", `Updated department "${name}"`);
        return json({ ok: true });
      },

      async DELETE(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const { id } = req.params;
        const dept = db.query("SELECT * FROM departments WHERE id = ?").get(id) as any;
        if (!dept) return notFound();
        db.query("UPDATE documents SET department_id = NULL WHERE department_id = ?").run(id);
        db.query("DELETE FROM announcement_departments WHERE department_id = ?").run(id);
        db.query("DELETE FROM user_departments WHERE department_id = ?").run(id);
        db.query("DELETE FROM department_webhooks WHERE department_id = ?").run(id);
        db.query("DELETE FROM departments WHERE id = ?").run(id);
        addAuditLog(null, user.id, "department_delete", `Deleted department "${dept.name}"`);
        return json({ ok: true });
      },
    },

    // ─── Department Webhooks (phone numbers only) ─────────────

    "/api/departments/:id/webhook": {
      async GET(req) {
        const user = getSessionUser(req);
        if (!user) return unauthorized();
        const { id } = req.params;
        const row = db.query("SELECT phone_number FROM department_webhooks WHERE department_id = ?").get(id) as any;
        return json({ phoneNumber: row?.phone_number || null });
      },

      async PUT(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const { id } = req.params;
        const { phoneNumber } = await readBody(req);
        const existing = db.query("SELECT department_id FROM department_webhooks WHERE department_id = ?").get(id);
        if (existing) {
          db.query("UPDATE department_webhooks SET phone_number = ? WHERE department_id = ?").run(phoneNumber || null, id);
        } else if (phoneNumber) {
          db.query("INSERT INTO department_webhooks (department_id, phone_number) VALUES (?, ?)").run(id, phoneNumber);
        }
        return json({ ok: true });
      },
    },

    // ─── Global Webhook URL ──────────────────────────────────

    "/api/settings/webhook": {
      async GET(req) {
        const user = getSessionUser(req);
        if (!user) return unauthorized();
        const row = db.query("SELECT value FROM system_settings WHERE key = 'webhook_url'").get() as any;
        return json({ webhookUrl: row?.value || null });
      },

      async PUT(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const { webhookUrl } = await readBody(req);
        const existing = db.query("SELECT key FROM system_settings WHERE key = 'webhook_url'").get();
        if (existing) {
          db.query("UPDATE system_settings SET value = ? WHERE key = 'webhook_url'").run(webhookUrl || null);
        } else if (webhookUrl) {
          db.query("INSERT INTO system_settings (key, value) VALUES ('webhook_url', ?)").run(webhookUrl);
        }
        return json({ ok: true });
      },
    },

    // ─── Announcements ───────────────────────────────────────

    "/api/announcements": {
      async GET(req) {
        const user = getSessionUser(req);
        if (!user) return unauthorized();
        const now = new Date().toISOString();

        // Get user's department IDs
        const userDeptRows = db.query("SELECT department_id FROM user_departments WHERE user_id = ?").all(user.id) as any[];
        const userDeptIds = userDeptRows.map((r) => r.department_id);

        // Fetch all non-expired announcements
        const rows = db.query(
          `SELECT a.*, u.display_name as author_name
           FROM announcements a
           LEFT JOIN users u ON a.created_by = u.id
           WHERE (a.expires_at IS NULL OR a.expires_at > ?)
           ORDER BY a.is_pinned DESC, a.sort_order ASC, a.priority DESC, a.created_at DESC`
        ).all(now) as any[];

        // Filter by department membership (admins see all)
        const filtered = user.role === "admin" ? rows : rows.filter((r: any) => {
          const annDeptRows = db.query("SELECT department_id FROM announcement_departments WHERE announcement_id = ?").all(r.id) as any[];
          // If no departments targeted → visible to all
          if (annDeptRows.length === 0) return true;
          // Otherwise, visible if user has at least one matching department
          return annDeptRows.some((ad: any) => userDeptIds.includes(ad.department_id));
        });

        return json(filtered.map((r: any) => {
          const annDeptRows = db.query(
            `SELECT d.id, d.name, d.color FROM departments d JOIN announcement_departments ad ON d.id = ad.department_id WHERE ad.announcement_id = ?`
          ).all(r.id) as any[];
          return {
            id: r.id,
            title: r.title,
            content: r.content,
            type: r.type,
            departmentIds: annDeptRows.map((d: any) => d.id),
            departmentNames: annDeptRows.map((d: any) => d.name),
            departmentColors: annDeptRows.map((d: any) => d.color),
            priority: r.priority,
            isPinned: !!r.is_pinned,
            imageUrl: r.image_url,
            emoji: r.emoji,
            gridSize: r.grid_size || 'medium',
            sendToWebhook: !!r.send_to_webhook,
            sortOrder: r.sort_order,
            expiresAt: r.expires_at,
            createdBy: r.created_by,
            authorName: r.author_name,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          };
        }));
      },

      async POST(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const { title, content, type, departmentIds, priority, isPinned, imageUrl, emoji, gridSize, sendToWebhook, expiresAt } = await readBody(req);
        if (!title || !title.trim()) return json({ error: "Title required" }, 400);
        const id = `ann-${crypto.randomUUID()}`;
        const now = new Date().toISOString();
        const maxOrder = (db.query("SELECT MAX(sort_order) as m FROM announcements").get() as any).m ?? -1;
        db.query(
          `INSERT INTO announcements (id, title, content, type, priority, is_pinned, image_url, emoji, grid_size, send_to_webhook, sort_order, expires_at, created_by, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          id, title.trim(), content || "", type || "info",
          priority ?? 0, isPinned ? 1 : 0,
          imageUrl || null, emoji || null, gridSize || "medium", sendToWebhook ? 1 : 0, maxOrder + 1,
          expiresAt || null, user.id, now, now
        );

        // Insert department associations
        if (Array.isArray(departmentIds) && departmentIds.length > 0) {
          for (const deptId of departmentIds) {
            db.run("INSERT OR IGNORE INTO announcement_departments (announcement_id, department_id) VALUES (?, ?)", [id, deptId]);
          }
        }

        // Fire webhooks if enabled
        if (sendToWebhook) {
          const globalWebhook = db.query("SELECT value FROM system_settings WHERE key = 'webhook_url'").get() as any;
          if (globalWebhook?.value) {
            // Get phone numbers for targeted departments
            const targetDepts = Array.isArray(departmentIds) && departmentIds.length > 0
              ? departmentIds
              : [];
            const deptPhones = targetDepts.length > 0
              ? db.query(`SELECT d.id, d.name, dw.phone_number FROM departments d LEFT JOIN department_webhooks dw ON d.id = dw.department_id WHERE d.id IN (${targetDepts.map(() => "?").join(",")})`).all(...targetDepts) as any[]
              : [];

            const payload = {
              type: "announcement",
              title: title.trim(),
              content: content || "",
              image_url: imageUrl || null,
              emoji: emoji || null,
              departments: deptPhones.map((d: any) => ({ id: d.id, name: d.name, phone_number: d.phone_number || null })),
              priority: ["normal", "high", "urgent"][priority ?? 0] || "normal",
              author: user.display_name,
              created_at: now,
            };
            fireWebhook(globalWebhook.value, payload);
          }
        }

        addAuditLog(null, user.id, "announcement_create", `Created announcement "${title.trim()}"`);
        return json({ id }, 201);
      },
    },

    "/api/announcements/:id": {
      async PUT(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const { id } = req.params;
        const ann = db.query("SELECT * FROM announcements WHERE id = ?").get(id) as any;
        if (!ann) return notFound();
        const body = await readBody(req);
        const now = new Date().toISOString();
        db.query(
          `UPDATE announcements SET title = ?, content = ?, type = ?, priority = ?, is_pinned = ?, image_url = ?, emoji = ?, grid_size = ?, send_to_webhook = ?, expires_at = ?, updated_at = ? WHERE id = ?`
        ).run(
          body.title ?? ann.title,
          body.content !== undefined ? body.content : ann.content,
          body.type ?? ann.type,
          body.priority ?? ann.priority,
          body.isPinned !== undefined ? (body.isPinned ? 1 : 0) : ann.is_pinned,
          body.imageUrl !== undefined ? (body.imageUrl || null) : ann.image_url,
          body.emoji !== undefined ? (body.emoji || null) : ann.emoji,
          body.gridSize ?? ann.grid_size,
          body.sendToWebhook !== undefined ? (body.sendToWebhook ? 1 : 0) : ann.send_to_webhook,
          body.expiresAt !== undefined ? (body.expiresAt || null) : ann.expires_at,
          now, id
        );

        // Update department associations if provided
        if (body.departmentIds !== undefined) {
          db.query("DELETE FROM announcement_departments WHERE announcement_id = ?").run(id);
          if (Array.isArray(body.departmentIds)) {
            for (const deptId of body.departmentIds) {
              db.run("INSERT OR IGNORE INTO announcement_departments (announcement_id, department_id) VALUES (?, ?)", [id, deptId]);
            }
          }
        }

        addAuditLog(null, user.id, "announcement_update", `Updated announcement "${body.title ?? ann.title}"`);
        return json({ ok: true });
      },

      async DELETE(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const { id } = req.params;
        const ann = db.query("SELECT * FROM announcements WHERE id = ?").get(id) as any;
        if (!ann) return notFound();
        db.query("DELETE FROM announcements WHERE id = ?").run(id);
        addAuditLog(null, user.id, "announcement_delete", `Deleted announcement "${ann.title}"`);
        return json({ ok: true });
      },
    },

    "/api/announcements/reorder": {
      async PUT(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const { order } = await readBody(req);
        if (!Array.isArray(order)) return json({ error: "order array required" }, 400);
        for (const item of order) {
          db.query("UPDATE announcements SET sort_order = ? WHERE id = ?").run(item.sort_order, item.id);
        }
        return json({ ok: true });
      },
    },

    // ─── Banners ─────────────────────────────────────────────

    "/api/banners": {
      async GET(req) {
        const user = getSessionUser(req);
        if (!user) return unauthorized();

        // Get user's department IDs
        const userDeptRows = db.query("SELECT department_id FROM user_departments WHERE user_id = ?").all(user.id) as any[];
        const userDeptIds = userDeptRows.map((r) => r.department_id);

        const rows = db.query("SELECT * FROM banners WHERE is_active = 1 ORDER BY sort_order").all() as any[];

        // Filter banners by department (if banner has a department association)
        const filtered = rows.filter((r: any) => {
          // For now, banners are not department-scoped (show to all)
          return true;
        });

        return json(filtered.map((r: any) => ({
          id: r.id,
          title: r.title,
          subtitle: r.subtitle,
          bgColor: r.bg_color,
          textColor: r.text_color,
          gradient: r.gradient,
          imageUrl: r.image_url,
          linkUrl: r.link_url,
          sortOrder: r.sort_order,
          isActive: !!r.is_active,
          sendToWebhook: !!r.send_to_webhook,
          createdAt: r.created_at,
        })));
      },

      async POST(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const { title, subtitle, bgColor, textColor, gradient, imageUrl, linkUrl, sendToWebhook } = await readBody(req);
        if (!title || !title.trim()) return json({ error: "Title required" }, 400);
        const id = `banner-${crypto.randomUUID()}`;
        const now = new Date().toISOString();
        const maxOrder = (db.query("SELECT MAX(sort_order) as m FROM banners").get() as any).m ?? -1;
        db.query(
          `INSERT INTO banners (id, title, subtitle, bg_color, text_color, gradient, image_url, link_url, sort_order, is_active, send_to_webhook, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
        ).run(id, title.trim(), subtitle || "", bgColor || "#5C3A1E", textColor || "#FFFFFF", gradient || null, imageUrl || null, linkUrl || null, maxOrder + 1, sendToWebhook ? 1 : 0, now);

        // Fire webhooks if enabled
        if (sendToWebhook) {
          const globalWebhook = db.query("SELECT value FROM system_settings WHERE key = 'webhook_url'").get() as any;
          if (globalWebhook?.value) {
            // Get all departments with phone numbers
            const deptPhones = db.query(
              `SELECT d.id, d.name, dw.phone_number FROM departments d LEFT JOIN department_webhooks dw ON d.id = dw.department_id WHERE dw.phone_number IS NOT NULL`
            ).all() as any[];

            const payload = {
              type: "banner",
              title: title.trim(),
              content: subtitle || "",
              image_url: imageUrl || null,
              departments: deptPhones.map((d: any) => ({ id: d.id, name: d.name, phone_number: d.phone_number })),
              author: user.display_name,
              created_at: now,
            };
            fireWebhook(globalWebhook.value, payload);
          }
        }

        addAuditLog(null, user.id, "banner_create", `Created banner "${title.trim()}"`);
        return json({ id }, 201);
      },
    },

    "/api/banners/:id": {
      async PUT(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const { id } = req.params;
        const banner = db.query("SELECT * FROM banners WHERE id = ?").get(id) as any;
        if (!banner) return notFound();
        const body = await readBody(req);
        db.query(
          `UPDATE banners SET title = ?, subtitle = ?, bg_color = ?, text_color = ?, gradient = ?, image_url = ?, link_url = ?, sort_order = ?, is_active = ? WHERE id = ?`
        ).run(
          body.title ?? banner.title,
          body.subtitle !== undefined ? body.subtitle : banner.subtitle,
          body.bgColor ?? banner.bg_color,
          body.textColor ?? banner.text_color,
          body.gradient !== undefined ? (body.gradient || null) : banner.gradient,
          body.imageUrl !== undefined ? (body.imageUrl || null) : banner.image_url,
          body.linkUrl !== undefined ? (body.linkUrl || null) : banner.link_url,
          body.sortOrder ?? banner.sort_order,
          body.isActive !== undefined ? (body.isActive ? 1 : 0) : banner.is_active,
          id
        );
        addAuditLog(null, user.id, "banner_update", `Updated banner "${body.title ?? banner.title}"`);
        return json({ ok: true });
      },

      async DELETE(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const { id } = req.params;
        const banner = db.query("SELECT * FROM banners WHERE id = ?").get(id) as any;
        if (!banner) return notFound();
        db.query("DELETE FROM banners WHERE id = ?").run(id);
        addAuditLog(null, user.id, "banner_delete", `Deleted banner "${banner.title}"`);
        return json({ ok: true });
      },
    },

    // ─── Due Dates Dashboard ─────────────────────────────────

    "/api/due-dates": {
      async GET(req) {
        const user = getSessionUser(req);
        if (!user) return unauthorized();
        const now = new Date().toISOString();
        const docs = db.query(
          "SELECT * FROM documents WHERE due_date IS NOT NULL AND archived = 0 ORDER BY due_date ASC"
        ).all();
        const result = (docs as any[]).map((doc) => {
          const totalSec = (db.query("SELECT COUNT(*) as c FROM sections WHERE document_id = ?").get(doc.id) as any).c;
          let readSec = 0;
          if (user.role !== "admin") {
            readSec = (db.query(
              "SELECT COUNT(*) as c FROM tracking t JOIN sections s ON t.section_id = s.id WHERE s.document_id = ? AND t.user_id = ?"
            ).get(doc.id, user.id) as any).c;
          } else {
            readSec = totalSec;
          }
          const isOverdue = doc.due_date < now;
          const daysLeft = Math.ceil((new Date(doc.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          return {
            id: doc.id,
            title: doc.title,
            dueDate: doc.due_date,
            isOverdue,
            daysLeft,
            totalSections: totalSec,
            readSections: readSec,
            completionPct: totalSec > 0 ? Math.round((readSec / totalSec) * 100) : 0,
          };
        });
        return json(result);
      },
    },

    // ─── Static Uploads ───────────────────────────────────────

    "/uploads/:filename": {
      async GET(req) {
        const { filename } = req.params;
        // Prevent path traversal
        if (filename.includes("..") || filename.includes("/")) {
          return notFound();
        }
        const filePath = join(UPLOADS_DIR, filename);
        if (!existsSync(filePath)) {
          return notFound();
        }
        const data = readFileSync(filePath);
        const ext = extname(filename).toLowerCase();
        const mimeTypes: Record<string, string> = {
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".png": "image/png",
          ".gif": "image/gif",
          ".webp": "image/webp",
        };
        return new Response(data, {
          headers: {
            "Content-Type": mimeTypes[ext] || "application/octet-stream",
            "Cache-Control": "public, max-age=86400",
          },
        });
      },
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`Server running at ${server.url}`);
