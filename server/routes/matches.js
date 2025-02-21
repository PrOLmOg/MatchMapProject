// server/routes/matches.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../middleware/authenticate');

router.use(authenticateToken);

// GET /api/matches
router.get('/', async (req, res) => {
  try {
    // Extract query parameters
    const { league, team, lat, lon, radius,dateFrom,dateTo } = req.query;

    // Base SQL query with essential fields and coordinate extraction
    let query = `
      SELECT
        m.external_id AS id,
        m.team_home,
        m.team_away,
        m.match_date,
        ST_X(m.location::geometry) AS longitude,  -- X coordinate (lon)
        ST_Y(m.location::geometry) AS latitude,   -- Y coordinate (lat)
        m.stadium_name,
        c.name AS competition_name
      FROM matches m
      JOIN competitions c
        ON m.competition_id = c.id
      WHERE m.match_date >= NOW()
    `;

    // Array to hold conditions and parameters for parameterized query
    const conditions = [];
    const params = [];

    // Add conditions based on provided filters
    if (league) {
      params.push(league);
      conditions.push(`c.name = $${params.length}`);
    }

    if (team) {
      params.push(`%${team}%`);
      conditions.push(`(m.team_home ILIKE $${params.length} OR m.team_away ILIKE $${params.length})`);
    }
    if (dateFrom) {
      params.push(dateFrom);
      conditions.push(`m.match_date >= $${params.length}::date`);
    }

    // Filter by dateTo => match_date <= dateTo
    if (dateTo) {
      params.push(dateTo);
      conditions.push(`m.match_date <= $${params.length}::date + INTERVAL '1 day' - INTERVAL '1 second'`);
      // ^ This includes the entire dateTo day, e.g. up to dateTo 23:59:59
      // If you want strictly dateTo at 00:00, remove the interval logic
    }


    // Add proximity filter if lat, lon, and radius are provided
    if (lat && lon && radius) {
      // Convert radius from kilometers to meters
      const radiusInMeters = parseFloat(radius) * 1000;
      if (isNaN(radiusInMeters)) {
        console.warn('[matches.js] Invalid radius provided. Skipping proximity filter.');
      } else {
        params.push(lon, lat, radiusInMeters);
        conditions.push(`ST_DWithin(
          m.location::geography,
          ST_SetSRID(ST_MakePoint($${params.length - 2}, $${params.length - 1}), 4326)::geography,
          $${params.length}
        )`);
      }
    }

    // Append conditions to the query if any
    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    console.log('[matches.js] Executing SQL Query:', query, params);

    // Execute the query with parameters
    const { rows } = await db.query(query, params);

    console.log('[matches.js] Raw rows fetched from DB:', JSON.stringify(rows, null, 2));

    // If no rows are found, return an empty array
    if (rows.length === 0) {
      console.warn('[matches.js] No upcoming matches found with applied filters.');
      return res.json([]);
    }

    // Map each row to the desired JSON structure
    const matches = rows.map(row => {
      try {
        console.log(`[matches.js] Processing Match ID ${row.id}:`, JSON.stringify(row, null, 2));

        const lon = parseFloat(row.longitude);
        const lat = parseFloat(row.latitude);

        // Validate coordinates
        if (isNaN(lon) || isNaN(lat)) {
          console.warn(`[matches.js] Match ID ${row.id} has invalid coordinate values (lat=${lat}, lon=${lon}).`);
          return null;
        }

        // Return the formatted match object
        return {
          id: row.id,
          team_home: row.team_home,
          team_away: row.team_away,
          competition_name: row.competition_name,
          match_date: row.match_date,
          stadium_name: row.stadium_name,
          location: {
            coordinates: [lat, lon] // Leaflet expects [latitude, longitude]
          }
        };
      } catch (mapError) {
        console.error(`[matches.js] Error processing Match ID ${row.id}:`, mapError);
        return null;
      }
    });

    // Filter out any null entries (matches that were skipped due to invalid data)
    const validMatches = matches.filter(m => m !== null);

    console.log('[matches.js] Final matches array to send:', JSON.stringify(validMatches, null, 2));

    // Send the matches as JSON
    res.json(validMatches);
  } catch (error) {
    console.error('[matches.js] Error fetching matches:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
