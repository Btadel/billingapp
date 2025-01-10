// parseGPTOutput.js

// Cette fonction parse le texte brut renvoyé par GPT.
// Format attendu (exemple) :
//
// Full Translation:
// Bonjour le monde
//
// Word Mapping:
// Hello -> Bonjour
// world -> monde
//
// On récupère :
//   translation: "Bonjour le monde"
//   mapping: [ ["Hello", "Bonjour"], ["world", "monde"] ]
//
export function parseGPTOutput(rawOutput) {
  // On sépare en lignes (en coupant sur les sauts de ligne)
  const lines = rawOutput.split('\n');

  let translation = '';
  const mappingLines = [];

  let isMappingSection = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Si la ligne contient "Full Translation:"
    if (trimmedLine.toLowerCase().includes('full translation:')) {
      // On recommence éventuellement la construction de "translation"
      // ou bien on ignore cette ligne.
      isMappingSection = false;
      continue;
    }

    // Si la ligne contient "Word Mapping:"
    if (trimmedLine.toLowerCase().includes('word mapping:')) {
      // À partir de maintenant, on est dans la section mapping
      isMappingSection = true;
      continue;
    }

    // Selon la section dans laquelle on se trouve, on stocke la ligne différemment
    if (isMappingSection) {
      // On est dans la section Word Mapping
      // On ajoute la ligne dans mappingLines
      // (ex: "Hello -> Bonjour")
      mappingLines.push(trimmedLine);
    } else {
      // On est dans la partie Full Translation
      // On ajoute la ligne à la traduction
      // (ex: "Bonjour le monde")
      translation += trimmedLine + ' ';
    }
  }

  // Nettoyer la traduction (trim les espaces en fin/début)
  translation = translation.trim();

  // Convertir mappingLines en tableau de paires
  // Format attendu dans mappingLines:
  //   "Hello -> Bonjour"
  //   "world -> monde"
  //
  // On découpe sur '->'
  const mappingArray = mappingLines
    .map((line) => line.split('->').map((part) => part.trim()))
    // Filtrer les lignes invalides (s’il n’y avait pas '->')
    .filter((pair) => pair.length === 2);

  return {
    translation,
    mappingArray,
  };
}
export default parseGPTOutput;
