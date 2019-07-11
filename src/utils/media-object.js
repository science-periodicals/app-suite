import { arrayify, getId } from '@scipe/jsonld';

export const reMediaObjectContentType = /^text\/html/;

/**
 * Returns the canonical `MediaObject` (encoding) associated with a `CreativeWork` resource
 * (typically a `ScholaryArticle`)
 */
export function getCanonicalFormulaObject(
  resource,
  nodeMap // optional only needed if `resource` is flat
) {
  const encoding = arrayify(resource.encoding).find(encoding => {
    if (nodeMap) {
      encoding = nodeMap[getId(encoding)] || encoding;
    }

    return reMediaObjectContentType.test(encoding.fileFormat);
  });

  return nodeMap ? nodeMap[getId(encoding)] || encoding : encoding;
}
