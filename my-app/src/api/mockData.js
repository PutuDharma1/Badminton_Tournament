// Mock data for development without backend
// This simulates the backend database

// Mock Users
export const mockUsers = [
    {
        id: 1,
        name: 'John Committee',
        email: 'committee@test.com',
        password: 'password', // In real app, this would be hashed
        role: 'COMMITTEE',
        createdAt: new Date('2024-01-15'),
    },
    {
        id: 2,
        name: 'Sarah Referee',
        email: 'referee@test.com',
        password: 'password',
        role: 'REFEREE',
        createdAt: new Date('2024-01-20'),
    },
    {
        id: 3,
        name: 'Mike Player',
        email: 'player@test.com',
        password: 'password',
        role: 'PLAYER',
        birthDate: new Date('2000-05-15'),
        gender: 'MALE',
        phone: '+1234567890',
        createdAt: new Date('2024-02-01'),
    },
    {
        id: 4,
        name: 'Lisa Johnson',
        email: 'lisa@test.com',
        password: 'password',
        role: 'PLAYER',
        birthDate: new Date('1998-08-22'),
        gender: 'FEMALE',
        phone: '+1234567891',
        createdAt: new Date('2024-02-05'),
    },
    {
        id: 5,
        name: 'Tom Wilson',
        email: 'tom@test.com',
        password: 'password',
        role: 'PLAYER',
        birthDate: new Date('2001-03-10'),
        gender: 'MALE',
        phone: '+1234567892',
        createdAt: new Date('2024-02-10'),
    },
    {
        id: 6,
        name: 'Emma Davis',
        email: 'emma@test.com',
        password: 'password',
        role: 'PLAYER',
        birthDate: new Date('1999-07-18'),
        gender: 'FEMALE',
        phone: '+1234567893',
        createdAt: new Date('2024-02-12'),
    },
    {
        id: 7,
        name: 'James Brown',
        email: 'james@test.com',
        password: 'password',
        role: 'PLAYER',
        birthDate: new Date('2000-11-25'),
        gender: 'MALE',
        phone: '+1234567894',
        createdAt: new Date('2024-02-15'),
    },
    {
        id: 8,
        name: 'Sophia Martinez',
        email: 'sophia@test.com',
        password: 'password',
        role: 'PLAYER',
        birthDate: new Date('1997-04-30'),
        gender: 'FEMALE',
        phone: '+1234567895',
        createdAt: new Date('2024-02-18'),
    },
    {
        id: 9,
        name: 'David Lee',
        email: 'david@test.com',
        password: 'password',
        role: 'PLAYER',
        birthDate: new Date('2001-09-12'),
        gender: 'MALE',
        phone: '+1234567896',
        createdAt: new Date('2024-02-20'),
    },
    {
        id: 10,
        name: 'Olivia Garcia',
        email: 'olivia@test.com',
        password: 'password',
        role: 'PLAYER',
        birthDate: new Date('1998-02-08'),
        gender: 'FEMALE',
        phone: '+1234567897',
        createdAt: new Date('2024-02-22'),
    },
    {
        id: 11,
        name: 'Robert Chen',
        email: 'robert@test.com',
        password: 'password',
        role: 'REFEREE',
        createdAt: new Date('2024-01-25'),
    },
];

// Mock Tournaments
export const mockTournaments = [
    {
        id: 1,
        name: 'Spring Championship 2024',
        location: 'GOR Senayan, Jakarta',
        startDate: '2024-06-15',
        endDate: '2024-06-20',
        registrationDeadline: '2024-06-10',
        description: 'Annual spring badminton championship - DRAFT with 8 players ready to start',
        status: 'DRAFT',
        createdById: 1,
        courts: 8,
        createdAt: new Date('2024-03-01'),
    },
    {
        id: 2,
        name: 'Summer Open 2024',
        location: 'GOR Cempaka, Bandung',
        startDate: '2024-07-20',
        endDate: '2024-07-25',
        registrationDeadline: '2024-07-15',
        description: 'Open tournament for all levels - ONGOING with matches',
        status: 'ONGOING',
        createdById: 1,
        courts: 6,
        createdAt: new Date('2024-05-15'),
    },
];

// Mock Participants
export const mockParticipants = [
    // Tournament 1 (DRAFT) - 8 players ready to start
    { id: 1, userId: 3, tournamentId: 1, categoryId: 1, isActive: true },
    { id: 2, userId: 4, tournamentId: 1, categoryId: 1, isActive: true },
    { id: 3, userId: 5, tournamentId: 1, categoryId: 1, isActive: true },
    { id: 4, userId: 6, tournamentId: 1, categoryId: 1, isActive: true },
    { id: 5, userId: 7, tournamentId: 1, categoryId: 1, isActive: true },
    { id: 6, userId: 8, tournamentId: 1, categoryId: 1, isActive: true },
    { id: 7, userId: 9, tournamentId: 1, categoryId: 1, isActive: true },
    { id: 8, userId: 10, tournamentId: 1, categoryId: 1, isActive: true },

    // Tournament 2 (ONGOING) - participants with ongoing matches
    { id: 9, userId: 3, tournamentId: 2, categoryId: 1, isActive: true },
    { id: 10, userId: 4, tournamentId: 2, categoryId: 1, isActive: true },
    { id: 11, userId: 5, tournamentId: 2, categoryId: 1, isActive: true },
    { id: 12, userId: 6, tournamentId: 2, categoryId: 1, isActive: true },

    // Offline participant for Tournament 2
    {
        id: 13,
        userId: null,
        offlineName: 'Alex Brown',
        offlineBirthDate: new Date('1999-11-30'),
        offlineGender: 'MALE',
        offlinePhone: '+1234567893',
        tournamentId: 2,
        categoryId: 1,
        isActive: true,
    },
];

// Mock Categories
export const mockCategories = [
    {
        id: 1,
        name: 'Men Singles Open',
        gender: 'MALE',
        level: 'INTERMEDIATE',
        minAge: 18,
        maxAge: 40,
        tournamentId: 1,
    },
    {
        id: 2,
        name: 'Women Singles Open',
        gender: 'FEMALE',
        level: 'INTERMEDIATE',
        minAge: 18,
        maxAge: 40,
        tournamentId: 1,
    },
];

// Mock Matches
export const mockMatches = [
    // Tournament 2 (ONGOING) matches
    {
        id: 1,
        tournamentId: 2,
        categoryId: 1,
        round: 1,
        groupCode: 'A',
        scheduledAt: new Date('2024-07-20T09:00:00'),
        startedAt: new Date('2024-07-20T09:05:00'),
        finishedAt: new Date('2024-07-20T09:45:00'),
        status: 'FINISHED',
        homeTeamId: 9,
        awayTeamId: 10,
        homeScore: 21,
        awayScore: 18,
        refereeId: 2,
        courtId: 1,
    },
    {
        id: 2,
        tournamentId: 2,
        categoryId: 1,
        round: 1,
        groupCode: 'A',
        scheduledAt: new Date('2024-07-20T10:00:00'),
        startedAt: new Date('2024-07-20T10:05:00'),
        finishedAt: null,
        status: 'ONGOING',
        homeTeamId: 11,
        awayTeamId: 12,
        homeScore: 15,
        awayScore: 12,
        refereeId: 2,
        courtId: 2,
    },
    {
        id: 3,
        tournamentId: 2,
        categoryId: 1,
        round: 1,
        groupCode: 'A',
        scheduledAt: new Date('2024-07-20T11:00:00'),
        startedAt: null,
        finishedAt: null,
        status: 'SCHEDULED',
        homeTeamId: 9,
        awayTeamId: 11,
        homeScore: null,
        awayScore: null,
        refereeId: 11,
        courtId: 3,
    },
    {
        id: 4,
        tournamentId: 2,
        categoryId: 1,
        round: 1,
        groupCode: 'A',
        scheduledAt: new Date('2024-07-20T11:00:00'),
        startedAt: null,
        finishedAt: null,
        status: 'SCHEDULED',
        homeTeamId: 10,
        awayTeamId: 12,
        homeScore: null,
        awayScore: null,
        refereeId: null,
        courtId: 4,
    },
    {
        id: 5,
        tournamentId: 2,
        categoryId: 1,
        round: 1,
        groupCode: 'A',
        scheduledAt: new Date('2024-07-20T12:00:00'),
        startedAt: null,
        finishedAt: null,
        status: 'SCHEDULED',
        homeTeamId: 9,
        awayTeamId: 13,
        homeScore: null,
        awayScore: null,
        refereeId: null,
        courtId: null,
    },
];

// Helper to generate JWT-like token (just for mock)
export const generateMockToken = (userId) => {
    return `mock-token-${userId}-${Date.now()}`;
};

// Helper to find user by email and password
export const findUserByCredentials = (email, password) => {
    return mockUsers.find(u => u.email === email && u.password === password);
};

// Helper to find user by id
export const findUserById = (id) => {
    return mockUsers.find(u => u.id === id);
};

// Helper to add new user
export const addMockUser = (userData) => {
    const newUser = {
        id: mockUsers.length + 1,
        ...userData,
        createdAt: new Date(),
    };
    mockUsers.push(newUser);
    return newUser;
};

// Helper to get tournaments
export const getMockTournaments = () => {
    return mockTournaments.map(t => ({
        ...t,
        participantCount: mockParticipants.filter(p => p.tournamentId === t.id).length,
    }));
};

// Helper to get tournament by id
export const getMockTournamentById = (id) => {
    const tournament = mockTournaments.find(t => t.id === id);
    if (!tournament) return null;

    return {
        ...tournament,
        participants: mockParticipants
            .filter(p => p.tournamentId === id)
            .map(p => {
                if (p.userId) {
                    const user = findUserById(p.userId);
                    return { ...p, user };
                }
                return p;
            }),
        matches: mockMatches.filter(m => m.tournamentId === id),
    };
};

// Helper to add tournament
export const addMockTournament = (tournamentData) => {
    const newTournament = {
        id: mockTournaments.length + 1,
        ...tournamentData,
        status: 'DRAFT',
        createdAt: new Date(),
    };
    mockTournaments.push(newTournament);
    return newTournament;
};

// Helper to update tournament
export const updateMockTournament = (id, updates) => {
    const index = mockTournaments.findIndex(t => t.id === id);
    if (index === -1) return null;

    mockTournaments[index] = {
        ...mockTournaments[index],
        ...updates,
    };
    return mockTournaments[index];
};

// Helper to delete tournament
export const deleteMockTournament = (id) => {
    const index = mockTournaments.findIndex(t => t.id === id);
    if (index === -1) return false;

    mockTournaments.splice(index, 1);
    // Also delete related participants and matches
    const participantIndices = mockParticipants
        .map((p, i) => p.tournamentId === id ? i : -1)
        .filter(i => i !== -1)
        .reverse();
    participantIndices.forEach(i => mockParticipants.splice(i, 1));

    const matchIndices = mockMatches
        .map((m, i) => m.tournamentId === id ? i : -1)
        .filter(i => i !== -1)
        .reverse();
    matchIndices.forEach(i => mockMatches.splice(i, 1));

    return true;
};

export default {
    mockUsers,
    mockTournaments,
    mockParticipants,
    mockCategories,
    mockMatches,
    generateMockToken,
    findUserByCredentials,
    findUserById,
    addMockUser,
    getMockTournaments,
    getMockTournamentById,
    addMockTournament,
    updateMockTournament,
    deleteMockTournament,
};
