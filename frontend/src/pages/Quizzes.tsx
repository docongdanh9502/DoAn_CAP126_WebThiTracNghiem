import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  Fab,
  Avatar,
  LinearProgress,
  Alert,
  Snackbar,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Tooltip,
  Divider,
  Checkbox
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Quiz as QuizIcon,
  Timer as TimerIcon,
  QuestionAnswer as QuestionAnswerIcon,
  School as SchoolIcon,
  CheckCircle as CheckCircleIcon,
  FilterList as FilterListIcon,
  Search as SearchIcon,
  Sort as SortIcon,
  Visibility as VisibilityIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon
} from '@mui/icons-material';
import { quizAPI, questionAPI, quizResultAPI } from '../services/api';
import { Quiz, Question, QuizWithAssignment } from '../types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Quizzes: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<QuizWithAssignment[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizWithAssignment | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    timeLimit: 30,
    questions: [] as string[]
  });
  const [assignmentData, setAssignmentData] = useState({
    studentEmails: '',
    dueDate: '',
    dueTime: '23:59'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedQuizCompletionStatus, setSelectedQuizCompletionStatus] = useState<boolean>(false);
  const [assignmentCompletionStatus, setAssignmentCompletionStatus] = useState<Record<string, boolean>>(() => {
    // Load cached completion status from localStorage on init
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('assignment_completion_status');
        if (cached) {
          const parsed = JSON.parse(cached);
          // Only use cache if it's valid (less than 1 hour old)
          const cacheTime = localStorage.getItem('assignment_completion_status_time');
          if (cacheTime && Date.now() - parseInt(cacheTime) < 60 * 60 * 1000) {
            return parsed;
          }
        }
      } catch (error) {
        console.error('Error loading completion status cache:', error);
      }
    }
    return {};
  });

  const loadAvailableQuestions = useCallback(async () => {
    try {
      // Only load if we don't have questions cached
      if (availableQuestions.length > 0) return;
      
      // Cache per user to avoid leaking data across accounts
      const cacheKey = `availableQuestions_${(user as any)?._id || (user as any)?.id || 'anon'}`;
      const cachedQuestions = localStorage.getItem(cacheKey);
      if (cachedQuestions) {
        try {
          const parsed = JSON.parse(cachedQuestions);
          if (parsed && parsed.length > 0) {
            setAvailableQuestions(parsed);
            return;
          }
        } catch (e) {
          // Invalid cache, continue to fetch
        }
      }
      
      const response = await questionAPI.getQuestions();
      const questions = response.data.data.questions;
      setAvailableQuestions(questions);
      
      // Cache questions
      localStorage.setItem(cacheKey, JSON.stringify(questions));
    } catch (error) {
      console.error('Error loading questions:', error);
    }
  }, [availableQuestions.length, user]);

  const checkSelectedQuizCompletion = useCallback(async (quizId: string, assignmentId?: string) => {
    if (user?.role !== 'student') {
      setSelectedQuizCompletionStatus(false);
      return;
    }
    
    try {
      const response = await quizResultAPI.checkQuizCompletion(quizId, assignmentId);
      const completed = response.data.success && response.data.data.completed;
      console.log(`Checking completion for quiz ${quizId}, assignment ${assignmentId}:`, {
        response: response.data,
        completed,
        quizId,
        assignmentId
      });
      setSelectedQuizCompletionStatus(completed);
      console.log(`Set completion status to ${completed} for quiz ${quizId}, assignment ${assignmentId}`);
    } catch (error) {
      console.error(`Error checking completion for selected quiz ${quizId}, assignment ${assignmentId}:`, error);
      setSelectedQuizCompletionStatus(false);
    }
  }, [user?.role]);


  const fetchQuizzes = useCallback(async () => {
    if (loading) return; // Prevent multiple calls
    setLoading(true);
    
    // Add rate limiting protection - but allow if no data exists
    const now = Date.now();
    const lastCall = localStorage.getItem('lastApiCall');
    const hasQuizzes = quizzes.length > 0;
    
    if (lastCall && now - parseInt(lastCall) < 3000 && hasQuizzes) {
      console.log('Rate limiting: using cached data');
      setLoading(false);
      return; // Wait at least 3 seconds between calls if data exists
    }
    localStorage.setItem('lastApiCall', now.toString());
    try {
      if (user?.role === 'student') {
        // Sinh viên chỉ thấy bài được giao
        const response = await quizAPI.getAssignedQuizzes({
          page: page + 1,
          limit: rowsPerPage,
          search: searchTerm
        });
        console.log('Student assigned quizzes response:', response.data);
        const assignmentData = response.data.data.assignments || [];
        const quizzesWithAssignment = assignmentData
          .filter((assignment: any) => assignment && assignment.quizId)
          .map((assignment: any) => ({
            ...assignment.quizId,
            assignmentInfo: {
              dueDate: assignment.dueDate,
              assignedAt: assignment.createdAt,
              assignmentId: assignment._id
            }
          }));
        console.log('Mapped quizzes with assignment info for student:', quizzesWithAssignment);
        setQuizzes(quizzesWithAssignment);
        
        // Check completion status for all assignments (async in background, non-blocking)
        // Start checking in background immediately - don't wait for results
        quizzesWithAssignment
          .filter((quiz: QuizWithAssignment) => quiz.assignmentInfo?.assignmentId)
          .forEach((quiz: QuizWithAssignment, index: number) => {
            const key = `${quiz._id}_${quiz.assignmentInfo!.assignmentId}`;
            
            // Skip if we already have status cached
            if (assignmentCompletionStatus[key] !== undefined) {
              return;
            }
            
            // Start checking with staggered delay (non-blocking)
            setTimeout(async () => {
              try {
                const response = await quizResultAPI.checkQuizCompletion(quiz._id, quiz.assignmentInfo!.assignmentId);
                const completed = response.data.success && response.data.data.completed;
                // Update status immediately when check completes
                setAssignmentCompletionStatus(prev => {
                  const updated = {
                    ...prev,
                    [key]: completed
                  };
                  // Cache to localStorage for instant load on next reload
                  try {
                    localStorage.setItem('assignment_completion_status', JSON.stringify(updated));
                    localStorage.setItem('assignment_completion_status_time', Date.now().toString());
                  } catch (err) {
                    console.error('Error caching completion status:', err);
                  }
                  return updated;
                });
              } catch (error) {
                console.error(`Error checking completion for quiz ${quiz._id}, assignment ${quiz.assignmentInfo!.assignmentId}:`, error);
                // Set to false on error (assume not completed)
                setAssignmentCompletionStatus(prev => {
                  const updated = {
                    ...prev,
                    [key]: false
                  };
                  // Cache to localStorage
                  try {
                    localStorage.setItem('assignment_completion_status', JSON.stringify(updated));
                    localStorage.setItem('assignment_completion_status_time', Date.now().toString());
                  } catch (err) {
                    console.error('Error caching completion status:', err);
                  }
                  return updated;
                });
              }
            }, index * 400); // Stagger: 0ms, 400ms, 800ms, etc.
          });
      } else {
        // Giáo viên thấy tất cả bài thi của mình
        const response = await quizAPI.getQuizzes({
          page: page + 1,
          limit: rowsPerPage,
          search: searchTerm
        });
        console.log('Teacher quizzes response:', response.data);
        setQuizzes(response.data.data.quizzes || []);
      }
    } catch (error: any) {
      console.error('Error fetching quizzes:', error);
      if (error.response?.status === 429) {
        setError('Quá nhiều yêu cầu. Vui lòng thử lại sau 10 giây.');
        // Wait 10 seconds before allowing next call
        setTimeout(() => {
          localStorage.removeItem('lastApiCall');
        }, 10000);
      } else if (error.response?.status === 500) {
        setError('Lỗi server. Vui lòng kiểm tra backend.');
      } else {
        setError('Không thể tải danh sách bài thi');
      }
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchTerm, user?.role, loading, quizzes.length, assignmentCompletionStatus]);

  useEffect(() => {
    fetchQuizzes();
    // Clear any stale cached questions when switching accounts
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('availableQuestions_'));
      keys.forEach(k => localStorage.removeItem(k));
    } catch {}
    setAvailableQuestions([]);
    loadAvailableQuestions();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh completion status when returning from quiz taking (optimized)
  useEffect(() => {
    if (user?.role === 'student' && quizzes.length > 0) {
      // Start checking immediately in background - no debounce for better UX
      quizzes
        .filter((quiz: QuizWithAssignment) => quiz.assignmentInfo?.assignmentId)
        .forEach((quiz: QuizWithAssignment, index: number) => {
          const key = `${quiz._id}_${quiz.assignmentInfo!.assignmentId}`;
          
          // Skip if already checked
          if (assignmentCompletionStatus[key] !== undefined) {
            return;
          }
          
          // Check with staggered delay (non-blocking)
          setTimeout(async () => {
            try {
              const response = await quizResultAPI.checkQuizCompletion(quiz._id, quiz.assignmentInfo!.assignmentId);
              const completed = response.data.success && response.data.data.completed;
              // Update immediately when check completes
              setAssignmentCompletionStatus(prev => {
                const updated = {
                  ...prev,
                  [key]: completed
                };
                // Cache to localStorage for instant load on next reload
                try {
                  localStorage.setItem('assignment_completion_status', JSON.stringify(updated));
                  localStorage.setItem('assignment_completion_status_time', Date.now().toString());
                } catch (err) {
                  console.error('Error caching completion status:', err);
                }
                return updated;
              });
            } catch (error) {
              console.error(`Error refreshing completion for quiz ${quiz._id}, assignment ${quiz.assignmentInfo!.assignmentId}:`, error);
              // Assume not completed on error
              setAssignmentCompletionStatus(prev => {
                const updated = {
                  ...prev,
                  [key]: false
                };
                // Cache to localStorage
                try {
                  localStorage.setItem('assignment_completion_status', JSON.stringify(updated));
                  localStorage.setItem('assignment_completion_status_time', Date.now().toString());
                } catch (err) {
                  console.error('Error caching completion status:', err);
                }
                return updated;
              });
            }
          }, index * 400); // Stagger: 0ms, 400ms, 800ms, etc.
        });
    }
  }, [quizzes.length, user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  // Separate useEffect for search/filter changes with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== '' || filterSubject !== '') {
        fetchQuizzes();
      }
    }, 1000); // 1 second debounce to reduce API calls

    return () => clearTimeout(timeoutId);
  }, [searchTerm, filterSubject]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingQuiz) {
        await quizAPI.updateQuiz(editingQuiz._id, formData);
        setSuccess('Cập nhật bài thi thành công!');
      } else {
        await quizAPI.createQuiz(formData);
        setSuccess('Tạo bài thi thành công!');
      }
      setOpenDialog(false);
    setFormData({
      title: '',
      description: '',
        subject: '',
        timeLimit: 30,
        questions: []
      });
      setEditingQuiz(null);
      fetchQuizzes();
    } catch (error) {
      setError('Có lỗi xảy ra khi lưu bài thi');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEdit = (quiz: Quiz) => {
    setFormData({
      title: quiz.title,
      description: quiz.description,
      subject: quiz.subject,
      timeLimit: quiz.timeLimit,
      questions: quiz.questions || []
    });
    setEditingQuiz(quiz);
    setOpenDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa bài thi này?')) {
      try {
        await quizAPI.deleteQuiz(id);
        setSuccess('Xóa bài thi thành công!');
      fetchQuizzes();
    } catch (error) {
        setError('Có lỗi xảy ra khi xóa bài thi');
      }
    }
  };

  const handleViewDetails = async (quiz: QuizWithAssignment) => {
    console.log('Opening quiz details for:', quiz._id, quiz.title, 'assignment:', quiz.assignmentInfo?.assignmentId);
    setSelectedQuiz(quiz);
    setViewDialogOpen(true);
    // Reset completion status first
    setSelectedQuizCompletionStatus(false);
    console.log('Reset completion status to false for quiz:', quiz._id);
    // Wait for completion check to finish
    await checkSelectedQuizCompletion(quiz._id, quiz.assignmentInfo?.assignmentId);
  };

  const handleAssignQuiz = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setAssignmentData({
      studentEmails: '',
      dueDate: '',
      dueTime: '23:59'
    });
    setAssignDialogOpen(true);
  };

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuiz) return;

    try {
      const dueDateTime = new Date(`${assignmentData.dueDate}T${assignmentData.dueTime}`);
      
      // Parse emails from text input (split by newline)
      const emails = assignmentData.studentEmails
        .split('\n')
        .map(email => email.trim())
        .filter(email => email.length > 0);
      
      // Validate emails
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = emails.filter(email => !emailRegex.test(email));
      
      if (invalidEmails.length > 0) {
        setError(`Email không hợp lệ: ${invalidEmails.join(', ')}`);
        return;
      }
      
      if (emails.length === 0) {
        setError('Vui lòng nhập ít nhất một email sinh viên');
        return;
      }
      
      console.log('Submitting assignment:', {
        quizId: selectedQuiz._id,
        assignedTo: emails,
        dueDate: dueDateTime.toISOString()
      });
      
      await quizAPI.assignQuiz({
        quizId: selectedQuiz._id,
        assignedTo: emails,
        dueDate: dueDateTime.toISOString()
      });

      setSuccess('Giao bài thành công!');
      setAssignDialogOpen(false);
      setAssignmentData({
        studentEmails: '',
        dueDate: '',
        dueTime: '23:59'
      });
      } catch (error: any) {
      console.error('Error assigning quiz:', error);
      const errorMessage = error.response?.data?.message || 'Không thể giao bài';
      setError(errorMessage);
    }
  };


  const getEffectiveStatus = (quiz: QuizWithAssignment, role?: string): { label: string; color: 'default' | 'error' | 'success' } => {
    // If student and there's a due date, mark expired when past due
    if (role === 'student' && quiz.assignmentInfo?.dueDate) {
      const expired = Date.now() > new Date(quiz.assignmentInfo.dueDate).getTime();
      if (expired) {
        return { label: 'Hết hạn', color: 'error' };
      }
    }
    return {
      label: quiz.isActive ? 'Hoạt động' : 'Tạm dừng',
      color: quiz.isActive ? 'success' : 'default',
    };
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Dễ';
      case 'medium': return 'Trung bình';
      case 'hard': return 'Khó';
      default: return difficulty;
    }
  };

  const subjects = Array.from(new Set(quizzes.filter(q => q && q.subject).map(q => q.subject)));

  const getActiveCount = (): number => {
    if (user?.role === 'student') {
      const now = Date.now();
      return quizzes.filter(q => q && q.isActive && (!q.assignmentInfo?.dueDate || now <= new Date(q.assignmentInfo.dueDate).getTime())).length;
    }
    return quizzes.filter(q => q && q.isActive).length;
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" gutterBottom fontWeight="bold" sx={{ 
            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            {user?.role === 'student' ? 'Danh sách bài thi' : 'Quản lý bài thi'}
        </Typography>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {user?.role === 'student' ? 'Xem và làm các bài thi trắc nghiệm' : 'Tạo và quản lý các bài thi trắc nghiệm'}
          </Typography>
        </Box>

        {/* Stats Cards */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: 3, 
          mb: 4 
        }}>
          <Card sx={{ 
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <Box sx={{ position: 'absolute', top: 0, right: 0, opacity: 0.1 }}>
              <QuizIcon sx={{ fontSize: 100 }} />
            </Box>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 2 }}>
                  <QuizIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {quizzes.length}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Tổng bài thi
                  </Typography>
                </Box>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={75} 
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.2)', 
                  '& .MuiLinearProgress-bar': { bgcolor: 'white' }
                }} 
              />
            </CardContent>
          </Card>

          <Card sx={{ 
            background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <Box sx={{ position: 'absolute', top: 0, right: 0, opacity: 0.1 }}>
              <CheckCircleIcon sx={{ fontSize: 100 }} />
            </Box>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 2 }}>
                  <CheckCircleIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {getActiveCount()}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Đang hoạt động
        </Typography>
                </Box>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={85} 
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.2)', 
                  '& .MuiLinearProgress-bar': { bgcolor: 'white' }
                }} 
              />
            </CardContent>
          </Card>

          {/* Removed redundant student metrics per request */}
        </Box>

        {/* Search and Filter - chỉ hiển thị cho giáo viên */}
        {user?.role !== 'student' && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: 2 
            }}>
              <TextField
                fullWidth
                placeholder="Tìm kiếm bài thi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    fetchQuizzes();
                  }
                }}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
          <Button
                variant="outlined"
                onClick={() => {
                  // Clear rate limiting and force refresh
                  localStorage.removeItem('lastApiCall');
                  setQuizzes([]); // Clear current data
                  fetchQuizzes();
                  loadAvailableQuestions();
                }}
                sx={{ ml: 1, borderRadius: 2 }}
                disabled={loading}
              >
                {loading ? '⏳ Đang tải...' : '🔄 Làm mới'}
          </Button>
              <FormControl fullWidth>
                <InputLabel>Môn học</InputLabel>
                <Select
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  label="Môn học"
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="">Tất cả môn</MenuItem>
                  {subjects.map(subject => (
                    <MenuItem key={subject} value={subject}>{subject}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                startIcon={<FilterListIcon />}
                onClick={() => {/* Handle filter */}}
                sx={{ borderRadius: 2 }}
              >
                Bộ lọc
              </Button>
          <Button
                variant="outlined"
                startIcon={<SortIcon />}
                onClick={() => {/* Handle sort */}}
                sx={{ borderRadius: 2 }}
              >
                Sắp xếp
          </Button>
      </Box>
          </CardContent>
        </Card>
        )}

        {/* Quizzes Table */}
        <Card>
          <CardContent sx={{ p: 0 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>Bài thi</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Môn học</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Thời gian</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Số câu hỏi</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Trạng thái</TableCell>
                    {user?.role === 'student' && (
                      <TableCell sx={{ fontWeight: 'bold' }}>Hạn nộp</TableCell>
                    )}
                    {user?.role !== 'student' && (
                      <TableCell sx={{ fontWeight: 'bold' }}>Ngày tạo</TableCell>
                    )}
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Thao tác</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {quizzes.filter(quiz => quiz).map((quiz, index) => (
                    <TableRow key={`quiz-${quiz._id}-${index}`} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="h6" fontWeight="bold" sx={{ mb: 0.5 }}>
                  {quiz.title}
                </Typography>
                          <Typography variant="body2" color="text.secondary">
                  {quiz.description}
                </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                  <Chip 
                          label={quiz.subject} 
                    color="primary" 
                          variant="outlined"
                    size="small" 
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TimerIcon color="primary" />
                          <Typography variant="body2">
                            {quiz.timeLimit} phút
                          </Typography>
                </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <QuestionAnswerIcon color="secondary" />
                          <Typography variant="body2">
                            {quiz.questions?.length || 0} câu
                          </Typography>
                </Box>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const s = getEffectiveStatus(quiz, user?.role);
                          return (
                <Chip
                              label={s.label}
                              color={s.color}
                              variant="outlined"
                  size="small"
                />
                          );
                        })()}
                      </TableCell>
                      {user?.role === 'student' && (
                        <TableCell>
                          {quiz.assignmentInfo?.dueDate ? (
                            <Typography 
                              variant="body2" 
                              color="text.primary"
                              fontWeight="medium"
                            >
                              {new Date(quiz.assignmentInfo.dueDate).toLocaleString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Chưa có hạn nộp
                            </Typography>
                          )}
                        </TableCell>
                      )}
                      {user?.role !== 'student' && (
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(quiz.createdAt).toLocaleDateString('vi-VN')}
                          </Typography>
                        </TableCell>
                      )}
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          <Tooltip title="Xem chi tiết">
                            <IconButton 
                              size="small" 
                              color="info"
                              onClick={() => handleViewDetails(quiz)}
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                          {user?.role !== 'student' && (
                            <>
                              <Tooltip title="Giao bài">
                                <IconButton 
                                  size="small" 
                                  color="secondary"
                                  onClick={() => handleAssignQuiz(quiz)}
                                >
                                  <SchoolIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Chỉnh sửa">
                                <IconButton 
                                  size="small" 
                                  color="primary"
                                  onClick={() => handleEdit(quiz)}
                                >
                      <EditIcon />
                    </IconButton>
                              </Tooltip>
                              <Tooltip title="Xóa">
                                <IconButton 
                                  size="small" 
                                  color="error"
                                  onClick={() => handleDelete(quiz._id)}
                                >
                      <DeleteIcon />
                    </IconButton>
                              </Tooltip>
                            </>
                          )}
                          {user?.role === 'student' && (() => {
                            const expired = !!quiz.assignmentInfo?.dueDate && (Date.now() > new Date(quiz.assignmentInfo.dueDate).getTime());
                            const completionKey = quiz.assignmentInfo?.assignmentId 
                              ? `${quiz._id}_${quiz.assignmentInfo.assignmentId}`
                              : quiz._id;
                            // Optimistic UI: Show button as enabled by default, only disable if we KNOW it's completed
                            // undefined = chưa check (cho phép click) | true = đã completed (disable) | false = chưa completed (enable)
                            const completed = assignmentCompletionStatus[completionKey];
                            const isKnownCompleted = completed === true; // Only disable if we're SURE it's completed
                            
                            const handleStart = () => {
                              if (expired) {
                                setError('Bài thi đã hết hạn nộp. Bạn không thể bắt đầu.');
                                return;
                              }
                              if (isKnownCompleted) {
                                setError('Bạn đã hoàn thành bài thi này rồi!');
                                return;
                              }
                              const url = quiz.assignmentInfo?.assignmentId
                                ? `/quiz/${quiz._id}/${quiz.assignmentInfo.assignmentId}`
                                : `/quiz/${quiz._id}`;
                              navigate(url);
                            };
                            
                            let tooltipTitle = 'Bắt đầu thi';
                            if (expired) tooltipTitle = 'Đã hết hạn';
                            else if (isKnownCompleted) tooltipTitle = 'Đã hoàn thành';
                            
                            return (
                              <Tooltip title={tooltipTitle}>
                                <span>
                                  <IconButton 
                                    size="small" 
                                    color={isKnownCompleted ? "default" : "success"}
                                    onClick={handleStart}
                                    disabled={expired || isKnownCompleted}
                                  >
                                    <PlayArrowIcon />
                    </IconButton>
                                </span>
                              </Tooltip>
                            );
                          })()}
                  </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={quizzes.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
            />
          </CardContent>
            </Card>

        {/* Create Quiz Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ 
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            color: 'white',
            display: 'flex',
            alignItems: 'center'
          }}>
            <QuizIcon sx={{ mr: 1 }} />
            {editingQuiz ? 'Chỉnh sửa bài thi' : 'Tạo bài thi mới'}
        </DialogTitle>
          <form onSubmit={handleSubmit}>
            <DialogContent sx={{ pt: 3 }}>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr', 
                gap: 3 
              }}>
          <TextField
                  name="title"
                  label="Tiêu đề bài thi"
            fullWidth
            value={formData.title}
                  onChange={handleChange}
                  required
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <TextField
                  name="description"
            label="Mô tả"
            fullWidth
            multiline
            rows={3}
            value={formData.description}
                  onChange={handleChange}
                  required
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: 2 
                }}>
          <TextField
                    name="subject"
                    label="Môn học"
            fullWidth
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    placeholder="Ví dụ: Toán học, Vật lý, Lập trình..."
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <TextField
                    name="timeLimit"
            label="Thời gian (phút)"
            type="number"
            fullWidth
            value={formData.timeLimit}
                    onChange={handleChange}
                    required
                    inputProps={{ min: 1, max: 300 }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Box>
                
                {/* Chọn câu hỏi */}
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <QuizIcon sx={{ mr: 1, color: 'primary.main' }} />
                    Chọn câu hỏi cho bài thi
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Chọn các câu hỏi từ danh sách có sẵn để tạo bài thi
                  </Typography>
                  
                  {/* Danh sách câu hỏi có sẵn */}
                  <Box sx={{ 
                    border: '1px solid', 
                    borderColor: 'divider', 
                    borderRadius: 2, 
                    p: 2, 
                    maxHeight: 300, 
                    overflow: 'auto',
                    bgcolor: 'grey.50'
                  }}>
                    {availableQuestions.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <QuizIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                          Chưa có câu hỏi nào
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Hãy tạo câu hỏi trước khi tạo bài thi
                        </Typography>
                        <Button 
                          variant="contained" 
                          startIcon={<AddIcon />}
                          onClick={() => {
                            setOpenDialog(false);
                            navigate('/questions');
                          }}
                          sx={{ borderRadius: 2 }}
                        >
                          Tạo câu hỏi
                        </Button>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {availableQuestions.filter(q => q).map((question) => (
                          <Box 
                            key={question._id}
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              p: 2, 
                              border: '1px solid', 
                              borderColor: formData.questions.includes(question._id) ? 'primary.main' : 'divider',
                              borderRadius: 2,
                              bgcolor: formData.questions.includes(question._id) ? 'primary.light' : 'white',
                              cursor: 'pointer',
                              '&:hover': {
                                borderColor: 'primary.main',
                                bgcolor: 'primary.light'
                              }
                            }}
                            onClick={() => {
                              const newQuestions = formData.questions.includes(question._id)
                                ? formData.questions.filter(id => id !== question._id)
                                : [...formData.questions, question._id];
                              setFormData({ ...formData, questions: newQuestions });
                            }}
                          >
                            <Checkbox 
                              checked={formData.questions.includes(question._id)}
                              color="primary"
                              sx={{ mr: 2 }}
                            />
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography variant="body1" fontWeight="medium">
                                {question.text}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                <Chip 
                                  label={question.subject} 
                                  size="small" 
                                  color="primary" 
                                  variant="outlined"
                                />
                                <Chip 
                                  label={question.difficulty === 'easy' ? 'Dễ' : question.difficulty === 'medium' ? 'Trung bình' : 'Khó'} 
                                  size="small" 
                                  color={question.difficulty === 'easy' ? 'success' : question.difficulty === 'medium' ? 'warning' : 'error'}
                                  variant="outlined"
                                />
                              </Box>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                  
                  {formData.questions.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="primary" sx={{ display: 'flex', alignItems: 'center' }}>
                        <CheckCircleIcon sx={{ mr: 1, fontSize: 16 }} />
                        Đã chọn {formData.questions.length} câu hỏi
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
              <Button onClick={() => setOpenDialog(false)} sx={{ borderRadius: 2 }}>
                Hủy
              </Button>
              <Button 
                type="submit" 
                variant="contained"
                sx={{ 
                  borderRadius: 2,
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  '&:hover': {
                    background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                  }
                }}
              >
                {editingQuiz ? 'Cập nhật' : 'Tạo mới'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Floating Action Button - chỉ hiển thị cho giáo viên */}
        {user?.role !== 'student' && (
          <Fab
            color="primary"
            aria-label="Tạo bài thi mới"
            onClick={() => setOpenDialog(true)}
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              '&:hover': {
                background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
              }
            }}
          >
            <AddIcon />
          </Fab>
        )}

        {/* View Details Dialog */}
        <Dialog 
          open={viewDialogOpen} 
          onClose={() => {
            setViewDialogOpen(false);
            setSelectedQuizCompletionStatus(false);
            setSelectedQuiz(null);
          }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ 
            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <QuizIcon />
            Chi tiết bài thi
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            {selectedQuiz && (
              <Box>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h5" fontWeight="bold" sx={{ mb: 1 }}>
                    {selectedQuiz.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                    {selectedQuiz.description}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Chip 
                      label={selectedQuiz.subject} 
                      color="primary" 
                      variant="outlined"
                    />
                    <Chip 
                      label={`${selectedQuiz.timeLimit} phút`}
                      color="secondary"
                      variant="outlined"
                      icon={<TimerIcon />}
                    />
                    <Chip 
                      label={`${selectedQuiz.questions?.length || 0} câu hỏi`}
                      color="info"
                      variant="outlined"
                      icon={<QuestionAnswerIcon />}
                    />
                    {(() => {
                      const s = getEffectiveStatus(selectedQuiz as QuizWithAssignment, user?.role);
                      return (
                        <Chip 
                          label={s.label}
                          color={s.color}
                          variant="outlined"
                        />
                      );
                    })()}
                    {user?.role === 'student' && (selectedQuiz as QuizWithAssignment)?.assignmentInfo?.dueDate && (
                      <Chip 
                        label={`Hạn: ${new Date((selectedQuiz as QuizWithAssignment).assignmentInfo!.dueDate).toLocaleString('vi-VN', {
                          hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
                        })}`}
                        color="warning"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                {user?.role !== 'student' ? (
                  <>
                    <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                      Danh sách câu hỏi
                    </Typography>
                    {(selectedQuiz.questions?.length || 0) > 0 ? (
                      <Box>
                        {(selectedQuiz.questions || []).filter(id => id).map((questionId, index) => {
                          const question = availableQuestions.find(q => q._id === questionId);
                          return (
                            <Card key={questionId} sx={{ mb: 2, p: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                <Box sx={{ 
                                  minWidth: 32, 
                                  height: 32, 
                                  borderRadius: '50%', 
                                  background: theme.palette.primary.main,
                                  color: 'white',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 'bold'
                                }}>
                                  {index + 1}
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body1" sx={{ mb: 1 }}>
                                    {question?.text || 'Câu hỏi không tìm thấy'}
                                  </Typography>
                                  {question && (
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                      <Chip 
                                        label={question.subject} 
                                        size="small" 
                                        variant="outlined"
                                      />
                                      <Chip 
                                        label={getDifficultyLabel(question.difficulty)} 
                                        size="small" 
                                        color="secondary"
            variant="outlined"
                                      />
                                    </Box>
                                  )}
                                </Box>
                              </Box>
                            </Card>
                          );
                        })}
                      </Box>
                    ) : (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <QuestionAnswerIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="body1" color="text.secondary">
                          Chưa có câu hỏi nào
                        </Typography>
                      </Box>
                    )}
                  </>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    {(() => {
                      const effectiveStatus = getEffectiveStatus(selectedQuiz, user?.role);
                      const completed = selectedQuizCompletionStatus;
                      
                      // Priority: Expired > Completed > Ready
                      if (effectiveStatus.label === 'Hết hạn') {
                        return (
                          <>
                            <StopIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
                            <Typography variant="h6" color="error.main" fontWeight="bold" sx={{ mb: 1 }}>
                              Bài thi đã hết hạn
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                              Hạn nộp: {new Date(selectedQuiz.assignmentInfo?.dueDate || '').toLocaleString('vi-VN')}
                            </Typography>
                            <Button
                              variant="outlined"
                              size="large"
                              disabled
                              sx={{ borderRadius: 2 }}
                            >
                              Đã hết hạn
                            </Button>
                          </>
                        );
                      } else if (completed) {
                        return (
                          <>
                            <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                            <Typography variant="h6" color="success.main" fontWeight="bold" sx={{ mb: 1 }}>
                              Đã hoàn thành bài thi
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                              Bạn đã hoàn thành bài thi này rồi. Không thể làm lại.
                            </Typography>
                            <Button
                              variant="outlined"
                              size="large"
                              disabled
                              sx={{ borderRadius: 2 }}
                            >
                              Đã hoàn thành
                            </Button>
                          </>
                        );
                      } else {
                        return (
                          <>
                            <QuestionAnswerIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                            <Typography variant="h6" color="primary" fontWeight="bold" sx={{ mb: 1 }}>
                              Bài thi đã sẵn sàng
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                              Bài thi có {selectedQuiz.questions?.length || 0} câu hỏi, thời gian làm bài {selectedQuiz.timeLimit} phút
                            </Typography>
                            <Button
                              variant="contained"
                              size="large"
                              startIcon={<PlayArrowIcon />}
                              onClick={() => {
                                const url = selectedQuiz.assignmentInfo?.assignmentId
                                  ? `/quiz/${selectedQuiz._id}/${selectedQuiz.assignmentInfo.assignmentId}`
                                  : `/quiz/${selectedQuiz._id}`;
                                navigate(url);
                                setViewDialogOpen(false);
                                setSelectedQuizCompletionStatus(false);
                                setSelectedQuiz(null);
                              }}
                              sx={{ 
                                borderRadius: 2,
                                background: `linear-gradient(45deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
                                '&:hover': {
                                  background: `linear-gradient(45deg, ${theme.palette.success.dark}, ${theme.palette.success.main})`,
                                }
                              }}
                            >
                              Bắt đầu làm bài
                            </Button>
                          </>
                        );
                      }
                    })()}
                  </Box>
                )}
              </Box>
            )}
        </DialogContent>
        <DialogActions>
            <Button onClick={() => {
              setViewDialogOpen(false);
              setSelectedQuizCompletionStatus(false);
              setSelectedQuiz(null);
            }}>
              Đóng
          </Button>
        </DialogActions>
      </Dialog>

        {/* Assignment Dialog */}
        <Dialog 
          open={assignDialogOpen} 
          onClose={() => setAssignDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ 
            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <SchoolIcon />
            Giao bài cho sinh viên
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            {selectedQuiz && (
              <form onSubmit={handleSubmitAssignment}>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                    {selectedQuiz.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {selectedQuiz.description}
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                    Giao bài cho sinh viên
                  </Typography>
                  
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    label="Email sinh viên"
                    placeholder="Nhập email sinh viên, mỗi email một dòng&#10;Ví dụ:&#10;student1@email.com&#10;student2@email.com&#10;student3@email.com"
                    value={assignmentData.studentEmails}
                    onChange={(e) => setAssignmentData(prev => ({
                      ...prev,
                      studentEmails: e.target.value
                    }))}
                    sx={{ borderRadius: 2 }}
                    helperText="Nhập email sinh viên, mỗi email một dòng"
                  />

                  {/* Email count */}
                  {assignmentData.studentEmails && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                      <Typography variant="body2" color="primary" fontWeight="bold">
                        ✅ Sẽ giao cho {assignmentData.studentEmails.split('\n').filter(email => email.trim().length > 0).length} sinh viên
                      </Typography>
                    </Box>
                  )}
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                    Thời hạn nộp bài
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Ngày hạn nộp"
                      value={assignmentData.dueDate}
                      onChange={(e) => setAssignmentData(prev => ({
                        ...prev,
                        dueDate: e.target.value
                      }))}
                      InputLabelProps={{ shrink: true }}
                      sx={{ borderRadius: 2 }}
                    />
                    <TextField
                      fullWidth
                      type="time"
                      label="Giờ hạn nộp"
                      value={assignmentData.dueTime}
                      onChange={(e) => setAssignmentData(prev => ({
                        ...prev,
                        dueTime: e.target.value
                      }))}
                      InputLabelProps={{ shrink: true }}
                      sx={{ borderRadius: 2 }}
                    />
                  </Box>
                </Box>

                <DialogActions>
                  <Button onClick={() => setAssignDialogOpen(false)}>
                    Hủy
                  </Button>
                  <Button 
                    type="submit" 
                    variant="contained"
                    disabled={!assignmentData.studentEmails.trim() || !assignmentData.dueDate}
                    sx={{ 
                      borderRadius: 2,
                      background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                      '&:hover': {
                        background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                      }
                    }}
                  >
                    Giao bài
                  </Button>
                </DialogActions>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Snackbars */}
        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError('')}
        >
          <Alert onClose={() => setError('')} severity="error">
            {error}
          </Alert>
        </Snackbar>

        <Snackbar
          open={!!success}
          autoHideDuration={6000}
          onClose={() => setSuccess('')}
        >
          <Alert onClose={() => setSuccess('')} severity="success">
            {success}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default Quizzes;