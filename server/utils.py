def find_participant_with_puuid(participants, puuid):
    for p in participants:
        if p.get("puuid") == puuid:
            return p
    return None


def find_opponent(participants, player):
    if not player:
        return None

    position = player.get("teamPosition")

    for p in participants:
        if (
            p.get("teamPosition") == position
            and p.get("puuid") != player.get("puuid")
        ):
            return p

    return None
