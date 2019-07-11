export const RE_TWITTER = /^http(s)?:\/\/(www\.)?twitter.com/i;
export const RE_FACEBOOK = /^http(s)?:\/\/(www\.)?facebook.com/i;

// actions
export const ERROR_EMAIL_MESSAGE_DESCRIPTION =
  'ERROR_EMAIL_MESSAGE_DESCRIPTION';
export const ERROR_EMAIL_MESSAGE_TEXT = 'ERROR_EMAIL_MESSAGE_TEXT';

export const ERROR_FILE_UPLOAD_NEEDED = 'ERROR_FILE_UPLOAD_NEEDED';
export const ERROR_SLUG = 'ERROR_SLUG';
export const ERROR_ASSESS_ACTION_RESULT = 'ERROR_ASSESS_ACTION_RESULT';
export const ERROR_REVIEW_BODY = 'ERROR_REVIEW_BODY';
export const ERROR_REVIEW_RATING = 'ERROR_REVIEW_RATING';
export const ERROR_ANSWER = 'ERROR_ANSWER';
export const ERROR_NEED_ASSIGNMENT = 'ERROR_NEED_ASSIGNMENT';
export const ERROR_NEED_ASSIGNEE = 'ERROR_NEED_ASSIGNEE';
export const ERROR_NEED_ENDORSER_ASSIGNMENT = 'ERROR_NEED_ENDORSER_ASSIGNMENT';
export const ERROR_NEED_ENDORSER = 'ERROR_NEED_ENDORSER';
export const ERROR_MISSING_VALUE = 'ERROR_MISSING_VALUE';
export const ERROR_NEED_AUTHOR_RESPONSE = 'ERROR_NEED_AUTHOR_RESPONSE';
export const ERROR_NEED_PRODUCTION_CONTENT = 'ERROR_NEED_PRODUCTION_CONTENT';
export const ERROR_NEED_PRODUCTION_CONTENT_OR_SERVICE =
  'ERROR_NEED_PRODUCTION_CONTENT_OR_SERVICE';
export const ERROR_NEED_SUBMISSION_CONTENT = 'ERROR_NEED_SUBMISSION_CONTENT';
export const ERROR_TYPESETTER_NEED_AUTHOR_REVISION =
  'ERROR_TYPESETTER_NEED_AUTHOR_REVISION';
export const ERROR_TYPESETTER_MUST_REVISE_FILE_BASED_ON_NEW_AUTHOR_CONTENT =
  'ERROR_TYPESETTER_MUST_REVISE_FILE_BASED_ON_NEW_AUTHOR_CONTENT';
export const ERROR_NEED_CONTRIBUTOR_IDENTITY =
  'ERROR_NEED_CONTRIBUTOR_IDENTITY';
export const ERROR_NEED_COMPLETED_CHECK_ACTION =
  'ERROR_NEED_COMPLETED_CHECK_ACTION';

// resources
export const ERROR_ALTERNATE_NAME = 'ERROR_ALTERNATE_NAME';
export const ERROR_LICENSE = 'ERROR_LICENSE';
export const ERROR_PROGRAMMING_LANGUAGE = 'ERROR_PROGRAMMING_LANGUAGE';

export const WARNING_SLUG = 'WARNING_SLUG';
export const WARNING_NAME = 'WARNING_NAME';
export const WARNING_DESCRIPTION = 'WARNING_DESCRIPTION';
export const WARNING_CAPTION = 'WARNING_CAPTION';
export const WARNING_TRANSCRIPT = 'WARNING_TRANSCRIPT';
export const WARNING_LICENSE = 'WARNING_LICENSE';
export const WARNING_KEYWORDS = 'WARNING_KEYWORDS';
export const WARNING_ABOUT = 'WARNING_ABOUT';
export const WARNING_IS_BASED_ON = 'WARNING_IS_BASED_ON';
export const WARNING_CAN_REVISE_FILE = 'WARNING_CAN_REVISE_FILE';
export const WARNING_REVISION_UPLOAD_NEEDED = 'WARNING_REVISION_UPLOAD_NEEDED';
export const WARNING_ACTIVATE_OFFLINE_COMMENT_ACTION =
  'WARNING_ACTIVATE_OFFLINE_COMMENT_ACTION';

export const WARNING_SERVICE_AVAILABLE = 'WARNING_SERVICE_AVAILABLE';

// Annotation types
// value lower case for CSS (sometimes we use types for class names)
export const ERROR = 'error';
export const WARNING = 'warning';
export const COMMENT = 'comment';
export const REVISION_REQUEST_COMMENT = 'revision-request-comment'; // Note we don't have AUTHOR_RESPONSE_COMMENT as they are _only_ displayed as responsed to REVISION_REQUEST_COMMENT
export const REVIEWER_COMMENT = 'reviewer-comment';
export const ENDORSER_COMMENT = 'endorser-comment';
export const REFERENCE = 'reference';
export const LINK = 'link';

export const ROLE_NAMES = ['editor', 'author', 'reviewer', 'producer'];

export const PREVIOUS_FILES_COLOR = '#ddc3e8';

// types for the dashboard feed
// !! Note that those are also used for the `outscope` parameter in the filter replication (see `startRemoteChanges`)
export const FEED_ITEM_TYPES = [
  //  'CreateOrganizationAction', TODO
  //   'CreatePeriodicalAction', TODO
  //  'CreatePublicationTypeAction', TODO
  //  'CreatePublicationIssueAction', TODO
  //   'CreateSpecialPublicationAction', TODO
  //   'CreateWorkflowSpecificationAction', TODO
  'CreateGraphAction',
  'CreateReleaseAction',
  'PublishAction',
  'InviteAction',
  'JoinAction',
  'LeaveAction',
  'AuthorizeContributorAction',
  'DeauthorizeContributorAction',

  'CheckAction',
  'AssessAction',
  'ReviewAction',
  'DeclareAction',
  'PayAction',
  'ScheduleAction',
  'AssignAction',
  'UnassignAction'
  // 'UpdateAction', // TODO restrict to objectType: @graph so that we only have worker updates ? or reduce API noise
];

export const RANGE_FACETS = new Set([
  'expectedDatePublishedOrRejected',
  'datePublishedOrRejected',
  'datePublished'
]);

export const DASHBOARD_FACETS = [
  // counts facets
  'journalId',
  // 'status',
  'tagId',
  'additionalTypeId',
  'uncompletedActionType',
  // 'completedActionType',

  // ranges facets
  'expectedDatePublishedOrRejected',
  'datePublishedOrRejected'
];

export const SIFTER_FACETS = [
  'additionalTypeId',
  'entityAboutId',
  'entityEncodingType'
];

export const ISSUE_FACETS = [
  // counts
  '@type',
  // ranges
  'datePublished'
];
export const EXPLORER_ARTICLES_FACETS = [
  'entityAboutId',
  'entityEncodingType',
  'entityDetailedDescriptionType'
];
export const EXPLORER_RFAS_FACETS = ['aboutId'];
export const EXPLORER_JOURNALS_FACETS = ['aboutId'];

export const DASHBOARD_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://sci.pe'
    : 'https://nightly.sci.pe';

export const SCIPE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://sci.pe'
    : 'https://nightly.sci.pe';

export const PRINT_RESOLUTION = 300;
