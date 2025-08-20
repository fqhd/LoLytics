import { describe, it, expect } from 'vitest';
import { convert_sample_to_array } from '../server/model.js';
import fs from 'fs';
import path from 'path';

const fixtures_path = path.resolve('tests/fixtures.json');
const fixtures = JSON.parse(fs.readFileSync(fixtures_path, 'utf8'));

describe('convert_sample_to_array matches Python implementation', () => {
    for (const [filename, input, expected] of fixtures) {
        it(`matches Python output for ${filename}`, () => {
            expect(convert_sample_to_array(input)).toEqual(expected);
        });
    }
});
