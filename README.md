# PyKurz.sk

PyKurz.sk is a web platform for creating and sharing interactive Python courses. It is designed for teachers, students, and beginner programmers who need a lightweight learning environment with course pages, markdown-based materials, browser-executable Python examples, and practical coding tests.

Live demo: [https://jurajhusek.github.io/PyKurz.sk/](https://jurajhusek.github.io/PyKurz.sk/)

## Project Purpose

The goal of the project is to provide a simple educational portal inspired by tools such as Trinket.io, but focused on course authoring and classroom use. Teachers can create courses, write lesson content, add interactive Python blocks, publish tests, and review student submissions. Students can browse public courses, enroll in them, run Python code directly in the browser, and submit solutions to assigned tests.

Python execution runs locally in the browser through Pyodide, so students do not need to install Python or any external development tools.

## Main Features

- User registration and login with teacher/student roles
- Public course browsing
- Course creation and editing for teachers
- Markdown-based course pages
- Interactive Python code blocks powered by Pyodide
- Python blocks with simulated file operations
- Student enrollment in courses
- Publishable and unpublishable course tests
- One-time student test submissions
- Teacher view for enrolled students and submitted code
- Light/dark mode for the application and Python editors
- Containerized local development with Docker Compose

## Technology Stack

- Backend: FastAPI, SQLAlchemy, Alembic, JWT authentication
- Frontend: Next.js, React, plain JavaScript, HTML, CSS
- Python runtime: Pyodide
- Markdown editor: EasyMDE
- Database: SQLite by default, with optional Turso/libSQL support
- Development environment: Docker Compose and Makefile

## Project Structure

```text
.
├── backend/              # FastAPI application, database models, schemas, API routes
│   ├── app/
│   │   ├── api/          # API endpoints
│   │   ├── core/         # Configuration and security
│   │   ├── db/           # Database session setup
│   │   ├── models/       # SQLAlchemy models
│   │   └── schemas/      # Pydantic schemas
│   ├── alembic/          # Database migrations
│   └── api/              # Vercel serverless entrypoint
├── frontend/             # Next.js frontend application
│   ├── app/              # Application pages and UI
│   └── lib/              # API client and shared frontend helpers
├── docker-compose.yml    # Local multi-container setup
├── Makefile              # Common development commands
└── README.md
```

## Local Development

Build and start the application:

```bash
make build
make dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- API documentation: `http://localhost:8000/docs`

Stop the development environment:

```bash
make down
```

## Database

The project uses SQLite by default to keep development and low-cost deployment simple. In Docker-based local development, the database file is stored in:

```text
backend/data/course_portal.db
```

The backend can also be configured to use Turso/libSQL for hosted SQLite-compatible storage.

## Author

The author of the project is **Bc. Juraj Hušek**, a student at **FEI STU** in the field of **Applied Informatics**. He was also a computer science teacher during the academic years **2024/25** and **2025/26** at **Gymnázium sv. Františka Assiského v Malackách**.
