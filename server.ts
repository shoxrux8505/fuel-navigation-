import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Check SerpApi configuration status
  app.get('/api/serpapi/status', (_req, res) => {
    const hasKey = Boolean(
      process.env.SERPAPI_API_KEY &&
      process.env.SERPAPI_API_KEY !== 'MY_SERPAPI_API_KEY' &&
      process.env.SERPAPI_API_KEY.trim().length > 0
    );

    res.json({
      configured: hasKey,
      engine: 'google_maps',
      endpoint: 'https://serpapi.com/search?engine=google_maps',
      docsUrl: 'https://serpapi.com/google-maps-api'
    });
  });

  // Proxy endpoint for SerpApi Google Maps engine
  app.get('/api/serpapi/search', async (req, res) => {
    try {
      const apiKey = process.env.SERPAPI_API_KEY;
      if (!apiKey || apiKey === 'MY_SERPAPI_API_KEY' || !apiKey.trim()) {
        return res.status(400).json({
          error: 'SERPAPI_API_KEY is not configured',
          message: 'Add your SERPAPI_API_KEY to the environment variables to query live Google Maps places via SerpApi.',
          docs: 'https://serpapi.com/google-maps-api'
        });
      }

      const { q, ll, type, hl, gl, start, data_id, place_id } = req.query;

      const url = new URL('https://serpapi.com/search.json');
      url.searchParams.set('engine', 'google_maps');
      url.searchParams.set('api_key', apiKey.trim());
      if (q) url.searchParams.set('q', String(q));
      if (ll) url.searchParams.set('ll', String(ll));
      if (type) url.searchParams.set('type', String(type));
      if (hl) url.searchParams.set('hl', String(hl));
      if (gl) url.searchParams.set('gl', String(gl));
      if (start) url.searchParams.set('start', String(start));
      if (data_id) url.searchParams.set('data_id', String(data_id));
      if (place_id) url.searchParams.set('place_id', String(place_id));

      const upstreamRes = await fetch(url.toString());
      const data = await upstreamRes.json();
      return res.status(upstreamRes.status).json(data);
    } catch (err: any) {
      console.error('Error fetching from SerpApi:', err);
      return res.status(500).json({ error: err.message || 'Failed to query SerpApi' });
    }
  });

  // Mount Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve static files from dist
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
