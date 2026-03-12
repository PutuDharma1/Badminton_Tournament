import apiClient from './client';

// Matches API — calls the real Flask backend
export const matchesApi = {
    // Get matches for a tournament, optionally filtered by round and/or stage
    async getMatches(tournamentId, round = null, stage = null) {
        let url = `/api/matches/?tournamentId=${tournamentId}`;
        if (round !== null) url += `&round=${round}`;
        if (stage) url += `&stage=${stage}`;
        return await apiClient.get(url);
    },

    // Get a single match by ID
    async getMatch(matchId) {
        return await apiClient.get(`/api/matches/${matchId}`);
    },

    // Start a match (sets status to ONGOING, records started_at)
    async startMatch(matchId) {
        return await apiClient.put(`/api/matches/${matchId}/start`);
    },

    // Update match score with set-based payload
    // sets: Array of { homeScore: number, awayScore: number }
    // e.g. [{ homeScore: 21, awayScore: 15 }, { homeScore: 21, awayScore: 19 }]
    async updateScore(matchId, sets) {
        return await apiClient.put(`/api/matches/${matchId}/score`, { sets });
    },

    // Manually finish a match (committee override)
    async finishMatch(matchId) {
        return await apiClient.put(`/api/matches/${matchId}/finish`);
    },

    // Assign referee to match
    async assignReferee(matchId, refereeId) {
        return await apiClient.put(`/api/matches/${matchId}/referee`, { refereeId });
    },

    // Get available referees (users with REFEREE role)
    async getAvailableReferees() {
        return await apiClient.get('/api/matches/referees');
    },
};

export default matchesApi;
