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
}

export type UserRole = "admin" | "user";
