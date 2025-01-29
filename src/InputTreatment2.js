import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import debounce from 'lodash/debounce';
import './font/InputTreatment.css';import './font/App.css';


import FormalitySelector from './Formality';
import CollapsibleWordMappings from './WordMappings';
import HashTable from './hashswitch';
import SwitchButton from './SwitchButton';
import parseGPTOutput from './parseGPTOutput';
import LanguageSelector from './LanguageSelector';



function StoryInput() {
  const [storyText, setTranslatedText] = useState('');
  const [translatedText, setTranslatedText1] = useState('');
  const [wordMappings, setWordMappings] = useState([]);
  const [formality, setFormality] = useState('informal');
  const [isSwitchOn, setIsSwitchOn] = useState(false);
  const lastWordRef = useRef('');
  const contextRef = useRef('');
  const [mappingHash, setMappingHash] = useState(null);
  const cancelTokenSourceRef= useRef(null);
  const [error, setError]=useState(null)
  const [isWordMappingOpen, setIsWordMappingOpen] = useState(false);
  const toggleWordMapping = () => setIsWordMappingOpen((prev) => !prev);
  const [storyLang, setStoryLang] = useState('fr');
  const [translatedLang, setTranslatedLang] = useState('en');




  const textAreaRef1 = useRef(null);
  const textAreaRef2 = useRef(null);
  
  const MemoizedWordMappings=React.memo(CollapsibleWordMappings);
  const MemoizedFormalitySelector =React.memo(FormalitySelector)

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
      'I', 'you', 'he', 'she', 'we', 'they', 'it', 'a', 'an', 
      'the', 'of', 'and', 'or', 'but', 'in', 'on', 'with', 'by', 'for'
    ].forEach((word) => table.set(word, true));
    return table;
  }, []);

  


  const handleToggle = useCallback((isOn) => {
    setIsSwitchOn(isOn);
    console.log(`Switch is now ${isOn ? 'ON' : 'OFF'}`);
  },[]);

  const handleFormalityChange= useCallback((e)=>{
    setFormality(e.target.value)
  },[]);

  const handleLanguageChange = (newLanguage, target) => {
    if (target === 'story') {
      setStoryLang(newLanguage);
    } else {
      setTranslatedLang(newLanguage);
    }
  };


  
  // --- Fonctions de traduction vers FR/EN ---
  const translateText = async (text, sourceLang,targetLang) => {
    try {

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
      if(cancelTokenSourceRef.current){
        cancelTokenSourceRef.current.cancel();
      }
      const source=axios.CancelToken.source();
      cancelTokenSourceRef.current=source;
      

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
          cancelToken: source.token // Ajout du token d'annulation
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
    }  catch (error) {
      if (!axios.isCancel(error)) { // Ne logguez pas les erreurs d'annulation
        console.error('Error translating text:', error);
        setError('Erreur de traduction - Veuillez réessayer');
      }
      return text;
    }
  };

  // Ajouter un effet de cleanup :
  useEffect(() => {
    return () => {
      // Annule toute requête en cours au démontage
      if (cancelTokenSourceRef.current) {
        cancelTokenSourceRef.current.cancel('Composant démonté');
      }
    };
  }, []);
  

  const translateWord = async (word, context, targetLang) => {
    try {
      const prompt =
        `Translate this word to ${
          targetLang === 'en' ? 'English' : 'French'
        }: ${word}` +
        (formality === 'formal'
          ? ' Make it formal.,no brackets or else'
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



  const handleSelection = useCallback((target) => {
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
  },[wordMappings]);

  const handleLanguageSwitch = useCallback(async (word, target, context) => {
    const targetLang = target === 'story' ? 'fr' : 'en';
    const translatedWord = await translateWord(word, context, targetLang);

    if (target === 'story') {
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const newSourceValue = storyText
        .replace(new RegExp(`\\b${escapedWord}\\b$`), translatedWord)
        .trim();

      setTranslatedText(newSourceValue);

      const fullTranslation = await translateText(newSourceValue, 'en');
      setTranslatedText1(fullTranslation);
      textAreaRef2.current.focus();
    } else {
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const newSourceValue = translatedText
        .replace(new RegExp(`\\b${escapedWord}\\b$`), translatedWord)
        .trim();

      setTranslatedText1(newSourceValue);

      const fullTranslation = await translateText(newSourceValue, 'fr');
      setTranslatedText(fullTranslation);

      textAreaRef1.current.focus();
    }

    console.log(`Original : ${word}`);
    console.log(`Translated: ${translatedWord}`);
  },[storyText,translatedText,formality]);

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

  useEffect(()=>{
    return() =>{
      debouncedTranslateToEN.cancel();
      debouncedTranslateToFR.cancel();
    };
  },[debouncedTranslateToEN,debouncedTranslateToFR]);

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
    <div className="main">
      <SwitchButton onToggle={(isOn) => setIsSwitchOn(isOn)} />
      <FormalitySelector onFormalityChange={(e) => setFormality(e.target.value)} />
      
      <div className="text-container">
        <div className="language-selector-container">
          <LanguageSelector onLanguageChange={(lang) => handleLanguageChange(lang, 'story')} />
        </div>
        <textarea
          ref={textAreaRef1}
          value={storyText}
          onChange={(e) => handleChange(e, 'story')}
          placeholder={`Write in ${storyLang.toUpperCase()}...`}
          rows="10"
          className="trans-textarea"
        />
      </div>

      <div className="text-container">
        <div className="language-selector-container">
          <LanguageSelector onLanguageChange={(lang) => handleLanguageChange(lang, 'translated')} />
        </div>
        <textarea
          ref={textAreaRef2}
          value={translatedText}
          onChange={(e) => handleChange(e, 'translated')}
          placeholder={`Write in ${translatedLang.toUpperCase()}...`}
          rows="10"
          className="trans-textarea"
        />
      </div>

      {wordMappings.length > 0 && (
        <CollapsibleWordMappings
          mappings={wordMappings}
          isOpen={isWordMappingOpen}
          toggleCollapse={() => setIsWordMappingOpen((prev) => !prev)}
        />
      )}
    </div>
  );
}

export default StoryInput;
