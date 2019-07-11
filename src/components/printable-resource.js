import React from 'react';
import PropTypes from 'prop-types';
import PrintableResourceHeader from './printable-resource-header';
import PrintableResourceBody from './printable-resource-body';
import PrintableResourceCaption from './printable-resource-caption';
import PrintableResourceFooter from './printable-resource-footer';
import withIsPrinting from '../hoc/with-is-printing';

//console.log('printPageContentWidth', printPageContentWidth);

class PrintableResource extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    journal: PropTypes.object,
    issue: PropTypes.object,
    url: PropTypes.object.isRequired,
    graphId: PropTypes.string.isRequired,
    stageId: PropTypes.string,
    graph: PropTypes.object,
    mainEntity: PropTypes.object,
    resource: PropTypes.object.isRequired,
    blindingData: PropTypes.object.isRequired,

    preventPrintRescaling: PropTypes.bool, // mostly use for development purpose to troubleshoot resizing logic

    // hoc
    isPrinting: PropTypes.bool // we inject that prop although the component is always rendered in print mode so that the component is re-rendered when the `beforeprint` event is fired. That allows us to get accurate measurement of window.innerHeight
  };

  constructor(props) {
    super(props);

    this.root = React.createRef();

    this.state = {
      lastIsPrinting: props.isPrinting,
      pageHeight: null,
      pageWidth: null,
      headerWidth: 0,
      headerHeight: 0,
      captionWidth: 0,
      captionHeight: 0,
      footerWidth: 0,
      footerHeight: 0
    };
  }

  componentDidMount() {
    window.addEventListener('resize', this.handleResize, true);

    const { pageHeight, pageWidth } = getPageDim(this.root.current);

    this.nUpdate = 0;

    this.setState({
      pageHeight,
      pageWidth
    });
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize, true);
  }

  componentDidUpdate(prevProps) {
    const { pageHeight, pageWidth } = getPageDim(this.root.current);

    //    console.log(
    //      `b:${this.props.beforePrint}, a: ${
    //        this.props.afterPrint
    //      }, h: ${pageHeight}, w: ${pageWidth}`
    //    );

    this.nUpdate++;

    if (
      this.nUpdate < 1000 &&
      (pageHeight !== this.state.pageHeight ||
        pageWidth !== this.state.pageWidth)
    ) {
      this.setState({
        pageHeight,
        pageWidth
      });
    }

    if (this.nUpdate >= 1000) {
      console.warn(`nUpdate >= 1000 in PrintableResource`);
    }
  }

  handleResize = () => {
    const { pageHeight, pageWidth } = getPageDim(this.root.current);

    if (
      pageHeight !== this.state.pageHeight ||
      pageWidth !== this.state.pageWidth
    ) {
      this.setState({
        pageHeight,
        pageWidth
      });
    }
  };

  handleHeaderMeasured = ({ width, height }) => {
    this.setState({
      headerWidth: width,
      headerHeight: height
    });
  };

  handleCaptionMeasured = ({ width, height }) => {
    this.setState({
      captionWidth: width,
      captionHeight: height
    });
  };

  handleFooterMeasured = ({ width, height }) => {
    this.setState({
      footerWidth: width,
      footerHeight: height
    });
  };

  render() {
    const {
      journal,
      issue,
      url,
      resource,
      graphId,
      stageId,
      graph,
      mainEntity,
      blindingData,
      isPrinting,
      preventPrintRescaling
    } = this.props;

    const {
      pageHeight,
      pageWidth,
      captionHeight,
      headerHeight,
      footerHeight
    } = this.state;

    if (pageHeight == null || pageWidth == null) return null;

    const maxCaptionHeight = Math.floor((40 / 100) * pageHeight);

    const availableHeight =
      pageHeight -
      Math.min(captionHeight, maxCaptionHeight) -
      headerHeight -
      footerHeight;

    /* account for left + right padding */
    const printableResourceWidth = pageWidth - 36;
    const availableWidth = printableResourceWidth - 36;

    // console.log('print available dims', availableWidth, ' x ', availableHeight);

    return (
      <div className="printable-resource-container">
        <div
          className="printable-resource"
          style={{
            width: `${printableResourceWidth}px`,
            height: `${pageHeight}px`
          }}
        >
          <PrintableResourceHeader
            url={url}
            resource={resource}
            onMeasured={this.handleHeaderMeasured}
            isPrinting={isPrinting}
            preventPrintRescaling={preventPrintRescaling}
          />

          <figure className="printable-resource__content">
            <PrintableResourceBody
              availableHeight={availableHeight}
              availableWidth={availableWidth}
              graphId={graphId}
              stageId={stageId}
              graph={graph}
              resource={resource}
              preventPrintRescaling={preventPrintRescaling}
            />

            <figcaption className="printable-resource-caption-container">
              <PrintableResourceCaption
                journal={journal}
                issue={issue}
                graphId={graphId}
                stageId={stageId}
                graph={graph}
                mainEntity={mainEntity}
                resource={resource}
                maxHeight={maxCaptionHeight}
                blindingData={blindingData}
                onMeasured={this.handleCaptionMeasured}
                isPrinting={isPrinting}
                preventPrintRescaling={preventPrintRescaling}
              />
            </figcaption>
          </figure>

          <PrintableResourceFooter
            url={url}
            onMeasured={this.handleFooterMeasured}
            isPrinting={isPrinting}
            preventPrintRescaling={preventPrintRescaling}
          />
        </div>
      </div>
    );
  }
}

export default withIsPrinting(PrintableResource);

// !! Only call in lifeCycle not used during SSR
function getPageDim() {
  const rect = {
    height: window.innerHeight,
    width: window.innerWidth
  };

  const resolution = rect.width / 8.5;

  // console.log(
  //   'getPageDim width:',
  //   rect.width,
  //   ' x ',
  //   rect.height,
  //   'dpi:',
  //   resolution
  // );

  // http://ryanve.com/lab/dimensions/
  // console.log(`
  //  window.innerWidth: ${window.innerWidth}
  //  window.innerHeight: ${window.innerHeight}
  //  document.documentElement.clientWidth: ${document.documentElement.clientWidth}
  //  window.screen.width: ${window.screen.width}
  //  document.body.clientWidth: ${document.body.clientWidth}
  //  document.body.clientHeight: ${document.body.clientHeight}
  // `);
  return {
    pageHeight: rect.height,
    pageWidth: rect.width,
    dpi: resolution
    //pageHeight: Math.min(rect.height, 936),
    //pageWidth: Math.min(rect.width, 780)
  };
}
