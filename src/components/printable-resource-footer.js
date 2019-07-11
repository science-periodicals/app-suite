import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import noop from 'lodash/noop';
import { PrintableColorText } from '@scipe/ui';

export default class PrintableResourceFooter extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    url: PropTypes.object.isRequired,
    onMeasured: PropTypes.func,
    preventPrintRescaling: PropTypes.bool,
    isPrinting: PropTypes.bool // we inject that prop although the component is always rendered in print mode so that the component is re-rendered when the `beforeprint` event is fired.
  };

  static defaultProps = {
    onMeasured: noop
  };

  constructor(props) {
    super(props);
    this.root = React.createRef();
    this.height = 0;
    this.width = 0;
  }

  componentDidMount() {
    window.addEventListener('resize', this.handleResize, true);
    this.measure();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize, true);
  }

  componentDidUpdate(prevProps) {
    if (
      prevProps.url !== this.props.url ||
      prevProps.isPrinting !== this.props.isPrinting
    ) {
      this.measure();
    }
  }

  handleResize = () => {
    this.measure();
  };

  measure() {
    const { onMeasured, preventPrintRescaling } = this.props;
    if (preventPrintRescaling) {
      return;
    }

    const $el = this.root.current;

    if ($el) {
      const rect = $el.getBoundingClientRect();
      if (this.height !== rect.height || this.width !== rect.width) {
        this.height = rect.height;
        this.width = rect.width;
        onMeasured({ width: this.width, height: this.height });
      }
    }
  }

  render() {
    const { id, className, url } = this.props;

    return (
      <footer
        id={id}
        ref={this.root}
        className={classNames('printable-resource-footer', className)}
      >
        <div className="printable-resource-footer__bg">
          <svg
            width="100%"
            height="100%"
            className="printable-resource-footer__bg-svg"
          >
            <rect
              className="printable-resource-footer__bg-svg-rect"
              x="0"
              y="0"
              width="100%"
              height="100%"
              style={{ fill: 'currentColor' }}
            />
          </svg>
        </div>
        <PrintableColorText>{url.href}</PrintableColorText>
      </footer>
    );
  }
}
