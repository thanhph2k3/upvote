import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ThemeProvider,
  Toolbar,
  Tooltip,
  Typography,
  createTheme,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCampaign, getRealtimeVote, getRealtimeVotes, listCampaigns } from './api.js';

const drawerWidth = 260;

const theme = createTheme({
  palette: {
    background: {
      default: '#f5f7fb',
    },
    primary: {
      main: '#176b5b',
      dark: '#0f5145',
    },
    secondary: {
      main: '#d9802e',
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    button: {
      fontWeight: 750,
      textTransform: 'none',
    },
  },
});

function formatNumber(value) {
  return Number(value || 0).toLocaleString('vi-VN');
}

function formatOptionalNumber(value) {
  return value === null || value === undefined || value === '' ? '-' : formatNumber(value);
}

function formatDateTime(unix) {
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

function parseCampaignName(campaignCode) {
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

function exportCsv(filename, rows) {
  const csv = `\uFEFF${rows.map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')}`;
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

function useRouteCampaignCode() {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const updatePathname = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', updatePathname);
    return () => window.removeEventListener('popstate', updatePathname);
  }, []);

  const navigate = useCallback((path) => {
    window.history.pushState({}, '', path);
    setPathname(path);
  }, []);

  const match = pathname.match(/^\/campaign\/(.+)$/);
  return {
    campaignCode: match ? decodeURIComponent(match[1]) : null,
    navigate,
  };
}

function Sidebar({ navigate }) {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          borderRight: 0,
          bgcolor: '#15222f',
          color: '#ffffff',
          p: 2.25,
        },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 4 }}>
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: 1,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'primary.main',
            fontWeight: 800,
          }}
        >
          U
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontSize: 18, fontWeight: 800, lineHeight: 1.2 }}>
            Upvote
          </Typography>
          <Typography sx={{ color: '#aeb9c7', fontSize: 13 }}>Campaign Monitor</Typography>
        </Box>
      </Stack>
      <Button
        fullWidth
        variant="text"
        onClick={() => navigate('/')}
        sx={{
          justifyContent: 'flex-start',
          minHeight: 42,
          px: 1.5,
          color: '#ffffff',
          bgcolor: 'rgba(255,255,255,0.1)',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' },
        }}
      >
        Chiến dịch
      </Button>
    </Drawer>
  );
}

function CampaignTable({ title, count, rows, labelResolver, onOpenCampaign }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography variant="h6" sx={{ fontSize: 18, fontWeight: 800 }}>
          {title}
        </Typography>
        <Chip label={`${formatNumber(count)} chiến dịch`} size="small" />
      </Stack>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{title === 'Bầu lãnh đạo' ? 'Tên lãnh đạo' : 'Tên Doanh Nghiệp'}</TableCell>
              <TableCell align="right">Số vote trước khi chạy</TableCell>
              <TableCell align="right">Tổng số vote</TableCell>
              <TableCell align="right">Số vote sau khi chạy</TableCell>
              <TableCell align="right">Số Vote Realtime</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>Không có chiến dịch</TableCell>
              </TableRow>
            ) : (
              rows.map((campaign) => (
                <TableRow
                  hover
                  key={campaign.campaign_code}
                  onClick={() => onOpenCampaign(campaign.campaign_code)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell sx={{ fontWeight: 750 }}>{labelResolver(campaign)}</TableCell>
                  <TableCell align="right">{formatNumber(campaign.vote_number_before)}</TableCell>
                  <TableCell align="right">{formatNumber(campaign.total_votes)}</TableCell>
                  <TableCell align="right">{formatNumber(campaign.vote_number_after)}</TableCell>
                  <TableCell align="right">{formatOptionalNumber(campaign.realtime_vote_count)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

function Metrics({ campaign, realtimeVoteCount }) {
  const items = [
    ['Số vote trước khi chạy', formatNumber(campaign?.vote_number_before)],
    ['Tổng số vote', formatNumber(campaign?.total_votes)],
    ['Số vote sau khi chạy', formatNumber(campaign?.vote_number_after)],
    ['Số Vote Realtime', formatOptionalNumber(realtimeVoteCount)],
  ];

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 3 }}>
      {items.map(([label, value]) => (
        <Paper key={label} variant="outlined" sx={{ flex: 1, p: 2, borderRadius: 1 }}>
          <Typography sx={{ color: 'text.secondary', fontSize: 13, fontWeight: 700 }}>{label}</Typography>
          <Typography variant="h4" sx={{ mt: 0.75, fontWeight: 850 }}>
            {value}
          </Typography>
        </Paper>
      ))}
    </Stack>
  );
}

export default function App() {
  const { campaignCode, navigate } = useRouteCampaignCode();
  const [filters, setFilters] = useState({ startDate: '', endDate: '' });
  const [campaigns, setCampaigns] = useState([]);
  const [campaign, setCampaign] = useState(null);
  const [votes, setVotes] = useState([]);
  const [realtimeVoteCount, setRealtimeVoteCount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshingRealtime, setRefreshingRealtime] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = useCallback((message) => setToast(message), []);

  const attachRealtimeVoteCounts = useCallback(async (items) => {
    const counts = await getRealtimeVotes(items.map((item) => item.campaign_code));
    return items.map((item) => ({
      ...item,
      realtime_vote_count: counts.get(item.campaign_code),
    }));
  }, []);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const items = await listCampaigns(filters);
      setCampaigns(await attachRealtimeVoteCounts(items));
    } catch (error) {
      setCampaigns([]);
      showToast(error.message);
    } finally {
      setLoading(false);
    }
  }, [attachRealtimeVoteCounts, filters, showToast]);

  const loadCampaignDetail = useCallback(async () => {
    if (!campaignCode) {
      return;
    }

    setLoading(true);
    try {
      const [payload, realtime] = await Promise.all([
        getCampaign(campaignCode, filters),
        getRealtimeVote(campaignCode),
      ]);
      setCampaign(payload.campaign);
      setVotes(payload.votes || []);
      setRealtimeVoteCount(realtime);
    } catch (error) {
      setCampaign(null);
      setVotes([]);
      setRealtimeVoteCount(null);
      showToast(error.message);
    } finally {
      setLoading(false);
    }
  }, [campaignCode, filters, showToast]);

  useEffect(() => {
    if (campaignCode) {
      loadCampaignDetail();
    } else {
      setCampaign(null);
      setVotes([]);
      setRealtimeVoteCount(null);
      loadCampaigns();
    }
  }, [campaignCode, loadCampaignDetail, loadCampaigns]);

  const leaderCampaigns = useMemo(
    () => campaigns.filter((item) => item.campaign_code.includes('-')),
    [campaigns],
  );
  const businessCampaigns = useMemo(
    () => campaigns.filter((item) => !item.campaign_code.includes('-')),
    [campaigns],
  );

  const refreshRealtime = async () => {
    setRefreshingRealtime(true);
    try {
      if (campaignCode) {
        setRealtimeVoteCount(await getRealtimeVote(campaignCode));
      } else if (campaigns.length === 0) {
        await loadCampaigns();
      } else {
        setCampaigns(await attachRealtimeVoteCounts(campaigns));
      }
      showToast('Đã cập nhật realtime');
    } catch (error) {
      showToast(error.message);
    } finally {
      setRefreshingRealtime(false);
    }
  };

  const clearFilters = () => setFilters({ startDate: '', endDate: '' });

  const exportVotes = () => {
    if (!campaignCode || votes.length === 0) {
      showToast('Không có dữ liệu để xuất');
      return;
    }

    const { businessName } = parseCampaignName(campaignCode);
    const rows = [
      ['ID', 'Tên lãnh đạo', 'Tên Doanh Nghiệp', 'Người vote', 'Lựa chọn', 'Trạng thái', 'Thời gian'],
      ...votes.map((vote) => [
        vote.id,
        vote.campaign_code.includes('-') ? vote.campaign_code : '',
        businessName,
        vote.voter,
        vote.choice,
        vote.status ? 'Thành công' : 'Thất bại',
        formatDateTime(vote.created_at_unix),
      ]),
    ];
    const dateSuffix = new Date().toISOString().slice(0, 10);
    exportCsv(`votes-${campaignCode}-${dateSuffix}.csv`, rows);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
        <Sidebar navigate={navigate} />
        <Box component="main" sx={{ flexGrow: 1, minWidth: 0 }}>
          <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '1px solid #dce3ec' }}>
            <Toolbar sx={{ gap: 2, justifyContent: 'space-between', alignItems: 'flex-end', py: 2 }}>
              <Box>
                <Typography sx={{ color: 'primary.main', fontSize: 12, fontWeight: 850, textTransform: 'uppercase' }}>
                  {campaignCode ? 'Chi tiết chiến dịch' : 'Tổng quan'}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 850, fontSize: 28, lineHeight: 1.2 }}>
                  {campaignCode || 'Danh sách chiến dịch'}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} alignItems="flex-end" flexWrap="wrap" useFlexGap>
                <TextField
                  label="Từ ngày"
                  type="date"
                  size="small"
                  value={filters.startDate}
                  onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Đến ngày"
                  type="date"
                  size="small"
                  value={filters.endDate}
                  onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
                <Button variant="text" color="inherit" onClick={clearFilters}>
                  Xóa lọc
                </Button>
                <Tooltip title={refreshingRealtime ? 'Đang làm mới realtime' : 'Làm mới realtime'}>
                  <span>
                    <IconButton color="primary" onClick={refreshRealtime} disabled={refreshingRealtime}>
                      {refreshingRealtime ? <CircularProgress size={22} /> : <RefreshIcon />}
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            </Toolbar>
          </AppBar>

          <Container maxWidth={false} sx={{ p: 3.5 }}>
            {loading ? (
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 1 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <CircularProgress size={28} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      Đang tải dữ liệu
                    </Typography>
                    <Typography color="text.secondary">Vui lòng chờ trong giây lát.</Typography>
                  </Box>
                </Stack>
              </Paper>
            ) : campaignCode ? (
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Button variant="outlined" onClick={() => navigate('/')}>
                    Quay lại
                  </Button>
                  <Button variant="contained" startIcon={<DownloadIcon />} onClick={exportVotes}>
                    Xuất Excel
                  </Button>
                </Stack>
                <Metrics campaign={campaign} realtimeVoteCount={realtimeVoteCount} />
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontSize: 18, fontWeight: 800 }}>
                      Danh sách vote
                    </Typography>
                    <Typography color="text.secondary">{formatNumber(votes.length)} vote</Typography>
                  </Box>
                </Stack>
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Người vote</TableCell>
                        <TableCell>Lựa chọn</TableCell>
                        <TableCell>Trạng thái</TableCell>
                        <TableCell>Thời gian</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {votes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5}>Không có dữ liệu</TableCell>
                        </TableRow>
                      ) : (
                        votes.map((vote) => (
                          <TableRow key={vote.id}>
                            <TableCell>{vote.id}</TableCell>
                            <TableCell>{vote.voter}</TableCell>
                            <TableCell>{vote.choice}</TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                color={vote.status ? 'success' : 'error'}
                                label={vote.status ? 'Thành công' : 'Thất bại'}
                              />
                            </TableCell>
                            <TableCell>{formatDateTime(vote.created_at_unix)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ) : (
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontSize: 18, fontWeight: 800 }}>
                      Chiến dịch
                    </Typography>
                    <Typography color="text.secondary">{formatNumber(campaigns.length)} chiến dịch</Typography>
                  </Box>
                </Stack>
                <CampaignTable
                  title="Bầu lãnh đạo"
                  count={leaderCampaigns.length}
                  rows={leaderCampaigns}
                  labelResolver={(item) => item.campaign_code}
                  onOpenCampaign={(code) => navigate(`/campaign/${encodeURIComponent(code)}`)}
                />
                <Divider sx={{ my: 2 }} />
                <CampaignTable
                  title="Doanh nghiệp"
                  count={businessCampaigns.length}
                  rows={businessCampaigns}
                  labelResolver={(item) => parseCampaignName(item.campaign_code).businessName}
                  onOpenCampaign={(code) => navigate(`/campaign/${encodeURIComponent(code)}`)}
                />
              </Box>
            )}
          </Container>
        </Box>
      </Box>
      <Snackbar open={Boolean(toast)} autoHideDuration={3200} onClose={() => setToast('')}>
        <Alert severity="info" variant="filled" onClose={() => setToast('')}>
          {toast}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}
