import { arrayify } from '@scipe/jsonld';

function getMediaDisplayScore(mime = '') {
  if (mime.startsWith('video/mp4')) {
    return 4;
  } else if (mime.startsWith('video/webm')) {
    return 3;
  } else if (mime.startsWith('video/ogg')) {
    return 2;
  } else if (mime.startsWith('video/quicktime')) {
    return 1;
  } else {
    return 0;
  }
}

export function getVideoObjectDisplayEncodings(resource = {}) {
  return arrayify(resource.encoding)
    .filter(
      e => e.contentUrl && !e.contentUrl.startsWith('file:') && e.fileFormat
    )
    .sort((a, b) => {
      return (
        getMediaDisplayScore(b.fileFormat) - getMediaDisplayScore(a.fileFormat)
      );
    });
}

export function getPosterEncoding(resource = {}) {
  // TODO improve right now return first thumbnail
  // TODO handle the resource.image property.

  const encodings = arrayify(resource.encoding);
  for (let encoding of encodings) {
    const thumbnails = arrayify(encoding.thumbnail);
    for (let thumbnail of thumbnails) {
      if (
        thumbnail.contentUrl &&
        /image\/png|image\/jpeg/.test(thumbnail.fileFormat)
      ) {
        return thumbnail;
      }
    }
  }
}
