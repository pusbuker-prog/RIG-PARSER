const express = require('express');
const cors = require('cors');
const { parseAll } = require('./parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let cache = { data: null, time: 0 };
const CACHE_TTL = 60 * 60 * 1000;

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'rig-parser' });
});

app.get('/prices', async (req, res) => {
  try {
    const now = Date.now();
    if (cache.data && (now - cache.time) < CACHE_TTL) {
      return res.json({ cached: true, updated: new Date(cache.time).toISOString(), prices: cache.data });
    }

    const models = req.query.models
      ? String(req.query.models).split('|').map(s => s.trim()).filter(Boolean)
      : [];

    if (models.length === 0) {
      return res.status(400).json({ error: 'No models. Use ?models=RTX 4060|Ryzen 5 5600' });
    }

    if (models.length > 25) {
      return res.status(400).json({ error: 'Too many models, max 25 per request' });
    }

    console.log('Parsing', models.length, 'models');
    const prices = await parseAll(models);

    cache = { data: prices, time: now };

    res.json({ cached: false, updated: new Date(now).toISOString(), prices });
  } catch (e) {
    console.error('Parse error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`RIG parser running on port ${PORT}`);
});
