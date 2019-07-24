import isClient from 'is-client';
import querystring from 'querystring';
import noop from 'lodash/noop';
import throttle from 'lodash/throttle';
import ds3Mime from '@scipe/ds3-mime';
import { getId, arrayify, unprefix } from '@scipe/jsonld';
import {
  WEBIFY_ACTION_TYPES,
  getObject,
  xhr,
  createId,
  schema,
  getScopeId,
  getAgentId,
  remapRole
} from '@scipe/librarian';
import createError from '@scipe/create-error';
import RpcWorker from '../webworkers/rpc-worker';
import {
  getSoftwareSourceCodeObjetFromDocument,
  getSoftwareSourceCodeObjetFromText
} from '../utils/software-source-code-object';
import { getDataDownloadFromCsv } from '../utils/data-download';
import { getTableObjectFromDocument } from '../utils/table-object';
import { getArticleDataFromDocument } from '../utils/document-object';
import config from '../utils/config';
// import Papa from 'papaparse'; Papa is included with <script> so that it can be run in a worker without being bundled with all the deps...
import { createGraphDataSelector } from '../selectors/graph-selectors';

const graphDataSelector = createGraphDataSelector();

const xlsxWorker =
  isClient() && config.bundles && config.bundles['xlsx-worker']
    ? new RpcWorker(`/assets/${config.bundles['xlsx-worker'].js}`)
    : noop;
const highlightWorker =
  isClient() && config.bundles && config.bundles['highlight-worker']
    ? new RpcWorker(`/assets/${config.bundles['highlight-worker'].js}`)
    : noop;

export const FETCH_ENCODING = 'FETCH_ENCODING';
export const FETCH_ENCODING_SUCCESS = 'FETCH_ENCODING_SUCCESS';
export const FETCH_ENCODING_ERROR = 'FETCH_ENCODING_ERROR';

// TODO support service workers and cache images, audio and video fetch as blob
// https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Sending_and_Receiving_Binary_Data
// and set src with URL.createObjectURL(blob)
export function fetchEncoding(
  graphId,
  encoding,
  {
    fetchedByHtmlElement = false, // used to indicate that the encoding is fetched by a browser `<img />`, `<audio />` or `<video />` tag
    loaded = false
  } = {}
) {
  return (dispatch, getState) => {
    const encodingId = getId(encoding);

    const { fetchEncodingStatus } = getState();
    const status = fetchEncodingStatus[getId(encoding)];

    if (fetchedByHtmlElement) {
      if (loaded) {
        if (!status || status.active) {
          dispatch({
            type: FETCH_ENCODING_SUCCESS,
            payload: encoding,
            meta: { graphId, encodingId, fetchedByHtmlElement }
          });
        }
      } else {
        if (!status) {
          dispatch({
            type: FETCH_ENCODING,
            payload: encoding,
            meta: { graphId, encodingId, fetchedByHtmlElement }
          });
        }
      }

      return Promise.resolve({});
    }

    if (status) {
      return Promise.resolve({});
    }

    dispatch({
      type: FETCH_ENCODING,
      payload: encoding,
      meta: { graphId, encodingId }
    });

    return new Promise((resolve, reject) => {
      if (
        /^application\/vnd.openxmlformats-officedocument.spreadsheetml.sheet|^application\/vnd.openxmlformats-officedocument.spreadsheetml.sheet|^application\/vnd.ms-excel/.test(
          encoding.fileFormat
        )
      ) {
        xlsxWorker.dispatch(encoding, (err, payload) => {
          if (err) {
            reject(err);
          } else {
            resolve({ workbook: payload.workbook });
          }
        });
      } else if (
        /^(?:text\/csv|text\/tab-separated-values)/.test(encoding.fileFormat)
      ) {
        window.Papa.parse(encoding.contentUrl, {
          download: true,
          worker: true,
          withCredentials: true,
          header: false,
          preview: 50,
          error: err => {
            reject(err);
          },
          complete: payload => {
            resolve(getDataDownloadFromCsv(payload));
          }
        });
      } else if (
        /^(?:text\/html|application\/mathml\+xml|application\/mathml-presentation\+xml|application\/mathml-content\+xml)/.test(
          encoding.fileFormat
        )
      ) {
        // HTML: fetch DOM (note some SoftwareSourceCode might be in
        // HTML (mostly what comes from DocumentWorker)
        xhr(
          {
            url: encoding.contentUrl,
            method: 'GET',
            responseType: 'document',
            headers: {
              Accept: encoding.fileFormat,
              'response-content-type': encoding.fileFormat
            }
          },
          (err, resp, responseXML) => {
            if (err) return reject(err);

            let payload;
            if (schema.is(encoding['@type'], 'SoftwareSourceCodeObject')) {
              payload = getSoftwareSourceCodeObjetFromDocument(responseXML);
            } else if (schema.is(encoding['@type'], 'TableObject')) {
              payload = getTableObjectFromDocument(responseXML, {
                encodingId: getId(encoding)
              });
            } else if (schema.is(encoding['@type'], 'FormulaObject')) {
              let html;
              if (responseXML.body && responseXML.body.innerHTML) {
                html = responseXML.body.innerHTML;
              } else if (
                responseXML.documentElement &&
                responseXML.documentElement.innerHTML
              ) {
                html = responseXML.documentElement.innerHTML;
              }
              payload = { html };
            } else if (schema.is(encoding['@type'], 'DocumentObject')) {
              payload = getArticleDataFromDocument(
                responseXML,
                getId(encoding)
              );
            } else {
              payload = { document: responseXML, encodingId: getId(encoding) };
            }
            resolve(payload);
          }
        );
      } else if (schema.is(encoding['@type'], 'SoftwareSourceCodeObject')) {
        // code: fetch text (note some SoftwareSourceCode might be in
        // HTML (mostly what's come from DocumentWorker but this has been
        // handled by the condition above))
        xhr(
          {
            url: encoding.contentUrl,
            method: 'GET'
          },
          (err, resp, body) => {
            if (err) return reject(err);
            resolve(getSoftwareSourceCodeObjetFromText(body));
          }
        );
      } else {
        reject(createError(400, 'invalid encoding'));
      }
    })
      .then(payload => {
        if (schema.is(encoding['@type'], 'SoftwareSourceCodeObject')) {
          const graphData = graphDataSelector(getState(), { graphId });
          let programmingLanguage;
          if (graphData) {
            const resourceId = getId(encoding.encodesCreativeWork);
            if (resourceId) {
              const resource =
                graphData.nodeMap && graphData.nodeMap[resourceId];
              if (resource) {
                programmingLanguage = arrayify(resource.programmingLanguage)[0];
              }
            }
          }

          dispatch({
            type: FETCH_ENCODING_SUCCESS,
            payload,
            meta: { graphId, encodingId, encoding, webWorker: true } // webWorker is used for the fetchEncodingStatus reducer
          });

          return dispatch(
            highlightEncoding(getId(encoding), programmingLanguage)
          );
        } else if (
          schema.is(encoding['@type'], 'TableObject') ||
          schema.is(encoding['@type'], 'TextBoxObject')
        ) {
          // Table and TextBox can have inline images => we need to take them into account for print so we know when those have been loaded
          const $imgs =
            payload.document && payload.document.querySelectorAll('img');
          dispatch({
            type: FETCH_ENCODING_SUCCESS,
            payload,
            meta: { graphId, encodingId, encoding, images: $imgs.length }
          });
        } else {
          dispatch({
            type: FETCH_ENCODING_SUCCESS,
            payload,
            meta: { graphId, encodingId, encoding }
          });
        }
      })
      .catch(err => {
        dispatch({
          type: FETCH_ENCODING_ERROR,
          error: err,
          meta: { graphId, encodingId, encoding }
        });
      });
  };
}

export const HIGHLIGHT_ENCODING = 'HIGHLIGHT_ENCODING';
export const HIGHLIGHT_ENCODING_SUCCESS = 'HIGHLIGHT_ENCODING_SUCCESS';
export const HIGHLIGHT_ENCODING_ERROR = 'HIGHLIGHT_ENCODING_ERROR';

export function highlightEncoding(encodingId, programmingLanguage) {
  return (dispatch, getState) => {
    const content = getState().contentMap[encodingId];
    if (!content || !content.text) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      dispatch({
        type: HIGHLIGHT_ENCODING,
        payload: programmingLanguage,
        meta: { encodingId }
      });

      highlightWorker.dispatch(
        {
          '@id': encodingId,
          text: content.text,
          programmingLanguage
        },
        (err, payload) => {
          if (err) {
            reject(err);
          } else {
            resolve(payload);
          }
        }
      );
    })
      .then(payload => {
        dispatch({
          type: HIGHLIGHT_ENCODING_SUCCESS,
          payload,
          meta: { encodingId }
        });
      })
      .catch(err => {
        dispatch({
          type: HIGHLIGHT_ENCODING_ERROR,
          error: err,
          meta: { encodingId }
        });
      });
  };
}

export const UPLOAD = 'UPLOAD';
export const UPLOAD_PROGRESS = 'UPLOAD_PROGRESS';
export const UPLOAD_SUCCESS = 'UPLOAD_SUCCESS';
export const UPLOAD_ERROR = 'UPLOAD_ERROR';

export function upload(
  file,
  context, // actionId, graphId, periodicalId or IssueId
  resource, // resourceId or styleId or one of `logo`, `image` etc.
  { fileFormat, update = false, roleId } = {}
) {
  return (dispatch, getState) => {
    fileFormat = fileFormat || file.type;

    if (
      file.type ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' &&
      file.name &&
      file.name.endsWith('.ds3.docx')
    ) {
      fileFormat = ds3Mime;
    }

    const uploadActionId = createId('blank')['@id'];

    const qs = {
      update,
      name: file.name,
      context,
      resource,
      uploadAction: uploadActionId,
      role: roleId && roleId.startsWith('role:') ? unprefix(roleId) : undefined
    };

    const event = {
      '@id': createId('blank')['@id'],
      '@type': 'ProgressEvent',
      about: uploadActionId,
      startDate: new Date().toISOString(),
      description: `uploading ${file.name || 'file'}`
    };

    function onProgress(e) {
      if (e.lengthComputable) {
        const progress = (e.loaded / e.total) * 100;
        dispatch({
          type: UPLOAD_PROGRESS,
          meta: { context, resource },
          payload: {
            '@id': createId('blank')['@id'],
            '@type': 'ProgressEvent',
            about: uploadActionId,
            superEvent: getId(event),
            startDate: new Date().toISOString(),
            progress: {
              '@type': 'QuantitativeValue',
              value: progress
            }
          }
        });
      }
    }

    const throttled = throttle(onProgress, 200);

    const r = xhr({
      url: `/encoding?${querystring.stringify(qs)}`,
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': fileFormat
      },
      body: file,
      beforeSend: xhrObject => {
        xhrObject.upload.onprogress = throttled;
      }
    });

    // start file upload
    dispatch({
      type: UPLOAD,
      meta: { context, resource, event, xhr: r.xhr }
    });

    dispatch({
      type: UPLOAD_PROGRESS,
      meta: { context, resource },
      payload: event
    });

    return r
      .then(({ body }) => {
        const uploadAction = JSON.parse(body);

        throttled.flush();
        throttled.cancel();
        dispatch({
          type: UPLOAD_PROGRESS,
          payload: Object.assign({}, event, {
            endDate: new Date().toISOString()
          })
        });

        dispatch({
          type: UPLOAD_SUCCESS,
          meta: { context, resource, event },
          payload: uploadAction
        });

        return uploadAction;
      })
      .catch(err => {
        throttled.flush();
        throttled.cancel();

        dispatch({
          type: UPLOAD_ERROR,
          meta: { context, resource, event },
          error: err
        });
        throw err;
      });
  };
}

export const ENCODING_IMAGES_LOADED = 'ENCODING_IMAGES_LOADED';

export function encodingImagesLoaded(encodingId) {
  return {
    type: ENCODING_IMAGES_LOADED,
    meta: { encodingId }
  };
}

export const CANCEL_UPLOAD = 'CANCEL_UPLOAD';
export const CANCEL_UPLOAD_SUCCESS = 'CANCEL_UPLOAD_SUCCESS';
export const CANCEL_UPLOAD_ERROR = 'CANCEL_UPLOAD_ERROR';

export function cancelUpload(
  graphId,
  actions, // list of UploadAction and webify action (or single action)
  roleName // `author` or `producer` (needed to get the role canceling)
) {
  return function(dispatch, getState) {
    const { scopeMap, user } = getState();

    const scopeId = getScopeId(graphId);
    const graph = scopeMap[scopeId].graphMap[scopeId].graph;
    const agent = remapRole(
      arrayify(graph[roleName]).find(role => getAgentId(role) === getId(user)),
      'agent',
      { dates: false }
    );

    let resourceId;
    const uploadAction = actions.find(
      action => action['@type'] === 'UploadAction'
    );
    if (uploadAction) {
      resourceId = getId(getObject(uploadAction).encodesCreativeWork);
    }
    if (!resourceId) {
      const webifyAction = actions.find(action =>
        WEBIFY_ACTION_TYPES.has(action['@type'])
      );
      if (webifyAction) {
        resourceId = getId(getObject(webifyAction).encodesCreativeWork);
      }
    }

    const meta = { graphId, roleName, resourceId };

    dispatch({
      type: CANCEL_UPLOAD,
      meta,
      payload: actions
    });

    return Promise.all(
      arrayify(actions).map(action => {
        return xhr({
          url: '/action',
          method: 'POST',
          json: true,
          body: {
            '@type': 'CancelAction',
            agent,
            actionStatus: 'CompletedActionStatus',
            object: getId(action)
          }
        });
      })
    )
      .then(res => {
        dispatch({
          type: CANCEL_UPLOAD_SUCCESS,
          meta,
          payload: res.map(res => res.body)
        });

        return res;
      })
      .catch(err => {
        dispatch({
          type: CANCEL_UPLOAD_ERROR,
          meta,
          error: err
        });
        throw err;
      });
  };
}
