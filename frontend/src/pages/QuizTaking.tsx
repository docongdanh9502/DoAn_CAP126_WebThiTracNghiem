import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  LinearProgress,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Avatar,
} from '@mui/material';
import {
  Quiz as QuizIcon,
  Timer as TimerIcon,
  QuestionAnswer as QuestionAnswerIcon,
  CheckCircle as CheckCircleIcon,
  ArrowBack as ArrowBackIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon
} from '@mui/icons-material';
import { quizAPI, questionAPI, quizResultAPI } from '../services/api';
import { Quiz, Question } from '../types';
import { useAuth } from '../contexts/AuthContext';

const QuizTaking: React.FC = () => {
  const navigate = useNavigate();
  const { quizId, assignmentId } = useParams<{ quizId: string; assignmentId?: string }>();
  const { user } = useAuth();
  
  // Helper function to get localStorage base key
  const getStorageKey = (suffix: string) => {
    const baseKey = assignmentId ? `quiz_${quizId}_${assignmentId}` : `quiz_${quizId}`;
    return `${baseKey}_${suffix}`;
  };
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [existingResult, setExistingResult] = useState<any>(null);
  const [profileIncomplete, setProfileIncomplete] = useState<string | null>(null);

  const progress = questions.length > 0 ? (answers.filter(answer => answer !== -1).length / questions.length) * 100 : 0;

  const autoSave = useCallback(() => {
    if (quizId && answers.length > 0 && quizStarted) {
      setIsSaving(true);
      const baseKey = assignmentId ? `quiz_${quizId}_${assignmentId}` : `quiz_${quizId}`;
      localStorage.setItem(`${baseKey}_answers`, JSON.stringify(answers));
      localStorage.setItem(`${baseKey}_lastSaved`, Date.now().toString());
      setLastSaved(new Date());
      console.log('Auto-saved answers:', answers);
      
      setTimeout(() => {
        setIsSaving(false);
      }, 1000);
    }
  }, [quizId, assignmentId, answers, quizStarted]);

  // Auto-save when answers change
  useEffect(() => {
    if (quizStarted && answers.length > 0) {
      const timeoutId = setTimeout(() => {
        autoSave();
      }, 500); // Debounce auto-save by 500ms
      
      return () => clearTimeout(timeoutId);
    }
  }, [answers, quizStarted, autoSave]);

  const checkQuizCompletion = useCallback(async () => {
    if (!quizId) return false;
    
    // For students, assignmentId is REQUIRED
    if (!assignmentId) {
      console.warn('No assignmentId provided - cannot check completion');
      return false;
    }
    
    try {
      const response = await quizResultAPI.checkQuizCompletion(quizId, assignmentId);
      if (response.data.success && response.data.data.completed) {
        setAlreadyCompleted(true);
        setExistingResult(response.data.data.result);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking quiz completion:', error);
      return false;
    }
  }, [quizId, assignmentId]);

  const loadQuiz = useCallback(async () => {
    try {
      // Guard: require student profile fields before starting
      if (user && user.role === 'student') {
        const missing: string[] = [];
        const u: any = user;
        if (!u.fullName) missing.push('Họ tên');
        if (!u.studentId) missing.push('Mã số sinh viên');
        if (!u.class) missing.push('Lớp');
        if (!u.gender) missing.push('Giới tính');
        if (missing.length) {
          setProfileIncomplete(`Thiếu thông tin: ${missing.join(', ')}. Vui lòng cập nhật hồ sơ trước khi làm bài.`);
          return;
        }
      }

      // First check if student already completed this quiz
      const isCompleted = await checkQuizCompletion();
      if (isCompleted) {
        console.log('Quiz already completed, showing result');
        return;
      }

      // Smart rate limiting - only limit if we have valid cached data
      const now = Date.now();
      const lastCall = localStorage.getItem(getStorageKey('lastLoad'));
      const hasQuizData = localStorage.getItem(getStorageKey('quizData'));
      const hasQuestions = localStorage.getItem(getStorageKey('questions'));
      
      // Only use rate limiting if we have complete cached data
      if (lastCall && now - parseInt(lastCall) < 1000 && hasQuizData && hasQuestions) {
        console.log('Rate limiting: using cached data (complete cache available)');
        try {
          const cachedQuiz = JSON.parse(hasQuizData);
          const cachedQuestions = JSON.parse(hasQuestions);
          
          // Validate cached data
          if (cachedQuiz && cachedQuiz._id && cachedQuestions && cachedQuestions.length > 0) {
            setQuiz(cachedQuiz);
            setQuestions(cachedQuestions);
            setRetryCount(0); // Reset retry count on successful cached load
            console.log('Using valid cached data');
            return;
          } else {
            console.log('Cached data invalid, clearing cache');
            localStorage.removeItem(getStorageKey('quizData'));
            localStorage.removeItem(getStorageKey('questions'));
          }
        } catch (error) {
          console.log('Error parsing cached data, clearing cache');
          localStorage.removeItem(getStorageKey('quizData'));
          localStorage.removeItem(getStorageKey('questions'));
        }
      }
      
        localStorage.setItem(getStorageKey('lastLoad'), now.toString());
      
      const response = await quizAPI.getQuiz(quizId!);
      const quizData = response.data.data.quiz;
      setQuiz(quizData);
      
      // Reset retry count on successful load
      setRetryCount(0);
      
      // Cache quiz data
        localStorage.setItem(getStorageKey('quizData'), JSON.stringify(quizData));
      
      // Load questions
      const questionIds = quizData.questions || [];
      if (questionIds.length > 0) {
        // Check if questions are cached
        const cachedQuestions = localStorage.getItem(getStorageKey('questions'));
        if (cachedQuestions) {
          console.log('Using cached questions');
          const questionData = JSON.parse(cachedQuestions);
          setQuestions(questionData);
        } else {
          try {
            // Load questions resiliently: continue when some IDs are invalid (404)
            const results = await Promise.allSettled(
              questionIds.map((id: string) => questionAPI.getQuestion(id))
            );
            const fulfilled = results.filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<any>[];
            const questionData = fulfilled.map(r => r.value.data.data.question).filter(Boolean);
            if (questionData.length === 0) {
              console.error('No valid questions could be loaded for this quiz');
              setError('Không thể tải câu hỏi cho bài thi này. Vui lòng liên hệ giáo viên.');
              return;
            }
            setQuestions(questionData);

            // Cache questions
            localStorage.setItem(getStorageKey('questions'), JSON.stringify(questionData));
          } catch (questionError) {
            console.error('Error loading questions:', questionError);
            setError('Không thể tải câu hỏi. Vui lòng thử lại.');
            return;
          }
        }
        
        // Load saved state from localStorage (with assignmentId if available)
        const savedAnswers = localStorage.getItem(getStorageKey('answers'));
        const savedStartTime = localStorage.getItem(getStorageKey('startTime'));
        const savedQuizStarted = localStorage.getItem(getStorageKey('started'));
        const savedCompleted = localStorage.getItem(getStorageKey('completed'));
        
        console.log('Loading quiz state:', {
          savedAnswers: !!savedAnswers,
          savedStartTime: savedStartTime,
          savedQuizStarted: savedQuizStarted,
          savedCompleted: savedCompleted
        });
        
        // Check if quiz was completed - but only if it was actually submitted
        if (savedCompleted === 'true') {
          // Double-check: quiz should only be completed if it was actually started and submitted
          if (savedStartTime && savedQuizStarted === 'true') {
            console.log('Quiz already completed - showing results');
            setQuizCompleted(true);
            setQuizStarted(false);
            return;
          } else {
            // Invalid completion state, clear it
            console.log('Invalid completion state, clearing...');
            localStorage.removeItem(getStorageKey('completed'));
          }
        }
        
        // Initialize answers
        const currentQuestions = questions.length > 0 ? questions : [];
        if (savedAnswers) {
          try {
            const parsedAnswers = JSON.parse(savedAnswers);
            if (parsedAnswers.length === currentQuestions.length) {
              setAnswers(parsedAnswers);
            } else {
              setAnswers(new Array(currentQuestions.length).fill(-1));
            }
          } catch (error) {
            console.error('Error parsing saved answers:', error);
            setAnswers(new Array(currentQuestions.length).fill(-1));
          }
        } else {
          setAnswers(new Array(currentQuestions.length).fill(-1));
        }
        
        // Calculate remaining time based on startTime
        if (savedStartTime) {
          const startTime = parseInt(savedStartTime);
          const now = Date.now();
          const elapsed = Math.floor((now - startTime) / 1000);
          const totalTime = quizData.timeLimit * 60;
          const remainingTime = Math.max(0, totalTime - elapsed);
          
          console.log('Time calculation:', {
            startTime: new Date(startTime).toLocaleTimeString(),
            now: new Date(now).toLocaleTimeString(),
            elapsed,
            totalTime,
            remainingTime
          });
          
          if (remainingTime > 0) {
            setTimeLeft(remainingTime);
            // If quiz was started and still has time, continue
            if (savedQuizStarted === 'true') {
              setQuizStarted(true);
              console.log('Quiz was in progress - continuing with', remainingTime, 'seconds left');
            } else {
              setQuizStarted(false);
              console.log('Quiz was started but stopped - showing intro with', remainingTime, 'seconds left');
            }
          } else {
            // Time expired
            setTimeLeft(0);
            setQuizStarted(false);
            console.log('Quiz time expired');
          }
        } else {
          // No start time, show full time
          setTimeLeft(quizData.timeLimit * 60);
          setQuizStarted(false);
          console.log('Quiz never started - showing intro with full time');
        }
      }
    } catch (error: any) {
      console.error('Error loading quiz:', error);
      
      // Try to use cached data as fallback first
      const cachedQuiz = localStorage.getItem(getStorageKey('quizData'));
      const cachedQuestions = localStorage.getItem(getStorageKey('questions'));
      
      if (cachedQuiz && cachedQuestions) {
        try {
          console.log('Using cached data as fallback');
          const quizData = JSON.parse(cachedQuiz);
          const questionData = JSON.parse(cachedQuestions);
          
          // Validate fallback data
          if (quizData && quizData._id && questionData && questionData.length > 0) {
            setQuiz(quizData);
            setQuestions(questionData);
            setRetryCount(0); // Reset retry count on successful fallback
            console.log('Fallback to cached data successful');
            return;
          }
        } catch (parseError) {
          console.error('Error parsing cached fallback data:', parseError);
        }
      }
      
      // Handle specific error types with retry logic
      if (error.response?.status === 429) {
        const newRetryCount = retryCount + 1;
        setRetryCount(newRetryCount);
        
        if (newRetryCount <= 3) {
          const retryDelay = Math.min(1000 * Math.pow(2, newRetryCount - 1), 5000); // Exponential backoff, max 5s
          console.log(`Rate limited, retrying in ${retryDelay}ms (attempt ${newRetryCount}/3)`);
          
          // Don't retry automatically - let user retry manually
          setError(`Quá nhiều yêu cầu. Vui lòng thử lại sau ${Math.ceil(retryDelay/1000)} giây.`);
          
          // Clear rate limiting after delay
          setTimeout(() => {
            localStorage.removeItem(getStorageKey('lastLoad'));
            setRetryCount(0);
          }, retryDelay);
        } else {
          setError('Quá nhiều yêu cầu. Vui lòng thử lại sau 10 giây.');
          setRetryCount(0);
          setTimeout(() => {
            localStorage.removeItem(getStorageKey('lastLoad'));
          }, 10000);
        }
      } else if (error.response?.status === 500) {
        setError('Lỗi server. Vui lòng kiểm tra kết nối.');
        setRetryCount(0);
      } else if (error.code === 'NETWORK_ERROR') {
        setError('Lỗi kết nối. Vui lòng kiểm tra internet.');
        setRetryCount(0);
      } else {
        setError('Không thể tải bài thi. Vui lòng thử lại.');
        setRetryCount(0);
      }
    }
  }, [quizId, checkQuizCompletion]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmitQuiz = useCallback(async (opts?: { skipValidation?: boolean }) => {
    const skipValidation = !!opts?.skipValidation;
    try {
      // Check if quiz was actually started
      if (!quizStarted) {
        setError('Bạn chưa bắt đầu làm bài thi!');
        return;
      }

      // Check if all questions are answered (only for manual submit)
      if (!skipValidation) {
        const unansweredQuestions = answers.filter(answer => answer === -1).length;
        if (unansweredQuestions > 0) {
          setError(`Bạn còn ${unansweredQuestions} câu hỏi chưa trả lời!`);
          return;
        }
      }

      // Calculate score
      let correctAnswers = 0;
      questions.forEach((question, index) => {
        if (answers[index] === question.correctAnswer) {
          correctAnswers++;
        }
      });

      const score = Math.round((correctAnswers / questions.length) * 10 * 10) / 10; // Convert to 10-point scale
      const timeSpent = quiz ? (quiz.timeLimit * 60 - timeLeft) / 60 : 0; // in minutes

      // Validate that there are actual answers (not just -1 values)
      const actualAnswers = answers.filter(answer => answer !== -1);
      if (actualAnswers.length === 0) {
        console.log('No actual answers provided - not submitting');
        setError('Bạn chưa trả lời câu hỏi nào!');
        return;
      }

      // assignmentId is REQUIRED for students
      if (!assignmentId) {
        console.error('Missing assignmentId - cannot submit quiz');
        setError('Lỗi: Thiếu thông tin assignment. Vui lòng quay lại danh sách bài thi.');
        return;
      }

      console.log('Submitting quiz with:', {
        quizId,
        assignmentId,
        answers,
        actualAnswersCount: actualAnswers.length,
        score,
        timeSpent,
        correctAnswers,
        totalQuestions: questions.length
      });

      // Submit quiz result to backend
      try {
        const response = await quizResultAPI.submitQuizResult({
          quizId: quizId!,
          answers,
          timeSpent,
          assignmentId // REQUIRED
        });

        if (response.data.success) {
          setQuizCompleted(true);
          setQuizStarted(false);
          setSuccess(`Hoàn thành bài thi! Điểm: ${score}/10`);
          
          // Mark quiz as completed with assignmentId
          localStorage.setItem(getStorageKey('completed'), 'true');
          
          // Update completion cache in localStorage for instant display on reload
          if (quizId && assignmentId) {
            try {
              const cacheKey = `assignment_completion_status`;
              const cacheTimeKey = `assignment_completion_status_time`;
              const cached = localStorage.getItem(cacheKey);
              const cacheData = cached ? JSON.parse(cached) : {};
              const completionKey = `${quizId}_${assignmentId}`;
              cacheData[completionKey] = true;
              localStorage.setItem(cacheKey, JSON.stringify(cacheData));
              localStorage.setItem(cacheTimeKey, Date.now().toString());
            } catch (err) {
              console.error('Error updating completion cache:', err);
            }
          }
          
          // Navigate back to quizzes page after a short delay
          setTimeout(() => {
            navigate('/quizzes');
          }, 2000);
        } else {
          setError(response.data.message || 'Có lỗi xảy ra khi nộp bài');
          return;
        }
      } catch (submitError: any) {
        console.error('Error submitting quiz:', submitError);
        if (submitError.response?.data?.message) {
          setError(submitError.response.data.message);
        } else {
          setError('Có lỗi xảy ra khi nộp bài');
        }
        return;
      }
      
      // Clean up localStorage (keep completion state)
      localStorage.removeItem(getStorageKey('answers'));
      localStorage.removeItem(getStorageKey('startTime'));
      localStorage.removeItem(getStorageKey('timeLeft'));
      localStorage.removeItem(getStorageKey('started'));
      localStorage.removeItem(getStorageKey('lastSaved'));
      localStorage.removeItem(getStorageKey('quizData'));
      localStorage.removeItem(getStorageKey('questions'));
    } catch (error) {
      console.error('Error submitting quiz:', error);
      setError('Có lỗi xảy ra khi nộp bài');
    }
  }, [questions, answers, quiz, quizId, assignmentId, quizStarted, timeLeft, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (quizId) {
      loadQuiz();
    }
  }, [quizId, loadQuiz]);


  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (quizStarted && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          const newTime = prev - 1;
          
          // Update localStorage with current time left
          if (quizId) {
            localStorage.setItem(getStorageKey('timeLeft'), newTime.toString());
            // Also update the start time to maintain accuracy
            const currentStartTime = localStorage.getItem(getStorageKey('startTime'));
            if (currentStartTime) {
              const startTime = parseInt(currentStartTime);
              const now = Date.now();
              const elapsed = Math.floor((now - startTime) / 1000);
              const totalTime = quiz ? quiz.timeLimit * 60 : 0;
              const calculatedTime = Math.max(0, totalTime - elapsed);
              
              // Use the more accurate calculated time
              if (Math.abs(calculatedTime - newTime) > 2) {
                console.log('Timer correction:', {
                  newTime,
                  calculatedTime,
                  difference: Math.abs(calculatedTime - newTime)
                });
                return calculatedTime;
              }
            }
            
            console.log('Timer update:', {
              newTime,
              timestamp: new Date().toLocaleTimeString()
            });
          }
          
          // Show warning when 5 minutes left 
          if (newTime === 300 && !showTimeWarning) {
            setShowTimeWarning(true);
            setTimeout(() => setShowTimeWarning(false), 5000);
          }
          
          if (newTime <= 0) {
            console.log('Time expired - checking for answers');
            // Only auto-submit if there are actual answers
            if (quizStarted && answers.some(answer => answer !== -1)) {
              console.log('Auto-submitting with answers:', answers);
              handleSubmitQuiz({ skipValidation: true });
            } else {
              console.log('Time expired but no answers - not submitting');
              setQuizCompleted(true);
              setQuizStarted(false);
              setError('Hết thời gian làm bài! Bạn chưa trả lời câu hỏi nào.');
            }
            return 0;
          }
          
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [quizStarted, handleSubmitQuiz, quizId, showTimeWarning]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prevent page refresh/close during quiz
  useEffect(() => {
    if (quizStarted && !quizCompleted) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = 'Bạn có chắc muốn rời khỏi trang? Tiến trình làm bài sẽ bị mất.';
        return 'Bạn có chắc muốn rời khỏi trang? Tiến trình làm bài sẽ bị mất.';
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [quizStarted, quizCompleted]);

  // Auto-save answers when they change
  useEffect(() => {
    if (quizStarted && answers.length > 0) {  
      const timeoutId = setTimeout(() => {    
        autoSave();
      }, 2000); // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(timeoutId);   
    }
  }, [answers, quizStarted, autoSave]);

  const startQuiz = () => {
    if (quiz) {
      const totalTime = quiz.timeLimit * 60; // Convert minutes to seconds
      const startTime = Date.now();
      
      console.log('Starting quiz:', {
        totalTime,
        startTime: new Date(startTime).toLocaleTimeString(),
        quizTimeLimit: quiz.timeLimit
      });
      
      setTimeLeft(totalTime);
      setQuizStarted(true);
      
      // Save timer info and quiz state to localStorage
      localStorage.setItem(getStorageKey('startTime'), startTime.toString());
      localStorage.setItem(getStorageKey('timeLeft'), totalTime.toString());
      localStorage.setItem(getStorageKey('started'), 'true'); // Mark quiz as started
      
      // Clear any previous completion state and cache
      localStorage.removeItem(getStorageKey('completed'));
      localStorage.removeItem(getStorageKey('quizData'));
      localStorage.removeItem(getStorageKey('questions'));
      
      console.log('Quiz started - state saved to localStorage');
    }
  };



  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };


  if (!quiz) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center' }}>
          {!profileIncomplete && <LinearProgress />}
          <Typography variant="h6" sx={{ mt: 2 }}>
            {profileIncomplete ? profileIncomplete : 'Đang tải bài thi...'}
          </Typography>
          {profileIncomplete && (
            <Box sx={{ mt: 2 }}>
              <Button variant="contained" onClick={() => navigate('/profile')}>
                Cập nhật hồ sơ
              </Button>
            </Box>
          )}
        </Box>
      </Container>
    );
  }

  if (alreadyCompleted && existingResult) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Card sx={{ borderRadius: 2 }}>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" fontWeight="bold" color="success.main" gutterBottom>
              Đã hoàn thành bài thi!
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
              {quiz.title}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mb: 4 }}>
              <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h3" fontWeight="bold" color="primary.main">
              {Number(existingResult.score).toFixed(2)}
            </Typography>
                <Typography variant="body2" color="text.secondary">
                  Điểm số (thang 10)
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" fontWeight="bold" color="secondary.main">
                  {existingResult.totalQuestions}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Câu hỏi
                </Typography>
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Hoàn thành lúc: {new Date(existingResult.completedAt).toLocaleString('vi-VN')}
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<ArrowBackIcon />}
              onClick={() => {
                setTimeout(() => {
                  navigate('/quizzes');
                }, 100);
              }}
              sx={{ borderRadius: 2 }}
            >
              Quay lại danh sách
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  if (quizCompleted) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Card sx={{ borderRadius: 2 }}>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" fontWeight="bold" color="success.main" gutterBottom>
              Hoàn thành bài thi!
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
              {quiz.title}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mb: 4 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" fontWeight="bold" color="primary.main">
                  {((answers.filter((answer, index) => 
                    answer === questions[index]?.correctAnswer
                  ).length / questions.length) * 10).toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Điểm số (thang 10)
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" fontWeight="bold" color="secondary.main">
                  {questions.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Câu hỏi
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              size="large"
              startIcon={<ArrowBackIcon />}
              onClick={() => {
                // Add small delay to prevent rate limiting
                setTimeout(() => {
                  navigate('/quizzes');
                }, 100);
              }}
              sx={{ borderRadius: 2 }}
            >
              Quay lại danh sách
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  if (!quizStarted) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Card sx={{ borderRadius: 2 }}>
          <CardContent sx={{ py: 6 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <QuizIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                {quiz.title}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                {quiz.description}
              </Typography>
            </Box>

            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: 3, 
              mb: 4 
            }}>
              <Card sx={{ p: 2, textAlign: 'center' }}>
                <QuestionAnswerIcon color="primary" sx={{ mb: 1 }} />
                <Typography variant="h6" fontWeight="bold">
                  {questions.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Câu hỏi
                </Typography>
              </Card>
              <Card sx={{ p: 2, textAlign: 'center' }}>
                <TimerIcon color="secondary" sx={{ mb: 1 }} />
                <Typography variant="h6" fontWeight="bold">
                  {quiz.timeLimit} phút
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Thời gian
                </Typography>
              </Card>
              <Card sx={{ p: 2, textAlign: 'center' }}>
                <Box sx={{ mb: 1 }}>
                  <Chip 
                    label={quiz.subject} 
                    color="primary" 
                    variant="outlined"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Môn học
                </Typography>
              </Card>
            </Box>

            <Box sx={{ textAlign: 'center' }}>
              {alreadyCompleted ? (
                <>
                  <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                  <Typography variant="h6" color="success.main" fontWeight="bold" sx={{ mb: 2 }}>
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
              ) : (
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PlayArrowIcon />}
                  onClick={startQuiz}
                  sx={{ 
                    borderRadius: 2,
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem'
                  }}
                >
                  Bắt đầu làm bài
                </Button>
              )}
            </Box>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: 'grey.50',
      '@keyframes pulse': {
        '0%': { transform: 'scale(1)' },
        '50%': { transform: 'scale(1.05)' },
        '100%': { transform: 'scale(1)' }
      }
    }}>
      {/* Header */}
      <Box sx={{ 
        bgcolor: 'white', 
        boxShadow: 1, 
        position: 'sticky', 
        top: 0, 
        zIndex: 1000 
      }}>
        <Container maxWidth="lg">
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            py: 2 
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/quizzes')}
                sx={{ borderRadius: 2 }}
              >
                Quay lại
              </Button>
              <Typography variant="h6" fontWeight="bold">
                {quiz.title}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip 
                icon={<TimerIcon />}
                label={formatTime(timeLeft)}
                color={timeLeft < 300 ? 'error' : 'primary'} // Red if less than 5 minutes
                variant="outlined"
              />
              <Button
                variant="contained"
                color="error"
                startIcon={<StopIcon />}
                onClick={() => setShowConfirmDialog(true)}
                sx={{ borderRadius: 2 }}
              >
                Nộp bài
              </Button>
            </Box>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            sx={{ mb: 1 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Tổng cộng: {questions.length} câu hỏi
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="caption" color="text.secondary">
                💡 Cuộn xuống để xem tất cả câu hỏi
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: '50%', 
                  bgcolor: 'success.main' 
                }} />
                <Typography variant="caption" color="text.secondary">
                  Đã trả lời: {answers.filter(answer => answer !== -1).length}/{questions.length}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {isSaving && (
                  <Typography variant="caption" color="primary">
                    💾 Đang lưu...
                  </Typography>
                )}
                {lastSaved && !isSaving && (    
                  <Typography variant="caption" color="text.secondary">
                    ✅ Đã lưu lúc {lastSaved.toLocaleTimeString()}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Time Warning Alert */}
      {showTimeWarning && (
        <Container maxWidth="lg" sx={{ py: 2 }}>
          <Alert 
            severity="warning" 
            sx={{ 
              borderRadius: 2,
              animation: 'pulse 1s infinite',
              '@keyframes pulse': {
                '0%': { transform: 'scale(1)' },
                '50%': { transform: 'scale(1.02)' },
                '100%': { transform: 'scale(1)' }
              }
            }}
          >
            ⚠️ Cảnh báo: Chỉ còn 5 phút để hoàn thành bài thi!
          </Alert>
        </Container>
      )}

      {/* All Questions Content */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {questions.map((question, questionIndex) => (
          <Card key={`question-${question._id || questionIndex}`} sx={{ borderRadius: 2, mb: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
                <Avatar sx={{ 
                  bgcolor: 'primary.main', 
                  width: 40, 
                  height: 40,
                  flexShrink: 0
                }}>
                  {questionIndex + 1}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                    {question.text}
                  </Typography>
                </Box>
              </Box>

              <FormControl component="fieldset" fullWidth>
                <RadioGroup
                  value={answers[questionIndex] ?? -1}
                  onChange={(e) => {
                    const newAnswers = [...answers];
                    newAnswers[questionIndex] = parseInt(e.target.value);
                    setAnswers(newAnswers);
                    console.log('Answer changed:', {
                      questionIndex,
                      answer: parseInt(e.target.value),
                      allAnswers: newAnswers
                    });
                  }}
                >
                  {question.options.map((option, optionIndex) => (
                    <FormControlLabel
                      key={optionIndex}
                      value={optionIndex}
                      control={<Radio />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ 
                            width: 24, 
                            height: 24, 
                            bgcolor: 'primary.main',
                            fontSize: '0.8rem'
                          }}>
                            {String.fromCharCode(65 + optionIndex)}
                          </Avatar>
                          <Typography variant="body1">
                            {option}
                          </Typography>
                        </Box>
                      }
                      sx={{ 
                        mb: 1,
                        p: 1,
                        borderRadius: 1,
                        '&:hover': { bgcolor: 'grey.50' }
                      }}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
            </CardContent>
          </Card>
        ))}
      </Container>

      {/* Confirm Submit Dialog */}
      <Dialog open={showConfirmDialog} onClose={() => setShowConfirmDialog(false)}>
        <DialogTitle>
          Xác nhận nộp bài
        </DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc chắn muốn nộp bài thi này? Sau khi nộp, bạn không thể thay đổi câu trả lời.
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Đã trả lời: {answers.filter(answer => answer !== -1).length} / {questions.length} câu
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmDialog(false)}>
            Hủy
          </Button>
          <Button 
            variant="contained" 
            color="error"
            onClick={() => handleSubmitQuiz()}
          >
            Nộp bài
          </Button>
        </DialogActions>
      </Dialog>


      {/* Snackbars */}
      <Snackbar
        open={!!error}
        autoHideDuration={error.includes('Quá nhiều yêu cầu') ? null : 6000}
        onClose={() => setError('')}
      >
        <Alert 
          onClose={() => setError('')} 
          severity="error"
          action={
            error.includes('Quá nhiều yêu cầu') ? (
              <Button 
                color="inherit" 
                size="small" 
                onClick={() => {
                  setError('');
                  localStorage.removeItem(getStorageKey('lastLoad'));
                  setRetryCount(0);
                  loadQuiz();
                }}
              >
                Thử lại
              </Button>
            ) : null
          }
        >
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
    </Box>
  );
};

export default QuizTaking;
