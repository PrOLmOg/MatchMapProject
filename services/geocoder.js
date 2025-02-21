// services/geocoder.js
const axios = require('axios');
require('dotenv').config();

const OPENCAGE_API_URL = 'https://api.opencagedata.com/geocode/v1/json';
const OPENCAGE_API_KEY = process.env.f8f4b44a264f4c5794d5ab8c3a061ec2;

const geocodeLocation = async (locationName) => {
    try {
        const response = await axios.get(OPENCAGE_API_URL, {
            params: {
                q: locationName,
                key: OPENCAGE_API_KEY,
                limit: 1
            }
        });
        if (response.data.results.length === 0) {
            throw new Error('No results found for the given location');
        }
        const { lat, lng } = response.data.results[0].geometry;
        return { latitude: lat, longitude: lng };
    } catch (error) {
        console.error('Geocoding error:', error.message);
        throw error;
    }
};

module.exports = { geocodeLocation };
