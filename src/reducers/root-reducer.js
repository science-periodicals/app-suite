import { combineReducers } from 'redux';
import * as userReducers from './user-reducers';
import * as graphReducers from './graph-reducers';
import * as settingsReducers from './settings-reducers';
import * as journalReducers from './journal-reducers';
import * as articleReducers from './article-reducers';
import * as rfaReducers from './rfa-reducers';
import * as organizationReducers from './organization-reducers';
import * as inviteReducers from './invite-reducers';
import * as applyReducers from './apply-reducers';
import * as feedReducers from './feed-reducers';
import * as dropletReducers from './droplet-reducers';
import * as logReducers from './log-reducers';
import * as pouchReducers from './pouch-reducers';
import * as encodingReducers from './encoding-reducers';
import * as annotationReducers from './annotation-reducers';
import * as emailReducers from './email-reducers';
import * as uiReducers from './ui-reducers';
import * as serviceReducers from './service-reducers';
import * as typeReducers from './type-reducers';
import * as workflowReducers from './workflow-reducers';
import * as issueReducers from './issue-reducers';
import * as commentReducers from './comment-reducers';
import * as checkReducers from './check-reducers';

export default combineReducers(
  Object.assign(
    userReducers,
    settingsReducers,
    graphReducers,
    journalReducers,
    articleReducers,
    rfaReducers,
    organizationReducers,
    inviteReducers,
    commentReducers,
    applyReducers,
    feedReducers,
    dropletReducers,
    pouchReducers,
    uiReducers,
    encodingReducers,
    annotationReducers,
    emailReducers,
    serviceReducers,
    typeReducers,
    workflowReducers,
    logReducers,
    issueReducers,
    checkReducers
  )
);
