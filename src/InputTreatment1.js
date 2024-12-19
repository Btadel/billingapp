import React, { useState, useRef } from 'react';
import axios from 'axios';
import './InputTreatment.css';
import './App.css';
import FormalitySelector from './Formality';
import WordMappings from './WordMappings';
import { debounce } from 'lodash';

function StoryInput() {
  const [storyText, setStoryText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [wordMappings, setWordMappings] = useState([]);
  const [formality, setFormality] = useState('informal');
  const [error, setError] = useState(null);

  const textAreaRef1 = useRef(null);
  const textAreaRef2 = useRef(null);

  const translateWithMapping = async (text, selection, targetLang) => {
    try {
      const translated = await translate(text, selection, targetLang);

      // Generate word mapping
      const originalWords = (selection || text).split(' ');
      const translatedWords = translated.split(' ');

      const mappings = originalWords.map((word, index) => ({
        original: word,
        translated: translatedWords[index] || '',
      }));

      setWordMappings((prevMappings) => [...prevMappings, ...mappings]);

      return translated;
    } catch (error) {
      console.error('Translation failed:', error);
      throw error;
    }
  };

  const translate = async (text, selection, targetLang) => {
    try {
      let content = selection
        ? `Translate this selected portion to ${targetLang}: ${selection}`
        : `Translate this to ${targetLang}: ${text}`;
      if (formality) {
        content += ` Make the translation ${formality}.`;
      }

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content }],
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.REACT_APP_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('Translation failed:', error);
      throw error;
    }
  };

  const handleSelection = (target) => {
    const sourceTextarea = target === 'story' ? textAreaRef1.current : textAreaRef2.current;
    const targetTextarea = target === 'story' ? textAreaRef2.current : textAreaRef1.current;

    const { selectionStart, selectionEnd } = sourceTextarea;
    const selectedText = sourceTextarea.value.substring(selectionStart, selectionEnd).trim();

    if (selectedText.length > 0) {
      // Find corresponding translated text using the wordMappings
      const mappings = target === 'story' ? wordMappings : wordMappings.map((m) => ({
        original: m.translated,
        translated: m.original,
      }));

      const selectedWords = selectedText.split(' ');

      // Find the start and end indices of the selected words in the mapping
      let startIndex = -1;
      let endIndex = -1;

      mappings.forEach((mapping, index) => {
        if (mapping.original === selectedWords[0] && startIndex === -1) {
          startIndex = index;
        }
        if (mapping.original === selectedWords[selectedWords.length - 1]) {
          endIndex = index;
        }
      });

      if (startIndex !== -1 && endIndex !== -1) {
        const translatedWords = mappings.slice(startIndex, endIndex + 1).map((m) => m.translated);
        const translatedText = translatedWords.join(' ');

        // Find start and end positions of the translated text
        const targetText = targetTextarea.value;
        const start = targetText.indexOf(translatedWords[0]);
        const end = start + translatedText.length;

        // Highlight the corresponding text in the target textarea
        targetTextarea.setSelectionRange(start, end);
        targetTextarea.focus();
      }
    }
  };

  const handleChange = (event, target) => {
    const text = event.target.value;

    if (target === 'story') {
      setStoryText(text);
      if (/[.,!?]$/.test(text)) {
        translateWithMapping(text, null, 'en').then((translated) =>
          setTranslatedText(translated)
        );
      }
    } else {
      setTranslatedText(text);
      if (/[.,!?]$/.test(text)) {
        translateWithMapping(text, null, 'fr').then((translated) =>
          setStoryText(translated)
        );
      }
    }
  };

  return (
    <div>
      {error && <div className="error-message">{error}</div>}
      <FormalitySelector onFormalityChange={(e) => setFormality(e.target.value)} />
      <textarea
        ref={textAreaRef1}
        value={storyText}
        onChange={(e) => handleChange(e, 'story')}
        onSelect={() => handleSelection('story')}
        placeholder="FR..."
        rows="10"
        className="trans-textarea"
      />
      <textarea
        ref={textAreaRef2}
        value={translatedText}
        onChange={(e) => handleChange(e, 'translation')}
        onSelect={() => handleSelection('translation')}
        placeholder="EN..."
        rows="10"
        className="trans-textarea"
      />
      <WordMappings mappings={wordMappings} />
    </div>
  );
}

export default StoryInput;
