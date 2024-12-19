import React, { useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import { Slate, Editable, withReact } from 'slate-react';
import { createEditor, Transforms } from 'slate';
import { withHistory } from 'slate-history';
import { Node } from 'slate';
import './InputTreatment.css';
import './App.css';
import FormalitySelector from './Formality';

function StoryInput() {
  const [formality, setFormality] = useState('informal');

  // Initialize editors
  const frenchEditor = useMemo(() => withHistory(withReact(createEditor())), []);
  const englishEditor = useMemo(() => withHistory(withReact(createEditor())), []);

  // Initial editor values
  const initialFrenchValue = useMemo(
    () => [{ type: 'paragraph', children: [{ text: '' }] }],
    []
  );
  const initialEnglishValue = useMemo(
    () => [{ type: 'paragraph', children: [{ text: '' }] }],
    []
  );

  const [frenchValue, setFrenchValue] = useState(initialFrenchValue);
  const [englishValue, setEnglishValue] = useState(initialEnglishValue);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFormalityChange = (event) => {
    setFormality(event.target.value);
  };

  const getTextFromSlateValue = (value) => Node.string({ type: 'root', children: value });

  const translate = useCallback(
    async (text, targetLang) => {
      try {
        let content = `Translate this to ${targetLang === 'en' ? 'English' : 'French'}: ${text}`;

        if (formality === 'formal') {
          content += ' Make the translation formal.';
        } else if (formality === 'informal') {
          content += ' Make the translation informal.';
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
    },
    [formality]
  );

  const handleFrenchChange = async (newValue) => {
    setFrenchValue(newValue);
    const text = getTextFromSlateValue(newValue);

    if (/[.,!?]$/.test(text)) {
      setIsLoading(true);
      try {
        const translatedText = await translate(text, 'en');
        setEnglishValue([{ type: 'paragraph', children: [{ text: translatedText }] }]);
      } catch (error) {
        setError('Failed to translate French text to English.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleEnglishChange = async (newValue) => {
    setEnglishValue(newValue);
    const text = getTextFromSlateValue(newValue);

    if (/[.,!?]$/.test(text)) {
      setIsLoading(true);
      try {
        const translatedText = await translate(text, 'fr');
        setFrenchValue([{ type: 'paragraph', children: [{ text: translatedText }] }]);
      } catch (error) {
        setError('Failed to translate English text to French.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div>
      <div>
        <FormalitySelector onFormalityChange={handleFormalityChange} />
      </div>
      {isLoading && <div className="loading">Translating...</div>}
      {error && <div className="error-message">{error}</div>}
      <div className="editor-container">
        {/* French Editor */}
        <Slate
          editor={frenchEditor}
          initialValue={frenchValue}
          onChange={handleFrenchChange}
        >
          <Editable placeholder="FR..." className="trans-textarea" />
        </Slate>

        {/* English Editor */}
        <Slate
          editor={englishEditor}
          initialValuee={englishValue}
          onChange={handleEnglishChange}
        >
          <Editable placeholder="EN..." className="trans-textarea" />
        </Slate>
      </div>
    </div>
  );
}

export default StoryInput;
