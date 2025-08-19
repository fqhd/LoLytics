import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { predict } from '../server/model.js';

const fixtures = JSON.parse(fs.readFileSync(path.resolve('tests/integration.json'), 'utf-8'));

describe('Model integrity test', () => {
    for (const { input, output } of fixtures) {
        it(`matches Python output for input ${JSON.stringify(input)}`, async () => {
            const actual = await predict(input);
            expect(actual).toBeCloseTo(output, 6);
        });
    }
});
