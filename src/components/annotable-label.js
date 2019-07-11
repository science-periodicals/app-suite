import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import noop from 'lodash/noop';
import { Menu, MenuItem } from '@scipe/ui';
import {
  ERROR,
  WARNING,
  COMMENT,
  REVIEWER_COMMENT,
  ENDORSER_COMMENT,
  REVISION_REQUEST_COMMENT
} from '../constants';
import { getAnnotationLabel } from '../utils/annotations';

export default class AnnotableLabel extends Component {
  static propTypes = {
    annotations: PropTypes.arrayOf(PropTypes.object),
    onHoverChange: PropTypes.func.isRequired,
    focusAnnotation: PropTypes.func,
    isMobile: PropTypes.bool,
    openShell: PropTypes.func
  };

  static defaultProps = {
    focusAnnotations: noop,
    openShell: noop
  };

  openShell(annotationId) {
    const { isMobile } = this.props;
    if (isMobile) {
      this.props.openShell('annotation', annotationId);
    }
  }

  handleMouseOver = e => {
    this.props.onHoverChange(true);
  };

  handleMouseOut = e => {
    this.props.onHoverChange(false);
  };

  handleChange(i) {
    //e.preventDefault();
    //e.stopPropagation();
    let selection = window.getSelection();
    //let menuIndex = e.target.selectedIndex - 1;
    let menuIndex = i;
    if (!selection.isCollapsed) {
      selection.removeAllRanges();
    }
    this.openShell(this.props.annotations[menuIndex].id);
    this.props.focusAnnotation(this.props.annotations[menuIndex].id);
  }

  handleClick = e => {
    // e.preventDefault();
    e.stopPropagation();
  };

  render() {
    const { annotations, isMobile } = this.props;

    const hasFocusedAnnotation = annotations.some(ann => ann.focused);

    const options = annotations.map((a, i) => {
      return `${isMobile ? 'Open' : 'Focus'} ${getAnnotationLabel(a)}`;
    });

    const hasError = annotations.some(a => a.type === ERROR);
    const hasWarning = annotations.some(a => a.type === WARNING);
    const hasComment = annotations.some(a => a.type === COMMENT);
    const hasReviewerComment = annotations.some(
      a => a.type === REVIEWER_COMMENT
    );
    const hasEndorserComment = annotations.some(
      a => a.type === ENDORSER_COMMENT
    );
    const hasRevisionRequestComment = annotations.some(
      a => a.type === REVISION_REQUEST_COMMENT
    );

    return (
      <div
        className={classNames('annotable-label', {
          focused: hasFocusedAnnotation,
          'annotable-label--with-error': hasError,
          'annotable-label--with-warning': hasWarning,
          'annotable-label--with-comment': hasComment,
          'annotable-label--with-endorser-comment': hasEndorserComment,
          'annotable-label--with-reviewer-comment': hasReviewerComment,
          'annotable-label--with-revision-request-comment': hasRevisionRequestComment
        })}
        style={{ top: annotations[0].position.targetTop }}
        onClick={this.handleClick}
        onMouseOverCapture={this.handleMouseOver}
        onMouseOutCapture={this.handleMouseOut}
      >
        <div
          className={classNames('annotable-label__icon', {
            'annotable-label__multiple': annotations.length > 1
          })}
        >
          <Menu
            portal={true}
            portalProps={{ parentID: 'resource-view__portal-context' }}
            iconSize={16}
            align="right"
            icon={
              hasError
                ? 'statusError'
                : hasWarning
                ? 'statusWarning'
                : hasRevisionRequestComment
                ? 'feedbackWrite'
                : hasReviewerComment
                ? 'attachment'
                : hasEndorserComment
                ? 'thumbUpWarning'
                : hasComment
                ? 'comment'
                : 'statusPass'
            }
          >
            {options.map((option, i) => (
              <MenuItem
                icon={{
                  iconName: annotations[i].focused ? 'check' : 'none'
                }}
                key={i}
                disabled={annotations[i].focused}
                onClick={this.handleChange.bind(this, i)}
              >
                {option}
              </MenuItem>
            ))}
          </Menu>
        </div>
      </div>
    );
  }
}
