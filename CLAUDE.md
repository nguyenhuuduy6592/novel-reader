# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Novel Reader is a Next.js 16 application for reading imported novels. It stores novel data locally using IndexedDB, allowing offline reading after import. The app targets truyenchucv.org novels which can be extracted using a browser script.

## Tech Stack

- **Framework**: Next.js 16 with App Router (React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Testing**: Jest with React Testing Library
- **Security**: DOMPurify for HTML sanitization
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

### Testing in Worktrees

⚠️ **Jest does not work properly in worktrees.** The `.tree/` folder structure causes test discovery issues.

**Workaround**:
1. Navigate to the main branch folder (parent of `.tree/`)
2. Run the full test suite from main
3. Use grep to filter relevant test results for your worktree changes

**Example** - When working on feature `fix-chapter-sorting`:

```bash
# From worktree folder: d:\Code\Personal\novel-reader\.tree\fix-chapter-sorting
# Navigate to main root
cd ../..

# Run tests from main and grep for your feature
npm test 2>&1 | grep -i "sorting\|slug"
# Or for more comprehensive results:
npm test 2>&1 | grep -E "(sorting|slug|PASS|FAIL)"
```

**Detection**: You're in a worktree if your current working directory path contains `.tree/`

### Versioning
```bash
npm run version-patch   # Bump patch version (0.2.0 -> 0.2.1)
npm run version-minor   # Bump minor version (0.2.0 -> 0.3.0)
npm run version-major   # Bump major version (0.2.0 -> 1.0.0)
```

### Worktree Management

Git worktrees are used for parallel feature development. Worktrees are stored in `.tree/` directory (added to `.gitignore`).

**Create Worktree** (`worktree:create`):
- Generates a unique branch name from context (letters, numbers, hyphens, underscores only)
- Creates worktree: `bash C:/Users/nguye/.claude/scripts/worktree-create.sh <branch-name>`

**Merge Worktree** (`worktree:merge`):
- Read the folder name of the worktree as branch name
- Merge the worktree: `bash C:/Users/nguye/.claude/scripts/worktree-merge.sh <folder-name>`

Example workflow:
```bash
# 1. Create worktree (from main directory)
bash C:/Users/nguye/.claude/scripts/worktree-create.sh feature-add-search

# 2. Work in the worktree
cd .tree/feature-add-search
# ... make changes, commit ...

# 3. Return to main and merge
cd ../..
bash C:/Users/nguye/.claude/scripts/worktree-merge.sh feature-add-search
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
- **Icons** (`src/lib/icons.tsx`) - Icon components (HomeIcon, BookOpenIcon, ImportIcon, ChevronLeftIcon, ChevronRightIcon, ThemeIcon, TrashIcon)
- **NavButton** (`src/components/NavButton.tsx`) - Reusable navigation button with icon and label support
- **ChapterContent** (`src/components/ChapterContent.tsx`) - Renders chapter content with DOMPurify sanitization
- **SettingsPanel** (`src/components/SettingsPanel.tsx`) - Collapsible panel for reading theme and AI settings
- **AiSummary** (`src/components/AiSummary.tsx`) - Displays AI-generated chapter summaries with regenerate functionality
- **ConfirmDialog** (`src/components/ConfirmDialog.tsx`) - Modal dialog for confirmations with danger/warning/info variants
- **ErrorBoundary** (`src/components/ErrorBoundary.tsx`) - React error boundary for error handling
- **ThemeSelect** (`src/components/ThemeSelect.tsx`) - Dropdown selector for theme options

### Reading Theme System

Chapter reader supports customizable themes persisted in localStorage:
- Background: light, dark, sepia, night
- Font family: serif, sans-serif, monospace
- Font size: 12-24px
- Line height: 1.2-2.0
- Padding: compact, normal, wide, full

CSS custom properties are set on `document.documentElement` based on theme config.

### AI Summary Feature

The app includes AI-powered chapter summaries with the following capabilities:

**Supported Providers** (`src/constants/ai.ts`):
- **OpenRouter** - Multiple free models including GPT-OSS 120B, GLM 4.5 Air, Gemini 2.0 Flash, DeepSeek R1
- **Google AI** - Gemini 2.5 Flash Lite and Flash models

**Features**:
- On-demand summary generation via button click
- Auto-generate summaries when opening chapters (configurable)
- Summaries stored in IndexedDB and persisted across imports
- Summary length options: Short (2-3 sentences) or Medium (4-5 sentences)
- Vietnamese language prompts for natural summarization
- Error handling with retry functionality
- Collapsible summary display with persisted state

**Implementation**:
- `src/lib/aiSummary.ts` - Main summary generation entry point
- `src/constants/ai.ts` - Provider configurations, API implementations, prompts
- `src/components/AiSummary.tsx` - UI component for displaying/regenerating summaries
- `src/hooks/useAiSettings.ts` - Custom hook for AI settings management
- `saveChapterSummary()` in `src/lib/indexedDB.ts` - Persists summaries to IndexedDB

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

### Custom Hooks

- **useThemeConfig** (`src/hooks/useThemeConfig.ts`) - Manages reading theme configuration with localStorage persistence
- **useAiSettings** (`src/hooks/useAiSettings.ts`) - Manages AI provider settings with localStorage persistence
- **useChapterNavigation** (`src/hooks/useChapterNavigation.ts`) - Handles chapter navigation with keyboard shortcuts (arrow keys) and reading progress tracking

### Constants

- **Theme constants** (`src/constants/theme.ts`) - Background, font, font size, line height, and padding options
- **Storage constants** (`src/constants/storage.ts`) - localStorage keys for theme, AI settings, and UI state
- **AI constants** (`src/constants/ai.ts`) - AI provider configurations, model options, and summary prompts

### Image Configuration

Remote images from `static.truyenchucv.org` are allowed in `next.config.ts`.

### Build Configuration

- **Output mode**: `standalone` for Docker/containerized deployments
- **Turbopack**: Enabled for faster development builds

### User Experience Features

**Novel Detail Page** (`/novel/[slug]`):
- Chapter list with search/filter (Ctrl/Cmd+F to focus search)
- "Current chapter" badge showing reading progress
- "Continue Reading" button to resume from last position
- "Start Reading" button for new novels
- AI summary indicator badge on chapters with summaries
- Delete novel with confirmation dialog

**Chapter Reader** (`/novel/[slug]/chapter/[chapterSlug]`):
- Keyboard navigation (arrow keys for prev/next chapter)
- Collapsible settings panel (click theme icon)
- AI summary display above content
- Auto-generate summary on chapter load (optional)
- Reading progress tracked automatically

## Testing Notes

- Tests use `jest-environment-jsdom` for React component testing
- All page components are client components (`'use client'` directive)
- IndexedDB functions check for `typeof window === 'undefined'` to avoid SSR issues
- `fake-indexeddb` is used for mocking IndexedDB in tests
- Tests are co-located with components or in `__tests__` directories

## Security

- Chapter content is sanitized using DOMPurify before rendering with `dangerouslySetInnerHTML`
- API keys are stored in localStorage (client-side only)
- No server-side API key storage or transmission

## Code Style Guidelines

### TypeScript & Types
- Strict TypeScript mode enabled
- Use explicit types for function parameters and return values
- Define interfaces in `src/types/` directory
- Use `interface` for object types, `type` for unions/aliases

### Imports
- Absolute imports with `@/` prefix for `src/` directory
- Group imports: React/types first, then external packages, then local imports
- Use named imports over default when possible

### Naming Conventions
- **Components**: PascalCase (e.g., `PageLayout`)
- **Functions/Variables**: camelCase (e.g., `saveNovel`)
- **Types/Interfaces**: PascalCase (e.g., `NovelInfo`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `DB_NAME`)

### Formatting
- No semicolons at statement ends
- Single quotes for strings
- 2-space indentation
- Consistent spacing around operators and braces

### React Patterns
- Functional components with hooks
- Default props with destructuring and defaults
- Proper TypeScript props interfaces
- Use `ReactNode` for children types

## Implementation Rules

### Component Architecture
- **Client Components**: Mark with `'use client'` directive for interactive components
- **Component Location**: Place UI components in `src/components/`, page components in `src/app/`
- **Component Size**: Keep components focused and single-responsibility (<200 lines preferred)
- **Props Destructuring**: Destructure props in function signature with TypeScript types
- **Memoization**: Use `React.memo()` for components that re-render unnecessarily

### State Management
- **Local State**: Use `useState` for component-specific state
- **Derived State**: Compute from props/state, avoid redundant state
- **Form State**: Use controlled components with proper validation
- **Async State**: Use `useEffect` with cleanup for async operations

### Data Layer
- **IndexedDB**: Use `src/lib/indexedDB.ts` for client-side persistence
- **Data Validation**: Validate data before storage (type guards)
- **Error Handling**: Wrap IndexedDB operations in try/catch with user-friendly errors

### Performance Guidelines
- **Image Optimization**: Use Next.js `<Image>` component for images
- **Debouncing**: Debounce search/filter inputs to reduce re-renders
- **Bundle Size**: Monitor bundle size, avoid unnecessary dependencies

### Accessibility (a11y)
- **Semantic HTML**: Use proper semantic elements (nav, main, article)
- **ARIA Labels**: Add aria-labels to icon-only buttons
- **Keyboard Navigation**: Ensure all interactive elements are keyboard accessible
- **Focus Management**: Manage focus in modals and dynamic content

### Error Handling Patterns
- **Error Boundaries**: Wrap components in error boundaries for graceful failures
- **User Feedback**: Show user-friendly error messages, not technical details
- **Recovery**: Provide retry mechanisms for transient errors
- **Loading States**: Show loading indicators during async operations

## Code Review Checklist
- [ ] TypeScript types are explicit and correct
- [ ] Components are properly typed with interfaces
- [ ] Error handling is comprehensive
- [ ] Accessibility requirements are met
- [ ] Performance considerations addressed
- [ ] Code follows naming conventions
- [ ] Imports are properly grouped
- [ ] No console.log statements left in production code
- [ ] Sensitive data is not hardcoded
