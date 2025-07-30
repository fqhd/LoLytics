import { api_call, deep_copy } from "./utils.js";

export async function get_game_data(MATCH_ID, key) {
	let game = await api_call(
		`https://europe.api.riotgames.com/lol/match/v5/matches/${MATCH_ID}?api_key=${key}`,
	);
	if (game.status != 200) {
		console.log(game);
		console.log(key);
		console.log("failed to get game data");
		return null;
	}
	game = await game.json();

	let timeline = await api_call(
		`https://europe.api.riotgames.com/lol/match/v5/matches/${MATCH_ID}/timeline?api_key=${key}`,
	);
	if (timeline.status != 200) {
		console.log("failed to get timeline data");
		return null;
	}
	timeline = await timeline.json();

	const state = create_initial_state(game);
	if (state == null) {
		console.log("failed to create initial state");
		return null;
	}

	const states = [];
	for (const frame of timeline.info.frames) {
		update_with_frame(state, frame);
		const parsed_state = parse_state(state);
		states.push(parsed_state);
	}
	return states;
}

function create_initial_state(game) {
	const state = {
		teams: [],
		time: -1,
		win: game.info.participants[0].win,
	};
	for (let i = 0; i < 2; i++) {
		const team = {
			players: [],
			drakes: [],
			rifts: 0,
			atakhan: 0,
			grubs: 0,
			towers: [
				1, // Top outer
				1, // Top inner
				1, // Top base
				1, // Mid outer
				1, // Mid inner
				1, // Mid base
				1, // Bot outer
				1, // Bot inner
				1, // Bot base
				0, // Nexus
				0, // Nexus
			],
			inhibs: [
				0, // Top
				0, // Mid
				0, // Bot
			],
		};
		for (let j = 0; j < 5; j++) {
			const playerIndex = i * 5 + j;
			const champion = game.info.participants[playerIndex].championName;
			team.players.push({
				champion,
				kills: 0,
				deaths: 0,
				assists: 0,
				baronTimer: 0,
				elderTimer: 0,
				deathTimer: 0,
				gold: 0,
				level: 1,
				creepscore: 0,
				x: 0,
				y: 0,
			});
		}
		state.teams.push(team);
	}
	return state;
}

function update_with_frame(state, frame) {
	update_general_stats(state, frame);
	for (const event of frame.events) {
		update_with_event(state, event);
	}
}

function update_general_stats(state, frame) {
	state.time += 1;

	for (const participant_id in frame.participantFrames) {
		const participant = frame.participantFrames[participant_id];
		const participant_id_int = parseInt(participant_id) - 1;
		const team_id = parseInt(participant_id_int / 5);
		state.teams[team_id].players[participant_id_int % 5].creepscore =
			participant.minionsKilled + participant.jungleMinionsKilled;
		state.teams[team_id].players[participant_id_int % 5].level =
			participant.level;
		state.teams[team_id].players[participant_id_int % 5].x =
			participant.position.x;
		state.teams[team_id].players[participant_id_int % 5].y =
			participant.position.y;
		state.teams[team_id].players[participant_id_int % 5].gold =
			participant.totalGold;
	}

	for (let team_id = 0; team_id < 2; team_id++) {
		// Update timers
		for (const player of state.teams[team_id].players) {
			player.deathTimer -= 60;
			player.deathTimer = Math.max(player.deathTimer, 0);
			player.baronTimer -= 60;
			player.baronTimer = Math.max(player.baronTimer, 0);
			player.elderTimer -= 60;
			player.elderTimer = Math.max(player.elderTimer, 0);
		}

		// Update inhib timers
		for (let i = 0; i < 3; i++) {
			state.teams[team_id].inhibs[i] -= 1;
			state.teams[team_id].inhibs[i] = Math.max(
				state.teams[team_id].inhibs[i],
				0,
			); // Cap inhib respawn timer to 0
		}

		// Update nexus tower timers
		for (const tower_id of [9, 10]) {
			state.teams[team_id].towers[tower_id] -= 1;
			state.teams[team_id].towers[tower_id] = Math.max(
				state.teams[team_id].towers[tower_id],
				0,
			); // Cap tower respawn timer to 0
		}
	}
}

function update_with_event(state, event) {
	switch (event.type) {
		case "CHAMPION_KILL":
			process_champion_kill(state, event);
			break;
		case "BUILDING_KILL":
			process_building_kill(state, event);
			break;
		case "ELITE_MONSTER_KILL":
			process_monster_kill(state, event);
			break;
	}
}

function process_monster_kill(state, event) {
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

function process_building_kill(state, event) {
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

function process_champion_kill(state, event) {
	const time = event.timestamp / 1000 / 60;
	const team_id = parseInt((event.killerId - 1) / 5);
	if (event.killerId > 0) {
		state.teams[team_id].players[(event.killerId - 1) % 5].kills += 1;
	}
	const victim_team_id = parseInt((event.victimId - 1) / 5);
	const victim =
		state.teams[victim_team_id].players[(event.victimId - 1) % 5];
	victim.deaths += 1;
	victim.baronTimer = 0;
	victim.elderTimer = 0;
	const deathTimer = calc_death_timer(victim.level, time);
	const nextWholeMinute = (Math.ceil(time) - time) * 60;
	victim.deathTimer = Math.max(deathTimer - nextWholeMinute, 0);
	if (event.assistingParticipantIds) {
		for (const assist_id of event.assistingParticipantIds) {
			const assist_team_id = parseInt((assist_id - 1) / 5);
			state.teams[assist_team_id].players[(assist_id - 1) % 5].assists +=
				1;
		}
	}
}

export function calc_death_timer(level, time) {
	const BRW = [
		6, 6, 8, 8, 10, 12, 16, 21, 26, 32.5, 35, 37.5, 40, 42.5, 45, 47.5, 50,
		52.5,
	];
	const current_brw = BRW[level - 1];
	const current_tif = calc_tif(time) / 100;
	return current_brw + current_brw * current_tif;
}

export function calc_tif(time) {
	if (time >= 0 && time < 15) {
		return 0;
	} else if (time >= 15 && time < 30) {
		return Math.ceil(2 * (time - 15)) * 0.425;
	} else if (time >= 30 && time < 45) {
		return 12.75 + Math.ceil(2 * (time - 30)) * 0.3;
	} else if (time >= 45 && time < 55) {
		return 21.75 + Math.ceil(2 * (time - 45)) * 1.45;
	} else {
		return 50;
	}
}

function parse_state(state) {
	const parsed_state = deep_copy(state);
	return parsed_state;
}
