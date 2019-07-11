import { getId, arrayify } from '@scipe/jsonld';
import flatten from 'lodash/flatten';
import { schema, getObject } from '@scipe/librarian';
import { reDataDownloadContentType } from '../utils/data-download';
import { reSoftwareSourceCodeObjectContentType } from '../utils/software-source-code-object';
import { reFormulatObjectContentType } from '../utils/formula-object';
import { reTableObjectContentType } from '../utils/table-object';
import { reDocumentObjectContentType } from '../utils/document-object';
import { reMediaObjectContentType } from '../utils/media-object';
import { reTextBoxObjectContentType } from '../utils/text-box-object-utils';
import {
  fetchEncoding,
  highlightEncoding
} from '../actions/encoding-action-creators';
import {
  POUCH_DATA_UPSERTED,
  LOAD_FROM_POUCH_SUCCESS
} from '../actions/pouch-action-creators';

/**
 * React to Pouch changes feed
 */
export default function onChangeMiddleware(store) {
  return function(next) {
    return function(action) {
      if (!action) return; // TODO why should that ever happen ??

      // TODO ? processing before state update (need to access to previous state)

      // state update
      const ret = next(action);

      // processing post state update (need access to updated state)
      if (
        action.type === POUCH_DATA_UPSERTED ||
        action.type === LOAD_FROM_POUCH_SUCCESS
      ) {
        const actions = action.buffered ? action.payload : [action];
        actions.forEach(action => {
          const {
            meta: { graphId }
          } = action;

          let docs;
          if (action.type === LOAD_FROM_POUCH_SUCCESS) {
            docs = flatten(
              action.payload.map(data => data.master['@graph'] || data.master)
            );
          } else {
            docs = arrayify(
              action.payload.master['@graph'] || action.payload.master
            );
          }

          docs.forEach(doc => {
            // fetch encoding
            maybeDispatchFetchEncoding(store, doc, { graphId });

            // highlight encoding
            maybeDispatchHighlightEncoding(store, doc);

            // UpdateAction that has not been merged to the graph yet, we take care of fetching / highlighting the encoding
            if (
              doc['@type'] === 'UpdateAction' &&
              doc.actionStatus !== 'CompletedActionStatus'
            ) {
              const object = getObject(doc);
              if (object) {
                arrayify(object['@graph']).forEach(node => {
                  maybeDispatchFetchEncoding(store, node, { graphId });
                  maybeDispatchHighlightEncoding(store, node);
                });
              }
            }
          });
        });
      }

      return ret;
    };
  };
}

function maybeDispatchFetchEncoding(store, doc, { graphId }) {
  if (
    doc.contentUrl &&
    ((schema.is(doc['@type'], 'DocumentObject') &&
      reDocumentObjectContentType.test(doc.fileFormat)) ||
      (schema.is(doc['@type'], 'TableObject') &&
        reTableObjectContentType.test(doc.fileFormat)) ||
      (schema.is(doc['@type'], 'FormulaObject') &&
        reFormulatObjectContentType.test(doc.fileFormat)) ||
      (schema.is(doc['@type'], 'MediaObject') &&
        reMediaObjectContentType.test(doc.fileFormat)) ||
      (schema.is(doc['@type'], 'TextBoxObject') &&
        reTextBoxObjectContentType.test(doc.fileFormat)) ||
      (schema.is(doc['@type'], 'DataDownload') &&
        reDataDownloadContentType.test(doc.fileFormat)) ||
      (schema.is(doc['@type'], 'SoftwareSourceCodeObject') &&
        reSoftwareSourceCodeObjectContentType.test(doc.fileFormat))) &&
    !(doc['@id'] in store.getState().contentMap)
  ) {
    store.dispatch(fetchEncoding(graphId, doc));
  }
}

function maybeDispatchHighlightEncoding(store, doc) {
  if (schema.is(doc, 'SoftwareSourceCode') && doc.encoding) {
    const { contentMap } = store.getState();
    const programmingLanguage = arrayify(doc.programmingLanguage)[0];

    arrayify(doc.encoding).forEach(encoding => {
      const encodingId = getId(encoding);
      if (encodingId) {
        const content = contentMap[encodingId];
        if (
          content &&
          (!programmingLanguage ||
            !content.programmingLanguage ||
            programmingLanguage.toLowerCase() !== content.programmingLanguage)
        ) {
          store.dispatch(highlightEncoding(encodingId, programmingLanguage));
        }
      }
    });
  }
}
