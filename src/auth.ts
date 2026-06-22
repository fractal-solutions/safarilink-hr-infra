import type { User } from "./types";

const USERS_KEY = "sf_users";
const SESSION_KEY = "sf_session";

const DEFAULT_ADMIN: User = {
  id: "usr-admin",
  username: "admin",
  password: "1234",
  displayName: "Administrator",
  role: "admin",
  createdAt: new Date().toISOString(),
};

function getUsers(): User[] {
  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) {
    localStorage.setItem(USERS_KEY, JSON.stringify([DEFAULT_ADMIN]));
    return [DEFAULT_ADMIN];
  }
  return JSON.parse(raw);
}

function saveUsers(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function registerUser(
  username: string,
  password: string,
  displayName: string
): { ok: boolean; error?: string } {
  const users = getUsers();
  if (users.some((u) => u.username === username)) {
    return { ok: false, error: "Username already exists" };
  }
  const newUser: User = {
    id: `usr-${Date.now()}`,
    username,
    password,
    displayName,
    role: "user",
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  saveUsers(users);
  return { ok: true };
}

export function loginUser(
  username: string,
  password: string
): { ok: boolean; user?: User; error?: string } {
  const users = getUsers();
  const user = users.find(
    (u) => u.username === username && u.password === password
  );
  if (!user) {
    return { ok: false, error: "Invalid username or password" };
  }
  setSession(user.id);
  return { ok: true, user };
}

export function setSession(userId: string) {
  localStorage.setItem(SESSION_KEY, userId);
}

export function getSession(): User | null {
  const userId = localStorage.getItem(SESSION_KEY);
  if (!userId) return null;
  const users = getUsers();
  return users.find((u) => u.id === userId) ?? null;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function getAllUsers(): User[] {
  return getUsers();
}

export function elevateUser(userId: string): boolean {
  const users = getUsers();
  const user = users.find((u) => u.id === userId);
  if (!user || user.role === "admin") return false;
  user.role = "admin";
  saveUsers(users);
  return true;
}

export function demoteUser(userId: string): boolean {
  const users = getUsers();
  const user = users.find((u) => u.id === userId);
  if (!user || user.role !== "admin" || user.id === "usr-admin") return false;
  user.role = "user";
  saveUsers(users);
  return true;
}

export function deleteUser(userId: string): boolean {
  if (userId === "usr-admin") return false;
  const users = getUsers().filter((u) => u.id !== userId);
  saveUsers(users);
  return true;
}

export function changePassword(
  userId: string,
  newPassword: string
): { ok: boolean; error?: string } {
  if (newPassword.length < 4) {
    return { ok: false, error: "Password must be at least 4 characters" };
  }
  const users = getUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return { ok: false, error: "User not found" };
  user.password = newPassword;
  saveUsers(users);
  return { ok: true };
}
