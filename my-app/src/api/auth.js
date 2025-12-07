import apiClient from './client';
import {
    findUserByCredentials,
    findUserById,
    addMockUser,
    generateMockToken,
} from './mockData';

// Check if we should use mock data
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

// Simulate network delay for realistic feel
const mockDelay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

// Authentication API calls
export const authApi = {
    // Login with email and password (all user types)
    async login(email, password) {
        if (USE_MOCK_DATA) {
            await mockDelay();
            const user = findUserByCredentials(email, password);
            if (!user) throw new Error('Invalid email or password');
            const { password: _, ...userWithoutPassword } = user;
            const token = generateMockToken(user.id);
            apiClient.setToken(token);
            localStorage.setItem('user_data', JSON.stringify(userWithoutPassword));
            return { user: userWithoutPassword, token };
        }

        const response = await apiClient.post('/api/auth/login', { email, password });

        if (response.token) {
            apiClient.setToken(response.token);
            localStorage.setItem('user_data', JSON.stringify(response.user));
        }

        return response;
    },

    // Register new user
    async register(userData) {
        if (USE_MOCK_DATA) {
            await mockDelay();
            const existingUser = findUserByCredentials(userData.email, '');
            if (existingUser) throw new Error('Email already exists');
            const newUser = addMockUser(userData);
            const { password: _, ...userWithoutPassword } = newUser;
            return { user: userWithoutPassword, message: 'Registration successful' };
        }

        const response = await apiClient.post('/api/auth/register', userData);
        
        if (response.token) {
            apiClient.setToken(response.token);
            localStorage.setItem('user_data', JSON.stringify(response.user));
        }
        
        return response;
    },

    // Get current user profile
    async getCurrentUser() {
        if (USE_MOCK_DATA) {
            await mockDelay(200);
            const token = apiClient.getToken();
            if (!token) throw new Error('Not authenticated');
            const userId = parseInt(token.split('-')[2]);
            const user = findUserById(userId);
            if (!user) throw new Error('User not found');
            const { password: _, ...userWithoutPassword } = user;
            return userWithoutPassword;
        }

        const response = await apiClient.get('/api/auth/me');
        return response;
    },

    // Update user profile
    async updateProfile(userId, data) {
        if (USE_MOCK_DATA) {
            await mockDelay();

            const user = findUserById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Update user data
            Object.assign(user, data);
            const { password: _, ...userWithoutPassword } = user;

            localStorage.setItem('user_data', JSON.stringify(userWithoutPassword));

            return { user: userWithoutPassword };
        }

        const response = await apiClient.put(`/api/auth/users/${userId}`, data);

        // Update local storage if successful
        if (response.user) {
            localStorage.setItem('user_data', JSON.stringify(response.user));
        }

        return response;
    },

    // Logout
    logout() {
        apiClient.removeToken();
        return Promise.resolve();
    },

    // Get stored user data from localStorage
    getStoredUser() {
        const userData = localStorage.getItem('user_data');
        return userData ? JSON.parse(userData) : null;
    },

    // Check if user is authenticated
    isAuthenticated() {
        return !!apiClient.getToken();
    },
};

export default authApi;
