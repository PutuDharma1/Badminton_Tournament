import apiClient from './client';
import { mockMatches, mockParticipants, findUserById } from './mockData';

// Check if we should use mock data
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

// Simulate network delay
const mockDelay = (ms = 400) => new Promise(resolve => setTimeout(resolve, ms));

// Matches API calls
export const matchesApi = {
    // Get matches for a tournament
    async getMatches(tournamentId) {
        if (USE_MOCK_DATA) {
            await mockDelay();
            const matches = mockMatches
                .filter(m => m.tournamentId === parseInt(tournamentId))
                .map(match => {
                    // Populate teams/participants
                    const homeParticipant = mockParticipants.find(p => p.id === match.homeTeamId);
                    const awayParticipant = mockParticipants.find(p => p.id === match.awayTeamId);

                    return {
                        ...match,
                        homeTeam: homeParticipant ? {
                            ...homeParticipant,
                            user: homeParticipant.userId ? findUserById(homeParticipant.userId) : null
                        } : null,
                        awayTeam: awayParticipant ? {
                            ...awayParticipant,
                            user: awayParticipant.userId ? findUserById(homeParticipant.userId) : null
                        } : null,
                        referee: match.refereeId ? findUserById(match.refereeId) : null,
                    };
                });
            return matches;
        }

        return await apiClient.get(`/tournaments/${tournamentId}/matches`);
    },

    // Assign referee to match
    async assignReferee(matchId, refereeId) {
        if (USE_MOCK_DATA) {
            await mockDelay();

            const match = mockMatches.find(m => m.id === parseInt(matchId));
            if (!match) {
                throw new Error('Match not found');
            }

            match.refereeId = refereeId;
            return { ...match, referee: findUserById(refereeId) };
        }

        return await apiClient.put(`/matches/${matchId}/referee`, { refereeId });
    },

    // Update match score
    async updateScore(matchId, homeScore, awayScore) {
        if (USE_MOCK_DATA) {
            await mockDelay();

            const match = mockMatches.find(m => m.id === parseInt(matchId));
            if (!match) {
                throw new Error('Match not found');
            }

            match.homeScore = homeScore;
            match.awayScore = awayScore;

            // Auto-update status if scores are provided
            if (homeScore !== null && awayScore !== null) {
                if (!match.startedAt) {
                    match.startedAt = new Date();
                    match.status = 'ONGOING';
                }
            }

            return match;
        }

        return await apiClient.put(`/matches/${matchId}/score`, { homeScore, awayScore });
    },

    // Finish match
    async finishMatch(matchId) {
        if (USE_MOCK_DATA) {
            await mockDelay();

            const match = mockMatches.find(m => m.id === parseInt(matchId));
            if (!match) {
                throw new Error('Match not found');
            }

            match.finishedAt = new Date();
            match.status = 'FINISHED';
            return match;
        }

        return await apiClient.put(`/matches/${matchId}/finish`);
    },

    // Start match
    async startMatch(matchId) {
        if (USE_MOCK_DATA) {
            await mockDelay();

            const match = mockMatches.find(m => m.id === parseInt(matchId));
            if (!match) {
                throw new Error('Match not found');
            }

            match.startedAt = new Date();
            match.status = 'ONGOING';
            return match;
        }

        return await apiClient.put(`/matches/${matchId}/start`);
    },

    // Get available referees
    async getAvailableReferees() {
        if (USE_MOCK_DATA) {
            await mockDelay(200);
            // Return all users with REFEREE role
            const { mockUsers } = await import('./mockData');
            return mockUsers.filter(u => u.role === 'REFEREE').map(({ password, ...user }) => user);
        }

        return await apiClient.get('/users?role=REFEREE');
    },
};

export default matchesApi;
