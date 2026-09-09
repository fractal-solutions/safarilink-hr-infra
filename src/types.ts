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
  sessionTimeoutMinutes?: number | null;
}

export type SectionType = "richtext" | "video" | "pdf" | "slides";

export type SectionSize = "small" | "medium" | "large" | "full";

export type CourseSectionType = SectionType | "quiz";

export interface CourseTier {
  min: number;
  title: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  departmentId: string | null;
  departmentName?: string;
  departmentColor?: string;
  passmarkPct: number;
  tiers: CourseTier[];
  expiryMonths: number | null;
  sectionCount: number;
  ratingAvg?: number;
  ratingCount?: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuizOption {
  id: string;
  text: string;
  correct: boolean;
}

export interface QuizQuestion {
  id: string;
  text: string;
  imageUrl?: string;
  type: "mcq" | "open";
  points: number;
  options?: QuizOption[];
}

export interface QuizSectionPayload {
  questions: QuizQuestion[];
}

export type AttemptStatus = "in_progress" | "submitted" | "graded";

export interface CourseAttemptSummary {
  id: string;
  status: AttemptStatus;
  submittedAt: string | null;
  gradedAt: string | null;
  autoPct: number | null;
  finalPct: number | null;
}

export interface CourseCert {
  id: string;
  courseId: string;
  courseTitle: string;
  tierTitle: string;
  pct: number;
  issuedAt: string;
  expiresAt: string | null;
}

export interface CourseRating {
  stars: number;
  comment: string;
}

export interface CourseSection {
  id: string;
  title: string;
  type: CourseSectionType;
  content: string;
  url: string | null;
  originalUrl: string | null;
  size?: SectionSize;
}

export interface CourseDetail extends Course {
  sections: CourseSection[];
  myRating?: CourseRating | null;
  myAttempts?: CourseAttemptSummary[];
  myCert?: { id: string; tierTitle: string; pct: number; issuedAt: string; expiresAt: string | null } | null;
}

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
  likeCount?: number;
  commentCount?: number;
  viewCount?: number;
  likedByMe?: boolean;
}

export interface AnnouncementComment {
  id: string;
  body: string;
  userId: string;
  authorName: string;
  authorRole?: string;
  createdAt: string;
  likeCount?: number;
  likedByMe?: boolean;
  rank?: number;
}

export interface AnnouncementThread extends AnnouncementComment {
  replies: AnnouncementComment[];
}

export interface AnnouncementViewer {
  userId: string;
  name: string;
  firstViewedAt: string;
  lastViewedAt: string;
}

export interface AnnouncementDetail extends Announcement {
  comments: AnnouncementThread[];
  viewers: AnnouncementViewer[] | null;
}

export interface SessionSettings {
  ownMinutes: number | null;
  capSeconds: number | null;
  defaultSeconds: number;
  effectiveSeconds: number;
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
