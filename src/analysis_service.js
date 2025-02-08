/*
All Rights Reserved, (c) 2025 series-word-freq

Author:      Martin Shaw (developer@martinshaw.co)
Created:     2025-02-08T06:40:39.316Z
Modified:     2025-02-08T09:20:10.516Z
File Name:   analysis_service.js

Description: description

*/

class AnalysisService {
  constructor() {
    //
  }

  analyseWordFrequency(textsSet) {
    let words = {};

    textsSet.forEach((text) => {
      const lines = text.split("\n");

      lines.forEach((line) => {
        if (line.trim().length === 0) return;
        if (line.indexOf("-->") > -1) return;
        if (!isNaN(line)) return;

        // Remove numeric string
        if (line.match(/^\d+$/)) return;

        // Remove any HTML tags
        line = line.replace(/(<([^>]+)>)/gi, "");

        // Between brackets
        line = line.replace(/\(.*?\)/g, "");

        // Remove any extra spaces
        line = line.replace(/\s+/g, " ");

        const lineWords = line.split(/\s+/);

        lineWords.forEach((word) => {
          if (word.length == 0) return;
          // if (word.length > 5) return;

          // Remove numeric string
          if (word.match(/^\d+$/)) return;

          // Convert to lowercase
          word = word.toLowerCase();

          // trim punctuation from start and end
          word = word.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "");

          if (words[word] == null) words[word] = 0;
          words[word]++;
        });
      });
    });

    let wordsArray = Object.entries(words);

    if (process.env.EXCLUDE_WORDS_UNDER_FREQUENCY) {
      wordsArray = wordsArray.filter(
        (word) => word[1] >= process.env.EXCLUDE_WORDS_UNDER_FREQUENCY
      );
    }

    if (process.env.EXCLUDE_WORDS) {
      const excludeWords = process.env.EXCLUDE_WORDS.split(",");
      wordsArray = wordsArray.filter((word) => !excludeWords.includes(word[0]));
    }

    wordsArray = wordsArray.sort((a, b) => b[1] - a[1]);

    return wordsArray;
  }
}

module.exports = AnalysisService;
