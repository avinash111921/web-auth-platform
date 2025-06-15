import React, { createContext, useContext, useState, useEffect } from 'react';
import CryptoJS from 'crypto-js';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
      }
    }
    setIsLoading(false);
  }, []);

  const hashPassword = (password) => {
    return CryptoJS.SHA256(password).toString();
  };

  const generateToken = () => {
    return CryptoJS.lib.WordArray.random(32).toString();
  };

  const register = async (name, email, password) => {
    setIsLoading(true);
    try {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const existingUser = users.find((u) => u.email === email);

      if (existingUser) {
        setIsLoading(false);
        return { success: false, error: 'User with this email already exists' };
      }

      const hashedPassword = hashPassword(password);
      const newUser = {
        id: generateToken(),
        name,
        email,
        password: hashedPassword,
        createdAt: new Date().toISOString()
      };

      users.push(newUser);
      localStorage.setItem('users', JSON.stringify(users));

      const token = generateToken();
      const userData = {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        createdAt: newUser.createdAt
      };

      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(userData));
      setUser(userData);

      setIsLoading(false);
      return { success: true };
    } catch (error) {
      setIsLoading(false);
      return { success: false, error: 'Registration failed. Please try again.' };
    }
  };

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const hashedPassword = hashPassword(password);
      const user = users.find((u) => u.email === email && u.password === hashedPassword);

      if (!user) {
        setIsLoading(false);
        return { success: false, error: 'Invalid email or password' };
      }

      const token = generateToken();
      const userData = {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      };

      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(userData));
      setUser(userData);

      setIsLoading(false);
      return { success: true };
    } catch (error) {
      setIsLoading(false);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setUser(null);
  };

  const resetPassword = async (email) => {
    setIsLoading(true);
    try {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const user = users.find((u) => u.email === email);

      if (!user) {
        setIsLoading(false);
        return { success: false, error: 'No user found with this email address' };
      }

      const resetToken = generateToken();
      const resetData = {
        email,
        token: resetToken,
        expiresAt: new Date(Date.now() + 3600000).toISOString() // 1 hour
      };

      localStorage.setItem('passwordReset', JSON.stringify(resetData));

      setIsLoading(false);
      return { success: true };
    } catch (error) {
      setIsLoading(false);
      return { success: false, error: 'Password reset failed. Please try again.' };
    }
  };

  // Update updatePassword to accept oldPassword
  const updatePassword = async (email, newPassword, resetToken, oldPassword) => {
    setIsLoading(true);
    try {
      const resetData = JSON.parse(localStorage.getItem('passwordReset') || '{}');

      if (!resetData.token || resetData.token !== resetToken || resetData.email !== email) {
        setIsLoading(false);
        return { success: false, error: 'Invalid reset token' };
      }

      if (new Date() > new Date(resetData.expiresAt)) {
        setIsLoading(false);
        return { success: false, error: 'Reset token has expired' };
      }

      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const userIndex = users.findIndex((u) => u.email === email);

      if (userIndex === -1) {
        setIsLoading(false);
        return { success: false, error: 'User not found' };
      }

      // Check old password
      const hashedOldPassword = hashPassword(oldPassword);
      if (users[userIndex].password !== hashedOldPassword) {
        setIsLoading(false);
        return { success: false, error: 'Current password is incorrect' };
      }

      users[userIndex].password = hashPassword(newPassword);
      localStorage.setItem('users', JSON.stringify(users));
      localStorage.removeItem('passwordReset');

      setIsLoading(false);
      return { success: true };
    } catch (error) {
      setIsLoading(false);
      return { success: false, error: 'Password update failed. Please try again.' };
    }
  };

  const value = {
    user,
    login,
    register,
    logout,
    resetPassword,
    updatePassword,
    isLoading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
