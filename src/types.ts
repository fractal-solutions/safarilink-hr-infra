export interface User {
  id: string;
  username: string;
  password: string;
  displayName: string;
  role: "admin" | "user";
  createdAt: string;
}

export interface Section {
  id: string;
  title: string;
  content: string;
}

export interface PolicyDocument {
  id: string;
  title: string;
  sections: Section[];
  sort_order: number;
  archived: number;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  tags: string[];
}

export interface AuditEntry {
  id: string;
  document_id: string;
  user_id: string;
  action: string;
  details: string | null;
  created_at: string;
  user_name?: string;
}

export type UserRole = "admin" | "user";
