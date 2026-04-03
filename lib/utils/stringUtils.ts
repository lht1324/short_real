export function addArticleToWord(word: string, isSubject: boolean = false) {
    if (word.length === 0) return word;

    const isVowel = word[0] === 'a' || word[0] === 'e' || word[0] === 'i' || word[0] === 'o' || word[0] === 'u';
    const article = isSubject
        ? isVowel ? "An" : "A"
        : isVowel ? "an" : "a"

    return `${article} ${word}`;
}