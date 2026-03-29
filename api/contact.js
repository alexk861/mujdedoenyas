/**
 * /api/contact — Vercel Serverless Function
 *
 * Receives form submissions and sends email notifications
 * via Resend API to the configured recipients.
 *
 * Environment variables required:
 *   RESEND_API_KEY — Resend.com API key
 */

const RECIPIENTS = ['mujde.doenyas@gmail.com', 'k.alexi@gmail.com'];

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

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
    }

    // Build email HTML
    const html = `
      <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
        <div style="border-bottom: 2px solid #8B7355; padding-bottom: 20px; margin-bottom: 24px;">
          <h1 style="font-size: 24px; font-style: italic; margin: 0; color: #8B7355;">
            🎹 New Song Request
          </h1>
          <p style="font-size: 13px; color: #666; margin: 8px 0 0 0;">
            mujdedoenyas.com — ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 12px 0; font-weight: bold; width: 120px; vertical-align: top; color: #555;">Name</td>
            <td style="padding: 12px 0;">${esc(name)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 12px 0; font-weight: bold; vertical-align: top; color: #555;">Email</td>
            <td style="padding: 12px 0;"><a href="mailto:${esc(email)}" style="color: #8B7355;">${esc(email)}</a></td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 12px 0; font-weight: bold; vertical-align: top; color: #555;">Piece</td>
            <td style="padding: 12px 0; font-style: italic;">${esc(piece)}</td>
          </tr>
          ${story ? `
          <tr>
            <td style="padding: 12px 0; font-weight: bold; vertical-align: top; color: #555;">Story</td>
            <td style="padding: 12px 0;">${esc(story).replace(/\n/g, '<br>')}</td>
          </tr>` : ''}
        </table>
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #999; margin: 0;">
            Submitted via mujdedoenyas.com contact form.
          </p>
        </div>
      </div>
    `;

    // Send via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Müjde Doenyas <noreply@mujdedoenyas.com>',
        to: RECIPIENTS,
        reply_to: email,
        subject: `🎹 Song Request: ${piece} — from ${name}`,
        html,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[contact] Resend error:', errText);
      // Fallback: try with onboarding sender if domain not verified
      if (errText.includes('not verified') || errText.includes('not allowed')) {
        const fallback = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Müjde Doenyas Website <onboarding@resend.dev>',
            to: RECIPIENTS,
            reply_to: email,
            subject: `🎹 Song Request: ${piece} — from ${name}`,
            html,
          }),
        });
        if (!fallback.ok) {
          const fbErr = await fallback.text();
          console.error('[contact] Resend fallback error:', fbErr);
          return res.status(500).json({ error: 'Failed to send email' });
        }
        const fbResult = await fallback.json();
        console.log('[contact] Email sent (fallback):', fbResult.id);
        return res.status(200).json({ success: true });
      }
      return res.status(500).json({ error: 'Failed to send email' });
    }

    const result = await response.json();
    console.log('[contact] Email sent:', result.id);
    return res.status(200).json({ success: true, message: 'Request sent successfully' });

  } catch (error) {
    console.error('[contact] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
