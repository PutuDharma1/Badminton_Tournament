import apiClient from './client';

// Participants API — calls the real Flask backend
export const participantsApi = {
    // Get participants for a tournament
    async getParticipants(tournamentId) {
        return await apiClient.get(`/api/participants/?tournamentId=${tournamentId}`);
    },

    // Add a participant (online user or offline walk-in)
    // Required fields: fullName, birthDate (ISO string), gender, tournamentId
    // Optional: email, phone, categoryId, userId (if linked to a User account)
    async addParticipant(tournamentId, participantData) {
        return await apiClient.post('/api/participants/', {
            ...participantData,
            tournamentId,
        });
    },

    // Remove participant
    async removeParticipant(participantId) {
        return await apiClient.delete(`/api/participants/${participantId}`);
    },

    // Self-register: logged-in PLAYER registers themselves into a tournament
    async selfRegister(data) {
        return await apiClient.post('/api/participants/self-register', data);
    },

    // Get all tournaments the logged-in player has joined
    async getMyTournaments() {
        return await apiClient.get('/api/participants/my-tournaments');
    },
};

export default participantsApi;

