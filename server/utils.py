def find_participant_with_puuid(participants, puuid):
    for p in participants:
        if p.get('puuid') == puuid:
            return p
    return None

def find_opponent(participants, player):
    if not player:
        return None

    position = player.get('teamPosition')

    for p in participants:
        if (
            p.get('teamPosition') == position
            and p.get('puuid') != player.get('puuid')
        ):
            return p

    return None

def calculate_deltas(nums):
    deltas = []
    for i in range(len(nums) // 2):
        index = i * 2
        n1 = nums[index]
        n2 = nums[index+1]
        d = n2 - n1
        deltas.append(d)
    return deltas
