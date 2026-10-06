# Remedia

> The remedy for scattered media lists.

Remedia is a local-first mobile app to log everything you watch, read, play and do in your free time — in one place, on your device, in files you own.

**Status:** early development. Nothing to install yet.

---

## Why Remedia?

Most people track their leisure across several apps: one for movies, another for books, another for games. Each one keeps your data in its own cloud, with its own fixed categories. When a title is missing from its database, you simply can't add it.

Remedia takes a different approach:

- **Local-first.** Your data lives on your device and works fully offline. No account, no server.
- **Your data, your files.** Export everything at any time. Optional compatibility with [Obsidian](https://obsidian.md) vaults (Markdown + frontmatter), so Remedia can be the quick-capture companion to your notes.
- **Flexible record types.** Movies, series, books and games out of the box — and templates to add any other kind of record in the future (concerts, board games, gym routines…).
- **Never blocked by a missing title.** If an API doesn't have it, you add it yourself, with your own data and your own poster.

## Two ways to work

Remedia lets you choose your workflow, like picking a difficulty level in a game. Both modes produce exactly the same kind of record.

| Mode | How it works |
|---|---|
| **Automatic** | Search a title → pick a result from the enabled providers → the form is filled in for you → review and save. If nothing is found, you continue with an empty form. |
| **Manual** | Go straight to the form and fill in everything yourself, including the image. |

The mode can be set globally or per record type.

## Data model

Every record has the same structure, whatever its type:

```
Record
├── Core (shared by all records)
│   ├── id
│   ├── type              → movie, series, book, game, …
│   ├── title
│   ├── original_title    (optional)
│   ├── image             → local file path
│   ├── status            → planned / in progress / completed / paused / dropped
│   ├── rating            (0–10, optional)
│   ├── tags []
│   ├── notes
│   └── created_at / updated_at
│
├── Type fields (defined by the record's template)
│   └── e.g. { year, director, runtime } or { platform, hours_played }
│
├── History []  (every time you engaged with it)
│   └── { started_at, finished_at, progress, rating, notes, data{} }
│
└── External links []  (optional)
    └── { service, external_id }   e.g. { tmdb, 12345 }
```

**Templates** define each record type: its fields, valid statuses and how progress is measured (episodes, pages, hours, sets…). Adding a new type means adding a template, not changing the structure.

## Planned providers

| Type | Provider |
|---|---|
| Movies & series | TMDB |
| Games | IGDB |
| Books | Open Library |
| Anime & manga | AniList |

Users choose which providers are enabled and use their own API keys where required.

## Tech stack

- [React Native](https://reactnative.dev) + [Expo](https://expo.dev)
- TypeScript
- SQLite (`expo-sqlite`) with [Drizzle ORM](https://orm.drizzle.team)
- Internationalization from day one: English (default) and Spanish

## Roadmap

- [ ] **MVP** — data model, movies only, full manual mode with custom images
- [ ] **Automatic mode** — TMDB provider, local poster caching, per-type mode setting
- [ ] **More types** — series (episode progress), books, games
- [ ] **Your data** — export/import, backups, Obsidian vault import/export
- [ ] **Custom templates** — create your own record types from the app
- [ ] **Optional sync** — self-hostable sync server (Python / FastAPI)

## Getting started

Coming soon.

## License

[MIT](LICENSE)
