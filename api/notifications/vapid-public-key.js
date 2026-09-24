export default function handler(_req, res) {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) return res.status(503).json({ error: 'Las notificaciones aún no están configuradas.' });
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.status(200).json({ publicKey });
}
