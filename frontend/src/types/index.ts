export interface User {
    _id: string;
    username: string;
    email: string;
    role: 'admin' | 'teacher' | 'student';
    isVerified: boolean;
    studentId?: string;
    class?: string;
    phone?: string;
    isActive?: boolean;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface Question {
    _id: string;
    text: string;
    options: string[];
    correctAnswer: number;
    subject: string; // Thay category bằng subject
    difficulty: 'easy' | 'medium' | 'hard';
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface Quiz {
    _id: string;
    title: string;
    description: string;
    subject: string; // Thay category bằng subject
    timeLimit: number;
    questions: string[];
    isActive: boolean;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface QuizWithAssignment extends Quiz {
    assignmentInfo?: {
      dueDate: string;
      assignedAt: string;
      assignmentId: string;
    };
  }

  export interface Assignment {
    _id: string;
    quizId: string;
    quiz: Quiz;
    assignedTo: string[]; // Array of student IDs
    assignedBy: string; // Teacher ID
    dueDate: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }

  export interface QuizResult {
    _id: string;
    quizId: string;
    studentId: string;
    answers: number[]; // Student's answers
    score: number;
    totalQuestions: number;
    timeSpent: number; // in minutes
    completedAt: string;
    createdAt: string;
  }
  
  export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
  }