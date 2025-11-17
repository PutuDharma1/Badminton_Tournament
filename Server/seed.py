from prisma import Prisma
from datetime import datetime

db = Prisma()


def main():
    db.connect()

    # ==========================
    # 1. User (Admin, Committee, Referee)
    # ==========================
    admin = db.user.create(
        data={
            "name": "Admin Sistem",
            "email": "admin@sporthive.com",
            "password": "admin123",
            "role": "ADMIN",
        }
    )

    referee = db.user.create(
        data={
            "name": "Referee A",
            "email": "referee@sporthive.com",
            "password": "ref123",
            "role": "REFEREE",
        }
    )

    committee = db.user.create(
        data={
            "name": "Committee A",
            "email": "committee@sporthive.com",
            "password": "com123",
            "role": "COMMITTEE",
        }
    )

    # ==========================
    # 2. Tournament
    # ==========================
    tournament = db.tournament.create(
        data={
            "name": "SportHive Badminton Championship",
            "location": "Jakarta Nation Hall",
            "startDate": datetime(2025, 2, 10),
            "endDate": datetime(2025, 2, 12),
            "description": "Turnamen resmi SportHive level nasional.",
            "createdById": admin.id,
        }
    )

    # ==========================
    # 3. Category
    # ==========================
    category_u17_boys = db.category.create(
        data={
            "name": "U17 Boys Intermediate",
            "gender": "MALE",
            "level": "INTERMEDIATE",
            "minAge": 13,
            "maxAge": 17,
            "tournamentId": tournament.id,
        }
    )

    category_u17_girls = db.category.create(
        data={
            "name": "U17 Girls Intermediate",
            "gender": "FEMALE",
            "level": "INTERMEDIATE",
            "minAge": 13,
            "maxAge": 17,
            "tournamentId": tournament.id,
        }
    )

    # ==========================
    # 4. Participants
    # ==========================
    p1 = db.participant.create(
        data={
            "fullName": "Joko Widodo",
            "birthDate": datetime(2009, 7, 1),
            "gender": "MALE",
            "email": "jokowi@eradigital.com",
            "phone": "08123456789",
            "tournamentId": tournament.id,
            "categoryId": category_u17_boys.id,
        }
    )

    p2 = db.participant.create(
        data={
            "fullName": "Roy Suryo",
            "birthDate": datetime(2008, 12, 20),
            "gender": "MALE",
            "email": "haters@owi.com",
            "phone": "0899123456",
            "tournamentId": tournament.id,
            "categoryId": category_u17_boys.id,
        }
    )

    p3 = db.participant.create(
        data={
            "fullName": "Megawati Soekarnopoetri",
            "birthDate": datetime(2009, 5, 10),
            "gender": "FEMALE",
            "email": "megachan@pdip.com",
            "phone": "0877777777",
            "tournamentId": tournament.id,
            "categoryId": category_u17_girls.id,
        }
    )

    # ==========================
    # 5. Teams (Single = 1 player per team)
    # ==========================
    team1 = db.team.create(
        data={
            "name": "Team Owi",
            "tournamentId": tournament.id,
            "categoryId": category_u17_boys.id,
            "players": {
                "create": [{"participantId": p1.id}],
            },
        }
    )

    team2 = db.team.create(
        data={
            "name": "Team Suryo",
            "tournamentId": tournament.id,
            "categoryId": category_u17_boys.id,
            "players": {
                "create": [{"participantId": p2.id}],
            },
        }
    )

    team3 = db.team.create(
        data={
            "name": "Team Mega",
            "tournamentId": tournament.id,
            "categoryId": category_u17_girls.id,
            "players": {
                "create": [{"participantId": p3.id}],
            },
        }
    )

    # ==========================
    # 6. Courts
    # ==========================
    court1 = db.court.create(
        data={
            "name": "Court 1",
            "locationNote": "Main Hall A",
            "tournamentId": tournament.id,
        }
    )

    court2 = db.court.create(
        data={
            "name": "Court 2",
            "locationNote": "Main Hall B",
            "tournamentId": tournament.id,
        }
    )

    # ==========================
    # 7. Match (contoh 1 match)
    # ==========================
    match1 = db.match.create(
        data={
            "round": 1,
            "groupCode": "A",
            "scheduledAt": datetime(2025, 2, 10, 9, 0),
            "status": "SCHEDULED",
            "tournamentId": tournament.id,
            "categoryId": category_u17_boys.id,
            "homeTeamId": team1.id,
            "awayTeamId": team2.id,
            "courtId": court1.id,
            "refereeId": referee.id,
        }
    )

    print("Seed data berhasil dimasukkan!")

    db.disconnect()


if __name__ == "__main__":
    main()
