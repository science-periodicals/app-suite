import { getDataDownloadFromXlsx } from '../utils/data-download';

self.importScripts('xlsx/xlsx.full.min.js'); /* global XLSX */

self.onmessage = function(e) {
  const node = e.data;
  const xhr = new XMLHttpRequest();
  xhr.onload = e => {
    if (e.target.status >= 400) {
      console.error(e.target.status);
    } else {
      const arraybuffer = e.target.response;

      // convert data to binary string
      const data = new Uint8Array(arraybuffer);
      const workbook = XLSX.read(data, {
        type: 'array',
        cellHTML: true,
        cellStyles: true,
        sheetStubs: true
      });

      try {
        self.postMessage({
          '@id': node['@id'],
          workbook: getDataDownloadFromXlsx(XLSX, workbook)
        });
      } catch (e) {
        self.postMessage({
          '@id': node['@id'],
          error: e.message
        });
      }
    }
  };
  xhr.onabort = e => {
    console.error('xhr aborted');
  };
  xhr.onerror = e => {
    console.error('xhr errored');
  };
  xhr.open('GET', node.contentUrl);
  xhr.responseType = 'arraybuffer';
  xhr.send();
};
