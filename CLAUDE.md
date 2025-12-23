# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Novel Reader is a Next.js 16 application for reading imported novels. It stores novel data locally using IndexedDB, allowing offline reading after import. The app targets truyenchucv.org novels which can be extracted using a browser script.

## Tech Stack

- **Framework**: Next.js 16 with App Router (React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Testing**: Jest with React Testing Library
- **Package Manager**: npm

## Commands

### Development
```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build for production
npm run start        # Start production server
```

### Code Quality
```bash
npm run lint         # Run ESLint
npm run type         # Run TypeScript type checking (no emit)
```

### Testing
```bash
npm test                    # Run all tests
npm run test:coverage       # Run tests with coverage report
```

Tests are located in:
- Co-located `*.test.ts` or `*.test.tsx` files
- `src/**/__tests__/**/*.test.{js,jsx,ts,tsx}`

### Versioning
```bash
npm run version-patch   # Bump patch version (0.2.0 -> 0.2.1)
npm run version-minor   # Bump minor version (0.2.0 -> 0.3.0)
npm run version-major   # Bump major version (0.2.0 -> 1.0.0)
```

## Architecture

### Data Flow

Novels are imported via JSON (pasted, file upload, or URL fetch) through `/import`. The `importNovelFromJson` function in `src/lib/importNovel.ts` processes the data and stores it in IndexedDB via `src/lib/indexedDB.ts`.

**IndexedDB Schema** (DB name: `novel-reader`, version: 2):
- `novels` store - keyPath: `book.slug`
- `chapters` store - keyPath: `id` (compound: `${novelSlug}-${chapterSlug}`), indexed by `novelSlug`
- `currentChapters` store - keyPath: `novelSlug`, tracks reading progress

### Route Structure

```
/                          # Home page - lists all imported novels
/import                    # Import page - accepts JSON via paste/file/URL
/novel/[slug]              # Novel detail page - chapters list with search
/novel/[slug]/chapter/[chapterSlug]  # Chapter reader with theme settings
/code-display              # Displays the browserNovelExtractor.js script
/api/code                  # API endpoint that serves browserNovelExtractor.js
```

### Key Components

- **PageLayout** (`src/components/PageLayout.tsx`) - Wrapper component with configurable max-width and padding
- **Icons** (`src/lib/icons.tsx`) - Icon components (HomeIcon, BookOpenIcon, ImportIcon, ChevronLeftIcon, ChevronRightIcon)

### Reading Theme System

Chapter reader supports customizable themes persisted in localStorage:
- Background: light, dark, sepia, night
- Font family: serif, sans-serif, monospace
- Font size: 12-24px
- Line height: 1.2-2.0
- Padding: compact, normal, wide, full

CSS custom properties are set on `document.documentElement` based on theme config.

### Novel Data Extraction

The `src/lib/browserNovelExtractor.js` file is a browser console script for extracting novels from truyenchucv.org. It:
1. Fetches novel metadata from Next.js data endpoints
2. Handles paginated chapter lists
3. Fetches chapter content in batches of 5
4. Handles 403 errors by falling back to HTML parsing
5. Returns a JSON object matching the `Novel` type

Users run this script in browser console on a novel page, then import the resulting JSON.

### Path Aliases

`@/*` maps to `./src/*` (configured in `tsconfig.json` and `jest.config.js`)

### Image Configuration

Remote images from `static.truyenchucv.org` are allowed in `next.config.ts`.

## Testing Notes

- Tests use `jest-environment-jsdom` for React component testing
- All page components are client components (`'use client'` directive)
- IndexedDB functions check for `typeof window === 'undefined'` to avoid SSR issues
