import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import noop from 'lodash/noop';
import { QRCode } from 'react-qr-svg';
import { PrintableColorText } from '@scipe/ui';
import { textify } from '@scipe/jsonld';

export default class PrintableResourceHeader extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    url: PropTypes.object.isRequired,
    resource: PropTypes.object.isRequired,
    isPrinting: PropTypes.bool, // we inject that prop although the component is always rendered in print mode so that the component is re-rendered when the `beforeprint` event is fired.
    preventPrintRescaling: PropTypes.bool,
    onMeasured: PropTypes.func
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
      prevProps.resource !== this.props.resource ||
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
    const { id, className, url, resource } = this.props;
    const identifier = url.hash.substring(1);

    const title = textify(resource.alternateName || 'Unnamed resource');
    return (
      <header
        id={id}
        className={classNames('printable-resource-header', className)}
        ref={this.root}
      >
        <div className="printable-resource-header__bg">
          <svg
            width="100%"
            height="100%"
            className="printable-resource-header__bg-svg"
          >
            <rect
              className="printable-resource-header__bg-svg-rect"
              x="0"
              y="0"
              width="100%"
              height="100%"
              style={{ fill: 'currentColor' }}
            />
          </svg>
        </div>
        <div className="printable-resource-header__title">
          <PrintableColorText>{title}</PrintableColorText>
          {/* <Label>{resource.alternateName || 'Unnamed resource'}</Label> */}
        </div>

        <div className="printable-resource-header__identifier">
          <div className="printable-resource-header__counter">
            <PrintableColorText>{identifier}</PrintableColorText>
          </div>
          <div className="printable-resource-header__qr-code">
            <QRCode
              value={url.href}
              style={{
                width: '50px'
              }}
              bgColor={'#ffffff'}
              fgColor={'#000'}
              level={'Q'}
            />
          </div>
        </div>
      </header>
    );
  }
}
