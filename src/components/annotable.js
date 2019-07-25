import React from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import { Link, BrowserRouter } from 'react-router-dom';
import asyncEach from 'async/each';
import cloneDeep from 'lodash/cloneDeep';
import debounce from 'lodash/debounce';
import isEqual from 'lodash/isEqual';
import { connect, Provider } from 'react-redux';
import { rangeFromOffsets, getOffsets } from 'web-verse';
import classnames from 'classnames';
import Iconoclass from '@scipe/iconoclass';
import { getId, arrayify, unprefix } from '@scipe/jsonld';
import {
  createId,
  getScopeId,
  getObjectId,
  getStageId,
  getStageActions
} from '@scipe/librarian';
import {
  CSS_TABLET,
  Value,
  H1,
  H2,
  FlexPacker,
  Div,
  Span,
  RdfaAbstractText,
  MenuItem
} from '@scipe/ui';
import createListShallowEqualSelector from '../selectors/create-list-shallow-equal-selector';
import {
  getPosition,
  createAnnotationData,
  getDomNodeId,
  isSelectorEqual,
  hasOffsets,
  getInnerMostOffsettedSelector,
  getAnnotationLabel,
  getAnnotationObject
} from '../utils/annotations';
import { openShell } from '../actions/ui-action-creators';
import {
  repositionAnnotations,
  positionAnnotations,
  focusAnnotation,
  createAnnotation,
  bulkAnnotations,
  positionAnnotationsButDontLayout
} from '../actions/annotation-action-creators';
import { createIsBeingEditedSelector } from '../selectors/annotation-selectors';
import {
  createGraphAclSelector,
  createActionMapSelector
} from '../selectors/graph-selectors';
import Highlight from './highlight';
import Annotation from './annotation';
import {
  COMMENT,
  ERROR,
  WARNING,
  REVIEWER_COMMENT,
  ENDORSER_COMMENT,
  REVISION_REQUEST_COMMENT
} from '../constants';
import AnnotableLabel from './annotable-label';
import Permalink from './permalink';
import Counter from '../utils/counter';
import { getWorkflowAction } from '../utils/workflow';

// see https://github.com/gaearon/react-hot-loader/issues/304
const ValueType = <Value />.type;
const H1Type = <H1 />.type;
const H2Type = <H2 />.type;
const FlexPackerType = <FlexPacker />.type;
const RdfaAbstractTextType = <RdfaAbstractText />.type;
const DivType = <Div />.type;
const SpanType = <Span />.type;

// TODO? if position.height is 0 on an annotation, set the visibility to hidden so that there is no visual glitch when we get the position and the annotation is loaded

class Annotable extends React.Component {
  static propTypes = {
    className: PropTypes.string,

    graphId: PropTypes.string.isRequired,

    counter: PropTypes.instanceOf(Counter).isRequired,

    selector: PropTypes.object.isRequired, // can include a subSelector
    matchingLevel: PropTypes.number, // how many subSelector do we need to skip to get to the Graph

    children: PropTypes.oneOfType([
      PropTypes.element, // TODO make it a single element
      PropTypes.func
    ]).isRequired,

    selectable: PropTypes.bool, // allows to select text within the annotable
    annotable: PropTypes.bool, // allows the select bar to create annotation
    displayAnnotations: PropTypes.bool,
    displayPermalink: PropTypes.bool,

    info: PropTypes.oneOfType([
      PropTypes.arrayOf(PropTypes.string),
      PropTypes.string
    ]),

    iconName: PropTypes.string,
    debug: PropTypes.bool,

    // redux
    defaultCommentType: PropTypes.oneOf([
      'RevisionRequestComment',
      'ReviewerComment',
      'EndorserComment',
      'Comment'
    ]).isRequired,
    displayedTypes: PropTypes.object,
    annotations: PropTypes.arrayOf(PropTypes.object),
    commentActions: PropTypes.arrayOf(PropTypes.object),
    actionAnnotations: PropTypes.arrayOf(PropTypes.object), // annotation for ReviewAction, AssessAction and CreateReleaseAction
    isMobile: PropTypes.bool.isRequired,
    isBeingEdited: PropTypes.bool.isRequired,
    openShell: PropTypes.func.isRequired,
    positionAnnotations: PropTypes.func.isRequired,
    positionAnnotationsButDontLayout: PropTypes.func.isRequired,
    createAnnotation: PropTypes.func.isRequired,
    bulkAnnotations: PropTypes.func.isRequired,
    focusAnnotation: PropTypes.func.isRequired,
    repositionAnnotations: PropTypes.func.isRequired
  };

  static defaultProps = {
    actionAnnotations: [],
    commentActions: [],
    annotations: [],
    annotable: true,
    selectable: true,
    displayPermalink: true,
    displayAnnotations: true
  };

  static contextTypes = {
    router: PropTypes.any,
    store: PropTypes.any
  };

  constructor(props) {
    super(props);

    this.handleChildResize = this.handleChildResize.bind(this);
    this.handleFocusAnnotation = this.handleFocusAnnotation.bind(this);
    this.handleClickSelectBar = this.handleClickSelectBar.bind(this);
    this.handleWindowSelection = this.handleWindowSelection.bind(this);
    this.handleResize = debounce(this.handleResize.bind(this), 200);

    this.state = {
      annotationHoveredIds: {}
    };
  }

  componentDidMount() {
    const { isBeingEdited } = this.props;
    this.portalNode = document.createElement('div');
    const $root = this.$annotable;

    $root.appendChild(this.portalNode);
    this.renderHighlights();
    this.updateCommentAndActionAnnotationAnnotations();
    if (this.props.info) {
      this.updateInfoAnnotations('componentDidMount');
    }

    this.position();

    if (isBeingEdited) {
      // the withAnnotable HoC has a resize event listener to reposition the annotation,
      // on screen resize however it won't work for the edit highlight when there are no
      // annotation. So here we add a specific one for those highligths
      window.addEventListener('resize', this.handleResize, true);
      this._hasEditedResize = true;
    }
  }

  componentDidUpdate(prevProps, prevState) {
    this.position();

    if (this.props.isBeingEdited && !this._hasEditedResize) {
      window.addEventListener('resize', this.handleResize, true);
      this._hasEditedResize = true;
    } else if (
      !this.props.isBeingEdited &&
      prevProps.isBeingEdited &&
      this._hasEditedResize
    ) {
      window.removeEventListener('resize', this.handleResize, true);
      this._hasEditedResize = false;
    }

    if (
      prevProps.commentActions !== this.props.commentActions ||
      prevProps.actionAnnotations !== this.props.actionAnnotations ||
      prevProps.selector !== this.props.selector
    ) {
      this.updateCommentAndActionAnnotationAnnotations();
    }

    if (
      !isEqual(prevProps.info, this.props.info) ||
      !isEqual(prevProps.selector, this.props.selector) // TODO memoize selector so that we can get rid of deep equal
    ) {
      this.updateInfoAnnotations('componentDidUpdate');
    }

    if (prevProps.annotations !== this.props.annotations) {
      this.replaceAnnotations(prevProps.annotations, this.props.annotations);
    }

    if (
      prevProps.annotations !== this.props.annotations ||
      prevProps.displayedTypes !== this.props.displayedTypes ||
      prevProps.isBeingEdited !== this.props.isBeingEdited ||
      (prevProps.isBeingEdited && this.props.isBeingEdited) ||
      prevState.annotationHoveredIds !== this.state.annotationHoveredIds
    ) {
      this.renderHighlights();
    }
  }

  componentWillUnmount() {
    if (this.timeoutId != null) {
      clearTimeout(this.timeoutId);
    }
    if (this._hasEditedResize) {
      window.removeEventListener('resize', this.handleResize, true);
      this._hasEditedResize = false;
    }
    // the listener was debounced in the constructor so we always call cancel
    this.handleResize.cancel();
    const $root = this.$annotable;
    ReactDOM.unmountComponentAtNode(this.portalNode);
    $root.removeChild(this.portalNode);

    const { annotations, bulkAnnotations } = this.props;

    const bulkDelete = new Set(annotations.map(a => a.id).filter(Boolean));
    if (bulkDelete.size) {
      bulkAnnotations(
        {
          bulkDelete: new Set(annotations.map(a => a.id).filter(Boolean))
        },
        { reason: '<Annotable />, componentWillUnmount' }
      );
    }
  }

  replaceAnnotations(prevAnnotations, currentAnnotations) {
    const { bulkAnnotations } = this.props;
    // this can happen is an Annotable stay mounted but get a new selector prop
    const bulkDelete = new Set(
      prevAnnotations
        .filter(a => !currentAnnotations.some(_a => a.id === _a.id))
        .map(a => a.id)
    );

    if (bulkDelete.size) {
      bulkAnnotations(
        {
          bulkCreate: [],
          bulkDelete
        },
        { reason: '<Annotable />, replaceAnnotations' }
      );
    }
  }

  updateCommentAndActionAnnotationAnnotations() {
    const {
      commentActions,
      actionAnnotations,
      annotations,
      bulkAnnotations,
      selector,
      counter
    } = this.props;

    const items = commentActions.concat(actionAnnotations);

    const bulkDelete = new Set(
      annotations
        .filter(
          a =>
            (a.type === COMMENT ||
              a.type === REVISION_REQUEST_COMMENT ||
              a.type === ENDORSER_COMMENT ||
              a.type === REVIEWER_COMMENT) &&
            !a.isNew &&
            !items.some(item => getId(a.object) === getAnnotationObject(item))
        )
        .map(a => a.id)
    );

    const bulkCreate = [];
    asyncEach(
      items,
      (item, cb) => {
        const annotationObject = getAnnotationObject(item);

        if (!annotations.some(a => a.object === annotationObject)) {
          // Note we rely on this.props.selector and not commentAction.object.hasSelector for the selector as the latter can be wrapped in an extra action context => we need to back port the offset

          const comment =
            item['@type'] === 'Annotation'
              ? item.annotationBody
              : item.resultComment;

          const itemSelector =
            item['@type'] === 'Annotation'
              ? item.annotationTarget && item.annotationTarget.hasSelector
              : item.object && item.object.hasSelector;

          const offsetedTip = getInnerMostOffsettedSelector(itemSelector);

          let offsettedSelector;
          if (offsetedTip) {
            offsettedSelector = cloneDeep(selector);
            let tip = offsettedSelector;
            while (tip.hasSubSelector) {
              tip = tip.hasSubSelector;
            }
            tip.startOffset = offsetedTip.startOffset;
            tip.endOffset = offsetedTip.endOffset;
          }

          const annotation = createAnnotationData(
            comment && comment['@type'] === 'ReviewerComment'
              ? REVIEWER_COMMENT
              : comment && comment['@type'] === 'EndorserComment'
              ? ENDORSER_COMMENT
              : comment &&
                (comment['@type'] === 'RevisionRequestComment' ||
                  comment['@type'] === 'AuthorResponseComment')
              ? REVISION_REQUEST_COMMENT
              : COMMENT,
            offsettedSelector || selector,
            counter,
            annotationObject,
            comment.dateCreated
              ? new Date(comment.dateCreated).getTime()
              : undefined
          );

          this.measure(annotation, (err, position) => {
            if (err) {
              console.error(err);
            } else {
              bulkCreate.push(Object.assign({ position }, annotation));
            }
            cb(null);
          });
        } else {
          cb(null);
        }
      },
      err => {
        if (err) console.error(err);

        if (bulkCreate.length || bulkDelete.size) {
          bulkAnnotations(
            { bulkCreate, bulkDelete },
            {
              // immediate: true,
              reason:
                '<Annotable />, updateCommentAndActionAnnotationAnnotations'
            }
          );
        }
      }
    );
  }

  updateInfoAnnotations(caller) {
    const {
      info,
      annotations,
      bulkAnnotations,
      selector,
      counter
    } = this.props;

    const bulkDelete = new Set(
      annotations
        .filter(
          a =>
            (a.type === ERROR || a.type === WARNING) &&
            !arrayify(info).some(info => info === a.object)
        )
        .map(a => a.id)
    );

    const bulkCreate = [];
    asyncEach(
      arrayify(info),
      (info, cb) => {
        if (!annotations.some(a => a.object === info)) {
          const annotation = createAnnotationData(
            info.startsWith('ERROR') ? ERROR : WARNING,
            selector,
            counter,
            info
          );
          this.measure(annotation, (err, position) => {
            if (err) {
              console.error(err);
            } else {
              bulkCreate.push(Object.assign({ position }, annotation));
            }
            cb(null);
          });
        } else {
          cb(null);
        }
      },
      err => {
        if (err) console.error(err);
        if (bulkCreate.length || bulkDelete.size) {
          bulkAnnotations(
            { bulkCreate, bulkDelete },
            {
              // immediate: true,
              reason: `<Annotable /> updateInfoAnnotations ${caller}`
            }
          );
        }
      }
    );
  }

  handleResize(e) {
    this.renderHighlights();
  }

  renderHighlights() {
    const { displayAnnotations, isBeingEdited } = this.props;
    if (!displayAnnotations) return;

    const { highlights, nFailures } = this.getHighlights();

    // !! We use ReactDOM.render as Highlight need to measure the DOM element of
    // `this.portalNode` so it needs to be rendered _after_ the componentDidMount/
    // componentDidMount events
    ReactDOM.render(
      <Highlight highlights={highlights} isBeingEdited={isBeingEdited} />,
      this.portalNode,
      () => {
        if (nFailures) {
          // we need that as some component are doig DOM manipulation => child DOM node is only available in next tick
          // Note that this is safe as we always cancel the timeout should it be aborted
          if (this.timeoutId != null) clearTimeout(this.timeoutId);
          this.timeoutId = setTimeout(() => {
            ReactDOM.render(
              <Highlight
                highlights={this.getHighlights().highlights}
                isBeingEdited={isBeingEdited}
              />,
              this.portalNode
            );
          }, 0);
        }
      }
    );
  }

  getHighlights() {
    const { annotations, displayedTypes, isBeingEdited } = this.props;

    const displayedAnnotations = annotations.filter(
      a => displayedTypes[a.type]
    );

    // Get minimal number of highlights
    // All the annotations available as props.annotations share the same domNodeId. There are 3 cases:
    // - annotations are for section => 1 main highlight and possibly sub highlights
    // - annotations are for selection => potentially multiple highlights (to be grouped by their offsets)
    // - isBeingEdited is true and we add a section annotation if none were present already
    let highlights = [];
    let nFailures = 0;

    const sectionAnnotations = displayedAnnotations.filter(
      a => !hasOffsets(a.selector)
    );

    if (sectionAnnotations.length || isBeingEdited) {
      const $annotable = this.$annotable;
      let range = document.createRange();
      range.setStart($annotable, 0);
      range.setEnd($annotable, $annotable.childNodes.length);

      if (sectionAnnotations.length) {
        highlights.push({
          range,
          rangeType: 'section',
          groupId: sectionAnnotations[0].id,
          hovered: sectionAnnotations.some(
            a => this.state.annotationHoveredIds[a.id]
          ),
          focused: sectionAnnotations.some(a => a.focused)
        });

        // highlight
        sectionAnnotations.forEach(a => {
          if (a.highlightDomNodeId != null && a.focused) {
            //we only add those highlights if annotation is focused
            const $el = document.getElementById(a.highlightDomNodeId);
            if ($el) {
              let range = document.createRange();
              range.setStart($el, 0);
              range.setEnd($el, $el.childNodes.length);

              highlights.push({
                range,
                rangeType: 'element',
                groupId: a.id,
                hovered: this.state.annotationHoveredIds[a.id],
                focused: a.focused
              });
            }
          }
        });
      } else {
        highlights.push({
          groupId: 'annotable-edited',
          range,
          rangeType: 'section',
          hovered: false,
          focused: true
        });
      }
    }

    const selectionAnnotations = displayedAnnotations.filter(a =>
      hasOffsets(a.selector)
    );

    //group by offsets
    let selectionAnnotationsByOffsetIds = {};
    selectionAnnotations.forEach(a => {
      const { startOffset, endOffset } = getInnerMostOffsettedSelector(
        a.selector
      );

      const offsetId = `${startOffset}-${endOffset}`;
      if (offsetId in selectionAnnotationsByOffsetIds) {
        selectionAnnotationsByOffsetIds[offsetId].push(a);
      } else {
        selectionAnnotationsByOffsetIds[offsetId] = [a];
      }
    });

    //populate highlights
    Object.keys(selectionAnnotationsByOffsetIds).forEach(key => {
      const annotations = selectionAnnotationsByOffsetIds[key];
      const $scope = document.getElementById(
        getDomNodeId(annotations[0].selector)
      );

      if ($scope && $scope.firstChild) {
        const { startOffset, endOffset } = getInnerMostOffsettedSelector(
          annotations[0].selector
        );

        const range = rangeFromOffsets(
          $scope.firstChild,
          startOffset,
          endOffset
        );

        highlights.push({
          range,
          rangeType: 'selection',
          groupId: annotations[0].id,
          hovered: annotations.some(a => this.state.annotationHoveredIds[a.id]),
          focused: annotations.some(a => a.focused)
        });
      } else {
        nFailures++;
      }
    });

    return { highlights, nFailures };
  }

  position() {
    const { positionAnnotations, annotations, displayAnnotations } = this.props;
    if (!displayAnnotations) return;

    const unpositionedAnnotations = annotations.filter(
      a => !a.position || a.isBeingRepositioned
    );

    // TODO also check that content is present in case of content annotation
    if (!unpositionedAnnotations.length) return;

    const positions = unpositionedAnnotations.reduce(
      (positions, annotation) => {
        positions[annotation.id] = getPosition(annotation);
        return positions;
      },
      {}
    );

    if (Object.keys(positions).length) {
      positionAnnotations(positions);
    }
  }

  measure(annotation, callback) {
    const $box = document.createElement('div');
    $box.style.left = '-9999px';
    $box.style.position = 'relative';

    const $root = this.$annotable;
    $root.appendChild($box);

    const { graphId, isMobile, matchingLevel } = this.props;

    class CtxFwd extends React.Component {
      render() {
        return (
          <Provider store={window.store}>
            <BrowserRouter>
              <Annotation
                isMobile={isMobile}
                graphId={graphId}
                annotation={annotation}
                matchingLevel={matchingLevel}
              />
            </BrowserRouter>
          </Provider>
        );
      }
    }
    ReactDOM.render(<CtxFwd />, $box, () => {
      const position = getPosition(annotation); // can only be called if the annotation is rendered in the DOM (as the function relies on document.getElementById) TODO use ref

      $root.removeChild($box);

      callback(null, position);
    });
  }

  openShell(annotationId, e) {
    const { isMobile } = this.props;
    if (isMobile) {
      e && e.preventDefault();
      this.props.openShell('annotation', annotationId);
    }
  }

  handleClickSelectBar(e) {
    const {
      defaultCommentType,
      graphId,
      selector,
      createAnnotation,
      annotable,
      displayAnnotations,
      counter
    } = this.props;

    if (!annotable || !displayAnnotations) {
      return;
    }

    const annotation = createAnnotationData(
      defaultCommentType === 'RevisionRequestComment'
        ? REVISION_REQUEST_COMMENT
        : defaultCommentType === 'EndorserComment'
        ? ENDORSER_COMMENT
        : defaultCommentType === 'ReviewerComment'
        ? REVIEWER_COMMENT
        : COMMENT,
      selector,
      counter,
      unprefix(createId('blank')['@id']),
      new Date().getTime()
    );

    this.measure(annotation, (err, position) => {
      if (err) return console.error(err);
      createAnnotation(graphId, annotation, {
        position,
        isNew: true,
        focused: true
      });
      this.openShell(annotation.id, e);
    });
  }

  handleWindowSelection(e) {
    const {
      defaultCommentType,
      graphId,
      createAnnotation,
      selector,
      annotable,
      selectable,
      displayAnnotations,
      counter
    } = this.props;

    if (!annotable || !selectable || !displayAnnotations) {
      return;
    }

    e.preventDefault();

    let selection = window.getSelection();
    let range;
    if (!selection.isCollapsed) {
      range = selection.getRangeAt(0);
    } else {
      return;
    }

    let $commonAncestor = range.commonAncestorContainer;
    if ($commonAncestor.nodeType === Node.TEXT_NODE) {
      $commonAncestor = selection.anchorNode.parentElement; //get closest Element
    }

    while (!$commonAncestor.classList.contains('annotable')) {
      $commonAncestor = $commonAncestor.parentElement;
      if ($commonAncestor.tagName === 'BODY') {
        selection.removeAllRanges();
        return;
      }
    }

    if ($commonAncestor.getElementsByClassName('annotable').length) {
      selection.removeAllRanges();
      return;
    }

    // The user has not selected a full section, he selected part (or the whole) of a `annotable` => let's see if he selected all of the potential text content
    let target = range.toString().trim();

    let $annotableContent = this.$annotableContent;
    let $scope = $annotableContent.lastElementChild;
    let $children = $annotableContent.children;
    let offsets;
    for (let i = 0; i < $children.length; i++) {
      let $el = $children[i];
      let textContent = $el.textContent.trim();
      if (target.indexOf(textContent) === -1 && target !== textContent) {
        offsets = getOffsets(range, $scope);
        break;
      }
    }

    let offsetedSelector = cloneDeep(selector);
    let parent = offsetedSelector;
    let tip = offsetedSelector;
    while (tip.hasSubSelector) {
      parent = tip;
      tip = tip.hasSubSelector;
    }

    if (parent.hasSubSelector) {
      parent.hasSubSelector = Object.assign(parent.hasSubSelector, offsets);
    } else {
      tip = Object.assign(tip, offsets);
    }

    const annotation = createAnnotationData(
      defaultCommentType === 'RevisionRequestComment'
        ? REVISION_REQUEST_COMMENT
        : defaultCommentType === 'EndorserComment'
        ? ENDORSER_COMMENT
        : defaultCommentType === 'ReviewerComment'
        ? REVIEWER_COMMENT
        : COMMENT,
      offsetedSelector,
      counter,
      unprefix(createId('blank')['@id']),
      new Date().getTime()
    );

    this.measure(annotation, (err, position) => {
      if (err) return console.error(err);
      createAnnotation(graphId, annotation, {
        position,
        isNew: true,
        focused: true
      });
      this.openShell(annotation.id, e);
    });
  }

  handleFocusAnnotation(e) {
    // if it's an external link we should let the user the ability to follow it
    if (e.target.tagName === 'A' && e.target.href) {
      return;
    }

    let selection = window.getSelection();
    if (!selection.isCollapsed) {
      //there is a selection => we are creating a new annotation
      return;
    }

    const { annotations, focusAnnotation } = this.props;

    //check if the click falls in one highlight giving priority to
    //highlights with a smaller surface and more recent

    //sort the annotations by increasing surface
    let annotableClientRects = this.$annotable.getBoundingClientRect();
    let highlightRects = [];

    (annotations || []).forEach(a => {
      let rects;
      if (a.selector && hasOffsets(a.selector)) {
        let $scope = document.getElementById(getDomNodeId(a.selector));
        if ($scope && $scope.firstChild) {
          const { startOffset, endOffset } = getInnerMostOffsettedSelector(
            a.selector
          );

          let range = rangeFromOffsets(
            $scope.firstChild,
            startOffset,
            endOffset
          );
          rects = range.getClientRects();
        } else {
          rects = [annotableClientRects];
        }
      } else {
        rects = [annotableClientRects];
      }

      highlightRects.push({
        dateCreated: a.dateCreated,
        id: a.id,
        rects,
        surface: Array.prototype.reduce.call(
          rects,
          (a, b) => a + b.height * b.width,
          0
        )
      });

      if (a.highlightDomeNodeId) {
        let $scope = document.getElementById(a.highlightDomeNodeId);
        if ($scope) {
          let range = document.createRange();
          range.setStart($scope, 0);
          range.setEnd($scope, $scope.childNodes.length);
          let rects = range.getClientRects();
          highlightRects.push({
            dateCreated: a.dateCreated,
            id: a.id,
            rects,
            surface: Array.prototype.reduce.call(
              rects,
              (a, b) => a + b.height * b.width,
              0
            )
          });
        }
      }
    });

    highlightRects.sort((a, b) => {
      if (a.surface === b.surface) {
        return b.dateCreated - a.dateCreated;
      } else {
        return a.surface - b.surface;
      }
    });

    for (let i = 0; i < highlightRects.length; i++) {
      for (let j = 0; j < highlightRects[i].rects.length; j++) {
        let h = highlightRects[i].rects[j];
        if (
          e.type === 'focus' ||
          (e.clientX >= h.left &&
            e.clientX <= h.right &&
            e.clientY >= h.top &&
            e.clientY <= h.bottom)
        ) {
          if (e.target.tagName !== 'A') {
            //do not prevent shell
            e.preventDefault();
            e.stopPropagation();
          }

          focusAnnotation(highlightRects[i].id);
          this.openShell(highlightRects[i].id, e);
          return;
        }
      }
    }
  }

  handleChildResize(height, prevHeight) {
    const { repositionAnnotations } = this.props;
    // re-render highlight for component that resizes
    if (height == null || prevHeight == null || height !== prevHeight) {
      this.renderHighlights();
      if (height < prevHeight) {
        repositionAnnotations({ reason: 'Annotable handleChildResize' });
      }
    }
  }

  handleHoverChange(annotations, isHovered) {
    this.setState({
      annotationHoveredIds: annotations.reduce((nextState, annotation) => {
        nextState[annotation.id] = isHovered;
        return nextState;
      }, {})
    });
  }

  handlePermalinkClick = e => {
    e.stopPropagation(); // prevent withAnnotable HoC to unfocus annotation
  };

  handleMenuAnnotationFocus(annotationId, e) {
    if (annotationId) {
      const { isMobile, focusAnnotation } = this.props;
      let selection = window.getSelection();
      if (!selection.isCollapsed) {
        selection.removeAllRanges();
      }
      focusAnnotation(annotationId);
      if (isMobile) {
        this.openShell(annotationId, e);
      }
    }
  }

  render() {
    if (!this.props.children) {
      return null;
    }

    const {
      className,
      isMobile,
      graphId,
      isBeingEdited,
      selector,
      annotations,
      annotable,
      displayAnnotations,
      displayPermalink,
      positionAnnotations,
      focusAnnotation,
      openShell,
      counter,
      displayedTypes,
      matchingLevel,
      iconName,
      positionAnnotationsButDontLayout
    } = this.props;

    const displayedAnnotations = annotations.filter(
      a => displayedTypes[a.type]
    );

    const hash = getDomNodeId(selector);

    // TODO make it so that children is only 1 element
    let originalId; // we preserve the original id so that we can getElementById in case of the publisher table of content (see PublisherSidebarOutline)

    const children =
      typeof this.props.children === 'function'
        ? this.props.children
        : React.Children.map(this.props.children, (child, i) => {
            if (i === React.Children.count(this.props.children) - 1) {
              const addedProps = {
                id: hash
              };

              if (child && child.props && child.props.id) {
                originalId = child.props.id;
              }

              // TODO whitelist instead of blacklist ?
              if (
                child &&
                child.type !== Link.type &&
                child.type !== ValueType &&
                child.type !== H1Type &&
                child.type !== H2Type &&
                child.type !== FlexPackerType &&
                child.type !== RdfaAbstractTextType &&
                child.type !== DivType &&
                child.type !== SpanType &&
                child.type !== 'span' &&
                child.type !== 'div' &&
                child.type !== 'ul' &&
                child.type !== 'ol' &&
                child.type !== 'li' &&
                child.type !== 'p'
              ) {
                // we do not add that to link or Value otherwise we will get a warning...
                addedProps.onResize = this.handleChildResize; //TODO this is fragile, try to improve maybe add a defaultProps with `acceptOnResize: true`
              }
              return React.cloneElement(child, addedProps);
            } else {
              return child;
            }
          });

    // groupedAnnotations are used in case of annotation made on the text but not on the first line (so they need <AnnotationLabel /> instead of just <Permalink />
    let groupedAnnotations = {};
    displayedAnnotations.forEach(a => {
      if (a.position && a.position.targetTop > 0) {
        const id = Math.floor(a.position.targetAbsTop);
        if (id in groupedAnnotations) {
          groupedAnnotations[id].push(a);
        } else {
          groupedAnnotations[id] = [a];
        }
      }
    });

    return (
      <div
        ref={$el => {
          this.$annotable = $el;
        }}
        className={classnames('annotable', className, {
          'annotable--edited': isBeingEdited,
          'annotable--not-annotable': !annotable,
          'annotable--not-annotable-with-no-annotations':
            !annotable && !displayedAnnotations.length,
          readonly: !annotable,
          disabled: !displayAnnotations
        })}
        onClick={this.handleFocusAnnotation}
      >
        {!!(displayAnnotations || isBeingEdited) && (
          <div
            className={classnames('select-bar', {
              readonly: !annotable,
              disabled: !displayAnnotations
            })}
            onClick={this.handleClickSelectBar}
          >
            {isBeingEdited && <Iconoclass iconName="shell" size="16px" />}
          </div>
        )}

        {!!displayPermalink && (
          <Permalink
            onClick={this.handlePermalinkClick}
            onHoverChange={this.handleHoverChange.bind(
              this,
              displayedAnnotations
            )}
            counter={counter}
            isHighlighted={displayedAnnotations.some(
              a => a.position && a.position.targetTop < 1 && a.focused
            )}
            hasError={displayedAnnotations.some(a => a.type === ERROR)}
            hasWarning={displayedAnnotations.some(a => a.type === WARNING)}
            hasComment={displayedAnnotations.some(a => a.type === COMMENT)}
            hasReviewerComment={displayedAnnotations.some(
              a => a.type === REVIEWER_COMMENT
            )}
            hasEndorserComment={displayedAnnotations.some(
              a => a.type === ENDORSER_COMMENT
            )}
            hasRevisionRequestComment={displayedAnnotations.some(
              a => a.type === REVISION_REQUEST_COMMENT
            )}
          >
            {displayedAnnotations.map((a, i) => (
              <MenuItem
                key={a.id}
                divider={i === 0}
                disabled={a.focused}
                onClick={this.handleMenuAnnotationFocus.bind(this, a.id)}
                icon={{
                  iconName: a.focused ? 'check' : 'none'
                }}
              >{`${isMobile ? 'Open' : 'Focus'} ${getAnnotationLabel(
                a
              )}`}</MenuItem>
            ))}
          </Permalink>
        )}

        {!!(!isBeingEdited && iconName && iconName !== 'none') && (
          <Iconoclass
            className="annotable__theme-icon"
            size="16px"
            iconName={iconName}
          />
        )}

        <div
          id={originalId}
          ref={$el => {
            this.$annotableContent = $el;
          }}
          className="annotable__content"
          onMouseUp={this.handleWindowSelection}
        >
          {typeof children === 'function'
            ? children(hash, this.handleChildResize)
            : children}
        </div>

        {!!displayAnnotations && (
          <div className="annotable__labels">
            {Object.keys(groupedAnnotations).map(id => (
              <div
                className="annotable__labels__positioner"
                key={`positioner-${id}`}
              >
                <AnnotableLabel
                  key={id}
                  annotations={groupedAnnotations[id]}
                  focusAnnotation={focusAnnotation}
                  isMobile={isMobile}
                  openShell={openShell}
                  onHoverChange={this.handleHoverChange.bind(
                    this,
                    groupedAnnotations[id]
                  )}
                />
              </div>
            ))}

            {!isMobile &&
              displayedAnnotations.map(annotation => (
                <Annotation
                  key={annotation.id}
                  counter={counter}
                  graphId={graphId}
                  isMobile={isMobile}
                  annotation={annotation}
                  matchingLevel={matchingLevel}
                  positionAnnotations={positionAnnotations}
                  positionAnnotationsButDontLayout={
                    positionAnnotationsButDontLayout
                  }
                  focusAnnotation={focusAnnotation}
                />
              ))}
          </div>
        )}
      </div>
    );
  }
}

function mapPropsToSelector(props) {
  return props.selector;
}

function makeSelector() {
  return createListShallowEqualSelector(
    state => state.user,
    state => state.screenWidth,
    state => state.annotations.displayedTypes,
    (state, props) => props.displayAnnotations,
    createIsBeingEditedSelector(mapPropsToSelector),
    (state, props) => {
      const { annotations } = state;
      const { selector, matchingLevel } = props;

      const myAnnotations = annotations.annotations.filter(a => {
        return isSelectorEqual(selector, a.selector, {
          offsets: false,
          matchingLevel,
          debug: false
        });
      });

      if (myAnnotations.length) {
        return myAnnotations;
      }
    },
    (state, props) => {
      const { scopeMap } = state;
      const { selector, debug } = props;

      const scopeData = scopeMap[getScopeId(props.graphId)];

      const commentMap = scopeData && scopeData.commentMap;
      if (commentMap) {
        // only grab comment action matching the selector (=> only the one created during the action rendered on screen given selector start from the action rendered on screen)
        const commentActions = Object.values(commentMap).filter(
          commentAction => {
            return (
              // only top level comment not comment response
              (!commentAction.resultComment ||
                !getId(commentAction.resultComment.parentItem)) &&
              commentAction.object &&
              commentAction.object.hasSelector &&
              isSelectorEqual(selector, commentAction.object.hasSelector, {
                offsets: false,
                debug: false
              })
            );
          }
        );

        if (commentActions.length) {
          return commentActions;
        }
      }
    },
    (state, props) => props.graphId,
    (state, props) => props.selector,
    (state, props) => props.matchingLevel,
    (state, props) => props.debug,
    createGraphAclSelector(),
    createActionMapSelector(),
    (
      user,
      screenWidth,
      displayedTypes,
      displayAnnotations,
      isBeingEdited,
      annotations,
      commentActions,
      graphId,
      selector,
      matchingLevel,
      debug,
      acl,
      actionMap
    ) => {
      // Only grab annotations created in the action rendered on screen (`hostAction`) or in one of its inbound attachments (if any)
      const hostAction = getWorkflowAction(getId(selector.node), {
        user,
        acl,
        actionMap
      });

      const candidateAnnotations = [];
      if (hostAction && displayAnnotations) {
        switch (hostAction['@type']) {
          case 'CreateReleaseAction': {
            // !!Note: we do _not_ display the new author responses (`hostAction.annotation`) as we will only display them _through_ the revision request they answer

            // Revision request (that the author responses targets)
            if (getId(hostAction.instrument)) {
              const assessAction = getWorkflowAction(
                getId(hostAction.instrument),
                { user, acl, actionMap }
              );
              if (assessAction) {
                if (assessAction.annotation) {
                  candidateAnnotations.push(
                    ...arrayify(assessAction.annotation)
                  );
                }

                // ReviewerComment (made at same time that revision request)
                if (assessAction.instrument) {
                  arrayify(assessAction.instrument).forEach(instrument => {
                    instrument = getWorkflowAction(getId(instrument), {
                      user,
                      acl,
                      actionMap
                    });
                    if (instrument['@type'] === 'ReviewAction') {
                      if (instrument.annotation) {
                        candidateAnnotations.push(
                          ...arrayify(instrument.annotation)
                        );
                      }
                    }
                  });
                }
              }
            }
            break;
          }

          case 'AssessAction': {
            // New Revision requests
            if (hostAction.annotation) {
              candidateAnnotations.push(...arrayify(hostAction.annotation));
            }

            // Previous author responses (and the revision request that they answer) along with the reviewer comments
            if (hostAction.instrument) {
              arrayify(hostAction.instrument).forEach(instrument => {
                instrument = getWorkflowAction(getId(instrument), {
                  user,
                  acl,
                  actionMap
                });

                if (instrument['@type'] === 'ReviewAction') {
                  if (instrument.annotation) {
                    candidateAnnotations.push(
                      ...arrayify(instrument.annotation)
                    );
                  }
                } else if (instrument['@type'] === 'CreateReleaseAction') {
                  const createReleaseAction = instrument;
                  // !!Note: we do _not_ display the author responses (`createReleaseAction.annotation`) as we will only display them _through_ the revision request they answer

                  // we need to get the revision request that they answer _and_ the reviewer comment
                  if (createReleaseAction.instrument) {
                    const assessAction = getWorkflowAction(
                      getId(createReleaseAction.instrument),
                      { user, acl, actionMap }
                    );
                    if (assessAction) {
                      if (assessAction.annotation) {
                        candidateAnnotations.push(
                          ...arrayify(assessAction.annotation)
                        );
                      }

                      if (assessAction.instrument) {
                        arrayify(assessAction.instrument).forEach(
                          instrument => {
                            instrument = getWorkflowAction(getId(instrument), {
                              user,
                              acl,
                              actionMap
                            });
                            if (instrument['@type'] === 'ReviewAction') {
                              if (instrument.annotation) {
                                candidateAnnotations.push(
                                  ...arrayify(instrument.annotation)
                                );
                              }
                            }
                          }
                        );
                      }
                    }
                  }
                }
              });
            }

            break;
          }

          case 'ReviewAction':
            // Reviewer Comment
            if (hostAction.annotation) {
              candidateAnnotations.push(...arrayify(hostAction.annotation));
            }

            // Previous author responses (and the revision request that they answer) + assess action that lead to the Review Action
            if (hostAction.instrument) {
              arrayify(hostAction.instrument).forEach(instrument => {
                instrument = getWorkflowAction(getId(instrument), {
                  user,
                  acl,
                  actionMap
                });

                if (debug) {
                  console.log(instrument);
                }

                if (instrument) {
                  if (instrument['@type'] === 'CreateReleaseAction') {
                    const createReleaseAction = instrument;
                    // !!Note: we do _not_ display the author responses (`createReleaseAction.annotation`) as we will only display them _through_ the revision request they answer

                    // we need to get the revision request that they answer
                    if (createReleaseAction.instrument) {
                      const assessAction = getWorkflowAction(
                        getId(createReleaseAction.instrument),
                        { user, acl, actionMap }
                      );
                      if (
                        assessAction &&
                        !arrayify(hostAction.instrument).some(
                          instrument =>
                            getId(instrument) === getId(assessAction)
                        )
                      ) {
                        if (assessAction.annotation) {
                          candidateAnnotations.push(
                            ...arrayify(assessAction.annotation)
                          );
                        }
                      }
                    }
                  } else if (instrument['@type'] === 'AssessAction') {
                    const assessAction = instrument;
                    if (assessAction.annotation) {
                      candidateAnnotations.push(
                        ...arrayify(assessAction.annotation)
                      );
                    }
                  }
                }
              });
            }
            break;

          default:
            break;
        }
      }

      const actionAnnotations = candidateAnnotations.filter(annotation => {
        return (
          annotation.annotationTarget &&
          annotation.annotationTarget.hasSelector &&
          isSelectorEqual(selector, annotation.annotationTarget.hasSelector, {
            matchingLevel, // needed to shortcut the action context and go straight to the Graph
            offsets: false,
            debug: false
          })
        );
      });

      let defaultCommentType;
      if (
        hostAction &&
        hostAction['@type'] === 'ReviewAction' &&
        hostAction.actionStatus === 'ActiveActionStatus'
      ) {
        defaultCommentType = 'ReviewerComment';
      } else if (
        hostAction &&
        hostAction['@type'] === 'AssessAction' &&
        hostAction.actionStatus === 'ActiveActionStatus'
      ) {
        defaultCommentType = 'RevisionRequestComment';
      } else {
        // Comment or EndorserComment
        const endorseAction = getStageActions(
          actionMap[getStageId(hostAction)]
        ).find(
          stageAction =>
            stageAction['@type'] === 'EndorseAction' &&
            getObjectId(stageAction) === getId(hostAction)
        );

        const canEndorse =
          !!endorseAction &&
          hostAction.actionStatus === 'StagedActionStatus' &&
          acl.checkPermission(user, 'PerformActionPermission', {
            action: endorseAction
          });

        defaultCommentType = canEndorse ? 'EndorserComment' : 'Comment';
      }

      if (debug) {
        console.log({
          hostAction,
          matchingLevel,
          candidateAnnotations,
          actionAnnotations,
          selector,
          defaultCommentType
        });
      }

      const props = {
        defaultCommentType,
        isMobile: screenWidth < CSS_TABLET,
        displayedTypes,
        isBeingEdited,
        annotations:
          displayAnnotations && annotations && annotations.length
            ? annotations
            : undefined,
        commentActions:
          displayAnnotations && commentActions && commentActions.length
            ? commentActions
            : undefined,
        actionAnnotations:
          displayAnnotations && actionAnnotations && actionAnnotations.length
            ? actionAnnotations
            : undefined
      };

      if (!displayAnnotations) {
        props.info = undefined;
      }

      return props;
    }
  );
}

function makeMapStateToProps() {
  const s = makeSelector();
  return (state, props) => {
    return s(state, props);
  };
}

export default connect(
  makeMapStateToProps,
  {
    openShell,
    positionAnnotations,
    positionAnnotationsButDontLayout,
    repositionAnnotations,
    focusAnnotation,
    createAnnotation,
    bulkAnnotations
  }
)(Annotable);
