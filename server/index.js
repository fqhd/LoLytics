import express from 'express';
import { config } from 'dotenv';
import match_history from './match_history.js';
import match_details from './match_details.js';
import match_analysis from './match_analysis.js';
import cors from 'cors';

config();

const app = express();
const PORT = 3000;

if (process.env.NODE_ENV == "development") {
    app.use(cors());
    console.log("CORS enabled (development)");
} else {
    console.log("CORS disabled (production)");
}

app.get('/match_history/', match_history);
app.get('/match_details/', match_details);
app.get('/match_analysis/', match_analysis);

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
