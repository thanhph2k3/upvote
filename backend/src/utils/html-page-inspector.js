import { load } from 'cheerio';

export class HtmlPageInspector {
  constructor({ fetchFn = fetch, timeoutMs = 10000, userAgent } = {}) {
    this.fetchFn = fetchFn;
    this.timeoutMs = timeoutMs;
    this.userAgent = userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';
  }

  async fetchHtml(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? this.timeoutMs);

    try {
      const response = await this.fetchFn(url, {
        method: 'GET',
        headers: {
          accept: 'text/html,application/xhtml+xml',
          'user-agent': this.userAgent,
          ...(options.headers || {}),
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw this.#upstreamError(`HTML request failed with status ${response.status}`);
      }

      const contentType = response.headers?.get?.('content-type') || '';
      if (contentType && !contentType.toLowerCase().includes('text/html')) {
        throw this.#upstreamError(`Expected HTML response, received "${contentType}"`);
      }

      return response.text();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw this.#upstreamError(`HTML request timed out after ${options.timeoutMs ?? this.timeoutMs}ms`);
      }

      if (error.statusCode) {
        throw error;
      }

      throw this.#upstreamError(`HTML request failed: ${error.message}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  findText(html, { selector, regex, flags = 'i' } = {}) {
    if (selector) {
      return this.findTextBySelector(html, selector);
    }

    if (regex) {
      return this.findTextByRegex(html, regex, flags);
    }

    return null;
  }

  findTextByRegex(html, pattern, flags = 'i') {
    const regexp = pattern instanceof RegExp ? pattern : new RegExp(pattern, flags);
    const match = String(html || '').match(regexp);
    const value = match?.[1] ?? match?.[0];

    return value ? this.normalizeText(value) : null;
  }

  findTextBySelector(html, selector) {
    const $ = load(String(html || ''));
    const text = $(selector).first().text();

    if (!text) {
      return null;
    }

    return this.normalizeText(text);
  }

  findNumber(html, options = {}) {
    const text = this.findText(html, options);

    if (!text) {
      return null;
    }

    return this.parseNumber(text);
  }

  findNumberByTextInElements(html, { itemSelector, textSelector, expectedText, valueSelector } = {}) {
    const $ = load(String(html || ''));
    const expectedNormalizedText = this.normalizeText(expectedText);
    let matchedNumber = null;

    $(itemSelector).each((_index, element) => {
      const item = $(element);
      const actualText = this.normalizeText(item.find(textSelector).first().text());

      if (actualText !== expectedNormalizedText) {
        return;
      }

      matchedNumber = this.parseNumber(item.find(valueSelector).first().text());
      return false;
    });

    return matchedNumber;
  }

  stripTags(html) {
    return String(html || '')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ');
  }

  normalizeText(value) {
    return this.decodeHtmlEntities(value).replace(/\s+/g, ' ').trim();
  }

  decodeHtmlEntities(value) {
    const namedEntities = {
      amp: '&',
      apos: "'",
      gt: '>',
      lt: '<',
      nbsp: ' ',
      quot: '"',
    };

    return String(value || '').replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_entity, body) => {
      if (body[0] === '#') {
        const isHex = body[1]?.toLowerCase() === 'x';
        const codePoint = Number.parseInt(body.slice(isHex ? 2 : 1), isHex ? 16 : 10);
        return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : _entity;
      }

      return namedEntities[body.toLowerCase()] ?? _entity;
    });
  }

  parseNumber(value) {
    const match = String(value || '').match(/-?\d[\d.,\s]*/);

    if (!match) {
      return null;
    }

    const normalized = match[0].replace(/[.,\s]/g, '');
    const parsed = Number.parseInt(normalized, 10);

    return Number.isFinite(parsed) ? parsed : null;
  }

  #upstreamError(message) {
    const error = new Error(message);
    error.statusCode = 502;
    return error;
  }
}
