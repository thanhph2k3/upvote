import { BadRequestError } from '../errors/bad-request-error.js';

export class VoteRequestValidator {
  parseFilters(query) {
    const startUnix = this.#toIntegerQuery(query.start_unix, 'start_unix');
    const endUnix = this.#toIntegerQuery(query.end_unix, 'end_unix');

    if (startUnix !== undefined && endUnix !== undefined && startUnix > endUnix) {
      throw new BadRequestError('start_unix must be less than or equal to end_unix');
    }

    return { startUnix, endUnix };
  }

  parseCampaignCode(campaignCode) {
    const value = String(campaignCode ?? '').trim();

    if (value === '') {
      throw new BadRequestError('campaignCode must be a non-empty string');
    }

    return value;
  }

  parseVoteRequest(body) {
    if (Array.isArray(body)) {
      if (body.length === 0) {
        throw new BadRequestError('request body must contain at least one vote');
      }

      return {
        isBatch: true,
        votes: body.map((vote, index) => this.#parseVotePayload(vote, index)),
      };
    }

    return {
      isBatch: false,
      votes: [this.#parseVotePayload(body)],
    };
  }

  #toIntegerQuery(value, fieldName) {
    if (value === undefined) {
      return undefined;
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed)) {
      throw new BadRequestError(`${fieldName} must be an integer`);
    }

    return parsed;
  }

  #parseVotePayload(body, index) {
    const { campaign_code: campaignCode, vote_number_before: voteNumberBefore, voter, choice, status } = body ?? {};
    const prefix = Number.isInteger(index) ? `votes[${index}].` : '';

    if (typeof campaignCode !== 'string' || campaignCode.trim() === '') {
      throw new BadRequestError(`${prefix}campaign_code must be a non-empty string`);
    }

    if (!Number.isInteger(voteNumberBefore)) {
      throw new BadRequestError(`${prefix}vote_number_before must be an integer`);
    }

    if (typeof voter !== 'string' || voter.trim() === '') {
      throw new BadRequestError(`${prefix}voter must be a non-empty string`);
    }

    if (typeof choice !== 'string' || choice.trim() === '') {
      throw new BadRequestError(`${prefix}choice must be a non-empty string`);
    }

    if (typeof status !== 'boolean') {
      throw new BadRequestError(`${prefix}status must be a boolean`);
    }

    return {
      campaignCode: campaignCode.trim(),
      voteNumberBefore,
      voter: voter.trim(),
      choice: choice.trim(),
      status,
    };
  }
}
