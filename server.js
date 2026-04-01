require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');

const app = express();
const cache = new NodeCache({ stdTTL: 60 });

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

const axios = require('axios');
const apiSports = axios.create({
  headers: {
    'x-apisports-key': process.env.API_SPORTS_KEY
  }
});

// Bugünün tarihini Istanbul timezone'a göre al
const getToday = () => {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
};

// ─── FOOTBALL ───────────────────────────────────────────────────────────────

// Bugünün maçları (live=all Free planda çalışmıyor, date kullanıyoruz)
app.get('/api/football/live', async (req, res) => {
  try {
    const today = getToday();
    const cacheKey = `football_live_${today}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const response = await apiSports.get(
      `https://v3.football.api-sports.io/fixtures?date=${today}&timezone=Europe/Istanbul`
    );
    cache.set(cacheKey, response.data, 60); // 60 saniye cache
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bugünkü maçlar (aynı endpoint, alias)
app.get('/api/football/today', async (req, res) => {
  try {
    const today = getToday();
    const cacheKey = `football_today_${today}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const response = await apiSports.get(
      `https://v3.football.api-sports.io/fixtures?date=${today}&timezone=Europe/Istanbul`
    );
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

// Bugünün maçları (live=all Free planda çalışmıyor)
app.get('/api/basketball/live', async (req, res) => {
  try {
    const today = getToday();
    const cacheKey = `basketball_live_${today}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const response = await apiSports.get(
      `https://v1.basketball.api-sports.io/games?date=${today}&timezone=Europe/Istanbul`
    );
    cache.set(cacheKey, response.data, 60);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/basketball/today', async (req, res) => {
  try {
    const today = getToday();
    const cacheKey = `basketball_today_${today}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const response = await apiSports.get(
      `https://v1.basketball.api-sports.io/games?date=${today}&timezone=Europe/Istanbul`
    );
    cache.set(cacheKey, response.data, 120);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── TENNIS ─────────────────────────────────────────────────────────────────

app.get('/api/tennis/live', async (req, res) => {
  try {
    const today = getToday();
    const cacheKey = `tennis_live_${today}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const response = await apiSports.get(
      `https://v1.tennis.api-sports.io/games?date=${today}&timezone=Europe/Istanbul`
    );
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

    const response = await apiSports.get(
      `https://v1.formula-1.api-sports.io/races?season=${season}`
    );
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

    const response = await apiSports.get(
      `https://v1.formula-1.api-sports.io/rankings/drivers?season=${season}`
    );
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
