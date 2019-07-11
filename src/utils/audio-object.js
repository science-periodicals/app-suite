import { arrayify } from '@scipe/jsonld';

export function getAudioObjectDisplayEncodings(resource = {}) {
  return arrayify(resource.encoding).filter(
    e => e.contentUrl && !e.contentUrl.startsWith('file:') && e.fileFormat
  );
}
