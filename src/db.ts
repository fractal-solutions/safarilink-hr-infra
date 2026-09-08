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

// Migration: user_departments junction table
db.exec(`
  CREATE TABLE IF NOT EXISTS user_departments (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, department_id)
  )
`);

// Migration: announcement_departments junction table (replaces single department_id)
db.exec(`
  CREATE TABLE IF NOT EXISTS announcement_departments (
    announcement_id TEXT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    PRIMARY KEY (announcement_id, department_id)
  )
`);

// Migration: department_webhooks table
db.exec(`
  CREATE TABLE IF NOT EXISTS department_webhooks (
    department_id TEXT PRIMARY KEY REFERENCES departments(id) ON DELETE CASCADE,
    webhook_url TEXT,
    phone_number TEXT
  )
`);

// Migration: system_settings table (global config like webhook URL)
db.exec(`
  CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )
`);

// Migration: add phone_number to department_webhooks
try {
  db.exec("ALTER TABLE department_webhooks ADD COLUMN phone_number TEXT");
  console.log("Migration: added phone_number to department_webhooks");
} catch (e: any) {
  if (!e.message?.includes("duplicate column")) console.error("Migration department_webhooks phone_number:", e.message);
}

// Migration: add send_to_webhook column to announcements
try {
  db.exec("ALTER TABLE announcements ADD COLUMN send_to_webhook INTEGER NOT NULL DEFAULT 0");
  console.log("Migration: added send_to_webhook to announcements");
} catch (e: any) {
  if (!e.message?.includes("duplicate column")) console.error("Migration announcements send_to_webhook:", e.message);
}

// Migration: add send_to_webhook column to banners
try {
  db.exec("ALTER TABLE banners ADD COLUMN send_to_webhook INTEGER NOT NULL DEFAULT 0");
  console.log("Migration: added send_to_webhook to banners");
} catch (e: any) {
  if (!e.message?.includes("duplicate column")) console.error("Migration banners send_to_webhook:", e.message);
}

// Migration: add media type columns to sections
try {
  db.exec("ALTER TABLE sections ADD COLUMN type TEXT NOT NULL DEFAULT 'richtext'");
  console.log("Migration: added type column to sections");
} catch (e: any) {
  if (!e.message?.includes("duplicate column")) console.error("Migration sections type:", e.message);
}
try {
  db.exec("ALTER TABLE sections ADD COLUMN url TEXT");
  console.log("Migration: added url column to sections");
} catch (e: any) {
  if (!e.message?.includes("duplicate column")) console.error("Migration sections url:", e.message);
}
try {
  db.exec("ALTER TABLE sections ADD COLUMN original_url TEXT");
  console.log("Migration: added original_url column to sections");
} catch (e: any) {
  if (!e.message?.includes("duplicate column")) console.error("Migration sections original_url:", e.message);
}

// Migration: add media type columns to section_versions
try {
  db.exec("ALTER TABLE section_versions ADD COLUMN type TEXT NOT NULL DEFAULT 'richtext'");
  console.log("Migration: added type column to section_versions");
} catch (e: any) {
  if (!e.message?.includes("duplicate column")) console.error("Migration section_versions type:", e.message);
}
try {
  db.exec("ALTER TABLE section_versions ADD COLUMN url TEXT");
  console.log("Migration: added url column to section_versions");
} catch (e: any) {
  if (!e.message?.includes("duplicate column")) console.error("Migration section_versions url:", e.message);
}
try {
  db.exec("ALTER TABLE section_versions ADD COLUMN original_url TEXT");
  console.log("Migration: added original_url column to section_versions");
} catch (e: any) {
  if (!e.message?.includes("duplicate column")) console.error("Migration section_versions original_url:", e.message);
}

// Per-user media progress (e.g. video resume timestamps)
db.exec(`
  CREATE TABLE IF NOT EXISTS section_progress (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    position_seconds REAL NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, section_id)
  )
`);

// Session timeout settings
try {
  db.exec("ALTER TABLE users ADD COLUMN session_timeout_minutes INTEGER");
  console.log("Migration: added session_timeout_minutes to users");
} catch (e: any) {
  if (!e.message?.includes("duplicate column")) console.error("Migration users session_timeout:", e.message);
}
try {
  db.exec("ALTER TABLE sessions ADD COLUMN timeout_seconds INTEGER");
  console.log("Migration: added timeout_seconds to sessions");
} catch (e: any) {
  if (!e.message?.includes("duplicate column")) console.error("Migration sessions timeout_seconds:", e.message);
}
try {
  db.exec("ALTER TABLE sessions ADD COLUMN last_activity_at TEXT");
  console.log("Migration: added last_activity_at to sessions");
} catch (e: any) {
  if (!e.message?.includes("duplicate column")) console.error("Migration sessions last_activity_at:", e.message);
}

// Announcement community engagement
db.exec(`
  CREATE TABLE IF NOT EXISTS announcement_likes (
    announcement_id TEXT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    PRIMARY KEY (announcement_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS announcement_views (
    announcement_id TEXT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_viewed_at TEXT NOT NULL,
    last_viewed_at TEXT NOT NULL,
    PRIMARY KEY (announcement_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS announcement_comments (
    id TEXT PRIMARY KEY,
    announcement_id TEXT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    parent_id TEXT REFERENCES announcement_comments(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS announcement_comment_likes (
    comment_id TEXT NOT NULL REFERENCES announcement_comments(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    PRIMARY KEY (comment_id, user_id)
  );
`);

// Training: courses + content sections (content types mirror policy manual sections)
db.exec(`
  CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
    passmark_pct REAL NOT NULL DEFAULT 60,
    tiers TEXT NOT NULL DEFAULT '[]',
    expiry_months INTEGER,
    sort_order INTEGER NOT NULL DEFAULT 0,
    archived INTEGER NOT NULL DEFAULT 0,
    created_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS course_sections (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'richtext',
    content TEXT NOT NULL DEFAULT '',
    url TEXT,
    original_url TEXT,
    size TEXT NOT NULL DEFAULT 'large',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS course_attempts (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TEXT NOT NULL,
    submitted_at TEXT,
    graded_at TEXT,
    status TEXT NOT NULL DEFAULT 'in_progress',
    auto_pct REAL,
    final_pct REAL,
    tier_index INTEGER
  );

  CREATE TABLE IF NOT EXISTS course_attempt_answers (
    id TEXT PRIMARY KEY,
    attempt_id TEXT NOT NULL REFERENCES course_attempts(id) ON DELETE CASCADE,
    section_id TEXT REFERENCES course_sections(id) ON DELETE CASCADE,
    question_index INTEGER NOT NULL DEFAULT 0,
    kind TEXT NOT NULL DEFAULT 'mcq',
    answer TEXT,
    correct INTEGER,
    points REAL,
    max_points REAL,
    graded_by TEXT REFERENCES users(id),
    graded_at TEXT
  );

  CREATE TABLE IF NOT EXISTS course_ratings (
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stars INTEGER NOT NULL DEFAULT 0,
    comment TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (course_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS course_certificates (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attempt_id TEXT REFERENCES course_attempts(id) ON DELETE SET NULL,
    tier_index INTEGER,
    tier_title TEXT,
    pct REAL NOT NULL,
    issued_at TEXT NOT NULL,
    expires_at TEXT,
    UNIQUE (course_id, user_id)
  );
`);

// Migration: add media size setting to sections (used by video sections)
try {
  db.exec("ALTER TABLE sections ADD COLUMN size TEXT NOT NULL DEFAULT 'large'");
  console.log("Migration: added size column to sections");
} catch (e: any) {
  if (!e.message?.includes("duplicate column")) console.error("Migration sections size:", e.message);
}

// Migration: ensure "general" department exists
const generalDept = db.query("SELECT id FROM departments WHERE slug = 'general'").get() as any;
if (!generalDept) {
  const now = new Date().toISOString();
  const maxOrder = (db.query("SELECT MAX(sort_order) as m FROM departments").get() as any)?.m ?? -1;
  db.run(
    `INSERT INTO departments (id, name, slug, color, icon, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ["dept-general", "General", "general", "#6B7280", "building", maxOrder + 1, now]
  );
  console.log("Migration: created 'general' department");
}

// Migration: assign all users to "general" if they have no departments
const usersWithoutDepts = db.query(
  `SELECT u.id FROM users u WHERE NOT EXISTS (SELECT 1 FROM user_departments ud WHERE ud.user_id = u.id)`
).all() as any[];
if (usersWithoutDepts.length > 0) {
  const generalId = (db.query("SELECT id FROM departments WHERE slug = 'general'").get() as any).id;
  for (const u of usersWithoutDepts) {
    db.run("INSERT OR IGNORE INTO user_departments (user_id, department_id) VALUES (?, ?)", [u.id, generalId]);
  }
  console.log(`Migration: assigned ${usersWithoutDepts.length} users to 'general' department`);
}

// Migration: migrate existing announcements.department_id into announcement_departments
const annsWithDept = db.query(
  "SELECT id, department_id FROM announcements WHERE department_id IS NOT NULL"
).all() as any[];
for (const ann of annsWithDept) {
  db.run(
    "INSERT OR IGNORE INTO announcement_departments (announcement_id, department_id) VALUES (?, ?)",
    [ann.id, ann.department_id]
  );
}
if (annsWithDept.length > 0) {
  console.log(`Migration: migrated ${annsWithDept.length} announcements to multi-department`);
}

const userCount = db.query("SELECT COUNT(*) as cnt FROM users").get() as any;
if (userCount.cnt === 0) {
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO users (id, username, password, display_name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    ["usr-admin", "admin", "1234", "Administrator", "admin", now]
  );

  db.run(
    `INSERT INTO departments (id, name, slug, color, icon, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ["dept-general", "General", "general", "#6B7280", "building", 0, now]
  );
  db.run(
    `INSERT INTO departments (id, name, slug, color, icon, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ["dept-hr", "Human Resources", "hr", "#5C3A1E", "users", 1, now]
  );
  db.run(
    `INSERT INTO departments (id, name, slug, color, icon, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ["dept-finance", "Finance", "finance", "#1E5C3A", "calculator", 2, now]
  );
  db.run(
    `INSERT INTO departments (id, name, slug, color, icon, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ["dept-ops", "Operations", "operations", "#3A1E5C", "settings", 3, now]
  );

  // Assign admin to general department
  db.run("INSERT INTO user_departments (user_id, department_id) VALUES (?, ?)", ["usr-admin", "dept-general"]);

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

export const DEFAULT_SESSION_SECONDS = 7 * 24 * 60 * 60; // 7 days

export function effectiveTimeoutSeconds(user?: any): number {
  const capRow = db.query("SELECT value FROM system_settings WHERE key = 'session_timeout_cap_seconds'").get() as any;
  const cap = capRow?.value ? Number(capRow.value) : 0;
  const userMinutes = user?.session_timeout_minutes ? Number(user.session_timeout_minutes) : 0;
  let seconds = userMinutes > 0 ? userMinutes * 60 : DEFAULT_SESSION_SECONDS;
  if (cap > 0) seconds = Math.min(seconds, cap);
  return Math.max(60, seconds);
}

export function getSessionUser(req: Request): any | null {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/session=([^;]+)/);
  if (!match) return null;
  const token = match[1];

  const session = db.query("SELECT * FROM sessions WHERE token = ?").get(token) as any;
  if (!session) return null;

  const nowMs = Date.now();
  const timeoutSeconds = session.timeout_seconds ? Number(session.timeout_seconds) : DEFAULT_SESSION_SECONDS;
  const lastActivity = session.last_activity_at
    ? Date.parse(session.last_activity_at)
    : session.created_at
      ? Date.parse(session.created_at)
      : nowMs;
  const expired = Date.parse(session.expires_at) < nowMs || nowMs - lastActivity > timeoutSeconds * 1000;

  if (expired) {
    db.run("DELETE FROM sessions WHERE token = ?", [token]);
    return null;
  }

  // Sliding renewal: bump activity on requests spaced far enough apart
  if (nowMs - lastActivity > 30_000) {
    const newExpires = new Date(nowMs + timeoutSeconds * 1000);
    db.run(
      "UPDATE sessions SET last_activity_at = ?, expires_at = ? WHERE token = ?",
      [new Date(nowMs).toISOString(), newExpires.toISOString(), token]
    );
  }

  const user = db.query("SELECT * FROM users WHERE id = ?").get(session.user_id) as any;
  if (!user) return null;

  return user;
}

export function createSession(userId: string): string {
  const token = crypto.randomUUID();
  const now = new Date();
  const timeoutSeconds = effectiveTimeoutSeconds(db.query("SELECT session_timeout_minutes FROM users WHERE id = ?").get(userId) as any);
  const expires = new Date(now.getTime() + timeoutSeconds * 1000);
  db.run(
    "INSERT INTO sessions (token, user_id, created_at, expires_at, timeout_seconds, last_activity_at) VALUES (?, ?, ?, ?, ?, ?)",
    [token, userId, now.toISOString(), expires.toISOString(), timeoutSeconds, now.toISOString()]
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
