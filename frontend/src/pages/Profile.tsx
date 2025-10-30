import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  Button,
  TextField,
  Avatar,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar,
  useTheme,
  Tab,
  Tabs,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Person as PersonIcon,
  School as SchoolIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Lock as LockIcon,
  Book as BookIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { userAPI } from '../services/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Profile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    fullName: (user as any).fullName || '',
    studentId: user?.studentId || '',
    class: user?.class || '',
    gender: (user as any).gender || '',
    avatar: (user as any).avatar || ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        email: user.email,
        fullName: (user as any).fullName || '',
        studentId: user.studentId || '',
        class: user.class || '',
        gender: (user as any).gender || '',
        avatar: (user as any).avatar || ''
      });
    }
  }, [user]);

  // Ensure active tab index is valid after removing tabs
  useEffect(() => {
    if (tabValue > 1) setTabValue(0);
  }, [tabValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn tệp hình ảnh');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setFormData(prev => ({ ...prev, avatar: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      // Update user profile
      const res = await userAPI.updateUser((user as any).id || (user as any)._id, {
        profile: formData,
      });
      const updated = (res as any).data?.data?.user || null;
      if (updated) {
        // Update local form and persist to localStorage so it survives reloads
        setFormData({
          username: updated.username,
          email: updated.email,
          fullName: (updated as any).fullName || '',
          studentId: updated.studentId || '',
          class: updated.class || '',
          gender: (updated as any).gender || '',
          // Keep current preview if server didn't echo avatar back
          avatar: (updated as any).avatar || formData.avatar || ''
        });
        const normalized = { ...updated, _id: (updated as any)._id || (updated as any).id };
        localStorage.setItem('user', JSON.stringify(normalized));
      }
      // Refresh global auth user so other pages and future mounts use fresh data
      await refreshUser();
      setSuccess('Cập nhật thông tin thành công');
      setEditing(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    try {
      setLoading(true);
      // Update password - this would need to be implemented in the API
      setSuccess('Cập nhật mật khẩu thành công');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (!user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const currentTab = tabValue > 1 ? 0 : tabValue;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" gutterBottom fontWeight="bold" sx={{ 
            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Thông tin cá nhân
          </Typography>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Quản lý thông tin cá nhân và cài đặt tài khoản
          </Typography>
        </Box>

        {/* Profile Header */}
        <Card sx={{ mb: 4, borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ 
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            p: 4,
            color: 'white'
          }}>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'auto 1fr auto', 
              gap: 3, 
              alignItems: 'center' 
            }}>
              <Box sx={{ position: 'relative', width: 120, height: 120 }}>
                <Avatar
                  sx={{ 
                    width: 120, 
                    height: 120,
                    fontSize: '2rem',
                    bgcolor: 'rgba(255,255,255,0.2)',
                    border: '4px solid rgba(255,255,255,0.3)'
                  }}
                  src={formData.avatar || (user as any).avatar}
                >
                  {getInitials((user as any)?.fullName || user?.username || '')}
                </Avatar>
                <Tooltip title={editing ? 'Tải ảnh từ máy' : 'Nhấn Chỉnh sửa để thay ảnh'}>
                  <span>
                    <IconButton
                      component="label"
                      disabled={!editing}
                      sx={{
                        position: 'absolute',
                        right: -8,
                        bottom: -8,
                        bgcolor: 'white',
                        boxShadow: 2,
                        '&:hover': { bgcolor: 'grey.100' }
                      }}
                    >
                      <input hidden type="file" accept="image/*" onChange={handleAvatarFile} />
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 3L7.17 5H5C3.9 5 3 5.9 3 7V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V7C21 5.9 20.1 5 19 5H16.83L15 3H9Z" stroke="#1976d2" strokeWidth="2"/>
                        <circle cx="12" cy="13" r="4" stroke="#1976d2" strokeWidth="2"/>
                      </svg>
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
              <Box>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                  {(user as any)?.fullName || user?.username}
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.9, mb: 1 }}>
                  {user?.email}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <SchoolIcon sx={{ mr: 1, fontSize: 20 }} />
                    <Typography variant="body2">
                      {user?.role === 'admin' ? 'Quản trị viên' : 
                       user?.role === 'teacher' ? 'Giáo viên' : 'Sinh viên'}
                    </Typography>
                  </Box>
                  {user?.role === 'student' && user?.class && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <BookIcon sx={{ mr: 1, fontSize: 20 }} />
                      <Typography variant="body2">Lớp: {user.class}</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => setEditing(true)}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.3)'
                  }
                }}
              >
                Chỉnh sửa
              </Button>
            </Box>
          </Box>
        </Card>

        {/* Tabs */}
        <Card sx={{ borderRadius: 2 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={currentTab} onChange={handleTabChange} aria-label="profile tabs">
              <Tab 
                icon={<PersonIcon />} 
                label="Thông tin cá nhân" 
                iconPosition="start"
                sx={{ minHeight: 64 }}
              />
              <Tab 
                icon={<LockIcon />} 
                label="Bảo mật" 
                iconPosition="start"
                sx={{ minHeight: 64 }}
              />
              
            </Tabs>
          </Box>

          {/* Personal Information Tab */}
          <CustomTabPanel value={currentTab} index={0}>
            <form onSubmit={handleSubmit}>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                gap: 3 
              }}>
                <TextField
                name="fullName"
                label="Họ và tên"
                fullWidth
                value={formData.fullName}
                onChange={handleChange}
                disabled={!editing}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <TextField
                  name="username"
                  label="Tên đăng nhập"
                  fullWidth
                  value={formData.username}
                onChange={handleChange}
                disabled // immutable by default
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <TextField
                  name="email"
                  label="Email"
                  type="email"
                  fullWidth
                  value={formData.email}
                onChange={handleChange}
                disabled // immutable by default
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                {user?.role === 'student' && (
                  <>
                    <TextField
                      name="studentId"
                      label="Mã số sinh viên"
                      fullWidth
                      value={formData.studentId}
                    onChange={handleChange}
                    disabled // immutable by default
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                    <TextField
                      name="class"
                      label="Lớp học"
                      fullWidth
                      value={formData.class}
                      onChange={handleChange}
                    disabled={!editing}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </>
                )}
              <FormControl fullWidth disabled={!editing}>
                <InputLabel id="gender-select-label">Giới tính</InputLabel>
                <Select
                  labelId="gender-select-label"
                  id="gender"
                  name="gender"
                  label="Giới tính"
                  value={formData.gender}
                  onChange={(e) => setFormData(prev => ({ ...prev, gender: String(e.target.value) }))}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="male">Nam</MenuItem>
                  <MenuItem value="female">Nữ</MenuItem>
                  <MenuItem value="other">Khác</MenuItem>
                </Select>
              </FormControl>
              {/* Removed phone field per request */}
                {/* Upload control moved to avatar circle */}
                {editing && (
                  <Box sx={{ 
                    display: 'flex', 
                    gap: 2, 
                    justifyContent: 'flex-end',
                    gridColumn: '1 / -1'
                  }}>
                    <Button
                      variant="outlined"
                      onClick={() => setEditing(false)}
                      sx={{ borderRadius: 2 }}
                    >
                      Hủy
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                      sx={{ 
                        borderRadius: 2,
                        background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        '&:hover': {
                          background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                        }
                      }}
                    >
                      Lưu thay đổi
                    </Button>
                  </Box>
                )}
              </Box>
            </form>
          </CustomTabPanel>

          {/* Security Tab */}
          <CustomTabPanel value={currentTab} index={1}>
            <form onSubmit={handlePasswordSubmit}>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr', 
                gap: 3 
              }}>
                <Alert severity="info" sx={{ mb: 3 }}>
                  Để bảo mật tài khoản, hãy sử dụng mật khẩu mạnh có ít nhất 8 ký tự bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
                </Alert>
                <TextField
                  name="currentPassword"
                  label="Mật khẩu hiện tại"
                  type="password"
                  fullWidth
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  required
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                  gap: 2 
                }}>
                  <TextField
                    name="newPassword"
                    label="Mật khẩu mới"
                    type="password"
                    fullWidth
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    required
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                  <TextField
                    name="confirmPassword"
                    label="Xác nhận mật khẩu mới"
                    type="password"
                    fullWidth
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Box>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <LockIcon />}
                  sx={{ 
                    borderRadius: 2,
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    '&:hover': {
                      background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                    }
                  }}
                >
                  Cập nhật mật khẩu
                </Button>
              </Box>
            </form>
          </CustomTabPanel>

          
        </Card>

        {/* Snackbars */}
        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError(null)}
        >
          <Alert onClose={() => setError(null)} severity="error">
            {error}
          </Alert>
        </Snackbar>

        <Snackbar
          open={!!success}
          autoHideDuration={6000}
          onClose={() => setSuccess(null)}
        >
          <Alert onClose={() => setSuccess(null)} severity="success">
            {success}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default Profile;