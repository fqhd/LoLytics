import { describe, it, expect } from "vitest";
import {
    assign_participant_stats_to_players,
    update_player_timers,
    update_inhib_timers,
    update_nexus_tower_timers,
} from "../data/update.js";

describe("assign_participant_stats_to_players", () => {
    it("should correctly assign participant stats to the player", () => {
        const state = {
            teams: [
                { players: Array(5).fill({}).map(() => ({})) },
                { players: Array(5).fill({}).map(() => ({})) },
            ],
        };

        const frame = {
            participantFrames: {
                1: {
                    minionsKilled: 50,
                    jungleMinionsKilled: 10,
                    level: 9,
                    position: { x: 1234, y: 5678 },
                    totalGold: 3500,
                },
            },
        };

        assign_participant_stats_to_players(state, frame);
        const player = state.teams[0].players[0];

        expect(player.creepscore).toBe(60);
        expect(player.level).toBe(9);
        expect(player.x).toBe(1234);
        expect(player.y).toBe(5678);
        expect(player.gold).toBe(3500);
    });
});

describe("update_player_timers", () => {
    it("should decrease all timers by 60 seconds but not below 0", () => {
        const team = {
            players: [
                { deathTimer: 120, baronTimer: 60, elderTimer: 30 },
                { deathTimer: 50, baronTimer: 0, elderTimer: 10 },
            ],
        };

        update_player_timers(team);

        expect(team.players[0].deathTimer).toBe(60);
        expect(team.players[0].baronTimer).toBe(0);
        expect(team.players[0].elderTimer).toBe(0);

        expect(team.players[1].deathTimer).toBe(0);
        expect(team.players[1].baronTimer).toBe(0);
        expect(team.players[1].elderTimer).toBe(0);
    });
});

describe("update_inhib_timers", () => {
    it("should decrement inhib timers by 1 and clamp at 0", () => {
        const state = {
            teams: [
                { inhibs: [3, 1, 0] },
                { inhibs: [0, 2, 1] },
            ],
        };

        for (const team_id of [0, 1]) {
            globalThis.team_id = team_id; // Simulate global variable if needed
            update_inhib_timers(state);
        }

        expect(state.teams[0].inhibs).toEqual([2, 0, 0]);
        expect(state.teams[1].inhibs).toEqual([0, 1, 0]);
    });
});

describe("update_nexus_tower_timers", () => {
    it("should decrement nexus tower timers by 1 and clamp at 0", () => {
        const state = {
            teams: [
                {
                    towers: {
                        9: 2,
                        10: 0,
                    },
                },
                {
                    towers: {
                        9: 1,
                        10: 5,
                    },
                },
            ],
        };

        for (const team_id of [0, 1]) {
            globalThis.team_id = team_id; // Simulate global variable
            update_nexus_tower_timers(state);
        }

        expect(state.teams[0].towers[9]).toBe(1);
        expect(state.teams[0].towers[10]).toBe(0);
        expect(state.teams[1].towers[9]).toBe(0);
        expect(state.teams[1].towers[10]).toBe(4);
    });
});
