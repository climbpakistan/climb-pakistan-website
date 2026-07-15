import { createContext, useContext, useState, useCallback } from 'react';
import { loginAPI } from '../api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('admin-user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback(async (email, password) => {
    const result = await loginAPI(email, password);
    setUser(result.user);
    localStorage.setItem('admin-user', JSON.stringify(result.user));
    localStorage.setItem('admin-token', result.token);
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('admin-user');
    localStorage.removeItem('admin-token');
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
