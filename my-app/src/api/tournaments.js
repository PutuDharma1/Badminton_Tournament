import apiClient from './client';

export const tournamentsApi = {
    // Get all tournaments
    async getTournaments() {
        return await apiClient.get('/api/tournaments');
    },

    // Get tournament by ID
    async getTournamentById(id) {
        return await apiClient.get(`/api/tournaments/${id}`);
    },

    // Create tournament
    async createTournament(data) {
        return await apiClient.post('/api/tournaments', data);
    },

    // Update tournament
    async updateTournament(id, data) {
        return await apiClient.put(`/api/tournaments/${id}`, data);
    },

    // Delete tournament
    async deleteTournament(id) {
        return await apiClient.delete(`/api/tournaments/${id}`);
    },

    // Start round-robin for tournament
    async startRoundRobin(tournamentId) {
        return await apiClient.post(`/api/tournaments/${tournamentId}/start`);
    },

    // Add committee member to tournament
    async addCommittee(tournamentId, userId) {
        return await apiClient.post(`/api/tournaments/${tournamentId}/committee`, { userId });
    }
};

export default tournamentsApi;