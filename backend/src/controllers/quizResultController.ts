import { Request, Response } from 'express';
import QuizResult from '../models/QuizResult';
import Quiz from '../models/Quiz';
import Question from '../models/Question';

// @desc    Check if student already completed a quiz for specific assignment
// @route   GET /api/quiz-results/:quizId/check?assignmentId=xxx
// @access  Private (Student)
export const checkQuizCompletion = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const { assignmentId } = req.query;
    const studentId = req.user?.id;

    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Check if student already completed this quiz for this specific assignment
    // assignmentId is REQUIRED for students to ensure assignments are independent
    const query: any = {
      quizId,
      studentId
    };
    
    // assignmentId is REQUIRED - each assignment must be completely independent
    if (assignmentId) {
      query.assignmentId = assignmentId;
    } else {
      // If no assignmentId, this is likely an error - return false to be safe
      console.warn(`Warning: No assignmentId provided for quiz ${quizId}, student ${studentId}`);
      return res.status(200).json({
        success: true,
        data: {
          completed: false
        }
      });
    }

    const existingResult = await QuizResult.findOne(query);

    console.log(`Checking completion for quiz ${quizId}, assignment ${assignmentId}, student ${studentId}:`, {
      existingResult: existingResult ? 'Found' : 'Not found',
      result: existingResult
    });

    if (existingResult) {
      return res.status(200).json({
        success: true,
        data: {
          completed: true,
          result: existingResult
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        completed: false
      }
    });
  } catch (error) {
    console.error('Error checking quiz completion:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Submit quiz result
// @route   POST /api/quiz-results
// @access  Private (Student)
export const submitQuizResult = async (req: Request, res: Response) => {
  try {
    const { quizId, answers, timeSpent, assignmentId } = req.body;
    const studentId = req.user?.id;

    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Check if student already completed this quiz for this specific assignment
    // assignmentId is REQUIRED for students to ensure assignments are independent
    const query: any = {
      quizId,
      studentId
    };
    
    // assignmentId is REQUIRED - each assignment must be completely independent
    if (assignmentId) {
      query.assignmentId = assignmentId;
    } else {
      // If no assignmentId provided, reject submission to prevent conflicts
      return res.status(400).json({
        success: false,
        message: 'Assignment ID is required for quiz submission'
      });
    }

    const existingResult = await QuizResult.findOne(query);

    if (existingResult) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã hoàn thành bài thi này rồi!'
      });
    }

    // Get quiz and questions to calculate score
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    const questions = await Question.find({ _id: { $in: quiz.questions } });
    
    // Calculate score
    let correctAnswers = 0;
    questions.forEach((question, index) => {
      if (answers[index] === question.correctAnswer) {
        correctAnswers++;
      }
    });

    const score = Math.round((correctAnswers / questions.length) * 10 * 100) / 100; // 10-point scale, 2 decimals

    // Create quiz result (with snapshot of student's profile)
    const quizResultData: any = {
      quizId,
      studentId,
      answers,
      score,
      totalQuestions: questions.length,
      timeSpent,
      completedAt: new Date() // store UTC; client formats to VN time
    };
    
    // Add assignmentId if provided
    if (assignmentId) {
      quizResultData.assignmentId = assignmentId;
    }

    // Snapshot student profile
    const u: any = req.user;
    quizResultData.studentCode = u?.studentId || '';
    quizResultData.fullName = u?.fullName || u?.username || '';
    quizResultData.className = u?.class || '';
    quizResultData.gender = u?.gender || undefined;

    const quizResult = new QuizResult(quizResultData);

    await quizResult.save();

    return res.status(201).json({
      success: true,
      data: quizResult,
      message: 'Quiz submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting quiz result:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get student's quiz results
// @route   GET /api/quiz-results
// @access  Private (Student)
export const getStudentQuizResults = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?.id;

    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '10');
    const quizId = (req.query.quizId as string) || '';
    const minScore = req.query.minScore !== undefined ? parseFloat(req.query.minScore as string) : undefined;
    const maxScore = req.query.maxScore !== undefined ? parseFloat(req.query.maxScore as string) : undefined;

    const filter: any = { studentId };
    if (quizId) filter.quizId = quizId;
    if (!Number.isNaN(minScore as number) && minScore !== undefined) {
      filter.score = { ...(filter.score || {}), $gte: minScore };
    }
    if (!Number.isNaN(maxScore as number) && maxScore !== undefined) {
      filter.score = { ...(filter.score || {}), $lte: maxScore };
    }

    const results = await QuizResult.find(filter)
      .populate('quizId', 'title subject timeLimit')
      .sort({ completedAt: -1 });

    const total = await QuizResult.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: { 
        results: results.slice((page - 1) * limit, (page - 1) * limit + limit),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    console.error('Error getting quiz results:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get quiz results for a specific quiz (for teachers)
// @route   GET /api/quiz-results/quiz/:quizId
// @access  Private (Teacher/Admin)
export const getQuizResults = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '10');
    const search = (req.query.search as string) || '';
    const className = (req.query.className as string) || '';
    const gender = (req.query.gender as string) || '';
    const minScore = req.query.minScore !== undefined ? parseFloat(req.query.minScore as string) : undefined;
    const maxScore = req.query.maxScore !== undefined ? parseFloat(req.query.maxScore as string) : undefined;

    const filter: any = { quizId };
    if (search) {
      filter.$or = [
        { studentCode: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
        { className: { $regex: search, $options: 'i' } }
      ];
    }
    if (className) filter.className = className;
    if (gender) filter.gender = gender;
    if (!Number.isNaN(minScore as number) && minScore !== undefined) {
      filter.score = { ...(filter.score || {}), $gte: minScore };
    }
    if (!Number.isNaN(maxScore as number) && maxScore !== undefined) {
      filter.score = { ...(filter.score || {}), $lte: maxScore };
    }

    const results = await QuizResult.find(filter)
      .populate('studentId', 'name email studentId')
      .populate('quizId', 'title subject')
      .sort({ completedAt: -1 });

    const total = await QuizResult.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: { 
        results: results.slice((page - 1) * limit, (page - 1) * limit + limit),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    console.error('Error getting quiz results:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Summary counts for teacher (results across own quizzes)
// @route   GET /api/quiz-results/summary/my
// @access  Private (Teacher)
export const getMyResultsSummary = async (req: Request, res: Response) => {
  try {
    const user: any = req.user;
    if (user?.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const myQuizzes = await Quiz.find({ createdBy: user.id }).select('_id');
    const quizIds = myQuizzes.map(q => q._id);
    const count = await QuizResult.countDocuments({ quizId: { $in: quizIds } });
    return res.json({ success: true, data: { totalResults: count } });
  } catch (error) {
    console.error('Error getting teacher results summary:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
