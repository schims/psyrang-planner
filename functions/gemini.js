// This is your secure, server-side Netlify Function.
// It acts as a proxy between your app and the Google AI API.

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Get the API key from the secure environment variables
  const { GEMINI_API_KEY } = process.env;
  if (!GEMINI_API_KEY) {
    return { statusCode: 500, body: 'API key not found.' };
  }

  try {
    const { prompt, type } = JSON.parse(event.body);
    
    // Construct the request payload for the Gemini API
    const requestBody = {
      contents: [{
        parts: [{ text: prompt }],
      }],
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

    // Use the built-in fetch in the Netlify environment
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google AI API Error:', errorText);
      return { statusCode: response.status, body: `Error from Google AI API: ${errorText}` };
    }

    const data = await response.json();
    
    // Extract the text content from the Gemini response
    const textContent = data.candidates[0].content.parts[0].text;

    // The frontend expects a specific JSON structure back, so we re-package it.
    let responsePayload;
    if (type === 'breakdown') {
        // We expect the AI to return a JSON string, so we parse it.
        responsePayload = JSON.parse(textContent);
    } else {
        // For the report, we send the raw text back.
        responsePayload = { report: textContent };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(responsePayload),
    };

  } catch (error) {
    console.error('Netlify function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};