import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { Value } from '@scipe/ui';
import { getId } from '@scipe/jsonld';
import { encodingImagesLoaded } from '../actions/encoding-action-creators';

//TODO move this into css constants - these are paddings defined in printable-resource-body.css
const textBoxObjectPadding = 24;
const textBoxObjectMarginLeft = 36;
const textBoxObjectMarginRight = 36;

class TextBoxObject extends Component {
  static propTypes = {
    id: PropTypes.string,
    resource: PropTypes.object.isRequired,

    preventPrintRescaling: PropTypes.bool,
    isPrinting: PropTypes.bool,
    // required if `isPrinting` is `true` and preventPrintRescaling is `false`
    availableWidth: PropTypes.number,
    availableHeight: PropTypes.number,

    // redux
    content: PropTypes.shape({
      document: PropTypes.object
    }),
    encodingImagesLoaded: PropTypes.func.isRequired
  };

  static defaultProps = {
    resource: {},
    content: {}
  };

  constructor(props) {
    super(props);

    this.root = React.createRef();
  }

  componentDidMount() {
    const { isPrinting, preventPrintRescaling, content } = this.props;

    window.addEventListener('resize', this.handleResize, true);
    if (isPrinting && !preventPrintRescaling) {
      this.rescale();
    }

    if (content.document) {
      this.setImgLoadListeners();
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize, true);
    this.removeImgLoadListners();
  }

  componentDidUpdate(prevProps, prevState) {
    const { isPrinting, preventPrintRescaling, content } = this.props;

    if (isPrinting && !preventPrintRescaling && this.props !== prevProps) {
      this.rescale();
    }

    if (content.document !== prevProps.content.document) {
      this.setImgLoadListeners();
    }
  }

  setImgLoadListeners() {
    const { isPrinting } = this.props;
    // if previous listners where attached we remove them
    if (this.$imgs) {
      this.removeImgLoadListners();
    }

    const $data = this.root.current;
    if ($data) {
      const $imgs = $data.querySelectorAll('img');

      if ($imgs.length) {
        this.$imgs = $imgs;
        this.nImgLoaded = 0;
        for (const $img of $imgs) {
          if (isPrinting) {
            $img.removeAttribute('srcset');
            $img.removeAttribute('sizes');
          }

          if ($img.complete && $img.naturalWidth) {
            // img is already loaded
            this.handleImgLoaded({ target: $img });
          } else {
            $img.addEventListener('load', this.handleImgLoaded);
          }
        }
      }
    }
  }

  removeImgLoadListners() {
    if (this.$imgs) {
      for (const $img of this.$imgs) {
        $img.removeEventListener('load', this.handleImgLoaded);
      }

      this.$imgs = null;
    }
  }

  handleImgLoaded = e => {
    const {
      isPrinting,
      preventPrintRescaling,
      availableWidth,
      content: { encodingId },
      encodingImagesLoaded
    } = this.props;

    const $img = e.target;
    if ($img && isPrinting && !preventPrintRescaling) {
      const naturalWidth = $img.naturalWidth;
      // console.log('$img unsized dims', $img.width, $img.height);
      //const originalWidth = $img.width;
      //const originalHeight = $img.width;

      //const constrainedWidth = Math.min(naturalWidth, availableWidth);

      //const scaleFactor = constrainedWidth / $img.naturalWidth;
      //const constrainedHeight = $img.naturalHeight * scaleFactor;

      //$img.width = constrainedWidth; //Math.min($img.naturalWidth, availableWidth);
      //$img.height = constrainedHeight;
      //console.log('$img.naturalX', $img.naturalWidth, $img.naturalHeight);

      //$img.width = Math.min($img.naturalWidth, availableWidth);
      //const scale = $img.width / originalWidth;
      //$img.height = originalHeight * scale;
      //console.log('$img set dims', $img.width, $img.height, scale);
    }

    this.nImgLoaded++;
    if (this.nImgLoaded === this.$imgs.length) {
      if (isPrinting && !preventPrintRescaling) {
        // call it again when all the images have loaded
        // window.setTimeout(() => {
        //   this.rescale;
        // }, 500);
        this.rescale();
      }
      encodingImagesLoaded(encodingId);
    }
  };

  handleResize = () => {
    const { isPrinting, preventPrintRescaling } = this.props;
    if (isPrinting && !preventPrintRescaling) {
      this.rescale();
    }
  };

  rescale = () => {
    const { availableHeight, availableWidth } = this.props;
    // console.log('rescale');
    // !! we measure without the transform applied
    const $root = this.root.current;
    const $textBox = $root.querySelector('aside');

    if ($textBox) {
      // measure without any transform
      $textBox.style.transformOrigin = null;
      $textBox.style.transform = null;

      // scrollHeight is what we want (see https://developer.mozilla.org/en-US/docs/Web/API/CSS_Object_Model/Determining_the_dimensions_of_elements#How_big_is_the_content.3F) but it doesn't give fractional value so we also try from the rect.
      let rect = $textBox.getBoundingClientRect();
      const unscaledWidth = Math.max($textBox.scrollWidth, rect.width);
      const unscaledHeight = Math.max($textBox.scrollHeight, rect.height);

      // take into account padding / margin
      const innerHeight =
        availableHeight > 2 * textBoxObjectPadding
          ? availableHeight - 2 * textBoxObjectPadding
          : availableHeight;

      const innerWidth =
        availableWidth > textBoxObjectMarginLeft + textBoxObjectMarginRight
          ? availableWidth - textBoxObjectMarginLeft - textBoxObjectMarginRight
          : availableWidth;

      const rw = innerWidth / unscaledWidth;
      const rh = innerHeight / unscaledHeight;
      const printScale = Math.min(rw, rh, 1); // only scale down, not up

      $textBox.style.transformOrigin = '0 0';
      $textBox.style.transform = `scale3d(${printScale}, ${printScale}, ${printScale})`;
      $textBox.style.width = `${unscaledWidth}px`;
      $textBox.style.height = `${unscaledHeight}px`;
      // $textBox.style.outline = '1px solid red';
      // re measure
      rect = $textBox.getBoundingClientRect();

      // re position
      const offsetLeft =
        availableWidth > textBoxObjectMarginLeft + textBoxObjectMarginRight
          ? (availableWidth - rect.width) / 2
          : (availableWidth - rect.width) / 2;

      const offsetTop = (availableHeight - rect.height) / 2;

      // console.log(
      //   `offsetLeft: ${offsetLeft}
      // offsetTop: ${offsetTop}
      // unscaledWidth: ${unscaledWidth}
      // unscaledHeight: ${unscaledHeight}
      // availableWidth: ${availableWidth}
      // availableHeight: ${availableHeight}
      // w: ${rect.width}
      // h: ${rect.height}`
      // );

      $root.style.top = `${offsetTop}px`;
      $root.style.left = `${offsetLeft}px`;
    }
  };

  render() {
    const { id, content, isPrinting, preventPrintRescaling } = this.props;

    return (
      <div
        id={id}
        className={classNames('text-box-object', {
          'text-box-object--print': isPrinting,
          'text-box-object--print--standalone':
            isPrinting && !preventPrintRescaling,
          'text-box-object--print--inline': isPrinting && preventPrintRescaling
        })}
        ref={this.root}
      >
        <Value escHtml={false} tagName="aside">
          {content.document && content.document.body.innerHTML}
        </Value>
      </div>
    );
  }
}

function makeSelector() {
  return createSelector(
    (state, props) => {
      if (props.resource && props.resource.encoding) {
        for (let encoding of props.resource.encoding) {
          const encodingId = getId(encoding);
          if (
            encodingId in state.contentMap &&
            state.contentMap[encodingId].document
          ) {
            return state.contentMap[encodingId];
          }
        }
      }
    },
    content => {
      return { content };
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
    encodingImagesLoaded
  }
)(TextBoxObject);
