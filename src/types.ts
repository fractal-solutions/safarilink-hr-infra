export interface User {
  id: string;
  username: string;
  password: string;
  displayName: string;
  email?: string;
  payrollId?: string;
  role: "admin" | "user";
  theme: string;
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
  departmentId: string | null;
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

export interface Department {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string;
  sortOrder: number;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: "info" | "alert" | "deadline" | "warning";
  departmentId: string | null;
  departmentName: string | null;
  departmentColor: string | null;
  priority: number;
  isPinned: boolean;
  imageUrl: string | null;
  emoji: string | null;
  gridSize: "small" | "medium" | "large" | "wide" | "tall";
  expiresAt: string | null;
  createdBy: string;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  bgColor: string;
  textColor: string;
  gradient: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}
