require('dotenv').config();
const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');

const app = express();
const cache = new NodeCache({ stdTTL: 30 }); // 30 sn cache = free plan dostu

// ---------- API CLIENTS ----------
const footballApi = axios.create({
  baseURL: 'https://v3.football.api-sports.io',
  headers: { 'x-apisports-key': process.env.API_SPORTS_KEY }
});

const basketballApi = axios.create({
  baseURL: 'https://v1.basketball.api-sports.io',
  headers: { 'x-apisports-key': process.env.API_SPORTS_KEY }
});

const tennisApi = axios.create({
  baseURL: 'https://v1.tennis.api-sports.io',
  headers: { 'x-apisports-key': process.env.API_SPORTS_KEY }
});

// ---------- FOOTBALL ----------
app.get('/api/football/live', async (req, res) => {
  const cached = cache.get('football_live');
  if (cached) return res.json(cached);

  try {
    const r = await footballApi.get('/fixtures', {
      params: { live: 'all' }
    });
    cache.set('football_live', r.data);
    res.json(r.data);
  } catch {
    res.status(500).json({ error: 'Football API error' });
  }
});

// ---------- BASKETBALL ----------
app.get('/api/basketball/live', async (req, res) => {
  const cached = cache.get('basketball_live');
  if (cached) return res.json(cached);

  try {
    const r = await basketballApi.get('/games', {
      params: { live: 'all' }
    });
    cache.set('basketball_live', r.data);
    res.json(r.data);
  } catch {
    res.status(500).json({ error: 'Basketball API error' });
  }
});

// ---------- TENNIS ----------
app.get('/api/tennis/live', async (req, res) => {
  const cached = cache.get('tennis_live');
  if (cached) return res.json(cached);

  try {
    const r = await tennisApi.get('/games', {
      params: { live: 'all' }
    });
    cache.set('tennis_live', r.data);
    res.json(r.data);
  } catch {
    res.status(500).json({ error: 'Tennis API error' });
  }
});

// ---------- STATUS ----------
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Backend çalışıyor 🚀' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('✅ Backend hazır'));
