.PHONY: build dev down logs migrate shell-backend shell-frontend

build:
	docker compose build

dev:
	docker compose up

down:
	docker compose down

logs:
	docker compose logs -f

migrate:
	docker compose exec backend alembic upgrade head

shell-backend:
	docker compose exec backend bash

shell-frontend:
	docker compose exec frontend sh

