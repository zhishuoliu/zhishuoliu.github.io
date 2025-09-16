export default async function handler(req, res) {
  // Basic CORS handling
  const origin = req.headers.origin;
  const allowed = [
    'https://zhishuoliu.github.io',
    'http://localhost:4000',
    'http://localhost:3000'
  ];
  if (allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Extract client IP from headers
    const xff = req.headers['x-forwarded-for'];
    const remote = req.socket && req.socket.remoteAddress;
    const ip = Array.isArray(xff)
      ? xff[0]
      : (typeof xff === 'string' && xff.split(',')[0].trim()) || remote || '';

    // Query a server-side geolocation API (Vercel can reach global APIs)
    const url = ip
      ? `https://ipapi.co/${encodeURIComponent(ip)}/json/`
      : 'https://ipapi.co/json/';

    const resp = await fetch(url, { method: 'GET' });
    if (!resp.ok) {
      return res.status(502).json({ error: 'Upstream geo API failed' });
    }
    const data = await resp.json();

    const latitude = parseFloat(data.latitude);
    const longitude = parseFloat(data.longitude);

    return res.status(200).json({
      lat: isNaN(latitude) ? null : latitude,
      lng: isNaN(longitude) ? null : longitude,
      city: data.city || 'Unknown',
      country: data.country_name || data.country || 'Unknown',
      ip: data.ip || ip || 'Unknown',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}


