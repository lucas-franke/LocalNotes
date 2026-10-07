# LocalNotes

A minimalist, Notion-like note-taking app that runs entirely in the browser. There is no server: notes and boards are stored in the browser's IndexedDB and can be exported/imported as a JSON project file.
([Try it out](https://lucas-franke.github.io/LocalNotes/))

## Disclaimer

This Project and its content are written by Claude Code.

## Features

- Block editor ([BlockNote](https://www.blocknotejs.org/)) with slash commands (`/`) for headings, lists, checklists, quotes, code, tables, images and more, plus markdown shortcuts (`#`, `-`, `[]`, …)
- Covers: every note gets a colored gradient from a fixed palette by default (a note always keeps the same one). Click the cover to pick another gradient, upload an image (or drop an image file on it), or remove it; **Add cover** brings it back. Note cards show the cover too
- Card views (**Full** / **Cover** / **Title**): the folder view has one switch for all cards; on a board every card has its own view (card menu) and the toolbar in the top-right corner sets all of them at once (new cards start in that view)
- Nested folders, favorites, pinned notes (pinned notes stay at the top of their list)
- Drag and drop in the sidebar to reorder notes and folders or move them into other folders (or use **Move up / down** in the row menu)
- **Boards**: an infinite canvas per topic (pan and zoom) with note cards, text annotations and images
  - Add items with the round **+** button (centered while a board is empty, bottom-right otherwise): pick an existing note, add text, or add images (file picker, paste with `Ctrl+V`, or drop files onto the canvas)
  - Drag a note from the sidebar onto the board to add it as a card at that spot
  - Cards are live views of your notes (renaming or editing a note updates every board); moving, resizing and deleting items is saved automatically; removing a card never deletes the note
  - Double-click a card (or use its pencil button) to edit the note right there, with the full editor and slash commands; one card is edited at a time, `Escape` or the check button finishes
- A new note you never touch (no title, no text, not pinned, favorited or moved) is not kept when you move on to something else
- Full-text search across titles and note content
- Backup: export everything (notes, folders, boards and their images, including note covers) as `localnotes-YYYY-MM-DD.json`; import with **Merge** (the more recently edited note or board wins) or **Replace**
- Light/dark mode
- Right-click (or the `…` button) on a note, folder or board for all actions

Shortcuts: `Ctrl+Alt+N` new note · `Ctrl+K` search · `Ctrl+\` toggle sidebar

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static build in dist/, host anywhere
npm run lint
```

Stack: Vite, React, TypeScript, Tailwind CSS v4, shadcn/ui, BlockNote, [React Flow](https://reactflow.dev/) (the board canvas, MIT; its small "React Flow" attribution link stays visible), dnd-kit, Dexie (IndexedDB), zod.

## Where data lives

Notes, boards and images live only in the browser (and browser profile) you use. Clearing site data deletes them, so export regularly. The sidebar shows when you last exported.

The backup file is plain JSON. Images from boards (and images inside notes) are stored inside it as text, so a backup with many large photos gets big; images added to a board are scaled down to at most 2048 px on the long side.

Backup files from earlier versions (notes and folders only) still import. Note that **Replace** makes the app match the file, so it also removes boards that are not in it.

## Project structure

```
src/db/          Dexie schema and CRUD for notes, folders, boards and image assets
src/lib/         project file export/import (format version 3)
src/components/  sidebar, editor, board canvas (board/), drag and drop (dnd/), dialogs; ui/ has the shadcn components
src/hooks/       hash-based routing (#/note/<id>, #/folder/<id>, #/board/<id>)
```
