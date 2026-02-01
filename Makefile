# CLINITO – common targets (run from repo root)
# Usage: make dev | make build | make lint | make test | make clean

.PHONY: dev build lint test test-unit clean

dev:
	npm run dev

build:
	npm run build

lint:
	npm run lint

test: test-unit

test-unit:
	@echo "Run unit tests: npm run test (when configured)"
	@test -f package.json && (grep -q '"test"' package.json && npm run test || echo "No test script in package.json")

clean:
	rm -rf .next
	rm -rf node_modules/.cache
