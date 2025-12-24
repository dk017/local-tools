// In production (Docker), backend is accessible via service name
// In development, use localhost
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "http://backend:8000"
    : "http://localhost:8000");
