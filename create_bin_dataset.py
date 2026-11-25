import json
from pathlib import Path

SRC = Path("dataset/test")
DST = Path("dataset/test_bin")
CHAMP_MAP = Path("champion_to_index.json")

EVENT_TYPES = [
    "CHAMPION_KILL",
    "BUILDING_KILL",
    "ELITE_MONSTER_KILL",
    "LEVEL_UP",
    "ITEM_PURCHASED",
    "ITEM_UNDO",
    "ITEM_DESTROYED",
    "ITEM_SOLD",
    "CHAMPION_TRANSFORM",
]
EVENT_TYPE_TO_ID = {name: i for i, name in enumerate(EVENT_TYPES)}

BUILDING_TYPES = {
    "TOWER_BUILDING": 0,
    "INHIBITOR_BUILDING": 1,
}

LANE_TYPES = {
    "TOP_LANE": 0,
    "MID_LANE": 1,
    "BOT_LANE": 2,
}

TOWER_TYPES = {
    "NEXUS_TURRET": 0,
    "BASE_TURRET": 1,
    "INNER_TURRET": 2,
    "OUTER_TURRET": 3,
}
NO_TOWER_TYPE = 0xFF

MONSTER_TYPES = {
    "DRAGON": 0,
    "RIFTHERALD": 1,
    "HORDE": 2,
    "BARON_NASHOR": 3,
}

MONSTER_SUB_TYPES = {
    "EARTH_DRAGON": 0,
    "AIR_DRAGON": 1,
    "CHEMTECH_DRAGON": 2,
    "HEXTECH_DRAGON": 3,
    "FIRE_DRAGON": 4,
    "WATER_DRAGON": 5,
    "ELDER_DRAGON": 6,
}
NO_MONSTER_SUB_TYPE = 0xFF

TRANSFORM_TYPES = {
    "ASSASSIN": 0,
    "SLAYER": 1,
}

ITEM_EVENT_TYPES = {"ITEM_PURCHASED", "ITEM_DESTROYED", "ITEM_SOLD"}

EVENT_BIN_SIZE = 25
ASSIST_SLOTS = 10


def event_to_bin(event):
    ev_type = event["type"]

    buf = bytearray()
    # 5-byte common header: type (uint8) + timestamp (int32)
    buf.append(EVENT_TYPE_TO_ID[ev_type])
    buf += event["timestamp"].to_bytes(4, "little", signed=True)

    if ev_type == "CHAMPION_KILL":
        assists = event.get("assistingParticipantIds", [])
        assert len(assists) <= ASSIST_SLOTS, \
            f"too many assists ({len(assists)}) in event: {event}"
        buf += bytes(assists) + bytes(ASSIST_SLOTS - len(assists))
        buf += event["bounty"].to_bytes(4, "little")
        buf.append(event["killerId"])
        buf += event["shutdownBounty"].to_bytes(4, "little")
        buf.append(event["victimId"])

    elif ev_type == "LEVEL_UP":
        buf.append(event["level"])
        buf.append(event["participantId"])

    elif ev_type in ITEM_EVENT_TYPES:
        buf += event["itemId"].to_bytes(4, "little")
        buf.append(event["participantId"])

    elif ev_type == "ITEM_UNDO":
        buf.append(event["participantId"])
        buf += event["goldGain"].to_bytes(4, "little", signed=True)
        buf += event["beforeId"].to_bytes(4, "little")
        buf += event["afterId"].to_bytes(4, "little")

    elif ev_type == "BUILDING_KILL":
        buf.append(BUILDING_TYPES[event["buildingType"]])
        buf.append(LANE_TYPES[event["laneType"]])
        team_id = event["teamId"]
        assert 0 <= team_id <= 0xFF, f"teamId out of uint8 range: {team_id}"
        buf.append(team_id)
        buf.append(event["killerId"])
        tower_type = event.get("towerType")
        buf.append(TOWER_TYPES[tower_type] if tower_type is not None
                   else NO_TOWER_TYPE)

    elif ev_type == "ELITE_MONSTER_KILL":
        buf.append(event["killerId"])
        buf.append(MONSTER_TYPES[event["monsterType"]])
        sub_type = event.get("monsterSubType")
        buf.append(MONSTER_SUB_TYPES[sub_type] if sub_type is not None
                   else NO_MONSTER_SUB_TYPE)

    elif ev_type == "CHAMPION_TRANSFORM":
        buf.append(event["participantId"])
        buf.append(TRANSFORM_TYPES[event["transformType"]])

    assert len(buf) <= EVENT_BIN_SIZE, \
        f"{ev_type} event overflowed {EVENT_BIN_SIZE} bytes ({len(buf)})"

    buf += bytes(EVENT_BIN_SIZE - len(buf))
    return bytes(buf)


def json_to_bin(data, champ_to_idx):
    buf = bytearray()

    for champ in data["champions"]:
        buf.append(champ_to_idx[champ])

    buf.append(1 if data["win"] else 0)

    events = data.get("events", [])
    buf += len(events).to_bytes(4, "little")

    for event in events:
        buf += event_to_bin(event)

    return bytes(buf)


def main():
    with CHAMP_MAP.open("r", encoding="utf-8") as f:
        champ_to_idx = json.load(f)

    for src_file in SRC.rglob("*.json"):
        rel = src_file.relative_to(SRC)
        dst_file = (DST / rel).with_suffix(".bin")
        dst_file.parent.mkdir(parents=True, exist_ok=True)

        with src_file.open("r", encoding="utf-8") as f:
            data = json.load(f)

        dst_file.write_bytes(json_to_bin(data, champ_to_idx))


if __name__ == "__main__":
    main()
