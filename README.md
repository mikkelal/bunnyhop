# bunnyhop

A CLI tool for deploying static files to [Bunny.net](https://bunny.net) CDN storage with smart incremental uploads and automatic cache purging.

## Features

- **Incremental deploys** — only uploads files that have changed
- **Automatic cache purging** — purges CDN cache for modified files after deploy
- **CI-friendly** — non-interactive mode for CI
- **`.deployignore` support** — exclude files from deployment using gitignore-style patterns

## Setup

Have these env vars set in your enviorment, or in a `.env` file (you can change the path of the file by using the `--env-file` flag):

```env
BUNNY_STORAGE_ZONE=
BUNNY_STORAGE_ACCESS_KEY=
BUNNY_REGION=

# Needed for purgining the CDN, don't need if using --skip-purge
BUNNY_API_KEY=
BUNNY_PULL_ZONE_URL=
```


# Usage

```bash
npx bunnyhop deploy ./dist
```

### Or with Deno

```bash
dx bunnyhop deploy ./dist
```

Or with permisions set:

```bash
dx \
  --allow-read=. \
  --allow-env \
  --allow-net='*.storage.bunnycdn.com,storage.bunnycdn.com,api.bunny.net' \
  bunnyhop deploy ./dist
```



This will:
1. Read your `.env` file
1. Scan your local build directory (default: `dist/`)
1. Diff files against the remote storage zone
1. Delete files no longer in the build from storage
1. Upload new and changed files
1. Purge CDN cache for modified paths

#### Options

| Flag | Env Variable | Default | Description |
|------|-------------|---------|-------------|
| `--build-dir` | — | `dist` | Build output directory to deploy |
| `--region` | `BUNNY_REGION` | — | Storage region code |
| `--storage-zone` | `BUNNY_STORAGE_ZONE` | — | Storage zone name |
| `--access-key` | `BUNNY_STORAGE_ACCESS_KEY` | — | Storage API access key |
| `--api-key` | `BUNNY_API_KEY` | — | Account API key (for purging) |
| `--pullzone-url` | `BUNNY_PULL_ZONE_URL` | — | Pull zone URL (for purging) |
| `--skip-purge` | `BUNNY_SKIP_PURGE` | `false` | Skip CDN cache purging |
| `--keep-unknown-files` | `BUNNY_KEEP_UNKNOWN_FILES` | `false` | Don't delete remote files missing from build |
| `--purge-strict` | — | `false` | Fail if any purge requests fail |
| `--ci` | `CI` | `false` | CI friendly output from CLI |
| `--concurrency` | — | `100` | API request concurrency |
| `--retry-limit` | — | `3` | Retry attempts for failed requests |
| `--replication-timeout` | — | `10000` | Ms to wait for geo-replication before purging |
| `--request-timeout` | — | `5000` | API request timeout in ms |

### Purge

Purge specific paths from the CDN cache:

```bash
bunnyhop purge /index.html /about/ /css/style.css
```

## `.deployignore`

Create a `.deployignore` file in your project root to exclude files from deployment. Uses the same syntax as `.gitignore`. 

Example: 

```
*.map
.DS_Store
```

