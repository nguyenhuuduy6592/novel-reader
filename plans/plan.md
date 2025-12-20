# Novel Reader App Development Plan

## Overview
Develop a simple novel reading app using NextJS with server API routes to bypass CORS. The app will import novels from truyenchucv.org API, store them in localStorage, and provide a reading interface with novel info preview, chapter list, and chapter reader.

## Architecture Diagram
```mermaid
graph TD
    A[Home Page - Import Interface] -->|Input slug| B[Fetch Novel Data via API]
    B --> C[Save Novel to localStorage]
    C --> D[Novel Info Page]
    D -->|Re-fetch button| B
    D --> E[Chapter List Page]
    E -->|Pagination| F[Fetch Chapters via API]
    F --> E
    E --> G[Chapter Reader Page]
    G -->|Prev/Next| G
    G -->|Links| D
    G -->|Links| E
    H[API Routes] --> I[/api/novel/[slug]]
    H --> J[/api/chapters/[slug]/[page]]
    H --> K[/api/chapter/[slug]/[chapterSlug]]
```

## Todo List
- [ ] Initialize NextJS project with TypeScript
- [ ] Define TypeScript interfaces for novel data, chapter data, and API responses
- [ ] Create API route for fetching novel data (/api/novel/[slug])
- [ ] Create API route for fetching chapter list with pagination (/api/chapters/[slug]/[page])
- [ ] Create API route for fetching chapter content (/api/chapter/[slug]/[chapterSlug])
- [ ] Implement import functionality: input slug, fetch novel data, save to localStorage
- [ ] Create home page with import interface
- [ ] Create novel info page (/novel/[slug]) with re-fetch button
- [ ] Create chapter list page (/novel/[slug]/chapters) with automatic pagination
- [ ] Create chapter reader page (/novel/[slug]/chapter/[chapterSlug]) with prev/next buttons and navigation links
- [ ] Add localStorage utilities for saving and retrieving novels
- [ ] Implement navigation between pages
- [ ] Add basic styling for responsive UI

## Key Features
- Import novels by slug from truyenchucv.org
- Store novels in browser localStorage
- Novel info page with re-fetch capability
- Paginated chapter list (automatic based on chapterCount)
- Chapter reader with prev/next navigation and back links
- Responsive UI

## Tech Stack
- NextJS with TypeScript
- Server API routes for CORS bypass
- localStorage for data persistence