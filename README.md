# 🚀 Project Setup & Deployment Guide

## 📌 Running Locally

Follow these steps to set up and run the project locally:

```sh
# Install dependencies
bun install

# Generate Prisma Client
bun run prisma:generate

# Apply database migrations
bun run migration:apply:local

# Start development server
bun run dev
```

## 🔍 Development Commands

```sh
# Type checking
bun run typecheck

# Linting
bun run lint

# Run tests
bun run test

# Build project
bun run build
```

## 🚀 Deployment

The project is automatically deployed to Cloudflare Workers when changes are pushed to the main branch.

For manual deployment, you'll need:
- Cloudflare API Token
- Cloudflare Account ID
- JWT Secret

```sh
# Login to Cloudflare
bunx wrangler login

# Apply database migrations
bun run migration:apply:remote

# Set up JWT secret (use the same value as in GitHub secrets JWT_SECRET)
bunx wrangler secret put JWT_SECRET

# Deploy manually
bunx wrangler deploy
```

## 🔧 Useful Commands

- **Generate a database migration:**
  ```sh
  bunx wrangler d1 migrations create animation-db <migration-name>
  ```  

- **Add a secret to Cloudflare:**
  ```sh
  bunx wrangler secret put <key-name>
  ```

## 🔐 Required Environment Variables

For deployment you need to set up:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `JWT_SECRET` - Secret key for JWT token generation and validation

---