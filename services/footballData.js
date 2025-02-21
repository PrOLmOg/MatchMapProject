// services/footballData.js
const axios = require('axios');
require('dotenv').config();

const FOOTBALL_DATA_API_URL = 'https://api.football-data.org/v2';
const API_KEY = process.env.ad080a2b0da14c5a8fad4ef768fa63a1;

const fetchMatches = async (competitionId, dateFrom, dateTo) => {
    try {
        const response = await axios.get(`${FOOTBALL_DATA_API_URL}/competitions/${competitionId}/matches`, {
            headers: { 'X-Auth-Token': API_KEY },
            params: {
                dateFrom,
                dateTo
            }
        });
        return response.data.matches;
    } catch (error) {
        console.error('Error fetching matches:', error.response.data);
        throw error;
    }
};

module.exports = { fetchMatches };
