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

export type SectionType = "richtext" | "video" | "pdf" | "slides";

export type SectionSize = "small" | "medium" | "large" | "full";

export interface Section {
  id: string;
  title: string;
  content: string;
  type?: SectionType;
  url?: string | null;
  originalUrl?: string | null;
  size?: SectionSize;
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
  webhookUrl?: string | null;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: "info" | "alert" | "deadline" | "warning";
  departmentIds: string[];
  departmentNames: string[];
  departmentColors: string[];
  priority: number;
  isPinned: boolean;
  imageUrl: string | null;
  emoji: string | null;
  gridSize: "small" | "medium" | "large" | "wide" | "tall" | "xlarge" | "tall-3" | "tall-4" | "tallwide" | "hero" | "hero-3" | "hero-4";
  sendToWebhook: boolean;
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
  sendToWebhook: boolean;
  createdAt: string;
}
