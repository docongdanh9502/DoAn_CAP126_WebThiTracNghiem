import React from 'react';
import { Box, Button, Container, Typography, Card, CardContent, Stack, Chip, Avatar } from '@mui/material';
import QuizIcon from '@mui/icons-material/Quiz';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handlePrimaryCta = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  const handleSecondaryCta = () => {
    if (user) {
      navigate('/quizzes');
    } else {
      navigate('/register');
    }
  };

  return (
    <Box>
      {/* Top navigation */}
      <Box sx={{ borderBottom: '1px solid #eef2f8', bgcolor: 'white' }}>
        <Container maxWidth="lg" sx={{ py: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Quiz Platform</Typography>
            <Stack direction="row" spacing={1.5}>
              <Button size="small" variant="text" onClick={() => navigate('/login')}>Đăng nhập</Button>
              <Button size="small" variant="contained" onClick={() => navigate('/register')}>Đăng ký</Button>
            </Stack>
          </Box>
        </Container>
      </Box>
      {/* Hero */}
      <Box
        sx={{
          background: 'linear-gradient(180deg, #f7fbff 0%, #ffffff 100%)',
          pt: { xs: 8, md: 10 },
          pb: { xs: 6, md: 8 },
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              columnGap: { xs: 3, md: 6 },
              rowGap: 4,
              alignItems: 'center',
            }}
          >
            <Box>
              <Stack spacing={2.5}>
                <Chip size="small" color="primary" label="Quiz Platform" sx={{ alignSelf: 'flex-start' }} />
                <Typography variant="h3" component="h1" sx={{ lineHeight: 1.2 }}>
                  Nền tảng thi trực tuyến hiện đại cho giáo viên và sinh viên
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Tạo đề nhanh, giao bài linh hoạt, chấm điểm tự động và theo dõi kết quả tức thì.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Button size="medium" variant="contained" onClick={handlePrimaryCta}>
                    {user ? 'Vào bảng điều khiển' : 'Bắt đầu ngay'}
                  </Button>
                  <Button size="medium" variant="outlined" onClick={handleSecondaryCta}>
                    {user ? 'Xem bài thi' : 'Đăng ký miễn phí'}
                  </Button>
                </Stack>
              </Stack>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: { xs: 'center', md: 'flex-end' } }}>
              <Box
                sx={{
                  width: { xs: 340, sm: 420, md: 520 },
                  height: { xs: 220, sm: 260, md: 320 },
                  borderRadius: 4,
                  position: 'relative',
                  overflow: 'hidden',
                  background: 'linear-gradient(180deg, #ffffff 0%, #f2f7ff 100%)',
                  border: '1px solid #e6eef8',
                  boxShadow: '0 18px 40px rgba(25, 118, 210, 0.12)'
                }}
              >
                <Box component="svg" viewBox="0 0 520 320" sx={{ position: 'absolute', inset: 0 }}>
                  <defs>
                    <radialGradient id="blob1" cx="70%" cy="30%" r="50%">
                      <stop offset="0%" stopColor="#90caf9" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#90caf9" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="blob2" cx="25%" cy="75%" r="55%">
                      <stop offset="0%" stopColor="#64b5f6" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#64b5f6" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  <rect x="0" y="0" width="520" height="320" fill="url(#blob1)" />
                  <rect x="0" y="0" width="520" height="320" fill="url(#blob2)" />

                  {/* Decorative clipboard + checkmarks */}
                  <g transform="translate(150,70)">
                    <rect x="0" y="0" rx="12" ry="12" width="220" height="180" fill="#ffffff" stroke="#e3eefb" />
                    <rect x="70" y="-14" rx="8" ry="8" width="80" height="28" fill="#e3f2fd" stroke="#bbdefb" />
                    <circle cx="28" cy="48" r="8" fill="#4caf50" />
                    <rect x="50" y="44" width="130" height="8" rx="4" fill="#cfe8ff" />
                    <circle cx="28" cy="88" r="8" fill="#4caf50" />
                    <rect x="50" y="84" width="150" height="8" rx="4" fill="#cfe8ff" />
                    <circle cx="28" cy="128" r="8" fill="#4caf50" />
                    <rect x="50" y="124" width="110" height="8" rx="4" fill="#cfe8ff" />
                  </g>

                  {/* Accent dots */}
                  <circle cx="430" cy="55" r="6" fill="#1976d2" opacity="0.35" />
                  <circle cx="110" cy="260" r="5" fill="#42a5f5" opacity="0.35" />
                </Box>
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Features */}
      <Box sx={{ bgcolor: '#fafcff', borderTop: '1px solid #eef2f8' }}>
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' },
              gap: 3,
            }}
          >
            {[
              {
                title: 'Tạo đề và ngân hàng câu hỏi',
                desc: 'Soạn câu hỏi, phân loại chủ đề, độ khó và tái sử dụng dễ dàng.',
                icon: <QuizIcon />,
                color: '#1976d2',
              },
              {
                title: 'Giao bài và quản lý hạn nộp',
                desc: 'Giao bài cho sinh viên, đặt thời gian làm và hạn nộp rõ ràng.',
                icon: <AssignmentTurnedInIcon />,
                color: '#2e7d32',
              },
              {
                title: 'Chấm điểm tự động',
                desc: 'Tự động chấm theo đáp án, điểm thang 10.',
                icon: <AutoAwesomeIcon />,
                color: '#ed6c02',
              },
            ].map((f) => (
              <Box key={f.title}>
                <Card sx={{ height: '100%', transition: 'box-shadow .2s, transform .2s', '&:hover': { boxShadow: '0 10px 30px rgba(0,0,0,0.08)', transform: 'translateY(-2px)' } }}>
                  <CardContent>
                    <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 1.5 }}>
                      <Avatar sx={{ bgcolor: f.color, width: 40, height: 40 }}>
                        {f.icon}
                      </Avatar>
                      <Typography variant="h6" sx={{ mt: 0.5 }}>
                        {f.title}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {f.desc}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ borderTop: '1px solid #eef2f8', bgcolor: 'white' }}>
        <Container maxWidth="lg" sx={{ py: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" color="text.secondary">© 2025 Quiz Platform</Typography>
          </Box>
        </Container>
      </Box>
      {/* Removed bottom CTA to keep primary actions near hero */}
    </Box>
  );
};

export default Home;


