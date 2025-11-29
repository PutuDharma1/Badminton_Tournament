import apiClient from './client';
import { mockParticipants, mockUsers, findUserById } from './mockData';

// Check if we should use mock data
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

// Simulate network delay
const mockDelay = (ms = 400) => new Promise(resolve => setTimeout(resolve, ms));

// Participants API calls
export const participantsApi = {
    // Get participants for a tournament
    async getParticipants(tournamentId) {
        if (USE_MOCK_DATA) {
            await mockDelay();
            const participants = mockParticipants
                .filter(p => p.tournamentId === parseInt(tournamentId))
                .map(p => {
                    if (p.userId) {
                        const user = findUserById(p.userId);
                        return { ...p, user };
                    }
                    return p;
                });
            return participants;
        }

        return await apiClient.get(`/tournaments/${tournamentId}/participants`);
    },

    // Add online participant (registered user)
    async addOnlineParticipant(tournamentId, userId) {
        if (USE_MOCK_DATA) {
            await mockDelay();

            const user = findUserById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Check if already registered
            const existing = mockParticipants.find(
                p => p.tournamentId === parseInt(tournamentId) && p.userId === userId
            );
            if (existing) {
                throw new Error('User already registered for this tournament');
            }

            const newParticipant = {
                id: mockParticipants.length + 1,
                userId: userId,
                tournamentId: parseInt(tournamentId),
                categoryId: null,
                isActive: true,
                user,
            };

            mockParticipants.push(newParticipant);
            return newParticipant;
        }

        return await apiClient.post(`/tournaments/${tournamentId}/participants/online`, { userId });
    },

    // Add offline participant (non-registered player)
    async addOfflineParticipant(tournamentId, participantData) {
        if (USE_MOCK_DATA) {
            await mockDelay();

            const newParticipant = {
                id: mockParticipants.length + 1,
                userId: null,
                offlineName: participantData.offlineName,
                offlineBirthDate: new Date(participantData.offlineBirthDate),
                offlineGender: participantData.offlineGender,
                offlinePhone: participantData.offlinePhone || null,
                tournamentId: parseInt(tournamentId),
                categoryId: null,
                isActive: true,
            };

            mockParticipants.push(newParticipant);
            return newParticipant;
        }

        return await apiClient.post(`/tournaments/${tournamentId}/participants/offline`, participantData);
    },

    // Remove participant
    async removeParticipant(tournamentId, participantId) {
        if (USE_MOCK_DATA) {
            await mockDelay();

            const index = mockParticipants.findIndex(
                p => p.id === parseInt(participantId) && p.tournamentId === parseInt(tournamentId)
            );

            if (index === -1) {
                throw new Error('Participant not found');
            }

            mockParticipants.splice(index, 1);
            return { message: 'Participant removed' };
        }

        return await apiClient.delete(`/tournaments/${tournamentId}/participants/${participantId}`);
    },

    // Search registered users (for online registration)
    async searchUsers(query) {
        if (USE_MOCK_DATA) {
            await mockDelay(200);

            const lowerQuery = query.toLowerCase();
            const results = mockUsers
                .filter(u =>
                    u.role === 'PLAYER' &&
                    (u.name.toLowerCase().includes(lowerQuery) || u.email.toLowerCase().includes(lowerQuery))
                )
                .map(({ password, ...user }) => user); // Remove password from results

            return results;
        }

        return await apiClient.get(`/users/search?q=${query}&role=PLAYER`);
    },
};

export default participantsApi;
