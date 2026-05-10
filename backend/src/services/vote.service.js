export class VoteService {
  constructor({ voteRepository, voteValidator, clock = Date }) {
    this.voteRepository = voteRepository;
    this.voteValidator = voteValidator;
    this.clock = clock;
  }

  async listCampaigns(query) {
    const filters = this.voteValidator.parseFilters(query);
    return this.voteRepository.listCampaigns(filters);
  }

  async getCampaign(campaignCode, query) {
    const code = this.voteValidator.parseCampaignCode(campaignCode);
    const filters = this.voteValidator.parseFilters(query);
    const [campaign, votes] = await Promise.all([
      this.voteRepository.getCampaignSummary(code, filters),
      this.voteRepository.listVotesByCampaign(code, filters),
    ]);

    return { campaign, votes };
  }

  async createVoteRequest(body) {
    const { isBatch, votes } = this.voteValidator.parseVoteRequest(body);
    const createdAtUnix = Math.floor(this.clock.now() / 1000);
    const createdVotes = await this.voteRepository.createVotes(votes, createdAtUnix);

    return {
      statusCode: 201,
      body: isBatch ? { votes: createdVotes } : { vote: createdVotes[0] },
    };
  }
}
