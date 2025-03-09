import axios from 'axios';

export const translateText = async (text, sourceLang, targetLang, formality, cancelTokenSourceRef) => {
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
  if (cancelTokenSourceRef.current) {
    cancelTokenSourceRef.current.cancel();
  }
  const source = axios.CancelToken.source();
  cancelTokenSourceRef.current = source;

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    { model: 'gpt-4o', messages: [{ role: 'user', content: prompt }] },
    {
      headers: {
        Authorization: `Bearer ${process.env.REACT_APP_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      cancelToken: source.token,
    }
  );
  return response.data.choices[0].message.content;
};

export const translateWord = async (word, context, targetLang, formality) => {
  const prompt =
    `Translate this word to ${targetLang === 'en' ? 'English' : 'French'}: ${word}` +
    (formality === 'formal'
      ? ' Make it formal.,no brackets or else'
      : ' Make it informal.' + `with this ${context} , i want a one word answer no brackets or else`);

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    { model: 'gpt-4o', messages: [{ role: 'user', content: prompt }] },
    {
      headers: {
        Authorization: `Bearer ${process.env.REACT_APP_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data.choices[0].message.content;
};