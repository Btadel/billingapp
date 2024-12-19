import React, { useState, useCallback } from 'react';
import axios from 'axios';
import './InputTreatment.css';
import './App.css';
import FormalitySelector from './Formality';
import { Slate, Editable, withReact } from 'slate-react';
import { withHistory } from 'slate-history';
import { createEditor, Transforms, Range, Editor } from 'slate';

// Initial value for Slate editors
const initialValue = [{ type: "paragraph", children: [{ text: "" }] }];

function StoryInput() {
  const [editorFR] = useState(() => withHistory(withReact(createEditor())));
  const [editorEN] = useState(() => withHistory(withReact(createEditor())));
  const [storyValue, setStoryValue] = useState(initialValue);
  const [translatedValue, setTranslatedValue] = useState(initialValue);
  const [formality, setFormality] = useState("informal");

  // Handle formality changes
  const handleFormalityChange = (event) => {
    setFormality(event.target.value);
  };

  // Translation function
  const translate = async (text, selection, targetLang, preservePunctuation = true) => {
    const context = targetLang === 'fr' ? Editor.string(editorEN, []) : Editor.string(editorFR, []);

    try {
      let content;

      if (selection) {
        content = preservePunctuation
          ? `Translate this selected portion to ${targetLang === 'en' ? 'English' : 'French'}: ${selection} (Use this to give a good translation of the selection (context accurate): ${context})`
          : `Translate this selected portion to ${targetLang === 'en' ? 'English' : 'French'} but do not add punctuation at the start or end if not already in the given text: ${selection} (The previous translation was: ${context})`;
      } else {
        content = preservePunctuation
          ? `Translate this to ${targetLang === 'en' ? 'English' : 'French'}: ${text}`
          : `Translate this to ${targetLang === 'en' ? 'English' : 'French'} but do not add punctuation at the start or end if not already in the given text: ${text}`;
      }

      if (formality === 'formal') {
        content += " Make the translation formal.";
      } else if (formality === 'informal') {
        content += " Make the translation informal.";
      }

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content }]
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.REACT_APP_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  };

  // Handle text input changes
  const handleChange = async (newValue, source, targetEditor, targetLang) => {
    if (source === 'story') {
      setStoryValue(newValue);
      const text = Editor.string(editorFR, []);
      if (/[.,!?]$/.test(text)) {
        const translated = await translate(text, null, targetLang);
        Transforms.select(targetEditor, Editor.range(targetEditor, [0, 0], [0, text.length]));
        Transforms.insertText(targetEditor, translated);
      }
    } else {
      setTranslatedValue(newValue);
      const text = Editor.string(editorEN, []);
      if (/[.,!?]$/.test(text)) {
        const translated = await translate(text, null, 'fr');
        Transforms.select(targetEditor, Editor.range(targetEditor, [0, 0], [0, text.length]));
        Transforms.insertText(targetEditor, translated);
      }
    }
  };

  // Handle text selection for translation
  const handleSelection = useCallback(
    async (sourceEditor, targetEditor, sourceLang, targetLang) => {
      const selection = sourceEditor.selection;

      if (selection && !Range.isCollapsed(selection)) {
        const selectedText = Editor.string(sourceEditor, selection);
        const translatedWord = await translate(selectedText, selectedText, targetLang, false);
        Transforms.select(targetEditor, selection);
        Transforms.insertText(targetEditor, translatedWord);
      }
    },
    [translate]
  );

  return (
    <div>
      <FormalitySelector onFormalityChange={handleFormalityChange} />
      <div className="slate-editors">
        <Slate
          editor={editorFR}
          value={storyValue}
          onChange={(newValue) => setStoryValue(newValue)}
        >
          <Editable
            placeholder="FR..."
            className="trans-textarea"
            onSelect={() => handleSelection(editorFR, editorEN, "fr", "en")}
          />
        </Slate>
        <Slate
          editor={editorEN}
          value={translatedValue}
          onChange={(newValue) => setTranslatedValue(newValue)}
        >
          <Editable
            placeholder="EN..."
            className="trans-textarea"
            onSelect={() => handleSelection(editorEN, editorFR, "en", "fr")}
          />
        </Slate>
      </div>
    </div>
  );
}

export default StoryInput;
