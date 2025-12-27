# Fix Chapter Sorting and Slug Normalization

## Problem Summary

1. **Chapter sorting is incorrect**: Chapters are not ordered properly during import
2. **Chapter slugs contain special characters**: Slugs need to be normalized (accents removed, special chars converted to dashes)

## Implementation Plan

### Phase 1: Create Slug Normalization Utility

**File**: `src/lib/slugify.ts` (new file)

Create a utility function to normalize slugs:
- Remove Vietnamese accents (àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ)
- Convert special characters to dashes
- Remove consecutive dashes
- Trim leading/trailing dashes
- Lowercase the result

**Algorithm**: Use Unicode normalization (NFD) + regex for efficient memory usage

### Phase 2: Implement Topological Sort for Chapters

**File**: `src/lib/chapterSort.ts` (new file)

Implement a topological sorting algorithm using `nextChapter` and `prevChapter` links with multiple fallback strategies:

**Why Topological Sort?**
- Chapters form a directed linked list via nextChapter/prevChapter
- More reliable than parsing chapter numbers from names
- Handles complex chapter ordering (e.g., side stories, special chapters)

**Algorithm with Fallback Strategies**:

1. Build a map of all chapters by slug (for O(1) lookups)

2. Find the head chapter:
   - Primary: No prevChapter or prevChapter not in list
   - If no head found, use fallback strategies

3. Traverse via nextChapter links using multi-strategy lookup:

   **Strategy 1: Exact slug match**
   - Try to find chapter by exact `nextChapter.slug`

   **Strategy 2: Normalized slug match** (when Strategy 1 fails)
   - Normalize both the target slug and all chapter slugs
   - Use `slugify.ts` to remove accents and special characters
   - Match against normalized slugs
   - Only invoke when needed (lazy evaluation)

   **Strategy 3: Chapter number extraction** (when Strategy 2 fails)
   - Extract chapter number from target chapter name using regex:
     - `/Chương\s*(\d+)/i` (Vietnamese)
     - `/Chuong\s*(\d+)/i` (unaccented version)
   - Find chapter with matching number in its name
   - Handle edge cases (multiple numbers, no numbers)

4. Handle cycles (shouldn't exist, but defensive programming)

5. Time complexity: O(n) average case, O(n²) worst case with fallbacks
   Space complexity: O(n)

**Memory Optimization**:
- Use Map for O(1) lookups
- Lazy slug normalization (only when needed)
- Cache normalized slugs to avoid recomputation
- Process in single pass where possible

### Phase 3: Update Import Process

**File**: `src/lib/importNovel.ts`

Add chapter sorting and slug normalization:
1. Sort chapters using topological sort
2. Normalize all chapter slugs before saving
3. Update nextChapter/prevChapter slug references after normalization

### Phase 4: Update Tests

**Files to update**:
- `src/lib/__tests__/importNovel.test.ts`
- `src/lib/__tests__/chapterSort.test.ts` (new)
- `src/lib/__tests__/slugify.test.ts` (new)

Test cases for chapter sorting:
- Sorting chapters with correct nextChapter/prevChapter links
- Fallback to normalized slug matching when exact match fails
- Fallback to chapter number extraction when slug matching fails
- Edge cases:
  - Single chapter
  - Empty chapters array
  - Circular references (detect and break)
  - Missing nextChapter/prevChapter links
  - Chapters with Vietnamese accents in slugs
  - Chapters with special characters in slugs

Test cases for slug normalization:
- Vietnamese characters (àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ)
- Special characters conversion to dashes
- Consecutive dash removal
- Leading/trailing dash trimming
- Lowercase conversion

## Files to Modify

### New Files
1. `src/lib/slugify.ts` - Slug normalization utility
2. `src/lib/chapterSort.ts` - Topological sort for chapters
3. `src/lib/__tests__/slugify.test.ts` - Slug utility tests
4. `src/lib/__tests__/chapterSort.test.ts` - Chapter sort tests

### Modified Files
1. `src/lib/importNovel.ts` - Add sorting and slug normalization
2. `src/lib/__tests__/importNovel.test.ts` - Update existing tests

## Implementation Order

1. Create `slugify.ts` with normalizeSlug function
2. Create `chapterSort.ts` with sortChapters function
3. Update `importNovel.ts` to use both utilities
4. Write tests for new utilities
5. Update existing import tests
6. Run test suite to verify no regressions

## Notes

- Changes only affect **new imports** (not retroactive)
- Sorting happens during import in the app (not in browser extractor)
- Slug normalization is used:
  1. During chapter sorting as fallback Strategy 2 (when exact slug match fails)
  2. To normalize final slugs before saving to IndexedDB
- Preserves AI summaries during re-import (existing behavior maintained)
- No database migration needed (schema unchanged)

## Key Implementation Details

**Three-Strategy Chapter Lookup**:
1. Try exact slug match (fastest)
2. Try normalized slug match (handles accent/special char differences)
3. Try chapter number extraction via regex (ultimate fallback)

This ensures maximum compatibility while maintaining performance.
