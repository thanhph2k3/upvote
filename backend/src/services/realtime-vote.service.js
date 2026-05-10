export class RealtimeVoteService {
  constructor({ htmlPageInspector, sourceCacheTtlMs = 1000, clock = Date } = {}) {
    this.htmlPageInspector = htmlPageInspector;
    this.sourceCacheTtlMs = sourceCacheTtlMs;
    this.clock = clock;
    this.sourceCache = null;
    this.sourceFetchPromise = null;
  }

  async getVoteCount(campaignCode) {
    const counts = await this.getVoteCounts([campaignCode]);
    return counts.get(campaignCode);
  }

  async getVoteCounts(campaignCodes) {
    const url = this.#buildRealtimeVoteUrl();
    const html = await this.#fetchRealtimeVoteHtml(url);

    return new Map(
      campaignCodes.map((campaignCode) => [
        campaignCode,
        this.#extractRealtimeVoteCount(campaignCode, html),
      ]),
    );
  }

  #buildRealtimeVoteUrl() {
    return 'https://cafef.vn/agm-awards.chn';
  }

  async #fetchRealtimeVoteHtml(url) {
    const now = this.clock.now();

    if (this.sourceCache && this.sourceCache.expiresAt > now) {
      return this.sourceCache.html;
    }

    if (this.sourceFetchPromise) {
      return this.sourceFetchPromise;
    }

    this.sourceFetchPromise = this.htmlPageInspector.fetchHtml(url).then((html) => {
      this.sourceCache = {
        html,
        expiresAt: this.clock.now() + this.sourceCacheTtlMs,
      };
      return html;
    });

    try {
      return await this.sourceFetchPromise;
    } finally {
      this.sourceFetchPromise = null;
    }
  }

  #extractRealtimeVoteCount(campaignCode, html) {
    const realtimeVoteCount = this.htmlPageInspector.findNumberByTextInElements(html, {
      itemSelector: 'div.item',
      textSelector: '.name',
      expectedText: campaignCode,
      valueSelector: '.js-vote-count',
    });

    if (realtimeVoteCount === null) {
      throw this.#upstreamError(`Could not find realtime vote count for campaign "${campaignCode}"`);
    }

    return realtimeVoteCount;
  }

  #upstreamError(message) {
    const error = new Error(message);
    error.statusCode = 502;
    return error;
  }
}
