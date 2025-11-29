import React, { createContext, useContext, useState, useEffect } from 'react';
import authApi from '../api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Initialize auth state from localStorage on mount
    useEffect(() => {
        const initAuth = async () => {
            try {
                const storedUser = authApi.getStoredUser();

                if (storedUser && authApi.isAuthenticated()) {
                    // Verify token is still valid by fetching current user
                    try {
                        const currentUser = await authApi.getCurrentUser();
                        setUser(currentUser);
                    } catch (err) {
                        // Token invalid, clear auth
                        authApi.logout();
                        setUser(null);
                    }
                }
            } catch (err) {
                console.error('Auth initialization error:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        initAuth();
    }, []);

    // Login function
    const login = async (email, password) => {
        setLoading(true);
        setError(null);

        try {
            const response = await authApi.login(email, password);
            setUser(response.user);
            return response.user;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // Register function
    const register = async (userData) => {
        setLoading(true);
        setError(null);

        try {
            const response = await authApi.register(userData);
            return response;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // Logout function
    const logout = () => {
        authApi.logout();
        setUser(null);
        setError(null);
    };

    // Update profile function
    const updateProfile = async (data) => {
        setLoading(true);
        setError(null);

        try {
            const response = await authApi.updateProfile(user.id, data);
            setUser(response.user);
            return response.user;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // Check if user has specific role
    const hasRole = (roles) => {
        if (!user) return false;
        if (typeof roles === 'string') return user.role === roles;
        return roles.includes(user.role);
    };

    const value = {
        user,
        loading,
        error,
        login,
        register,
        logout,
        updateProfile,
        hasRole,
        isAuthenticated: !!user,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
