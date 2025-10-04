import { predict, convert_sample_to_array } from './model.js';
import axios from 'axios';
import { create_initial_state } from '../data/init.js';
import { update_with_frame } from '../data/update.js';
import { deep_copy } from '../data/utils.js';
import { readFile } from 'fs/promises';
import send_server_error from './network.js';
import { find_participant_with_puuid } from './utils.js';
import { get_frame_events_win_probability_deltas } from './events.js';

const rune_data = JSON.parse(await readFile('./server/runes.json', 'utf-8'));

const cache = new Map();

export default async function match_analysis(req, res) {
    const { id, puuid, region } = req.query;
    const cache_key = `${id}:${puuid}`;

    if (cache.has(cache_key)) {
        return res.json(cache.get(cache_key));
    }

    try {
        const game = await axios.get(`https://${region}.api.riotgames.com/lol/match/v5/matches/${id}?api_key=${process.env.RIOT_KEY}`);
        const timeline = await axios.get(`https://${region}.api.riotgames.com/lol/match/v5/matches/${id}/timeline?api_key=${process.env.RIOT_KEY}`);

        const atakhan_location = determine_atakhan_spawn_location(timeline.data.info.frames);

        const state = create_initial_state(game.data);

        const states = [];
        for (const frame of timeline.data.info.frames) {
            update_with_frame(state, frame);
            const parsed_state = deep_copy(state);
            states.push(parsed_state);
        }

        const probabilities = [];
        for (const state of states) {
            const vectorized = convert_sample_to_array(state);
            const prediction = await predict(vectorized);
            probabilities.push(prediction);
        }

        const events = {};
        for (let i = 1; i < states.length; i++) {
            const state = states[i - 1];
            const frame = timeline.data.info.frames[i];
            const deltas = await get_frame_events_win_probability_deltas(state, frame.events, probabilities[i - 1]);
            events[i.toString()] = deltas;
        }

        const player = find_participant_with_puuid(game.data.info.participants, puuid);

        const runes = {
            primaryTree: {
                keystone: find_rune_with_id(player.perks.styles[0].selections[0].perk),
                subs: [
                    find_rune_with_id(player.perks.styles[0].selections[1].perk),
                    find_rune_with_id(player.perks.styles[0].selections[2].perk),
                    find_rune_with_id(player.perks.styles[0].selections[3].perk),
                ],
            },
            secondaryTree: {
                subs: [
                    find_rune_with_id(player.perks.styles[1].selections[0].perk),
                    find_rune_with_id(player.perks.styles[1].selections[1].perk),
                ],
            },
            statPerks: [find_rune_with_id(player.perks.statPerks.offense), find_rune_with_id(player.perks.statPerks.flex), find_rune_with_id(player.perks.statPerks.defense)],
        }

        const items = get_participant_item_purchases(timeline.data.info.frames, player.participantId);

        const response_data = { probabilities, runes, items, frames: states, events, atakhan_location };

        cache.set(cache_key, response_data);

        res.json(response_data);
    } catch (error) {
        if (error.response) {
            if (error.response.status === 404) {
                res.status(404).json({ error: 'Match not found' });
            } else {
                console.error('API error:', error.response.status, error.response.data);
                send_server_error(res);
            }
        } else {
            console.error('Network error:', error.message);
            send_server_error(res);
        }
    }
}

function find_rune_with_id(id) {
    if (id == 5001) {
        return '/images/stats/statmodshealthplusicon.png';
    } else if (id == 5008) {
        return '/images/stats/statmodsadaptiveforceicon.png';
    } else if (id == 5005) {
        return '/images/stats/statmodsattackspeedicon.png';
    } else if (id == 5007) {
        return '/images/stats/statmodscdrscalingicon.png';
    } else if (id == 5011) {
        return '/images/stats/statsmodshealthscalingicon.png';
    } else if (id == 5013) {
        return '/images/stats/statsmodstenacityicon.png';
    } else if (id == 5010) {
        return '/images/stats/statsmodsmovementspeedicon.png';
    }
    for (const branch of rune_data) {
        for (const slot of branch.slots) {
            for (const rune of slot.runes) {
                if (id == rune.id) {
                    return rune.icon;
                }
            }
        }
    }
    return null;
}

function get_participant_item_purchases(frames, participant_id) {
    const grouped = {};

    for (const frame of frames) {
        for (const event of frame.events) {
            if (event.participantId !== participant_id) continue;

            if (event.type === 'ITEM_PURCHASED') {
                const minute = Math.floor(event.timestamp / 1000 / 60);
                if (!grouped[minute]) {
                    grouped[minute] = {};
                }
                if (!grouped[minute][event.itemId]) {
                    grouped[minute][event.itemId] = 0;
                }
                grouped[minute][event.itemId] += 1;
            }

            if (event.type === 'ITEM_UNDO' && event.beforeId !== 0) {
                const minute = Math.floor(event.timestamp / 1000 / 60);
                for (let m = minute; m >= 0; m--) {
                    if (grouped[m] && grouped[m][event.beforeId]) {
                        console.log(event.beforeId);
                        console.log(grouped[m][event.beforeId]);
                        grouped[m][event.beforeId] -= 1;
                        if (grouped[m][event.beforeId] <= 0) {
                            delete grouped[m][event.beforeId];
                        }
                        break;
                    }
                }
            }
        }
    }

    const result = Object.entries(grouped).map(([time, items]) => ({
        time: Number(time),
        items: Object.entries(items).map(([id, count]) => ({
            id: Number(id),
            count
        }))
    }));

    result.sort((a, b) => a.time - b.time);

    return result;
}

function determine_atakhan_spawn_location(frames) {
    for (const frame of frames) {
        for (const event of frame.events) {
            if (event.type == 'ELITE_MONSTER_KILL' && event.monsterType == 'ATAKHAN') {
                if (event.position.x > event.position.y) {
                    return 'TOP';
                } else {
                    return 'BOTTOM';
                }
            }
        }
    }
    return 'NONE';
}