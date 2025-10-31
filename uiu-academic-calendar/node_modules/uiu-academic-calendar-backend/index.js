const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Path to the existing calendars.json in the parent repo
const calendarsPath = path.resolve(__dirname, '..', '..', 'web', 'calendars.json');

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/calendars', (req, res) => {
  fs.readFile(calendarsPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Failed to read calendars.json:', err);
      return res.status(500).json({ error: 'Unable to read calendars' });
    }
    try {
      const json = JSON.parse(data);
      res.json(json);
    } catch (e) {
      console.error('Invalid JSON in calendars.json', e);
      res.status(500).json({ error: 'Invalid calendars JSON' });
    }
  });
});

// Serve as static fallback (optional): serve web folder if requested
app.use('/static', express.static(path.resolve(__dirname, '..', '..', 'web')));

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
