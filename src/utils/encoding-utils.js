import { getResourceInfo } from '@scipe/ui';
import { schema } from '@scipe/librarian';
import { getId, arrayify } from '@scipe/jsonld';
import { reDataDownloadContentType } from './data-download';
import { reSoftwareSourceCodeObjectContentType } from './software-source-code-object';
import { reFormulatObjectContentType } from './formula-object';
import { reTableObjectContentType } from './table-object';
import { reDocumentObjectContentType } from './document-object';
import { reMediaObjectContentType } from './media-object';
import { getCanonicalImageObject } from './image-object';

export function getFetchableEncodings(
  graph,
  nodeMap,
  { ignoreSupportingResources = false } = {}
) {
  const fetchableEncodings = [];
  if (graph && nodeMap) {
    const mainEntityId = getId(graph.mainEntity);

    const resourceInfo = getResourceInfo(graph, nodeMap, {
      sort: false
    });

    const resources = arrayify(resourceInfo.resourceIds)
      .map(id => nodeMap[id])
      .filter(Boolean);

    resources.forEach(resource => {
      // we don't print SI in print mode
      if (
        ignoreSupportingResources &&
        resource.isSupportingResource &&
        getId(resource) !== mainEntityId
      ) {
        return;
      }

      if (resource['@type'] === 'Image') {
        const parts = resource.hasPart
          ? arrayify(resource.hasPart)
          : [resource];

        parts.forEach(part => {
          part = nodeMap[getId(part)] || part;
          const encoding = getCanonicalImageObject(part, nodeMap);
          if (
            encoding &&
            !fetchableEncodings.some(
              _encoding => getId(_encoding) === getId(encoding)
            )
          ) {
            fetchableEncodings.push(encoding);
          }
        });
      } else {
        arrayify(resource.distribution || resource.encoding).forEach(
          encodingId => {
            const encoding = nodeMap[getId(encodingId)];
            if (
              encoding.contentUrl &&
              ((schema.is(encoding, 'DocumentObject') &&
                reDocumentObjectContentType.test(encoding.fileFormat)) ||
                (schema.is(encoding, 'TableObject') &&
                  reTableObjectContentType.test(encoding.fileFormat)) ||
                (schema.is(encoding, 'FormulaObject') &&
                  reFormulatObjectContentType.test(encoding.fileFormat)) ||
                (schema.is(encoding, 'MediaObject') &&
                  reMediaObjectContentType.test(encoding.fileFormat)) ||
                (schema.is(encoding, 'DataDownload') &&
                  reDataDownloadContentType.test(encoding.fileFormat)) ||
                (schema.is(encoding, 'SoftwareSourceCodeObject') &&
                  reSoftwareSourceCodeObjectContentType.test(
                    encoding.fileFormat
                  )))
            ) {
              if (
                !fetchableEncodings.some(
                  _encoding => getId(_encoding) === getId(encoding)
                )
              ) {
                fetchableEncodings.push(encoding);
              }
            }
          }
        );
      }
    });
  }
  return fetchableEncodings;
}

export function checkIfIsStillFetching(
  fetchableEncodings = [],
  fetchEncodingStatus = {}
) {
  return fetchableEncodings.some(encoding => {
    const encodingId = getId(encoding);
    return (
      !fetchEncodingStatus[encodingId] || fetchEncodingStatus[encodingId].active
    );
  });
}
