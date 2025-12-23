# Agent Instructions for novel-reader

## Commands
- **Build**: `npm run build` (Next.js production build)
- **Dev**: `npm run dev` (Next.js development server)
- **Lint**: `npm run lint` (ESLint with Next.js rules)
- **Type Check**: `npm run type` (TypeScript compilation check)
- **Start**: `npm run start` (Production server)

No test framework configured - no test commands available.

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

### Error Handling
- Async functions use try/catch or Promise error handling
- Proper error rejection in Promise executors
- Client-side checks (e.g., `typeof window === 'undefined'`)

### Styling
- Tailwind CSS v4 for utility classes
- Responsive design with Tailwind breakpoints
- Consistent color scheme (gray-50 background, etc.)