export function create_players(game, team_id) {
	const players = [];
	for (let j = 0; j < 5; j++) {
		const playerIndex = team_id * 5 + j;
		const champion = game.info.participants[playerIndex].championName;
		players.push({
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
	return players;
}

export function create_team(game, team_id) {
	return {
		players: create_players(game, team_id),
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
}

export function create_initial_state(game) {
	return {
		teams: [create_team(game, 0), create_team(game, 1)],
		time: -1,
		win: game.info.participants[0].win,
	};
}
