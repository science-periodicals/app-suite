import { arrayify, getId } from '@scipe/jsonld';
import isUrl from 'is-url';

export const reDataDownloadContentType = /^application\/vnd.openxmlformats-officedocument.spreadsheetml.sheet|^application\/vnd.openxmlformats-officedocument.spreadsheetml.sheet|^application\/vnd.ms-excel|^text\/csv|^text\/tab-separated-values/;

/**
 * Returns the canonical `DataDownload` (encoding) associated with a `Dataset` resource
 */
export function getCanonicalDataDownload(
  resource,
  nodeMap // optional only needed if `resource` is flat
) {
  const encoding = arrayify(resource.distribution)
    .concat(arrayify(resource.encoding))
    .find(encoding => {
      if (nodeMap) {
        encoding = nodeMap[getId(encoding)] || encoding;
      }

      return reDataDownloadContentType.test(encoding.fileFormat);
    });

  return nodeMap ? nodeMap[getId(encoding)] || encoding : encoding;
}

export function getDataDownloadDisplayEncodings(resource = {}) {
  return arrayify(resource.distribution || resource.encoding).filter(
    encoding => encoding.contentUrl && !encoding.contentUrl.startsWith('file:')
  );
}

// csv / tsv is parsed from `Papa.parse`
export function getDataDownloadFromCsv({ data, meta }) {
  const $table = document.createElement('table');
  const $tbody = document.createElement('tbody');

  if (meta.fields) {
    const $thead = document.createElement('thead');
    const $tr = document.createElement('tr');
    meta.fields.forEach(col => {
      const $th = document.createElement('th');
      $th.innerHTML = '<span class="table__hideable-cell">' + col + '</span>';
      $tr.appendChild($th);
    });
    $thead.appendChild($tr);
    $table.appendChild($thead);
  }

  data.forEach(row => {
    const $tr = document.createElement('tr');
    (meta.fields || row).forEach(col => {
      const $td = document.createElement('td');
      $td.innerHTML =
        '<span class="table__hideable-cell">' +
        (meta.fields ? row[col] : col) +
        '</span>';
      $tr.appendChild($td);
    });
    $tbody.appendChild($tr);
  });

  $table.appendChild($tbody);

  return {
    html: $table.outerHTML
  };
}

// as import xlsx doesn't work with browserify we pass it as function
// argument as it is typicaly loaded with importScripts from a webworker
// :(
export function getDataDownloadFromXlsx(xlsx, workbook) {
  // See https://github.com/sheetjs/js-xlsx for documentation
  // TODO ? restrict to fist 50 rows...

  const tables = [];
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const range = xlsx.utils.decode_range(sheet['!ref']);
    // if non empty range -> convert sheet into HTML table

    if (range.s.c !== range.e.c || range.s.r !== range.e.r) {
      const mergedCells = sheet['!merges'];
      let html = '<table><tbody>';
      for (
        let i = range.s.r /*range start row*/;
        i <= range.e.r /*range end row*/;
        i++
      ) {
        html += '<tr>';
        for (
          let j = range.s.c;
          /* range start column */ j <= range.e.c /* range end column */;
          j++
        ) {
          const cell = sheet[xlsx.utils.encode_cell({ c: j, r: i })];

          let merged, rowspan, colspan;
          if (cell && mergedCells) {
            for (let mergedCell of mergedCells) {
              if (mergedCell.s.r === i && mergedCell.s.c === j) {
                merged = mergedCell;
                break;
              }
            }

            if (merged) {
              rowspan = merged.e.r - merged.s.r;
              colspan = merged.e.c - merged.s.c;
            }
          }

          // if merged cell (cell.t === 'z') we don't render has rowspan and/or colspan would have handle the cell earlier on
          if (!cell || cell.t !== 'z') {
            let opening;
            if (!rowspan && colspan) {
              opening = `<td colspan="${colspan + 1}">`;
            } else if (rowspan && !colspan) {
              opening = `<td rowspan="${rowspan + 1}">`;
            } else if (rowspan && colspan) {
              opening = `<td colspan="${colspan + 1}" rowspan="${rowspan +
                1}">`;
            } else {
              opening = '<td>';
            }

            let value;
            if (cell) {
              const textContent = xlsx.utils.format_cell(cell);
              if (cell.l && isUrl(cell.l.Target)) {
                value = `<a href="${cell.l.Target}" title="${
                  cell.l.tooltip
                }">${textContent}</a>`;
              } else {
                value = textContent;
              }
            } else {
              value = String.fromCharCode(160); // non breaking space
            }
            html += `${opening}<span class="table__hideable-cell">${value}</span></td>`;
          }
        }
        html += '</tr>';
      }
      html += '<tbody></table>';

      tables.push({
        name: sheetName,
        html: html
      });
    }
  });

  return tables;
}
