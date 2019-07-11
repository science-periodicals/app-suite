import { arrayify, getId } from '@scipe/jsonld';

export const reTableObjectContentType = /^text\/html/;

/**
 * Returns the canonical `TableObject` (encoding) associated with a `Table` resource
 */
export function getCanonicalTableObject(
  resource,
  nodeMap // optional only needed if `resource` is flat
) {
  const encoding = arrayify(resource.encoding).find(encoding => {
    if (nodeMap) {
      encoding = nodeMap[getId(encoding)] || encoding;
    }

    return reTableObjectContentType.test(encoding.fileFormat);
  });

  return nodeMap ? nodeMap[getId(encoding)] || encoding : encoding;
}

export function getTableObjectFromNode($table, { encodingId } = {}) {
  if ($table) {
    $table = $table.cloneNode(true);

    let $trList = $table.getElementsByTagName('tr');
    Array.prototype.map.call($trList, function($trRow) {
      let $tdList = $trRow.getElementsByTagName('td');
      let $thList = $trRow.getElementsByTagName('th');

      // add a span wrapper to all of the cell contents
      // this a method to allow the row to be hidden since display:collapse is not well supported
      Array.prototype.map.call($tdList, function($tdCell) {
        $tdCell.innerHTML =
          '<span class="table-object__hideable-cell">' +
          $tdCell.innerHTML +
          '</span>';
      });

      // make header cells hideable also
      Array.prototype.map.call($thList, function($thCell) {
        $thCell.innerHTML =
          '<span class="table-object__hideable-cell">' +
          $thCell.innerHTML +
          '</span>';
      });
    });

    let $tableCaption = $table.getElementsByTagName('caption')[0];

    if ($tableCaption) {
      $tableCaption.parentNode.removeChild($tableCaption);
    }
  }

  return { html: ($table && $table.outerHTML) || '<table></table>' };
}

export function getTableObjectFromDocument(document, { encodingId } = {}) {
  let $table = document.getElementsByTagName('table')[0];
  const { html } = getTableObjectFromNode($table, { encodingId });
  return { document, html, encodingId };
}
