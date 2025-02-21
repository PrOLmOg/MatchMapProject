// server/stadiumUtils.js
const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, '../.env') // the exact file name
});

const axios = require('axios');
const cheerio = require('cheerio');


async function getStadiumName(teamName) {
  const wikipediaApiUrl = 'https://en.wikipedia.org/w/api.php';

  try {
    // Step 1: Search for the team's Wikipedia page with a more precise query
    const searchQueries = [
      `${teamName} `,
      `${teamName} Football Club`,
      `${teamName} (football club)`,
      `${teamName} Association Football Club`,
      `${teamName} cf`,
      `${teamName} F.C`,

    ];

    let teamPageTitle = null;

    for (const query of searchQueries) {
      const searchResponse = await axios.get(wikipediaApiUrl, {
        params: {
          action: 'query',
          list: 'search',
          srsearch: query,
          format: 'json',
          srlimit: 1, // Get the top result
        },
      });

      const searchResults = searchResponse.data.query.search;

      if (searchResults.length > 0) {
        teamPageTitle = searchResults[0].title;
        console.log(`Search Query: "${query}" - Found Page: "${teamPageTitle}"`);
        break; // Exit loop once a page is found
      } else {
        console.warn(`Search Query: "${query}" - No results found.`);
      }
    }

    if (!teamPageTitle) {
      console.warn(`No Wikipedia page found for team: ${teamName}`);
      return null;
    }

    // Step 2: Fetch the HTML content of the team's Wikipedia page
    const pageResponse = await axios.get(wikipediaApiUrl, {
      params: {
        action: 'parse',
        page: teamPageTitle,
        prop: 'text',
        format: 'json',
        redirects: true, // Follow redirects
      },
    });

    const htmlContent = pageResponse.data.parse.text['*'];

    // Step 3: Load HTML into Cheerio for parsing
    const $ = cheerio.load(htmlContent);

    // Step 4: Locate the infobox and extract the stadium name
    // Wikipedia uses various classes for infoboxes; target any infobox
    const infobox = $('.infobox, .infobox.vcard');


    if (infobox.length === 0) {
      console.warn(`No infobox found on Wikipedia page for team: ${teamName}`);
      return null;
    }

    let stadiumName = null;

    // Iterate through each row of the infobox to find the 'Ground' field
    infobox.find('tr').each((index, element) => {
      const header = $(element).find('th').first().text().trim().toLowerCase();

      // Handle different possible header names
      if (
        header === 'ground' ||
        header === 'ground(s)' ||
        header === 'home ground' ||
        header === 'stadium'
      ) {
        const stadiumData = $(element).find('td').first().text().trim();

        // Clean the stadium name by removing references and footnotes
        stadiumName = stadiumData.replace(/\[.*?\]/g, '').trim();

        // Additional cleaning: Remove any unwanted text after the stadium name
        // e.g., "Old Trafford\nCapacity: 74,310" -> "Old Trafford"
        stadiumName = stadiumName.split('\n')[0].trim();

        console.log(`Extracted Stadium Name: "${stadiumName}" for team: "${teamName}"`);
        return false; // Exit the loop once found
      }
    });

    if (stadiumName) {
      return stadiumName;
    } else {
      console.warn(`Stadium name not found in infobox for team: ${teamName}`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching stadium name for team ${teamName}:`, error.message);
    return null;
  }
}

/**
 * Retrieves the geographic coordinates for a given stadium using OpenCage Geocoding API.
 * @param {string} stadiumName - The name of the stadium.
 * @returns {Promise<{lat: number, lon: number} | null>} - The coordinates or null if not found.
 */
async function getCoordinates(stadiumName) {
  const geocodingApiKey = process.env.OPENCAGE_API_KEY;
  const geocodingApiUrl = 'https://api.opencagedata.com/geocode/v1/json';

  if (!geocodingApiKey) {
    console.error('OPENCAGE_API_KEY is not set in the .env file.');
    return null;
  }

  try {
    const response = await axios.get(geocodingApiUrl, {
      params: {
        key: geocodingApiKey,
        q: stadiumName,
        limit: 1, // Get the top result
      },
    });

    const results = response.data.results;

    if (results.length === 0) {
      console.warn(`No geocoding results found for stadium: ${stadiumName}`);
      return null;
    }

    const { lat, lng } = results[0].geometry;
    console.log(`Coordinates for stadium "${stadiumName}": Latitude ${lat}, Longitude ${lng}`);
    return { lat, lon: lng };
  } catch (error) {
    console.error(`Error fetching coordinates for stadium "${stadiumName}":`, error.message);
    return null;
  }
}

module.exports = { getStadiumName, getCoordinates };
