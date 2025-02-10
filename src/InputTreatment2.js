import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './InputTreatment.css';
import './App.css';
import FormalitySelector from './Formality';
import WordMappings from './WordMappings';
import HashTable from './hashswitch';
import SwitchButton from './SwitchButton';

import parseGPTOutput from './parseGPTOutput.js';

// 1. Import de debounce (attention au chemin : 'lodash/debounce')
import debounce from 'lodash/debounce';

function StoryInput() {
  const [storyText, setTranslatedText] = useState('');
  const [translatedText, setTranslatedText1] = useState('');
  const [wordMappings, setWordMappings] = useState([]);
  const [formality, setFormality] = useState('informal');
  const [error, setError] = useState(null);
  const [isSwitchOn, setIsSwitchOn] = useState(false);
  const lastWordRef = useRef('');
  const contextRef = useRef('');
  const [mappingTree, setMappingTree] = useState(null);
  const [mappingHash, setMappingHash] = useState(null);

  const textAreaRef1 = useRef(null);
  const textAreaRef2 = useRef(null);

  const wordBankFr = new HashTable();
  const wordBankEn = new HashTable();

  // Remplir le dictionnaire FR
  [
    'je',
    'tu',
    'il',
    'elle',
    'nous',
    'vous',
    'ils',
    'elles',
    'le',
    'la',
    'les',
    'un',
    'une',
    'de',
    'à',
    'et',
    'ou',
    'mais',
    'dans',
  ].forEach((word) => wordBankFr.set(word, true));

  // Remplir le dictionnaire EN
  [
    'I',
    'you',
    'he',
    'she',
    'we',
    'they',
    'it',
    'a',
    'an',
    'the',
    'of',
    'and',
    'or',
    'but',
    'in',
    'on',
    'with',
    'by',
    'for',
  ].forEach((word) => wordBankEn.set(word, true));

  const handleToggle = (isOn) => {
    setIsSwitchOn(isOn);
    console.log(`Switch is now ${isOn ? 'ON' : 'OFF'}`);
  };

  // --- Fonctions de traduction vers FR/EN ---
  const translateText = async (text, targetLang) => {
    try {
      const prompt = `
        Translate this text to ${targetLang === 'en' ? 'English' : 'French'}.
  
        Then, provide your response in this format:
  
        Full Translation:
        [Ici la traduction complète sur plusieurs lignes si besoin]
  
        Word Mapping:
        [sourceWord1] -> [targetWord1]
        [sourceWord2] -> [targetWord2]
        ...
  
        Text: "${text}"
  
        ${formality === 'formal' ? 'Make it formal.' : 'Make it informal.'}
  
        IMPORTANT: Do NOT return JSON. Only free text with these two sections.
      `;

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          // Note: vérifiez votre modèle (gpt-4, gpt-3.5-turbo, etc.)
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

      const rawOutput = response.data.choices[0].message.content;
      console.log('GPT raw output:', rawOutput);

      const { translation, mappingArray } = parseGPTOutput(rawOutput);

      console.log('Parsed translation:', translation);
      console.log('Parsed mapping array:', mappingArray);

      // On construit un HashTable pour les mappings
      const hashMap = new HashTable();
      mappingArray.forEach(([source, target]) => {
        hashMap.set(source, target);
      });

      setMappingHash(hashMap);

      return translation;
    } catch (error) {
      console.error('Error translating text:', error);
      return text;
    }
  };

  const translateWord = async (word, context, targetLang) => {
    try {
      const prompt =
        `Translate this word to ${
          targetLang === 'en' ? 'English' : 'French'
        }: ${word}` +
        (formality === 'formal'
          ? ' Make it formal.'
          : ' Make it informal.' + `with this ${context} , i want a one word answer no brackets or else`);

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
    const wordBank = language === 'fr' ? wordBankFr : wordBankEn;
    return !!wordBank.get(word.toLowerCase());
  };

  const translateWithMapping = async (text, selection, targetLang) => {
    try {
      const translated = await translateText(text, targetLang);
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
      const mappings =
        target === 'story'
          ? wordMappings
          : wordMappings.map((m) => ({
              original: m.translated,
              translated: m.original,
            }));

      const selectedWords = selectedText.split(' ');

      // Find indices
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

        // Trouver la portion correspondante
        const targetText = targetTextarea.value;
        const start = targetText.indexOf(translatedWords[0]);
        const end = start + translatedText.length;

        targetTextarea.setSelectionRange(start, end);
        targetTextarea.focus();
      }
    }
  };

  const handleLanguageSwitch = async (word, target, context) => {
    // Détermine la langue cible en se basant sur la zone où l'utilisateur tape
    const targetLang = target === 'story' ? 'fr' : 'en';
    // On récupère la traduction d'un mot isolé
    const translatedWord = await translateWord(word, context, targetLang);
  
    if (target === 'story') {
      // L'utilisateur tapait dans la zone "story" (FR), mais a tapé un mot anglais
      // Logique existante : remplacement dans la zone FR
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const newSourceValue = storyText
        .replace(new RegExp(`\\b${escapedWord}\\b$`), translatedWord)
        .trim();
  
      setTranslatedText(newSourceValue);
  
      // On fait votre "fullTranslation" vers l'anglais
      const fullTranslation = await translateText(newSourceValue, 'en');
      setTranslatedText1(fullTranslation);
  
      // ─────────────────────────────────────────────────────
      // AJOUT : basculer le focus vers la zone EN (textareaRef2)
      // et positionner le curseur à la fin.
      // ─────────────────────────────────────────────────────
      textAreaRef2.current.focus();
      textAreaRef2.current.selectionStart = textAreaRef2.current.value.length;
      textAreaRef2.current.selectionEnd = textAreaRef2.current.value.length;
    } else {
      // L'utilisateur tapait dans la zone "translation" (EN), mais a tapé un mot français
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const newSourceValue = translatedText
        .replace(new RegExp(`\\b${escapedWord}\\b$`), translatedWord)
        .trim();
  
      setTranslatedText1(newSourceValue);
  
      // On fait votre "fullTranslation" vers le français
      const fullTranslation = await translateText(newSourceValue, 'fr');
      setTranslatedText(fullTranslation);
  
      // AJOUT : basculer le focus vers la zone FR (textareaRef1)
      textAreaRef1.current.focus();
      textAreaRef1.current.selectionStart = textAreaRef1.current.value.length;
      textAreaRef1.current.selectionEnd = textAreaRef1.current.value.length;
    }
  
    console.log(`Original : ${word}`);
    console.log(`Translated: ${translatedWord}`);
  };

  // 2. On crée deux fonctions de traduction “débouncées” :
  //    l'une pour passer en EN, l'autre pour passer en FR.
  //    On les mémorise via useRef pour ne pas recréer à chaque rendu.
  const debouncedTranslateToEN = useRef(
    debounce(async (text) => {
      try {
        // On appelle votre fonction existante
        const translated = await translateText(text, 'en');
        setTranslatedText1(translated);
      } catch (error) {
        console.error('Debounced FR->EN failed:', error);
      }
    }, 500)
  ).current;

  const debouncedTranslateToFR = useRef(
    debounce(async (text) => {
      try {
        const translated = await translateText(text, 'fr');
        setTranslatedText(translated);
      } catch (error) {
        console.error('Debounced EN->FR failed:', error);
      }
    }, 500)
  ).current;

  // 3. On remplace uniquement les appels directs à `translateText`
  //    dans la logique de ponctuation par les fonctions "débouncées".
  const handleChange = async (event, target) => {
    const text = event.target.value;

    // Si on tape un espace, on vérifie la "lastWordRef"
    if (event.nativeEvent.data === ' ') {
      const words = text.trim().split(/\s+/);

      lastWordRef.current = words[words.length - 1];
      contextRef.current = words.slice(-8, -1).join(' ');

      console.log('Last Word:', lastWordRef.current);
      console.log('Context:', contextRef.current);

      if (isSwitchOn && lastWordRef.current) {
        if (
          (target === 'story' && isWordInBank(lastWordRef.current, 'en')) ||
          (target === 'translation' && isWordInBank(lastWordRef.current, 'fr'))
        ) {
          console.warn(`Incorrect language word detected: ${lastWordRef.current}`);
          await handleLanguageSwitch(lastWordRef.current, target, contextRef.current);
          console.log('le texte est ' + storyText);
          return;
        }
      }
    }

    // Logique distincte FR -> EN ou EN -> FR
    if (target === 'story') {
      // Mettre à jour le state FR
      setTranslatedText(text);

      // Au lieu d'appeler directement `translateText` quand il y a ponctuation
      // on appelle la fonction débouncée.
      if (/[.,!?]$/.test(text)) {
        debouncedTranslateToEN(text);
      }
    } else {
      // Mettre à jour le state EN
      setTranslatedText1(text);

      if (/[.,!?]$/.test(text)) {
        debouncedTranslateToFR(text);
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
      {mappingHash && <WordMappings hashMap={mappingHash} />}
    </div>
  );
}

export default StoryInput;
