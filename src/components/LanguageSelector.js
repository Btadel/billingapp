// LanguageSelector.js
import React from 'react';
import { useModelStore } from './store';

const LanguageSelector = ({ onLanguageChange }) => {
  const { selectedLanguage, setSelectedLanguage } = useModelStore();

  const handleLanguageChange = (event) => {
    const newLanguage = event.target.value;
    setSelectedLanguage(newLanguage);
    onLanguageChange(newLanguage);
  };

  return (
    <div>
      <label htmlFor="language-select">Choose a language: </label>
      <select id="language-select" value={selectedLanguage} onChange={handleLanguageChange}>
        <option value="en">English</option>
        <option value="es">Español</option>
        <option value="fr">Français</option>
        <option value="de">Deutsch</option>
        <option value="zh">中文</option>
      </select>
    </div>
  );
};

export default LanguageSelector;