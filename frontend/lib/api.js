const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const TOKEN_KEY = "course_portal_token";

export function getToken() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (typeof window === "undefined") {
    return;
  }

  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
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

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

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
  enrollCourse: (id) =>
    request(`/api/courses/${id}/enroll`, {
      method: "POST",
    }),
  listStudents: (courseId) => request(`/api/courses/${courseId}/students`),
  removeStudent: (courseId, studentId) =>
    request(`/api/courses/${courseId}/students/${studentId}`, {
      method: "DELETE",
    }),
  updateCourse: (id, payload) =>
    request(`/api/courses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  createTest: (courseId, payload) =>
    request(`/api/courses/${courseId}/tests`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateTest: (courseId, testId, payload) =>
    request(`/api/courses/${courseId}/tests/${testId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteTest: (courseId, testId) =>
    request(`/api/courses/${courseId}/tests/${testId}`, {
      method: "DELETE",
    }),
  submitTest: (courseId, testId, payload) =>
    request(`/api/courses/${courseId}/tests/${testId}/submit`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listSubmissions: (courseId, testId) => request(`/api/courses/${courseId}/tests/${testId}/submissions`),
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
