set shell := ["bash", "-cu"]

project_root := "."
backend_dir := "backend"
frontend_dir := "frontend"

# Show available commands.
default:
    just --list

# Install backend and frontend dependencies.
install: backend-install frontend-install

# Backend dependencies.
backend-install:
    cd {{backend_dir}} && cargo fetch

# Frontend dependencies.
frontend-install:
    cd {{frontend_dir}} && npm install

# Run backend server.
backend-run:
    cd {{backend_dir}} && cargo run

# Compile-check backend.
backend-check:
    cd {{backend_dir}} && cargo check

# Build backend.
backend-build:
    cd {{backend_dir}} && cargo build

# Run backend tests.
backend-test:
    cd {{backend_dir}} && cargo test

# Format backend source.
backend-fmt:
    cd {{backend_dir}} && cargo fmt

# Lint backend source.
backend-clippy:
    cd {{backend_dir}} && cargo clippy --all-targets --all-features -- -D warnings

# Health endpoint check (backend must already be running).
backend-health:
    curl -fsS http://127.0.0.1:3000/health

# Run frontend dev server.
frontend-dev:
    cd {{frontend_dir}} && npm run dev

# Build frontend.
frontend-build:
    cd {{frontend_dir}} && npm run build

# Start frontend production server.
frontend-start:
    cd {{frontend_dir}} && npm run start

# Lint frontend.
frontend-lint:
    cd {{frontend_dir}} && npm run lint

# Type-check frontend.
frontend-typecheck:
    cd {{frontend_dir}} && npx tsc --noEmit

# Run all common quality checks.
check: backend-check frontend-lint frontend-typecheck

# Build both backend and frontend.
build: backend-build frontend-build

# Clean build artifacts.
clean:
    cd {{backend_dir}} && cargo clean
    rm -rf {{frontend_dir}}/.next

# Show project work log.
log-show:
    cat work-log.md

# Open project work log in your preferred editor.
log-edit:
    ${EDITOR:-vi} work-log.md
