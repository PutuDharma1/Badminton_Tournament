import apiClient from './client';
import {
    getMockTournaments,
    getMockTournamentById,
    addMockTournament,
    updateMockTournament,
    deleteMockTournament,
} from './mockData';

// Check if we should use mock data
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

// Simulate network delay
const mockDelay = (ms = 400) => new Promise(resolve => setTimeout(resolve, ms));

// Tournament API calls
export const tournamentsApi = {
    // Get all tournaments
    async getTournaments() {
        if (USE_MOCK_DATA) {
            await mockDelay();
            return getMockTournaments();
        }

        return await apiClient.get('/api/tournaments');
    },

    // Get tournament by ID
    async getTournamentById(id) {
        if (USE_MOCK_DATA) {
            await mockDelay();
            const tournament = getMockTournamentById(parseInt(id));
            if (!tournament) {
                throw new Error('Tournament not found');
            }
            return tournament;
        }

        return await apiClient.get(`/api/tournaments/${id}`);
    },

    // Create tournament
    async createTournament(data) {
        if (USE_MOCK_DATA) {
            await mockDelay();
            const newTournament = addMockTournament(data);
            return newTournament;
        }

        return await apiClient.post('/api/tournaments', data);
    },

    // Update tournament
    async updateTournament(id, data) {
        if (USE_MOCK_DATA) {
            await mockDelay();
            const updated = updateMockTournament(parseInt(id), data);
            if (!updated) {
                throw new Error('Tournament not found');
            }
            return updated;
        }

        return await apiClient.put(`/api/tournaments/${id}`, data);
    },

    // Delete tournament
    async deleteTournament(id) {
        if (USE_MOCK_DATA) {
            await mockDelay();
            const deleted = deleteMockTournament(parseInt(id));
            if (!deleted) {
                throw new Error('Tournament not found');
            }
            return { message: 'Tournament deleted successfully' };
        }

        return await apiClient.delete(`/api/tournaments/${id}`);
    },

    // Start round-robin for tournament
    async startRoundRobin(tournamentId) {
        if (USE_MOCK_DATA) {
            await mockDelay();
            const { mockMatches } = await import('./mockData');
            const { generateRoundRobinMatches } = await import('../utils/matchGeneration');

            const tournament = getMockTournamentById(parseInt(tournamentId));

            if (!tournament) {
                throw new Error('Tournament not found');
            }

            const participantCount = tournament.participants?.length || 0;

            // Check if participant count is sufficient
            if (participantCount < 3) {
                throw new Error(`Tournament requires at least 3 players. Currently has ${participantCount} players.`);
            }

            // Generate matches using the round-robin utility
            const newMatches = generateRoundRobinMatches(
                tournament.participants,
                parseInt(tournamentId),
                1 // default category ID
            );

            // Add matches to mockMatches array
            mockMatches.push(...newMatches);

            // Update tournament status to ONGOING
            updateMockTournament(parseInt(tournamentId), { status: 'ONGOING' });

            return { message: 'Round-robin started', matchCount: newMatches.length };
        }

        return await apiClient.post(`/api/tournaments/${tournamentId}/start`);
    },

    // Add committee member to tournament
    async addCommittee(tournamentId, userId) {
        if (USE_MOCK_DATA) {
            await mockDelay();
            return { message: 'Committee member added' };
        }

        return await apiClient.post(`/api/tournaments/${tournamentId}/committee`, { userId });
    },
};

export default tournamentsApi;
