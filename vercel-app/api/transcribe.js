// api/transcribe.js - Vercel Serverless Function
import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { image, media_type } = req.body;

    // Validate input
    if (!image) {
      return res.status(400).json({ success: false, error: 'No image provided' });
    }

    // Remove data URL prefix if present
    let imageData = image;
    if (image.includes(',')) {
      imageData = image.split(',')[1];
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Make API call
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: media_type || 'image/png',
              data: imageData,
            },
          },
          {
            type: 'text',
            text: 'Please transcribe the table from this image. Return ONLY a JSON object with this exact structure: {"headers": ["Column1", "Column2", ...], "rows": [["value1", "value2", ...], ...]}. Do not include any other text, explanations, markdown code blocks, or formatting. Just the raw JSON object.',
          },
        ],
      }],
    });

    // Extract response text
    const responseText = message.content[0].text;

    return res.status(200).json({
      success: true,
      data: responseText,
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
