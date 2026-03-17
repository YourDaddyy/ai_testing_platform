/**
 * Request History Store
 * Persisted to localStorage on the client side.
 */
import { HttpRequest } from "@/types";

const HISTORY_KEY = "crm_request_history";
const MAX_HISTORY = 100;

export function getRequestHistory(): HttpRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRequest(request: HttpRequest): void {
  const history = getRequestHistory();
  // Move to top if same id exists
  const filtered = history.filter((r) => r.id !== request.id);
  const updated = [{ ...request, updatedAt: new Date().toISOString() }, ...filtered].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export function deleteRequest(id: string): void {
  const history = getRequestHistory().filter((r) => r.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}

export function generateId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
