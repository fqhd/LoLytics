export function process_monster_kill(state, event, add_gold = false) {
	const team_id = parseInt((event.killerId - 1) / 5);

	if (event.monsterType == 'DRAGON') {
		if (event.monsterSubType == 'ELDER_DRAGON') {
			for (const player of state.teams[team_id].players) {
				if (player.deathTimer == 0) {
					const time_since_objective = (state.time * 60) - parseInt(event.timestamp / 1000);
					player.elderTimer = (2 * 60 + 30) - time_since_objective; // 2 minutes minus 30 in seconds minus the number of seconds since the elder was taken
				}
			}
		} else {
			state.teams[team_id].drakes.push(event.monsterSubType);
		}
	} else if (event.monsterType == 'RIFTHERALD') {
		if (add_gold) {
			if (event.killerId != 0) {
				state.teams[team_id].players[(event.killerId - 1) % 5].gold += 100;
			}
			if (event.assistingParticipantIds) {
				for (const participantId of event.assistingParticipantIds) {
					const participant_team_id = parseInt((participantId - 1) / 5);
					if (participant_team_id == team_id) {
						state.teams[team_id].players[(participantId - 1) % 5].gold += 100;
					}
				}
			}
		}
		state.teams[team_id].rifts += 1;
	} else if (event.monsterType == 'HORDE') {
		state.teams[team_id].grubs += 1;
	} else if (event.monsterType == 'ATAKHAN') {
		state.teams[team_id].atakhan = 1;
	} else if (event.monsterType == 'BARON_NASHOR') {
		if (add_gold) {
			if (event.killerId != 0) {
				state.teams[team_id].players[(event.killerId - 1) % 5].gold += 25;
			}
			for (const player of state.teams[team_id].players) {
				player.gold += 300;
			}
		}
		for (const player of state.teams[team_id].players) {
			if (player.deathTimer == 0) {
				const time_since_objective = (state.time * 60) - parseInt(event.timestamp / 1000);
				player.baronTimer = (3 * 60) - time_since_objective; // 3 minutes in seconds minus the number of seconds since the elder was taken
			}
		}
	}
}
