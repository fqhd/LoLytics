import { describe, it, expect, vi } from 'vitest';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import match_details from '../server/match_details.js';

const match = JSON.parse(
    fs.readFileSync(path.resolve('tests/match_response.json'), 'utf8')
);

describe('match_details API endpoint', () => {
    it('returns expected player + opponent details', async () => {
        vi.spyOn(axios, 'get').mockResolvedValue({ data: match });

        const req = { query: { id: 'SOME_MATCH_ID', puuid: 'Gy7dAB-vmryVavMi9Oot5ghoT9ciOUquclQHJbex0CkXpmIhG4Y1-ZrzWxp3HVHUg9nJvbh7LnIC7w' } };

        let status_code;
        let json_response;
        const res = {
            status(code) {
                status_code = code;
                return this;
            },
            json(obj) {
                json_response = obj;
                return this;
            },
        };

        await match_details(req, res);

        expect(status_code).toBeUndefined();
        expect(json_response.player_champion).toBe('Rammus');
        expect(json_response.opponent_champion).toBe('Jhin');
        expect(json_response.win).toBe(false);
        expect(json_response.team).toBe(100);
    });
});
