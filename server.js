require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
const axios = require('axios');

const app = express();

// Cache
const cache = new NodeCache({
  stdTTL: 60,        // DEFAULT 60 sn
  checkperiod: 120
});

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Rate limiting – kullanıcı başı backend’i korur
const limiter = rateLimit({
  windowMs: 60 * 1000,      // 1 dakika
  max: 30,                 // dakikada 30 istek
  message: { error: 'Çok fazla istek. Lütfen biraz sonra deneyin.' }
});
app.use('/api/', limiter);

// API-Sports client
const apiSports = axios.create({
  baseURL: 'https://v3.football.api-sports.io',
  headers: {
    'x-apisports-key': process.env.API_SPORTS_KEY
  },
  timeout: 10000
});

// Istanbul tarih helper
const getToday = () =>
  new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });

/* --------------------------------------------------
   ✅ CANLI FUTBOL MAÇLARI
-------------------------------------------------- */
app.get('/api/football/live', async (req, res) => {
  try {
    const cacheKey = 'football_live';
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const response = await apiSports.get('/fixtures', {
      params: {
        live: 'all',
        timezone: 'Europe/Istanbul'
      }
    });

    cache.set(cacheKey, response.data, 60); // 60 sn cache
    res.json(response.data);
  } catch (err) {
    res.status(500).json({
      error: 'Canlı maç verisi alınamadı',
      detail: err.message
    });
  }
});

/* --------------------------------------------------
   ✅ BUGÜNÜN MAÇLARI (FİKSTÜR)
-------------------------------------------------- */
app.get('/api/football/today', async (req, res) => {
  try {
    const today = getToday();
    const cacheKey = `football_today_${today}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const response = await apiSports.get('/fixtures', {
      params: {
        date: today,
        timezone: 'Europe/Istanbul'
      }
    });

    cache.set(cacheKey, response.data, 600); // 10 dk cache
    res.json(response.data);
  } catch (err) {
    res.status(500).json({
      error: 'Bugünkü maçlar alınamadı',
      detail: err.message
    });
  }
});

/* --------------------------------------------------
   ✅ API STATUS
-------------------------------------------------- */
