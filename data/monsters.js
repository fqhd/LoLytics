export function process_monster_kill(state, event) {
	const team_id = parseInt((event.killerId - 1) / 5);
	if (event.monsterType == "DRAGON") {
		if (event.monsterSubType == "ELDER_DRAGON") {
			for (const player of state.teams[team_id].players) {
				if (player.deathTimer == 0) {
					const time_since_objective = (state.time * 60) - parseInt(event.timestamp / 1000);
					player.elderTimer = (2 * 60 + 30) - time_since_objective; // 2 minutes minus 30 in seconds minus the number of seconds since the elder was taken
				}
			}
		} else {
			state.teams[team_id].drakes.push(event.monsterSubType);
		}
	} else if (event.monsterType == "RIFTHERALD") {
		state.teams[team_id].rifts += 1;
	} else if (event.monsterType == "HORDE") {
		state.teams[team_id].grubs += 1;
	} else if (event.monsterType == "ATAKHAN") {
		state.teams[team_id].atakhan = 1;
	} else if (event.monsterType == "BARON_NASHOR") {
		for (const player of state.teams[team_id].players) {
			if (player.deathTimer == 0) {
				const time_since_objective = (state.time * 60) - parseInt(event.timestamp / 1000);
				player.baronTimer = (3 * 60) - time_since_objective; // 3 minutes in seconds minus the number of seconds since the elder was taken
			}
		}
	}
}
