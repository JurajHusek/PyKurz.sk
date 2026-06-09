# Python Course Portal

Portal podobny Trinket.io pre tvorbu kurzov s markdown ucebnicou a lokalne spustitelnym Pythonom cez Pyodide.

## Stack

- Backend: FastAPI, SQLAlchemy, SQLite, JWT auth
- Frontend: Next.js + React, JavaScript
- Markdown editor: EasyMDE
- Python runtime: Pyodide v browseri
- Dev orchestration: Docker Compose + Makefile

## Databaza

Projekt je nastavany na SQLite, aby sa dal lacno a jednoducho nasadit bez samostatneho Postgres servera.
V Dockeri sa databaza uklada do `backend/data/course_portal.db` cez mount `/data/course_portal.db`.

Volitelne vies backend napojit na Turso/libSQL. Nastav v env:

```env
TURSO_DATABASE_URL=libsql://tvoja-db.turso.io
TURSO_AUTH_TOKEN=...
```

Ak su tieto hodnoty nastavene, backend pouzije Turso namiesto lokalneho SQLite suboru.
Pri Docker Compose dev spusteni vloz tieto hodnoty do `.env` v koreni projektu. Pri spusteni backendu bez Dockeru ich mozes dat do `backend/.env`.

## Spustenie

```bash
make build
make dev
```

Frontend: http://localhost:5173

Backend API: http://localhost:8000

API docs: http://localhost:8000/docs

Staticky build frontendu:

```bash
cd frontend
npm run build
```

Vystup pre staticky hosting bude v `frontend/out/`.

Vypnutie:

```bash
make down
```

## Seed flow

1. Zaregistruj pouzivatela.
2. Pri registracii zvol rolu `Autor` alebo `Student`.
3. Autor vie vytvorit kurz, student vie verejne kurzy citat a spustat ukazky.
4. Pridaj alebo uprav stranky v kurze.
5. Markdown stranky mozu obsahovat Python bloky:

````markdown
```python
print("Ahoj z Pyodide")
```
````

Editovatelny Python blok pre citatela zapis takto:

````markdown
```python-interactive
name = "Ada"
print("Ahoj", name)
```
````

Editovatelny Python blok s virtualnymi subormi zapis takto:

````markdown
```python-interactive-file
with open("data.txt", "w") as file:
    file.write("Ahoj subor")

with open("data.txt") as file:
    print(file.read())
```
````

Autor moze kurz upravovat, ostatni prihlaseni pouzivatelia ho vedia citat a spustat ukazky, ale nie menit obsah.

## Kurzy a testy

- Student sa musi prihlasit na kurz, aby mohol odovzdat test.
- Autor kurzu vie vytvarat testy, zverejnit ich alebo nezverejnit.
- Nezverejneny test neprijima odovzdania.
- Autor vidi prihlasenych studentov a vie ich z kurzu odmazat.
- Autor vidi odovzdany kod studenta a vie ho spustit v Pyodide.

## Backend na Vercel

Backend priecinok `backend/` je pripraveny ako samostatny Vercel projekt cez `backend/api/index.py` a `backend/vercel.json`.
Detailny postup je v `backend/README_DEPLOY.md`.

## Frontend na GitHub Pages

Pri projektovej GitHub Pages URL typu `https://username.github.io/nazov-repa/` musi mat Next staticky export nastavenu premennu:

```env
NEXT_PUBLIC_BASE_PATH=/nazov-repa
```

GitHub Actions workflow ju nastavuje automaticky podla nazvu repozitara, ak nie je zadana manualne.
