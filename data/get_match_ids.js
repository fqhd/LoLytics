import { api_call, fetch_with_retries, shuffle } from "./utils.js";
import { API_KEYS } from "./api_keys.js";

async function get_summoner_ids(rank, tier, page, key) {
	const summoner_ids = [];
	if (rank == "CHALLENGER") {
		let response = await fetch_with_retries(
			`https://euw1.api.riotgames.com/lol/league/v4/challengerleagues/by-queue/RANKED_SOLO_5x5?api_key=${key}`,
		);
		response = await response.json();
		if (response == null) {
			return [];
		}
		for (const summoner of response.entries) {
			summoner_ids.push(summoner.puuid);
		}
	} else if (rank == "GRANDMASTER") {
		let response = await fetch_with_retries(
			`https://euw1.api.riotgames.com/lol/league/v4/grandmasterleagues/by-queue/RANKED_SOLO_5x5?api_key=${key}`,
		);
		response = await response.json();
		if (response == null) {
			return [];
		}
		for (const summoner of response.entries) {
			summoner_ids.push(summoner.puuid);
		}
	} else if (rank == "MASTER") {
		let response = await fetch_with_retries(
			`https://euw1.api.riotgames.com/lol/league/v4/masterleagues/by-queue/RANKED_SOLO_5x5?api_key=${key}`,
		);
		response = await response.json();
		if (response == null) {
			return [];
		}
		for (const summoner of response.entries) {
			summoner_ids.push(summoner.puuid);
		}
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
	const one_month_ago = new Date(now);
	one_month_ago.setMonth(now.getMonth() - 1);
	const start = Math.floor(one_month_ago.getTime() / 1000);

	let match_history = await api_call(
		`https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${summoner_id}/ids?startTime=${start}&queue=420&start=0&count=50&api_key=${key}`,
	);

	return match_history;
}

async function get_match_id_batch(rank, tier, page, key) {
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

export async function get_ids(rank) {
	let match_ids = [];
	let promises = [];

	for (const tier of ["I", "II", "III", "IV"]) {
		for (const page of [1, 2]) {
			promises.push(
				get_match_id_batch(rank, tier, page, API_KEYS[promises.length]),
			);
			if (promises.length >= API_KEYS.length) {
				const results = await Promise.all(promises);
				match_ids = match_ids.concat(...results);
				promises = [];
			}
		}
	}

	if (promises.length != 0) {
		const results = await Promise.all(promises);
		match_ids = match_ids.concat(...results);
	}

	shuffle(match_ids);
	return match_ids;
}
