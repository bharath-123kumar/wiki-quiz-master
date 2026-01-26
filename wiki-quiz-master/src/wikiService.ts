import axios from 'axios';

export interface WikiQuizQuestion {
  question: string;
  options: string[];
  answer: string;
}

export const parseWikiUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('wikipedia.org')) {
      // Handle /wiki/Topic or ?title=Topic
      const pathParts = urlObj.pathname.split('/');
      const wikiIndex = pathParts.indexOf('wiki');
      if (wikiIndex !== -1 && pathParts[wikiIndex + 1]) {
        return decodeURIComponent(pathParts[wikiIndex + 1]);
      }
      const titleParam = urlObj.searchParams.get('title');
      if (titleParam) return titleParam;
    }
    return null;
  } catch (e) {
    return null;
  }
};

export const fetchWikiArticle = async (titleOrUrl: string) => {
  let title = parseWikiUrl(titleOrUrl) || titleOrUrl;

  const params = {
    action: 'query',
    format: 'json',
    prop: 'extracts',
    exintro: false, // Get full content or at least more than intro
    explaintext: true,
    titles: title,
    origin: '*',
  };

  const response = await axios.get('https://en.wikipedia.org/w/api.php', { params });
  const pages = response.data.query.pages;
  const pageId = Object.keys(pages)[0];
  const page = pages[pageId];

  if (page.missing || pageId === '-1') throw new Error('Article not found');

  return {
    title: page.title,
    extract: page.extract,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`
  };
};

export const generateQuizFromExtract = (title: string, extract: string): WikiQuizQuestion[] => {
  // Stricter extraction: split into paragraphs first
  const paragraphs = extract.split('\n').filter(p => p.trim().length > 100);
  const quiz: WikiQuizQuestion[] = [];

  // Use a pool of potential sentences to ensure we get 5 unique ones
  let pool = paragraphs.flatMap(p => p.split(/[.!?]/)).filter(s => s.trim().length > 50 && s.trim().length < 200);

  // Shuffle pool
  pool = pool.sort(() => Math.random() - 0.5);

  for (const sentence of pool) {
    if (quiz.length >= 5) break;

    const trimmed = sentence.trim();
    // Find a significant word (capitalized, or just long)
    const words = trimmed.split(' ').filter(w =>
      w.length > 5 &&
      !w.toLowerCase().includes(title.toLowerCase().split(' ')[0]) &&
      /^[A-Z]/.test(w) // Prefer capitalized words for better questions
    );

    const fallbackWords = trimmed.split(' ').filter(w => w.length > 6);
    const targetWords = words.length > 0 ? words : fallbackWords;

    if (targetWords.length > 0) {
      const target = targetWords[Math.floor(Math.random() * targetWords.length)].replace(/[,.;]$/, '');
      const question = trimmed.replace(target, '_______');

      // Generate some fake options from the same extract to keep it contextually relevant but unique
      const allWords = extract.split(/\s+/).filter(w => w.length > 5 && w.toLowerCase() !== target.toLowerCase());
      const options = [target];

      while (options.length < 4 && allWords.length > 0) {
        const fake = allWords[Math.floor(Math.random() * allWords.length)].replace(/[,.;]$/, '');
        if (!options.some(o => o.toLowerCase() === fake.toLowerCase())) {
          options.push(fake);
        }
      }

      // Final fallback if we don't have enough options
      while (options.length < 4) {
        options.push("Option " + options.length);
      }

      quiz.push({
        question,
        answer: target,
        options: options.sort(() => Math.random() - 0.5)
      });
    }
  }

  return quiz;
};
