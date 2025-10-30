import { Request, Response } from 'express';
import Question from '../models/Question';
import { asyncHandler } from '../middleware/errorHandler';

// @desc    Get all questions
// @route   GET /api/questions
// @access  Private
export const getQuestions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const subject = req.query.subject as string;
  const difficulty = req.query.difficulty as string;
  const search = req.query.search as string;

  let query: any = {};

  // Filter by subject
  if (subject) {
    query.subject = subject;
  }

  // Filter by difficulty
  if (difficulty) {
    query.difficulty = difficulty;
  }

  // Search by content
  if (search) {
    query.text = { $regex: search, $options: 'i' };
  }

  // Teachers see only their own questions; admin sees all; students see none
  const user: any = req.user;
  if (user?.role === 'teacher') {
    query.createdBy = user.id;
  } else if (user?.role === 'student') {
    res.json({
      success: true,
      data: {
        questions: [],
        pagination: { page, limit, total: 0, pages: 0 }
      }
    });
    return;
  }

  const questions = await Question.find(query)
    .populate('createdBy', 'username email')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Question.countDocuments(query);

  res.json({
    success: true,
    data: {
      questions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

// @desc    Get single question
// @route   GET /api/questions/:id
// @access  Private
export const getQuestion = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const question = await Question.findById(req.params.id)
    .populate('createdBy', 'username email');

  if (!question) {
    res.status(404).json({
      success: false,
      message: 'Question not found'
    });
    return;
  }

  res.json({
    success: true,
    data: { question }
  });
});

// @desc    Create new question
// @route   POST /api/questions
// @access  Private (Teacher/Admin)
export const createQuestion = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { text, options, correctAnswer, subject, difficulty } = req.body;
  const user = req.user;

  const question = await Question.create({
    text,
    options,
    correctAnswer,
    subject,
    difficulty,
    createdBy: user!.id
  });

  const populatedQuestion = await Question.findById(question._id)
    .populate('createdBy', 'username email');

  res.status(201).json({
    success: true,
    message: 'Question created successfully',
    data: { question: populatedQuestion }
  });
});

// @desc    Update question
// @route   PUT /api/questions/:id
// @access  Private (Teacher/Admin)
export const updateQuestion = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { text, options, correctAnswer, subject, difficulty } = req.body;

  const question = await Question.findByIdAndUpdate(
    req.params.id,
    {
      text,
      options,
      correctAnswer,
      subject,
      difficulty
    },
    { new: true, runValidators: true }
  )
    .populate('createdBy', 'username email');

  if (!question) {
    res.status(404).json({
      success: false,
      message: 'Question not found'
    });
    return;
  }

  res.json({
    success: true,
    message: 'Question updated successfully',
    data: { question }
  });
});

// @desc    Delete question
// @route   DELETE /api/questions/:id
// @access  Private (Teacher/Admin)
export const deleteQuestion = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const question = await Question.findByIdAndDelete(req.params.id);

  if (!question) {
    res.status(404).json({
      success: false,
      message: 'Question not found'
    });
    return;
  }

  res.json({
    success: true,
    message: 'Question deleted successfully'
  });
});

// @desc    Get question statistics
// @route   GET /api/questions/stats
// @access  Private (Teacher/Admin)
export const getQuestionStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const totalQuestions = await Question.countDocuments();
  const easyQuestions = await Question.countDocuments({ difficulty: 'easy' });
  const mediumQuestions = await Question.countDocuments({ difficulty: 'medium' });
  const hardQuestions = await Question.countDocuments({ difficulty: 'hard' });

  // Get questions by subject
  const questionsBySubject = await Question.aggregate([
    {
      $group: {
        _id: '$subject',
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        subject: '$_id',
        count: 1,
        _id: 0
      }
    }
  ]);

  res.json({
    success: true,
    data: {
      totalQuestions,
      easyQuestions,
      mediumQuestions,
      hardQuestions,
      questionsBySubject
    }
  });
});