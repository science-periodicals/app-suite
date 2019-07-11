self.importScripts('highlight.pack.js');

self.onmessage = function(e) {
  let { text, programmingLanguage } = e.data;

  if (programmingLanguage) {
    programmingLanguage = programmingLanguage.toLowerCase();
  }

  let highlighted;

  try {
    if (programmingLanguage && self.hljs.getLanguage(programmingLanguage)) {
      highlighted = self.hljs.highlight(programmingLanguage, text);
    } else {
      highlighted = self.hljs.highlightAuto(text);
    }
    self.postMessage({
      '@id': e.data['@id'],
      programmingLanguage: highlighted.language,
      value: highlighted.value
    });
  } catch (err) {
    self.postMessage({
      '@id': e.data['@id'],
      error: err.message
    });
  }
};
