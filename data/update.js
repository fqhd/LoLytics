import { process_champion_kill } from './kills.js';
import { process_building_kill } from './buildings.js';
import { process_monster_kill } from './monsters.js';

export function update_with_frame(state, frame) {
    update_general_stats(state, frame);
    for (const event of frame.events) {
        update_with_event(state, event);
    }
}

export function update_general_stats(state, frame) {
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

export function update_with_event(state, event) {
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
