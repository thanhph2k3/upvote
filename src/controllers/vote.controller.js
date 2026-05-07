export class VoteController {
  constructor(voteService, realtimeVoteService) {
    this.voteService = voteService;
    this.realtimeVoteService = realtimeVoteService;
  }

  listCampaigns = async (req, res, next) => {
    try {
      const campaigns = await this.voteService.listCampaigns(req.query);
      res.json({ campaigns });
    } catch (error) {
      next(error);
    }
  };

  getCampaign = async (req, res, next) => {
    try {
      const payload = await this.voteService.getCampaign(req.params.campaignCode, req.query);
      res.json(payload);
    } catch (error) {
      next(error);
    }
  };

  getCampaignRealtimeVote = async (req, res, next) => {
    try {
      const realtimeVoteCount = await this.realtimeVoteService.getVoteCount(req.params.campaignCode);
      res.json({
        campaign_code: req.params.campaignCode,
        realtime_vote_count: realtimeVoteCount,
      });
    } catch (error) {
      next(error);
    }
  };

  createVote = async (req, res, next) => {
    try {
      const result = await this.voteService.createVoteRequest(req.body);
      res.status(result.statusCode).json(result.body);
    } catch (error) {
      next(error);
    }
  };
}
