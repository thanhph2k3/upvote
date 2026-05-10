import { Router } from 'express';
import { container } from '../../container.js';

export function createVoteRouter(voteController) {
  const router = Router();

  router.get('/campaigns', voteController.listCampaigns);
  router.post('/campaigns/realtime-votes', voteController.getCampaignRealtimeVotes);
  router.get('/campaigns/:campaignCode/realtime-vote', voteController.getCampaignRealtimeVote);
  router.get('/campaigns/:campaignCode', voteController.getCampaign);
  router.post('/', voteController.createVote);

  return router;
}

export const voteRouter = createVoteRouter(container.voteController);
