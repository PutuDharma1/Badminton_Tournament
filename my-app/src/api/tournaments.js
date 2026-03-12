import apiClient from './client';

// Tournaments API — calls the real Flask backend
export const tournamentsApi = {
    // Get all tournaments
    async getTournaments() {
        return await apiClient.get('/api/tournaments/');
    },

    // Get tournament by ID (includes participants + matches from backend to_dict)
    async getTournamentById(id) {
        return await apiClient.get(`/api/tournaments/${id}`);
    },

    // Create tournament
    async createTournament(data) {
        return await apiClient.post('/api/tournaments/', data);
    },

    // Update tournament
    async updateTournament(id, data) {
        return await apiClient.put(`/api/tournaments/${id}`, data);
    },

    // Delete tournament
    async deleteTournament(id) {
        return await apiClient.delete(`/api/tournaments/${id}`);
    },

    // Start round-robin: calls backend which generates Match rows and sets status=ONGOING
    async startRoundRobin(tournamentId) {
        return await apiClient.post(`/api/tournaments/${tournamentId}/start`);
    },

    // Get tournament leaderboard (per-group or filtered)
    async getLeaderboard(id, group = null) {
        let url = `/api/tournaments/${id}/leaderboard`;
        if (group) url += `?group=${group}`;
        return await apiClient.get(url);
    },

    // Get group assignments
    async getGroups(id) {
        return await apiClient.get(`/api/tournaments/${id}/groups`);
    },

    // Generate knockout bracket from group standings
    async generateKnockout(id) {
        return await apiClient.post(`/api/tournaments/${id}/generate-knockout`);
    },
};

export default tournamentsApi;