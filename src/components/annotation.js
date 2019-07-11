import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import noop from 'lodash/noop';
import {
  CSS_HEADER_HEIGHT,
  BemTags,
  AppLayoutVirtualRightMarginContent
} from '@scipe/ui';
import {
  COMMENT,
  ENDORSER_COMMENT,
  REVIEWER_COMMENT,
  REVISION_REQUEST_COMMENT
} from '../constants';
import Info from './info';
import CommentThread from './comment-thread';
import Counter from '../utils/counter';
import { getDomNodeId } from '../utils/annotations';

export default class Annotation extends PureComponent {
  static propTypes = {
    graphId: PropTypes.string.isRequired,
    matchingLevel: PropTypes.number,
    annotation: PropTypes.object.isRequired,
    counter: PropTypes.instanceOf(Counter),
    positionAnnotations: PropTypes.func,
    positionAnnotationsButDontLayout: PropTypes.func,
    focusAnnotation: PropTypes.func,
    isMobile: PropTypes.bool,
    shellified: PropTypes.bool
  };

  static defaultProps = {
    counter: new Counter(),
    positionAnnotations: noop,
    positionAnnotationsButDontLayout: noop,
    focusAnnotation: noop,
    shellified: false,
    isMobile: false
  };

  componentDidUpdate() {
    this.handleReposition();
  }

  componentDidCatch(error, info) {
    console.error(error, info);
  }

  handleReposition = () => {
    const {
      annotation,
      positionAnnotations,
      positionAnnotationsButDontLayout
    } = this.props;
    if (this.$root) {
      const height = this.$root.getBoundingClientRect().height;

      if (annotation.position && annotation.position.height !== height) {
        const { position } = annotation;
        const nextPositionMap = {
          [annotation.id]: Object.assign({}, this.props.annotation.position, {
            targetAbsBottom: position.targetAbsTop + height,
            absBottom: position.absTop + height,
            height: height
          })
        };

        if (annotation.position.height < height) {
          // the annotation grew (new one is taller)
          positionAnnotations(nextPositionMap, { immediate: true });
        } else {
          // the annotation shrinked (new one is shorter)
          positionAnnotationsButDontLayout(nextPositionMap, {
            immediate: true
          });
        }
      }
    }
  };

  handleClick = e => {
    const { annotation, focusAnnotation } = this.props;

    // Focus annotation
    e.stopPropagation();

    if (
      e.target &&
      !(
        e.target.tagName === 'A' ||
        e.target.tagName === 'BUTTON' ||
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.tagName === 'SELECT' ||
        isInMenu(e.target)
      )
    ) {
      if (!annotation.focused) {
        e.preventDefault(); // !! only call prevent default if it is _not_ an input: preventDefault will cause issues with checkbox (see react doc on checkbox)

        // we need to assess if we scroll or not
        const id = getDomNodeId(annotation.selector);
        const $el = document.getElementById(id);
        if ($el) {
          const rect = $el.getBoundingClientRect();

          const isIntoView =
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <=
              (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <=
              (window.innerWidth || document.documentElement.clientWidth);

          if (!isIntoView) {
            window.scroll({
              top: window.pageYOffset + rect.top - CSS_HEADER_HEIGHT - 40,
              behavior: 'smooth'
            });
          }
        }
        focusAnnotation(annotation.id);
      }
    }
  };

  handleMouseEnter = e => {
    //prevent to re-trigger annotation creation due to existing selection
    let selection = window.getSelection();
    selection.removeAllRanges();
  };

  render() {
    const {
      graphId,
      annotation,
      matchingLevel,
      counter,
      isMobile,
      shellified
    } = this.props;

    let style;
    if (!isMobile && !shellified) {
      if (annotation.position) {
        style = { top: annotation.position.top + 10 }; // 10 is a little tweak to align the header nicely
      } else {
        style = { left: '-99999px' }; // render out of the viewport so that we can measure
      }
    } else {
      style = {};
    }

    let body;
    switch (annotation.type) {
      case ENDORSER_COMMENT:
      case REVIEWER_COMMENT:
      case REVISION_REQUEST_COMMENT:
      case COMMENT:
        body = (
          <CommentThread
            graphId={graphId}
            annotation={annotation}
            onResize={this.handleReposition}
            counter={counter}
            matchingLevel={matchingLevel}
          />
        );
        break;

      default:
        body = (
          <Info graphId={graphId} annotation={annotation} counter={counter} />
        );
        break;
    }

    const bem = BemTags();

    // !! For now, an id MUST be present as we will need to getElementById in <Annotable />
    // TODO use ref instead

    return (
      <AppLayoutVirtualRightMarginContent
        virtualRight={!isMobile && !shellified}
        ref={$el => {
          this.$root = $el;
        }}
        id={annotation.id}
        className={bem`annotation --${
          annotation.focused ? 'focused' : 'unfocused'
        }`}
        style={style}
        onClick={this.handleClick}
        onMouseEnter={this.handleMouseEnter}
      >
        <div className={bem`__card`} data-testid={annotation.type}>
          <div className={bem`__body`}>{body}</div>
        </div>
      </AppLayoutVirtualRightMarginContent>
    );
  }
}

function isInMenu($el) {
  while ($el && $el !== document.documentElement) {
    if ($el.classList) {
      if ($el.classList.contains('menu')) {
        return true;
      }
      if ($el.classList.contains('annotation')) {
        return false;
      }
    }
    $el = $el.parentElement;
  }

  return false;
}
