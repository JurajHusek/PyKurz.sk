# Python Course Portal

Portal podobny Trinket.io pre tvorbu kurzov s markdown ucebnicou a lokalne spustitelnym Pythonom cez Pyodide.

## Stack

- Backend: FastAPI, SQLAlchemy, PostgreSQL, JWT auth
- Frontend: Next.js + React, JavaScript
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
