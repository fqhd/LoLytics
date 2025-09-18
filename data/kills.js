import { calc_death_timer } from "./death.js";

export function process_champion_kill(state, event, add_gold=false) {
	const time = event.timestamp / 1000 / 60;
	const team_id = parseInt((event.killerId - 1) / 5);
	if (event.killerId > 0) {
		state.teams[team_id].players[(event.killerId - 1) % 5].kills += 1;
		if (add_gold) {
			state.teams[team_id].players[(event.killerId - 1) % 5].gold += event.bounty + event.shutdownBounty;
		}
	}
	const victim_team_id = parseInt((event.victimId - 1) / 5);
	const victim =
		state.teams[victim_team_id].players[(event.victimId - 1) % 5];
	victim.deaths += 1;
	victim.baronTimer = 0;
	victim.elderTimer = 0;
	const death_timer = calc_death_timer(victim.level, time);
	const next_whole_minute = (Math.ceil(time) - time) * 60;
	victim.deathTimer = Math.max(death_timer - next_whole_minute, 0);
	if (event.assistingParticipantIds) {
		const num_assists = event.assistingParticipantIds.length;
		const assist_split = [0.75, 0.5, 0.38, 0.31][num_assists-1];
		for (const assist_id of event.assistingParticipantIds) {
			const assist_team_id = parseInt((assist_id - 1) / 5);
			state.teams[assist_team_id].players[(assist_id - 1) % 5].assists += 1;
			if (add_gold) {
				state.teams[assist_team_id].players[(assist_id - 1) % 5].gold += (event.bounty + event.shutdownBounty) * assist_split;
			}
		}
	}
}
