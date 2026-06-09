"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { marked } from "marked";
import { api, getToken, setToken } from "../lib/api";

const EasyMDEEditor = dynamic(() => import("react-simplemde-editor"), {
  ssr: false,
});

const defaultLesson = [
  "# Nova tema",
  "",
  "Vysvetli učivo a pridaj spustiteľný kód.",
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

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedPageId, setSelectedPageId] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [registerRole, setRegisterRole] = useState("student");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState("home");
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    bootstrap();
  }, []);

  async function bootstrap() {
    setIsLoading(true);
    try {
      if (getToken()) {
        setUser(await api.me());
      }
    } catch {
      setToken(null);
      setUser(null);
    }

    await loadCourses();
    setIsLoading(false);
  }

  async function loadCourses() {
    setCourses(await api.listCourses());
  }

  async function openCourse(id) {
    const detail = await api.getCourse(id);
    setSelectedCourse(detail);
    setSelectedPageId(detail.pages[0]?.id || null);
    setView("course");
  }

  async function handleAuth(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
    const displayName = String(form.get("display_name") || "");
    const role = String(form.get("role") || "student");

    try {
      const result =
        authMode === "login"
          ? await api.login({ email, password })
          : await api.register({ email, password, display_name: displayName, role });
      setToken(result.access_token);
      setUser(await api.me());
      await loadCourses();
      if (selectedCourse) {
        await openCourse(selectedCourse.id);
      }
      //setMessage("Prihlasene.");
      setView(selectedCourse ? "course" : "profile");
    } catch (error) {
      setMessage(error.message);
    }
  }

  function logout() {
    setToken(null);
    setUser(null);
    setSelectedCourse(null);
    loadCourses();
    //setMessage("Odhlasene.");
    setView("home");
  }

  async function createCourse() {
    if (!user) {
      setMessage("Je potrebné prihlásenie alebo registrácia.");
      setView("auth");
      return;
    }
    if (user.role !== "teacher") {
      setMessage("Študentský profil nemôže vytvárať kurzy");
      setView("courses");
      return;
    }

    const course = await api.createCourse({
      title: "Nový Python kurz",
      description: "Interaktívny Python kurz s ukážkami kódu",
      is_published: false,
    });
    setSelectedCourse(course);
    setSelectedPageId(course.pages[0]?.id || null);
    await loadCourses();
    setView("course");
  }

  const page = useMemo(() => {
    if (!selectedCourse) {
      return null;
    }
    return selectedCourse.pages.find((item) => item.id === selectedPageId) || selectedCourse.pages[0] || null;
  }, [selectedCourse, selectedPageId]);

  const publicCourses = courses.filter((course) => course.is_published);
  const myCourses = user ? courses.filter((course) => course.owner_id === user.id) : [];

  return (
    <div className="app-root" data-theme={theme}>
      <AppNav
        user={user}
        view={view}
        theme={theme}
        setView={setView}
        setTheme={setTheme}
        onLogout={logout}
      />

      {message ? <div className="toast">{message}</div> : null}

      <main className={view === "course" ? "main-shell wide" : "main-shell"}>
        {view === "home" ? (
          <HomeView user={user} setView={setView} createCourse={createCourse} />
        ) : null}

        {view === "auth" ? (
          <AuthView
            authMode={authMode}
            setAuthMode={setAuthMode}
            registerRole={registerRole}
            setRegisterRole={setRegisterRole}
            onSubmit={handleAuth}
          />
        ) : null}

        {view === "courses" ? (
          <CoursesView
            title="Verejné kurzy"
            subtitle="Verejne dostupné kurzy na čítanie a spúšťanie ukážok."
            courses={publicCourses}
            isLoading={isLoading}
            onOpenCourse={openCourse}
            emptyText="Zatiaľ nie je publikovaný žiaden kurz."
          />
        ) : null}

        {view === "profile" ? (
          user ? (
            <ProfileView
              user={user}
              courses={myCourses}
              isLoading={isLoading}
              createCourse={createCourse}
              onOpenCourse={openCourse}
            />
          ) : (
            <AuthView
              authMode={authMode}
              setAuthMode={setAuthMode}
              registerRole={registerRole}
              setRegisterRole={setRegisterRole}
              onSubmit={handleAuth}
            />
          )
        ) : null}

        {view === "course" && selectedCourse && page ? (
          <CourseWorkspace
            user={user}
            course={selectedCourse}
            page={page}
            setCourse={setSelectedCourse}
            setSelectedPageId={setSelectedPageId}
            loadCourses={loadCourses}
            setMessage={setMessage}
          />
        ) : null}
      </main>
      <AppFooter />
    </div>
  );
}

function AppNav({ user, view, theme, setView, setTheme, onLogout }) {
  return (
    <header className="app-nav">
      <button className="brand-button" onClick={() => setView("home")}>
        <span className="brand-mark">Py</span>
        <span>Python Kurzy</span>
      </button>

      <nav className="nav-actions" aria-label="Hlavna navigacia">
        <button className={view === "home" ? "nav-button active" : "nav-button"} onClick={() => setView("home")}>
          <Icon name="home" />
          Domovská stránka
        </button>
        <button className={view === "courses" ? "nav-button active" : "nav-button"} onClick={() => setView("courses")}>
          <Icon name="book" />
          Všetky kurzy
        </button>
        <button
          className={view === "profile" || view === "auth" ? "nav-button active" : "nav-button"}
          onClick={() => setView(user ? "profile" : "auth")}
        >
          <Icon name={user ? "user" : "login"} />
          {user ? "Profil" : "Prihlásiť sa"}
        </button>
      </nav>

      <div className="nav-tools">
        <button className="theme-button" onClick={() => setTheme(theme === "light" ? "dark" : "light")} title="Zmeniť temu">
          <Icon name={theme === "light" ? "moon" : "sun"} />
        </button>
        {user ? (
          <button className="theme-button" onClick={onLogout} title="Odhlásit sa">
            <Icon name="logout" />
          </button>
        ) : null}
      </div>
    </header>
  );
}

function HomeView({ user, setView, createCourse }) {
  const canCreateCourses = user?.role === "teacher";

  return (
    <section className="home-view">
      <div className="hero-copy">
        <span className="eyebrow">Interaktívne vyučovanie programovania v Pythone</span>
        <h1>Nauč sa programovať v Pythone, prípadne ak vyučuješ, vytvor študentom vlastný kurz!</h1>
        <p>
          Študent môže navštíviť ktorýkoľvek verejný Python kurz, prezerať si lekcie, riešiť úlohy, či testy bez akejkoľvek inštalácie externého softvéru! Pedagógom umožňujeme tvorbu vlastných kurzov pomocou vstavaných editorov, podporujeme aj možnosť vytvárania testov. Všetko vrámci akademickej spolupatričnosti úplne zadarmo!
        </p>
        <div className="hero-actions">
          <button className="primary-button" onClick={() => setView("courses")}>
            <Icon name="book" />
            Prezerať kurzy
          </button>
          <button className="secondary-button" onClick={canCreateCourses ? createCourse : () => setView(user ? "courses" : "auth")}>
            <Icon name={canCreateCourses ? "plus" : "login"} />
            {canCreateCourses ? "Vytvoriť kurz" : user ? "Pokracovať v učení" : "Prihlásit sa"}
          </button>
        </div>
      </div>

      <div className="feature-grid">
        <div className="feature-card">
          <strong>Markdown editor</strong>
          <span>Stránky kurzu je možné tvoriť efektívne a prehľadne.</span>
        </div>
        <div className="feature-card">
          <strong>Python bloky</strong>
          <span>Možnosť voľby rôznych Python blokov - statické ukážky, interaktívne kódy, či simuláciu práce so súbormi.</span>
        </div>
        <div className="feature-card">
          <strong>Zdieľanie kurzov</strong>
          <span>Pedagógovia môžu svoje kurzy zverejniť.</span>
        </div>
      </div>
    </section>
  );
}

function AuthView({ authMode, setAuthMode, registerRole, setRegisterRole, onSubmit }) {
  return (
    <section className="auth-view">
      <form className="auth-card" onSubmit={onSubmit}>
        <div>
          <span className="eyebrow">Ucet autora</span>
          <h1>{authMode === "login" ? "Prihlásenie" : "Registrácia"}</h1>
        </div>
        <div className="segmented">
          <button type="button" className={authMode === "login" ? "active" : ""} onClick={() => setAuthMode("login")}>
            Login
          </button>
          <button
            type="button"
            className={authMode === "register" ? "active" : ""}
            onClick={() => setAuthMode("register")}
          >
            Registrácia
          </button>
        </div>
        {authMode === "register" ? <input name="display_name" placeholder="Meno" autoComplete="name" required /> : null}
        {authMode === "register" ? (
          <div className="role-picker" aria-label="Typ účtu">
            <label className={registerRole === "student" ? "active" : ""}>
              <input
                type="radio"
                name="role"
                value="student"
                checked={registerRole === "student"}
                onChange={() => setRegisterRole("student")}
              />
              <span>Študent</span>
              <small>Môže navštevovať verejné kurzy.</small>
            </label>
            <label className={registerRole === "teacher" ? "active" : ""}>
              <input
                type="radio"
                name="role"
                value="teacher"
                checked={registerRole === "teacher"}
                onChange={() => setRegisterRole("teacher")}
              />
              <span>Autor</span>
              <small>Vytvára a publikuje kurzy.</small>
            </label>
          </div>
        ) : null}
        <input name="email" placeholder="Email" type="email" autoComplete="email" required />
        <input name="password" placeholder="Heslo" type="password" minLength="8" maxLength="72" required />
        <button className="primary-button" type="submit">
          {authMode === "login" ? "Prihlásit sa" : "Vytvoriť účet"}
        </button>
      </form>
    </section>
  );
}

function CoursesView({ title, subtitle, courses, isLoading, onOpenCourse, emptyText }) {
  return (
    <section className="content-view">
      <div className="view-heading">
        <span className="eyebrow">Zoznam vytvorených kurzov</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <div className="course-grid">
        {isLoading ? <p>Nacitavam...</p> : null}
        {courses.length === 0 && !isLoading ? <p>{emptyText}</p> : null}
        {courses.map((course) => (
          <button className="course-card" key={course.id} onClick={() => onOpenCourse(course.id)}>
            <span>{course.is_published ? "Publikované" : "Draft"}</span>
            <strong>{course.title}</strong>
            <p>{course.description || "Bez popisu."}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

function ProfileView({ user, courses, isLoading, createCourse, onOpenCourse }) {
  const isTeacher = user.role === "teacher";

  return (
    <section className="content-view">
      <div className="profile-header">
        <div>
          <span className="eyebrow">Profil</span>
          <h1>{user.display_name}</h1>
          <p>{user.email}</p>
          <span className="role-badge">{isTeacher ? "Autor kurzov" : "Študent"}</span>
        </div>
        {isTeacher ? (
          <button className="primary-button" onClick={createCourse}>
            <Icon name="plus" />
            Vytvorit kurz
          </button>
        ) : null}
      </div>
      {isTeacher ? (
        <CoursesView
          title="Moje kurzy"
          subtitle="Drafty aj publikované kurzy, ktoré možeš upravovať."
          courses={courses}
          isLoading={isLoading}
          onOpenCourse={onOpenCourse}
          emptyText="Ešte nemáš vytvorený kurz."
        />
      ) : (
        <div className="student-panel">
          <h2>Studentsky profil</h2>
          <p>Mas pristup k verejnym kurzom, mozes citat lekcie a spustat Python ukazky. Tvorba kurzov je dostupna iba autorom.</p>
        </div>
      )}
    </section>
  );
}

function AppFooter() {
  return (
    <footer className="app-footer">
      <span>Copyright 2026 Python Course Portal. All rights reserved.</span>
    </footer>
  );
}

function Icon({ name }) {
  const paths = {
    home: (
      <>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
        <path d="M9.5 21v-6h5v6" />
      </>
    ),
    book: (
      <>
        <path d="M5 4.5h10a4 4 0 0 1 4 4V21H8a3 3 0 0 0-3 3V4.5Z" />
        <path d="M5 4.5A3.5 3.5 0 0 1 8.5 1H19v20" />
      </>
    ),
    login: (
      <>
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      </>
    ),
    logout: (
      <>
        <path d="M14 17l5-5-5-5" />
        <path d="M19 12H8" />
        <path d="M10 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5" />
      </>
    ),
    moon: (
      <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3a7 7 0 1 0 11.5 11.5Z" />
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
  };

  return (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        {paths[name]}
      </g>
    </svg>
  );
}

function CourseWorkspace({ user, course, page, setCourse, setSelectedPageId, loadCourses, setMessage }) {
  const [courseTitle, setCourseTitle] = useState(course.title);
  const [courseDescription, setCourseDescription] = useState(course.description);
  const [pageTitle, setPageTitle] = useState(page.title);
  const [content, setContent] = useState(page.content);
  const [students, setStudents] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [testDrafts, setTestDrafts] = useState({});
  const [submissionDrafts, setSubmissionDrafts] = useState({});
  const editorOptions = useMemo(
    () => ({
      spellChecker: false,
      status: false,
      minHeight: "520px",
      toolbar: ["bold", "italic", "heading", "|", "code", "quote", "unordered-list", "ordered-list", "|", "preview"],
    }),
    [],
  );

  useEffect(() => {
    setCourseTitle(course.title);
    setCourseDescription(course.description);
  }, [course.id, course.title, course.description]);

  useEffect(() => {
    setPageTitle(page.title);
    setContent(page.content);
  }, [page.id, page.title, page.content]);

  useEffect(() => {
    if (course.can_edit) {
      loadStudents();
      course.tests.forEach((test) => loadSubmissions(test.id));
    }
  }, [course.id, course.can_edit, course.tests.length]);

  useEffect(() => {
    const nextDrafts = {};
    const nextSubmissionDrafts = {};
    course.tests.forEach((test) => {
      nextDrafts[test.id] = {
        title: test.title,
        assignment: test.assignment,
        starter_code: test.starter_code,
        is_published: test.is_published,
      };
      nextSubmissionDrafts[test.id] = test.starter_code || "";
    });
    setTestDrafts(nextDrafts);
    setSubmissionDrafts((current) => ({ ...nextSubmissionDrafts, ...current }));
  }, [course.id, course.tests]);

  async function saveCourse(patch) {
    const updated = await api.updateCourse(course.id, patch);
    setCourse(updated);
    await loadCourses();
    setMessage("Kurz uložený.");
  }

  async function addPage() {
    const created = await api.createPage(course.id, {
      title: "Nová stránka",
      content: defaultLesson,
      position: course.pages.length,
    });
    const updated = await api.getCourse(course.id);
    setCourse(updated);
    setSelectedPageId(created.id);
  }

  async function refreshCourse() {
    const updated = await api.getCourse(course.id);
    setCourse(updated);
    await loadCourses();
    return updated;
  }

  async function enrollCourse() {
    try {
      await api.enrollCourse(course.id);
      await refreshCourse();
      setMessage("Prihlásil si sa na kurz.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadStudents() {
    const nextStudents = await api.listStudents(course.id);
    setStudents(nextStudents);
  }

  async function removeStudent(studentId) {
    await api.removeStudent(course.id, studentId);
    await loadStudents();
    setMessage("Študent bol odhlásený z kurzu.");
  }

  async function createTest() {
    await api.createTest(course.id, {
      title: "Nový test",
      assignment: "Vyrieš ulohu v Pythone a odovzdaj kód.",
      starter_code: "print('riesenie')",
      is_published: false,
      position: course.tests.length,
    });
    await refreshCourse();
    setMessage("Test vytvorený.");
  }

  async function saveTest(testId) {
    const draft = testDrafts[testId];
    if (!draft) return;
    await api.updateTest(course.id, testId, draft);
    await refreshCourse();
    setMessage("Test uložený.");
  }

  async function toggleTest(test, isPublished) {
    await api.updateTest(course.id, test.id, { is_published: isPublished });
    await refreshCourse();
    setMessage(isPublished ? "Test je zverejnený." : "Test je nezverejnený.");
  }

  async function deleteTest(testId) {
    await api.deleteTest(course.id, testId);
    await refreshCourse();
    setMessage("Test vymazaný.");
  }

  async function submitTest(testId, files = {}) {
    try {
      await api.submitTest(course.id, testId, { code: submissionDrafts[testId] || "", files });
      await refreshCourse();
      setMessage("Riešenie bolo odovzdané.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadSubmissions(testId) {
    const next = await api.listSubmissions(course.id, testId);
    setSubmissions((current) => ({ ...current, [testId]: next }));
  }

  async function runSubmission(code, outputId, files = {}) {
    const output = document.querySelector(`[data-submission-output="${outputId}"]`);
    if (!output) return;
    output.hidden = false;
    output.textContent = "Spúšťam Python kód...";
    try {
      const pyodide = await loadPyodideRuntime();
      let buffer = "";
      pyodide.setStdout({ batched: (text) => (buffer += `${text}\n`) });
      pyodide.setStderr({ batched: (text) => (buffer += `${text}\n`) });
      preparePythonFilesObject(pyodide, `submission-${outputId}`, files);
      const result = await pyodide.runPythonAsync(code);
      if (result !== undefined) {
        buffer += buffer ? `\n${String(result)}` : String(result);
      }
      output.textContent = buffer.replace(/\n$/, "") || "Bez výstupu.";
    } catch (error) {
      output.textContent = error.message || String(error);
    }
  }

  async function savePage() {
    const updated = await api.updatePage(course.id, page.id, {
      title: pageTitle,
      content,
    });
    setCourse({
      ...course,
      pages: course.pages.map((item) => (item.id === page.id ? updated : item)),
    });
    setMessage("Stránka uložená.");
  }

  async function deletePage() {
    if (course.pages.length <= 1) {
      setMessage("Kurz musí mať aspoň jednu stránku.");
      return;
    }
    await api.deletePage(course.id, page.id);
    const updated = await api.getCourse(course.id);
    setCourse(updated);
    setSelectedPageId(updated.pages[0]?.id || null);
  }

  return (
    <div className="course-workspace">
      <header className="topbar">
        <div className="course-fields">
          {course.can_edit ? (
            <>
              <input value={courseTitle} onChange={(event) => setCourseTitle(event.target.value)} />
              <input value={courseDescription} onChange={(event) => setCourseDescription(event.target.value)} />
            </>
          ) : (
            <>
              <h1>{course.title}</h1>
              <p>{course.description}</p>
            </>
          )}
        </div>
        {course.can_edit ? (
          <div className="toolbar">
            <label className="switch">
              <input
                type="checkbox"
                checked={course.is_published}
                onChange={(event) => saveCourse({ is_published: event.target.checked })}
              />
              Publikovaný
            </label>
            <button
              className="icon-button strong"
              onClick={() => saveCourse({ title: courseTitle, description: courseDescription })}
              title="Uložiť kurz"
            >
              OK
            </button>
          </div>
        ) : null}
      </header>

      {user?.role === "student" && !course.is_enrolled ? (
        <div className="enroll-banner">
          <div>
            <strong>Prihlás sa na kurz</strong>
            <span>Testy môžeš odovzdávať až po prihlásení sa na kurz.</span>
          </div>
          <button className="primary-button" onClick={enrollCourse}>Prihlásiť sa na kurz</button>
        </div>
      ) : null}

      {!course.can_edit ? (
        <CourseTests
          user={user}
          course={course}
          students={students}
          submissions={submissions}
          testDrafts={testDrafts}
          submissionDrafts={submissionDrafts}
          setTestDrafts={setTestDrafts}
          setSubmissionDrafts={setSubmissionDrafts}
          onCreateTest={createTest}
          onSaveTest={saveTest}
          onToggleTest={toggleTest}
          onDeleteTest={deleteTest}
          onSubmitTest={submitTest}
          onRemoveStudent={removeStudent}
          onRunSubmission={runSubmission}
        />
      ) : null}

      <div className="lesson-layout">
        <nav className="page-tabs">
          {course.pages.map((item) => (
            <button key={item.id} className={item.id === page.id ? "active" : ""} onClick={() => setSelectedPageId(item.id)}>
              {item.title}
            </button>
          ))}
          {course.can_edit ? (
            <button className="add-page" onClick={addPage}>
              +
            </button>
          ) : null}
        </nav>

        <section className="lesson-surface">
          {course.can_edit ? (
            <div className="editor-grid">
              <div className="page-editor">
                <div className="page-title-row">
                  <input value={pageTitle} onChange={(event) => setPageTitle(event.target.value)} />
                  <button className="icon-button strong" onClick={savePage} title="Ulozit stranku">
                    OK
                  </button>
                  <button className="icon-button danger" onClick={deletePage} title="Zmazat stranku">
                    x
                  </button>
                </div>
                <EasyMDEEditor
                  key={page.id}
                  value={content}
                  onChange={setContent}
                  options={editorOptions}
                />
              </div>
              <MarkdownLesson content={content} />
            </div>
          ) : (
            <MarkdownLesson content={page.content} />
          )}
        </section>
      </div>

      {course.can_edit ? (
        <CourseTests
          user={user}
          course={course}
          students={students}
          submissions={submissions}
          testDrafts={testDrafts}
          submissionDrafts={submissionDrafts}
          setTestDrafts={setTestDrafts}
          setSubmissionDrafts={setSubmissionDrafts}
          onCreateTest={createTest}
          onSaveTest={saveTest}
          onToggleTest={toggleTest}
          onDeleteTest={deleteTest}
          onSubmitTest={submitTest}
          onRemoveStudent={removeStudent}
          onRunSubmission={runSubmission}
        />
      ) : null}
    </div>
  );
}

function CourseTests({
  user,
  course,
  students,
  submissions,
  testDrafts,
  submissionDrafts,
  setTestDrafts,
  setSubmissionDrafts,
  onCreateTest,
  onSaveTest,
  onToggleTest,
  onDeleteTest,
  onSubmitTest,
  onRemoveStudent,
  onRunSubmission,
}) {
  if (!course.can_edit && user?.role !== "student") {
    return null;
  }

  return (
    <section className="test-section">
      <div className="test-heading">
        <div>
          <span className="eyebrow">Testy</span>
          <h2>Testové úlohy v kurze</h2>
        </div>
        {course.can_edit ? (
          <button className="primary-button" onClick={onCreateTest}>
            <Icon name="plus" />
            Pridať test
          </button>
        ) : null}
      </div>

      {course.can_edit ? (
        <div className="student-list">
          <h3>Prihlásení študenti</h3>
          {students.length === 0 ? <p>Žiaden prihlásený študent.</p> : null}
          {students.map((student) => (
            <div className="student-row" key={student.id}>
              <div>
                <strong>{student.display_name}</strong>
                <span>{student.email}</span>
              </div>
              <button className="secondary-button" onClick={() => onRemoveStudent(student.id)}>Odmazat</button>
            </div>
          ))}
        </div>
      ) : null}

      {!course.can_edit && !course.is_enrolled ? (
        <div className="test-empty">
          <strong>Testy sa zobrazia po prihlásení sa na kurz.</strong>
          <span>Použi tlačidlo Prihlásiť sa na kurz hore v detaile kurzu.</span>
        </div>
      ) : null}

      {!course.can_edit && course.is_enrolled && course.tests.length === 0 ? (
        <div className="test-empty">
          <strong>Nie je zverejnený žiaden test.</strong>
          <span>Autor môže test aktivovať iba na určitý čas.</span>
        </div>
      ) : null}

      <div className="test-list">
        {course.tests.map((test) =>
          course.can_edit ? (
            <TeacherTestCard
              key={test.id}
              test={test}
              draft={testDrafts[test.id] || test}
              submissions={submissions[test.id] || []}
              setTestDrafts={setTestDrafts}
              onSaveTest={onSaveTest}
              onDeleteTest={onDeleteTest}
              onRunSubmission={onRunSubmission}
            />
          ) : (
            <StudentTestCard
              key={test.id}
              user={user}
              course={course}
              test={test}
              value={submissionDrafts[test.id] || test.starter_code || ""}
              setSubmissionDrafts={setSubmissionDrafts}
              onSubmitTest={onSubmitTest}
            />
          ),
        )}
      </div>
    </section>
  );
}

function TeacherTestCard({
  test,
  draft,
  submissions,
  setTestDrafts,
  onSaveTest,
  onDeleteTest,
  onRunSubmission,
}) {
  function updateDraft(patch) {
    setTestDrafts((current) => ({ ...current, [test.id]: { ...draft, ...patch } }));
  }

  return (
    <article className="test-card">
      <div className="test-card-head">
        <input value={draft.title || ""} onChange={(event) => updateDraft({ title: event.target.value })} />
        <label className="publish-toggle">
          <input
            type="checkbox"
            checked={Boolean(draft.is_published)}
            onChange={(event) => updateDraft({ is_published: event.target.checked })}
          />
          <span className="publish-toggle-track">
            <span className="publish-toggle-thumb" />
          </span>
          <span>Zverejnený</span>
        </label>
      </div>
      <textarea
        className="test-assignment"
        value={draft.assignment || ""}
        onChange={(event) => updateDraft({ assignment: event.target.value })}
        placeholder="Zadanie ulohy"
      />
      <textarea
        className="test-code-editor"
        data-tab-editor
        value={draft.starter_code || ""}
        onChange={(event) => updateDraft({ starter_code: event.target.value })}
        placeholder="Starter kod pre studenta"
      />
      <div className="test-actions">
        <button className="primary-button" onClick={() => onSaveTest(test.id)}>Ulozit test a stav</button>
        <button className="secondary-button" onClick={() => onDeleteTest(test.id)}>Zmazat test</button>
      </div>
      <div className="submission-list">
        <h3>Odovzdania</h3>
        {submissions.length === 0 ? <p>Zatiaľ bez odovzdaní.</p> : null}
        {submissions.map((submission) => (
          <div className="submission-card" key={submission.id}>
            <div className="submission-meta">
              <strong>{submission.student_name || "Student"}</strong>
              <span>{submission.student_email}</span>
            </div>
            <pre>{submission.code}</pre>
            {submission.files && Object.keys(submission.files).length > 0 ? (
              <div className="submission-files">
                {Object.entries(submission.files).map(([filename, content]) => (
                  <div className="python-file-card" key={filename}>
                    <div className="python-file-name">{filename}</div>
                    <pre>{content}</pre>
                  </div>
                ))}
              </div>
            ) : null}
            <button className="secondary-button" onClick={() => onRunSubmission(submission.code, submission.id, submission.files || {})}>
              Spustiť kód
            </button>
            <pre className="python-output submission-output" data-submission-output={submission.id} hidden />
          </div>
        ))}
      </div>
    </article>
  );
}

function StudentTestCard({ user, course, test, value, setSubmissionDrafts, onSubmitTest }) {
  const [files, setFiles] = useState({ "data.txt": "" });
  const [newFileName, setNewFileName] = useState("");
  const [ideTheme, setIdeTheme] = useState("dark");
  const canSubmit = user?.role === "student" && course.is_enrolled && test.is_published && !test.submitted;
  const outputId = `student-test-${test.id}`;

  async function runStudentCode() {
    const output = document.querySelector(`[data-student-test-output="${outputId}"]`);
    if (!output) return;
    output.hidden = false;
    output.textContent = "Spúšťam kód...";
    try {
      const pyodide = await loadPyodideRuntime();
      let buffer = "";
      pyodide.setStdout({ batched: (text) => (buffer += `${text}\n`) });
      pyodide.setStderr({ batched: (text) => (buffer += `${text}\n`) });
      preparePythonFilesObject(pyodide, outputId, files);
      const result = await pyodide.runPythonAsync(value || "");
      if (result !== undefined) {
        buffer += buffer ? `\n${String(result)}` : String(result);
      }
      setFiles(syncPythonFilesObject(pyodide, outputId));
      output.textContent = buffer.replace(/\n$/, "") || "Bez výstupu.";
    } catch (error) {
      output.textContent = error.message || String(error);
    }
  }

  function addFile() {
    const filename = sanitizePythonFilename(newFileName);
    if (!filename) return;
    setFiles((current) => ({ ...current, [filename]: current[filename] || "" }));
    setNewFileName("");
  }

  return (
    <article className="test-card">
      <div className="test-card-head">
        <h3>{test.title}</h3>
        <span className={test.submitted ? "role-badge" : test.is_published ? "role-badge" : "role-badge muted"}>
          {test.submitted ? "Odovzdané" : test.is_published ? "Aktívny" : "Neaktívny"}
        </span>
      </div>
      <MarkdownLesson content={test.assignment || "Bez zadania."} />
      <div className={`student-python-ide is-${ideTheme}`}>
        <div className="python-meta">
          <span>Python editor odpovede</span>
          <button type="button" onClick={() => setIdeTheme(ideTheme === "dark" ? "light" : "dark")}>
            {ideTheme === "dark" ? "Light" : "Dark"}
          </button>
        </div>
        <textarea
          className="test-code-editor"
          data-tab-editor
          value={value}
          onChange={(event) => setSubmissionDrafts((current) => ({ ...current, [test.id]: event.target.value }))}
          disabled={!canSubmit}
          spellCheck="false"
        />
        <div className="python-file-panel">
          <div className="python-file-toolbar">
            <input value={newFileName} onChange={(event) => setNewFileName(event.target.value)} placeholder="subor.txt" disabled={test.submitted} />
            <button type="button" onClick={addFile} disabled={test.submitted}>Add file</button>
          </div>
          <div className="python-file-list">
            {Object.entries(files).map(([filename, fileContent]) => (
              <div className="python-file-card" key={filename}>
                <div className="python-file-name">{filename}</div>
                <textarea
                  data-tab-editor
                  value={fileContent}
                  onChange={(event) => setFiles((current) => ({ ...current, [filename]: event.target.value }))}
                  disabled={test.submitted}
                  spellCheck="false"
                  wrap="off"
                />
              </div>
            ))}
          </div>
        </div>
        <pre className="python-output student-test-output" data-student-test-output={outputId} hidden />
        <div className="python-actions">
          <button type="button" onClick={runStudentCode} disabled={!canSubmit}>
            Run
          </button>
        </div>
      </div>
      <div className="test-actions">
        <button className="primary-button" disabled={!canSubmit} onClick={() => onSubmitTest(test.id, files)}>
          Odovzdať
        </button>
        {test.submitted ? <span className="test-note">Odovzdané. Tento test sa dá odovzdať iba raz.</span> : null}
        {!course.is_enrolled ? <span className="test-note">Najprv sa prihlás na kurz.</span> : null}
        {!test.is_published ? <span className="test-note">Test momentálne neprijíma odpovede.</span> : null}
      </div>
    </article>
  );
}

function MarkdownLesson({ content }) {
  const { html, blocks } = useMemo(() => renderMarkdown(content), [content]);

  useEffect(() => {
    window.__pythonBlocks = blocks;
  }, [blocks]);

  return <article className="lesson-preview" dangerouslySetInnerHTML={{ __html: html }} />;
}

function renderMarkdown(content) {
  const blocks = [];
  const prepared = String(content || "").replace(/```(python|python-interactive|python-interactive-file)\s*\n([\s\S]*?)```/g, (_match, language, code) => {
    const index = blocks.push({
      code: code.replace(/\n$/, ""),
      type: language,
    }) - 1;
    return `\n\n<div data-python-placeholder="${index}"></div>\n\n`;
  });

  let html = marked.parse(prepared);
  blocks.forEach((blockData, index) => {
    const code = blockData.code;
    const isInteractive = blockData.type !== "python";
    const hasFiles = blockData.type === "python-interactive-file";
    const codeSurface = isInteractive
      ? `
        <div class="python-editor-window">
          <div class="python-editor-lines" data-python-editor-lines="${index}">
            ${renderPythonLineNumbers(code)}
          </div>
          <textarea
            class="python-editor-input"
            data-python-editor="${index}"
            spellcheck="false"
            wrap="off"
          >${escapeHtml(code)}</textarea>
        </div>
        ${hasFiles ? renderPythonFilePanel(index) : ""}
      `
      : `
        <div class="python-code-window">
          ${renderPythonLines(code)}
        </div>
      `;

    const block = `
      <div class="python-block is-dark" data-python-block="${index}">
        <div class="python-meta">
          <span>${pythonBlockLabel(blockData.type)} - ${lineCount(code)} riadkov</span>
          <button class="python-theme-toggle" data-python-theme-toggle="${index}">Light</button>
        </div>
        ${codeSurface}
        <pre class="python-output" data-python-output="${index}" hidden></pre>
        <div class="python-actions">
          <button data-python-index="${index}">Run</button>
        </div>
      </div>
    `;
    html = html.replace(`<div data-python-placeholder="${index}"></div>`, block);
  });

  return { html, blocks };
}

if (typeof window !== "undefined") {
  window.__pythonPortalController?.abort();
  window.__pythonPortalController = new AbortController();
  const listenerSignal = window.__pythonPortalController.signal;

  document.addEventListener("keydown", (event) => {
    if (!(event.target instanceof HTMLTextAreaElement)) {
      return;
    }

    const editor = event.target.closest("[data-python-editor], [data-python-file-content], [data-tab-editor]");
    if (!editor || event.key !== "Tab") {
      return;
    }

    event.preventDefault();
    insertAtCursor(event.target, "    ");

    if (event.target.matches("[data-python-editor]")) {
      const index = Number(event.target.dataset.pythonEditor);
      const lines = document.querySelector(`[data-python-editor-lines="${index}"]`);
      if (lines) {
        lines.innerHTML = renderPythonLineNumbers(event.target.value);
      }
    }
  }, { signal: listenerSignal });

  document.addEventListener("input", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const editor = event.target.closest("[data-python-editor]");
    if (!editor) {
      return;
    }

    const index = Number(editor.dataset.pythonEditor);
    const lines = document.querySelector(`[data-python-editor-lines="${index}"]`);
    if (lines) {
      lines.innerHTML = renderPythonLineNumbers(editor.value);
    }
  }, { signal: listenerSignal });

  document.addEventListener("scroll", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const editor = event.target.closest("[data-python-editor]");
    if (!editor) {
      return;
    }

    const index = Number(editor.dataset.pythonEditor);
    const lines = document.querySelector(`[data-python-editor-lines="${index}"]`);
    if (lines) {
      lines.scrollTop = editor.scrollTop;
    }
  }, { capture: true, signal: listenerSignal });

  document.addEventListener("click", async (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const themeButton = event.target.closest("[data-python-theme-toggle]");
    if (themeButton) {
      const block = themeButton.closest(".python-block");
      const nextIsLight = block.classList.contains("is-dark");
      block.classList.toggle("is-dark", !nextIsLight);
      block.classList.toggle("is-light", nextIsLight);
      themeButton.textContent = nextIsLight ? "Dark" : "Light";
      return;
    }

    const addFileButton = event.target.closest("[data-python-file-add]");
    if (addFileButton) {
      const block = addFileButton.closest(".python-block");
      const input = block.querySelector("[data-python-file-name]");
      const list = block.querySelector("[data-python-files]");
      const filename = sanitizePythonFilename(input.value);
      if (!filename) {
        input.focus();
        return;
      }
      if (!list.querySelector(`[data-python-file-card][data-filename="${cssEscape(filename)}"]`)) {
        list.insertAdjacentHTML("beforeend", renderPythonFileCard(filename, ""));
      }
      input.value = "";
      const textarea = list.querySelector(`[data-python-file-card][data-filename="${cssEscape(filename)}"] textarea`);
      textarea?.focus();
      return;
    }

    const button = event.target.closest("[data-python-index]");
    if (!button) {
      return;
    }

    const index = Number(button.dataset.pythonIndex);
    const block = button.closest(".python-block");
    const editor = block.querySelector("[data-python-editor]");
    const output = document.querySelector(`[data-python-output="${index}"]`);
    const code = editor ? editor.value : window.__pythonBlocks?.[index]?.code || "";
    output.hidden = false;
    output.textContent = "Spúšťam kód...";
    button.disabled = true;

    try {
      const pyodide = await loadPyodideRuntime();
      let buffer = "";
      pyodide.setStdout({ batched: (text) => (buffer += `${text}\n`) });
      pyodide.setStderr({ batched: (text) => (buffer += `${text}\n`) });
      const hasFiles = block.querySelector("[data-python-files]");
      if (hasFiles) {
        preparePythonFiles(pyodide, block, index);
      }
      const result = await pyodide.runPythonAsync(code);
      if (result !== undefined) {
        buffer += buffer ? `\n${String(result)}` : String(result);
      }
      if (hasFiles) {
        syncPythonFilesFromRuntime(pyodide, block, index);
      }
      output.textContent = buffer.replace(/\n$/, "") || "Bez výstupu.";
    } catch (error) {
      output.textContent = error.message || String(error);
    } finally {
      button.disabled = false;
    }
  }, { signal: listenerSignal });
}

function pythonBlockLabel(type) {
  if (type === "python-interactive-file") {
    return "Python interactive + files";
  }
  if (type === "python-interactive") {
    return "Python interactive";
  }
  return "Python";
}

function renderPythonFilePanel(index) {
  return `
    <div class="python-file-panel">
      <div class="python-file-toolbar">
        <input data-python-file-name="${index}" placeholder="subor.txt" />
        <button data-python-file-add="${index}">Add file</button>
      </div>
      <div class="python-file-list" data-python-files="${index}">
        ${renderPythonFileCard("data.txt", "")}
      </div>
    </div>
  `;
}

function renderPythonFileCard(filename, content) {
  return `
    <div class="python-file-card" data-python-file-card data-filename="${escapeAttr(filename)}">
      <div class="python-file-name">${escapeHtml(filename)}</div>
      <textarea
        data-python-file-content
        spellcheck="false"
        wrap="off"
      >${escapeHtml(content)}</textarea>
    </div>
  `;
}

function lineCount(code) {
  return String(code).split("\n").length;
}

function renderPythonLineNumbers(code) {
  return Array.from({ length: lineCount(code) }, (_item, index) => `<span>${index + 1}</span>`).join("");
}

function renderPythonLines(code) {
  const lines = String(code).split("\n");
  return lines
    .map(
      (line, index) => `
        <span class="python-line-number">${index + 1}</span>
        <code class="python-line-code">${escapeHtml(line) || " "}</code>
      `,
    )
    .join("");
}

function insertAtCursor(textarea, text) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);
  textarea.value = `${before}${text}${after}`;
  textarea.selectionStart = start + text.length;
  textarea.selectionEnd = start + text.length;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

function preparePythonFiles(pyodide, block, index) {
  const workdir = `/home/pyodide/portal_block_${index}`;
  pyodide.FS.mkdirTree(workdir);
  pyodide.FS.chdir(workdir);
  block.querySelectorAll("[data-python-file-card]").forEach((card) => {
    const filename = card.dataset.filename;
    const textarea = card.querySelector("[data-python-file-content]");
    if (filename && textarea) {
      pyodide.FS.writeFile(filename, textarea.value, { encoding: "utf8" });
    }
  });
}

function syncPythonFilesFromRuntime(pyodide, block, index) {
  const workdir = `/home/pyodide/portal_block_${index}`;
  pyodide.FS.chdir(workdir);
  const list = block.querySelector("[data-python-files]");
  pyodide.FS.readdir(workdir)
    .filter((filename) => filename !== "." && filename !== "..")
    .forEach((filename) => {
      const stat = pyodide.FS.stat(`${workdir}/${filename}`);
      const isDir = pyodide.FS.isDir ? pyodide.FS.isDir(stat.mode) : (stat.mode & 0x4000) === 0x4000;
      if (isDir) {
        return;
      }
      const content = pyodide.FS.readFile(`${workdir}/${filename}`, { encoding: "utf8" });
      let card = list.querySelector(`[data-python-file-card][data-filename="${cssEscape(filename)}"]`);
      if (!card) {
        list.insertAdjacentHTML("beforeend", renderPythonFileCard(filename, content));
        card = list.querySelector(`[data-python-file-card][data-filename="${cssEscape(filename)}"]`);
      }
      const textarea = card.querySelector("[data-python-file-content]");
      if (textarea) {
        textarea.value = content;
      }
    });
}

function preparePythonFilesObject(pyodide, scope, files) {
  const workdir = `/home/pyodide/${String(scope).replaceAll("-", "_")}`;
  pyodide.FS.mkdirTree(workdir);
  pyodide.FS.chdir(workdir);
  Object.entries(files || {}).forEach(([filename, content]) => {
    const safeName = sanitizePythonFilename(filename);
    if (safeName) {
      pyodide.FS.writeFile(safeName, content, { encoding: "utf8" });
    }
  });
}

function syncPythonFilesObject(pyodide, scope) {
  const workdir = `/home/pyodide/${String(scope).replaceAll("-", "_")}`;
  pyodide.FS.chdir(workdir);
  const nextFiles = {};
  pyodide.FS.readdir(workdir)
    .filter((filename) => filename !== "." && filename !== "..")
    .forEach((filename) => {
      const stat = pyodide.FS.stat(`${workdir}/${filename}`);
      const isDir = pyodide.FS.isDir ? pyodide.FS.isDir(stat.mode) : (stat.mode & 0x4000) === 0x4000;
      if (!isDir) {
        nextFiles[filename] = pyodide.FS.readFile(`${workdir}/${filename}`, { encoding: "utf8" });
      }
    });
  return nextFiles;
}

function sanitizePythonFilename(value) {
  const filename = String(value || "").trim();
  if (!filename || filename.startsWith(".") || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return "";
  }
  return filename;
}

function cssEscape(value) {
  if (typeof CSS !== "undefined" && CSS.escape) {
    return CSS.escape(value);
  }
  return String(value).replaceAll('"', '\\"');
}

async function loadPyodideRuntime() {
  if (!window.__pyodide) {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js";
    document.head.appendChild(script);
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
    });
    window.__pyodide = await window.loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.0/full/",
    });
  }
  return window.__pyodide;
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
