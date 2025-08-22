import { process_champion_kill } from './kills.js';
import { process_building_kill } from './buildings.js';
import { process_monster_kill } from './monsters.js';

export function update_with_frame(state, frame) {
    assign_participant_stats_to_players(state, frame);
    update_general_stats(state);
    for (const event of frame.events) {
        update_with_event(state, event);
    }
}

export function assign_participant_stats_to_players(state, frame) {
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
}

export function update_player_timers(team) {
    for (const player of team.players) {
        player.deathTimer -= 60;
        player.deathTimer = Math.max(player.deathTimer, 0);
        player.baronTimer -= 60;
        player.baronTimer = Math.max(player.baronTimer, 0);
        player.elderTimer -= 60;
        player.elderTimer = Math.max(player.elderTimer, 0);
    }
}

export function update_inhib_timers(state, team_id) {
    for (let i = 0; i < 3; i++) {
        state.teams[team_id].inhibs[i] -= 60;
        state.teams[team_id].inhibs[i] = Math.max(
            state.teams[team_id].inhibs[i],
            0,
        );
    }
}

export function update_nexus_tower_timers(state, team_id) {
    for (const tower_id of [9, 10]) {
        state.teams[team_id].towers[tower_id] -= 60;
        state.teams[team_id].towers[tower_id] = Math.max(
            state.teams[team_id].towers[tower_id],
            0,
        );
    }
}

export function update_general_stats(state) {
    state.time += 1;
    for (let team_id = 0; team_id < 2; team_id++) {
        update_player_timers(state.teams[team_id]);
        update_inhib_timers(state, team_id);
        update_nexus_tower_timers(state, team_id);
    }
}

export function update_with_event(state, event) {
    switch (event.type) {
        case 'CHAMPION_KILL':
            process_champion_kill(state, event);
            break;
        case 'BUILDING_KILL':
            process_building_kill(state, event);
            break;
        case 'ELITE_MONSTER_KILL':
            process_monster_kill(state, event);
            break;
    }
}
