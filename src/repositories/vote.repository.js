export class VoteRepository {
  constructor(database) {
    this.database = database;
  }

  async listCampaigns(filters) {
    const { whereSql, params } = this.#buildDateWhere(filters);
    const result = await this.database.query(
      `
        SELECT
          campaign_code,
          MIN(vote_number_before) AS vote_number_before,
          (COUNT(*) FILTER (WHERE status = true))::integer AS total_votes,
          (MIN(vote_number_before) + (COUNT(*) FILTER (WHERE status = true))::integer)::integer AS vote_number_after,
          MIN(created_at_unix) AS first_vote_at_unix,
          MAX(created_at_unix) AS last_vote_at_unix
        FROM votes
        ${whereSql}
        GROUP BY campaign_code
        ORDER BY last_vote_at_unix DESC, campaign_code ASC
      `,
      params,
    );

    return result.rows;
  }

  async getCampaignSummary(campaignCode, filters) {
    const { whereSql, params } = this.#buildCampaignWhere(campaignCode, filters);
    const result = await this.database.query(
      `
        SELECT
          campaign_code,
          MIN(vote_number_before) AS vote_number_before,
          (COUNT(*) FILTER (WHERE status = true))::integer AS total_votes,
          (MIN(vote_number_before) + (COUNT(*) FILTER (WHERE status = true))::integer)::integer AS vote_number_after,
          MIN(created_at_unix) AS first_vote_at_unix,
          MAX(created_at_unix) AS last_vote_at_unix
        FROM votes
        WHERE ${whereSql}
        GROUP BY campaign_code
      `,
      params,
    );

    return result.rows[0] ?? this.#emptyCampaignSummary(campaignCode);
  }

  async listVotesByCampaign(campaignCode, filters) {
    const { whereSql, params } = this.#buildCampaignWhere(campaignCode, filters);
    const result = await this.database.query(
      `
        SELECT id, campaign_code, vote_number_before, voter, choice, status, created_at_unix
        FROM votes
        WHERE ${whereSql}
        ORDER BY created_at_unix DESC, id DESC
      `,
      params,
    );

    return result.rows;
  }

  async createVotes(votes, createdAtUnix) {
    const client = await this.database.connect();

    try {
      await client.query('BEGIN');

      const insert = this.#buildVoteInsert(votes, createdAtUnix);
      const result = await client.query(insert.text, insert.params);

      await client.query('COMMIT');
      return result.rows;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  #buildDateWhere(filters) {
    const clauses = [];
    const params = [];

    if (filters.startUnix !== undefined) {
      params.push(filters.startUnix);
      clauses.push(`created_at_unix >= $${params.length}`);
    }

    if (filters.endUnix !== undefined) {
      params.push(filters.endUnix);
      clauses.push(`created_at_unix <= $${params.length}`);
    }

    return {
      whereSql: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
      params,
    };
  }

  #buildCampaignWhere(campaignCode, filters) {
    const params = [campaignCode];
    const clauses = ['campaign_code = $1'];

    if (filters.startUnix !== undefined) {
      params.push(filters.startUnix);
      clauses.push(`created_at_unix >= $${params.length}`);
    }

    if (filters.endUnix !== undefined) {
      params.push(filters.endUnix);
      clauses.push(`created_at_unix <= $${params.length}`);
    }

    return {
      whereSql: clauses.join(' AND '),
      params,
    };
  }

  #buildVoteInsert(votes, createdAtUnix) {
    const params = [];
    const valuesSql = votes
      .map((vote, index) => {
        const offset = index * 6;
        params.push(vote.campaignCode, vote.voteNumberBefore, vote.voter, vote.choice, vote.status, createdAtUnix);
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`;
      })
      .join(', ');

    return {
      text: `
        INSERT INTO votes (campaign_code, vote_number_before, voter, choice, status, created_at_unix)
        VALUES ${valuesSql}
        RETURNING id, campaign_code, vote_number_before, voter, choice, status, created_at_unix
      `,
      params,
    };
  }

  #emptyCampaignSummary(campaignCode) {
    return {
      campaign_code: campaignCode,
      vote_number_before: 0,
      total_votes: 0,
      vote_number_after: 0,
      first_vote_at_unix: null,
      last_vote_at_unix: null,
    };
  }
}
