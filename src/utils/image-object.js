import { arrayify, getId } from '@scipe/jsonld';

/**
 * Returns the canonical `ImageObject` (encoding) associated with an `Image` resource
 */
export function getCanonicalImageObject(
  resource,
  nodeMap // optional only needed if `resource` is flat
) {
  // First try for png or jpeg
  let encoding = arrayify(resource.encoding).find(encoding => {
    if (nodeMap) {
      encoding = nodeMap[getId(encoding)] || encoding;
    }

    return /image\/png|image\/jpeg/.test(encoding.fileFormat);
  });

  // if no png or jpeg we fallback to x-msmetafile
  if (!encoding) {
    encoding = arrayify(resource.encoding).find(encoding => {
      if (nodeMap) {
        encoding = nodeMap[getId(encoding)] || encoding;
      }

      return /application\/x-msmetafile/.test(encoding.fileFormat);
    });
  }

  if (nodeMap) {
    return nodeMap[getId(encoding)] || encoding;
  }

  return encoding;
}

/**
 * Extract the resolution info from the encoding exifData
 */
export function getEncodingSize(encoding) {
  //console.log('getEncodingSize', encoding);

  let sizeInfo = {
    height: undefined,
    width: undefined,
    resolution: undefined,
    units: undefined,
    heightResolution: undefined,
    widthResolution: undefined,
    heightInches: undefined,
    widthInches: undefined
  };

  const resolutionObject = arrayify(encoding.exifData).find(exif => {
    return exif.propertyID == 'resolution';
  });

  sizeInfo.height = encoding.height ? parseInt(encoding.height) : undefined;
  sizeInfo.width = encoding.width ? parseInt(encoding.width) : undefined;

  if (resolutionObject && resolutionObject.value) {
    sizeInfo.resolution = resolutionObject.value;
  } else {
    sizeInfo.resolution = '72x72';
  }

  if (resolutionObject && resolutionObject.unitText) {
    sizeInfo.units = resolutionObject.unitText;
  } else {
    sizeInfo.units = 'ppi';
  }

  if (
    sizeInfo.width &&
    sizeInfo.height &&
    sizeInfo.resolution &&
    sizeInfo.units == 'ppi'
  ) {
    const resolutions = sizeInfo.resolution.split('x');
    //onsole.log('- resolutions', resolutions);
    const heightRes = parseInt(resolutions[0], 10);
    const widthRes = parseInt(resolutions[1], 10);
    sizeInfo.heightResolution = heightRes;
    sizeInfo.widthResolution = widthRes;
    sizeInfo.heightInches = sizeInfo.height / heightRes;
    sizeInfo.widthInches = sizeInfo.width / widthRes;
  }

  return sizeInfo;
}

/**
 * Computes responsive image attributes `srcSet` and `sizes`
 * see: https://jakearchibald.com/2015/anatomy-of-responsive-images/
 */
export function getResponsiveImageData(encoding = {}) {
  let sources = encoding.thumbnail ? arrayify(encoding.thumbnail) : [encoding];

  sources = sources.filter(
    source =>
      /image\/png|image\/jpeg/.test(source.fileFormat) &&
      source.contentUrl &&
      !source.contentUrl.startsWith('file:') &&
      source.width != null
  );

  // TODO sync with https://github.com/scienceai/workers/blob/master/src/image-worker/thumbnail.js
  // ImageWorker create thumbnail for: 940px 640px 320px
  // On top of that we need to take into account for reader padding etc.

  let srcSet, sizes;
  if (sources.length) {
    srcSet = sources
      .map(source => {
        return `${source.contentUrl} ${source.width}w`;
      })
      .join(', ');

    const max = Math.max.apply(Math, sources.map(thumbnail => thumbnail.width));

    sizes = `(min-width: 1900px) ${max >= 932 ? 932 : max}px,
                   (min-width: 1000px) ${max >= 772 ? 772 : max}px,
                   (min-width:  800px) ${
                     max >= 640 ? 'calc(100vw - 232px)' : `${max}px`
                   },
                   (min-width:  400px) ${
                     max >= 320 ? 'calc(100vw - 116px)' : `${max}px`
                   },
                   ${max < 320 ? `${max}px` : 'calc(100vw - 58px)'}`;
  }

  return { srcSet, sizes };
}
