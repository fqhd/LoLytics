export function process_building_kill(state, event, add_gold = false) {
	if (event.buildingType == 'TOWER_BUILDING') {
		process_tower_kill(state, event, add_gold);
	} else if (event.buildingType == 'INHIBITOR_BUILDING') {
		process_inhibitor_kill(state, event);
	}
}

export function process_inhibitor_kill(state, event) {
	let lane = 0;
	if (event.laneType == 'MID_LANE') {
		lane = 1;
	} else if (event.laneType == 'BOT_LANE') {
		lane = 2;
	}
	const team_id = parseInt(event.teamId / 100) - 1;
	const time = event.timestamp / 1000 / 60;
	const death_timer = 60 * 5;
	const next_whole_minute = (Math.ceil(time) - time) * 60;
	state.teams[team_id].inhibs[lane] = Math.max(death_timer - next_whole_minute, 0);
}

export function process_tower_kill(state, event, add_gold = false) {
	const tower_id = get_tower_id(state, event);
	const team_id = parseInt(event.teamId / 100) - 1;
	if (add_gold) {
		if (
			state.teams[0].towers.reduce((accumulator, current) => accumulator + current, 0) +
			state.teams[1].towers.reduce((accumulator, current) => accumulator + current, 0) == 18
		) {
			if (event.killerId != 0) {
				state.teams[1 - team_id].players[(event.killerId - 1) % 5].gold += 300;
			}
		}
		if (event.killerId != 0) {
			state.teams[1 - team_id].players[(event.killerId - 1) % 5].gold += 250;
		}

		for (const player of state.teams[1 - team_id].players) {
			player.gold += 50;
		}
	}
	if (tower_id == 9 || tower_id == 10) {
		const time = event.timestamp / 1000 / 60;
		const death_timer = 60 * 3;
		const next_whole_minute = (Math.ceil(time) - time) * 60;
		state.teams[team_id].towers[tower_id] = Math.max(death_timer - next_whole_minute, 0);
	} else {
		state.teams[team_id].towers[tower_id] = 0;
	}
}

export function get_tower_id(state, event) {
	let tower_id = 0;
	const team_id = parseInt(event.teamId / 100) - 1;
	if (event.laneType == 'BOT_LANE') {
		tower_id = 6;
	} else if (event.laneType == 'MID_LANE') {
		tower_id = 3;
	}
	if (event.towerType == 'INNER_TURRET') {
		tower_id += 1;
	} else if (event.towerType == 'BASE_TURRET') {
		tower_id += 2;
	} else if (event.towerType == 'NEXUS_TURRET') {
		const t1 = state.teams[team_id].towers[9];
		const t2 = state.teams[team_id].towers[10];
		if (t1 == 0 && t2 == 0) {
			tower_id = 9;
		} else {
			tower_id = 10;
		}
	}
	return tower_id;
}