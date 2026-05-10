const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '');

async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || 'Không tải được dữ liệu');
  }

  if (!payload) {
    throw new Error('API không trả về JSON hợp lệ');
  }

  return payload;
}

export function buildDateQuery({ startDate, endDate }) {
  const params = new URLSearchParams();

  if (startDate) {
    const start = new Date(`${startDate}T00:00:00`);
    params.set('start_unix', String(Math.floor(start.getTime() / 1000)));
  }

  if (endDate) {
    const end = new Date(`${endDate}T23:59:59`);
    params.set('end_unix', String(Math.floor(end.getTime() / 1000)));
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function listCampaigns(filters) {
  const payload = await requestJson(`/vote/campaigns${buildDateQuery(filters)}`);
  return payload.campaigns || [];
}

export async function getCampaign(campaignCode, filters) {
  return requestJson(`/vote/campaigns/${encodeURIComponent(campaignCode)}${buildDateQuery(filters)}`);
}

export async function getRealtimeVote(campaignCode) {
  const payload = await requestJson(`/vote/campaigns/${encodeURIComponent(campaignCode)}/realtime-vote`);
  const realtimeVoteCount = Number(payload.realtime_vote_count);

  if (!Number.isFinite(realtimeVoteCount)) {
    throw new Error('API realtime vote không trả về số hợp lệ');
  }

  return realtimeVoteCount;
}

export async function getRealtimeVotes(campaignCodes) {
  if (campaignCodes.length === 0) {
    return new Map();
  }

  const payload = await requestJson('/vote/campaigns/realtime-votes', {
    method: 'POST',
    body: JSON.stringify({ campaign_codes: campaignCodes }),
  });
  const realtimeVotes = Array.isArray(payload.realtime_votes) ? payload.realtime_votes : [];

  return new Map(
    realtimeVotes.map((realtimeVote) => {
      const realtimeVoteCount = Number(realtimeVote.realtime_vote_count);

      if (!Number.isFinite(realtimeVoteCount)) {
        throw new Error('API realtime vote không trả về số hợp lệ');
      }

      return [realtimeVote.campaign_code, realtimeVoteCount];
    }),
  );
}
