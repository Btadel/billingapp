import axios from 'axios';

export const translateText = async (text, sourceLang, targetLang, formality) => {
  // Build the prompt
  const prompt = `
    Translate this text from ${sourceLang} to ${targetLang}.
    Then, provide your response in this format:
    Full Translation:
    [Ici la traduction complète sur plusieurs lignes si besoin]
    Word Mapping:
    [sourceWord1] -> [targetWord1]
    [sourceWord2] -> [targetWord2]
    ...
    Text: "${text}"
    ${formality === 'formal' ? 'Make it formal.' : 'Make it informal.'}
    IMPORTANT: Do NOT return JSON. Only free text with these two sections, none of your commentary.
  `;

  // Make the request (no cancellation)
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.REACT_APP_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );
  console.log(response.data.choices[0].message.content);
  // Return the text from the assistant
  return response.data.choices[0].message.content;
};

export const translateWord = async (word, context, targetLang, formality) => {
  // Build the prompt
  const prompt =
    `Translate this word to ${
      targetLang === 'en' ? 'English' : 'French'
    }: ${word}` +
    (formality === 'formal'
      ? ' Make it formal.,no brackets or else'
      : ' Make it informal.' + `with this ${context} , i want a one word answer no brackets or else`);

  // Make the request (no cancellation)
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.REACT_APP_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data.choices[0].message.content;
};
