// server/fetchMatches.js
const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, '../.env') // the exact file name
});

const axios = require('axios');
const db = require('./db');
const { getStadiumName, getCoordinates } = require('./stadiumUtils');

/**
 * Fetch competitions from Football-Data.org API and store them in the database
 */
async function fetchAndStoreCompetitions(apiUrl, apiKey) {
  try {
    const response = await axios.get(`${apiUrl}/competitions`, {
      headers: { 'X-Auth-Token': apiKey },
    });

    const competitions = response.data.competitions;

    console.log(`Fetched ${competitions.length} competitions from the API.`);

    for (const competition of competitions) {
      const { id, name } = competition;
      try {
        await db.query(
          `INSERT INTO competitions (id, name)
           VALUES ($1, $2)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;`,
          [id, name]
        );
        console.log(`Inserted/Updated competition: ${name} (ID: ${id})`);
      } catch (dbError) {
        console.error(`Failed to insert/update competition ID ${id}:`, dbError.message);
      }
    }

    console.log('All competitions have been processed.');
  } catch (error) {
    if (error.response) {
      // Server responded with a status other than 2xx
      console.error(`Error fetching competitions: ${error.response.status} ${error.response.statusText}`);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      // No response received
      console.error('Error fetching competitions: No response received.');
      console.error(error.request);
    } else {
      // Other errors
      console.error('Error fetching competitions:', error.message);
    }
    throw error; // Propagate the error to stop the script if necessary
  }
}

/**
 * Fetch matches from Football-Data.org API and insert into PostgreSQL
 */
async function fetchAndStoreMatches() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  let apiUrl = process.env.FOOTBALL_DATA_API_URL;

  if (!apiKey) {
    console.error('FOOTBALL_DATA_API_KEY is not set in the .env file.');
    process.exit(1);
  }

  if (!apiUrl) {
    console.error('FOOTBALL_DATA_API_URL is not set in the .env file.');
    process.exit(1);
  }

  // Remove trailing slash if present
  apiUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;

  try {
    
    // assuimg all competitons are in the data base
    // Step 1: Fetch all competitions from the database
    const { rows: competitions } = await db.query('SELECT id, name FROM competitions;');

    console.log(`Fetched ${competitions.length} competitions from the database.`);

    for (const competition of competitions) {
      const competitionId = competition.id;
      const competitionName = competition.name;
      const endpoint = `/competitions/${competitionId}/matches`;
      const fullUrl = `${apiUrl}${endpoint}`;

      // Log the competition being processed
      console.log(`\nFetching matches for competition: ${competitionName} (ID: ${competitionId})`);

      try {
        const response = await axios.get(fullUrl, {
          headers: { 'X-Auth-Token': apiKey },
        });

        const matches = response.data.matches;

        console.log(`Fetched ${matches.length} matches for ${competitionName}.`);

        for (const match of matches) {
          // Extract necessary fields
          const external_id = match.id; // Unique identifier from external API
          const team_home = match.homeTeam.name;
          const team_away = match.awayTeam.name;
          const match_date = match.utcDate; // ISO 8601 date string
          const today_date = new Date();
          const today_date_plus_week = new Date();
          today_date_plus_week.setDate(today_date.getDate() + 15);
          // Checking if it is a past match
          if (new Date(match_date) < today_date || new Date(match_date) > today_date_plus_week) {
            continue; // Skip past matches
          }

          // Extract location information
          const stadiumName = await getStadiumName(team_home);
          const coordinates = await getCoordinates(stadiumName);

          if (!stadiumName) {
            console.warn(`Stadium name not found for team: ${team_home}. Skipping match ID ${external_id}.`);
            continue;
          }

          if (!coordinates) {
            console.warn(`Coordinates not found for stadium: ${stadiumName}. Skipping match ID ${external_id}.`);
            continue;
          }

          // Insert into PostgreSQL
          try {
            await db.query(
              `INSERT INTO matches (external_id, competition_id, team_home, team_away, match_date, stadium_name, location)
               VALUES ($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_MakePoint($7, $8), 4326)::geography)
               ON CONFLICT (external_id) DO NOTHING;`,
              [external_id, competitionId, team_home, team_away, match_date, stadiumName, coordinates.lon, coordinates.lat]
            );
            console.log(`Inserted match ID ${external_id}: ${team_home} vs ${team_away} at ${stadiumName}`);
          } catch (dbError) {
            console.error(`Failed to insert match ID ${external_id}:`, dbError.message);
          }
        }
      } catch (matchError) {
        if (matchError.response) {
          // Server responded with a status other than 2xx
          console.error(`Error fetching matches for competition ${competitionName}: ${matchError.response.status} ${matchError.response.statusText}`);
          console.error('Response data:', matchError.response.data);
        } else if (matchError.request) {
          // No response received
          console.error(`Error fetching matches for competition ${competitionName}: No response received.`);
          console.error(matchError.request);
        } else {
          // Other errors
          console.error(`Error fetching matches for competition ${competitionName}:`, matchError.message);
        }
      }
    }

    console.log('\nAll competitions processed.');
    console.log('Match data fetching and insertion completed.');
  } catch (error) {
    console.error('Unhandled error in fetchAndStoreMatches:', error.message);
    process.exit(1);
  }
}

// If this script is run directly, execute the function
if (require.main === module) {
  (async () => {
    try {
      const apiKey = process.env.FOOTBALL_DATA_API_KEY;
      let apiUrl = process.env.FOOTBALL_DATA_API_URL;
      
      // 1) Fetch & store all competitions from the API into `competitions` table
      await fetchAndStoreCompetitions(apiUrl, apiKey);

      // 2) Fetch matches for all competitions found in `competitions` table
      await fetchAndStoreMatches();

      console.log('All competitions & matches have been imported successfully.');
      process.exit(0); // exit cleanly
    } catch (err) {
      console.error('Unhandled error:', err);
      process.exit(1);
    }
  })();
}


module.exports = fetchAndStoreMatches;
