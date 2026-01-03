# AGENTS.md

This file provides guidance to AI coding assistants when working with this repository.

## Project Overview

Novel Reader is a Next.js 16 application for reading imported novels. It stores novel data locally using IndexedDB, allowing offline reading after import. The app targets truyenchucv.org novels which can be extracted using a browser script.

## Tech Stack

- **Framework**: Next.js 16 with App Router (React 19)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **Testing**: Jest with React Testing Library
- **Security**: DOMPurify for HTML sanitization
- **Package Manager**: npm

## Essential Commands

```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build for production
npm run lint         # Run ESLint
npm run type         # Run TypeScript type checking
npm test             # Run all tests
npm run test:coverage # Run tests with coverage
```

## Project Structure

```
src/
├── app/             # Next.js App Router pages
├── components/      # Reusable UI components
├── constants/       # Configuration constants (theme, storage, AI)
├── hooks/           # Custom React hooks
├── lib/             # Utilities and data layer (IndexedDB, AI summary)
└── types/           # TypeScript type definitions
```

## Route Structure

```
/                                    # Home - lists all imported novels
/import                              # Import page - JSON via paste/file/URL
/novel/[slug]                        # Novel detail - chapters list with search
/novel/[slug]/chapter/[chapterSlug]  # Chapter reader with theme settings
/code-display                        # Displays browser extractor script
/api/code                            # API serving browserNovelExtractor.js
```

## Key Architecture Patterns

### Data Layer
- **IndexedDB** (`src/lib/indexedDB.ts`) for client-side persistence
- Stores: `novels` (keyPath: `book.slug`), `chapters` (keyPath: `id`), `currentChapters` (reading progress)
- All IndexedDB functions check `typeof window === 'undefined'` for SSR safety

### Component Patterns
- All page components are client components (`'use client'` directive)
- Functional components with hooks
- Props destructured with TypeScript interfaces
- Components kept focused and single-responsibility (<200 lines)

### Path Aliases
- `@/*` maps to `./src/*` (configured in tsconfig.json)

## Code Style Guidelines

### TypeScript
- Explicit types for function parameters and return values
- Interfaces in `src/types/` directory
- Use `interface` for objects, `type` for unions/aliases

### Naming Conventions
- **Components**: PascalCase (`PageLayout`)
- **Functions/Variables**: camelCase (`saveNovel`)
- **Types/Interfaces**: PascalCase (`NovelInfo`)
- **Constants**: UPPER_SNAKE_CASE (`DB_NAME`)

### Formatting
- No semicolons at statement ends
- Single quotes for strings
- 2-space indentation

### Imports
- Absolute imports with `@/` prefix
- Group: React/types first, external packages, local imports
- Prefer named imports over default

## Testing Notes

- Tests located in co-located `*.test.ts(x)` or `src/**/__tests__/`
- Uses `jest-environment-jsdom` for React component testing
- `fake-indexeddb` for mocking IndexedDB
- ⚠️ Jest does not work properly in worktrees (`.tree/` folder issues)

## Security Considerations

- Chapter content sanitized with DOMPurify before `dangerouslySetInnerHTML`
- API keys stored in localStorage (client-side only)
- No server-side API key storage

## Implementation Checklist

When making changes, ensure:
- [ ] TypeScript types are explicit and correct
- [ ] Error handling is comprehensive
- [ ] Accessibility requirements met (semantic HTML, ARIA labels, keyboard nav)
- [ ] No console.log in production code
- [ ] Sensitive data not hardcoded
