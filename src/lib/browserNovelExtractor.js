async function extractNovel(novelUrl) {
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

  // Fetch content for each chapter in batches of 5
  var chapters = [];
  for (let i = 0; i < chapterSlugs.length; i += 5) {
    const batch = chapterSlugs.slice(i, i + 5);
    console.log(`Extracting chapters ${i + 1}-${Math.min(i + 5, chapterSlugs.length)}/${chapterSlugs.length}`);
    const promises = batch.map(async (chapter) => {
      const apiUrl = `https://truyenchucv.org/_next/data/FMM6MiVR9Ra-gG0tnHXck/truyen/${slug}/${chapter.slug}.html.json?slug=${slug}.html&slug=${chapter.slug}.html`;
      const chapResponse = await fetch(apiUrl);
      if (chapResponse.status === 404) {
        chapter.content = 'No content available';
        console.warn(`Chapter not found: ${chapter.name} (${chapter.slug})`);
        return;
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
        chapter.content = data.props.pageProps.chapter.content;
        return;
      }
      if (chapResponse.status === 429) {
        throw new Error('Too many requests. Please try again later.');
      }
      const chapData = await chapResponse.json();
      chapters.push({
        chapter: {
          name: chapData.pageProps.chapter.name,
          slug: chapData.pageProps.chapter.slug,
          content: chapData.pageProps.chapter.content,
        },
        nextChapter: chapData.pageProps.nextChapter,
        prevChapter: chapData.pageProps.prevChapter,
      })
    });
    await Promise.all(promises);
    await new Promise((resolve) => setTimeout(resolve, 100)); // Rate limiting
  }

  novel.chapters = chapters;
  return novel;
}

async function extractNovelFromCurrentPage() {
  const currentUrl = window.location.href;
  return await extractNovel(currentUrl);
}

extractNovelFromCurrentPage().then(data => console.log(data));