import querystring from 'querystring';
import { getId } from '@scipe/jsonld';
import {
  xhr,
  escapeLucene,
  formatSearchTerm,
  createId
} from '@scipe/librarian';

export const FETCH_SETTINGS_JOURNAL_LIST = 'FETCH_SETTINGS_JOURNAL_LIST';
export const FETCH_SETTINGS_JOURNAL_LIST_SUCCESS =
  'FETCH_SETTINGS_JOURNAL_LIST_SUCCESS';
export const FETCH_SETTINGS_JOURNAL_LIST_ERROR =
  'FETCH_SETTINGS_JOURNAL_LIST_ERROR';

export function fetchSettingsJournalList() {
  return (dispatch, getState) => {
    const { user, settingsJournalList } = getState();

    // cancel previous xhr (if any)
    if (settingsJournalList.xhr) {
      settingsJournalList.xhr.abort();
    }

    const qs = {
      query: `adminPermission:"${getId(user)}"`,
      includeDocs: false,
      sort: JSON.stringify('-dateCreated'),
      includeFields: JSON.stringify(['name', 'alternateName', '@type', 'url'])
    };

    const r = xhr({
      url: `/periodical?${querystring.stringify(qs)}`,
      method: 'GET',
      json: true
    });

    dispatch({
      type: FETCH_SETTINGS_JOURNAL_LIST,
      payload: r.xhr
    });

    return r
      .then(({ body }) => {
        dispatch({
          type: FETCH_SETTINGS_JOURNAL_LIST_SUCCESS,
          payload: body
        });
      })
      .catch(err => {
        dispatch({
          type: FETCH_SETTINGS_JOURNAL_LIST_ERROR,
          error: err
        });
      });
  };
}

export const FETCH_SETTINGS_ORGANIZATION_LIST =
  'FETCH_SETTINGS_ORGANIZATION_LIST';
export const FETCH_SETTINGS_ORGANIZATION_LIST_SUCCESS =
  'FETCH_SETTINGS_ORGANIZATION_LIST_SUCCESS';
export const FETCH_SETTINGS_ORGANIZATION_LIST_ERROR =
  'FETCH_SETTINGS_ORGANIZATION_LIST_ERROR';

export function fetchSettingsOrganizationList() {
  return (dispatch, getState) => {
    const { user, settingsOrganizationList } = getState();

    // cancel previous xhr (if any)
    if (settingsOrganizationList.xhr) {
      settingsOrganizationList.xhr.abort();
    }

    const qs = {
      query: `adminPermission:"${getId(user)}"`,
      includeDocs: false,
      sort: JSON.stringify('-foundingDate'),
      includeFields: JSON.stringify(['name', 'alternateName', '@type', 'url'])
    };

    const r = xhr({
      url: `/organization?${querystring.stringify(qs)}`,
      method: 'GET',
      json: true
    });

    dispatch({
      type: FETCH_SETTINGS_ORGANIZATION_LIST,
      payload: r.xhr
    });

    return r
      .then(({ body }) => {
        dispatch({
          type: FETCH_SETTINGS_ORGANIZATION_LIST_SUCCESS,
          payload: body
        });
      })
      .catch(err => {
        dispatch({
          type: FETCH_SETTINGS_ORGANIZATION_LIST_ERROR,
          error: err
        });
      });
  };
}

export const SEARCH_SETTINGS_ARTICLE_LIST = 'SEARCH_SETTINGS_ARTICLE_LIST';
export const SEARCH_SETTINGS_ARTICLE_LIST_SUCCESS =
  'SEARCH_SETTINGS_ARTICLE_LIST_SUCCESS';
export const SEARCH_SETTINGS_ARTICLE_LIST_ERROR =
  'SEARCH_SETTINGS_ARTICLE_LIST_ERROR';

// Note: the actual articles are stored in the droplets
export function searchSettingsArticleList(
  periodical,
  {
    issue, // if specified we restrict the search to the issueId
    searchValue = '',
    nextUrl,
    reset
  } = {}
) {
  return (dispatch, getState) => {
    const { settingsArticleList } = getState();

    // cancel previous xhr (if any)
    if (settingsArticleList.xhr) {
      settingsArticleList.xhr.abort();
    }

    let url;
    if (nextUrl) {
      url = nextUrl;
    } else {
      const defaultQuery = `(journalId:"${getId(
        periodical
      )}" AND status:published) NOT version:null`;

      searchValue =
        typeof searchValue === 'string' ? searchValue.trim() : searchValue;

      let query;
      if (searchValue) {
        const indexes = [
          'name',
          'alternateName',
          'entityName',
          'entityAlternateName',
          'slug'
        ];

        query = [];
        const tokens = searchValue.split(/\s+/);
        indexes.forEach(index => {
          query.push(`${index}:${formatSearchTerm(searchValue)}`);
        });

        tokens.forEach(token => {
          query.push(
            `scopeId:${escapeLucene(createId('graph', token)['@id'])}`
          );
          indexes.forEach(index => {
            query.push(`${index}:${formatSearchTerm(token)}`);
            query.push(`${index}:${escapeLucene(token)}*`);
          });
        });
        query = `(${defaultQuery}) AND (${query.join(' OR ')})`;
      } else {
        query = defaultQuery;
      }
      const qs = {
        query,
        limit: 10,
        includeDocs: true,
        sort: JSON.stringify('-datePublished')
      };

      url = `/graph?${querystring.stringify(qs)}`;
    }

    const r = xhr({
      url,
      method: 'GET',
      json: true
    });

    dispatch({
      type: SEARCH_SETTINGS_ARTICLE_LIST,
      payload: r.xhr,
      meta: { reset }
    });

    return r
      .then(({ body }) => {
        dispatch({
          type: SEARCH_SETTINGS_ARTICLE_LIST_SUCCESS,
          payload: body,
          meta: { append: !!nextUrl }
        });
      })
      .catch(err => {
        dispatch({
          type: SEARCH_SETTINGS_ARTICLE_LIST_ERROR,
          error: err
        });
      });
  };
}

export const SEARCH_SETTINGS_ISSUE_LIST = 'SEARCH_SETTINGS_ISSUE_LIST';
export const SEARCH_SETTINGS_ISSUE_LIST_SUCCESS =
  'SEARCH_SETTINGS_ISSUE_LIST_SUCCESS';
export const SEARCH_SETTINGS_ISSUE_LIST_ERROR =
  'SEARCH_SETTINGS_ISSUE_LIST_ERROR';

// Note: the actual articles are stored in the droplets
export function searchSettingsIssueList(
  periodical,
  {
    type, // if specified we restrict to @type (`PublicationIssue` or `SpecialPublicationIssue`)
    searchValue = '',
    nextUrl,
    reset
  } = {}
) {
  return (dispatch, getState) => {
    const { settingsIssueList } = getState();

    // cancel previous xhr (if any)
    if (settingsIssueList.xhr) {
      settingsIssueList.xhr.abort();
    }

    let url;
    if (nextUrl) {
      url = nextUrl;
    } else {
      let defaultQuery = `journalId:"${getId(periodical)}"`;
      if (type) {
        defaultQuery += ` AND @type:${escapeLucene(type)}`;
      }

      searchValue =
        typeof searchValue === 'string' ? searchValue.trim() : searchValue;

      let query;
      if (searchValue) {
        const indexes = ['name', 'alternateName', 'description', 'issueNumber'];

        query = [];
        const tokens = searchValue.split(/\s+/);
        indexes.forEach(index => {
          query.push(`${index}:${formatSearchTerm(searchValue)}`);
        });

        tokens.forEach(token => {
          query.push(
            `@id:${escapeLucene(
              createId('issue', token, getId(periodical))['@id']
            )}`
          );
          indexes.forEach(index => {
            query.push(`${index}:${formatSearchTerm(token)}`);
            query.push(`${index}:${escapeLucene(token)}*`);
          });
        });
        query = `(${defaultQuery}) AND (${query.join(' OR ')})`;
      } else {
        query = defaultQuery;
      }
      const qs = {
        query,
        limit: 10,
        includeDocs: true,
        sort: JSON.stringify('-datePublished')
      };

      url = `/issue?${querystring.stringify(qs)}`;
    }

    const r = xhr({
      url,
      method: 'GET',
      json: true
    });

    dispatch({
      type: SEARCH_SETTINGS_ISSUE_LIST,
      payload: r.xhr,
      meta: { reset }
    });

    return r
      .then(({ body }) => {
        dispatch({
          type: SEARCH_SETTINGS_ISSUE_LIST_SUCCESS,
          payload: body,
          meta: { append: !!nextUrl }
        });
      })
      .catch(err => {
        dispatch({
          type: SEARCH_SETTINGS_ISSUE_LIST_ERROR,
          error: err
        });
      });
  };
}

export const SEARCH_SETTINGS_RFA_LIST = 'SEARCH_SETTINGS_RFA_LIST';
export const SEARCH_SETTINGS_RFA_LIST_SUCCESS =
  'SEARCH_SETTINGS_RFA_LIST_SUCCESS';
export const SEARCH_SETTINGS_RFA_LIST_ERROR = 'SEARCH_SETTINGS_RFA_LIST_ERROR';

// Note: the actual articles are stored in the droplets
export function searchSettingsRfaList(
  periodical,
  {
    searchValue = '',
    nextUrl,
    reset,
    actionStatus = null // if specified we restrict search to that value
  } = {}
) {
  return (dispatch, getState) => {
    const { settingsRfaList } = getState();

    // cancel previous xhr (if any)
    if (settingsRfaList.xhr) {
      settingsRfaList.xhr.abort();
    }

    let url;
    if (nextUrl) {
      url = nextUrl;
    } else {
      let defaultQuery = `objectId:"${getId(
        periodical
      )}" AND @type:RequestArticleAction`;
      if (actionStatus) {
        defaultQuery += ` AND actionStatus:"${actionStatus}"`;
      }

      searchValue =
        typeof searchValue === 'string' ? searchValue.trim() : searchValue;

      let query;
      if (searchValue) {
        const indexes = ['name', 'description'];

        query = [];
        const tokens = searchValue.split(/\s+/);
        indexes.forEach(index => {
          query.push(`${index}:${formatSearchTerm(searchValue)}`);
        });

        tokens.forEach(token => {
          query.push(
            `@id:${escapeLucene(
              createId('action', token, getId(periodical))['@id']
            )}`
          );
          indexes.forEach(index => {
            query.push(`${index}:${formatSearchTerm(token)}`);
            query.push(`${index}:${escapeLucene(token)}*`);
          });
        });
        query = `(${defaultQuery}) AND (${query.join(' OR ')})`;
      } else {
        query = defaultQuery;
      }
      const qs = {
        query,
        limit: 10,
        includeDocs: true,
        sort: JSON.stringify('-startTime')
      };

      url = `/action?${querystring.stringify(qs)}`;
    }

    const r = xhr({
      url,
      method: 'GET',
      json: true
    });

    dispatch({
      type: SEARCH_SETTINGS_RFA_LIST,
      payload: r.xhr,
      meta: { reset }
    });

    return r
      .then(({ body }) => {
        dispatch({
          type: SEARCH_SETTINGS_RFA_LIST_SUCCESS,
          payload: body,
          meta: { append: !!nextUrl }
        });
      })
      .catch(err => {
        dispatch({
          type: SEARCH_SETTINGS_RFA_LIST_ERROR,
          error: err
        });
      });
  };
}
