import React from 'react';
import PropTypes from 'prop-types';
import { createSelector } from 'reselect';
import { connect } from 'react-redux';
import Iconoclass from '@scipe/iconoclass';
import { PaperCheckbox } from '@scipe/ui';
import {
  toggleDisplayedAnnotationType,
  focusAnnotation
} from '../../actions/annotation-action-creators';
import {
  ERROR,
  WARNING,
  COMMENT,
  REVIEWER_COMMENT,
  ENDORSER_COMMENT,
  REVISION_REQUEST_COMMENT
} from '../../constants';
import { StyleSection, StyleList, StyleListRow } from './publisher-sidebar';

// TODO? rename PublisherSidebarAnnotations
class PublisherSidebarViews extends React.Component {
  static propTypes = {
    user: PropTypes.object.isRequired,

    graphId: PropTypes.string.isRequired,
    journalId: PropTypes.string.isRequired,
    stageId: PropTypes.string,

    disabled: PropTypes.bool.isRequired,
    readOnly: PropTypes.bool.isRequired,

    history: PropTypes.object.isRequired,
    location: PropTypes.object.isRequired,

    // redux
    displayedTypes: PropTypes.shape({
      [ERROR]: PropTypes.bool,
      [WARNING]: PropTypes.bool,
      [COMMENT]: PropTypes.bool,
      [REVIEWER_COMMENT]: PropTypes.bool,
      [ENDORSER_COMMENT]: PropTypes.bool,
      [REVISION_REQUEST_COMMENT]: PropTypes.bool
    }).isRequired,
    counts: PropTypes.shape({
      [ERROR]: PropTypes.number,
      [WARNING]: PropTypes.number,
      [COMMENT]: PropTypes.number,
      [REVIEWER_COMMENT]: PropTypes.number,
      [ENDORSER_COMMENT]: PropTypes.number,
      [REVISION_REQUEST_COMMENT]: PropTypes.number
    }).isRequired,
    prevNextLinksByType: PropTypes.shape({
      [ERROR]: PropTypes.shape({
        next: PropTypes.string,
        prev: PropTypes.string
      }),
      [WARNING]: PropTypes.shape({
        next: PropTypes.string,
        prev: PropTypes.string
      }),
      [COMMENT]: PropTypes.shape({
        next: PropTypes.string,
        prev: PropTypes.string
      }),
      [REVIEWER_COMMENT]: PropTypes.shape({
        next: PropTypes.string,
        prev: PropTypes.string
      }),
      [ENDORSER_COMMENT]: PropTypes.shape({
        next: PropTypes.string,
        prev: PropTypes.string
      }),
      [REVISION_REQUEST_COMMENT]: PropTypes.shape({
        next: PropTypes.string,
        prev: PropTypes.string
      })
    }).isRequired,
    toggleDisplayedAnnotationType: PropTypes.func.isRequired,
    focusAnnotation: PropTypes.func.isRequired
  };

  static defaultProps = {
    displayedTypes: {}
  };

  handleToggleCheckbox(type, e) {
    e.preventDefault();
    const { displayedTypes, toggleDisplayedAnnotationType } = this.props;
    toggleDisplayedAnnotationType(type, !displayedTypes[type]);
  }

  handleNav(annotationId, e) {
    e.preventDefault();
    const { focusAnnotation, history, location } = this.props;
    focusAnnotation(annotationId, { navigate: true, history, location });
  }

  renderNav(type, iconName) {
    const { prevNextLinksByType, counts, displayedTypes } = this.props;
    const { prev, next } = prevNextLinksByType[type];

    const isDisplayed = displayedTypes[type];

    return (
      <div
        className={`publisher-sidebar-views__row-nav ${'publisher-sidebar-views__row-nav--' +
          type}`}
      >
        <div className="publisher-sidebar-views__row-nav__bg" />
        <div className="publisher-sidebar-views__row-nav__status-color" />
        <Iconoclass
          iconName="arrowOpenLeft"
          behavior="button"
          size={'20px'}
          disabled={!prev || !isDisplayed}
          onClick={this.handleNav.bind(this, prev)}
        />
        <Iconoclass iconName={(counts[type] || 0).toString()} size={'16px'} />
        <Iconoclass
          iconName="arrowOpenRight"
          behavior="button"
          size={'20px'}
          disabled={!next || !isDisplayed}
          onClick={this.handleNav.bind(this, next)}
        />
      </div>
    );
  }

  render() {
    const { displayedTypes, counts } = this.props;

    if (!Object.values(counts).some(count => count > 0)) {
      return (
        <StyleSection className="publisher-sidebar-views">
          <p className="publisher-sidebar-views__empty">No annotations</p>
        </StyleSection>
      );
    }

    return (
      <StyleSection className="publisher-sidebar-views">
        <StyleList>
          {counts[ERROR] > 0 && (
            <StyleListRow>
              <PaperCheckbox
                checked={displayedTypes[ERROR]}
                onClick={this.handleToggleCheckbox.bind(this, ERROR)}
                id={ERROR}
                theme="light"
              >
                <Iconoclass
                  iconName="warningTriangle"
                  className="publisher-sidebar-views__status-icon"
                  size="20px"
                />{' '}
                Required actions
              </PaperCheckbox>

              {this.renderNav(ERROR)}
            </StyleListRow>
          )}

          {counts[WARNING] > 0 && (
            <StyleListRow>
              <PaperCheckbox
                checked={displayedTypes[WARNING]}
                onClick={this.handleToggleCheckbox.bind(this, WARNING)}
                id={WARNING}
                theme="light"
              >
                <Iconoclass
                  iconName="statusWarning"
                  className="publisher-sidebar-views__status-icon"
                  size="22px"
                />{' '}
                Potential actions
              </PaperCheckbox>
              {this.renderNav(WARNING)}
            </StyleListRow>
          )}

          {counts[COMMENT] > 0 && (
            <StyleListRow>
              <PaperCheckbox
                checked={displayedTypes[COMMENT]}
                onClick={this.handleToggleCheckbox.bind(this, COMMENT)}
                id={COMMENT}
                theme="light"
              >
                <Iconoclass
                  iconName="comment"
                  size="20px"
                  className="publisher-sidebar-views__status-icon"
                />{' '}
                Comments
              </PaperCheckbox>
              {this.renderNav(COMMENT)}
            </StyleListRow>
          )}

          {counts[ENDORSER_COMMENT] > 0 && (
            <StyleListRow>
              <PaperCheckbox
                checked={displayedTypes[ENDORSER_COMMENT]}
                onClick={this.handleToggleCheckbox.bind(this, ENDORSER_COMMENT)}
                id={ENDORSER_COMMENT}
                theme="light"
              >
                <Iconoclass
                  iconName="thumbUpWarning"
                  size="20px"
                  className="publisher-sidebar-views__status-icon"
                />{' '}
                Endorser comments
              </PaperCheckbox>
              {this.renderNav(ENDORSER_COMMENT)}
            </StyleListRow>
          )}

          {counts[REVIEWER_COMMENT] > 0 && (
            <StyleListRow>
              <PaperCheckbox
                checked={displayedTypes[REVIEWER_COMMENT]}
                onClick={this.handleToggleCheckbox.bind(this, REVIEWER_COMMENT)}
                id={REVIEWER_COMMENT}
                theme="light"
              >
                <Iconoclass
                  iconName="attachment"
                  size="20px"
                  className="publisher-sidebar-views__status-icon"
                />{' '}
                Reviewer notes
              </PaperCheckbox>
              {this.renderNav(REVIEWER_COMMENT)}
            </StyleListRow>
          )}

          {counts[REVISION_REQUEST_COMMENT] > 0 && (
            <StyleListRow>
              <PaperCheckbox
                checked={displayedTypes[REVISION_REQUEST_COMMENT]}
                onClick={this.handleToggleCheckbox.bind(
                  this,
                  REVISION_REQUEST_COMMENT
                )}
                id={REVISION_REQUEST_COMMENT}
                theme="light"
              >
                <Iconoclass
                  iconName="feedbackWrite"
                  size="20px"
                  className="publisher-sidebar-views__status-icon"
                />{' '}
                Revision requests
              </PaperCheckbox>
              {this.renderNav(REVISION_REQUEST_COMMENT)}
            </StyleListRow>
          )}
        </StyleList>
      </StyleSection>
    );
  }
}

export default connect(
  state =>
    createSelector(
      state => state.annotations.displayedTypes,
      state => state.annotations.annotations,
      (displayedTypes, annotations) => {
        return {
          displayedTypes,
          counts: annotations.reduce((counts, annotation) => {
            if (annotation.position) {
              if (annotation.type in counts) {
                counts[annotation.type]++;
              } else {
                counts[annotation.type] = 1;
              }
            }
            return counts;
          }, {}),

          prevNextLinksByType: [
            ERROR,
            WARNING,
            COMMENT,
            REVIEWER_COMMENT,
            ENDORSER_COMMENT,
            REVISION_REQUEST_COMMENT
          ].reduce((links, type) => {
            links[type] = {};
            const typedAnnotations = annotations.filter(
              a => a.type === type && a.position
            );
            if (!typedAnnotations.length) {
              return links;
            }
            const focusedIndex = typedAnnotations.findIndex(
              a => a.type === type && a.focused
            );

            if (focusedIndex >= 0) {
              if (typedAnnotations.length === 1) {
                links[type].prev = typedAnnotations[0].id;
                links[type].next = typedAnnotations[0].id;
              } else {
                if (focusedIndex > 0) {
                  links[type].prev = typedAnnotations[focusedIndex - 1].id;
                }
                if (typedAnnotations[focusedIndex + 1]) {
                  links[type].next = typedAnnotations[focusedIndex + 1].id;
                }
              }
            } else {
              links[type].next = typedAnnotations[0].id;
            }
            return links;
          }, {})
        };
      }
    ),
  {
    toggleDisplayedAnnotationType,
    focusAnnotation
  }
)(PublisherSidebarViews);
