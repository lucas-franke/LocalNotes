# LocalNotes

A minimalist, Notion-like note-taking app that runs entirely in the browser. There is no server: notes are stored in the browser's IndexedDB and can be exported/imported as a JSON project file.

## Features

- Block editor ([BlockNote](https://www.blocknotejs.org/)) with slash commands (`/`) for headings, lists, checklists, quotes, code, tables, images and more, plus markdown shortcuts (`#`, `-`, `[]`, …)
- Nested folders, favorites, pinned notes (pinned notes stay at the top of their list)
- Drag and drop in the sidebar to reorder notes and folders or move them into other folders (or use **Move up / down** in the row menu)
- Full-text search across titles and note content
- Export all notes as `localnotes-YYYY-MM-DD.json`; import with **Merge** (newer edit wins) or **Replace**
- Light/dark mode
- Right-click (or the `…` button) on a note or folder for all actions

Shortcuts: `Ctrl+Alt+N` new note · `Ctrl+\` toggle sidebar

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static build in dist/, host anywhere
npm run lint
```

Stack: Vite, React, TypeScript, Tailwind CSS v4, shadcn/ui, BlockNote, Dexie (IndexedDB), zod.

## Where data lives

Notes live only in the browser (and browser profile) you use. Clearing site data deletes them, so export regularly. The sidebar shows when you last exported. Images are embedded in the note as data URLs, so they are included in the export.

## Project structure

```
src/db/          Dexie schema and CRUD for notes and folders
src/lib/         project file export/import
src/components/  sidebar, editor, dialogs; ui/ contains shadcn components
src/hooks/       hash-based routing (#/note/<id>)
```
