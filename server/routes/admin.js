// server/routes/admin.js

const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticate'); // Middleware to verify JWT
const isAdmin = require('../middleware/isAdmin'); // Middleware to check admin role
const db = require('../db'); // Your database module
const {  getCoordinates } = require('../stadiumUtils');

// Apply authentication and admin authorization middleware to all admin routes
router.use(authenticateToken, isAdmin);

/**
 * GET /api/admin/matches
 * Retrieve all matches
 */
router.get('/matches', async (req, res) => {
  try {
    const query = `
      SELECT
        m.external_id AS id,
        m.team_home,
        m.team_away,
        m.match_date,
        ST_Y(m.location::geometry) AS latitude,
        ST_X(m.location::geometry) AS longitude,
        m.stadium_name,
        c.name AS competition_name
      FROM matches m
      JOIN competitions c ON m.competition_id = c.id
      ORDER BY m.match_date ASC
    `;
    const { rows } = await db.query(query);
    res.json(rows);
  } catch (error) {
    console.error('[admin.js] Error fetching matches:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/admin/matches/:id
 * Retrieve a single match by ID
 */
router.get('/matches/:id', async (req, res) => {
  const matchId = req.params.id;
  try {
    const query = `
      SELECT
        m.external_id AS id,
        m.team_home,
        m.team_away,
        m.match_date,
        ST_Y(m.location::geometry) AS latitude,
        ST_X(m.location::geometry) AS longitude,
        m.stadium_name,
        c.name AS competition_name
      FROM matches m
      JOIN competitions c ON m.competition_id = c.id
      WHERE m.external_id = $1
    `;
    const { rows } = await db.query(query, [matchId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('[admin.js] Error fetching match:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/admin/matches
 * Create a new match
 */
router.post('/matches', async (req, res) => {
  const {
    team_home,
    team_away,
    competition_name,
    match_date,
    stadium_name
  } = req.body;

  try {
    // Validate required fields
    if (!team_home || !team_away || !competition_name || !match_date || !stadium_name) {
      return res.status(400).json({
        error: 'Missing required fields (team_home, team_away, competition_name, match_date, stadium_name).'
      });
    }

    // 1) Find or Insert competition
    let competitionId;
    const compQuery = 'SELECT id FROM competitions WHERE name = $1';
    const compResult = await db.query(compQuery, [competition_name]);
    if (compResult.rows.length === 0) {
      // Insert new competition row
      const insertCompQuery = `
        INSERT INTO competitions (name)
        VALUES ($1)
        RETURNING id
      `;
      const insertCompResult = await db.query(insertCompQuery, [competition_name]);
      competitionId = insertCompResult.rows[0].id;
      console.log(`[admin.js] Created new competition: "${competition_name}" => id ${competitionId}`);
    } else {
      competitionId = compResult.rows[0].id;
      console.log(`[admin.js] Found existing competition "${competition_name}" => id ${competitionId}`);
    }

    // 2) Geocode stadium name -> lat/lon
    const coords = await getCoordinates(stadium_name);
    if (!coords) {
      // If geocode fails, return an error
      return res.status(400).json({
        error: `Unable to find location for stadium: ${stadium_name}. Check the name and try again.`
      });
    }

    const { lat, lon } = coords;
    console.log(`[admin.js] Stadium "${stadium_name}" geocoded -> lat=${lat}, lon=${lon}`);

    // 3) Insert new match
    // DB generates external_id automatically (e.g., SERIAL, or nextval() in your schema)
    const insertMatchQuery = `
      INSERT INTO matches 
        (team_home, team_away, competition_id, match_date, stadium_name, location)
      VALUES 
        ($1,       $2,        $3,             $4,         $5,           ST_SetSRID(ST_MakePoint($6, $7), 4326))
      RETURNING external_id AS id
    `;
    const insertParams = [
      team_home,
      team_away,
      competitionId,
      match_date,
      stadium_name,
      lon, // X coordinate => longitude
      lat  // Y coordinate => latitude
    ];

    const insertResult = await db.query(insertMatchQuery, insertParams);
    const newMatchId = insertResult.rows[0].id;

    console.log(`[admin.js] Inserted new match with external_id=${newMatchId}`);

    return res.status(201).json({
      message: 'Match created successfully',
      id: newMatchId
    });
  } catch (error) {
    console.error('[admin.js] Error creating match:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * PUT /api/admin/matches/:id
 * Update an existing match by ID
 */
router.put('/matches/:id', async (req, res) => {
  const matchId = req.params.id;
  const { team_home, team_away, competition_name, match_date, stadium_name, latitude, longitude } = req.body;
  try {
    // Get competition ID
    let competitionId;
    const compQuery = 'SELECT id FROM competitions WHERE name = $1';
    const compResult = await db.query(compQuery, [competition_name]);
    if (compResult.rows.length === 0) {
      const insertCompQuery = 'INSERT INTO competitions (name) VALUES ($1) RETURNING id';
      const insertCompResult = await db.query(insertCompQuery, [competition_name]);
      competitionId = insertCompResult.rows[0].id;
    } else {
      competitionId = compResult.rows[0].id;
    }

    // Update match
    const coords = await getCoordinates(stadium_name);
    const updateMatchQuery = `
      UPDATE matches
      SET team_home = $1,
          team_away = $2,
          competition_id = $3,
          match_date = $4,
          stadium_name = $5,
          location = ST_SetSRID(ST_MakePoint($6, $7), 4326)
      WHERE external_id = $8
      RETURNING external_id AS id
    `;
    const updateMatchResult = await db.query(updateMatchQuery, [
      team_home,
      team_away,
      competitionId,
      match_date,
      stadium_name,
      coords.lon,
      coords.lat,
      matchId
    ]);

    if (updateMatchResult.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }~

    res.json({ id: updateMatchResult.rows[0].id });
  } catch (error) {
    console.error('[admin.js] Error updating match:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * DELETE /api/admin/matches/:id
 * Delete a match by ID
 */
router.delete('/matches/:id', async (req, res) => {
  const matchId = req.params.id;
  try {
    const deleteMatchQuery = 'DELETE FROM matches WHERE external_id = $1 RETURNING external_id AS id';
    const deleteMatchResult = await db.query(deleteMatchQuery, [matchId]);

    if (deleteMatchResult.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }

    res.json({ id: deleteMatchResult.rows[0].id });
  } catch (error) {
    console.error('[admin.js] Error deleting match:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
