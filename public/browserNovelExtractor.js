// Configuration
const MAX_RETRIES = 3; // max retries for fetching a chapter
const BATCH_SIZE = 10; // chapters per batch
const RETRY_DELAY = 1000; // ms between retries

// Global variable to store in-memory progress (survives across multiple calls in same session)
window.__novelExtractorProgress__ = window.__novelExtractorProgress__ || {};

// Get storage key for this novel
function getStorageKey(slug) {
  return `novel-extractor-${slug}`;
}

// Load progress from global variable
function loadProgress(slug) {
  return window.__novelExtractorProgress__[slug] || null;
}

// Save progress to global variable
function saveProgress(slug, progress) {
  window.__novelExtractorProgress__[slug] = progress;
}

// Clear progress from global variable
function clearProgress(slug) {
  delete window.__novelExtractorProgress__[slug];
}

// Sleep utility for delays
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to fetch with HTML fallback
async function fetchWithFallback(jsonUrl, htmlUrl, description) {
  const response = await fetch(jsonUrl);
  
  if (!response.ok) {
    console.warn(`Failed to fetch JSON for ${description} (status: ${response.status}). Attempting HTML extraction.`);
    const htmlResponse = await fetch(htmlUrl);
    const htmlText = await htmlResponse.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    const script = doc.getElementById('__NEXT_DATA__');
    const htmlData = JSON.parse(script.innerHTML);
    // Normalize data structure: HTML returns { props: { pageProps } }, JSON returns { pageProps }
    return htmlData.props;
  }
  
  return await response.json();
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
        // Return chapter with no content and failed flag
        return {
          chapter: {
            name: chapter.name,
            slug: chapter.slug,
            content: '',
          },
          nextChapter: null,
          prevChapter: null,
          failed: true,
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
  const jsonUrl = `https://truyenchucv.org/_next/data/FMM6MiVR9Ra-gG0tnHXck/truyen/${slug}.html.json?slug=${slug}.html`;
  const htmlUrl = `https://truyenchucv.org/truyen/${slug}.html`;

  // Fetch novel info and initial chapter list with HTML fallback
  const data = await fetchWithFallback(jsonUrl, htmlUrl, `novel: ${slug}`);

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
    const pageJsonUrl = `${jsonUrl}&page=${page}`;
    const pageHtmlUrl = `${htmlUrl}?page=${page}`;
    const pageData = await fetchWithFallback(pageJsonUrl, pageHtmlUrl, `novel: ${slug} (page ${page})`);

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
        console.log(`Resuming from chapter ${startIndex + 1}, loaded ${chapters.length} chapters from memory`);
      } else if (clearExisting) {
        clearProgress(slug);
      }
    }
  }

  // Track success and failed counts
  let successCount = 0;
  let failedCount = 0;

  // Count existing successful/failed chapters if resuming
  if (chapters.length > 0) {
    successCount = chapters.filter(ch => !ch.failed).length;
    failedCount = chapters.filter(ch => ch.failed).length;
  }

  // Fetch content for each chapter in batches
  for (let i = startIndex; i < chapterSlugs.length; i += BATCH_SIZE) {
    const batch = chapterSlugs.slice(i, i + BATCH_SIZE);
    console.log(`Extracting chapters ${i + 1}-${Math.min(i + BATCH_SIZE, chapterSlugs.length)}/${chapterSlugs.length}`);

    const results = await Promise.all(
      batch.map(chapter => fetchChapterWithRetry(slug, chapter))
    );

    // Count successes and failures in this batch
    results.forEach(result => {
      if (result.failed) {
        failedCount++;
      } else {
        successCount++;
      }
    });

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

  // Print summary
  console.log(`\n========== Download Summary ==========`);
  console.log(`Novel: ${novel.book.name}`);
  console.log(`Total chapters: ${chapterSlugs.length}`);
  console.log(`Successfully downloaded: ${successCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`=====================================\n`);

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

// NOTE: Progress is stored in window.__novelExtractorProgress__ global variable
// This means progress survives across script runs in the same browser session,
// but will be lost if you close/refresh the page.
extractNovelFromCurrentPage().then(data => console.log(data));