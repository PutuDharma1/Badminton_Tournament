import apiClient from './client';

// Authentication API calls
export const authApi = {
    // Login with email and password (all user types)
    async login(email, password) {
        const response = await apiClient.post('/api/auth/login', { email, password });

        if (response.token) {
            apiClient.setToken(response.token);
            localStorage.setItem('user_data', JSON.stringify(response.user));
        }

        return response;
    },

    // Register new user
    async register(userData) {
        const response = await apiClient.post('/api/auth/register', userData);

        if (response.token) {
            apiClient.setToken(response.token);
            localStorage.setItem('user_data', JSON.stringify(response.user));
        }

        return response;
    },

    // Get current user profile
    async getCurrentUser() {
        const response = await apiClient.get('/api/auth/me');
        return response;
    },

    // Get all players
    async getPlayers() {
        return await apiClient.get('/api/auth/players');
    },

    // Update user profile
    async updateProfile(userId, data) {
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
        localStorage.removeItem('user_data');
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
