import type { PolicyDocument, User, AuditEntry } from "@/types";

const API_BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (res.status === 401) return null;
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || `Request failed: ${res.status}`);
    }
    const text = await res.text();
    if (!text) return null as T;
    return JSON.parse(text);
  } catch (e) {
    throw e;
  }
}

function qs(params: Record<string, string | boolean | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
}

// Auth
export async function login(username: string, password: string): Promise<User | null> {
  const res = await request<{ user: User }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  return res?.user ?? null;
}

export async function register(username: string, password: string, displayName: string): Promise<User | null> {
  const res = await request<{ user: User }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password, displayName }),
  });
  return res?.user ?? null;
}

export async function logout(): Promise<void> {
  await request("/auth/logout", { method: "POST" });
}

export async function getSession(): Promise<User | null> {
  const res = await request<{ user: User }>("/auth/session");
  return res?.user ?? null;
}

// Users
export async function getUsers(): Promise<User[]> {
  const res = await request<{ users: User[] }>("/users");
  return res?.users ?? [];
}

export async function changePassword(userId: string, password: string): Promise<{ ok: boolean; error?: string }> {
  return (await request(`/users/${userId}/password`, {
    method: "PUT",
    body: JSON.stringify({ password }),
  })) ?? { ok: false, error: "Request failed" };
}

export async function updateEmail(userId: string, email: string): Promise<{ ok: boolean; error?: string }> {
  return (await request(`/users/${userId}/email`, {
    method: "PUT",
    body: JSON.stringify({ email }),
  })) ?? { ok: false, error: "Request failed" };
}

export async function elevateUser(userId: string): Promise<boolean> {
  const res = await request(`/users/${userId}/elevate`, { method: "POST" });
  return res !== null;
}

export async function demoteUser(userId: string): Promise<boolean> {
  const res = await request(`/users/${userId}/demote`, { method: "POST" });
  return res !== null;
}

export async function deleteUser(userId: string): Promise<boolean> {
  const res = await request(`/users/${userId}`, { method: "DELETE" });
  return res !== null;
}

// Documents
export async function getDocuments(archived?: boolean): Promise<PolicyDocument[]> {
  const q = qs({ archived });
  return (await request<PolicyDocument[]>(`/documents${q}`)) ?? [];
}

export async function createDocument(title: string, dueDate?: string | null): Promise<PolicyDocument | null> {
  return request<PolicyDocument>("/documents", {
    method: "POST",
    body: JSON.stringify({ title, due_date: dueDate }),
  });
}

export async function updateDocument(id: string, data: Partial<PolicyDocument>): Promise<PolicyDocument | null> {
  return request<PolicyDocument>(`/documents/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteDocument(id: string): Promise<boolean> {
  const res = await request(`/documents/${id}`, { method: "DELETE" });
  return res !== null;
}

export async function duplicateDocument(id: string): Promise<PolicyDocument | null> {
  return request<PolicyDocument>(`/documents/${id}/duplicate`, { method: "POST" });
}

export async function reorderDocuments(order: { id: string; sort_order: number }[]): Promise<boolean> {
  const res = await request("/documents/reorder", {
    method: "PUT",
    body: JSON.stringify({ order }),
  });
  return res !== null;
}

// Sections
export async function createSection(docId: string, title: string, content: string): Promise<PolicyDocument | null> {
  return request<PolicyDocument>(`/documents/${docId}/sections`, {
    method: "POST",
    body: JSON.stringify({ title, content }),
  });
}

export async function updateSection(id: string, data: Partial<{ title: string; content: string }>): Promise<boolean> {
  const res = await request(`/sections/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return res !== null;
}

export async function deleteSection(id: string): Promise<boolean> {
  const res = await request(`/sections/${id}`, { method: "DELETE" });
  return res !== null;
}

export async function reorderSections(order: { id: string; sort_order: number }[]): Promise<boolean> {
  const res = await request("/sections/reorder", {
    method: "PUT",
    body: JSON.stringify({ order }),
  });
  return res !== null;
}

// Tracking
export async function getTracking(): Promise<Record<string, boolean>> {
  const data = await request<Record<string, boolean>>("/tracking");
  return data ?? {};
}

export async function getAllTracking(): Promise<Record<string, string>> {
  const data = await request<Record<string, string>>("/tracking/all");
  return data ?? {};
}

export async function toggleRead(sectionId: string, read: boolean): Promise<boolean> {
  const res = await request(`/tracking/${sectionId}`, {
    method: "PUT",
    body: JSON.stringify({ read }),
  });
  return res !== null;
}

// Search
export async function search(query: string): Promise<{ documents: PolicyDocument[]; sections: { section: { id: string; title: string; content: string }; document_id: string; document_title: string }[] }> {
  const res = await request<{ documents: PolicyDocument[]; sections: any[] }>(`/search?q=${encodeURIComponent(query)}`);
  return res ?? { documents: [], sections: [] };
}

// Audit
export async function getAudit(docId: string): Promise<AuditEntry[]> {
  return (await request<AuditEntry[]>(`/documents/${docId}/audit`)) ?? [];
}

// Stats
export async function getStats(): Promise<{ totalPolicies: number; totalUsers: number; overallCompletion: number } | null> {
  return request("/stats");
}

// Tags
export async function getTags(docId: string): Promise<string[]> {
  const res = await request<{ tags: string[] }>(`/documents/${docId}/tags`);
  return res?.tags ?? [];
}

export async function addTag(docId: string, tag: string): Promise<boolean> {
  const res = await request(`/documents/${docId}/tags`, { method: "POST", body: JSON.stringify({ tag }) });
  return res !== null;
}

export async function removeTag(docId: string, tag: string): Promise<boolean> {
  const res = await request(`/documents/${docId}/tags?tag=${encodeURIComponent(tag)}`, { method: "DELETE" });
  return res !== null;
}

// Section Versions
export interface SectionVersion {
  id: string;
  sectionId: string;
  title: string;
  content: string;
  editedBy: string;
  editorName: string;
  createdAt: string;
}

export async function getSectionVersions(sectionId: string): Promise<SectionVersion[]> {
  return (await request<SectionVersion[]>(`/sections/${sectionId}/versions`)) ?? [];
}

// Due Dates
export interface DueDateEntry {
  id: string;
  title: string;
  dueDate: string;
  isOverdue: boolean;
  daysLeft: number;
  totalSections: number;
  readSections: number;
  completionPct: number;
}

export async function getDueDates(): Promise<DueDateEntry[]> {
  return (await request<DueDateEntry[]>("/due-dates")) ?? [];
}

// Import / Export
export async function exportData(): Promise<any> {
  return request("/export");
}

export async function importData(data: any): Promise<{ ok: boolean; imported?: any }> {
  return (await request("/import", { method: "POST", body: JSON.stringify(data) })) ?? { ok: false };
}
