import React, { useEffect, useState, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  TablePagination,
  Stack,
  Switch,
  FormControlLabel,
  useTheme
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Search as SearchIcon,
  People as PeopleIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { userAPI } from '../services/api';

interface User {
  _id: string;
  email: string;
  username: string;
  role: 'admin' | 'teacher' | 'student';
  fullName?: string;
  studentId?: string;
  class?: string;
  gender?: 'male' | 'female' | 'other';
  isActive: boolean;
  createdAt: string;
}

const Users: React.FC = () => {
  const { user: currentUser } = useAuth();
  const theme = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<boolean | null>(null);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    role: 'student' as 'admin' | 'teacher' | 'student',
    fullName: '',
    studentId: '',
    class: '',
    gender: '' as 'male' | 'female' | 'other' | '',
    isActive: true
  });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await userAPI.getUsers({
        page: page + 1,
        limit: rowsPerPage,
        search: searchTerm,
        role: roleFilter || undefined,
        isActive: activeFilter !== null ? activeFilter : undefined
      });
      const fetchedUsers = (response.data.data as any).users || [];
      // Ensure admin users are always at the top
      const sortedUsers = [...fetchedUsers].sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (a.role !== 'admin' && b.role === 'admin') return 1;
        return 0;
      });
      setUsers(sortedUsers);
      setTotal((response.data.data as any).pagination?.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchTerm, roleFilter, activeFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        username: user.username,
        password: '',
        role: user.role,
        fullName: user.fullName || '',
        studentId: user.studentId || '',
        class: user.class || '',
        gender: user.gender || '',
        isActive: user.isActive
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        username: '',
        password: '',
        role: 'student',
        fullName: '',
        studentId: '',
        class: '',
        gender: '',
        isActive: true
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingUser(null);
    setFormData({
      email: '',
      username: '',
      password: '',
      role: 'student',
      fullName: '',
      studentId: '',
      class: '',
      gender: '',
      isActive: true
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      if (editingUser) {
        // Update user
        const updateData: any = {
          profile: {
            email: formData.email,
            username: formData.username,
            role: formData.role,
            fullName: formData.fullName,
            studentId: formData.studentId,
            class: formData.class,
            gender: formData.gender || undefined
          },
          isActive: formData.isActive
        };
        
        if (formData.password) {
          updateData.profile.password = formData.password;
        }
        
        await userAPI.updateUser(editingUser._id, updateData);
        setSuccess('Cập nhật người dùng thành công');
      } else {
        // Create user
        if (!formData.password) {
          setError('Vui lòng nhập mật khẩu cho tài khoản mới');
          return;
        }
        
        await userAPI.createUser({
          email: formData.email,
          username: formData.username,
          password: formData.password,
          role: formData.role,
          fullName: formData.fullName || undefined,
          studentId: formData.studentId || undefined,
          class: formData.class || undefined,
          gender: formData.gender || undefined,
          isActive: formData.isActive
        });
        setSuccess('Tạo người dùng thành công');
      }
      
      handleCloseDialog();
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    
    try {
      setLoading(true);
      setError(null);
      await userAPI.deleteUser(userToDelete._id);
      setSuccess('Xóa người dùng thành công');
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể xóa người dùng');
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'error';
      case 'teacher': return 'primary';
      case 'student': return 'success';
      default: return 'default';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Quản trị viên';
      case 'teacher': return 'Giáo viên';
      case 'student': return 'Sinh viên';
      default: return role;
    }
  };

  const getGenderLabel = (gender?: string) => {
    switch (gender) {
      case 'male': return 'Nam';
      case 'female': return 'Nữ';
      case 'other': return 'Khác';
      default: return '';
    }
  };

  const formatDateVN = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh'
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  const handleViewDetail = (user: User) => {
    setViewingUser(user);
    setDetailDialogOpen(true);
  };

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'grey.50' }}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h3" gutterBottom fontWeight="bold" sx={{ 
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Quản lý người dùng
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Quản lý tài khoản người dùng hệ thống
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              '&:hover': {
                background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
              }
            }}
          >
            Tạo người dùng
          </Button>
        </Box>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                size="small"
                placeholder="Tìm kiếm (email, username, tên, MSSV)..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                sx={{ flex: 1 }}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Vai trò</InputLabel>
                <Select
                  value={roleFilter}
                  label="Vai trò"
                  onChange={(e) => { setRoleFilter(e.target.value); setPage(0); }}
                >
                  <MenuItem value="">Tất cả</MenuItem>
                  <MenuItem value="admin">Quản trị viên</MenuItem>
                  <MenuItem value="teacher">Giáo viên</MenuItem>
                  <MenuItem value="student">Sinh viên</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Trạng thái</InputLabel>
                <Select
                  value={activeFilter === null ? '' : activeFilter ? 'active' : 'inactive'}
                  label="Trạng thái"
                  onChange={(e) => {
                    const value = e.target.value as string;
                    if (value === '') {
                      setActiveFilter(null);
                    } else {
                      setActiveFilter(value === 'active');
                    }
                    setPage(0);
                  }}
                >
                  <MenuItem value="">Tất cả</MenuItem>
                  <MenuItem value="active">Đang hoạt động</MenuItem>
                  <MenuItem value="inactive">Đã khóa</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </CardContent>
        </Card>

        {/* Error/Success Messages */}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Users Table */}
        <Card>
          <CardContent>
            {loading && users.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Email</TableCell>
                      <TableCell>Username</TableCell>
                      <TableCell>Họ tên</TableCell>
                      <TableCell>Vai trò</TableCell>
                      <TableCell>MSSV</TableCell>
                      <TableCell>Lớp</TableCell>
                      <TableCell>Giới tính</TableCell>
                      <TableCell>Trạng thái</TableCell>
                      <TableCell>Ngày tạo</TableCell>
                      <TableCell align="right">Thao tác</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                          <PeopleIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                          <Typography color="text.secondary">
                            Không tìm thấy người dùng nào
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user._id} hover>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.username}</TableCell>
                          <TableCell>{user.fullName || '-'}</TableCell>
                          <TableCell>
                            <Chip 
                              label={getRoleLabel(user.role)} 
                              size="small" 
                              color={getRoleColor(user.role) as any}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>{user.studentId || '-'}</TableCell>
                          <TableCell>{user.class || '-'}</TableCell>
                          <TableCell>{getGenderLabel(user.gender)}</TableCell>
                          <TableCell>
                            <Chip
                              label={user.isActive ? 'Hoạt động' : 'Đã khóa'}
                              size="small"
                              color={user.isActive ? 'success' : 'default'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>{user.createdAt ? formatDateVN(user.createdAt) : '-'}</TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetail(user)}
                              color="info"
                              title="Xem chi tiết"
                            >
                              <VisibilityIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog(user)}
                              color="primary"
                              title="Chỉnh sửa"
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteClick(user)}
                              color="error"
                              disabled={user._id === currentUser?._id || user.role === 'admin'}
                              title="Xóa"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <TablePagination
                  component="div"
                  count={total}
                  page={page}
                  onPageChange={(e, newPage) => setPage(newPage)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                  }}
                  rowsPerPageOptions={[5, 10, 20, 50]}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingUser ? 'Chỉnh sửa người dùng' : 'Tạo người dùng mới'}
          </DialogTitle>
          <form onSubmit={handleSubmit}>
            <DialogContent>
              <Stack spacing={2} sx={{ pt: 2 }}>
                <TextField
                  label="Email *"
                  type="email"
                  fullWidth
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <TextField
                  label="Username *"
                  fullWidth
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
                <TextField
                  label={editingUser ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu *'}
                  type="password"
                  fullWidth
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <FormControl fullWidth>
                  <InputLabel>Vai trò *</InputLabel>
                  <Select
                    value={formData.role}
                    label="Vai trò *"
                    required
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  >
                    <MenuItem value="admin">Quản trị viên</MenuItem>
                    <MenuItem value="teacher">Giáo viên</MenuItem>
                    <MenuItem value="student">Sinh viên</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="Họ tên"
                  fullWidth
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
                {formData.role === 'student' && (
                  <>
                    <TextField
                      label="MSSV"
                      fullWidth
                      value={formData.studentId}
                      onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    />
                    <TextField
                      label="Lớp"
                      fullWidth
                      value={formData.class}
                      onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                    />
                  </>
                )}
                <FormControl fullWidth>
                  <InputLabel>Giới tính</InputLabel>
                  <Select
                    value={formData.gender}
                    label="Giới tính"
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                  >
                    <MenuItem value="">Không chọn</MenuItem>
                    <MenuItem value="male">Nam</MenuItem>
                    <MenuItem value="female">Nữ</MenuItem>
                    <MenuItem value="other">Khác</MenuItem>
                  </Select>
                </FormControl>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                  }
                  label="Tài khoản đang hoạt động"
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Hủy</Button>
              <Button type="submit" variant="contained" disabled={loading}>
                {editingUser ? 'Cập nhật' : 'Tạo mới'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Xác nhận xóa</DialogTitle>
          <DialogContent>
            <Typography>
              Bạn có chắc chắn muốn xóa người dùng <strong>{userToDelete?.email}</strong>?
            </Typography>
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              Hành động này không thể hoàn tác!
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={loading}>
              Xóa
            </Button>
          </DialogActions>
        </Dialog>

        {/* Detail Dialog */}
        <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Chi tiết tài khoản</DialogTitle>
          <DialogContent>
            {viewingUser && (
              <Stack spacing={2} sx={{ pt: 2 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Email</Typography>
                    <Typography variant="body1" fontWeight="medium">{viewingUser.email}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Username</Typography>
                    <Typography variant="body1" fontWeight="medium">{viewingUser.username}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Họ tên</Typography>
                    <Typography variant="body1" fontWeight="medium">{viewingUser.fullName || '-'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Vai trò</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip 
                        label={getRoleLabel(viewingUser.role)} 
                        size="small" 
                        color={getRoleColor(viewingUser.role) as any}
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                  {viewingUser.studentId && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">MSSV</Typography>
                      <Typography variant="body1" fontWeight="medium">{viewingUser.studentId}</Typography>
                    </Box>
                  )}
                  {viewingUser.class && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">Lớp</Typography>
                      <Typography variant="body1" fontWeight="medium">{viewingUser.class}</Typography>
                    </Box>
                  )}
                  {viewingUser.gender && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">Giới tính</Typography>
                      <Typography variant="body1" fontWeight="medium">{getGenderLabel(viewingUser.gender)}</Typography>
                    </Box>
                  )}
                  <Box>
                    <Typography variant="caption" color="text.secondary">Trạng thái</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip
                        label={viewingUser.isActive ? 'Hoạt động' : 'Đã khóa'}
                        size="small"
                        color={viewingUser.isActive ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Ngày tạo</Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {viewingUser.createdAt ? formatDateVN(viewingUser.createdAt) : '-'}
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailDialogOpen(false)}>Đóng</Button>
            {viewingUser && (
              <Button 
                variant="contained" 
                onClick={() => {
                  setDetailDialogOpen(false);
                  handleOpenDialog(viewingUser);
                }}
                startIcon={<EditIcon />}
              >
                Chỉnh sửa
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Snackbar for success */}
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

export default Users;

