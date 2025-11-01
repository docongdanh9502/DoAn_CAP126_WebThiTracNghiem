import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  CircularProgress,
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
  Visibility as VisibilityIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  UploadFile as UploadFileIcon,
  FileDownload as FileDownloadIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { quizAPI, questionAPI, quizResultAPI, importAPI } from '../services/api';
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
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [questionViewDialogOpen, setQuestionViewDialogOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizWithAssignment | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [quizAssignments, setQuizAssignments] = useState<any[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [expandedAssignments, setExpandedAssignments] = useState<Record<number, boolean>>({});
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
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
  const [questionSearchTerm, setQuestionSearchTerm] = useState('');
  const [questionFilterSubject, setQuestionFilterSubject] = useState('');
  const [questionFilterDifficulty, setQuestionFilterDifficulty] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
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
      setSelectedQuizCompletionStatus(completed);
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
        const assignmentData = response.data.data.assignments || [];
        const pagination = response.data.data.pagination;
        setTotal(pagination?.total || 0);
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
        const pagination = response.data.data.pagination;
        setTotal(pagination?.total || response.data.data.quizzes?.length || 0);
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
    setQuestionSearchTerm('');
    setQuestionFilterSubject('');
    setQuestionFilterDifficulty('');
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
    setSelectedQuiz(quiz);
    setViewDialogOpen(true);
    // Reset completion status first
    setSelectedQuizCompletionStatus(false);
    // Wait for completion check to finish
    await checkSelectedQuizCompletion(quiz._id, quiz.assignmentInfo?.assignmentId);
    
    // Load assignments for this quiz if teacher
    if (user?.role === 'teacher') {
      setLoadingAssignments(true);
      setQuizAssignments([]); // Reset trước
      try {
        const response = await quizAPI.getAssignments({ 
          page: 1, 
          limit: 100 
        });
        const allAssignments = response.data.data.assignments || [];
        // Filter assignments for this specific quiz
        const assignments = allAssignments.filter((assignment: any) => {
          if (!assignment || !assignment.quizId || !quiz?._id) return false;
          // Handle both cases: quizId as object or string
          const assignmentQuizId = assignment.quizId._id || assignment.quizId;
          const quizIdStr = String(assignmentQuizId);
          const currentQuizIdStr = String(quiz._id);
          return quizIdStr === currentQuizIdStr;
        });
        setQuizAssignments(assignments);
      } catch (error: any) {
        console.error('Error loading assignments:', error);
        setError('Không thể tải danh sách bài đã giao: ' + (error.message || 'Lỗi không xác định'));
      } finally {
        setLoadingAssignments(false);
      }
    }
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
      
      // Reload assignments if viewing quiz details
      if (selectedQuiz && user?.role === 'teacher' && viewDialogOpen) {
        try {
          const response = await quizAPI.getAssignments({ 
            page: 1, 
            limit: 100 
          });
          const assignments = (response.data.data.assignments || []).filter((assignment: any) => {
            if (!assignment || !assignment.quizId || !selectedQuiz?._id) return false;
            const assignmentQuizId = assignment.quizId._id || assignment.quizId;
            const quizIdStr = typeof assignmentQuizId === 'string' ? assignmentQuizId : String(assignmentQuizId);
            const currentQuizIdStr = String(selectedQuiz._id);
            return quizIdStr === currentQuizIdStr;
          });
          setQuizAssignments(assignments);
        } catch (error) {
          console.error('Error reloading assignments:', error);
        }
      }
      
      // Refresh quiz list
      fetchQuizzes();
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

  const getDifficultyColor = (difficulty: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (difficulty) {
      case 'easy': return 'success';
      case 'medium': return 'warning';
      case 'hard': return 'error';
      default: return 'default';
    }
  };

  const subjects = useMemo(() => 
    Array.from(new Set(quizzes.filter(q => q && q.subject).map(q => q.subject))),
    [quizzes]
  );

  // Memoize filtered questions for dialog
  const filteredQuestions = useMemo(() => {
    return availableQuestions.filter(q => {
      if (!q) return false;
      
      // Filter theo search term
      if (questionSearchTerm && !q.text.toLowerCase().includes(questionSearchTerm.toLowerCase())) {
        return false;
      }
      
      // Filter theo subject
      if (questionFilterSubject && q.subject !== questionFilterSubject) {
        return false;
      }
      
      // Filter theo difficulty
      if (questionFilterDifficulty && q.difficulty !== questionFilterDifficulty) {
        return false;
      }
      
      return true;
    });
  }, [availableQuestions, questionSearchTerm, questionFilterSubject, questionFilterDifficulty]);

  const getActiveCount = (): number => {
    if (user?.role === 'student') {
      const now = Date.now();
      return quizzes.filter(q => q && q.isActive && (!q.assignmentInfo?.dueDate || now <= new Date(q.assignmentInfo.dueDate).getTime())).length;
    }
    return quizzes.filter(q => q && q.isActive).length;
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3 } }}>
        {/* Header */}
        <Box sx={{ mb: { xs: 3, md: 4 } }}>
          <Typography 
            variant="h3" 
            gutterBottom 
            fontWeight="bold" 
            sx={{ 
              fontSize: { xs: '1.75rem', sm: '2rem', md: '2.5rem' },
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            {user?.role === 'student' ? 'Danh sách bài thi' : 'Quản lý bài thi'}
          </Typography>
          <Typography 
            variant="h6" 
            color="text.secondary" 
            gutterBottom
            sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' } }}
          >
            {user?.role === 'student' ? 'Xem và làm các bài thi trắc nghiệm' : 'Tạo và quản lý các bài thi trắc nghiệm'}
          </Typography>
        </Box>

        {/* Stats Cards */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
          gap: { xs: 2, sm: 3 }, 
          mb: { xs: 3, md: 4 },
          justifyContent: 'stretch'
        }}>
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
              <QuizIcon sx={{ fontSize: 100 }} />
            </Box>
            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
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
            overflow: 'hidden',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Box sx={{ position: 'absolute', top: 0, right: 0, opacity: 0.1 }}>
              <CheckCircleIcon sx={{ fontSize: 100 }} />
            </Box>
            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
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
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: { xs: 1.5, sm: 2 }
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
                variant="contained"
                startIcon={<UploadFileIcon />}
                onClick={() => setImportDialogOpen(true)}
                sx={{ 
                  borderRadius: 2,
                  background: `linear-gradient(45deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
                  '&:hover': {
                    background: `linear-gradient(45deg, ${theme.palette.success.dark}, ${theme.palette.success.main})`,
                  }
                }}
              >
                Import Excel
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
              count={total}
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
        <Dialog 
          open={openDialog} 
          onClose={() => {
            setOpenDialog(false);
            setQuestionSearchTerm('');
            setQuestionFilterSubject('');
            setQuestionFilterDifficulty('');
          }} 
          maxWidth="md" 
          fullWidth
        >
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
                  
                  {/* Bộ lọc câu hỏi */}
                  <Box sx={{ mb: 2, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1.5, sm: 2 }, flexWrap: 'wrap' }}>
                    <TextField
                      placeholder="Tìm kiếm câu hỏi..."
                      size="small"
                      value={questionSearchTerm}
                      onChange={(e) => setQuestionSearchTerm(e.target.value)}
                      InputProps={{
                        startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
                      }}
                      sx={{ flex: { xs: '1 1 100%', sm: 1 }, minWidth: { xs: '100%', sm: 200 }, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <InputLabel>Môn học</InputLabel>
                      <Select
                        value={questionFilterSubject}
                        onChange={(e) => setQuestionFilterSubject(e.target.value)}
                        label="Môn học"
                        sx={{ borderRadius: 2 }}
                      >
                        <MenuItem value="">Tất cả</MenuItem>
                        {Array.from(new Set(availableQuestions.map(q => q.subject))).map(subject => (
                          <MenuItem key={subject} value={subject}>{subject}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <InputLabel>Độ khó</InputLabel>
                      <Select
                        value={questionFilterDifficulty}
                        onChange={(e) => setQuestionFilterDifficulty(e.target.value)}
                        label="Độ khó"
                        sx={{ borderRadius: 2 }}
                      >
                        <MenuItem value="">Tất cả</MenuItem>
                        <MenuItem value="easy">Dễ</MenuItem>
                        <MenuItem value="medium">Trung bình</MenuItem>
                        <MenuItem value="hard">Khó</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  
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
                    ) : filteredQuestions.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            Không tìm thấy câu hỏi nào phù hợp với bộ lọc
                          </Typography>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {filteredQuestions.map((question) => (
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
              <Button 
                onClick={() => {
                  setOpenDialog(false);
                  setQuestionSearchTerm('');
                  setQuestionFilterSubject('');
                  setQuestionFilterDifficulty('');
                }} 
                sx={{ borderRadius: 2 }}
              >
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
            onClick={() => {
              setQuestionSearchTerm('');
              setQuestionFilterSubject('');
              setQuestionFilterDifficulty('');
              setOpenDialog(true);
            }}
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
            setQuizAssignments([]);
            setExpandedAssignments({});
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

                {/* Bài đã giao - chỉ hiển thị cho giáo viên - ĐẶT LÊN TRƯỚC */}
                {user?.role === 'teacher' && (
                  <>
                    <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AssignmentIcon color="primary" />
                      Bài đã giao
                    </Typography>
                    {loadingAssignments ? (
                      <Box sx={{ textAlign: 'center', py: 2 }}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : quizAssignments.length > 0 ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                        {quizAssignments.map((assignment: any, index: number) => (
                          <Card key={index} sx={{ p: 2, bgcolor: 'grey.50' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                              <Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                  Ngày giao: {new Date(assignment.createdAt).toLocaleDateString('vi-VN', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Hạn nộp: {new Date(assignment.dueDate).toLocaleDateString('vi-VN', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </Typography>
                              </Box>
                              <Chip 
                                label={new Date(assignment.dueDate).getTime() > Date.now() ? 'Còn hạn' : 'Hết hạn'}
                                size="small"
                                color={new Date(assignment.dueDate).getTime() > Date.now() ? 'success' : 'error'}
                                variant="outlined"
                              />
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <PeopleIcon fontSize="small" color="primary" />
                              <Typography variant="body2" fontWeight="medium">
                                Đã giao cho {Array.isArray(assignment.assignedTo) ? assignment.assignedTo.length : 0} sinh viên:
                              </Typography>
                            </Box>
                            {(() => {
                              const emails = Array.isArray(assignment.assignedTo) ? assignment.assignedTo : [];
                              const isExpanded = expandedAssignments[index] || false;
                              const maxVisible = 5; // Hiển thị tối đa 5 email
                              const visibleEmails = isExpanded ? emails : emails.slice(0, maxVisible);
                              const hasMore = emails.length > maxVisible;
                              
                              return (
                                <>
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {visibleEmails.map((email: string, idx: number) => (
                                      <Chip 
                                        key={idx}
                                        label={email}
                                        size="small"
                                        variant="outlined"
                                        sx={{ fontSize: '0.75rem' }}
                                      />
                                    ))}
                                  </Box>
                                  {hasMore && !isExpanded && (
                                    <Button
                                      size="small"
                                      onClick={() => setExpandedAssignments(prev => ({ ...prev, [index]: true }))}
                                      sx={{ mt: 1, fontSize: '0.75rem' }}
                                    >
                                      Xem thêm {emails.length - maxVisible} sinh viên...
                                    </Button>
                                  )}
                                  {hasMore && isExpanded && (
                                    <Button
                                      size="small"
                                      onClick={() => setExpandedAssignments(prev => ({ ...prev, [index]: false }))}
                                      sx={{ mt: 1, fontSize: '0.75rem' }}
                                    >
                                      Thu gọn
                                    </Button>
                                  )}
                                </>
                              );
                            })()}
                          </Card>
                        ))}
                      </Box>
                    ) : (
                      <Box sx={{ textAlign: 'center', py: 3, bgcolor: 'grey.50', borderRadius: 2, mb: 3 }}>
                        <AssignmentIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                          Chưa giao bài cho sinh viên nào
                        </Typography>
                      </Box>
                    )}
                    <Divider sx={{ my: 3 }} />
                  </>
                )}

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
                                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                  <Typography variant="body1" sx={{ mb: 1 }}>
                                    {question?.text || 'Câu hỏi không tìm thấy'}
                                  </Typography>
                                  {question && (
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
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
                                      <IconButton
                                        size="small"
                                        onClick={() => {
                                          setSelectedQuestion(question);
                                          setQuestionViewDialogOpen(true);
                                        }}
                                        color="primary"
                                        sx={{ flexShrink: 0 }}
                                      >
                                        <VisibilityIcon />
                                      </IconButton>
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
                ) : null}

                {user?.role === 'student' ? (
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
                ) : null}
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

        {/* Question Detail Dialog */}
        <Dialog 
          open={questionViewDialogOpen} 
          onClose={() => {
            setQuestionViewDialogOpen(false);
            setSelectedQuestion(null);
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
            <QuestionAnswerIcon />
            Chi tiết câu hỏi
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            {selectedQuestion && (
              <Box>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                    {selectedQuestion.text}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
                    <Chip 
                      label={selectedQuestion.subject} 
                      color="primary" 
                      variant="outlined"
                    />
                    <Chip 
                      label={getDifficultyLabel(selectedQuestion.difficulty)}
                      color={getDifficultyColor(selectedQuestion.difficulty)}
                      variant="outlined"
                    />
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                  Các lựa chọn
                </Typography>
                <Box>
                  {selectedQuestion.options.map((option, index) => (
                    <Card 
                      key={index} 
                      sx={{ 
                        mb: 2, 
                        p: 2,
                        border: selectedQuestion.correctAnswer === index ? 2 : 1,
                        borderColor: selectedQuestion.correctAnswer === index ? 'success.main' : 'divider',
                        background: selectedQuestion.correctAnswer === index ? 'success.light' : 'background.paper',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          boxShadow: 2
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar 
                          sx={{ 
                            width: 48, 
                            height: 48,
                            bgcolor: selectedQuestion.correctAnswer === index ? 'success.main' : 'grey.300',
                            color: selectedQuestion.correctAnswer === index ? 'white' : 'text.primary',
                            fontWeight: 'bold',
                            fontSize: '20px',
                            flexShrink: 0,
                            flex: '0 0 48px',
                            boxShadow: selectedQuestion.correctAnswer === index ? 2 : 0
                          }}
                        >
                          {String.fromCharCode(65 + index)}
                        </Avatar>
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            flex: 1, 
                            fontWeight: selectedQuestion.correctAnswer === index ? 'bold' : 'normal',
                            fontFamily: 'inherit',
                            fontSize: '16px'
                          }}
                        >
                          {option}
                        </Typography>
                        {selectedQuestion.correctAnswer === index && (
                          <Chip 
                            label="Đáp án đúng" 
                            color="success" 
                            size="small"
                            icon={<CheckCircleIcon />}
                            sx={{ fontWeight: 'bold' }}
                          />
                        )}
                      </Box>
                    </Card>
                  ))}
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setQuestionViewDialogOpen(false);
              setSelectedQuestion(null);
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

        {/* Import Excel Dialog */}
        <Dialog 
          open={importDialogOpen} 
          onClose={() => {
            setImportDialogOpen(false);
            setImportFile(null);
          }} 
          maxWidth="sm" 
          fullWidth
        >
          <DialogTitle sx={{ 
            background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
            color: 'white',
            display: 'flex',
            alignItems: 'center'
          }}>
            <UploadFileIcon sx={{ mr: 1 }} />
            Import Câu hỏi và Bài thi từ Excel
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <Box sx={{ mb: 3 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  File Excel cần có 2 sheet: "Câu hỏi" và "Bài thi"
                </Typography>
              </Alert>
              
              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="primary">
                  📋 SHEET "Câu hỏi"
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 3, fontSize: '0.875rem', mb: 2 }}>
                  <li><strong>STT</strong>: Số thứ tự (1, 2, 3, ...) - dùng để tham chiếu ở sheet "Bài thi"</li>
                  <li><strong>Nội dung câu hỏi</strong> (bắt buộc)</li>
                  <li><strong>Đáp án A, B, C, D</strong></li>
                  <li><strong>Đáp án đúng</strong>: A, B, C, hoặc D</li>
                  <li><strong>Môn học</strong> (bắt buộc)</li>
                  <li><strong>Độ khó</strong>: Dễ, Trung bình, hoặc Khó (bắt buộc)</li>
                </Box>
                
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="primary" sx={{ mt: 2 }}>
                  📝 SHEET "Bài thi"
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 3, fontSize: '0.875rem' }}>
                  <li><strong>Tiêu đề bài thi</strong> (bắt buộc)</li>
                  <li><strong>Mô tả</strong> (tùy chọn)</li>
                  <li><strong>Môn học</strong> (bắt buộc)</li>
                  <li><strong>Thời gian (phút)</strong> (bắt buộc)</li>
                  <li><strong>Danh sách câu hỏi (STT)</strong>: Nhập STT của các câu hỏi (từ cột STT trong sheet "Câu hỏi"), phân cách bằng dấu phẩy</li>
                </Box>
                
                <Alert severity="success" sx={{ mt: 2 }}>
                  <Typography variant="caption" component="div">
                    <strong>💡 Ví dụ:</strong> Trong sheet "Câu hỏi" có STT 1, 2, 3. Ở sheet "Bài thi", cột "Danh sách câu hỏi (STT)" nhập: <strong>1,2,3</strong> để chọn cả 3 câu hỏi đó.
                  </Typography>
                </Alert>
              </Box>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<FileDownloadIcon />}
                onClick={async () => {
                  try {
                    const blob = await importAPI.downloadTemplate();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'Mau_Import_CauHoi_Va_BaiThi.xlsx';
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    setSuccess('Đã tải file mẫu thành công!');
                  } catch (error: any) {
                    setError('Không thể tải file mẫu: ' + (error.message || 'Lỗi không xác định'));
                  }
                }}
                sx={{ mb: 2, borderRadius: 2 }}
              >
                Tải file mẫu Excel
              </Button>
              <input
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                id="excel-file-upload"
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
                      setError('Chỉ chấp nhận file Excel (.xlsx, .xls)');
                      return;
                    }
                    setImportFile(file);
                  }
                }}
              />
              <label htmlFor="excel-file-upload">
                <Button
                  variant="outlined"
                  component="span"
                  fullWidth
                  startIcon={<UploadFileIcon />}
                  sx={{ borderRadius: 2 }}
                >
                  {importFile ? importFile.name : 'Chọn file Excel'}
                </Button>
              </label>
              {importFile && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Đã chọn: {importFile.name} ({(importFile.size / 1024).toFixed(2)} KB)
                </Typography>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button 
              onClick={() => {
                setImportDialogOpen(false);
                setImportFile(null);
              }}
              sx={{ borderRadius: 2 }}
            >
              Hủy
            </Button>
            <Button
              variant="contained"
              onClick={async () => {
                if (!importFile) {
                  setError('Vui lòng chọn file Excel');
                  return;
                }
                try {
                  setImporting(true);
                  setError('');
                  const result = await importAPI.importExcel(importFile);
                  
                  let message = result.message || `Import thành công: ${result.data?.questionsCreated || 0} câu hỏi, ${result.data?.quizzesCreated || 0} bài thi`;
                  
                  if (result.data?.errors && result.data.errors.length > 0) {
                    message += `\n\nLưu ý: ${result.data.errors.length} lỗi:\n${result.data.errors.slice(0, 5).join('\n')}`;
                    if (result.data.errors.length > 5) {
                      message += `\n... và ${result.data.errors.length - 5} lỗi khác`;
                    }
                  }
                  
                  setSuccess(message);
                  setImportDialogOpen(false);
                  setImportFile(null);
                  
                  // Refresh danh sách
                  setTimeout(() => {
                    fetchQuizzes();
                    loadAvailableQuestions();
                  }, 1000);
                } catch (error: any) {
                  setError(error.message || 'Import thất bại');
                } finally {
                  setImporting(false);
                }
              }}
              disabled={!importFile || importing}
              startIcon={importing ? <CircularProgress size={20} /> : <UploadFileIcon />}
              sx={{ 
                borderRadius: 2,
                background: `linear-gradient(45deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
                '&:hover': {
                  background: `linear-gradient(45deg, ${theme.palette.success.dark}, ${theme.palette.success.main})`,
                }
              }}
            >
              {importing ? 'Đang import...' : 'Import'}
            </Button>
          </DialogActions>
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