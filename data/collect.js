import fs from 'fs';
import { parse_env_file, sleep, shuffle } from './utils.js';

let all_ids = [];

const env = parse_env_file('.env');

async function get_rank_ids(tier, division) {
    if (tier == 'CHALLENGER') {
        await sleep(1300);
        let response = await fetch(`https://euw1.api.riotgames.com/lol/league/v4/challengerleagues/by-queue/RANKED_SOLO_5x5?api_key=${env.RIOT_KEY}`);
        response = await response.json();
        return response.entries.map(x => x.puuid);
    } else if (tier == 'GRANDMASTER') {
        await sleep(1300);
        let response = await fetch(`https://euw1.api.riotgames.com/lol/league/v4/grandmasterleagues/by-queue/RANKED_SOLO_5x5?api_key=${env.RIOT_KEY}`);
        response = await response.json();
        return response.entries.map(x => x.puuid);
    } else if (tier == 'MASTER') {
        await sleep(1300);
        let response = await fetch(`https://euw1.api.riotgames.com/lol/league/v4/masterleagues/by-queue/RANKED_SOLO_5x5?api_key=${env.RIOT_KEY}`);
        response = await response.json();
        shuffle(response.entries);
        return response.entries.map(x => x.puuid).slice(0, 1400);
    } else {
        let ids = [];
        for (let page = 1; page < 4; page++) {
            await sleep(1300);
            let response = await fetch(`https://euw1.api.riotgames.com/lol/league/v4/entries/RANKED_SOLO_5x5/${tier}/${division}?page=${page}&api_key=${env.RIOT_KEY}`);
            response = await response.json();
            ids = ids.concat(response);
        }
        return ids.map(x => x.puuid);
    }
}

for (const tier of ['MASTER', 'GRANDMASTER', 'CHALLENGER']) {
    const division = 'I';
    const ids = await get_rank_ids(tier, division);
    all_ids = all_ids.concat(ids.map(v => [tier, division, v]));
}

for (const tier of ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND']) {
    for (const division of ['I', 'II', 'III', 'IV']) {
        const ids = await get_rank_ids(tier, division);
        all_ids = all_ids.concat(ids.map(v => [tier, division, v]));
    }
}

shuffle(all_ids);

console.log(`Found ${all_ids.length} users, or approx. ${all_ids.length * 19} matches.`);

const matches = [];

for (const [tier, division, puuid] of all_ids) {
    try {
        await sleep(100);
        let response = await fetch(`https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?queue=420&start=0&count=20&api_key=${env.RIOT_KEY}`);
        response = await response.json();
        for (const match_id of response) {
            matches.push({ tier, division, match_id });
        }
    } catch (e) {
        console.error(`Failed to fetch ids for ${tier},${division},${puuid}`);
    }
}

const seen = new Set();
const deduped = matches.filter(o => !seen.has(o.match_id) && seen.add(o.match_id));

let csv = 'match_id,rank,tier\n';

for (const {tier, division, match_id} of deduped) {
    csv += `${match_id},${tier},${division}\n`;
}

fs.writeFileSync('match_ids.csv', csv, 'utf8');
