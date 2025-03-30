// StoryInput.js
import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import debounce from 'lodash/debounce';
import '../font/InputTreatment.css';
import '../font/App.css';
import FormalitySelector from './Formality';
import WordMappings from './WordMappings';
import HashTable from '../utils/hashswitch';
import SwitchButton from './SwitchButton';
import parseGPTOutput from '../utils/parseGPTOutput';
import TextualArea from './TextualArea';
import DragnDrop from './DragnDrop';
import { translateText, translateWord } from '../utils/translate';
import { useModelStore } from './store';

function StoryInput() {
  // Select only the state and actions needed
  const storyText = useModelStore((state) => state.storyText);
  const setStoryText = useModelStore((state) => state.setStoryText);
  const translatedText = useModelStore((state) => state.translatedText);
  const setTranslatedText = useModelStore((state) => state.setTranslatedText);
  const wordMappings = useModelStore((state) => state.wordMappings);
  const setWordMappings = useModelStore((state) => state.setWordMappings);
  const formality = useModelStore((state) => state.formality);
  const setFormality = useModelStore((state) => state.setFormality);
  const isSwitchOn = useModelStore((state) => state.isSwitchOn);
  const toggleSwitch = useModelStore((state) => state.toggleSwitch);
  const isWordMappingOpen = useModelStore((state) => state.isWordMappingOpen);
  const toggleWordMapping = useModelStore((state) => state.toggleWordMapping);

  const lastWordRef = useRef('');
  const contextRef = useRef('');

  const storyLang = 'fr';
  const translatedLang = 'en';

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

  /* ----------------- Switch & Formality ----------------- */
  const handleToggle = useCallback((isOn) => {
    toggleSwitch();
    console.log(`Switch is now ${isOn ? 'ON' : 'OFF'}`);
  }, [toggleSwitch]);

  const handleFormalityChange = useCallback((e) => {
    setFormality(e.target.value);
  }, [setFormality]);

  /* ----------------- Check if word is in the opposite bank ----------------- */
  const isWordInBank = (word, language) => {
    const wordBank = language === 'fr' ? wordBankFr : wordBankEn;
    return !!wordBank.get(word.toLowerCase());
  };

  /* ----------------- Handle "Switch" logic (auto-translate last typed word) ----------------- */
  const handleLanguageSwitch = useCallback(async (word, target, context) => {
    const targetLang = target === 'story' ? 'fr' : 'en';
    const translatedWord = await translateWord(word, context, targetLang, formality);

    if (target === 'story') {
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const newSourceValue = storyText.replace(new RegExp(`\\b${escapedWord}\\b$`), translatedWord).trim();
      setStoryText(newSourceValue);

      const rawOutput = await translateText(newSourceValue, storyLang, translatedLang, formality);
      const { translation, mappingArray } = parseGPTOutput(rawOutput);
      setTranslatedText(translation);
      setWordMappings(mappingArray.map(([original, translated]) => ({ original, translated })));
    } else {
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const newSourceValue = translatedText.replace(new RegExp(`\\b${escapedWord}\\b$`), translatedWord).trim();
      setTranslatedText(newSourceValue);

      const rawOutput = await translateText(newSourceValue, translatedLang, storyLang, formality);
      const { translation, mappingArray } = parseGPTOutput(rawOutput);
      setStoryText(translation);
      setWordMappings(mappingArray.map(([original, translated]) => ({ original, translated })));
    }
  }, [storyText, translatedText, formality, storyLang, translatedLang, setStoryText, setTranslatedText, setWordMappings]);

  /* ----------------- Debounced translation calls (FR->EN and EN->FR) ----------------- */
  const debouncedTranslateToEN = useRef(
    debounce(async (text) => {
      try {
        const rawOutput = await translateText(text, storyLang, translatedLang, formality);
        const { translation, mappingArray } = parseGPTOutput(rawOutput);
        setTranslatedText(translation);
        setWordMappings(mappingArray.map(([original, translated]) => ({ original, translated })));
      } catch (error) {
        console.error('Debounced FR->EN failed:', error);
      }
    }, 100)
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
    }, 100)
  ).current;

  useEffect(() => {
    return () => {
      debouncedTranslateToEN.cancel();
      debouncedTranslateToFR.cancel();
    };
  }, [debouncedTranslateToEN, debouncedTranslateToFR]);

  /* ----------------- handleChange: called by TextualArea on input ----------------- */
  const handleChange = useCallback(async (text, target) => {
    if (target === 'story') {
      setStoryText(text);
      if (/[.,!?]$/.test(text.trim())) {
        try {
          const rawOutput = await translateText(text, storyLang, translatedLang, formality);
          const { translation, mappingArray } = parseGPTOutput(rawOutput);
          setTranslatedText(translation);
          setWordMappings(mappingArray.map(([original, translated]) => ({ original, translated })));
        } catch (err) {
          console.error('Immediate FR->EN translation failed:', err);
        }
      } else {
        debouncedTranslateToEN(text);
      }
      console.log(`Translated text: ${translatedText}`);
    } else {
      setTranslatedText(text);
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
  }, [isSwitchOn, formality, storyText, translatedText, setStoryText, setTranslatedText, setWordMappings, handleLanguageSwitch, debouncedTranslateToEN, debouncedTranslateToFR]);

  return (
    <div className="main">
      <SwitchButton onToggle={handleToggle} />
      <FormalitySelector onFormalityChange={handleFormalityChange} />

      {/* Zone 1: Story Side (French) */}
      <div className="text-container">
        <TextualArea
          text={storyText}
          onChange={(text) => handleChange(text, 'story')}
          placeholder="Write in FR..."
          language={storyLang}
        />
      </div>

      {/* Zone 2: Translated Side (English) */}
      <div className="text-container">
        <TextualArea
          text={translatedText}
          onChange={(text) => handleChange(text, 'translation')}
          placeholder="Write in EN..."
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