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

## Implementation Rules

### Component Architecture
- **Client Components**: Mark with `'use client'` directive for interactive components
- **Server Components**: Default for pages and layouts, use for data fetching
- **Component Location**: Place UI components in `src/components/`, page components in `src/app/`
- **Component Size**: Keep components focused and single-responsibility (<200 lines preferred)
- **Props Destructuring**: Destructure props in function signature with TypeScript types
- **Memoization**: Use `React.memo()` for components that re-render unnecessarily

### State Management
- **Local State**: Use `useState` for component-specific state
- **Derived State**: Compute from props/state, avoid redundant state
- **Global State**: Use React Context for app-wide state (theme, user preferences)
- **Form State**: Use controlled components with proper validation
- **Async State**: Use `useEffect` with cleanup for async operations

### Data Layer
- **IndexedDB**: Use `src/lib/indexedDB.ts` for client-side persistence
- **Novel Storage**: Store novels, chapters, and reading progress in IndexedDB
- **Data Validation**: Validate data before storage (type guards, Zod schemas)
- **Error Handling**: Wrap IndexedDB operations in try/catch with user-friendly errors
- **Data Migration**: Handle schema changes with versioning in IndexedDB

### API Routes
- **Location**: Place API routes in `src/app/api/[route]/route.ts`
- **HTTP Methods**: Export named functions for each method (GET, POST, PUT, DELETE)
- **Request Validation**: Validate request body/query parameters
- **Response Format**: Return JSON with consistent structure `{ data, error }`
- **Error Handling**: Use appropriate HTTP status codes (400, 404, 500)
- **CORS**: Configure CORS headers if needed for external access

### File Organization
```
src/
├── app/              # Next.js App Router (pages, layouts, API routes)
├── components/       # Reusable UI components
├── lib/             # Utility functions and business logic
│   └── __tests__/   # Tests for lib functions
├── types/           # TypeScript type definitions
└── constants/       # Application constants
```

### Performance Guidelines
- **Code Splitting**: Use dynamic imports for heavy components (`next/dynamic`)
- **Image Optimization**: Use Next.js `<Image>` component for images
- **Lazy Loading**: Implement lazy loading for long content (chapters)
- **Debouncing**: Debounce search/filter inputs to reduce re-renders
- **Virtualization**: Consider virtual lists for large item collections
- **Bundle Size**: Monitor bundle size, avoid unnecessary dependencies

### Accessibility (a11y)
- **Semantic HTML**: Use proper semantic elements (nav, main, article)
- **ARIA Labels**: Add aria-labels to icon-only buttons
- **Keyboard Navigation**: Ensure all interactive elements are keyboard accessible
- **Focus Management**: Manage focus in modals and dynamic content
- **Color Contrast**: Maintain WCAG AA contrast ratios
- **Screen Reader**: Test with screen reader for critical paths

### Security Best Practices
- **XSS Prevention**: Use React's built-in escaping, avoid `dangerouslySetInnerHTML`
- **Input Sanitization**: Sanitize user inputs before storage/display
- **API Security**: Validate and sanitize all API inputs
- **Environment Variables**: Use `.env.local` for sensitive data, never commit
- **Content Security**: Implement Content Security Policy headers

### Error Handling Patterns
- **Error Boundaries**: Wrap components in error boundaries for graceful failures
- **User Feedback**: Show user-friendly error messages, not technical details
- **Logging**: Log errors to console for debugging (remove in production)
- **Recovery**: Provide retry mechanisms for transient errors
- **Loading States**: Show loading indicators during async operations

### Testing Guidelines
- **Unit Tests**: Test utility functions in `src/lib/__tests__/`
- **Component Tests**: Test components with Jest and React Testing Library
- **Test Files**: Name test files with `.test.ts` or `.test.tsx` suffix
- **Coverage**: Aim for 80%+ coverage on critical paths
- **Mocking**: Mock external dependencies (IndexedDB, fetch)

### Browser Compatibility
- **Feature Detection**: Check for browser features before use
- **Polyfills**: Add polyfills for older browsers if needed
- **Progressive Enhancement**: Ensure core functionality works without JS
- **Service Worker**: Implement service worker for offline capability

### Code Review Checklist
- [ ] TypeScript types are explicit and correct
- [ ] Components are properly typed with interfaces
- [ ] Error handling is comprehensive
- [ ] Accessibility requirements are met
- [ ] Performance considerations addressed
- [ ] Code follows naming conventions
- [ ] Imports are properly grouped
- [ ] No console.log statements left in production code
- [ ] Sensitive data is not hardcoded
- [ ] Comments explain complex logic only