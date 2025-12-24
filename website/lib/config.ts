// API base URL - can be set via environment variable
// In browser (client-side), use the same hostname but port 8000
// In server-side code, use Docker service name or localhost
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8000` // Browser: use same host, port 8000
    : process.env.NODE_ENV === "production"
    ? "http://backend:8000" // Server-side: use Docker service name
    : "http://localhost:8000");
