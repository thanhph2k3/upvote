class ApiClient {
  async getJson(url) {
    const response = await fetch(url);
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.message || 'Không tải được dữ liệu');
    }

    if (!payload) {
      throw new Error('API không trả về JSON hợp lệ');
    }

    return payload;
  }
}

class CsvExporter {
  export(filename, rows) {
    const csv = `\uFEFF${rows.map((row) => row.map((value) => this.#escapeCsv(value)).join(',')).join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  #escapeCsv(value) {
    const raw = String(value ?? '');
    return `"${raw.replaceAll('"', '""')}"`;
  }
}

class RealtimeVoteClient {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  async getVoteCount(campaignCode) {
    const payload = await this.apiClient.getJson(
      `/api/v1/vote/campaigns/${encodeURIComponent(campaignCode)}/realtime-vote`,
    );
    const realtimeVoteCount = Number(payload.realtime_vote_count);

    if (!Number.isFinite(realtimeVoteCount)) {
      throw new Error('API realtime vote không trả về số hợp lệ');
    }

    return realtimeVoteCount;
  }
}

class UpvoteDashboard {
  constructor({ apiClient, csvExporter, realtimeVoteClient, documentRef = document, windowRef = window }) {
    this.apiClient = apiClient;
    this.csvExporter = csvExporter;
    this.realtimeVoteClient = realtimeVoteClient;
    this.document = documentRef;
    this.window = windowRef;
    this.state = {
      campaigns: [],
      campaign: null,
      votes: [],
      selectedCampaignCode: null,
    };
    this.els = this.#getElements();
  }

  init() {
    this.#bindEvents();
    this.#refreshCurrentRoute();
  }

  #getElements() {
    return {
      pageEyebrow: this.document.querySelector('#page-eyebrow'),
      pageTitle: this.document.querySelector('#page-title'),
      startDate: this.document.querySelector('#start-date'),
      endDate: this.document.querySelector('#end-date'),
      refreshRealtime: this.document.querySelector('#refresh-realtime'),
      clearFilter: this.document.querySelector('#clear-filter'),
      campaignListView: this.document.querySelector('#campaign-list-view'),
      campaignDetailView: this.document.querySelector('#campaign-detail-view'),
      leaderCampaignTableBody: this.document.querySelector('#leader-campaign-table-body'),
      businessCampaignTableBody: this.document.querySelector('#business-campaign-table-body'),
      campaignCount: this.document.querySelector('#campaign-count'),
      leaderCampaignCount: this.document.querySelector('#leader-campaign-count'),
      businessCampaignCount: this.document.querySelector('#business-campaign-count'),
      voteTableBody: this.document.querySelector('#vote-table-body'),
      voteCount: this.document.querySelector('#vote-count'),
      metricBefore: this.document.querySelector('#metric-before'),
      metricTotal: this.document.querySelector('#metric-total'),
      metricAfter: this.document.querySelector('#metric-after'),
      metricRealtime: this.document.querySelector('#metric-realtime'),
      exportExcel: this.document.querySelector('#export-excel'),
      loadingState: this.document.querySelector('#loading-state'),
      emptyState: this.document.querySelector('#empty-state'),
      toast: this.document.querySelector('#toast'),
    };
  }

  #bindEvents() {
    this.els.campaignListView.addEventListener('click', (event) => this.#openCampaignFromTable(event));
    this.document.addEventListener('click', (event) => this.#handleHomeLink(event));
    this.els.startDate.addEventListener('change', () => this.#refreshCurrentRoute());
    this.els.endDate.addEventListener('change', () => this.#refreshCurrentRoute());
    this.els.refreshRealtime.addEventListener('click', () => this.#refreshRealtimeVotes());
    this.els.clearFilter.addEventListener('click', () => this.#clearFilters());
    this.els.exportExcel.addEventListener('click', () => this.#exportVotes());
    this.window.addEventListener('popstate', () => this.#refreshCurrentRoute());
  }

  async #loadCampaigns() {
    this.#showLoading(null);

    try {
      const query = this.#getDateUnixRange();
      const payload = await this.apiClient.getJson(`/api/v1/vote/campaigns${query ? `?${query}` : ''}`);
      this.state.campaigns = await this.#attachRealtimeVoteCounts(payload.campaigns || []);
      this.#renderCampaigns();
      this.#showLoaded(null);
    } catch (error) {
      this.#showLoaded(null);
      this.els.leaderCampaignTableBody.innerHTML = '';
      this.els.businessCampaignTableBody.innerHTML = '';
      this.els.emptyState.classList.remove('is-hidden');
      this.#showToast(error.message);
    }
  }

  async #loadCampaignDetail(campaignCode) {
    this.#showLoading(campaignCode);
    this.state.selectedCampaignCode = campaignCode;

    try {
      const query = this.#getDateUnixRange();
      const url = `/api/v1/vote/campaigns/${encodeURIComponent(campaignCode)}${query ? `?${query}` : ''}`;
      const [payload, realtimeVoteCount] = await Promise.all([
        this.apiClient.getJson(url),
        this.realtimeVoteClient.getVoteCount(campaignCode),
      ]);
      this.state.campaign = payload.campaign;
      this.state.campaignRealtimeVoteCount = realtimeVoteCount;
      this.state.votes = payload.votes || [];
      this.#renderCampaignDetail();
      this.#showLoaded(campaignCode);
    } catch (error) {
      this.#showLoaded(campaignCode);
      this.state.campaign = null;
      this.state.campaignRealtimeVoteCount = null;
      this.state.votes = [];
      this.els.voteTableBody.innerHTML = '';
      this.els.emptyState.classList.remove('is-hidden');
      this.#showToast(error.message);
    }
  }

  #renderCampaigns() {
    const leaderCampaigns = this.state.campaigns.filter((campaign) => campaign.campaign_code.includes('-'));
    const businessCampaigns = this.state.campaigns.filter((campaign) => !campaign.campaign_code.includes('-'));

    this.els.campaignCount.textContent = `${this.#formatNumber(this.state.campaigns.length)} chiến dịch`;
    this.els.leaderCampaignCount.textContent = `${this.#formatNumber(leaderCampaigns.length)} chiến dịch`;
    this.els.businessCampaignCount.textContent = `${this.#formatNumber(businessCampaigns.length)} chiến dịch`;

    if (this.state.campaigns.length === 0) {
      this.els.leaderCampaignTableBody.innerHTML = '';
      this.els.businessCampaignTableBody.innerHTML = '';
      this.els.emptyState.classList.remove('is-hidden');
      return;
    }

    this.els.emptyState.classList.add('is-hidden');
    this.els.leaderCampaignTableBody.innerHTML = this.#renderLeaderCampaignRows(leaderCampaigns);
    this.els.businessCampaignTableBody.innerHTML = this.#renderBusinessCampaignRows(businessCampaigns);
  }

  #renderLeaderCampaignRows(campaigns) {
    if (campaigns.length === 0) {
      return '<tr><td colspan="5">Không có chiến dịch</td></tr>';
    }

    return campaigns
      .map((campaign) => {
        return `
          <tr data-campaign-code="${this.#escapeHtml(campaign.campaign_code)}">
            <td class="code-cell">${this.#escapeHtml(campaign.campaign_code)}</td>
            <td>${this.#formatNumber(campaign.vote_number_before)}</td>
            <td>${this.#formatNumber(campaign.total_votes)}</td>
            <td>${this.#formatNumber(campaign.vote_number_after)}</td>
            <td class="realtime-cell">${this.#formatOptionalNumber(campaign.realtime_vote_count)}</td>
          </tr>
        `;
      })
      .join('');
  }

  #renderBusinessCampaignRows(campaigns) {
    if (campaigns.length === 0) {
      return '<tr><td colspan="5">Không có chiến dịch</td></tr>';
    }

    return campaigns
      .map((campaign) => {
        const { businessName } = this.#parseCampaignName(campaign.campaign_code);

        return `
          <tr data-campaign-code="${this.#escapeHtml(campaign.campaign_code)}">
            <td class="code-cell">${this.#escapeHtml(businessName)}</td>
            <td>${this.#formatNumber(campaign.vote_number_before)}</td>
            <td>${this.#formatNumber(campaign.total_votes)}</td>
            <td>${this.#formatNumber(campaign.vote_number_after)}</td>
            <td class="realtime-cell">${this.#formatOptionalNumber(campaign.realtime_vote_count)}</td>
          </tr>
        `;
      })
      .join('');
  }

  async #attachRealtimeVoteCounts(campaigns) {
    return Promise.all(
      campaigns.map(async (campaign) => ({
        ...campaign,
        realtime_vote_count: await this.realtimeVoteClient.getVoteCount(campaign.campaign_code),
      })),
    );
  }

  #renderCampaignDetail() {
    const campaign = this.state.campaign || {};
    this.els.metricBefore.textContent = this.#formatNumber(campaign.vote_number_before);
    this.els.metricTotal.textContent = this.#formatNumber(campaign.total_votes);
    this.els.metricAfter.textContent = this.#formatNumber(campaign.vote_number_after);
    this.els.metricRealtime.textContent = this.#formatOptionalNumber(this.state.campaignRealtimeVoteCount);
    this.els.voteCount.textContent = `${this.#formatNumber(this.state.votes.length)} vote`;

    if (this.state.votes.length === 0) {
      this.els.voteTableBody.innerHTML = '';
      this.els.emptyState.classList.remove('is-hidden');
      return;
    }

    this.els.emptyState.classList.add('is-hidden');
    this.els.voteTableBody.innerHTML = this.state.votes
      .map(
        (vote) => `
          <tr>
            <td>${vote.id}</td>
            <td>${this.#escapeHtml(vote.voter)}</td>
            <td>${this.#escapeHtml(vote.choice)}</td>
            <td>
              <span class="status ${vote.status ? 'status-ok' : 'status-fail'}">
                ${vote.status ? 'Thành công' : 'Thất bại'}
              </span>
            </td>
            <td>${this.#formatDateTime(vote.created_at_unix)}</td>
          </tr>
        `,
      )
      .join('');
  }

  #exportVotes() {
    const campaignCode = this.state.selectedCampaignCode;
    if (!campaignCode || this.state.votes.length === 0) {
      this.#showToast('Không có dữ liệu để xuất');
      return;
    }

    const { businessName } = this.#parseCampaignName(campaignCode);
    const rows = [
      ['ID', 'Tên lãnh đạo', 'Tên Doanh Nghiệp', 'Người vote', 'Lựa chọn', 'Trạng thái', 'Thời gian'],
      ...this.state.votes.map((vote) => [
        vote.id,
        vote.campaign_code.includes('-') ? vote.campaign_code : '',
        businessName,
        vote.voter,
        vote.choice,
        vote.status ? 'Thành công' : 'Thất bại',
        this.#formatDateTime(vote.created_at_unix),
      ]),
    ];
    const dateSuffix = new Date().toISOString().slice(0, 10);

    this.csvExporter.export(`votes-${campaignCode}-${dateSuffix}.csv`, rows);
  }

  #refreshCurrentRoute() {
    const campaignCode = this.#routeCampaignCode();

    if (campaignCode) {
      this.#loadCampaignDetail(campaignCode);
      return;
    }

    this.#loadCampaigns();
  }

  async #refreshRealtimeVotes() {
    const campaignCode = this.#routeCampaignCode();

    this.#setRealtimeRefreshPending(true);

    try {
      if (campaignCode) {
        await this.#refreshCampaignDetailRealtime(campaignCode);
      } else {
        await this.#refreshCampaignListRealtime();
      }

      this.#showToast('Đã cập nhật realtime');
    } catch (error) {
      this.#showToast(error.message);
    } finally {
      this.#setRealtimeRefreshPending(false);
    }
  }

  async #refreshCampaignListRealtime() {
    if (this.state.campaigns.length === 0) {
      await this.#loadCampaigns();
      return;
    }

    this.state.campaigns = await this.#attachRealtimeVoteCounts(this.state.campaigns);
    this.#renderCampaigns();
  }

  async #refreshCampaignDetailRealtime(campaignCode) {
    this.els.metricRealtime.textContent = 'Đang tải...';
    this.state.campaignRealtimeVoteCount = await this.realtimeVoteClient.getVoteCount(campaignCode);
    this.els.metricRealtime.textContent = this.#formatOptionalNumber(this.state.campaignRealtimeVoteCount);
  }

  #setRealtimeRefreshPending(isPending) {
    this.els.refreshRealtime.disabled = isPending;
    this.els.refreshRealtime.classList.toggle('is-refreshing', isPending);
    this.els.refreshRealtime.title = isPending ? 'Đang làm mới realtime' : 'Làm mới realtime';
    this.els.refreshRealtime.setAttribute(
      'aria-label',
      isPending ? 'Đang làm mới realtime' : 'Làm mới realtime',
    );
  }

  #openCampaignFromTable(event) {
    const row = event.target.closest('tr[data-campaign-code]');
    if (!row) {
      return;
    }

    this.window.history.pushState({}, '', `/campaign/${encodeURIComponent(row.dataset.campaignCode)}`);
    this.#refreshCurrentRoute();
  }

  #handleHomeLink(event) {
    const link = event.target.closest('a[href="/"]');
    if (!link) {
      return;
    }

    event.preventDefault();
    this.window.history.pushState({}, '', '/');
    this.#refreshCurrentRoute();
  }

  #clearFilters() {
    this.els.startDate.value = '';
    this.els.endDate.value = '';
    this.#refreshCurrentRoute();
  }

  #getDateUnixRange() {
    const params = new URLSearchParams();

    if (this.els.startDate.value) {
      const start = new Date(`${this.els.startDate.value}T00:00:00`);
      params.set('start_unix', String(Math.floor(start.getTime() / 1000)));
    }

    if (this.els.endDate.value) {
      const end = new Date(`${this.els.endDate.value}T23:59:59`);
      params.set('end_unix', String(Math.floor(end.getTime() / 1000)));
    }

    return params.toString();
  }

  #updateViewMode(campaignCode) {
    const isDetail = Boolean(campaignCode);
    this.els.campaignListView.classList.toggle('is-hidden', isDetail);
    this.els.campaignDetailView.classList.toggle('is-hidden', !isDetail);
    this.els.pageEyebrow.textContent = isDetail ? 'Chi tiết chiến dịch' : 'Tổng quan';
    this.els.pageTitle.textContent = isDetail ? campaignCode : 'Danh sách chiến dịch';
  }

  #showLoading(campaignCode) {
    this.els.emptyState.classList.add('is-hidden');
    this.els.loadingState.classList.remove('is-hidden');
    this.els.campaignListView.classList.add('is-hidden');
    this.els.campaignDetailView.classList.add('is-hidden');
    this.els.leaderCampaignTableBody.innerHTML = '<tr><td colspan="5">Đang tải dữ liệu...</td></tr>';
    this.els.businessCampaignTableBody.innerHTML = '<tr><td colspan="5">Đang tải dữ liệu...</td></tr>';
    this.els.voteTableBody.innerHTML = '<tr><td colspan="5">Đang tải dữ liệu...</td></tr>';
    this.els.metricBefore.textContent = '-';
    this.els.metricTotal.textContent = '-';
    this.els.metricAfter.textContent = '-';
    this.els.metricRealtime.textContent = '-';
    this.els.voteCount.textContent = 'Đang tải...';
    this.els.pageEyebrow.textContent = campaignCode ? 'Chi tiết chiến dịch' : 'Tổng quan';
    this.els.pageTitle.textContent = campaignCode || 'Danh sách chiến dịch';
  }

  #showLoaded(campaignCode) {
    this.els.loadingState.classList.add('is-hidden');
    this.#updateViewMode(campaignCode);
  }

  #showToast(message) {
    this.els.toast.textContent = message;
    this.els.toast.classList.remove('is-hidden');
    this.window.setTimeout(() => this.els.toast.classList.add('is-hidden'), 3200);
  }

  #routeCampaignCode() {
    const match = this.window.location.pathname.match(/^\/campaign\/(.+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  #parseCampaignName(campaignCode) {
    const parts = String(campaignCode || '')
      .split(/\s+[-–—]\s+/)
      .map((part) => part.trim())
      .filter(Boolean);
    const [leaderName, ...businessParts] = parts;

    return {
      leaderName: leaderName || '',
      businessName: businessParts.join(' - ') || leaderName || '',
    };
  }

  #formatNumber(value) {
    return Number(value || 0).toLocaleString('vi-VN');
  }

  #formatOptionalNumber(value) {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    return this.#formatNumber(value);
  }

  #formatDateTime(unix) {
    if (!unix) {
      return '-';
    }

    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(Number(unix) * 1000));
  }

  #escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}

const apiClient = new ApiClient();
const dashboard = new UpvoteDashboard({
  apiClient,
  csvExporter: new CsvExporter(),
  realtimeVoteClient: new RealtimeVoteClient(apiClient),
});

dashboard.init();
