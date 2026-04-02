require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
const axios = require('axios');

const app = express();
const cache = new NodeCache({ stdTTL: 600 }); // default 10 dakika cache

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Rate limiting (günlük 100 limit için daha sıkı kontrol)
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 10, // saatte en fazla 10 istek
  message: { error: 'Çok fazla istek. Lütfen daha sonra deneyin.' }
});
app.use('/api/', limiter);

// API-Sports client
const apiSports = axios.create({
  headers: {
    'x-apisports-key': process.env.API_SPORTS_KEY
  }
});

// Bugünün tarihini Istanbul timezone'a göre al
const getToday = () => {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
};

// Örnek endpoint: Bugünkü futbol maçları
app.get('/api/football/today', async (req, res) => {
  try {
    const today = getToday();
    const cacheKey = `football_today_${today}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const response = await apiSports.get(
      `https://v3.football.api-sports.io/fixtures?date=${today}&timezone=Europe/Istanbul`
    );
    cache.set(cacheKey, response.data, 600); // 10 dakika cache
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Status endpoint
app.get('/api/status', async (req, res) => {
  try {
    const response = await apiSports.get('https://v3.football.api-sports.io/status');
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Sports API Backend çalışıyor 🚀' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server ${PORT} portunda çalışıyor`);
});
