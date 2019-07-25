import querystring from 'querystring';
import pick from 'lodash/pick';
import { CSS_HEADER_HEIGHT } from '@scipe/ui';
import { getScopeId, getVersion } from '@scipe/librarian';
import { getId, unprefix, arrayify } from '@scipe/jsonld';

// we store the publisher location so that it can be restored
export const OPEN_READER_PREVIEW = 'OPEN_READER_PREVIEW';
export function openReaderPreview(
  history,
  location,
  journalId,
  graphId,
  isPreviewOutdated
) {
  const version = getVersion(graphId);
  const query = querystring.parse(location.search.substring(1));
  let qs;
  if (version != null || query.stage || query.action) {
    qs = querystring.stringify(
      Object.assign(
        pick(query, ['stage', 'action']),
        version != null ? { version } : undefined
      )
    );
  }

  history.push({
    pathname: `/${unprefix(journalId)}/${unprefix(
      getScopeId(graphId)
    )}/preview`,
    search: qs ? `?${qs}` : undefined
  });

  return {
    type: OPEN_READER_PREVIEW,
    payload: { publisherLocation: location, isPreviewOutdated }
  };
}

export const CLOSE_READER_PREVIEW = 'CLOSE_READER_PREVIEW';
export function closeReaderPreview(history, location, journalId, graphId) {
  return (dispatch, getState) => {
    const {
      readerPreviewData: { publisherLocation }
    } = getState();

    dispatch({
      type: CLOSE_READER_PREVIEW
    });

    let qs;
    if (!publisherLocation) {
      const version = getVersion(graphId);
      const query = querystring.parse(location.search.substring(1));
      if (version != null || query.stage || query.action) {
        qs = querystring.stringify(
          Object.assign(
            pick(query, ['stage', 'action']),
            version != null ? { version } : undefined
          )
        );
      }
    }

    const nextLocation = publisherLocation || {
      pathname: `/${unprefix(journalId)}/${unprefix(
        getScopeId(graphId)
      )}/submission`,
      search: qs ? `?${qs}` : undefined
    };

    history.push(nextLocation);
  };
}

export const HIGHLIGHT_RESOURCE = 'HIGHLIGHT_RESOURCE';
export function highlightResource(id) {
  return {
    type: HIGHLIGHT_RESOURCE,
    payload: id
  };
}

// TODO rename (pluralize) as `id` can be a list
export const HIGHLIGHT_WORKFLOW_ACTION = 'HIGHLIGHT_WORKFLOW_ACTION';
export function highlightWorkflowAction(
  graphId,
  id // will be undefined if we un-highlight (Note that `id` can be a list)
) {
  return function(dispatch, getState) {
    // we prevent to fire the action too often (esp as this is fire when the a workflow action component unmount
    // TODO rename this should be plural
    const { highlightedWorkflowAction = {} } = getState();
    const highlights = arrayify(highlightedWorkflowAction[getId(graphId)]);
    const ids = arrayify(id);
    if (
      ids.length !== highlights.length ||
      ids.some(id => !highlights.some(_id => id === _id))
    ) {
      return dispatch({
        type: HIGHLIGHT_WORKFLOW_ACTION,
        payload: id,
        meta: { graphId }
      });
    }
  };
}

export const OPEN_WORKFLOW_ACTION = 'OPEN_WORKFLOW_ACTION';
export function openWorkflowAction(
  graphId,
  id // will be undefined if we close (Note that `id` can be a list)
) {
  return function(dispatch, getState) {
    // we prevent to fire the action too often (esp as this is fire when the a workflow action component unmount
    // TODO rename this should be plural
    const { openedWorkflowAction = {} } = getState();
    const highlights = arrayify(openedWorkflowAction[getId(graphId)]);
    const ids = arrayify(id);
    if (
      ids.length !== highlights.length ||
      ids.some(id => !highlights.some(_id => id === _id))
    ) {
      return dispatch({
        type: OPEN_WORKFLOW_ACTION,
        payload: id,
        meta: { graphId }
      });
    }
  };
}

export const UPDATE_IS_OFFLINE = 'UPDATE_IS_OFFLINE';
export function updateIsOffline(isOffline) {
  return {
    type: UPDATE_IS_OFFLINE,
    payload: isOffline
  };
}

export const OPEN_SHELL = 'OPEN_SHELL';

/**
 * see <Shell /> propTypes for a list of possible `type`
 */
export function openShell(
  type,
  id,
  { selector, disabled, readOnly, hash, connectedComponent, params, e } = {}
) {
  return function(dispatch, getState) {
    const { shell } = getState();

    if (type === 'location') {
      // In this case we only prevent the event (`e`) the first time we open the shell
      if (shell.isOpen && shell.hash === hash) {
        // no op
        return;
      } else {
        if (e && e.preventDefault) {
          e.preventDefault();
        }
        if (e && e.stopPropagation) {
          e.stopPropagation();
        }
      }
    }

    dispatch({
      type: OPEN_SHELL,
      payload: {
        type,
        id,
        selector,
        disabled,
        readOnly,
        hash,
        connectedComponent,
        params
      }
    });
  };
}

export const CLOSE_SHELL = 'CLOSE_SHELL';

export function closeShell() {
  return (dispatch, getState) => {
    const { shell } = getState();
    if (shell.isOpen) {
      dispatch({ type: CLOSE_SHELL });
    }
  };
}

export const SET_SCREEN_DIM = 'SET_SCREEN_DIM';
export function setScreenDim(screenWidth, screenHeight) {
  return {
    type: SET_SCREEN_DIM,
    payload: {
      screenWidth,
      screenHeight
    }
  };
}

export const OPEN_PRINT_PROGRESS_MODAL = 'OPEN_PRINT_PROGRESS_MODAL';
export function openPrintProgressModal() {
  return {
    type: OPEN_PRINT_PROGRESS_MODAL
  };
}

export const CLOSE_PRINT_PROGRESS_MODAL = 'CLOSE_PRINT_PROGRESS_MODAL';
export function closePrintProgressModal() {
  return {
    type: CLOSE_PRINT_PROGRESS_MODAL
  };
}

export const SCROLL_TO_HASH = 'SCROLL_TO_HASH';
export const QUEUE_SCROLL_TO_HASH = 'QUEUE_SCROLL_TO_HASH';
export function scrollToHash(hash, { queue = false } = {}) {
  return (dispatch, getState) => {
    const { queuedScrollHash } = getState();

    const $target = document.getElementById(hash.substring(1));
    if ($target) {
      const rect = $target.getBoundingClientRect();
      window.scroll({
        top: window.pageYOffset + rect.top - CSS_HEADER_HEIGHT - 40,
        behavior: 'smooth'
      });
      dispatch({
        type: SCROLL_TO_HASH,
        payload: hash
      });
      clearInterval(queuedScrollHash.intervalId);
      clearTimeout(queuedScrollHash.timeoutId);
    } else if (queue) {
      clearInterval(queuedScrollHash.intervalId);
      clearTimeout(queuedScrollHash.timeoutId);

      const intervalId = setInterval(() => {
        const $target = document.getElementById(hash.substring(1));
        if ($target) {
          const rect = $target.getBoundingClientRect();
          window.scroll({
            top: window.pageYOffset + rect.top - CSS_HEADER_HEIGHT - 40,
            behavior: 'smooth'
          });
          dispatch({
            type: SCROLL_TO_HASH,
            payload: hash
          });
          clearInterval(intervalId);
          clearTimeout(timeoutId);
        }
      }, 100);

      const timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        console.warn(`${QUEUE_SCROLL_TO_HASH} aborted for ${hash}`);
      }, 1000);

      dispatch({
        type: QUEUE_SCROLL_TO_HASH,
        payload: {
          intervalId,
          timeoutId,
          queuedHash: hash
        }
      });
    }
  };
}

export const CLEAR_ERROR_AND_STATUS_BY_KEY = 'CLEAR_ERROR_AND_STATUS_BY_KEY';
export function clearErrorAndStatusByKey(
  key // reducer will clear status by calling omit(state, [key])
) {
  return {
    type: CLEAR_ERROR_AND_STATUS_BY_KEY,
    payload: key
  };
}
