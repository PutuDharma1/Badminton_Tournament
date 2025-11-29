// Base API client configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

class ApiClient {
    constructor(baseURL) {
        this.baseURL = baseURL;
    }

    // Get auth token from localStorage
    getToken() {
        return localStorage.getItem('auth_token');
    }

    // Set auth token in localStorage
    setToken(token) {
        localStorage.setItem('auth_token', token);
    }

    // Remove auth token
    removeToken() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
    }

    // Make HTTP request with automatic token attachment
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const token = this.getToken();

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers,
        };

        try {
            const response = await fetch(url, config);

            // Handle 401 Unauthorized - auto logout
            if (response.status === 401) {
                this.removeToken();
                window.location.href = '/login';
                throw new Error('Unauthorized - please login again');
            }

            // Handle non-OK responses
            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(error.message || `HTTP Error: ${response.status}`);
            }

            // Parse JSON response
            return await response.json();
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    // Convenience methods
    get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'GET' });
    }

    post(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    put(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    }
}

// Create and export singleton instance
const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;
