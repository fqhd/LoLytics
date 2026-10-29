import fs from 'fs';

const CHAMPION_TO_INDEX = JSON.parse(
    fs.readFileSync('champion_to_index.json', 'utf8')
);

const EVENT_TYPES = [
    'CHAMPION_KILL',
    'BUILDING_KILL',
    'ELITE_MONSTER_KILL',
    'LEVEL_UP',
    'ITEM_PURCHASED',
    'ITEM_UNDO',
    'ITEM_DESTROYED',
    'ITEM_SOLD',
    'CHAMPION_TRANSFORM',
];
const EVENT_TYPE_TO_ID = Object.fromEntries(EVENT_TYPES.map((n, i) => [n, i]));

const BUILDING_TYPES = { TOWER_BUILDING: 0, INHIBITOR_BUILDING: 1 };
const LANE_TYPES     = { TOP_LANE: 0, MID_LANE: 1, BOT_LANE: 2 };
const TOWER_TYPES    = { NEXUS_TURRET: 0, BASE_TURRET: 1, INNER_TURRET: 2, OUTER_TURRET: 3 };
const NO_TOWER_TYPE  = 0xFF;
const MONSTER_TYPES  = { DRAGON: 0, RIFTHERALD: 1, HORDE: 2, BARON_NASHOR: 3 };
const MONSTER_SUB_TYPES = {
    EARTH_DRAGON: 0, AIR_DRAGON: 1, CHEMTECH_DRAGON: 2, HEXTECH_DRAGON: 3,
    FIRE_DRAGON: 4, WATER_DRAGON: 5, ELDER_DRAGON: 6,
};
const NO_MONSTER_SUB_TYPE = 0xFF;
const TRANSFORM_TYPES     = { ASSASSIN: 0, SLAYER: 1 };
const ITEM_EVENT_TYPES    = new Set(['ITEM_PURCHASED', 'ITEM_DESTROYED', 'ITEM_SOLD']);

const EVENT_BIN_SIZE = 25;
const ASSIST_SLOTS   = 10;

const SERIALIZABLE_TYPES = new Set(EVENT_TYPES);

function eventToBin(event) {
    const buf = Buffer.alloc(EVENT_BIN_SIZE, 0);

    buf.writeUInt8(EVENT_TYPE_TO_ID[event.type], 0);
    buf.writeInt32LE(event.timestamp | 0, 1);
    let off = 5;

    if (event.type === 'CHAMPION_KILL') {
        const assists = event.assistingParticipantIds || [];
        if (assists.length > ASSIST_SLOTS) {
            throw new Error(`Too many assists (${assists.length})`);
        }
        for (let i = 0; i < assists.length; i++) {
            buf.writeUInt8(assists[i], 5 + i);
        }
        off = 5 + ASSIST_SLOTS;                          // 15
        buf.writeUInt32LE(event.bounty || 0, off); off += 4;
        buf.writeUInt8(event.killerId || 0, off); off += 1;
        buf.writeUInt32LE(event.shutdownBounty || 0, off); off += 4;
        buf.writeUInt8(event.victimId || 0, off); off += 1;
    }
    else if (event.type === 'LEVEL_UP') {
        buf.writeUInt8(event.level, off); off += 1;
        buf.writeUInt8(event.participantId, off); off += 1;
    }
    else if (ITEM_EVENT_TYPES.has(event.type)) {
        buf.writeUInt32LE(event.itemId, off); off += 4;
        buf.writeUInt8(event.participantId, off); off += 1;
    }
    else if (event.type === 'ITEM_UNDO') {
        buf.writeUInt8(event.participantId, off); off += 1;
        buf.writeInt32LE(event.goldGain | 0, off); off += 4;
        buf.writeUInt32LE(event.beforeId, off); off += 4;
        buf.writeUInt32LE(event.afterId, off); off += 4;
    }
    else if (event.type === 'BUILDING_KILL') {
        buf.writeUInt8(BUILDING_TYPES[event.buildingType], off); off += 1;
        buf.writeUInt8(LANE_TYPES[event.laneType], off); off += 1;
        buf.writeUInt8(event.teamId, off); off += 1;
        buf.writeUInt8(event.killerId, off); off += 1;
        buf.writeUInt8(
            event.towerType != null ? TOWER_TYPES[event.towerType] : NO_TOWER_TYPE,
            off,
        );
        off += 1;
    }
    else if (event.type === 'ELITE_MONSTER_KILL') {
        buf.writeUInt8(event.killerId, off); off += 1;
        buf.writeUInt8(MONSTER_TYPES[event.monsterType], off); off += 1;
        buf.writeUInt8(
            event.monsterSubType != null ? MONSTER_SUB_TYPES[event.monsterSubType]
                                         : NO_MONSTER_SUB_TYPE,
            off,
        );
        off += 1;
    }
    else if (event.type === 'CHAMPION_TRANSFORM') {
        buf.writeUInt8(event.participantId, off); off += 1;
        buf.writeUInt8(TRANSFORM_TYPES[event.transformType], off); off += 1;
    }
    else {
        throw new Error(`Unserializable event type: ${event.type}`);
    }

    return buf;
}

export function serializeGame(champions, win, events) {
    const champBytes = Buffer.alloc(champions.length);
    for (let i = 0; i < champions.length; i++) {
        const idx = CHAMPION_TO_INDEX[champions[i]];
        if (idx == null) throw new Error(`Unknown champion: ${champions[i]}`);
        champBytes[i] = idx;
    }

    const header = Buffer.alloc(5);
    header.writeUInt8(win ? 1 : 0, 0);
    header.writeUInt32LE(events.length, 1);

    const parts = [champBytes, header];
    for (const ev of events) parts.push(eventToBin(ev));
    return Buffer.concat(parts);
}

export async function get_game_data(MATCH_ID, key) {
    try {
        let game = await fetch(
            `https://europe.api.riotgames.com/lol/match/v5/matches/${MATCH_ID}?api_key=${key}`
        );
        game = await game.json();

        const gameDate = new Date(game.info.gameEndTimestamp);
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        if (gameDate < oneMonthAgo) return null;

        let timeline = await fetch(
            `https://europe.api.riotgames.com/lol/match/v5/matches/${MATCH_ID}/timeline?api_key=${key}`
        );
        timeline = await timeline.json();

        const champions = [];
        for (const participant of game.info.participants) {
            champions.push(participant.championName);
        }
        const win = game.info.participants[0].win;      // participant 0 is always blue

        function is_strong_event(event) {
            if (event.type === 'ELITE_MONSTER_KILL' && event.killerId === 0) {
                return false;
            }
            return SERIALIZABLE_TYPES.has(event.type);
        }

        const events = [];
        for (const frame of timeline.info.frames) {
            for (const event of frame.events) {
                if (event.type === 'CHAMPION_KILL') {
                    try {
                        delete event.victimDamageDealt;
                        delete event.victimDamageReceived;
                        delete event.victimTeamfightDamageDealt;
                        delete event.victimTeamfightDamageReceived;
                    } catch (e) { /* noop */ }
                }
                if (is_strong_event(event)) events.push(event);
            }
        }

        const binary = serializeGame(champions, win, events);

        return { binary, match: game };
    } catch (e) {
        return null;
    }
}