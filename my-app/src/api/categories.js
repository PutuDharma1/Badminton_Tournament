import apiClient from './client';

export const categoriesApi = {
    getAll: () => apiClient.get('/api/categories'),
    getByTournament: (tournamentId) => apiClient.get(`/api/categories/tournament/${tournamentId}`),
    create: (data) => apiClient.post('/api/categories/', data),
    delete: (id) => apiClient.delete(`/api/categories/${id}`)
};
