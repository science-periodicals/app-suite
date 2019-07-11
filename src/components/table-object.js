import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';
import isEqual from 'lodash/isEqual';
import { Value } from '@scipe/ui';
import { encodingImagesLoaded } from '../actions/encoding-action-creators';

// TODO move this into css constants - these are paddings defined in printable-resource-body.css
const tableObjectPadding = 24;
const tableObjectMarginLeft = 36;
const tableObjectMarginRight = 36;

class TableObject extends React.PureComponent {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    content: PropTypes.shape({
      html: PropTypes.string,
      encodingId: PropTypes.string
    }),

    preventPrintRescaling: PropTypes.bool,
    isPrinting: PropTypes.bool,
    // required if `isPrinting` is `true`
    availableWidth: PropTypes.number,
    availableHeight: PropTypes.number,

    // redux
    encodingImagesLoaded: PropTypes.func.isRequired
  };

  static defaultProps = {
    content: {}
  };

  constructor(props) {
    super(props);

    this.htmlData = React.createRef();
    this.viewport = React.createRef();
    this.scrollV = React.createRef();

    this.state = {
      leftShadow: false,
      rightShadow: false,
      bottomShadow: false,
      headerFloat: false,
      tableFullView: true
    };
  }

  componentDidMount() {
    const {
      isPrinting,
      content: { html }
    } = this.props;

    window.addEventListener('resize', this.handleResize, true);

    if (isPrinting) {
      this.rescaleTable();
    }

    if (html) {
      this.setImgLoadListeners();
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const {
      isPrinting,
      content: { html }
    } = this.props;

    if (!isEqual(this.state, prevState) || this.props !== prevProps) {
      this.handleScroll();
    }

    if (isPrinting && this.props !== prevProps) {
      this.rescaleTable();
    }

    if (html !== prevProps.content.html) {
      this.setImgLoadListeners();
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize, true);

    this.removeImgLoadListners();
  }

  setImgLoadListeners() {
    const { isPrinting } = this.props;

    // if previous listners where attached we remove them
    if (this.$imgs) {
      this.removeImgLoadListners();
    }

    const $data = this.htmlData.current;
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
      availableWidth,
      content: { encodingId },
      encodingImagesLoaded
    } = this.props;

    const $img = e.target;
    if ($img && isPrinting) {
      $img.width = Math.min($img.naturalWidth, availableWidth);
    }

    this.nImgLoaded++;
    if (this.nImgLoaded === this.$imgs.length) {
      if (isPrinting) {
        // call it again when all the images have loaded
        this.rescaleTable();
      }

      encodingImagesLoaded(encodingId);
    }
  };

  rescaleTable() {
    const { availableHeight, availableWidth } = this.props;

    const $data = this.htmlData.current;
    // !! we measure without the transform applied
    const $table = $data.querySelector('table');

    if ($table) {
      // measure without any transform
      $table.style.transformOrigin = null;
      $table.style.transform = null;

      // scrollHeight is what we want (see https://developer.mozilla.org/en-US/docs/Web/API/CSS_Object_Model/Determining_the_dimensions_of_elements#How_big_is_the_content.3F) but it doesn't give fractional value so we also try from the rect.
      let rect1st = $table.getBoundingClientRect();
      const unscaledWidth = Math.max($table.scrollWidth, rect1st.width);
      const unscaledHeight = Math.max($table.scrollHeight, rect1st.height);

      // take into account padding / margin
      const innerHeight =
        availableHeight > 2 * tableObjectPadding
          ? availableHeight - 2 * tableObjectPadding
          : availableHeight;

      const innerWidth =
        availableWidth > tableObjectMarginLeft + tableObjectMarginRight
          ? availableWidth - tableObjectMarginLeft - tableObjectMarginRight
          : availableWidth;

      const rw = innerWidth / unscaledWidth;
      const rh = innerHeight / unscaledHeight;
      const printScale = Math.min(rw, rh, 1); // only scale down, not up

      $table.style.transformOrigin = '0 0';
      $table.style.transform = `scale(${printScale})`;

      // re measure
      let rect2nd = $table.getBoundingClientRect();

      // re position
      const offsetLeft =
        availableWidth > tableObjectMarginLeft + tableObjectMarginRight
          ? (availableWidth - rect2nd.width) / 2
          : (availableWidth - rect2nd.width) / 2;

      const offsetTop = (availableHeight - rect2nd.height) / 2;

      // console.log(
      //   `offsetLeft: ${offsetLeft}
      //  offsetTop: ${offsetTop}
      // availableWidth: ${availableWidth}
      // availableHeight: ${availableHeight}
      // unscaledWidth: ${unscaledWidth}
      // scrollWidth: ${$table.scrollWidth}
      // original width: ${rect1st.width}
      // unscaledHeight: ${unscaledHeight}
      // scaled width: ${rect2nd.width}
      // scaled heightt: ${rect2nd.height}
      // printScale: ${printScale}`
      // );

      $data.style.top = `${offsetTop}px`;
      $data.style.left = `${offsetLeft}px`;
    }
  }

  handleResize = () => {
    const { isPrinting, preventPrintRescaling } = this.props;
    if (isPrinting || preventPrintRescaling) {
      this.rescaleTable();
    }
  };

  handleScroll = () => {
    let $data = this.htmlData.current;
    let $viewport = this.viewport.current;
    let $scrollV = this.scrollV.current;

    if ($data && $viewport && $scrollV) {
      let tableDataRect = $data.getBoundingClientRect();
      let viewportRect = $viewport.getBoundingClientRect();
      let scrollVRect = $scrollV.getBoundingClientRect();

      this.setState({
        leftShadow: tableDataRect.left < viewportRect.left,
        rightShadow: tableDataRect.right > viewportRect.right + 2,
        bottomShadow: tableDataRect.bottom > viewportRect.bottom,
        headerFloat: tableDataRect.top < scrollVRect.top - 2,
        tableFullView:
          tableDataRect.left >= viewportRect.left &&
          tableDataRect.right <= viewportRect.right &&
          tableDataRect.top >= viewportRect.top &&
          tableDataRect.bottom <= viewportRect.bottom
      });
    }
  };

  render() {
    const { content, className, isPrinting, availableHeight } = this.props;

    if (isPrinting) {
      return (
        <div
          className="table-object table-object--print"
          style={{ height: `${availableHeight}px` }}
        >
          <div className="table-object__data" ref={this.htmlData}>
            <Value escHtml={false}>{content.html}</Value>
          </div>
        </div>
      );
    }

    return (
      <div
        id={this.props.id}
        className={classNames(
          'table-object',
          'table-object--screen',
          this.state.tableFullView
            ? ' table-object--fullview'
            : ' table-object--scrolling',
          className
        )}
      >
        <div className="table-object__viewport" ref={this.viewport}>
          <div
            className={
              'table-object__left-shadow ' +
              (this.state.leftShadow ? 'active' : 'inactive')
            }
          />
          <div
            className={
              'table-object__right-shadow ' +
              (this.state.rightShadow ? 'active' : 'inactive')
            }
          />
          <div
            className={
              'table-object__bottom-shadow ' +
              (this.state.bottomShadow ? 'active' : 'inactive')
            }
          />
          <div
            className="table-object__scroll-h"
            onScrollCapture={this.handleScroll}
          >
            <div className="table-object__shrinkwrap">
              <Value
                escHtml={false}
                role="presentation"
                className={
                  'table-object__header ' +
                  (this.state.headerFloat
                    ? 'header--float'
                    : 'header--no-float')
                }
              >
                {content.html}
              </Value>
              <div
                className="table-object__scroll-v"
                ref={this.scrollV}
                onScrollCapture={this.handleScroll}
              >
                <div className="table-object__data" ref={this.htmlData}>
                  <Value escHtml={false}>{content.html}</Value>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default connect(
  null,
  {
    encodingImagesLoaded
  }
)(TableObject);
