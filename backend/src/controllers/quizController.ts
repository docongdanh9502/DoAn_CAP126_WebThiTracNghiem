import { Request, Response } from 'express';
import Quiz from '../models/Quiz';

// Get all quizzes
export const getQuizzes = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as any;
    const filter: any = {};
    // Teachers see only their own quizzes; admin sees all.
    if (user?.role === 'teacher') {
      filter.createdBy = user.id;
    }
    // Students do not browse all quizzes via this endpoint (they use assignments API)
    if (user?.role === 'student') {
      res.json({ success: true, data: { quizzes: [] } });
      return;
    }
    const quizzes = await Quiz.find(filter).populate('createdBy', 'username email');
    res.json({
      success: true,
      data: { quizzes }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get single quiz
export const getQuiz = async (req: Request, res: Response): Promise<void> => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('createdBy', 'username email');
    if (!quiz) {
      res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
      return;
    }
    res.json({
      success: true,
      data: { quiz }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create quiz
export const createQuiz = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, subject, timeLimit, questions } = req.body;
    
    const quiz = await Quiz.create({
      title,
      description,
      subject,
      timeLimit,
      questions: questions || [],
      createdBy: req.user!.id
    });

    res.status(201).json({
      success: true,
      message: 'Quiz created successfully',
      data: quiz
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update quiz
export const updateQuiz = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, subject, timeLimit, questions } = req.body;
    
    const quiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      { title, description, subject, timeLimit, questions },
      { new: true, runValidators: true }
    );

    if (!quiz) {
      res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Quiz updated successfully',
      data: quiz
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete quiz
export const deleteQuiz = async (req: Request, res: Response): Promise<void> => {
  try {
    const quiz = await Quiz.findByIdAndDelete(req.params.id);
    
    if (!quiz) {
      res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Quiz deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};