// Round-robin match generation utility

/**
 * Generate round-robin matches for a list of participants
 * @param {Array} participants - Array of participant objects
 * @param {Number} tournamentId - Tournament ID
 * @param {Number} categoryId - Category ID
 * @returns {Array} Array of match objects
 */
export function generateRoundRobinMatches(participants, tournamentId, categoryId = 1) {
    if (!participants || participants.length < 2) {
        return [];
    }

    const matches = [];
    let matchId = Date.now();

    // Create all possible pairings (round-robin)
    for (let i = 0; i < participants.length; i++) {
        for (let j = i + 1; j < participants.length; j++) {
            const match = {
                id: matchId++,
                tournamentId,
                categoryId,
                round: 1, // For now, all matches are round 1
                groupCode: 'A', // For now, single group
                scheduledAt: null,
                startedAt: null,
                finishedAt: null,
                status: 'SCHEDULED',
                homeTeamId: participants[i].id,
                awayTeamId: participants[j].id,
                homeTeam: participants[i],
                awayTeam: participants[j],
                homeScore: null,
                awayScore: null,
                refereeId: null,
                referee: null,
                courtId: null,
            };
            matches.push(match);
        }
    }

    return matches;
}

/**
 * Calculate total matches needed for round-robin
 * Formula: n * (n - 1) / 2, where n is number of participants
 */
export function calculateTotalMatches(participantCount) {
    return (participantCount * (participantCount - 1)) / 2;
}

/**
 * Validate if participant count is suitable for round-robin
 * For this app: must be multiple of 8
 */
export function validateParticipantCount(count) {
    if (count < 3) {
        return { valid: false, message: `Need at least 3 participants. Currently have ${count}.` };
    }

    return { valid: true, message: 'Participant count is valid' };
}

/**
 * Group participants by category (for future use)
 */
export function groupParticipantsByCategory(participants) {
    return participants.reduce((groups, participant) => {
        const category = participant.categoryId || 'uncategorized';
        if (!groups[category]) {
            groups[category] = [];
        }
        groups[category].push(participant);
        return groups;
    }, {});
}

export default {
    generateRoundRobinMatches,
    calculateTotalMatches,
    validateParticipantCount,
    groupParticipantsByCategory,
};
