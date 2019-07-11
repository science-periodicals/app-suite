import { arrayify, getId } from '@scipe/jsonld';

export const reFormulatObjectContentType = /^text\/html|^application\/mathml\+xml|^application\/mathml-presentation\+xml|^application\/mathml-content\+xml/;

/**
 * Returns the canonical `FormulaObject` (encoding) associated with a `Formula` resource
 */
export function getCanonicalFormulaObject(
  resource,
  nodeMap // optional only needed if `resource` is flat
) {
  const encoding = arrayify(resource.encoding).find(encoding => {
    if (nodeMap) {
      encoding = nodeMap[getId(encoding)] || encoding;
    }

    return reFormulatObjectContentType.test(encoding.fileFormat);
  });

  return nodeMap ? nodeMap[getId(encoding)] || encoding : encoding;
}
