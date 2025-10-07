import { predict, convert_sample_to_array } from '../server/model.js';
import { create_initial_state } from '../data/init.js';
import fs from 'fs';
import { assign_participant_stats_to_players, update_general_stats, update_with_event } from '../data/update.js';

const ranks = ['PLATINUM', 'EMERALD', 'DIAMOND'];

function contains_champions(state, champions, team_id) {
    for (const player of state.teams[team_id].players) {
        if (champions.includes(player.champion)) {
            return true;
        }
    }
    return false;
}

function total_kills(state) {
    let kills = 0;
    for (const team of state.teams) {
        for (const player of team.players) {
            kills += player.kills;
        }
    }
    return kills;
}

function update_until_event(state, frames, callback, n) {
    const count = [0, 0];
    for (const frame of frames) {
        if (count[0] + count[1] == 0) {
            assign_participant_stats_to_players(state, frame);
            update_general_stats(state);
        }
        for (const event of frame.events) {
            if (callback(event, state)) {
                const team_id = parseInt((event.killerId - 1) / 5);
                count[team_id]++;
                if (count[team_id] == n) {
                    return [true, team_id];
                }
            }
            if (count[0] + count[1] == 0) update_with_event(state, event, true);
        }
    }

    return [false, null];
}

async function calculate_wpa(callback, n_events) {
    let wpe = 0;
    let wr = 0;
    let samples = 0;

    for (const rank of ranks) {
        const files = fs.readdirSync(`./match_data/${rank}`);
        for (const file of files) {
            if (file == '.DS_Store') continue;

            const jsonString = fs.readFileSync(`./match_data/${rank}/${file}`, 'utf8');
            const data = JSON.parse(jsonString);

            const state = create_initial_state(data[0]);

            const [event_occured, team_id] = update_until_event(state, data[1].info.frames, callback, n_events);

            if (event_occured) {
                const vectorized = convert_sample_to_array(state);
                let prediction = await predict(vectorized);

                if (team_id == 1) {
                    prediction = 1 - prediction;
                }

                if ((team_id == 1 && !state.win) || (team_id == 0 && state.win)) {
                    wr += 1;
                }

                wpe += prediction;
                samples += 1;
            }
        }
    }

    return {
        wpe,
        wr,
        samples
    };
}

function round(x) {
    return Math.round(x * 10000) / 100;
}

function log(data, text) {
    let { wpe, wr, samples } = data;
    wpe /= samples;
    wr /= samples;

    const wpa = wr - wpe;

    console.log(`${text}: ${(wpa > 0 ? '+' : '') + round(wpa)}% (${round(wr)} - ${round(wpe)}) | ${samples}`);
}

async function main() {
    const rift_herald = await calculate_wpa((event, _) => event.type == 'ELITE_MONSTER_KILL' && event.monsterType == 'RIFTHERALD', 1);
    const baron_nashor = await calculate_wpa((event, _) => event.type == 'ELITE_MONSTER_KILL' && event.monsterType == 'BARON_NASHOR', 1);
    const atakhan = await calculate_wpa((event, _) => event.type == 'ELITE_MONSTER_KILL' && event.monsterType == 'ATAKHAN', 1);
    const first_dragon = await calculate_wpa((event, _) => event.type == 'ELITE_MONSTER_KILL' && event.monsterType == 'DRAGON', 1);
    const elder_dragon = await calculate_wpa((event, _) => event.type == 'ELITE_MONSTER_KILL' && event.monsterType == 'DRAGON' && event.monsterSubType == 'ELDER_DRAGON', 1);
    const dragon_soul = await calculate_wpa((event, _) => event.type == 'ELITE_MONSTER_KILL' && event.monsterType == 'DRAGON', 4);
    const void_grubs = await calculate_wpa((event, _) => event.type == 'ELITE_MONSTER_KILL' && event.monsterType == 'HORDE', 3);
    const first_blood = await calculate_wpa((event, _) => event.type == 'CHAMPION_KILL', 1);
    const first_tower = await calculate_wpa((event, _) => event.type == 'BUILDING_KILL' && event.buildingType == 'TOWER_BUILDING', 1);

    console.log('------------- Neutral Objective WPA -------------');

    log(rift_herald, 'Rift Herald');
    log(baron_nashor, 'Baron Nashor');
    log(atakhan, 'Atakhan');
    log(first_dragon, 'First Dragon');
    log(elder_dragon, 'Elder Dragon');
    log(dragon_soul, 'Dragon Soul');
    log(void_grubs, 'Void Grubs');
    log(first_blood, 'First Blood');
    log(first_tower, 'First Tower');

    const situational_void_grubs = await calculate_wpa((event, state) => event.type == 'ELITE_MONSTER_KILL' && event.monsterType == 'HORDE' && contains_champions(state, ['Fiora', 'Yorick', 'Jax', 'Tryndamere', 'Nasus', 'Trundle'], parseInt((event.killerId - 1) / 5)), 3);

    console.log('------------- Situational Neutral Objective WPA -------------');

    log(situational_void_grubs, 'Void Grubs + Splitpushers');

    const fb_top = await calculate_wpa((event, state) => event.type == 'CHAMPION_KILL' && (event.killerId - 1) % 5 == 0 && total_kills(state) == 0, 1);
    const fb_jgl = await calculate_wpa((event, state) => event.type == 'CHAMPION_KILL' && (event.killerId - 1) % 5 == 1 && total_kills(state) == 0, 1);
    const fb_mid = await calculate_wpa((event, state) => event.type == 'CHAMPION_KILL' && (event.killerId - 1) % 5 == 2 && total_kills(state) == 0, 1);
    const fb_adc = await calculate_wpa((event, state) => event.type == 'CHAMPION_KILL' && (event.killerId - 1) % 5 == 3 && total_kills(state) == 0, 1);
    const fb_sup = await calculate_wpa((event, state) => event.type == 'CHAMPION_KILL' && (event.killerId - 1) % 5 == 4 && total_kills(state) == 0, 1);

    console.log('------------- Per Role First Blood WPA -------------');

    log(fb_top, 'Top');
    log(fb_jgl, 'Jungle');
    log(fb_mid, 'Mid');
    log(fb_adc, 'Adc');
    log(fb_sup, 'Support');
}

main();
