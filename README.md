

---

# 🚀 Project Setup & Deployment Guide

## 📌 Running Locally

Follow these steps to set up and run the project locally:

```sh
bun install
bun run prisma:generate
bun run migration:apply:local
npm run dev
```

## 🚀 Deployment

To deploy the project, run:

```sh
wrangler login
bun run migration:apply:remote
npx wrangler secret put JWT_SECRET
bun run deploy
```

## 🔧 Useful Commands

- **Generate a database migration:**
  ```sh
  npx wrangler d1 migrations create animation-db <your migration name>
  ```  

- **Add a secret key:**
  ```sh
  npx wrangler secret put <your key>
  ```

---