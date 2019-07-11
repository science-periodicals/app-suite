import React, { Component } from 'react';
import PropTypes from 'prop-types';
import uniq from 'lodash/uniq';

const FOCUS_LINE_WIDTH = 24; //!! keep in sync with highlights.css

export default class Highlight extends Component {
  static propTypes = {
    isBeingEdited: PropTypes.bool.isRequired,
    highlights: PropTypes.arrayOf(
      PropTypes.shape({
        range: PropTypes.object.isRequired,
        rangeType: PropTypes.oneOf(['element', 'section', 'selection'])
          .isRequired,
        groupId: PropTypes.string.isRequired,
        edited: PropTypes.bool.isRequied,
        hovered: PropTypes.bool.isRequired,
        focused: PropTypes.bool.isRequired
      })
    ).isRequired
  };

  componentDidUpdate() {
    const focused = this.props.highlights.filter(h => {
      return h.focused;
    });
    if (!focused.length || !focused[0].range) return;

    let $ann = focused[0].range.startContainer;
    if ($ann.nodeType === Node.TEXT_NODE) {
      $ann = $ann.parentElement; //get closest Element
    }

    let $ctx = $ann;
    while ($ctx) {
      if (window.getComputedStyle($ctx).overflowY === 'auto') break;
      $ctx = $ctx.parentElement;
    }

    const delta =
      $ann.getBoundingClientRect().top - $ctx.getBoundingClientRect().top - 40; // TODO defined 40 (marginTop ?)
    const height =
      $ctx.getBoundingClientRect().height - $ctx.getBoundingClientRect().top;

    if (delta < 0 || delta > height) {
      $ctx.scrollTop += delta;
    }
  }

  render() {
    const { isBeingEdited, highlights } = this.props;

    let rects = [];
    let focusLines = [];
    highlights.forEach(h => {
      let highlights = _getHighlights(h);

      //highlight areas
      if (highlights.rangeType !== 'section') {
        highlights.rects.forEach((r, i) => {
          rects.push(
            <div
              key={h.groupId + '-s' + i}
              className={
                'highlight-rect highlight-rect-' +
                highlights.rangeType +
                (h.hovered ? ' hovered' : '') +
                (h.focused ? ' focused' : '')
              }
              style={{
                top: r.top,
                left: r.left,
                width: r.width,
                height: r.height
              }}
            >
              {highlights.rangeType === 'selection' && (
                <div
                  className="highlight-rect-selection_underline"
                  key={h.groupId + '-s_ul'}
                />
              )}
            </div>
          );
        });
      } else {
        /* rangeType == section */
        rects.push(
          <div
            key={h.groupId + '-b'}
            className={
              'highlight-rect' +
              (' highlight-rect-' + highlights.rangeType) +
              (isBeingEdited ? ' edited' : '') +
              (h.hovered ? ' hovered' : '') +
              (h.focused ? ' focused' : '')
            }
            style={{
              top: highlights.bounding.top,
              left: highlights.bounding.left,
              width: highlights.bounding.width + FOCUS_LINE_WIDTH,
              height: highlights.bounding.height
            }}
          >
            <div className="fill" key={h.groupId + '-b_fill'} />
          </div>
        );
      }

      //focus line: right border + connector to the annotation (if any)
      if (!isBeingEdited) {
        if (highlights.rangeType !== 'element') {
          const styleV = {
            top: highlights.bounding.top,
            right: -1 * FOCUS_LINE_WIDTH,
            height: highlights.bounding.height
          };
          const styleH = {
            top: highlights.bounding.top
          };

          focusLines.push(
            <div
              className={
                'focus-line focus-line-v' +
                (h.focused ? ' focused' : '') +
                (h.hovered ? ' hovered' : '') +
                (styleV.height <= 24 ? ' single-line' : '') +
                ' ' +
                highlights.rangeType
              }
              key={h.groupId + '-v'}
              style={styleV}
            >
              <div className="fill" key={h.groupId + '-v_fill'} />
            </div>
          );
          focusLines.push(
            <div
              className={
                'focus-line focus-line-h' +
                (h.focused ? ' focused' : '') +
                (h.hovered ? ' hovered' : '') +
                ' ' +
                highlights.rangeType
              }
              key={h.groupId + '-h'}
              style={styleH}
            >
              <div className="fill" key={h.groupId + '-h_fill'} />
            </div>
          );
        }
      }
    });

    return (
      <div className="highlight">
        {rects}
        {focusLines}
      </div>
    );
  }
}

/**
 * rect2 is contained by rect1
 */
function _contains(rect1, rect2) {
  return (
    rect2.left >= rect1.left &&
    rect2.top >= rect1.top &&
    rect2.right <= rect1.right &&
    rect2.bottom <= rect1.bottom
  );
}

// vaguely inspired by https://gerrit.wikimedia.org/r/#/c/139805/
function _getHighlights(highlight) {
  const range = highlight.range;
  let clientRects = _getClientRects(range);

  let $scope = range.commonAncestorContainer;
  if ($scope.nodeType === Node.TEXT_NODE) {
    $scope = range.commonAncestorContainer.parentElement; //get closest Element
  }

  while (!$scope.classList.contains('annotable')) {
    $scope = $scope.parentElement;
    if ($scope.tagName === 'BODY') {
      //should never happen
      return;
    }
  }

  const selectBarCs = window.getComputedStyle($scope.firstElementChild);

  const scopeRect = $scope.getBoundingClientRect();

  const leftMost = Math.floor(scopeRect.left + parseInt(selectBarCs.left, 10));
  const rightMost = scopeRect.right;
  const topMost = Math.floor(scopeRect.top + parseInt(selectBarCs.top, 10));
  const bottomMost = Math.ceil(
    scopeRect.bottom - parseInt(selectBarCs.bottom, 10)
  );

  // Elements with a width/height of 0 return a clientRect with a width/height of 1
  // As elements with an actual width/height of 1 aren't that useful anyway, just
  // throw away anything that is <=1
  //we also throw away everything on the left margin (little selector helper)
  //and the highlights (after rightMost)
  clientRects = clientRects.filter(rect => {
    return (
      rect.width > 1 &&
      rect.height > 1 &&
      Math.floor(rect.left) >= leftMost &&
      Math.floor(rect.right) <= rightMost
    );
  });

  const scrollTop =
    window.pageYOffset ||
    document.documentElement.scrollTop ||
    document.body.scrollTop;
  const scrollLeft =
    window.pageXOffset ||
    document.documentElement.scrollLeft ||
    document.body.scrollLeft;

  const offsetTop = scopeRect.top + scrollTop;
  const offsetLeft = scopeRect.left + scrollLeft;

  let top;
  let bottom;

  //get bounding rect;
  if (highlight.rangeType == 'section') {
    /* edge does not calc getClientRects and getBoundingClientRect in the same way - this check is to force measuring of the container's top and bottom when it's a section level highlight */
    top = topMost;
    bottom = bottomMost;
  } else {
    top = Math.max(
      topMost,
      Math.min.apply(
        Math,
        clientRects.map(function(x) {
          return x.top;
        })
      )
    );
    bottom = Math.min(
      bottomMost,
      Math.max.apply(
        Math,
        clientRects.map(function(x) {
          return x.bottom;
        })
      )
    );
  }
  const left = leftMost;
  const right = rightMost;

  const boundingRect = {
    top: top + scrollTop - offsetTop,
    left: left + scrollLeft - offsetLeft,
    right: right + scrollLeft - offsetLeft,
    bottom: bottom,
    width: right - left,
    height: bottom - top
  };

  // get selection and element highlights (`rects`)
  let rects = [];

  if (highlight.rangeType !== 'section') {
    // merge rectangles with the same top (Chrome generates too many rectangles)
    let merged = [];

    const tops = uniq(clientRects.map(x => x.top));
    tops.forEach(t => {
      const trects = clientRects.filter(x => x.top === t);
      const top = t;
      const left = Math.min.apply(
        Math,
        trects.map(function(x) {
          return x.left;
        })
      );
      const right = Math.max.apply(
        Math,
        trects.map(function(x) {
          return x.right;
        })
      );
      const bottom = Math.max.apply(
        Math,
        trects.map(function(x) {
          return x.bottom;
        })
      );

      merged.push({
        top: top + scrollTop - offsetTop,
        left: left + scrollLeft - offsetLeft,
        right: right + scrollLeft - offsetLeft,
        bottom: bottom,
        width: right - left,
        height: bottom - top
      });
    });

    // removed russian doll effect
    for (let i = 0; i < merged.length; i++) {
      let contained = false;
      for (let j = 0, jl = rects.length; j < jl; j++) {
        // This rect is contained by an existing rect, discard
        if (_contains(rects[j], merged[i])) {
          contained = true;
          break;
        }
        // An existing rect is contained by this rect, discard the existing rect
        if (_contains(merged[i], rects[j])) {
          rects.splice(j, 1);
          j--;
          jl--;
        }
      }
      if (!contained) {
        rects.push(merged[i]);
      }
    }
  }

  return {
    rangeType: highlight.rangeType,
    bounding: boundingRect,
    rects: rects
  };
}

//see https://github.com/edg2s/rangefix
function _getClientRects(range) {
  // Chrome gets the end container rects wrong when spanning nodes so
  // we need to traverse up the tree from the endContainer until we
  // reach the common ancestor, then we can add on from start to where
  // we got up to
  // https://code.google.com/p/chromium/issues/detail?id=324437
  let rects = [],
    endContainer = range.endContainer,
    endOffset = range.endOffset,
    partialRange = document.createRange();

  while (endContainer !== range.commonAncestorContainer) {
    partialRange.setStart(endContainer, 0);
    partialRange.setEnd(endContainer, endOffset);

    Array.prototype.push.apply(rects, partialRange.getClientRects());

    endOffset = Array.prototype.indexOf.call(
      endContainer.parentNode.childNodes,
      endContainer
    );
    endContainer = endContainer.parentNode;
  }

  // Once we've reached the common ancestor, add on the range from the
  // original start position to where we ended up.
  partialRange = range.cloneRange();
  partialRange.setEnd(endContainer, endOffset);
  Array.prototype.push.apply(rects, partialRange.getClientRects());

  return rects;
}
