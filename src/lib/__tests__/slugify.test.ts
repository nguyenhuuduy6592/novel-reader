import { normalizeSlug, normalizeSlugCached, createSlugCache } from '../slugify';

describe('slugify', () => {
  describe('normalizeSlug', () => {
    it('removes Vietnamese accents from lowercase characters', () => {
      expect(normalizeSlug('Chương 1')).toBe('chuong-1');
      expect(normalizeSlug('Chương 2: Bắt đầu')).toBe('chuong-2-bat-dau');
      expect(normalizeSlug('Chương ba')).toBe('chuong-ba');
    });

    it('removes Vietnamese accents from uppercase characters', () => {
      expect(normalizeSlug('CHƯƠNG 1')).toBe('chuong-1');
      expect(normalizeSlug('CHƯƠNG 2: BẮT ĐẦU')).toBe('chuong-2-bat-dau');
    });

    it('converts special characters to dashes', () => {
      expect(normalizeSlug('chapter@1')).toBe('chapter-1');
      expect(normalizeSlug('chapter#1')).toBe('chapter-1');
      expect(normalizeSlug('chapter$1')).toBe('chapter-1');
      expect(normalizeSlug('chapter%1')).toBe('chapter-1');
      expect(normalizeSlug('chapter&1')).toBe('chapter-1');
      expect(normalizeSlug('chapter*1')).toBe('chapter-1');
      expect(normalizeSlug('chapter!1')).toBe('chapter-1');
    });

    it('removes consecutive dashes', () => {
      expect(normalizeSlug('chapter--1')).toBe('chapter-1');
      expect(normalizeSlug('chapter---1')).toBe('chapter-1');
      expect(normalizeSlug('chapter@#$1')).toBe('chapter-1');
    });

    it('trims leading and trailing dashes', () => {
      expect(normalizeSlug('-chapter-1-')).toBe('chapter-1');
      expect(normalizeSlug('--chapter-1--')).toBe('chapter-1');
      expect(normalizeSlug('---chapter-1---')).toBe('chapter-1');
    });

    it('converts to lowercase', () => {
      expect(normalizeSlug('CHAPTER-1')).toBe('chapter-1');
      expect(normalizeSlug('Chapter-One')).toBe('chapter-one');
    });

    it('handles Vietnamese Đ character', () => {
      expect(normalizeSlug('Đại ca')).toBe('dai-ca');
      expect(normalizeSlug('đường đi')).toBe('duong-di');
    });

    it('handles complex Vietnamese text', () => {
      expect(normalizeSlug('Hành trình vô tận')).toBe('hanh-trinh-vo-tan');
      expect(normalizeSlug('Người thừa kế')).toBe('nguoi-thua-ke');
      expect(normalizeSlug('Đấu Phá Thương Khung')).toBe('dau-pha-thuong-khung');
    });

    it('handles mixed Vietnamese and special characters', () => {
      expect(normalizeSlug('Chương 1: Bắt đầu @#$')).toBe('chuong-1-bat-dau');
      expect(normalizeSlug('===Hành trình===')).toBe('hanh-trinh');
    });

    it('handles empty string', () => {
      expect(normalizeSlug('')).toBe('');
    });

    it('handles whitespace only', () => {
      expect(normalizeSlug('   ')).toBe('');
    });

    it('handles special characters only', () => {
      expect(normalizeSlug('!@#$%')).toBe('');
    });

    it('preserves alphanumeric characters', () => {
      expect(normalizeSlug('chapter123')).toBe('chapter123');
      expect(normalizeSlug('abc123def')).toBe('abc123def');
    });

    it('handles numbers only', () => {
      expect(normalizeSlug('123')).toBe('123');
      expect(normalizeSlug('1-2-3')).toBe('1-2-3');
    });

    it('handles all Vietnamese vowel combinations', () => {
      // a, ă, â
      expect(normalizeSlug('a ă â')).toBe('a-a-a');
      expect(normalizeSlug('à ằ ầ Ằ Ầ')).toBe('a-a-a-a-a');
      expect(normalizeSlug('á ắ ấ Ắ Ấ')).toBe('a-a-a-a-a');
      expect(normalizeSlug('ả ẳ ẩ Ẳ Ẩ')).toBe('a-a-a-a-a');
      expect(normalizeSlug('ã ẵ ẫ Ẵ Ẫ')).toBe('a-a-a-a-a');
      expect(normalizeSlug('ạ ặ ậ Ặ Ậ')).toBe('a-a-a-a-a');

      // e, ê
      expect(normalizeSlug('e ê')).toBe('e-e');
      expect(normalizeSlug('è ề Ề')).toBe('e-e-e');
      expect(normalizeSlug('é ế Ế')).toBe('e-e-e');
      expect(normalizeSlug('ẻ ể Ể')).toBe('e-e-e');
      expect(normalizeSlug('ẽ ễ Ễ')).toBe('e-e-e');
      expect(normalizeSlug('ẹ ệ Ệ')).toBe('e-e-e');

      // i
      expect(normalizeSlug('i Ì Í Ỉ Ĩ Ị')).toBe('i-i-i-i-i-i');

      // o, ô, ơ
      expect(normalizeSlug('o ô ơ')).toBe('o-o-o');
      expect(normalizeSlug('ò ồ ờ Ồ Ờ')).toBe('o-o-o-o-o');
      expect(normalizeSlug('ó ố ớ Ố Ớ')).toBe('o-o-o-o-o');
      expect(normalizeSlug('ỏ ổ ở Ổ Ở')).toBe('o-o-o-o-o');
      expect(normalizeSlug('õ ỗ ỡ Ỗ Ỡ')).toBe('o-o-o-o-o');
      expect(normalizeSlug('ọ ộ ợ Ộ Ợ')).toBe('o-o-o-o-o');

      // u, ư
      expect(normalizeSlug('u ư')).toBe('u-u');
      expect(normalizeSlug('ù ừ Ừ')).toBe('u-u-u');
      expect(normalizeSlug('ú ứ Ứ')).toBe('u-u-u');
      expect(normalizeSlug('ủ ử Ử')).toBe('u-u-u');
      expect(normalizeSlug('ũ ữ Ữ')).toBe('u-u-u');
      expect(normalizeSlug('ụ ự Ự')).toBe('u-u-u');

      // y
      expect(normalizeSlug('y Ỳ Ý Ỷ Ỹ Ỵ')).toBe('y-y-y-y-y-y');
    });
  });

  describe('normalizeSlugCached', () => {
    it('returns the same result as normalizeSlug', () => {
      const cache = createSlugCache();
      const input = 'Chương 1: Bắt đầu';

      expect(normalizeSlugCached(input, cache)).toBe(normalizeSlug(input));
      expect(normalizeSlugCached(input, cache)).toBe('chuong-1-bat-dau');
    });

    it('caches normalized slugs to avoid recomputation', () => {
      const cache = createSlugCache();
      const input = 'Chương 1';

      const firstCall = normalizeSlugCached(input, cache);
      const secondCall = normalizeSlugCached(input, cache);

      expect(firstCall).toBe(secondCall);
      expect(cache.size).toBe(1);
      expect(cache.get(input)).toBe('chuong-1');
    });

    it('handles empty string', () => {
      expect(normalizeSlugCached('', createSlugCache())).toBe('');
    });

    it('handles undefined cache', () => {
      expect(normalizeSlugCached('Chương 1')).toBe('chuong-1');
    });

    it('caches multiple different slugs', () => {
      const cache = createSlugCache();

      normalizeSlugCached('Chương 1', cache);
      normalizeSlugCached('Chương 2', cache);
      normalizeSlugCached('Chương 3', cache);

      expect(cache.size).toBe(3);
      expect(cache.get('Chương 1')).toBe('chuong-1');
      expect(cache.get('Chương 2')).toBe('chuong-2');
      expect(cache.get('Chương 3')).toBe('chuong-3');
    });
  });

  describe('createSlugCache', () => {
    it('creates an empty Map', () => {
      const cache = createSlugCache();
      expect(cache).toBeInstanceOf(Map);
      expect(cache.size).toBe(0);
    });

    it('creates independent caches', () => {
      const cache1 = createSlugCache();
      const cache2 = createSlugCache();

      cache1.set('key', 'value1');
      cache2.set('key', 'value2');

      expect(cache1.get('key')).toBe('value1');
      expect(cache2.get('key')).toBe('value2');
    });
  });
});
