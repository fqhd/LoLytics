import fs from 'fs';
import { get_ids, get_match_id_batch } from './match_ids.js';
import { API_KEYS } from './api_keys.js';

let all_games = [];

let promises = [];

for (const rank of ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND']) {
    for (const tier of ['I', 'II', 'III', 'IV']) {
        promises.push(get_ids(rank, tier, API_KEYS[promises.length]));
        if (promises.length >= API_KEYS.length) {
            const results = await Promise.all(promises);
            all_games = all_games.concat(...results);
            promises = [];
        }
    }
}

if (promises.length > 0) {
    const results = await Promise.all(promises);
    all_games = all_games.concat(...results);
    promises = [];
}

let match_ids = await get_match_id_batch('MASTER', undefined, undefined, API_KEYS[0]);
for (const id of match_ids) {
    all_games.push({
        match_id: id,
        rank: 'MASTER',
    });
}

const seen = new Set();
const deduped = all_games.filter(o => !seen.has(o.match_id) && seen.add(o.match_id));

let csv = 'match_id,rank,tier\n';

for (const obj of deduped) {
    const match_id = obj.match_id;
    const rank = obj.rank;
    const tier = obj.tier ?? '';

    csv += `${match_id},${rank},${tier}\n`;
}

fs.writeFileSync('match_ids.csv', csv, 'utf8');
