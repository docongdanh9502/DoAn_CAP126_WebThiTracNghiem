import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  useTheme
} from '@mui/material';
import {
  Quiz,
  Assignment,
  BarChart,
  People,
  PersonAdd
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { quizAPI, quizResultAPI, userAPI } from '../services/api';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const [quizCount, setQuizCount] = useState<number>(0);
  const [resultCount, setResultCount] = useState<number>(0);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [activeUsers, setActiveUsers] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (user?.role === 'admin') {
          // Admin dashboard - load user statistics
          const resUsers = await userAPI.getUsers({ page: 1, limit: 1 });
          const total = (resUsers.data.data as any)?.pagination?.total ?? 0;
          if (mounted) setTotalUsers(total);
          
          const resActiveUsers = await userAPI.getUsers({ page: 1, limit: 1, isActive: true });
          const activeTotal = (resActiveUsers.data.data as any)?.pagination?.total ?? 0;
          if (mounted) setActiveUsers(activeTotal);
        } else if (user?.role === 'teacher') {
          const resQ = await quizAPI.getQuizzes({ page: 1, limit: 1, search: '' });
          const total = (resQ.data.data as any)?.pagination?.total ?? (resQ.data.data as any)?.quizzes?.length ?? 0;
          if (mounted) setQuizCount(total);
          const resS = await quizResultAPI.getMyResultsSummary();
          if (mounted) setResultCount((resS.data.data as any)?.totalResults ?? 0);
        } else if (user?.role === 'student') {
          const resA = await quizAPI.getAssignedQuizzes({ page: 1, limit: 1, search: '' });
          const totalA = (resA.data.data as any)?.pagination?.total ?? (resA.data.data as any)?.assignments?.length ?? 0;
          if (mounted) setQuizCount(totalA);
          const resR = await quizResultAPI.getStudentQuizResults();
          if (mounted) setResultCount((resR.data.data as any)?.results?.length ?? 0);
        }
      } catch {
        if (mounted) {
          setQuizCount(0);
          setResultCount(0);
          setTotalUsers(0);
          setActiveUsers(0);
        }
      }
    })();
    return () => { mounted = false; };
  }, [user]);

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'grey.50' }}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" gutterBottom fontWeight="bold" sx={{ 
            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Dashboard
          </Typography>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {user?.role === 'admin' 
              ? 'Quản lý người dùng hệ thống' 
              : user?.role === 'teacher'
              ? 'Quản lý ngân hàng câu hỏi, bài thi và theo dõi kết quả học tập'
              : 'Làm bài thi và theo dõi kết quả học tập của bạn'}
          </Typography>
        </Box>

        {/* Admin Dashboard */}
        {user?.role === 'admin' ? (
          <>
            {/* Stats Cards for Admin */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 3, mb: 4 }}>
              {/* Tổng số người dùng */}
              <Card sx={{
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <Box sx={{ position: 'absolute', top: 0, right: 0, opacity: 0.1 }}>
                  <People sx={{ fontSize: 100 }} />
                </Box>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ bgcolor: 'rgba(255,255,255,0.2)', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 2 }}>
                      <People />
                    </Box>
                    <Box>
                      <Typography variant="h4" fontWeight="bold">
                        {totalUsers}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Tổng số người dùng
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              {/* Số người dùng hoạt động */}
              <Card sx={{
                background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <Box sx={{ position: 'absolute', top: 0, right: 0, opacity: 0.1 }}>
                  <PersonAdd sx={{ fontSize: 100 }} />
                </Box>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ bgcolor: 'rgba(255,255,255,0.2)', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 2 }}>
                      <PersonAdd />
                    </Box>
                    <Box>
                      <Typography variant="h4" fontWeight="bold">
                        {activeUsers}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Người dùng đang hoạt động
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>

            {/* Function Cards for Admin */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr' }, gap: 3 }}>
              {/* Quản lý người dùng */}
              <Card sx={{ borderRadius: 2, cursor: 'pointer', transition: 'all 0.3s ease', '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 } }} onClick={() => navigate('/users')}>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <People sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Quản lý người dùng hệ thống
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Xem, tạo, sửa và xóa tài khoản người dùng
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </>
        ) : (
          <>
            {/* Stats Cards for Teacher/Student */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 3, mb: 4 }}>
              {/* Bài thi đã tạo */}
              <Card sx={{
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <Box sx={{ position: 'absolute', top: 0, right: 0, opacity: 0.1 }}>
                  <Assignment sx={{ fontSize: 100 }} />
                </Box>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ bgcolor: 'rgba(255,255,255,0.2)', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 2 }}>
                      <Assignment />
                    </Box>
                    <Box>
                      <Typography variant="h4" fontWeight="bold">
                        {quizCount}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        {user?.role === 'student' ? 'Bài thi có thể làm' : 'Bài thi đã tạo'}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              {/* Kết quả thi */}
              <Card sx={{
                background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <Box sx={{ position: 'absolute', top: 0, right: 0, opacity: 0.1 }}>
                  <BarChart sx={{ fontSize: 100 }} />
                </Box>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ bgcolor: 'rgba(255,255,255,0.2)', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 2 }}>
                      <BarChart />
                    </Box>
                    <Box>
                      <Typography variant="h4" fontWeight="bold">
                        {resultCount}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        {user?.role === 'student' ? 'Bài thi đã làm' : 'Kết quả thi'}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>

            {/* Function Cards for Teacher/Student */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3, mb: 3 }}>
              {user?.role === 'student' ? (
                // Cards cho sinh viên
                <>
                  {/* Làm bài thi */}
                  <Card sx={{ borderRadius: 2, cursor: 'pointer', transition: 'all 0.3s ease', '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 } }} onClick={() => navigate('/quizzes')}>
                    <CardContent sx={{ textAlign: 'center', py: 4 }}>
                      <Quiz sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Làm bài thi
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Xem và làm các bài thi được giao
                      </Typography>
                    </CardContent>
                  </Card>

                  {/* Xem kết quả */}
                  <Card sx={{ borderRadius: 2, cursor: 'pointer', transition: 'all 0.3s ease', '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 } }} onClick={() => navigate('/results')}>
                    <CardContent sx={{ textAlign: 'center', py: 4 }}>
                      <BarChart sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Xem kết quả
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Xem kết quả các bài thi đã làm
                      </Typography>
                    </CardContent>
                  </Card>
                </>
              ) : (
                // Cards cho giáo viên
                <>
                  {/* Quản lý câu hỏi */}
                  <Card sx={{ borderRadius: 2, cursor: 'pointer', transition: 'all 0.3s ease', '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 } }} onClick={() => navigate('/questions')}>
                    <CardContent sx={{ textAlign: 'center', py: 4 }}>
                      <Quiz sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Quản lý câu hỏi
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Tạo và quản lý ngân hàng câu hỏi
                      </Typography>
                    </CardContent>
                  </Card>

                  {/* Quản lý bài thi */}
                  <Card sx={{ borderRadius: 2, cursor: 'pointer', transition: 'all 0.3s ease', '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 } }} onClick={() => navigate('/quizzes')}>
                    <CardContent sx={{ textAlign: 'center', py: 4 }}>
                      <Assignment sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Quản lý bài thi
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Tạo và quản lý các bài thi
                      </Typography>
                    </CardContent>
                  </Card>
                </>
              )}
            </Box>

            {/* Xem kết quả - Full width cho giáo viên */}
            {user?.role === 'teacher' && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr' }, gap: 3 }}>
                <Card sx={{ borderRadius: 2, cursor: 'pointer', transition: 'all 0.3s ease', '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 } }} onClick={() => navigate('/results')}>
                  <CardContent sx={{ textAlign: 'center', py: 4 }}>
                    <BarChart sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }} />
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Xem kết quả
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Xem kết quả và thống kê
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            )}
          </>
        )}
      </Container>
    </Box>
  );
};

export default Dashboard;