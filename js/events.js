
chrome.browserAction.onClicked.addListener(function() {
  chrome.storage.sync.get(["voiceName", "rate", "pitch", "volume", "spchletMaxLen"], function(settings) {
    chrome.tabs.executeScript({ file: "js/jquery-3.1.1.min.js" }, function() {
      chrome.tabs.executeScript({ file: "js/content.js" }, function(results) {
        speak(results[0], settings);
      });
    });
  });
});

function speak(speech, settings) {
  [].concat.apply([], speech.texts.map(function(text) {
    return breakText(text, settings.spchletMaxLen || defaults.spchletMaxLen);
  }))
  .forEach(function(text) {
    chrome.tts.speak(text, {
      enqueue: true,
      voiceName: settings.voiceName || defaults.voiceName,
      lang: speech.lang,
      rate: settings.rate || defaults.rate,
      pitch: settings.pitch || defaults.pitch,
      volume: settings.volume || defaults.volume
    });
  });
}

function breakText(text, wordLimit) {
  return merge(getSentences(text), wordLimit, breakSentence);
}

function breakSentence(sentence, wordLimit) {
  return merge(getPhrases(sentence), wordLimit, breakPhrase);
}

function breakPhrase(phrase, wordLimit) {
  var words = getWords(phrase);
  var splitPoint = Math.min(Math.ceil(words.length/2), wordLimit);
  var result = [];
  while (words.length) {
    result.push(words.slice(0, splitPoint).join(" "));
    words = words.slice(splitPoint);
  }
  return result;
}

function merge(parts, wordLimit, breakPart) {
  var result = [];
  var group = {parts: [], wordCount: 0};
  var flush = function() {
    if (group.parts.length) {
      result.push(group.parts.join(""));
      group = {parts: [], wordCount: 0};
    }
  };
  parts.forEach(function(part) {
    var wordCount = getWords(part).length;
    if (wordCount > wordLimit) {
      flush();
      var subParts = breakPart(part, wordLimit);
      for (var i=0; i<subParts.length; i++) result.push(subParts[i]);
    }
    else {
      if (group.wordCount + wordCount > wordLimit) flush();
      group.parts.push(part);
      group.wordCount += wordCount;
    }
  });
  flush();
  return result;
}

function getSentences(text) {
  var tokens = text.split(/([.!?]+\s)/);
  var result = [];
  for (var i=0; i<tokens.length; i+=2) {
    if (i+1 < tokens.length) result.push(tokens[i] + tokens[i+1]);
    else result.push(tokens[i]);
  }
  return result;
}

function getPhrases(sentence) {
  var tokens = sentence.split(/([,;:]\s|\s-+\s|\u2014)/);
  var result = [];
  for (var i=0; i<tokens.length; i+=2) {
    if (i+1 < tokens.length) result.push(tokens[i] + tokens[i+1]);
    else result.push(tokens[i]);
  }
  return result;
}

function getWords(sentence) {
  return sentence.trim().split(/\s+/);
}