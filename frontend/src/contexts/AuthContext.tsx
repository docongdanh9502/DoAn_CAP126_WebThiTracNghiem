import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { authAPI } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Standard behavior: keep session if token exists; logout handled by 401
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      const parsed = JSON.parse(storedUser);
      const normalized = { ...parsed, _id: parsed._id || parsed.id };
      setUser(normalized);
      if (!parsed._id && parsed.id) {
        localStorage.setItem('user', JSON.stringify(normalized));
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await authAPI.login({ username, password });
      const { user: userData, token: userToken } = response.data.data!;
      const normalizedUser = { ...userData, _id: (userData as any).id || (userData as any)._id } as User;
      
      setUser(normalizedUser);
      setToken(userToken);
      localStorage.setItem('token', userToken);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
    } catch (error) {
      throw error;
    }
  };

  const register = async (data: any) => {
    try {
      const response = await authAPI.register(data);
      const { user: userData, token: userToken } = response.data.data!;
      const normalizedUser = { ...userData, _id: (userData as any).id || (userData as any)._id } as User;
      
      setUser(normalizedUser);
      setToken(userToken);
      localStorage.setItem('token', userToken);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const refreshUser = async () => {
    try {
      const res = await authAPI.getMe();
      const fresh = res.data.data!.user as any;
      const normalized = { ...fresh, _id: fresh._id || fresh.id } as User;
      setUser(normalized);
      localStorage.setItem('user', JSON.stringify(normalized));
    } catch (e) {
      // ignore; keep current state
    }
  };

  const value = {
    user,
    token,
    login,
    register,
    logout,
    loading,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};