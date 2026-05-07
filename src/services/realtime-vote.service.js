export class RealtimeVoteService {
  constructor({ htmlPageInspector } = {}) {
    this.htmlPageInspector = htmlPageInspector;
  }

  async getVoteCount(campaignCode) {
    const url = this.#buildRealtimeVoteUrl(campaignCode);
    const html = await this.htmlPageInspector.fetchHtml(url);
    return this.#extractRealtimeVoteCount(campaignCode, html);
  }

  #buildRealtimeVoteUrl(campaignCode) {
    return 'https://cafef.vn/agm-awards.chn';
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
