// scheduler/importMatches.js
const cron = require('node-cron');
const { fetchMatches } = require('../services/footballData');
const db = require('../server/db');

// Schedule to run daily at midnight
cron.schedule('0 0 * * *', async () => {
    console.log('Starting scheduled match import...');
    const competitionId = 'PL'; // Example: Premier League
    const dateFrom = new Date().toISOString().split('T')[0];
    const dateTo = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Next 7 days

    try {
        const matches = await fetchMatches(competitionId, dateFrom, dateTo);
        const insertPromises = matches.map(match => {
            const { homeTeam, awayTeam, utcDate, venue } = match;
            return db.query(
                `INSERT INTO matches (team_home, team_away, match_date, location)
                 VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326))
                 ON CONFLICT (id) DO NOTHING`,
                [
                    homeTeam.name,
                    awayTeam.name,
                    new Date(utcDate),
                    venue.longitude,
                    venue.latitude
                ]
            );
        });
        await Promise.all(insertPromises);
        console.log('Scheduled match import completed successfully.');
    } catch (error) {
        console.error('Error during scheduled match import:', error);
    }
});
