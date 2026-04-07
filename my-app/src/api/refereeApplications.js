import apiClient from './client';

const refereeApplicationsApi = {
  /** Referee: apply to a tournament */
  apply: (tournamentId, message = '') =>
    apiClient.post('/api/referee-applications/', { tournamentId, message }),

  /** Referee: view own applications */
  myApplications: () =>
    apiClient.get('/api/referee-applications/my-applications'),

  /** Committee: view all applications for a tournament (optional status filter) */
  getTournamentApplications: (tournamentId, status = '') =>
    apiClient.get(
      `/api/referee-applications/tournament/${tournamentId}${status ? `?status=${status}` : ''}`
    ),

  /** Committee: accept or reject an application */
  review: (appId, action, rejectionReason = '') =>
    apiClient.put(`/api/referee-applications/${appId}/review`, {
      action,
      rejectionReason,
    }),

  /** Committee: directly add a referee to a tournament */
  directAdd: (tournamentId, refereeId) =>
    apiClient.post(`/api/referee-applications/tournament/${tournamentId}/add`, {
      refereeId,
    }),

  /** Committee: remove an accepted referee from a tournament */
  removeReferee: (tournamentId, refereeId) =>
    apiClient.delete(
      `/api/referee-applications/tournament/${tournamentId}/remove/${refereeId}`
    ),
};

export default refereeApplicationsApi;
