export function process_building_kill(state, event) {
	if (event.buildingType == "TOWER_BUILDING") {
		let tower_id = 0;
		const team_id = parseInt(event.teamId / 100) - 1;
		if (event.laneType == "BOT_LANE") {
			tower_id = 6;
		} else if (event.laneType == "MID_LANE") {
			tower_id = 3;
		}
		if (event.towerType == "INNER_TURRET") {
			tower_id += 1;
		} else if (event.towerType == "BASE_TURRET") {
			tower_id += 2;
		} else if (event.towerType == "NEXUS_TURRET") {
			const t1 = state.teams[team_id].towers[9];
			const t2 = state.teams[team_id].towers[10];
			if (t1 == 0 && t2 == 0) {
				tower_id = 10;
			} else {
				tower_id = 9;
			}
		}
		if (tower_id == 9 || tower_id == 10) {
			state.teams[team_id].towers[tower_id] = 3;
		} else {
			state.teams[team_id].towers[tower_id] = 0;
		}
	} else if (event.buildingType == "INHIBITOR_BUILDING") {
		let lane = 0;
		if (event.laneType == "MID_LANE") {
			lane = 1;
		} else if (event.laneType == "BOT_LANE") {
			lane = 2;
		}
		const team_id = parseInt(event.teamId / 100) - 1;
		state.teams[team_id].inhibs[lane] = 5;
	}
}
