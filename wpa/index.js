import { predict, convert_sample_to_array } from '../server/model.js';
import { create_initial_state } from '../data/init.js';
import fs from 'fs';
import { assign_participant_stats_to_players, update_general_stats, update_with_event } from '../data/update.js';

const ranks = ['PLATINUM', 'EMERALD', 'DIAMOND'];

let wpe = 0;
let wr = 0;
let total = 0;

for (const rank of ranks) {
    const files = fs.readdirSync(`./match_data/${rank}`);
    for (const file of files) {
        if (file == '.DS_Store') continue;

        const jsonString = fs.readFileSync(`./match_data/${rank}/${file}`, 'utf8');
        const data = JSON.parse(jsonString);

        const state = create_initial_state(data[0]);

        const [event_occured, team_id] = update_until_event(state, data[1].info.frames);

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
            total += 1;
            if (total % 100 == 0) {
                console.log(total);
            }
        }
    }
}

console.log(wpe / total);
console.log(wr / total);

function update_until_event(state, frames) {
    for (const frame of frames) {
        assign_participant_stats_to_players(state, frame);
        update_general_stats(state);
        for (const event of frame.events) {
            if (event.type == 'ELITE_MONSTER_KILL' && event.monsterType == 'RIFTHERALD') {
	            const team_id = parseInt((event.killerId - 1) / 5);
                return [true, team_id];
            }
            update_with_event(state, event, true);
        }
    }
    return [false, null];
}
