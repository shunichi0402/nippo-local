MISE := mise
NPM := $(MISE) exec -- npm
COMPOSE := docker compose -f docker/compose.yml

.PHONY: install dev dev-local dev-api dev-web build typecheck test db-migrate compose-up compose-down compose-logs clean

install:
	$(MISE) install
	$(NPM) install

dev: compose-up

dev-local:
	$(NPM) run dev

dev-api:
	$(NPM) run dev -w @nippo-local/api

dev-web:
	$(NPM) run dev -w @nippo-local/web

build:
	$(NPM) run build

typecheck:
	$(NPM) run typecheck

test:
	$(NPM) run test

db-migrate:
	$(NPM) run db:migrate

compose-up:
	$(COMPOSE) up --build

compose-down:
	$(COMPOSE) down

compose-logs:
	$(COMPOSE) logs -f

clean:
	rm -rf node_modules apps/api/node_modules apps/web/node_modules apps/api/dist apps/web/dist coverage
