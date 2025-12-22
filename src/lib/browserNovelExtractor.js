/**
 * Extracts novel data from the given URL.
 * @param {string} novelUrl - The URL of the novel.
 * @returns {Promise<import('../types').Novel>} The extracted novel data.
 */
async function extractNovel(novelUrl) {
  // Extract novel slug from URL
  const slug = novelUrl.split('/').pop().replace('.html', '');
  novelUrl = `https://truyenchucv.org/_next/data/FMM6MiVR9Ra-gG0tnHXck/truyen/${slug}.html.json?slug=${slug}.html`

  // Fetch novel info and initial chapter list
  const response = await fetch(novelUrl);
  const data = await response.json();
  /** @type {import('../types').Novel} */
  let novel = data.pageProps;
  novel.book.coverUrl = novel.book.coverUrl.startsWith('http')
    ? novel.book.coverUrl
    : `https://static.truyenchucv.org${novel.book.coverUrl}`;
  /** @type {import('../types').Chapter[]} */
  let chapterList = novel.chapterList || [];

  // Handle pagination for chapter list
  const totalPages = Math.ceil(novel.book.chapterCount / 50);
  for (let page = 2; page <= totalPages; page++) {
    const pageUrl = `${novelUrl}&page=${page}`;
    const pageResponse = await fetch(pageUrl);
    const pageData = await pageResponse.json();
    /** @type {import('../types').Novel} */
    const pageNovel = pageData.pageProps;
    for (const chapter of pageNovel.chapterList || []) {
      chapterList.push(chapter);
    }
  }
  novel.chapterList = chapterList;

  console.log(`Extracted ${novel.chapterList.length} chapters for novel "${novel.book.name}"`, novel);

  // Fetch content for each chapter in batches of 5
  for (let i = 0; i < novel.chapterList.length; i += 5) {
    const batch = novel.chapterList.slice(i, i + 5);
    const promises = batch.map(async (chapter) => {
      const apiUrl = `https://truyenchucv.org/_next/data/FMM6MiVR9Ra-gG0tnHXck/truyen/${slug}/${chapter.slug}.html.json?slug=${slug}.html&slug=${chapter.slug}.html`;
      const chapResponse = await fetch(apiUrl);
      if (chapResponse.status === 404) {
        chapter.content = 'No content available';
        return;
      }
      if (chapResponse.status === 429) {
        throw new Error('Too many requests. Please try again later.');
      }
      /** @type {import('../types').ChaptersResponse} */
      const chapData = await chapResponse.json();
      chapter.content = chapData.pageProps.content;
    });
    await Promise.all(promises);
  }

  return novel;
}

/**
 * Extracts novel data from the current page URL.
 * @returns {Promise<import('../types').Novel>} The extracted novel data.
 */
async function extractNovelFromCurrentPage() {
  const currentUrl = window.location.href;
  return await extractNovel(currentUrl);
}

// extractNovel('https://truyenchucv.org/truyen/bat-lua-bien-ly-hoa-trao-song-xuyen-ta-vo-dich.html').then(data => console.log(data));
extractNovelFromCurrentPage().then(data => console.log(data));