// API base URL - can be set via environment variable
// In production (browser), use relative URLs so Nginx can proxy to backend
// In development, point directly to backend
// In server-side code, use Docker service name or localhost
// NOTE: Web backend uses port 8001 to avoid conflict with desktop app (main.py on 8000)
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined"
    ? process.env.NODE_ENV === "production"
      ? "" // Production: use relative URLs (Nginx will proxy /api/* to backend)
      : "http://localhost:8001" // Development: Web backend on port 8001
    : process.env.NODE_ENV === "production"
    ? "http://backend:8000" // Server-side: use Docker service name
    : "http://localhost:8001"); // Development SSR: Web backend on port 8001
