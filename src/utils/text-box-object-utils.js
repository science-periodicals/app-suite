import { arrayify, getId } from '@scipe/jsonld';

export const reTextBoxObjectContentType = /^text\/html/;

/**
 * Returns the canonical `TextBoxObject` (encoding) associated with a `TextBox` resource
 */
export function getCanonicalFormulaObject(
  resource,
  nodeMap // optional only needed if `resource` is flat
) {
  const encoding = arrayify(resource.encoding).find(encoding => {
    if (nodeMap) {
      encoding = nodeMap[getId(encoding)] || encoding;
    }

    return reTextBoxObjectContentType.test(encoding.fileFormat);
  });

  return nodeMap ? nodeMap[getId(encoding)] || encoding : encoding;
}
