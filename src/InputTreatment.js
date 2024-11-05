import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './InputTreatment.css';
import './App.css';
import FormalitySelector from './Formality';

function StoryInput() {
  const [storyText, setStoryText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const textAreaRef1 = useRef(null);
  const textAreaRef2 = useRef(null);
  const [formality, setFormality] = useState('informal');

  // pas super interessant mais peut du code pour du code
  const handleFormalityChange = (event) => {
    setFormality(event.target.value);
  };

  // env blablabla api cacher 
  const translate = async (text,selection , targetLang, preservePunctuation = true) => {
    const aim = targetLang === 'fr' ?  storyText: translatedText;
    console.log(aim)
  
    try {
      let content;

      if (selection) {
      
        content = preservePunctuation
          ? `Translate this selected portion to ${targetLang === 'en' ? 'English' : 'French'}: ${selection} (Use this to give a good translation of the selection (context accurate): ${aim})`
          : `Translate this selected portion to ${targetLang === 'en' ? 'English' : 'French'} but do not add punctuation at the start or end if not already in the given text: ${selection} (The previous translation was: ${aim})`;
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
      console.error('Error API', error);
      throw error;
    }
  };

  // Handle text input changes
  const handleChange = async (event, target) => {
    const text = event.target.value;

    if (target === 'story') {
      setStoryText(text);
      if (/[.,!?]$/.test(text)) {
        const translated = await translate(text,null, 'en');
        setTranslatedText(translated);
      }
    } else {
      setTranslatedText(text);
      if (/[.,!?]$/.test(text)) {
        const translated = await translate(text,null, 'fr');
        setStoryText(translated);
      }
    }
  };

  // Handle text selectionet 
  const handleSelection = async (target) => {
    const textarea = target === 'story' ? textAreaRef1.current : textAreaRef2.current;
    const otherTextarea = target === 'story' ? textAreaRef2.current : textAreaRef1.current;

    const { selectionStart, selectionEnd } = textarea;
    const selectedText = textarea.value.substring(selectionStart, selectionEnd).trim();

    if (selectedText) {
      console.log(`texte selectionner ${selectedText} `)
      const targetLang = target === 'story' ? 'en' : 'fr';
      const translatedWord =  await translate(storyText,selectedText, targetLang, false);
      console.log(`la trad de la selection est ${translatedWord} `)

      
    }
  };

  return (
    <div>
      <div>
        <FormalitySelector onFormalityChange={handleFormalityChange} />
      </div>
      <div>
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
      </div>
    </div>
  );
}

export default StoryInput;
