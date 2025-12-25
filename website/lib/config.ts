// API base URL - can be set via environment variable
// In production (browser), use relative URLs so Nginx can proxy to backend
// In development, point directly to backend
// In server-side code, use Docker service name or localhost
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined"
    ? process.env.NODE_ENV === "production"
      ? "" // Production: use relative URLs (Nginx will proxy /api/* to backend)
      : "http://localhost:8000" // Development: point directly to backend
    : process.env.NODE_ENV === "production"
    ? "http://backend:8000" // Server-side: use Docker service name
    : "http://localhost:8000");
