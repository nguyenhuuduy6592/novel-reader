// Configuration
const MAX_RETRIES = 3;
const BATCH_SIZE = 5;
const RETRY_DELAY = 1000; // ms between retries

// Get storage key for this novel
function getStorageKey(slug) {
  return `novel-extractor-${slug}`;
}

// Load progress from localStorage
function loadProgress(slug) {
  const key = getStorageKey(slug);
  const data = localStorage.getItem(key);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// Save progress to localStorage
function saveProgress(slug, progress) {
  const key = getStorageKey(slug);
  localStorage.setItem(key, JSON.stringify(progress));
}

// Clear progress from localStorage
function clearProgress(slug) {
  const key = getStorageKey(slug);
  localStorage.removeItem(key);
}

// Sleep utility for delays
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch chapter content with retry logic
async function fetchChapterWithRetry(slug, chapter, retryCount = MAX_RETRIES) {
  const apiUrl = `https://truyenchucv.org/_next/data/FMM6MiVR9Ra-gG0tnHXck/truyen/${slug}/${chapter.slug}.html.json?slug=${slug}.html&slug=${chapter.slug}.html`;

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      const chapResponse = await fetch(apiUrl);

      if (chapResponse.status === 404) {
        console.warn(`Chapter not found: ${chapter.name} (${chapter.slug})`);
        return {
          chapter: {
            name: chapter.name,
            slug: chapter.slug,
            content: 'No content available',
          },
          nextChapter: null,
          prevChapter: null,
        };
      }

      if (chapResponse.status === 403) {
        console.warn(`Access forbidden for chapter: ${chapter.name} (${chapter.slug}). Attempting HTML extraction.`);
        const htmlUrl = `https://truyenchucv.org/truyen/${slug}/${chapter.slug}.html`;
        const htmlResponse = await fetch(htmlUrl);
        const htmlText = await htmlResponse.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        const script = doc.getElementById('__NEXT_DATA__');
        const data = JSON.parse(script.innerHTML);
        return {
          chapter: {
            name: data.props.pageProps.chapter.name,
            slug: data.props.pageProps.chapter.slug,
            content: data.props.pageProps.chapter.content,
          },
          nextChapter: data.props.pageProps.nextChapter,
          prevChapter: data.props.pageProps.prevChapter,
        };
      }

      if (chapResponse.status === 429) {
        throw new Error('Too many requests. Please try again later.');
      }

      const chapData = await chapResponse.json();
      return {
        chapter: {
          name: chapData.pageProps.chapter.name,
          slug: chapData.pageProps.chapter.slug,
          content: chapData.pageProps.chapter.content,
        },
        nextChapter: chapData.pageProps.nextChapter,
        prevChapter: chapData.pageProps.prevChapter,
      };
    } catch (error) {
      if (attempt === retryCount) {
        console.error(`Failed to fetch chapter "${chapter.name}" (${chapter.slug}) after ${retryCount + 1} attempts:`, error.message);
        // Return chapter with no content instead of throwing
        return {
          chapter: {
            name: chapter.name,
            slug: chapter.slug,
            content: 'Failed to load content',
          },
          nextChapter: null,
          prevChapter: null,
        };
      }
      console.warn(`Retry ${attempt + 1}/${retryCount} for chapter "${chapter.name}" (${chapter.slug}): ${error.message}`);
      await sleep(RETRY_DELAY * (attempt + 1)); // Exponential backoff
    }
  }
}

async function extractNovel(novelUrl, options = {}) {
  const { resume = true, clearExisting = false } = options;
  const slug = novelUrl.split('/').pop().replace('.html', '');
  novelUrl = `https://truyenchucv.org/_next/data/FMM6MiVR9Ra-gG0tnHXck/truyen/${slug}.html.json?slug=${slug}.html`

  // Fetch novel info and initial chapter list
  const response = await fetch(novelUrl);
  const data = await response.json();
  let novel = {
    book: {
      bookId: data.pageProps.book.bookId,
      name: data.pageProps.book.name,
      coverUrl: data.pageProps.book.coverUrl.startsWith('http')
        ? data.pageProps.book.coverUrl
        : `https://static.truyenchucv.org${data.pageProps.book.coverUrl}`,
      chapterCount: data.pageProps.book.chapterCount,
      slug: data.pageProps.book.slug,
      author: {
        name: data.pageProps.book.author.name,
      }
    },
  };

  let chapterSlugs = data.pageProps.chapterList || [];

  // Handle pagination for chapter list
  const totalPages = Math.ceil(novel.book.chapterCount / 50);
  for (let page = 2; page <= totalPages; page++) {
    const pageUrl = `${novelUrl}&page=${page}`;
    const pageResponse = await fetch(pageUrl);
    const pageData = await pageResponse.json();
    for (const chapter of pageData.pageProps.chapterList || []) {
      chapterSlugs.push(chapter);
    }
  }

  console.log(`Extracted ${chapterSlugs.length} chapters for novel "${novel.book.name}"`, novel);

  // Check for existing progress
  let chapters = [];
  let startIndex = 0;

  if (resume) {
    const progress = loadProgress(slug);
    if (progress && progress.chapters && progress.chapters.length > 0) {
      const resumeChoice = confirm(
        `Found existing progress with ${progress.chapters.length}/${chapterSlugs.length} chapters.\n` +
        `Click OK to resume from chapter ${progress.chapters.length + 1}.\n` +
        `Click Cancel to start over.`
      );

      if (resumeChoice) {
        chapters = progress.chapters;
        startIndex = chapters.length;
        console.log(`Resuming from chapter ${startIndex + 1}`);
      } else if (clearExisting) {
        clearProgress(slug);
      }
    }
  }

  // Fetch content for each chapter in batches
  for (let i = startIndex; i < chapterSlugs.length; i += BATCH_SIZE) {
    const batch = chapterSlugs.slice(i, i + BATCH_SIZE);
    console.log(`Extracting chapters ${i + 1}-${Math.min(i + BATCH_SIZE, chapterSlugs.length)}/${chapterSlugs.length}`);

    const results = await Promise.all(
      batch.map(chapter => fetchChapterWithRetry(slug, chapter))
    );

    chapters.push(...results);

    // Save progress after each batch
    if (resume) {
      saveProgress(slug, {
        novelName: novel.book.name,
        totalChapters: chapterSlugs.length,
        chapters: chapters,
        timestamp: Date.now(),
      });
    }

    await sleep(100); // Rate limiting
  }

  // Clear progress after successful completion
  if (resume) {
    clearProgress(slug);
  }

  novel.chapters = chapters;
  return novel;
}

async function extractNovelFromCurrentPage() {
  const currentUrl = window.location.href;
  return await extractNovel(currentUrl);
}

// ============================================
// USAGE EXAMPLES
// ============================================

// Example 1: Extract novel from current page (with resume prompt)
// extractNovelFromCurrentPage().then(data => console.log(data));

// Example 2: Extract with default settings (resume enabled)
// extractNovel(window.location.href).then(data => console.log(data));

// Example 3: Extract without resume capability
// extractNovel(window.location.href, { resume: false }).then(data => console.log(data));

// Example 4: Extract with resume and clear existing progress on cancel
// extractNovel(window.location.href, { resume: true, clearExisting: true }).then(data => console.log(data));

// Example 5: Manually clear progress for a novel
// clearProgress('novel-slug-here');

// Example 6: Check saved progress for a novel
// const progress = loadProgress('novel-slug-here');
// console.log(progress);

// ============================================
// CONFIGURATION
// ============================================
// MAX_RETRIES: Number of retry attempts for failed chapters (default: 3)
// BATCH_SIZE: Number of chapters to fetch in parallel (default: 5)
// RETRY_DELAY: Base delay between retries in milliseconds (default: 1000)


extractNovelFromCurrentPage().then(data => console.log(data));