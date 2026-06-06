# Database Schema & Migrations

## Stack
- **Provider:** MongoDB (via Prisma ORM)
- **Shards:** 3 active MongoDB shards with workspace-consistent hashing
- **CLI:** `prisma` (devDependency)

## Workflow

Since MongoDB is schema-flexible, Prisma for MongoDB uses `db push`
instead of traditional migration files.

### After schema changes:

```bash
prisma generate   # Regenerate Prisma Client types
```

The `build` script already runs `prisma generate` automatically.

### Pushing schema to production:

```bash
prisma db push    # Apply schema changes directly to MongoDB
```

### To create a migration snapshot (documentation only):

```bash
prisma db push --accept-data-loss --force-reset
```

## Important Notes
- There are NO formal migration files — schema drift is managed via `db push`.
- Always run `prisma generate` after pulling schema changes from git.
- Test schema changes on a staging DB before pushing to production.
- The `@map("_id")` pattern maps Prisma's `id` field to MongoDB's `_id`.
