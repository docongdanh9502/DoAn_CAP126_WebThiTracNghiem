# 📊 Database Schema - Online Quiz System

## 🗄️ Database: MongoDB
- **Connection:** `mongodb://localhost:27017/online_quiz_system`
- **ORM:** Mongoose
- **Language:** TypeScript

---

## 📋 Collections & Models

### 1. 👤 **User Collection**
```typescript
interface IUser {
  email: string;                    // Unique, lowercase, required
  password: string;                 // Min 6 characters, required
  role: 'admin' | 'teacher' | 'student'; // Required
  username: string;                 // Required, trimmed
  studentId?: string;               // Optional, trimmed
  class?: string;                   // Optional, trimmed
  avatar?: string;                  // Optional, default: ''
  phone?: string;                   // Optional, trimmed
  isEmailVerified: boolean;         // Default: false
  emailVerificationToken?: string;  // Optional
  isActive: boolean;                // Default: true
  lastLogin?: Date;                 // Optional
  createdAt: Date;                  // Auto-generated
  updatedAt: Date;                  // Auto-generated
}
```

**Indexes:**
- `role` (for role-based queries)

---

### 2. 📝 **Question Collection**
```typescript
interface IQuestion {
  text: string;                     // Required
  options: string[];               // Required array
  correctAnswer: number;           // Required, min: 0
  subject: string;                 // Required
  difficulty: 'easy' | 'medium' | 'hard'; // Default: 'medium'
  createdBy: ObjectId;            // Ref: User, required
  createdAt: Date;                // Auto-generated
  updatedAt: Date;                // Auto-generated
}
```

---

### 3. 🧩 **Quiz Collection**
```typescript
interface IQuiz {
  title: string;                   // Required, trimmed
  description: string;             // Required
  subject: string;                 // Required
  timeLimit: number;               // Required, min: 1 (minutes)
  questions: ObjectId[];          // Ref: Question[], required
  isActive: boolean;               // Default: true
  createdBy: ObjectId;            // Ref: User, required
  createdAt: Date;                 // Auto-generated
  updatedAt: Date;                 // Auto-generated
}
```

---

### 4. 📋 **Assignment Collection**
```typescript
interface IAssignment {
  quizId: ObjectId;               // Ref: Quiz, required
  assignedTo: string[];           // Array of student emails, required
  assignedBy: ObjectId;          // Ref: User (teacher), required
  dueDate: Date;                  // Required
  isActive: boolean;              // Default: true
  createdAt: Date;                // Auto-generated
  updatedAt: Date;                // Auto-generated
}
```

**Indexes:**
- `assignedTo` (for student queries)
- `assignedBy` (for teacher queries)
- `dueDate` (for date-based queries)

---

### 5. 📊 **QuizResult Collection**
```typescript
interface IQuizResult {
  quizId: ObjectId;               // Ref: Quiz, required
  studentId: ObjectId;            // Ref: User, required
  answers: number[];              // Student's answers, required
  score: number;                  // Required, min: 0
  totalQuestions: number;        // Required, min: 1
  timeSpent: number;              // Required, min: 0 (minutes)
  completedAt: Date;              // Required
  createdAt: Date;                // Auto-generated
}
```

**Indexes:**
- `quizId + studentId` (composite, for unique results)
- `studentId` (for student's results)
- `completedAt` (for date-based queries)

---

### 6. 📧 **Invitation Collection**
```typescript
interface IInvitation {
  quiz: ObjectId;                 // Ref: Quiz, required
  email: string;                   // Required, lowercase, trimmed
  studentName: string;            // Required, trimmed
  studentId: string;              // Required, trimmed
  token: string;                  // Required, unique
  isUsed: boolean;                // Default: false
  expiresAt: Date;                // Required, default: 24h from now
  createdAt: Date;                // Auto-generated
}
```

**Indexes:**
- `token` (for invitation lookup)
- `email` (for email-based queries)
- `quiz` (for quiz-based queries)
- `isUsed` (for status queries)
- `expiresAt` (for expiration queries)

---

### 7. 📝 **Exam Collection**
```typescript
interface IExam {
  quiz: ObjectId;                 // Ref: Quiz, required
  invitation: ObjectId;           // Ref: Invitation, required
  studentInfo: {
    name: string;                  // Required, trimmed
    studentId: string;            // Required, trimmed
    email: string;                 // Required, lowercase, trimmed
  };
  startTime: Date;                // Required, default: now
  endTime?: Date;                 // Optional
  status: 'pending' | 'in-progress' | 'completed' | 'expired'; // Default: 'pending'
  answers: [{
    questionId: ObjectId;         // Ref: Question, required
    answer: any;                  // Required (mixed type)
    isCorrect: boolean;           // Required
    points: number;               // Required, min: 0
  }];
  totalScore: number;             // Default: 0, min: 0
  submittedAt?: Date;            // Optional
  createdAt: Date;                // Auto-generated
  updatedAt: Date;                // Auto-generated
}
```

**Indexes:**
- `quiz` (for quiz-based queries)
- `invitation` (for invitation-based queries)
- `studentInfo.email` (for student queries)
- `status` (for status-based queries)
- `startTime` (for time-based queries)

---

## 🔗 **Relationships**

```
User (Teacher) ──creates──> Quiz
User (Teacher) ──creates──> Question
User (Teacher) ──assigns──> Assignment ──references──> Quiz
User (Student) ──receives──> Assignment
User (Student) ──takes──> Quiz ──generates──> QuizResult
Quiz ──contains──> Question[]
Quiz ──generates──> Invitation
Invitation ──creates──> Exam
Exam ──references──> Quiz
```

---

## 🎯 **Key Features**

### **Role-Based Access:**
- **Admin:** Full system access
- **Teacher:** Create quizzes, questions, assign to students
- **Student:** Take assigned quizzes, view results

### **Quiz Management:**
- Teachers create quizzes with multiple questions
- Questions have difficulty levels and subjects
- Time-limited quizzes with auto-submission

### **Assignment System:**
- Teachers assign quizzes to specific students
- Due date management
- Active/inactive status

### **Result Tracking:**
- Detailed quiz results with answers
- Score calculation and time tracking
- Historical result storage

### **Invitation System:**
- Token-based quiz invitations
- Expiration management
- Usage tracking

### **Exam Management:**
- Detailed exam tracking
- Question-by-question scoring
- Status management (pending → in-progress → completed)

---

## 📈 **Performance Optimizations**

- **Indexes** on frequently queried fields
- **Composite indexes** for complex queries
- **Reference relationships** instead of embedded documents
- **Timestamps** for audit trails
- **Validation** at schema level

---

## 🔒 **Security Features**

- **Password hashing** (min 6 characters)
- **Email verification** system
- **Role-based permissions**
- **Token-based invitations**
- **Expiration management**
- **Active/inactive user status**

---

**Schema được thiết kế để hỗ trợ hệ thống thi trắc nghiệm trực tuyến với đầy đủ tính năng quản lý, phân quyền và theo dõi kết quả.**

