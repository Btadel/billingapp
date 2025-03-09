import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
  const [isWordMappingOpen, setIsWordMappingOpen] = useState(false);
  const toggleWordMapping = () => setIsWordMappingOpen((prev) => !prev);

  const [storyLang, setStoryLang] = useState('fr');
  const [translatedLang, setTranslatedLang] = useState('en');

  /* ----------------- Word Banks (FR / EN) ----------------- */
  const wordBankFr = useMemo(() => {
    const table = new HashTable();
    [
      'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles',
      'le', 'la', 'les', 'un', 'une', 'de', 'à', 'et', 'ou', 'mais', 'dans'
    ].forEach((word) => table.set(word, true));
    return table;
  }, []);

  const wordBankEn = useMemo(() => {
    const table = new HashTable();
    [
      'I', 'you', 'he', 'she', 'we', 'they', 'it', 'a', 'an', 'the',
      'of', 'and', 'or', 'but', 'in', 'on', 'with', 'by', 'for'
    ].forEach((word) => table.set(word, true));
    return table;
  }, []);

  /* ----------------- Switch / Formality ----------------- */
  const handleToggle = useCallback((isOn) => {
    setIsSwitchOn(isOn);
    console.log(`Switch is now ${isOn ? 'ON' : 'OFF'}`);
  }, []);

  const handleFormalityChange = useCallback((e) => {
    setFormality(e.target.value);
  }, []);

  const handleLanguageChange = (newLanguage, target) => {
    if (target === 'story') {
      setStoryLang(newLanguage);
    } else {
      setTranslatedLang(newLanguage);
    }
  };

  /* ----------------- Check if word is in the opposite bank ----------------- */
  const isWordInBank = (word, language) => {
    const wordBank = language === 'fr' ? wordBankFr : wordBankEn;
    return !!wordBank.get(word.toLowerCase());
  };

  /* ----------------- Handle "Switch" logic (auto-translate last typed word) ----------------- */
  const handleLanguageSwitch = useCallback(async (word, target, context) => {
    // target = 'story' => typed in FR zone
    // target = 'translation' => typed in EN zone

    const targetLang = target === 'story' ? 'fr' : 'en';
    const translatedWord = await translateWord(word, context, targetLang, formality);

    if (target === 'story') {
      // Replace last word in storyText
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const newSourceValue = storyText.replace(new RegExp(`\\b${escapedWord}\\b$`), translatedWord).trim();
      setStoryText(newSourceValue);

      // Then translate entire text => EN
      const rawOutput = await translateText(newSourceValue, storyLang, translatedLang, formality);
      const { translation, mappingArray } = parseGPTOutput(rawOutput);
      setTranslatedText1(translation);
      setWordMappings(mappingArray.map(([original, translated]) => ({ original, translated })));
    } else {
      // target === 'translation'
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const newSourceValue = translatedText.replace(new RegExp(`\\b${escapedWord}\\b$`), translatedWord).trim();
      setTranslatedText1(newSourceValue);

      // Then translate entire text => FR
      const rawOutput = await translateText(newSourceValue, translatedLang, storyLang, formality);
      const { translation, mappingArray } = parseGPTOutput(rawOutput);
      setStoryText(translation);
      setWordMappings(mappingArray.map(([original, translated]) => ({ original, translated })));
    }
  }, [storyText, translatedText, formality, storyLang, translatedLang]);

  /* ----------------- Debounced translation calls (FR->EN or EN->FR) ----------------- */
  const debouncedTranslateToEN = useRef(
    debounce(async (text) => {
      try {
        const rawOutput = await translateText(text, storyLang, translatedLang, formality);
        const { translation, mappingArray } = parseGPTOutput(rawOutput);
        setTranslatedText1(translation);
        setWordMappings(mappingArray.map(([original, translated]) => ({ original, translated })));
      } catch (error) {
        console.error('Debounced FR->EN failed:', error);
      }
    }, 500)
  ).current;

  const debouncedTranslateToFR = useRef(
    debounce(async (text) => {
      try {
        const rawOutput = await translateText(text, translatedLang, storyLang, formality);
        const { translation, mappingArray } = parseGPTOutput(rawOutput);
        setStoryText(translation);
        setWordMappings(mappingArray.map(([original, translated]) => ({ original, translated })));
      } catch (error) {
        console.error('Debounced EN->FR failed:', error);
      }
    }, 500)
  ).current;

  // Cleanup debounced calls on unmount
  useEffect(() => {
    return () => {
      debouncedTranslateToEN.cancel();
      debouncedTranslateToFR.cancel();
    };
  }, [debouncedTranslateToEN, debouncedTranslateToFR]);

  /* ----------------- handleChange: called by TextualArea on input ----------------- */
  const handleChange = async (text, target) => {
    if (target === 'story') {
      setStoryText(text);
      // Check if it ends with punctuation => immediate
      if (/[.,!?]$/.test(text.trim())) {
        try {
          const rawOutput = await translateText(text, storyLang, translatedLang, formality);
          const { translation, mappingArray } = parseGPTOutput(rawOutput);
          setTranslatedText1(translation);
          setWordMappings(mappingArray.map(([original, translated]) => ({ original, translated })));
        } catch (err) {
          console.error('Immediate FR->EN translation failed:', err);
        }
      } else {
        // Debounced translation
        debouncedTranslateToEN(text);
      }
      console.log(`translated text: ${translatedText}`);
    } else {
      // target === 'translation'
      setTranslatedText1(text);
      if (/[.,!?]$/.test(text.trim())) {
        try {
          const rawOutput = await translateText(text, translatedLang, storyLang, formality);
          const { translation, mappingArray } = parseGPTOutput(rawOutput);
          setStoryText(translation);
          setWordMappings(mappingArray.map(([original, translated]) => ({ original, translated })));
        } catch (err) {
          console.error('Immediate EN->FR translation failed:', err);
        }
      } else {
        debouncedTranslateToFR(text);
      }
      console.log('Translated text:', text);
    }

    // Word-based language switch if SwitchButton is ON
    const words = text.trim().split(/\s+/);
    lastWordRef.current = words[words.length - 1] || '';
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

      {/* Zone 1 : "Story" side */}
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

      {/* Zone 2 : "Translated" side */}
      <div className="text-container">
        <div className="language-selector-container">
          <LanguageSelector onLanguageChange={(lang) => handleLanguageChange(lang, 'translated')} />
        </div>
        <TextualArea
          text={translatedText}
          onChange={(text) => handleChange(text, 'translation')}
          placeholder={`Write in ${translatedLang.toUpperCase()}...`}
          language={translatedLang}
        />
      </div>

      {/* WordMappings (toggle) */}
      {wordMappings.length > 0 && (
        <WordMappings
          mappings={wordMappings}
          isOpen={isWordMappingOpen}
          toggleCollapse={toggleWordMapping}
        />
      )}

      {/* Drag & Drop (unchanged) */}
      <DragnDrop />
    </div>
  );
}

export default StoryInput;
