import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Divider
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  School as SchoolIcon,
  AccountCircle as AccountCircleIcon,
  Person as PersonIcon,
  ExitToApp as ExitToAppIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const isHomePage = location.pathname === '/dashboard';
  const showBackButton = !isHomePage;

  const handleGoBack = () => {
    navigate('/dashboard');
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar position="static" sx={{ bgcolor: 'primary.main' }}>
        <Toolbar>
          {/* Logo và tiêu đề */}
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <SchoolIcon sx={{ mr: 2, fontSize: 28 }} />
            <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
              Quiz Platform
            </Typography>
          </Box>


          {/* Thông tin user và menu */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {user?.role === 'teacher' ? 'Giáo viên' : 'Sinh viên'} - {(user as any)?.fullName || user?.username}
            </Typography>
            <IconButton
              color="inherit"
              onClick={handleMenuClick}
              sx={{ p: 0 }}
            >
              <Avatar
                src={(user as any)?.avatar || ''}
                sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}
              >
                {!((user as any)?.avatar) && <AccountCircleIcon />}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <MenuItem onClick={() => { handleMenuClose(); navigate('/profile'); }}>
                <PersonIcon sx={{ mr: 1 }} />
                Hồ sơ
              </MenuItem>
              <Divider />
              <MenuItem onClick={() => { handleMenuClose(); handleLogout(); }}>
                <ExitToAppIcon sx={{ mr: 1 }} />
                Đăng xuất
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Nút quay lại - Bottom Left */}
      {showBackButton && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 30,
            left: 30,
            zIndex: 1000,
          }}
        >
          <IconButton
            onClick={handleGoBack}
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              width: 50,
              height: 50,
              borderRadius: '50%',
              boxShadow: '0 4px 20px rgba(25, 118, 210, 0.3)',
              '&:hover': {
                bgcolor: 'primary.dark',
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 25px rgba(25, 118, 210, 0.4)',
              },
              transition: 'all 0.3s ease-in-out',
            }}
            title="Về trang chủ Dashboard"
          >
            <ArrowBackIcon sx={{ fontSize: 24 }} />
          </IconButton>
        </Box>
      )}

      {/* Nội dung chính */}
      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'grey.50' }}>
        {children}
      </Box>

      {/* Footer */}
      <Box component="footer" sx={{ py: 2, textAlign: 'center', bgcolor: 'white', borderTop: '1px solid #eef2f8' }}>
        <Typography variant="body2" color="text.secondary">© 2025 Quiz Platform</Typography>
      </Box>
    </Box>
  );
};

export default Layout;
