// Version 1.1: A more resilient serverless function with better error handling.

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Get the API key from the secure environment variables
  const { GEMINI_API_KEY } = process.env;
  if (!GEMINI_API_KEY) {
    console.error("FATAL: GEMINI_API_KEY environment variable not set.");
    return { statusCode: 500, body: 'API key not configured.' };
  }

  try {
    const { prompt, type } = JSON.parse(event.body);
    
    const requestBody = {
      contents: [{
        parts: [{ text: prompt }],
      }],
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

    console.log(`Calling Gemini API for type: ${type}`);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google AI API Error:', errorText);
      return { statusCode: response.status, body: `Error from Google AI API: ${errorText}` };
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
        console.error("Invalid response from Gemini: No candidates found.");
        return { statusCode: 500, body: 'Invalid response from AI.' };
    }

    const textContent = data.candidates[0].content.parts[0].text;
    console.log("Received text from Gemini:", textContent);

    let responsePayload;

    if (type === 'breakdown') {
        try {
            // The AI might return markdown ```json ... ```, so we clean it.
            const cleanedText = textContent.replace(/```json/g, '').replace(/```/g, '');
            responsePayload = JSON.parse(cleanedText);
        } catch (parseError) {
            console.error("Failed to parse JSON from Gemini for breakdown:", parseError);
            console.error("Original text was:", textContent);
            // Fallback: if parsing fails, we can't proceed.
            return { statusCode: 500, body: 'AI returned a response in an unexpected format.' };
        }
    } else {
        // For the report, we just need the text.
        responsePayload = { report: textContent };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(responsePayload),
    };

  } catch (error) {
    console.error('Netlify function execution error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};