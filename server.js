require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');

const app = express();
const cache = new NodeCache({ stdTTL: 60 }); // 60 saniye cache

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Çok fazla istek. 1 dakika sonra tekrar deneyin.' }
});
app.use('/api/', limiter);

// API-Sports axios instance
const axios = require('axios');
const apiSports = axios.create({
  headers: {
    'x-apisports-key': process.env.API_SPORTS_KEY
  }
});

// Cache middleware
const withCache = (key, ttl = 60) => async (fn) => {
  const cached = cache.get(key);
  if (cached) return cached;
  const data = await fn();
  cache.set(key, data, ttl);
  return data;
};

// ─── FOOTBALL ───────────────────────────────────────────────────────────────

// Canlı maçlar
app.get('/api/football/live', async (req, res) => {
  try {
    const cacheKey = 'football_live';
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const response = await apiSports.get('https://v3.football.api-sports.io/fixtures?live=all');
    cache.set(cacheKey, response.data, 30);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bugünkü maçlar
app.get('/api/football/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `football_today_${today}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const response = await apiSports.get(`https://v3.football.api-sports.io/fixtures?date=${today}`);
    cache.set(cacheKey, response.data, 120);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Maç detayı
app.get('/api/football/fixture/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `fixture_${id}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const [fixture, events, stats] = await Promise.all([
      apiSports.get(`https://v3.football.api-sports.io/fixtures?id=${id}`),
      apiSports.get(`https://v3.football.api-sports.io/fixtures/events?fixture=${id}`),
      apiSports.get(`https://v3.football.api-sports.io/fixtures/statistics?fixture=${id}`)
    ]);

    const data = {
      fixture: fixture.data,
      events: events.data,
      stats: stats.data
    };
    cache.set(cacheKey, data, 30);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ligler
app.get('/api/football/leagues', async (req, res) => {
  try {
    const { country } = req.query;
    const cacheKey = `leagues_${country || 'all'}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const url = country
      ? `https://v3.football.api-sports.io/leagues?country=${country}&current=true`
      : `https://v3.football.api-sports.io/leagues?current=true`;
    const response = await apiSports.get(url);
    cache.set(cacheKey, response.data, 3600);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Puan tablosu
app.get('/api/football/standings/:leagueId', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { season } = req.query;
    const currentSeason = season || new Date().getFullYear();
    const cacheKey = `standings_${leagueId}_${currentSeason}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const response = await apiSports.get(
      `https://v3.football.api-sports.io/standings?league=${leagueId}&season=${currentSeason}`
    );
    cache.set(cacheKey, response.data, 1800);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── BASKETBALL ─────────────────────────────────────────────────────────────

app.get('/api/basketball/live', async (req, res) => {
  try {
    const cacheKey = 'basketball_live';
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const response = await apiSports.get('https://v1.basketball.api-sports.io/games?live=all');
    cache.set(cacheKey, response.data, 30);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/basketball/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `basketball_today_${today}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const response = await apiSports.get(`https://v1.basketball.api-sports.io/games?date=${today}`);
    cache.set(cacheKey, response.data, 120);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── TENNIS ─────────────────────────────────────────────────────────────────

app.get('/api/tennis/live', async (req, res) => {
  try {
    const cacheKey = 'tennis_live';
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    // Tennis API - today's games
    const today = new Date().toISOString().split('T')[0];
    const response = await apiSports.get(`https://v1.tennis.api-sports.io/games?date=${today}`);
    cache.set(cacheKey, response.data, 60);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── MMA ────────────────────────────────────────────────────────────────────

app.get('/api/mma/upcoming', async (req, res) => {
  try {
    const cacheKey = 'mma_upcoming';
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const response = await apiSports.get('https://v1.mma.api-sports.io/fights?next=10');
    cache.set(cacheKey, response.data, 3600);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── FORMULA 1 ──────────────────────────────────────────────────────────────

app.get('/api/formula1/races', async (req, res) => {
  try {
    const season = new Date().getFullYear();
    const cacheKey = `f1_races_${season}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const response = await apiSports.get(`https://v1.formula-1.api-sports.io/races?season=${season}`);
    cache.set(cacheKey, response.data, 3600);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/formula1/standings', async (req, res) => {
  try {
    const season = new Date().getFullYear();
    const cacheKey = `f1_standings_${season}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const response = await apiSports.get(`https://v1.formula-1.api-sports.io/rankings/drivers?season=${season}`);
    cache.set(cacheKey, response.data, 3600);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── STATUS ─────────────────────────────────────────────────────────────────

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
  console.log(`📡 API-Sports Key: ${process.env.API_SPORTS_KEY ? '***SET***' : 'NOT SET!'}`);
});
