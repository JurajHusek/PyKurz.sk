# Backend deploy na Vercel

Backend je pripraveny ako Vercel Python/FastAPI function cez `api/index.py`.

## Vercel nastavenia

Deployuj priecinok `backend` ako samostatny Vercel projekt.

Env premenne nastav vo Verceli:

```env
TURSO_DATABASE_URL=libsql://tvoja-db.turso.io
TURSO_AUTH_TOKEN=...
JWT_SECRET=dlhy-nahodny-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
BACKEND_CORS_ORIGINS=https://tvoj-frontend.example.com,http://localhost:5173
```

## Migracie

Vercel function nema spustat migracie pri requestoch. Migracie spusti manualne z lokalneho stroja s rovnakymi Turso env premennymi:

```bash
cd backend
alembic upgrade head
```

Po deployi otestuj:

```txt
https://tvoj-backend.vercel.app/health
https://tvoj-backend.vercel.app/docs
```
