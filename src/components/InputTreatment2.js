import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import debounce from 'lodash/debounce';
import '../font/InputTreatment.css';
import '../font/App.css';
import FormalitySelector from './Formality';
import WordMappings from './WordMappings';
import HashTable from '../utils/hashswitch';
import SwitchButton from './SwitchButton';
import parseGPTOutput from '../utils/parseGPTOutput';
import LanguageSelector from './LanguageSelector';
import TextualArea from './TextualArea';
import DragnDrop from './DragnDrop';
import { translateText, translateWord } from '../utils/translate';

function StoryInput() {
  const [storyText, setStoryText] = useState('');
  const [translatedText, setTranslatedText1] = useState('');
  const [wordMappings, setWordMappings] = useState([]);
  const [formality, setFormality] = useState('informal');
  const [isSwitchOn, setIsSwitchOn] = useState(false);
  const lastWordRef = useRef('');
  const contextRef = useRef('');
  const [mappingHash, setMappingHash] = useState(null);
  const cancelTokenSourceRef = useRef(null);
  const [error, setError] = useState(null);
  const [isWordMappingOpen, setIsWordMappingOpen] = useState(false);
  const toggleWordMapping = () => setIsWordMappingOpen((prev) => !prev);
  const [storyLang, setStoryLang] = useState('fr');
  const [translatedLang, setTranslatedLang] = useState('en');

  const wordBankFr = useMemo(() => {
    const table = new HashTable();
    ['je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'le', 'la', 'les', 'un', 'une', 'de', 'à', 'et', 'ou', 'mais', 'dans'].forEach((word) => table.set(word, true));
    return table;
  }, []);

  const wordBankEn = useMemo(() => {
    const table = new HashTable();
    ['I', 'you', 'he', 'she', 'we', 'they', 'it', 'a', 'an', 'the', 'of', 'and', 'or', 'but', 'in', 'on', 'with', 'by', 'for'].forEach((word) => table.set(word, true));
    return table;
  }, []);

  const handleToggle = useCallback((isOn) => {
    setIsSwitchOn(isOn);
    console.log(`Switch is now ${isOn ? 'ON' : 'OFF'}`);
  }, []);

  const handleFormalityChange = useCallback((e) => setFormality(e.target.value), []);

  const handleLanguageChange = (newLanguage, target) => {
    if (target === 'story') setStoryLang(newLanguage);
    else setTranslatedLang(newLanguage);
  };

  useEffect(() => {
    return () => {
      if (cancelTokenSourceRef.current) cancelTokenSourceRef.current.cancel('Composant démonté');
    };
  }, []);

  const isWordInBank = (word, language) => {
    const wordBank = language === 'fr' ? wordBankFr : wordBankEn;
    return !!wordBank.get(word.toLowerCase());
  };

  const handleLanguageSwitch = useCallback(async (word, target, context) => {
    const targetLang = target === 'story' ? 'fr' : 'en';
    const translatedWord = await translateWord(word, context, targetLang, formality);

    if (target === 'story') {
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const newSourceValue = storyText.replace(new RegExp(`\\b${escapedWord}\\b$`), translatedWord).trim();
      setStoryText(newSourceValue);
      const rawOutput = await translateText(newSourceValue, 'en', translatedLang, formality, cancelTokenSourceRef);
      const { translation, mappingArray } = parseGPTOutput(rawOutput);
      setTranslatedText1(translation);
      setWordMappings(mappingArray.map(([original, translated]) => ({ original, translated })));
    } else {
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const newSourceValue = translatedText.replace(new RegExp(`\\b${escapedWord}\\b$`), translatedWord).trim();
      setTranslatedText1(newSourceValue);
      const rawOutput = await translateText(newSourceValue, 'fr', storyLang, formality, cancelTokenSourceRef);
      const { translation, mappingArray } = parseGPTOutput(rawOutput);
      setStoryText(translation);
      setWordMappings(mappingArray.map(([original, translated]) => ({ original, translated })));
    }
  }, [storyText, translatedText, formality, storyLang, translatedLang]);

  const debouncedTranslateToEN = useRef(debounce(async (text) => {
    try {
      const rawOutput = await translateText(text, storyLang, translatedLang, formality, cancelTokenSourceRef);
      const { translation, mappingArray } = parseGPTOutput(rawOutput);
      setTranslatedText1(translation);
      setWordMappings(mappingArray.map(([original, translated]) => ({ original, translated })));
    } catch (error) {
      console.error('Debounced FR->EN failed:', error);
    }
  }, 500)).current;

  const debouncedTranslateToFR = useRef(debounce(async (text) => {
    try {
      const rawOutput = await translateText(text, translatedLang, storyLang, formality, cancelTokenSourceRef);
      const { translation, mappingArray } = parseGPTOutput(rawOutput);
      setStoryText(translation);
      setWordMappings(mappingArray.map(([original, translated]) => ({ original, translated })));
    } catch (error) {
      console.error('Debounced EN->FR failed:', error);
    }
  }, 500)).current;

  useEffect(() => {
    return () => {
      debouncedTranslateToEN.cancel();
      debouncedTranslateToFR.cancel();
    };
  }, [debouncedTranslateToEN, debouncedTranslateToFR]);

  const handleChange = async (text, target) => {
    if (target === 'story') {
      setStoryText(text);
      if (/[.,!?]$/.test(text)) debouncedTranslateToEN(text);
    } else {
      setTranslatedText1(text);
      if (/[.,!?]$/.test(text)) debouncedTranslateToFR(text);
    }

    const words = text.trim().split(/\s+/);
    lastWordRef.current = words[words.length - 1];
    contextRef.current = words.slice(-8, -1).join(' ');

    if (isSwitchOn && lastWordRef.current) {
      if (
        (target === 'story' && isWordInBank(lastWordRef.current, 'en')) ||
        (target === 'translation' && isWordInBank(lastWordRef.current, 'fr'))
      ) {
        await handleLanguageSwitch(lastWordRef.current, target, contextRef.current);
      }
    }
  };

  return (
    <div className="main">
      <SwitchButton onToggle={handleToggle} />
      <FormalitySelector onFormalityChange={handleFormalityChange} />
      
      <div className="text-container">
        <div className="language-selector-container">
          <LanguageSelector onLanguageChange={(lang) => handleLanguageChange(lang, 'story')} />
        </div>
        <TextualArea
          text={storyText}
          onChange={(text) => handleChange(text, 'story')}
          placeholder={`Write in ${storyLang.toUpperCase()}...`}
          language={storyLang}
        />
      </div>

      <div className="text-container">
        <div className="language-selector-container">
          <LanguageSelector onLanguageChange={(lang) => handleLanguageChange(lang, 'translated')} />
        </div>
        <TextualArea
          text={translatedText}
          onChange={(text) => handleChange(text, 'translated')}
          placeholder={`Write in ${translatedLang.toUpperCase()}...`}
          language={translatedLang}
        />
      </div>

      {wordMappings.length > 0 && (
        <WordMappings
          mappings={wordMappings}
          isOpen={isWordMappingOpen}
          toggleCollapse={toggleWordMapping}
        />
      )}
      <DragnDrop />
    </div>
  );
}

export default StoryInput;