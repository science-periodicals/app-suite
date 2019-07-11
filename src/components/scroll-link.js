import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { withRouter, Link } from 'react-router-dom';
import {
  focusAnnotation,
  queueFocusActionAnnotation
} from '../actions/annotation-action-creators';
import { scrollToHash } from '../actions/ui-action-creators';
import {
  COMMENT,
  ENDORSER_COMMENT,
  REVIEWER_COMMENT,
  REVISION_REQUEST_COMMENT
} from '../constants';

class ScrollLink extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    to: PropTypes.shape({
      hash: PropTypes.string.isRequired // note if pathname and search are not provided they will be added from `location`
    }).isRequired,
    title: PropTypes.string,

    theme: PropTypes.oneOf(['link', 'button']),

    actionAnnotationId: PropTypes.string, // if specified the annotation associated with `actionAnnotationId` (if any) will be focused
    commentId: PropTypes.string, // the @id of the `resultComment` of a `CommentAction` if specified the annotation associated with `commentId` (if any) will be focused
    prettifyHash: PropTypes.bool, // if set to true we try to swap document worker id to nice counters one
    onClick: PropTypes.func,
    children: PropTypes.any,

    // router
    history: PropTypes.object,
    location: PropTypes.object,
    preventLinkInterceptor: PropTypes.bool,

    // redux
    annotationId: PropTypes.string,
    focusAnnotation: PropTypes.func.isRequired,
    queueFocusActionAnnotation: PropTypes.func.isRequired,
    scrollToHash: PropTypes.func.isRequired
  };

  static defaultProps = {
    theme: 'link',
    preventLinkInterceptor: false
  };

  constructor(props) {
    super(props);
    this.state = { hash: props.to.hash };
  }

  componentDidMount() {
    const {
      prettifyHash,
      to: { hash }
    } = this.props;

    if (prettifyHash) {
      this.setState({ hash: getPrettyHash(hash) });
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const {
      prettifyHash,
      to: { hash }
    } = this.props;

    if (
      prettifyHash &&
      (prettifyHash !== prevProps.prettifyHash || hash !== prevProps.to.hash)
    ) {
      this.setState({ hash: getPrettyHash(hash) });
    }
  }

  handleClick = e => {
    const {
      to,
      to: { hash },
      onClick,
      focusAnnotation,
      queueFocusActionAnnotation,
      actionAnnotationId,
      annotationId,
      scrollToHash,
      prettifyHash,
      history
    } = this.props;

    if (hash) {
      scrollToHash(hash, { queue: true });
    }

    if (annotationId) {
      e.stopPropagation();
      focusAnnotation(annotationId);
    } else if (actionAnnotationId) {
      queueFocusActionAnnotation(actionAnnotationId);
    }

    if (prettifyHash) {
      const prettyHash = getPrettyHash(hash);
      if (prettyHash !== this.state.hash) {
        e.preventDefault();
        history.push(Object.assign({}, to, { hash: prettyHash }));
        this.setState({ hash: prettyHash });
      }
    }

    if (onClick) {
      onClick(e);
    }
  };

  render() {
    const {
      id,
      className,
      to,
      title,
      theme,
      children,
      location,
      preventLinkInterceptor
    } = this.props;

    const { hash } = this.state;

    return (
      <Link
        id={id}
        className={classNames('scroll-link', className, {
          'scroll-link--button': theme === 'button'
        })}
        to={Object.assign(
          {
            pathname: location.pathname,
            search: location.search
          },
          to,
          { hash }
        )}
        title={title}
        onClick={this.handleClick}
        data-prevent-link-interceptor={preventLinkInterceptor.toString()}
      >
        {children}
      </Link>
    );
  }
}

function makeSelector() {
  return createSelector(
    (state, props) => props.commentId,
    (state, props) => props.actionAnnotationId,
    state => state.annotations.annotations,
    (commentId, actionAnnotationId, annotations) => {
      const annotation = annotations.find(
        annotation =>
          (annotation.object === commentId &&
            (annotation.type === COMMENT ||
              annotation.type === ENDORSER_COMMENT)) ||
          (annotation.object === actionAnnotationId &&
            (annotation.type === REVIEWER_COMMENT ||
              annotation.type === REVISION_REQUEST_COMMENT))
      );
      return { annotationId: annotation && annotation.id };
    }
  );
}

function makeMapStateToProps() {
  const s = makeSelector();
  return (state, props) => {
    return s(state, props);
  };
}

export default withRouter(
  connect(
    makeMapStateToProps,
    { focusAnnotation, queueFocusActionAnnotation, scrollToHash }
  )(ScrollLink)
);

function getPrettyHash(hash = '') {
  const $node = document.getElementById(hash.substring(1));

  // We swap the hash by an ?id query string parameter
  // we need to crawl up to the .annotable, then grab the permalink__counter id and swap to that
  if ($node) {
    let $annotable = $node;
    while (
      $annotable &&
      (!$annotable.classList || !$annotable.classList.contains('annotable'))
    ) {
      $annotable = $annotable.parentElement;
    }

    if ($annotable) {
      const $counter = $annotable.querySelector('.permalink__counter[id]');

      if ($counter) {
        return `#${$counter.id}`;
      }
    }
  }

  return hash;
}
