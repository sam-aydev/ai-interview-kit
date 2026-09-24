const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001/api/v1" ||
  "https://ai-interview-kit-7rrg.onrender.com";

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
  return null;
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = getCookie("trao_token");

  // Safely instantiate a Headers object, which TypeScript loves
  const headers = new Headers(options.headers);

  // Set default Content-Type if not provided
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Only attach the Authorization header if the token exists
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers, // Pass the Headers instance directly
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(
      errorBody.error || `Request failed with status ${res.status}`,
    );
  }

  return res.json();
}
