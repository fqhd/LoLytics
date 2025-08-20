export function find_participant_with_puuid(participants, puuid) {
    for (const p of participants) {
        if (p.puuid === puuid) {
            return p;
        }
    }
    return null;
}

export function find_opponent(participants, player) {
    const position = player.teamPosition;
    for (const p of participants) {
        if (p.teamPosition === position && p.puuid !== player.puuid) {
            return p;
        }
    }
    return null;
}
