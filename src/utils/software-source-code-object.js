export const reSoftwareSourceCodeObjectContentType = /^application\/javascript|^application\/ecmascript|^text\/|^application\/octet-stream'/;

export function getSoftwareSourceCodeObjetFromDocument($document) {
  const text = $document.body.textContent.trim();
  return getSoftwareSourceCodeObjetFromText(text);
}

export function getSoftwareSourceCodeObjetFromText(text) {
  return {
    text: text,
    loc: getLoC(text)
  };
}

function getLoC(text) {
  return text.split(/\r\n|\r|\n/).length;
}
