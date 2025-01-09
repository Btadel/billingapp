import React, { useState, useRef } from 'react';
import axios from 'axios';
import './InputTreatment.css';
import './App.css';
import FormalitySelector from './Formality';
import WordMappings from './WordMappings';
import HashTable from './hashswitch';
import SwitchButton from './SwitchButton';


function StoryInput() {
  const [storyText, setTranslatedText] = useState('');
  const [translatedText, setTranslatedText1] = useState('');
  const [wordMappings, setWordMappings] = useState([]);
  const [formality, setFormality] = useState('informal');
  const [error, setError] = useState(null);
  const [isSwitchOn, setIsSwitchOn] = useState(false);
  const lastWordRef = useRef('');
  const contextRef = useRef('');
  
  
  const textAreaRef1 = useRef(null);
  const textAreaRef2 = useRef(null);

  const wordBankFr = new HashTable();
  const wordBankEn = new HashTable();

  

  ["je", "tu", "il", "elle", "nous", "vous", "ils", "elles", "le", "la", "les", "un", "une", "de", "à", "et", "ou", "mais", "dans"]
    .forEach(word => wordBankFr.set(word, true));


  ["I", "you", "he", "she", "we", "they", "it", "a", "an", "the", "of", "and", "or", "but", "in", "on", "with", "by", "for"]
    .forEach(word => wordBankEn.set(word, true));
  
  const handleToggle = (isOn) => {
    setIsSwitchOn(isOn);
    console.log(`Switch is now ${isOn ? 'ON' : 'OFF'}`);
  };


  const translateText = async (text, targetLang) => {
    try {
      const prompt = `I only want thr translation (no brackets) ,Translate this text to ${targetLang === 'en' ? 'English' : 'French'}: ${text}` +
        (formality === 'formal' ? ' Make it formal.' : ' Make it informal.');

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
    } catch (error) {
      console.error('Error translating text:', error);
      return text;
    }
  };

  const translateWord = async (word,context, targetLang) => {
    try {
      const prompt = `Translate this word to ${targetLang === 'en' ? 'English' : 'French'}: ${word}` +
        (formality === 'formal' ? ' Make it formal.' : ' Make it informal.' + `with this ${context} , i want a one word answer no brackets or else`);

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
    } catch (error) {
      console.error('Error translating text:', error);
      return word;
    }
  };

  const isWordInBank = (word, language) => {
    const wordBank = language === "fr" ? wordBankFr : wordBankEn;
    return !!wordBank.get(word.toLowerCase());
};

  const translateWithMapping = async (text, selection, targetLang) => {
    try {
      const translated = await translateText(text, selection, targetLang);

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

  const handleLanguageSwitch = async (word, target, context) => {
    const targetLang = target === 'story' ? 'fr' : 'en';
    const translatedWord = await translateWord(word, context, targetLang);

    if (target === 'story') {
        // Remplace le mot dans le texte d'origine (FR)
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const newSourceValue = storyText.replace(
            new RegExp(`\\b${escapedWord}\\b$`),
            translatedWord
        ).trim();

        setTranslatedText(newSourceValue); // Met à jour le texte FR

        // Traduire le texte mis à jour en anglais et mettre dans la cible
        const fullTranslation = await translateText(newSourceValue, 'en');
        setTranslatedText1(fullTranslation); // Met à jour le texte EN
    } else {
        // Remplace le mot dans le texte traduit (EN)
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const newSourceValue = translatedText.replace(
            new RegExp(`\\b${escapedWord}\\b$`),
            translatedWord
        ).trim();

        setTranslatedText1(newSourceValue); // Met à jour le texte EN

        // Traduire le texte mis à jour en français et mettre dans la cible
        const fullTranslation = await translateText(newSourceValue, 'fr');
        setTranslatedText(fullTranslation); // Met à jour le texte FR

        textAreaRef1.current.focus();
    }

    console.log(`Original : ${word}`);
    console.log(`Translated: ${translatedWord}`);
};



  const handleChange = async (event, target) => {
    const text = event.target.value;

    if (event.nativeEvent.data === ' ') {
        const words = text.trim().split(/\s+/); // Split the input into words

        // Update refs with last word and context
        lastWordRef.current = words[words.length - 1];
        contextRef.current = words.slice(-8, -1).join(' ');

        console.log('Last Word:', lastWordRef.current);
        console.log('Context:', contextRef.current);

        if (isSwitchOn && lastWordRef.current) {
            if ((target === 'story' && isWordInBank(lastWordRef.current, 'en')) ||
                (target === 'translation' && isWordInBank(lastWordRef.current, 'fr'))) {
                console.warn(`Incorrect language word detected: ${lastWordRef.current}`);
                await handleLanguageSwitch(lastWordRef.current, target, contextRef.current);
                console.log("le texte est " + storyText)


                return;
            }
        }
    }

    // Handle state updates for text and translation
    if (target === 'story') {
        setTranslatedText(text);
        if (/[.,!?]$/.test(text)) {
            const translated = await translateText(text, 'en');
            setTranslatedText1(translated);
        }
    } else {
        setTranslatedText1(text);
        if (/[.,!?]$/.test(text)) {
            const translated = await translateText(text, 'fr');
            setTranslatedText(translated);
        }
    }
};

  
  

  return (
    <div>
      <SwitchButton onToggle={handleToggle} />
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
