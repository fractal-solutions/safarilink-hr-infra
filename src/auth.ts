import * as api from "@/api";
import type { User } from "@/types";

export async function loginUser(
  username: string,
  password: string
): Promise<{ ok: boolean; user?: User; error?: string }> {
  try {
    const user = await api.login(username, password);
    if (user) return { ok: true, user };
    return { ok: false, error: "Invalid username or password" };
  } catch {
    return { ok: false, error: "Invalid username or password" };
  }
}

export async function registerUser(
  username: string,
  password: string,
  displayName: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await api.register(username, password, displayName);
    if (user) return { ok: true };
    return { ok: false, error: "Registration failed" };
  } catch (e: any) {
    return { ok: false, error: e.message || "Registration failed" };
  }
}

export async function getSession(): Promise<User | null> {
  return api.getSession();
}

export async function logout() {
  await api.logout();
}

export async function getAllUsers(): Promise<User[]> {
  return api.getUsers();
}

export async function elevateUser(userId: string): Promise<boolean> {
  return api.elevateUser(userId);
}

export async function demoteUser(userId: string): Promise<boolean> {
  return api.demoteUser(userId);
}

export async function deleteUser(userId: string): Promise<boolean> {
  return api.deleteUser(userId);
}

export async function changePassword(
  userId: string,
  newPassword: string
): Promise<{ ok: boolean; error?: string }> {
  return api.changePassword(userId, newPassword);
}
