# Sapling Example

## Prerequisites

All instructions are for MacOS / Homebrew, but feel free to use whichever installation methods you would prefer.

1. Install `just`

   ```bash
   brew install just
   ```

1. Install `pnpm`

   ```bash
   corepack enable pnpm # if you use corepack

   # or

   npm i -g pnpm # if you don't care for version management
   ```

1. Install Postgres (Postgres.app is the easiest to use on MacOS)

   ```bash
   brew install --cask postgres-unofficial
   ```

1. Install [`migrate`](https://github.com/golang-migrate/migrate)

   ```bash
   brew install golang-migrate

   # or use the shell install (works on all platforms)
   curl -L https://github.com/golang-migrate/migrate/releases/download/$version/migrate.$os-$arch.tar.gz | tar xvz
   ```

## Instructions

1. Copy `.env.example` to `.env` and fill it out

1. If you haven't yet, create the database then run:

   ```bash
   just migrate up
   ```

1. Run the dev server:

   ```bash
   pnpm run dev
   ```

## Tests

- Get all todos

  ```bash
  curl -L 'localhost:3000/api/todo'
  ```

- Get todo by ID

  ```bash
  curl -L 'localhost:3000/api/todo/1' # replace the 1 with the todo ID you would like to fetch
  ```

- Create todo (invalid request body)

  ```bash
  curl -L 'localhost:3000/api/todo' \
  -H 'Content-Type: application/json' \
  -d '{}'
  ```

- Create todo (valid request body)

  ```bash
  curl -L 'localhost:3000/api/todo' \
  -H 'Content-Type: application/json' \
  -d '{
      "name": "TodoNow",
      "description": "can be undefined"
  }'
  ```

- Toggle todo

  ```bash
  curl -L -g -X POST 'localhost:3000/api/todo/1/toggle' # replace the 1 with the todo ID you would like to toggle
  ```
