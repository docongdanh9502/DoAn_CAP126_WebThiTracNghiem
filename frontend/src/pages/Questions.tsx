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
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Quiz as QuizIcon,
  QuestionAnswer as QuestionAnswerIcon,
  CheckCircle as CheckCircleIcon,
  FilterList as FilterListIcon,
  Search as SearchIcon,
  Lightbulb as LightbulbIcon,
  Psychology as PsychologyIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { questionAPI } from '../services/api';
import { Question } from '../types';

const Questions: React.FC = () => {
  const theme = useTheme();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [formData, setFormData] = useState({
    text: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    subject: '',
    difficulty: 'easy' as 'easy' | 'medium' | 'hard'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  const fetchQuestions = useCallback(async () => {
    try {
      const response = await questionAPI.getQuestions({
        page: page + 1,
        limit: rowsPerPage,
        search: searchTerm,
        subject: filterSubject,
        difficulty: filterDifficulty
      });
      setQuestions(response.data.data.questions);
      setTotal(response.data.data.pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching questions:', error);
      setError('Không thể tải danh sách câu hỏi');
    }
  }, [page, rowsPerPage, searchTerm, filterSubject, filterDifficulty]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingQuestion) {
        await questionAPI.updateQuestion(editingQuestion._id, formData);
        setSuccess('Cập nhật câu hỏi thành công!');
      } else {
        await questionAPI.createQuestion(formData);
        setSuccess('Tạo câu hỏi thành công!');
      }
      setOpenDialog(false);
      setFormData({
        text: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        subject: '',
        difficulty: 'easy'
      });
      setEditingQuestion(null);
      fetchQuestions();
    } catch (error) {
      setError('Có lỗi xảy ra khi lưu câu hỏi');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData(prev => ({ ...prev, options: newOptions }));
  };

  const handleEdit = (question: Question) => {
    setFormData({
      text: question.text,
      options: question.options,
      correctAnswer: question.correctAnswer,
      subject: question.subject,
      difficulty: question.difficulty
    });
    setEditingQuestion(question);
    setOpenDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa câu hỏi này?')) {
      try {
        await questionAPI.deleteQuestion(id);
        setSuccess('Xóa câu hỏi thành công!');
        fetchQuestions();
      } catch (error) {
        setError('Có lỗi xảy ra khi xóa câu hỏi');
      }
    }
  };

  const handleViewDetails = (question: Question) => {
    setSelectedQuestion(question);
    setViewDialogOpen(true);
  };


  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'success';
      case 'medium': return 'warning';
      case 'hard': return 'error';
      default: return 'default';
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return <CheckCircleIcon />;
      case 'medium': return <LightbulbIcon />;
      case 'hard': return <PsychologyIcon />;
      default: return <QuestionAnswerIcon />;
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Dễ';
      case 'medium': return 'Trung bình';
      case 'hard': return 'Khó';
      default: return difficulty;
    }
  };

  const subjects = Array.from(new Set(questions.map(q => q.subject)));

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
            Quản lý câu hỏi
          </Typography>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Tạo và quản lý ngân hàng câu hỏi cho các bài thi
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
              <QuestionAnswerIcon sx={{ fontSize: 100 }} />
            </Box>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 2 }}>
                  <QuestionAnswerIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {questions.length}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Tổng câu hỏi
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
                    {questions.filter(q => q.difficulty === 'easy').length}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Câu hỏi dễ
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

          <Card sx={{ 
            background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <Box sx={{ position: 'absolute', top: 0, right: 0, opacity: 0.1 }}>
              <LightbulbIcon sx={{ fontSize: 100 }} />
            </Box>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 2 }}>
                  <LightbulbIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {questions.filter(q => q.difficulty === 'medium').length}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Câu hỏi trung bình
                  </Typography>
                </Box>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={60} 
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.2)', 
                  '& .MuiLinearProgress-bar': { bgcolor: 'white' }
                }} 
              />
            </CardContent>
          </Card>

          <Card sx={{ 
            background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <Box sx={{ position: 'absolute', top: 0, right: 0, opacity: 0.1 }}>
              <PsychologyIcon sx={{ fontSize: 100 }} />
            </Box>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 2 }}>
                  <PsychologyIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {questions.filter(q => q.difficulty === 'hard').length}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Câu hỏi khó
                  </Typography>
                </Box>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={40} 
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.2)', 
                  '& .MuiLinearProgress-bar': { bgcolor: 'white' }
                }} 
              />
            </CardContent>
          </Card>
        </Box>

        {/* Search and Filter */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: 2 
            }}>
              <TextField
                fullWidth
                placeholder="Tìm kiếm câu hỏi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
              <FormControl fullWidth>
                <InputLabel>Độ khó</InputLabel>
                <Select
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value)}
                  label="Độ khó"
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="">Tất cả độ khó</MenuItem>
                  <MenuItem value="easy">Dễ</MenuItem>
                  <MenuItem value="medium">Trung bình</MenuItem>
                  <MenuItem value="hard">Khó</MenuItem>
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
            </Box>
          </CardContent>
        </Card>

        {/* Questions Table */}
        <Card>
          <CardContent sx={{ p: 0 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>Câu hỏi</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Môn học</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Độ khó</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Đáp án đúng</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Ngày tạo</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Thao tác</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {questions.map((question) => (
                    <TableRow key={question._id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body1" fontWeight="medium" sx={{ mb: 1 }}>
                            {question.text}
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {question.options.map((option, index) => (
                              <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Avatar 
                                  sx={{ 
                                    width: 28, 
                                    height: 28,
                                    bgcolor: index === question.correctAnswer ? 'success.main' : 'grey.300',
                                    color: index === question.correctAnswer ? 'white' : 'text.primary',
                                    fontWeight: 'bold',
                                    fontSize: '14px',
                                    flexShrink: 0,
                                    flex: '0 0 28px'
                                  }}
                                >
                                  {String.fromCharCode(65 + index)}
                                </Avatar>
                                <Typography variant="body2" sx={{ 
                                  color: index === question.correctAnswer ? 'success.main' : 'text.secondary',
                                  fontWeight: index === question.correctAnswer ? 'bold' : 'normal',
                                  fontFamily: 'inherit',
                                  fontSize: '12px',
                                  flex: 1
                                }}>
                                  {option}
                                </Typography>
                                {index === question.correctAnswer && (
                                  <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main', flexShrink: 0 }} />
                                )}
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={question.subject} 
                          color="primary" 
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getDifficultyIcon(question.difficulty)}
                          label={getDifficultyLabel(question.difficulty)}
                          color={getDifficultyColor(question.difficulty)}
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar 
                            sx={{ 
                              width: 40, 
                              height: 40,
                              bgcolor: 'success.main',
                              color: 'white',
                              fontWeight: 'bold',
                              fontSize: '18px',
                              flexShrink: 0,
                              flex: '0 0 40px'
                            }}
                          >
                            {String.fromCharCode(65 + question.correctAnswer)}
                          </Avatar>
                          <Typography 
                            variant="body2" 
                            fontWeight="bold" 
                            color="success.main" 
                            sx={{ 
                              flex: 1,
                              fontFamily: 'inherit',
                              fontSize: '14px'
                            }}
                          >
                            {question.options[question.correctAnswer]}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(question.createdAt).toLocaleDateString('vi-VN')}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          <Tooltip title="Xem chi tiết">
                            <IconButton 
                              size="small" 
                              color="info"
                              onClick={() => handleViewDetails(question)}
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Chỉnh sửa">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleEdit(question)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Xóa">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleDelete(question._id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
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

        {/* Create Question Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ 
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            color: 'white',
            display: 'flex',
            alignItems: 'center'
          }}>
            <QuizIcon sx={{ mr: 1 }} />
            {editingQuestion ? 'Chỉnh sửa câu hỏi' : 'Tạo câu hỏi mới'}
          </DialogTitle>
          <form onSubmit={handleSubmit}>
            <DialogContent sx={{ pt: 3 }}>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr', 
                gap: 3 
              }}>
                <TextField
                  name="text"
                  label="Nội dung câu hỏi"
                  fullWidth
                  multiline
                  rows={3}
                  value={formData.text}
                  onChange={handleChange}
                  required
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Các lựa chọn
                  </Typography>
                  {formData.options.map((option, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Typography variant="body1" sx={{ minWidth: 30, mr: 2 }}>
                        {String.fromCharCode(65 + index)}.
                      </Typography>
                      <TextField
                        fullWidth
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={`Lựa chọn ${String.fromCharCode(65 + index)}`}
                        required
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                      <IconButton
                        color={formData.correctAnswer === index ? 'success' : 'default'}
                        onClick={() => setFormData(prev => ({ ...prev, correctAnswer: index }))}
                        sx={{ ml: 1 }}
                      >
                        <CheckCircleIcon />
                      </IconButton>
                    </Box>
                  ))}
                </Box>

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
                  <FormControl fullWidth>
                    <InputLabel>Độ khó</InputLabel>
                    <Select
                      name="difficulty"
                      value={formData.difficulty}
                      onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value as 'easy' | 'medium' | 'hard' }))}
                      label="Độ khó"
                      sx={{ borderRadius: 2 }}
                    >
                      <MenuItem value="easy">Dễ</MenuItem>
                      <MenuItem value="medium">Trung bình</MenuItem>
                      <MenuItem value="hard">Khó</MenuItem>
                    </Select>
                  </FormControl>
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
                {editingQuestion ? 'Cập nhật' : 'Tạo mới'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Floating Action Button */}
        <Fab
          color="primary"
          aria-label="Tạo câu hỏi mới"
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

        {/* View Details Dialog */}
        <Dialog 
          open={viewDialogOpen} 
          onClose={() => setViewDialogOpen(false)}
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
            <Button onClick={() => setViewDialogOpen(false)}>
              Đóng
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

export default Questions;