/**
 * /api/contact — Vercel Serverless Function
 *
 * Receives form submissions and forwards them as email notifications
 * via Web3Forms API (free, no domain verification needed).
 *
 * Environment variables required:
 *   WEB3FORMS_KEY — Access key from web3forms.com
 */

export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, piece, story } = req.body;

    // Basic validation
    if (!name || !email || !piece) {
      return res.status(400).json({ error: 'Name, email, and piece are required' });
    }

    // Simple email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const accessKey = process.env.WEB3FORMS_KEY;
    if (!accessKey) {
      return res.status(500).json({ error: 'WEB3FORMS_KEY not configured' });
    }

    // Send via Web3Forms API
    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_key: accessKey,
        subject: `🎹 Song Request: ${piece} — from ${name}`,
        from_name: 'Müjde Doenyas Website',
        replyto: email,
        name,
        email,
        piece,
        story: story || '(no story provided)',
      }),
    });

    const result = await response.json();

    if (!result.success) {
      console.error('[contact] Web3Forms error:', result);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    console.log('[contact] Email sent successfully');
    return res.status(200).json({ success: true, message: 'Request sent successfully' });

  } catch (error) {
    console.error('[contact] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
