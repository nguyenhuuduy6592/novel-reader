# Novel Reader Design Document

## 1. Project Overview

### Purpose
The Novel Reader is a web-based application designed to allow users to import and read novels from external sources, specifically targeting content from truyenchucv.org. The application provides a clean, user-friendly interface for managing a personal library of novels and reading chapters sequentially.

### Key Features
- **Novel Import**: Users can import novels by providing a URL from the supported external source
- **Library Management**: Display and manage a collection of imported novels with cover images and metadata
- **Chapter Navigation**: Browse through all chapters of a novel with easy navigation
- **Chapter Reading**: Read individual chapters with previous/next navigation
- **Offline Storage**: Novels are stored locally in the browser for offline access
- **Responsive Design**: Works across desktop and mobile devices

### Target Users
- Novel enthusiasts who prefer reading web novels
- Users who want to maintain a personal collection of novels
- Readers who need offline access to their reading material

## 2. System Architecture

```mermaid
graph TD
    A[User Browser] --> B[Next.js Application]
    B --> C[Home Page /]
    B --> D[Novel Detail Page /novel/[slug]]
    B --> E[Chapter Reading Page /novel/[slug]/chapter/[chapterSlug]]

    C --> F[Novel Import API /api/novel/[url]]
    D --> G[Chapter Content API /api/chapter/[slug]/[chapterSlug]]

    F --> H[External API<br/>truyenchucv.org]
    G --> H

    B --> I[localStorage<br/>Novel Data Storage]

    I -.-> C
    I -.-> D
```

### Architecture Components
- **Frontend**: Next.js React application with client-side routing
- **API Layer**: Next.js API routes for data fetching
- **External Data Source**: truyenchucv.org API for novel and chapter data
- **Storage**: Browser localStorage for data persistence
- **Styling**: Tailwind CSS for responsive UI

## 3. Technology Stack

### Core Framework
- **Next.js 16**: React framework for server-side rendering and API routes
- **React 19**: UI library for component-based development
- **TypeScript**: Type-safe JavaScript for better development experience

### Styling and UI
- **Tailwind CSS 4**: Utility-first CSS framework for responsive design
- **PostCSS**: CSS processing tool

### Development Tools
- **ESLint**: Code linting and formatting
- **TypeScript Compiler**: Type checking and compilation

### Dependencies
- `next`: 16.1.0 - Main framework
- `react`: 19.2.3 - UI library
- `react-dom`: 19.2.3 - DOM rendering
- `@tailwindcss/postcss`: 4 - Tailwind integration
- `@types/*`: Type definitions for TypeScript

## 4. Data Models

### Core Interfaces

```typescript
interface NovelResponse {
  pageProps: Novel;
}

interface Novel {
  book: BookInfo;
  chapterList?: Chapter[];
}

interface BookInfo {
  bookId: number;
  slug: string;
  coverUrl: string;
  name: string;
  chapterCount: number;
  author: AuthorInfo;
}

interface AuthorInfo {
  name: string;
}

interface Chapter {
  slug: string;
  name: string;
  content: string;
}

interface ChaptersResponse {
  pageProps: ChapterContent;
}

interface ChapterContent {
  chapter: Chapter;
  title?: string;
  content: string;
  prevSlug?: string;
  nextSlug?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### Data Flow Types
- **NovelResponse**: Wrapper for novel data from external API
- **ChaptersResponse**: Wrapper for chapter content from external API
- **ApiResponse**: Standardized response format for internal APIs

## 5. API Design

### Internal API Endpoints

#### GET /api/novel/[url]
**Purpose**: Import a novel from external source and fetch all chapter metadata

**Parameters**:
- `url`: Encoded URL of the novel from truyenchucv.org

**Response**:
```json
{
  "success": true,
  "data": {
    "book": {
      "bookId": 123,
      "slug": "novel-slug",
      "coverUrl": "https://...",
      "name": "Novel Title",
      "chapterCount": 100,
      "author": { "name": "Author Name" }
    },
    "chapterList": [
      {
        "slug": "chapter-1",
        "name": "Chapter 1: Title",
        "content": "..."
      }
    ]
  }
}
```

**Logic**:
1. Fetch first page to get basic novel info
2. Calculate total pages based on chapter count (50 chapters per page)
3. Fetch remaining pages to collect all chapters
4. Fix cover URL if relative
5. Return consolidated novel data

#### GET /api/chapter/[slug]/[chapterSlug]
**Purpose**: Fetch content for a specific chapter

**Parameters**:
- `slug`: Novel slug identifier
- `chapterSlug`: Chapter slug identifier

**Response**:
```json
{
  "success": true,
  "data": {
    "chapter": {
      "slug": "chapter-1",
      "name": "Chapter 1",
      "content": "<p>Chapter content...</p>"
    }
  }
}
```

**Logic**:
1. Construct external API URL
2. Fetch chapter data from truyenchucv.org
3. Return chapter content wrapped in ApiResponse

### External API Integration
- **Base URL**: https://truyenchucv.org/_next/data/FMM6MiVR9Ra-gG0tnHXck/
- **Novel URL Pattern**: `/truyen/{slug}.html.json?slug={slug}`
- **Chapter URL Pattern**: `/truyen/{slug}/{chapterSlug}.html.json?slug={slug}&slug={chapterSlug}.html`

## 6. User Interface Design

### Page Structure

#### Home Page (/)
- **Header**: Application title "Novel Reader"
- **Import Section**: URL input field and import button
- **Novels Grid**: Card-based layout showing imported novels
- **Novel Card**: Cover image, title, author, chapter count, "Read Novel" button

#### Novel Detail Page (/novel/[slug])
- **Header**: Novel cover, title, author, chapter count
- **Actions**: Refetch button for updating novel data
- **Chapters List**: Scrollable list of chapter links
- **Chapter Item**: Chapter number, title, navigation arrow

#### Chapter Reading Page (/novel/[slug]/chapter/[chapterSlug])
- **Navigation**: Back to novel link, Previous/Next chapter buttons
- **Content**: Chapter title and HTML content
- **Footer Navigation**: Previous/Next buttons for easy navigation

### Component Hierarchy
```
App
├── Layout (globals.css, favicon)
├── Home Page
│   ├── ImportForm
│   └── NovelGrid
│       └── NovelCard
├── Novel Page
│   ├── NovelHeader
│   └── ChapterList
│       └── ChapterItem
└── Chapter Page
    ├── Navigation
    ├── ChapterContent
    └── Navigation
```

### Responsive Design
- **Mobile**: Single column layouts, stacked navigation
- **Tablet**: Two-column grids, adjusted spacing
- **Desktop**: Multi-column grids, full-width content

## 7. Data Flow

### Novel Import Flow
1. User enters URL on home page
2. `importNovel()` function calls `/api/novel/[url]`
3. API fetches data from external source across multiple pages
4. Novel data saved to localStorage via `saveNovel()`
5. Home page updates to show new novel in grid

### Chapter Reading Flow
1. User clicks chapter link on novel page
2. Chapter page loads and calls `/api/chapter/[slug]/[chapterSlug]`
3. API fetches chapter content from external source
4. Content rendered with `dangerouslySetInnerHTML`
5. Navigation buttons use prevSlug/nextSlug for adjacent chapters

### Data Persistence
- All novel data stored in localStorage under key 'novels'
- Data survives browser sessions but not across devices
- No server-side persistence implemented

## 8. Storage Strategy

### localStorage Implementation
- **Key**: 'novels'
- **Structure**: Array of Novel objects
- **Operations**:
  - `saveNovel()`: Add or update novel in array
  - `getNovel(slug)`: Retrieve specific novel by slug
  - `getAllNovels()`: Return all stored novels
  - `removeNovel(slug)`: Remove novel from storage

### Storage Limitations
- **Size Limit**: ~5-10MB depending on browser
- **Persistence**: Survives browser restarts but cleared on data deletion
- **Security**: Data accessible via browser dev tools
- **Performance**: Synchronous operations may block UI

### Future Storage Options
- IndexedDB for larger storage capacity
- Service Worker for offline caching
- Server-side storage with user accounts

## 9. Error Handling

### API Error Handling
- **Network Errors**: Caught in try-catch blocks, return error responses
- **External API Failures**: HTTP status checks, fallback error messages
- **Data Validation**: TypeScript interfaces ensure data structure
- **Response Format**: Consistent ApiResponse structure for all endpoints

### UI Error Handling
- **Loading States**: Show loading indicators during async operations
- **Error Messages**: Display user-friendly error messages
- **Fallback UI**: Graceful degradation when data unavailable
- **Navigation Guards**: Prevent navigation to invalid routes

### Error Types Handled
- Network connectivity issues
- Invalid URLs or malformed data
- External API changes or outages
- localStorage quota exceeded
- Missing novel/chapter data

## 10. Security Considerations

### Client-Side Security
- **Data Sanitization**: HTML content rendered safely via React
- **Input Validation**: URL encoding for API parameters
- **CORS Policy**: Relies on external API CORS configuration
- **Data Exposure**: localStorage data accessible to any script

### External API Dependencies
- **Rate Limiting**: No built-in rate limiting, depends on external API
- **Data Integrity**: No validation of external data authenticity
- **Privacy**: User reading habits stored locally only

### Recommendations
- Implement input sanitization for URLs
- Add error boundaries for React components
- Consider Content Security Policy headers
- Monitor external API for changes

## 11. Deployment Strategy

### Platform
- **Vercel**: Recommended for Next.js applications
- **Static Generation**: Suitable for mostly static content
- **Serverless Functions**: API routes deployed as serverless functions

### Build Process
- **Build Command**: `npm run build`
- **Output**: Static files + serverless functions
- **Environment**: Node.js runtime compatible with Next.js 16

### Configuration
- **next.config.ts**: Next.js configuration
- **package.json**: Dependency management
- **Environment Variables**: None currently required

### Performance Optimization
- **Static Assets**: Images and CSS optimized automatically
- **API Caching**: No caching implemented, consider adding
- **Bundle Size**: Monitor with build analysis tools

## 12. Future Enhancements

### High Priority
- **Search Functionality**: Search novels and chapters by title/content
- **Reading Progress**: Track and resume reading position
- **Offline Reading**: Cache chapters for offline access
- **Dark Mode**: Theme switching capability

### Medium Priority
- **User Accounts**: Server-side storage and synchronization
- **Social Features**: Share reading progress, recommendations
- **Multiple Sources**: Support additional novel sources
- **Reading Statistics**: Track reading time and habits

### Low Priority
- **Mobile App**: React Native companion app
- **Export Options**: Export novels to EPUB/PDF
- **Annotations**: Highlight and note-taking features
- **Multi-language**: Support for different languages

### Technical Improvements
- **State Management**: Consider Zustand or Redux for complex state
- **Testing**: Add unit and integration tests
- **Performance**: Implement virtual scrolling for large chapter lists
- **Accessibility**: WCAG compliance improvements