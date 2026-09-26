/* Shared authoring guidance and deterministic checks; not a CEFR classifier. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ReadingLampLearning = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const version = 'er-2026-09-23';
  const bands = [
    { maxSentence: 18, averageSentence: 10, grammar: 'Present simple, be, have, can; one main idea per sentence. Use concrete subjects and explicit references.', vocabulary: 'Very common concrete words; explain an essential topic word immediately with easy context.' },
    { maxSentence: 22, averageSentence: 12, grammar: 'Present and past simple; and, but, because; short questions and familiar everyday chunks.', vocabulary: 'Common everyday words and transparent phrases; avoid unexplained idioms.' },
    { maxSentence: 26, averageSentence: 14, grammar: 'Simple past and future; when, before, after; introduce one subordinate clause at a time.', vocabulary: 'Familiar story vocabulary; repeat important new words naturally instead of changing synonyms.' },
    { maxSentence: 30, averageSentence: 16, grammar: 'Simple relative clauses, comparatives, present perfect and first conditional in clear contexts.', vocabulary: 'Concrete explanations of less familiar words; a few useful phrasal verbs with clear meanings.' },
    { maxSentence: 34, averageSentence: 18, grammar: 'A varied mix of simple and complex sentences; explicit cause, contrast and sequence.', vocabulary: 'Useful collocations, accessible description; explain necessary technical language in context.' },
    { maxSentence: 38, averageSentence: 20, grammar: 'Passive voice, reported speech and conditionals where useful; keep clause nesting shallow.', vocabulary: 'Some abstract words grounded in examples; avoid dense clusters of new terms.' },
    { maxSentence: 42, averageSentence: 22, grammar: 'Relative clauses, participle phrases and contrast; vary rhythm without hiding the main point.', vocabulary: 'Natural collocations and limited figurative language supported by concrete context.' },
    { maxSentence: 46, averageSentence: 24, grammar: 'Clear argument, concession, evidence and qualification; mix short sentences with longer ones.', vocabulary: 'Broader vocabulary with contextual support; choose precision over decorative synonyms.' },
    { maxSentence: 50, averageSentence: 26, grammar: 'Nuanced conditionals and viewpoint shifts with unambiguous reference; coherent paragraph progression.', vocabulary: 'Near-general-reader range; avoid needless jargon, explain specialist concepts.' },
    { maxSentence: 55, averageSentence: 28, grammar: 'Natural general-audience prose; sustained reasoning, controlled subordination and varied rhythm.', vocabulary: 'Unrestricted general vocabulary; clarity and pleasure still matter more than rarity.' },
  ];
  const countWords = text => String(text || '').trim().split(/\s+/).filter(Boolean).length;
  function sentences(text) {
    // Protect common abbreviations and decimal points, and keep dialogue tags
    // attached to their quotation. This is a documented heuristic, not parsing.
    return String(text).replace(/\b(Mr|Mrs|Ms|Dr|St)\./g, '$1∯')
      .replace(/(\d)\.(?=\d)/g, '$1∯')
      .replace(/([!?])["”]\s+(?=(?:he|she|they|I|we|it|said|asked|replied)\b)/g, '$1”∯')
      .split(/(?<=[.!?])["”']?\s+/).map(x => x.replace(/∯/g, ' ')).filter(x => /[A-Za-z]/.test(x));
  }
  function inspect(story, options = {}) {
    const errors = [], warnings = [];
    if (!story || typeof story !== 'object') return { errors: ['schema'], warnings, metrics: {} };
    const text = typeof story.text === 'string' ? story.text.trim() : '';
    const level = options.level === undefined ? story.level : options.level;
    if (!Number.isInteger(level) || level < 1 || level > 10) errors.push('level');
    const band = bands[level - 1] || bands[0];
    if (typeof story.title !== 'string' || !story.title.trim() || story.title.length > 160) errors.push('title');
    if (options.topic && story.topic !== options.topic) errors.push('topic');
    if (!text || text.length > 60000) errors.push('text-size');
    if (/[\u3040-\u30ff\u3400-\u9fff]/u.test(text)) errors.push('non-English');
    if (/<\/?[a-z][^>]*>|```/i.test(text)) errors.push('markup');
    if (!/[.!?]["”']?$/.test(text)) errors.push('unfinished');
    if (/\b(?:could|should|would|might|must) of\b|\b(?:is|are|was|were) been\b|\b(the|a|an|of|to)\s+\1\b/i.test(text)) errors.push('malformed-phrase');
    if ((text.match(/“/g) || []).length !== (text.match(/”/g) || []).length || (text.match(/"/g) || []).length % 2) errors.push('quotation');
    const parts = sentences(text), lengths = parts.map(countWords), words = countWords(text);
    if (parts.length < 2) errors.push('too-few-sentences');
    if (options.targetWords && (words < options.targetWords * .85 || words > options.targetWords * 1.15)) errors.push('requested-length');
    const maxSentence = Math.max(0, ...lengths), averageSentence = words / Math.max(1, parts.length);
    if (maxSentence > band.maxSentence) warnings.push('long-sentence');
    if (averageSentence > band.averageSentence) warnings.push('dense-syntax');
    if (level <= 3 && /\b(?:notwithstanding|nevertheless|consequently|phenomenon|infrastructure)\b/i.test(text)) warnings.push('advanced-expression');
    if (level <= 2 && /\b(?:would have|had been|could have)\b/i.test(text)) warnings.push('advanced-structure');
    if (new Set(parts.map(x => x.trim().toLowerCase())).size < parts.length) warnings.push('repeated-sentence');
    return { errors, warnings, metrics: { words, sentences: parts.length, maxSentence, averageSentence: +averageSentence.toFixed(2) } };
  }
  function instructions(level) {
    const band = bands[level - 1];
    if (!band) throw new Error('Invalid learning level');
    return `Learning policy ${version}. Level ${level}/10. ${band.grammar}\n${band.vocabulary}\nAim for average sentence length at most ${band.averageSentence} words; no sentence over ${band.maxSentence} words. These are editorial guardrails, not CEFR certification. Do not pad or chop sentences mechanically. Use natural English, clear pronoun references, stable tense, a meaningful beginning, development and ending. Repeat 1-3 useful words or chunks where the story needs them; never force drills, glossaries or quizzes into the passage. Use short paragraphs. Self-edit agreement, articles, prepositions, collocations and dialogue punctuation. Do not claim a reader knows 98% of this text: individual vocabulary is unknown. For unverified factual topics use an explicitly fictional example rather than invented statistics, studies or current news. Never present a fictional person as a real biography. Classic retellings must name a real source work and preserve its central events. Return only topic, title and text, not your checks.`;
  }
  return { version, bands, inspect, instructions, countWords, sentences };
});
