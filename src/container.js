import { HealthController } from './controllers/health.controller.js';
import { VoteController } from './controllers/vote.controller.js';
import { database } from './config/db.js';
import { VoteRepository } from './repositories/vote.repository.js';
import { RealtimeVoteService } from './services/realtime-vote.service.js';
import { VoteService } from './services/vote.service.js';
import { HtmlPageInspector } from './utils/html-page-inspector.js';
import { VoteRequestValidator } from './utils/vote-request-validator.js';

const voteValidator = new VoteRequestValidator();
const voteRepository = new VoteRepository(database);
const voteService = new VoteService({ voteRepository, voteValidator });
const htmlPageInspector = new HtmlPageInspector();
const realtimeVoteService = new RealtimeVoteService({
  htmlPageInspector,
});

export const container = {
  database,
  healthController: new HealthController(database),
  voteController: new VoteController(voteService, realtimeVoteService),
};
