# Python Course Portal

Portal podobny Trinket.io pre tvorbu kurzov s markdown ucebnicou a lokalne spustitelnym Pythonom cez Pyodide.

## Stack

- Backend: FastAPI, SQLAlchemy, PostgreSQL, JWT auth
- Frontend: plain HTML/CSS/JS cez Vite
- Markdown editor: EasyMDE
- Python runtime: Pyodide v browseri
- Dev orchestration: Docker Compose + Makefile

## Spustenie

```bash
make build
make dev
```

Frontend: http://localhost:5173

Backend API: http://localhost:8000

API docs: http://localhost:8000/docs

Vypnutie:

```bash
make down
```

## Seed flow

1. Zaregistruj pouzivatela.
2. Vytvor kurz.
3. Pridaj alebo uprav stranky v kurze.
4. Markdown stranky mozu obsahovat Python bloky:

````markdown
```python
print("Ahoj z Pyodide")
```
````

Autor moze kurz upravovat, ostatni prihlaseni pouzivatelia ho vedia citat a spustat ukazky, ale nie menit obsah.
