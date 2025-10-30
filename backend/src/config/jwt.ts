import jwt, { SignOptions } from 'jsonwebtoken'; // Thêm 'SignOptions' vào đây

export interface JwtPayload {
  userId: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  iat?: number;
  exp?: number;
}

export const generateToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string => {
    const options: SignOptions = {
        expiresIn: (process.env.JWT_EXPIRE || '7d') as any
    };
  return jwt.sign(payload, process.env.JWT_SECRET || 'fallback_secret', options);
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as JwtPayload;
};

export const decodeToken = (token: string): JwtPayload | null => {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch (error) {
    return null;
  }
};