const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const TOKEN_KEY = "course_portal_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || "Request failed");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const api = {
  register: (payload) =>
    request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  login: (payload) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  me: () => request("/api/auth/me"),
  listCourses: () => request("/api/courses"),
  createCourse: (payload) =>
    request("/api/courses", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getCourse: (id) => request(`/api/courses/${id}`),
  updateCourse: (id, payload) =>
    request(`/api/courses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  createPage: (courseId, payload) =>
    request(`/api/courses/${courseId}/pages`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updatePage: (courseId, pageId, payload) =>
    request(`/api/courses/${courseId}/pages/${pageId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deletePage: (courseId, pageId) =>
    request(`/api/courses/${courseId}/pages/${pageId}`, {
      method: "DELETE",
    }),
};
