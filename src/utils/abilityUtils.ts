// src/utils/abilityUtils.ts
/**
 * Parses a card's oracle text into distinct abilities or paragraphs.
 * @param oracleText The full oracle text from the card data.
 * @returns An array of strings, where each string is a separate ability.
 */
export const parseOracleText = (oracleText: string | undefined): string[] => {
    if (!oracleText) {
        return [];
    }
    return oracleText.split(/\n+/).filter(text => text.trim() !== '');
};