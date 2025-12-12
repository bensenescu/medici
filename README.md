# Medici - Expense Splitting App

A modern expense-sharing app built for Every App.

Based on: https://github.com/mrkaye97/medici

## Prerequisites

Before running this app, you need to deploy the Every App Gateway.

### Deploy the Gateway (< 5 mins)

Follow these instructions to deploy the gateway:

https://everyapp.dev/docs/getting-started/deploy-gateway/

## Deploy the App (1 min)

1. Clone this repo and navigate to the directory:

```sh
git clone https://github.com/bensenescu/medici.git
cd medici
```

2. Deploy this app to production with a single command:

```sh
every app deploy
```

3. Navigate to your Gateway URL output by the deploy command

- You should see the app in your gateway which you can now interact with.

### What Happens

Running this command will:

1. **Build your code** - Compiles your TanStack Start app for Cloudflare Workers
2. **Create resources** - Creates your D1 Database or KV Store if they don't already exist
3. **Run migrations** - Executes any pending database migrations
4. **Deploy to Workers** - Uploads your code to Cloudflare's edge network

### Updating Your App

Just run the same command again:

```sh
every app deploy
```

---

## Local Development

> **Important:** You must run `every app deploy` first to create the D1 database. Your local environment needs the database ID from this deployment to work properly.

### Start Development Server

```sh
pnpm install
pnpm run dev

# After running dev, it will initialize Cloudflare's local setup which will add a local sqlite db. You can now run the migrations.
pnpm run db:migrate:local
```

This starts the Vite dev server with hot reloading. Your app will be available at the port shown in the terminal (usually `http://localhost:3001`).

#### Change app config for local dev

In the gateway, edit the medici app entry and set the App URL to your localhost dev url so that you can access your app from within the Gateway.

### Common Commands

```sh
# Type checking - run frequently to catch errors early
pnpm run types:check

# Check formatting
pnpm run format:check

# Fix formatting
pnpm run format:write
```

### Database Operations

1. **Create a migration** - Change your schema in `src/db/schema.ts`, then run:

   ```sh
   pnpm run db:generate
   ```

2. **Run migrations**

   ```sh
   # Local
   pnpm run db:migrate:local

   # Production
   pnpm run db:migrate:prod
   ```

3. **View database data**

   ```sh
   # Local
   pnpm run db:studio:local

   # Production
   pnpm run db:studio:prod
   ```

### Cloudflare Types

If you change Cloudflare resources in your `wrangler.jsonc` (add a KV namespace, change D1 binding name, etc.):

```sh
pnpm run cf-typegen
```

This regenerates the `worker-configuration.d.ts` file so TypeScript knows about your bindings.

### Project Structure

```
src/
├── client/           # Client-only code
│   ├── components/   # React components
│   ├── hooks/        # Custom hooks
│   └── tanstack-db/  # TanStack DB collections
├── db/               # Database
│   └── schema.ts     # Drizzle schema
├── embedded-sdk/     # Gateway integration
│   ├── client/       # Client SDK
│   └── server/       # Server SDK
├── routes/           # TanStack Router routes
├── server/           # Server-side code
│   ├── repositories/ # Data access layer
│   └── services/     # Business logic
├── serverFunctions/  # TanStack server functions
└── app.tsx           # App entry point
```

### Tips

- **Keep client code in `/client`** - Helps avoid accidentally importing server code on the client
- **Use server functions for all data mutations** - Don't call repositories directly from components
- **Always use TanstackDB** - Use TanstackDB api's for queries and mutations in the frontend. TanstackDB abstractions should be the only place calling serverFunctions directly.
- **Run `types:check` before committing** - Catches errors that hot reload might miss

## On Vibe Coding

Vibe coding is the best and most fun way to extend this app. AI coding assistants work exceptionally well with Every App's patterns.

See the [Coding Agent Setup](https://everyapp.dev/docs/coding-agent/setup/) docs to configure your AI agent with:

- The [llms.txt](https://everyapp.dev/llms.txt) for answering questions about Every App
- Example apps to reference (cloned to a hidden `.every-app` folder)

> **Note for AI agents:** The `.every-app` folder is hidden (starts with `.`) and gitignored. If you can't find it, look for hidden folders or check that the clone command was run successfully.

Check out the [helpful prompts](https://everyapp.dev/docs/coding-agent/prompts/review-code/) for code review, security audits, and schema design - or build your own!

## Helpful Resources

- [Every App Documentation](https://everyapp.dev/docs/introduction)
- [TanStack Start on Cloudflare](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack/)
- [Drizzle ORM with D1](https://orm.drizzle.team/docs/connect-cloudflare-d1)
