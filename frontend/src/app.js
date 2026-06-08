import EasyMDE from "easymde";
import "easymde/dist/easymde.min.css";
import { marked } from "marked";
import { api, getToken, setToken } from "./api.js";
import "./styles.css";

const app = document.querySelector("#app");

const state = {
  user: null,
  courses: [],
  selectedCourse: null,
  selectedPageId: null,
  authMode: "login",
  message: "",
  editor: null,
  pyodide: null,
};

const defaultLesson = [
  "# Nova tema",
  "",
  "Vysvetli koncept a pridaj spustitelny kod.",
  "",
  "```python",
  "for i in range(3):",
  "    print(i)",
  "```",
].join("\n");

marked.setOptions({
  gfm: true,
  breaks: false,
});

async function bootstrap() {
  try {
    if (getToken()) {
      state.user = await api.me();
    }
  } catch {
    setToken(null);
    state.user = null;
  }

  await loadCourses();
  render();
}

async function loadCourses() {
  state.courses = await api.listCourses();
}

async function openCourse(id) {
  state.selectedCourse = await api.getCourse(id);
  state.selectedPageId = state.selectedCourse.pages[0]?.id || null;
  render();
}

async function createCourse() {
  if (!state.user) {
    setMessage("Najprv sa prihlas alebo registruj.");
    return;
  }

  state.selectedCourse = await api.createCourse({
    title: "Novy Python kurz",
    description: "Interaktivny kurz s markdownom a Python ukazkami.",
    is_published: false,
  });
  state.selectedPageId = state.selectedCourse.pages[0]?.id || null;
  await loadCourses();
  render();
}

async function saveCourse() {
  const title = document.querySelector("#course-title").value.trim();
  const description = document.querySelector("#course-description").value.trim();
  state.selectedCourse = await api.updateCourse(state.selectedCourse.id, { title, description });
  await loadCourses();
  setMessage("Kurz ulozeny.");
  render();
}

async function togglePublished(event) {
  state.selectedCourse = await api.updateCourse(state.selectedCourse.id, {
    is_published: event.target.checked,
  });
  await loadCourses();
  render();
}

async function addPage() {
  const page = await api.createPage(state.selectedCourse.id, {
    title: "Nova stranka",
    content: defaultLesson,
    position: state.selectedCourse.pages.length,
  });
  state.selectedCourse = await api.getCourse(state.selectedCourse.id);
  state.selectedPageId = page.id;
  render();
}

async function savePage() {
  const page = selectedPage();
  const title = document.querySelector("#page-title").value.trim();
  const content = state.editor ? state.editor.value() : page.content;
  const updated = await api.updatePage(state.selectedCourse.id, page.id, { title, content });
  state.selectedCourse.pages = state.selectedCourse.pages.map((item) => (item.id === page.id ? updated : item));
  setMessage("Stranka ulozena.");
  render();
}

async function deletePage() {
  if (state.selectedCourse.pages.length <= 1) {
    setMessage("Kurz musi mat aspon jednu stranku.");
    return;
  }
  const page = selectedPage();
  await api.deletePage(state.selectedCourse.id, page.id);
  state.selectedCourse = await api.getCourse(state.selectedCourse.id);
  state.selectedPageId = state.selectedCourse.pages[0]?.id || null;
  render();
}

function selectedPage() {
  return (
    state.selectedCourse?.pages.find((page) => page.id === state.selectedPageId) ||
    state.selectedCourse?.pages[0] ||
    null
  );
}

function setMessage(message) {
  state.message = message;
  render();
}

function logout() {
  setToken(null);
  state.user = null;
  state.selectedCourse = null;
  loadCourses().then(() => {
    setMessage("Odhlasene.");
  });
}

async function submitAuth(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const email = String(form.get("email") || "");
  const password = String(form.get("password") || "");
  const displayName = String(form.get("display_name") || "");

  try {
    const result =
      state.authMode === "login"
        ? await api.login({ email, password })
        : await api.register({ email, password, display_name: displayName });
    setToken(result.access_token);
    state.user = await api.me();
    await loadCourses();
    setMessage("Prihlasene.");
  } catch (error) {
    setMessage(error.message);
  }
}

function render() {
  if (state.editor) {
    state.editor.toTextArea();
    state.editor = null;
  }

  const course = state.selectedCourse;
  const page = selectedPage();

  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <span class="brand-icon">Py</span>
          <div>
            <strong>Python Kurzy</strong>
            <span>Markdown + Pyodide</span>
          </div>
        </div>
        ${state.user ? renderUser() : renderAuth()}
        <div class="section-heading">
          <span>Kurzy</span>
          <button class="icon-button" data-action="create-course" title="Vytvorit kurz">+</button>
        </div>
        <div class="course-list">
          ${state.courses.map(renderCourseRow).join("") || "<p>Zatial tu nie su kurzy.</p>"}
        </div>
        ${state.message ? `<p class="message">${escapeHtml(state.message)}</p>` : ""}
      </aside>
      <main class="workspace">
        ${course && page ? renderWorkspace(course, page) : renderEmpty()}
      </main>
    </div>
  `;

  bindEvents();
  mountEditorAndPreview();
}

function renderUser() {
  return `
    <div class="user-strip">
      <div>
        <strong>${escapeHtml(state.user.display_name)}</strong>
        <span>${escapeHtml(state.user.email)}</span>
      </div>
      <button class="icon-button" data-action="logout" title="Odhlasit">Out</button>
    </div>
  `;
}

function renderAuth() {
  return `
    <form class="auth-panel" data-action="auth">
      <div class="segmented">
        <button type="button" class="${state.authMode === "login" ? "active" : ""}" data-auth-mode="login">Login</button>
        <button type="button" class="${state.authMode === "register" ? "active" : ""}" data-auth-mode="register">Registracia</button>
      </div>
      ${
        state.authMode === "register"
          ? '<input name="display_name" placeholder="Meno" autocomplete="name" required />'
          : ""
      }
      <input name="email" placeholder="Email" type="email" autocomplete="email" required />
      <input name="password" placeholder="Heslo" type="password" autocomplete="current-password" minlength="8" required />
      <button class="primary-button" type="submit">${state.authMode === "login" ? "Prihlasit" : "Vytvorit ucet"}</button>
    </form>
  `;
}

function renderCourseRow(course) {
  const active = state.selectedCourse?.id === course.id ? "active" : "";
  return `
    <button class="course-row ${active}" data-course-id="${course.id}">
      <strong>${escapeHtml(course.title)}</strong>
      <span>${course.is_published ? "Publikovany" : "Draft"}</span>
    </button>
  `;
}

function renderEmpty() {
  return `
    <div class="empty-state">
      <span class="empty-icon">Py</span>
      <h1>Vyber kurz alebo vytvor novy</h1>
      <p>Autor upravuje obsah, citatelia spustaju Python ukazky lokalne cez Pyodide.</p>
      <button class="primary-button" data-action="create-course">Novy kurz</button>
    </div>
  `;
}

function renderWorkspace(course, page) {
  const canEdit = course.can_edit;
  return `
    <div class="course-workspace">
      <header class="topbar">
        <div class="course-fields">
          ${
            canEdit
              ? `
                <input id="course-title" value="${escapeAttr(course.title)}" />
                <input id="course-description" value="${escapeAttr(course.description)}" />
              `
              : `
                <h1>${escapeHtml(course.title)}</h1>
                <p>${escapeHtml(course.description)}</p>
              `
          }
        </div>
        ${
          canEdit
            ? `
              <div class="toolbar">
                <label class="switch">
                  <input id="published-toggle" type="checkbox" ${course.is_published ? "checked" : ""} />
                  Publikovany
                </label>
                <button class="icon-button strong" data-action="save-course" title="Ulozit kurz">OK</button>
              </div>
            `
            : ""
        }
      </header>
      <div class="lesson-layout">
        <nav class="page-tabs">
          ${course.pages
            .map(
              (item) =>
                `<button class="${item.id === page.id ? "active" : ""}" data-page-id="${item.id}">${escapeHtml(item.title)}</button>`,
            )
            .join("")}
          ${canEdit ? '<button class="add-page" data-action="add-page">+</button>' : ""}
        </nav>
        <section class="lesson-surface">
          ${canEdit ? renderEditor(page) : `<article class="lesson-preview">${renderMarkdown(page.content)}</article>`}
        </section>
      </div>
    </div>
  `;
}

function renderEditor(page) {
  return `
    <div class="editor-grid">
      <div class="page-editor">
        <div class="page-title-row">
          <input id="page-title" value="${escapeAttr(page.title)}" />
          <button class="icon-button strong" data-action="save-page" title="Ulozit stranku">OK</button>
          <button class="icon-button danger" data-action="delete-page" title="Zmazat stranku">x</button>
        </div>
        <textarea id="markdown-editor">${escapeHtml(page.content)}</textarea>
      </div>
      <article class="lesson-preview" id="live-preview"></article>
    </div>
  `;
}

function mountEditorAndPreview() {
  const textarea = document.querySelector("#markdown-editor");
  const preview = document.querySelector("#live-preview");
  if (!textarea || !preview) {
    bindRunButtons();
    return;
  }

  state.editor = new EasyMDE({
    element: textarea,
    spellChecker: false,
    status: false,
    minHeight: "520px",
    toolbar: ["bold", "italic", "heading", "|", "code", "quote", "unordered-list", "ordered-list", "|", "preview"],
  });

  const syncPreview = () => {
    preview.innerHTML = renderMarkdown(state.editor.value());
    bindRunButtons();
  };

  state.editor.codemirror.on("change", syncPreview);
  syncPreview();
}

function renderMarkdown(content) {
  const pythonBlocks = [];
  const prepared = String(content || "").replace(/```python\s*\n([\s\S]*?)```/g, (_match, code) => {
    const index = pythonBlocks.push(code.replace(/\n$/, "")) - 1;
    return `\n\n<div data-python-placeholder="${index}"></div>\n\n`;
  });

  let html = marked.parse(prepared);
  pythonBlocks.forEach((code, index) => {
    const block = `
      <div class="python-block">
        <div class="python-meta">
          <span>Python - ${code.split("\n").length} riadkov</span>
          <button data-python-index="${index}">Run</button>
        </div>
        <pre><code>${escapeHtml(code)}</code></pre>
        <pre class="python-output" data-python-output="${index}" hidden></pre>
      </div>
    `;
    html = html.replace(`<div data-python-placeholder="${index}"></div>`, block);
  });

  window.__pythonBlocks = pythonBlocks;
  return html;
}

function bindEvents() {
  document.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.authMode = button.dataset.authMode;
      render();
    });
  });

  document.querySelector('[data-action="auth"]')?.addEventListener("submit", submitAuth);
  document.querySelectorAll('[data-action="create-course"]').forEach((button) => button.addEventListener("click", createCourse));
  document.querySelector('[data-action="logout"]')?.addEventListener("click", logout);
  document.querySelector('[data-action="save-course"]')?.addEventListener("click", saveCourse);
  document.querySelector("#published-toggle")?.addEventListener("change", togglePublished);
  document.querySelector('[data-action="add-page"]')?.addEventListener("click", addPage);
  document.querySelector('[data-action="save-page"]')?.addEventListener("click", savePage);
  document.querySelector('[data-action="delete-page"]')?.addEventListener("click", deletePage);

  document.querySelectorAll("[data-course-id]").forEach((button) => {
    button.addEventListener("click", () => openCourse(Number(button.dataset.courseId)));
  });
  document.querySelectorAll("[data-page-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedPageId = Number(button.dataset.pageId);
      render();
    });
  });

  bindRunButtons();
}

function bindRunButtons() {
  document.querySelectorAll("[data-python-index]").forEach((button) => {
    button.addEventListener("click", async () => {
      const index = Number(button.dataset.pythonIndex);
      const output = document.querySelector(`[data-python-output="${index}"]`);
      const code = window.__pythonBlocks?.[index] || "";
      output.hidden = false;
      output.textContent = "Nacitavam Python runtime...";
      button.disabled = true;
      try {
        const pyodide = await loadPyodideRuntime();
        let buffer = "";
        pyodide.setStdout({ batched: (text) => (buffer += text) });
        pyodide.setStderr({ batched: (text) => (buffer += text) });
        const result = await pyodide.runPythonAsync(code);
        if (result !== undefined) {
          buffer += String(result);
        }
        output.textContent = buffer || "Hotovo bez vystupu.";
      } catch (error) {
        output.textContent = error.message || String(error);
      } finally {
        button.disabled = false;
      }
    });
  });
}

async function loadPyodideRuntime() {
  if (!state.pyodide) {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js";
    document.head.appendChild(script);
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
    });
    state.pyodide = await window.loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.0/full/",
    });
  }
  return state.pyodide;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("\n", "&#10;");
}

bootstrap().catch((error) => {
  app.innerHTML = `<pre class="fatal-error">${escapeHtml(error.message || String(error))}</pre>`;
});
