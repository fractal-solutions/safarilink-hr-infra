import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

const DATA_DIR = join(import.meta.dir, "..", "data");
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(join(DATA_DIR, "safarilink.db"));

db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    display_name TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    archived INTEGER NOT NULL DEFAULT 0,
    due_date TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sections (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tracking (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    read_at TEXT NOT NULL,
    PRIMARY KEY (user_id, section_id)
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id),
    action TEXT NOT NULL,
    details TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS document_tags (
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    PRIMARY KEY (document_id, tag)
  );

  CREATE TABLE IF NOT EXISTS section_versions (
    id TEXT PRIMARY KEY,
    section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    edited_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    color TEXT NOT NULL DEFAULT '#5C3A1E',
    icon TEXT DEFAULT 'building',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL DEFAULT 'info',
    department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    is_pinned INTEGER NOT NULL DEFAULT 0,
    image_url TEXT,
    emoji TEXT,
    grid_size TEXT NOT NULL DEFAULT 'medium',
    sort_order INTEGER NOT NULL DEFAULT 0,
    expires_at TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS banners (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT DEFAULT '',
    bg_color TEXT NOT NULL DEFAULT '#5C3A1E',
    text_color TEXT NOT NULL DEFAULT '#FFFFFF',
    gradient TEXT,
    image_url TEXT,
    link_url TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );
`);

// Migration: add email column if missing
try {
  db.exec("ALTER TABLE users ADD COLUMN email TEXT");
  console.log("Migration: added email column to users");
} catch (e: any) {
  if (!e.message?.includes("duplicate column")) console.error("Migration email:", e.message);
}

// Migration: add theme column to users
try {
  db.exec("ALTER TABLE users ADD COLUMN theme TEXT NOT NULL DEFAULT 'safari'");
  console.log("Migration: added theme column to users");
} catch (e: any) {
  if (!e.message?.includes("duplicate column")) console.error("Migration theme:", e.message);
}

// Migration: add payroll_id column to users
try {
  db.exec("ALTER TABLE users ADD COLUMN payroll_id TEXT");
  console.log("Migration: added payroll_id column to users");
} catch (e: any) {
  if (!e.message?.includes("duplicate column")) console.error("Migration payroll_id:", e.message);
}

// Migration: add deleted_at column for soft delete
try {
  db.exec("ALTER TABLE documents ADD COLUMN deleted_at TEXT");
  console.log("Migration: added deleted_at column to documents");
} catch (e: any) {
  if (!e.message?.includes("duplicate column")) console.error("Migration deleted_at:", e.message);
}

// Migration: add updated_at column to documents
try {
  db.exec("ALTER TABLE documents ADD COLUMN updated_at TEXT");
  console.log("Migration: added updated_at column to documents");
} catch (e: any) {
  if (!e.message?.includes("duplicate column")) console.error("Migration documents updated_at:", e.message);
}

// Migration: add department_id column to documents
try {
  db.exec("ALTER TABLE documents ADD COLUMN department_id TEXT REFERENCES departments(id) ON DELETE SET NULL");
  console.log("Migration: added department_id column to documents");
} catch (e: any) {
  if (!e.message?.includes("duplicate column")) console.error("Migration department_id:", e.message);
}

// Migration: add image_url and emoji to announcements
try {
  db.exec("ALTER TABLE announcements ADD COLUMN image_url TEXT");
  console.log("Migration: added image_url to announcements");
} catch (e: any) {
  if (!e.message?.includes("duplicate column")) console.error("Migration announcements image_url:", e.message);
}
try {
  db.exec("ALTER TABLE announcements ADD COLUMN emoji TEXT");
  console.log("Migration: added emoji to announcements");
} catch (e: any) {
  if (!e.message?.includes("duplicate column")) console.error("Migration announcements emoji:", e.message);
}
try {
  db.exec("ALTER TABLE announcements ADD COLUMN grid_size TEXT NOT NULL DEFAULT 'medium'");
  console.log("Migration: added grid_size to announcements");
} catch (e: any) {
  if (!e.message?.includes("duplicate column")) console.error("Migration announcements grid_size:", e.message);
}
try {
  db.exec("ALTER TABLE announcements ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0");
  console.log("Migration: added sort_order to announcements");
} catch (e: any) {
  if (!e.message?.includes("duplicate column")) console.error("Migration announcements sort_order:", e.message);
}

// Migration: add gradient and image_url to banners
try {
  db.exec("ALTER TABLE banners ADD COLUMN gradient TEXT");
  console.log("Migration: added gradient to banners");
} catch (e: any) {
  if (!e.message?.includes("duplicate column")) console.error("Migration banners gradient:", e.message);
}
try {
  db.exec("ALTER TABLE banners ADD COLUMN image_url TEXT");
  console.log("Migration: added image_url to banners");
} catch (e: any) {
  if (!e.message?.includes("duplicate column")) console.error("Migration banners image_url:", e.message);
}

// Tracking history table for trend data
db.exec(`
  CREATE TABLE IF NOT EXISTS tracking_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`);

const userCount = db.query("SELECT COUNT(*) as cnt FROM users").get() as any;
if (userCount.cnt === 0) {
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO users (id, username, password, display_name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    ["usr-admin", "admin", "1234", "Administrator", "admin", now]
  );

  db.run(
    `INSERT INTO departments (id, name, slug, color, icon, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ["dept-hr", "Human Resources", "hr", "#5C3A1E", "users", 0, now]
  );
  db.run(
    `INSERT INTO departments (id, name, slug, color, icon, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ["dept-finance", "Finance", "finance", "#1E5C3A", "calculator", 1, now]
  );
  db.run(
    `INSERT INTO departments (id, name, slug, color, icon, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ["dept-ops", "Operations", "operations", "#3A1E5C", "settings", 2, now]
  );

  db.run(
    `INSERT INTO documents (id, title, sort_order, archived, created_at, department_id) VALUES (?, ?, ?, ?, ?, ?)`,
    ["doc-1", "Safarilink Ground Operations Policy", 0, 0, now, "dept-ops"]
  );

  db.run(
    `INSERT INTO sections (id, document_id, title, content, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      "sec-1-1",
      "doc-1",
      "1.1 Ramp Safety Standards",
      "<p>All ground staff must wear high-visibility vests and steel-toed boots inside active line parameters.</p><p><strong>Zero-tolerance restriction:</strong> Mobile devices are forbidden during fueling matrices.</p>",
      0,
      now,
      now,
    ]
  );
  db.run(
    `INSERT INTO sections (id, document_id, title, content, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      "sec-1-2",
      "doc-1",
      "1.2 Dangerous Goods Handling",
      "<p>Lithium-ion arrays must meet standard IATA criteria before loading initialization procedures execute.</p>",
      1,
      now,
      now,
    ]
  );

  db.run(
    `INSERT INTO documents (id, title, sort_order, archived, created_at, department_id) VALUES (?, ?, ?, ?, ?, ?)`,
    ["doc-2", "In-Flight Cabin Crew Procedures", 1, 0, now, "dept-hr"]
  );

  db.run(
    `INSERT INTO sections (id, document_id, title, content, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      "sec-2-1",
      "doc-2",
      "2.1 Pre-Flight Briefing Protocol",
      "<p>Cabin configurations require comprehensive audits prior to passenger ingress. Ensure checklists lock down cleanly.</p>",
      0,
      now,
      now,
    ]
  );

  console.log("Database seeded with default admin, departments, and documents.");
}

export default db;

export function getSessionUser(req: Request): any | null {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/session=([^;]+)/);
  if (!match) return null;
  const token = match[1];

  const session = db.query("SELECT * FROM sessions WHERE token = ?").get(token) as any;
  if (!session) return null;

  if (new Date(session.expires_at) < new Date()) {
    db.run("DELETE FROM sessions WHERE token = ?", [token]);
    return null;
  }

  const user = db.query("SELECT * FROM users WHERE id = ?").get(session.user_id) as any;
  if (!user) return null;

  return user;
}

export function createSession(userId: string): string {
  const token = crypto.randomUUID();
  const now = new Date();
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  db.run(
    "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
    [token, userId, now.toISOString(), expires.toISOString()]
  );
  return token;
}

export function setSessionCookie(res: Response, token: string): Response {
  const headers = new Headers(res.headers);
  headers.append(
    "Set-Cookie",
    `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`
  );
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

export function clearSessionCookie(res: Response): Response {
  const headers = new Headers(res.headers);
  headers.append(
    "Set-Cookie",
    "session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
  );
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

export function addAuditLog(
  documentId: string | null,
  userId: string | null,
  action: string,
  details: string | null = null
) {
  const now = new Date().toISOString();
  db.run(
    "INSERT INTO audit_log (id, document_id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [crypto.randomUUID(), documentId, userId, action, details, now]
  );
}
