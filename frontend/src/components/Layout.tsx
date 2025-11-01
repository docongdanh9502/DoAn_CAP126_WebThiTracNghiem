// ============================================
// FILE: Layout.tsx
// MÔ TẢ: Layout component - Wrapper cho tất cả protected pages
// CHỨC NĂNG: Header (AppBar) với logo, user info, menu; Back button; Footer; Main content area
// ============================================

import React, { useState } from 'react'; // React hooks
import { useNavigate, useLocation } from 'react-router-dom'; // React Router navigation và location
import {
  AppBar,        // AppBar component (top navigation bar)
  Toolbar,        // Toolbar component (container cho AppBar content)
  Typography,     // Typography component
  IconButton,     // Icon button component
  Box,            // Box component
  Avatar,         // Avatar component (user avatar)
  Menu,           // Menu component (dropdown menu)
  MenuItem,       // Menu item component
  Divider         // Divider component
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,           // Icon quay lại
  School as SchoolIcon,                  // Icon trường học (logo)
  AccountCircle as AccountCircleIcon,    // Icon account (fallback avatar)
  Person as PersonIcon,                  // Icon người dùng
  ExitToApp as ExitToAppIcon             // Icon đăng xuất
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext'; // Authentication context

// ============================================
// LAYOUT PROPS - Props interface
// ============================================
interface LayoutProps {
  children: React.ReactNode; // Nội dung chính (page content)
}

/**
 * Component Layout - Layout wrapper cho protected pages
 * - Header: Logo, user info, dropdown menu (Profile, Logout)
 * - Back button: Nút quay về dashboard (fixed bottom-left, chỉ hiển thị khi không phải dashboard)
 * - Main content: {children}
 * - Footer: Liên hệ hỗ trợ và copyright
 */
const Layout: React.FC<LayoutProps> = ({ children }) => {
  // Hook để điều hướng
  const navigate = useNavigate();
  
  // Hook để lấy location hiện tại
  const location = useLocation();
  
  // Lấy user và logout function từ AuthContext
  const { user, logout } = useAuth();
  
  // State quản lý menu anchor (để mở/đóng dropdown menu)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Kiểm tra có phải trang dashboard không
  const isHomePage = location.pathname === '/dashboard';
  
  // Hiển thị nút quay lại nếu không phải dashboard
  const showBackButton = !isHomePage;

  // ============================================
  // HANDLE GO BACK - Quay về dashboard
  // ============================================
  /**
   * Function quay về trang dashboard
   */
  const handleGoBack = () => {
    navigate('/dashboard');
  };

  // ============================================
  // HANDLE MENU CLICK - Mở dropdown menu
  // ============================================
  /**
   * Function mở dropdown menu khi click vào avatar
   */
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget); // Set anchor element để định vị menu
  };

  // ============================================
  // HANDLE MENU CLOSE - Đóng dropdown menu
  // ============================================
  /**
   * Function đóng dropdown menu
   */
  const handleMenuClose = () => {
    setAnchorEl(null); // Xóa anchor element
  };

  // ============================================
  // HANDLE LOGOUT - Đăng xuất
  // ============================================
  /**
   * Function xử lý đăng xuất
   * - Gọi logout function từ AuthContext
   * - Redirect về trang login
   */
  const handleLogout = () => {
    logout();              // Xóa token và user khỏi state và localStorage
    navigate('/login');     // Redirect về trang login
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
              {user?.role === 'admin' ? 'Quản trị viên' : 
               user?.role === 'teacher' ? 'Giáo viên' : 'Sinh viên'} - {(user as any)?.fullName || user?.username}
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
      <Box component="footer" sx={{ py: 3, textAlign: 'center', bgcolor: 'white', borderTop: '1px solid #eef2f8' }}>
        <Box sx={{ mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Liên hệ hỗ trợ: <Typography component="span" sx={{ fontWeight: 'medium', color: 'primary.main' }}>admin@quizplatform.com</Typography>
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">© 2025 Quiz Platform</Typography>
      </Box>
    </Box>
  );
};

export default Layout;
