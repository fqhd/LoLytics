import { process_champion_kill } from './kills.js';
import { process_building_kill } from './buildings.js';
import { process_monster_kill } from './monsters.js';

export function update_until(state, frames, t) {
	for (const frame in frames) {
		for (const event in frame.events) {
			if (event.timestamp < t) {
				update_with_event(state, event);
			} else {
				relativize_timers(state);
				return;
			}
		}
	}
	relativize_timers(state);
}

export function relativize_timers(state) {
	
}

export function update_with_event(state, event) {
    switch (event.type) {
        case 'CHAMPION_KILL':
            process_champion_kill(state, event);
            break;
        case 'BUILDING_KILL':
            process_building_kill(state, event);
            break;
        case 'ELITE_MONSTER_KILL':
            process_monster_kill(state, event);
            break;
		case 'LEVEL_UP':
			process_levelup(state, event);
			break;
    }
}

function process_levelup(state, event) {
	const team_id = parseInt((event.participantId - 1) / 5);
	const player_id = (event.participantId - 1) % 5;
	state.teams[team_id].players[player_id].level += 1;
}