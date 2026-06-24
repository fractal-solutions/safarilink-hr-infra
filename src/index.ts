import { serve } from "bun";
import index from "./index.html";
import db, { getSessionUser, createSession, setSessionCookie, clearSessionCookie, addAuditLog } from "./db";

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
        const { username, password } = await readBody(req);
        if (!username || !password) return json({ error: "Username and password required" }, 400);

        const user = db.query("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password) as any;
        if (!user) return json({ error: "Invalid username or password" }, 401);

        const token = createSession(user.id);
        const res = json({ user: { id: user.id, username: user.username, displayName: user.display_name, email: user.email, role: user.role } });
        return cookieSet(res, token);
      },
    },

    "/api/auth/register": {
      async POST(req) {
        const { username, password, displayName } = await readBody(req);
        if (!username || !password || !displayName) return json({ error: "All fields required" }, 400);

        const existing = db.query("SELECT id FROM users WHERE username = ?").get(username);
        if (existing) return json({ error: "Username already exists" }, 409);

        const id = `usr-${crypto.randomUUID()}`;
        const now = new Date().toISOString();
        db.query(
          "INSERT INTO users (id, username, password, display_name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)"
        ).run(id, username, password, displayName, "user", now);

        const token = createSession(id);
        const res = json({ user: { id, username, displayName, email: null, role: "user" } });
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
        return json({ user: { id: user.id, username: user.username, displayName: user.display_name, email: user.email, role: user.role } });
      },
    },

    // ─── Users ───────────────────────────────────────────────

    "/api/users": {
      async GET(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const users = db.query("SELECT id, username, display_name, email, role, created_at FROM users").all();
        return json({ users: users.map((u: any) => ({ id: u.id, username: u.username, displayName: u.display_name, email: u.email, role: u.role, createdAt: u.created_at })) });
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
        if (id === "usr-admin") return json({ error: "Cannot delete default admin" }, 400);
        const target = db.query("SELECT id FROM users WHERE id = ?").get(id);
        if (!target) return notFound();
        db.query("DELETE FROM users WHERE id = ?").run(id);
        addAuditLog(null, user.id, "user_delete", `Deleted user ${id}`);
        return json({ ok: true });
      },
    },

    // ─── Documents ───────────────────────────────────────────

    "/api/documents": {
      async GET(req) {
        const user = getSessionUser(req);
        if (!user) return unauthorized();
        const url = new URL(req.url);
        const archived = url.searchParams.get("archived") === "true" ? 1 : 0;
        const docs = db.query("SELECT * FROM documents WHERE archived = ? ORDER BY sort_order").all(archived);
        const result = docs.map((doc: any) => {
          const sections = db.query("SELECT * FROM sections WHERE document_id = ? ORDER BY sort_order").all(doc.id);
          const tags = db.query("SELECT tag FROM document_tags WHERE document_id = ?").all(doc.id).map((t: any) => t.tag);
          return {
            id: doc.id,
            title: doc.title,
            sortOrder: doc.sort_order,
            archived: !!doc.archived,
            dueDate: doc.due_date,
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
        const { title } = await readBody(req);
        if (!title) return json({ error: "Title required" }, 400);
        const id = `doc-${crypto.randomUUID()}`;
        const now = new Date().toISOString();
        const maxOrder = (db.query("SELECT MAX(sort_order) as m FROM documents").get() as any).m ?? -1;
        db.query(
          "INSERT INTO documents (id, title, sort_order, archived, created_at) VALUES (?, ?, ?, ?, ?)"
        ).run(id, title, maxOrder + 1, 0, now);
        addAuditLog(id, user.id, "document_create", `Created document "${title}"`);
        return json({ id, title, sortOrder: maxOrder + 1, archived: false, sections: [] }, 201);
      },
    },

    "/api/documents/reorder": {
      async PUT(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const { order } = await readBody(req);
        if (!Array.isArray(order)) return json({ error: "order array required" }, 400);
        for (const item of order) {
          db.query("UPDATE documents SET sort_order = ? WHERE id = ?").run(item.sort_order, item.id);
        }
        return json({ ok: true });
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
        const now = new Date().toISOString();
        db.query("UPDATE documents SET title = ?, archived = ?, due_date = ?, updated_at = ? WHERE id = ?").run(title, archived, dueDate, now, id);
        addAuditLog(id, user.id, "document_update", `Updated document "${title}"`);
        return json({ ok: true });
      },

      async DELETE(req) {
        const user = getSessionUser(req);
        if (!user || user.role !== "admin") return forbidden();
        const { id } = req.params;
        const doc = db.query("SELECT * FROM documents WHERE id = ?").get(id) as any;
        if (!doc) return notFound();
        db.query("DELETE FROM documents WHERE id = ?").run(id);
        addAuditLog(id, user.id, "document_delete", `Deleted document "${doc.title}"`);
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
          "INSERT INTO documents (id, title, sort_order, archived, due_date, created_at) VALUES (?, ?, ?, ?, ?, ?)"
        ).run(newDocId, `${doc.title} (Copy)`, maxOrder + 1, doc.archived, doc.due_date, now);

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
        const sec = db.query("SELECT id FROM sections WHERE id = ?").get(sectionId);
        if (!sec) return notFound();
        if (read) {
          const existing = db.query("SELECT user_id FROM tracking WHERE user_id = ? AND section_id = ?").get(user.id, sectionId);
          if (!existing) {
            db.query("INSERT INTO tracking (user_id, section_id, read_at) VALUES (?, ?, ?)").run(user.id, sectionId, new Date().toISOString());
          }
        } else {
          db.query("DELETE FROM tracking WHERE user_id = ? AND section_id = ?").run(user.id, sectionId);
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
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`Server running at ${server.url}`);
