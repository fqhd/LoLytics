import { api_call, fetch_with_retries, shuffle } from './utils.js';

async function get_summoner_ids(rank, tier, page, key) {
	const summoner_ids = [];
	if (rank == 'MASTER') {
		const summoner_ids = [];
		let response = await fetch_with_retries(
			`https://euw1.api.riotgames.com/lol/league/v4/masterleagues/by-queue/RANKED_SOLO_5x5?api_key=${key}`,
		);
		if (response == null) {
			return [];
		}
		for (const summoner of response.entries) {
			summoner_ids.push(summoner.puuid);
		}
		shuffle(summoner_ids);
		return summoner_ids.slice(0, 800);
	} else {
		let response = await fetch_with_retries(
			`https://euw1.api.riotgames.com/lol/league/v4/entries/RANKED_SOLO_5x5/${rank}/${tier}?page=${page}&api_key=${key}`,
		);
		if (response == null) {
			return [];
		}
		for (const summoner of response) {
			summoner_ids.push(summoner.puuid);
		}
	}
	shuffle(summoner_ids);
	return summoner_ids;
}

async function get_summoner_match_ids(summoner_id, key) {
	const now = new Date();
	const twenty_days_ago = new Date(now);
	twenty_days_ago.setDate(now.getDate() - 20);

	const start = Math.floor(twenty_days_ago.getTime() / 1000);

	let match_history = await api_call(
		`https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${summoner_id}/ids?startTime=${start}&queue=420&start=0&count=50&api_key=${key}`,
	);

	return match_history;
}

export async function get_match_id_batch(rank, tier, page, key) {
	let match_ids = [];

	const summoner_ids = await get_summoner_ids(rank, tier, page, key);

	if (summoner_ids.length == 0) {
		return match_ids;
	}

	for (const summoner_id of summoner_ids) {
		try {
			const ids = await get_summoner_match_ids(summoner_id, key);
			match_ids = match_ids.concat(ids);
		} catch (e) {
			console.log(e);
		}
	}

	return match_ids.filter((e) => e != null);
}

export async function get_ids(rank, tier, key) {
	let match_ids = [];

	let n_pages = 4;
	if (rank == 'IRON' || rank == 'BRONZE') {
		n_pages = 5;
	}

	for (let page = 1; page <= n_pages; page++) {
		const results = await get_match_id_batch(rank, tier, page, key);
		match_ids = match_ids.concat(results);
	}

	shuffle(match_ids);

	console.log(`Found ${match_ids.length} ids for ${rank} ${tier}`);

	return match_ids.map((v, _) => {
		return {
			match_id: v,
			rank,
			tier
		}
	});
}
