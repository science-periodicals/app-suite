import React from 'react';
import PropTypes from 'prop-types';
import noop from 'lodash/noop';
import { textify, unprefix, getId } from '@scipe/jsonld';
import { getScopeId, getPurl } from '@scipe/librarian';
import {
  Chordal,
  Span,
  getCssType,
  ShareMenu,
  Menu,
  MenuItem,
  Value
} from '@scipe/ui';
import GraphIssues from './graph-issues';
import PrintPdfMenuItem from '../print-pdf-menu-item';
import ScrollLink from '../scroll-link';
import ShellLink from '../shell/shell-link';

export default class ReaderToC extends React.Component {
  static propTypes = {
    journal: PropTypes.object,
    tocData: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        entries: PropTypes.arrayOf(
          PropTypes.shape({
            section: PropTypes.object,
            h2: PropTypes.object,
            resourcesByType: PropTypes.object
          })
        ).isRequired
      })
    ),
    graph: PropTypes.object,
    issue: PropTypes.object, // the issue being viewed (if any)
    preview: PropTypes.bool,
    mainEntityId: PropTypes.string,
    resourceMap: PropTypes.object,
    chordalData: PropTypes.array,
    location: PropTypes.object.isRequired,
    query: PropTypes.object,
    onClick: PropTypes.func
  };

  static defaultProps = {
    graph: {},
    resourceMap: {},
    onClick: noop
  };

  render() {
    const {
      journal,
      preview,
      onClick,
      chordalData,
      mainEntityId,
      resourceMap,
      location,
      query,
      issue,
      graph,
      tocData
    } = this.props;

    const mainEntity = resourceMap[mainEntityId] || {};

    return (
      <nav className="reader-toc" onClick={onClick}>
        <div className="reader-toc__chordal">
          <Chordal noAnimation={true} data={chordalData} size={80} />
        </div>

        {!!tocData && (
          <ol role="directory">
            {tocData
              .slice(1)
              .filter(({ entries }) => entries && entries.length)
              .map(({ id, entries }) => (
                <li key={id}>
                  <ul className="sa__clear-list-styles">
                    {entries.map(data => (
                      <li
                        key={
                          (data.section && data.section.id) ||
                          (data.h2 && data.h2.id)
                        }
                      >
                        <ScrollLink
                          prettifyHash={true}
                          to={{
                            pathname: location.pathname,
                            search: location.search,
                            hash: `#${(data.section && data.section.id) ||
                              (data.h2 && data.h2.id)}`
                          }}
                        >
                          <Value escHtml={false}>
                            {data.h2.$node.innerHTML ||
                              data.h2.$node.textContent}
                          </Value>
                        </ScrollLink>

                        {!!data.resourcesByType && (
                          <ul className="sa__clear-list-styles">
                            {Object.keys(data.resourcesByType)
                              .sort()
                              .map(type => (
                                <li key={type}>
                                  {data.resourcesByType[type].length > 0 && (
                                    <ul className="reader-toc__resource-list">
                                      {data.resourcesByType[type].map(
                                        resource => (
                                          <li
                                            key={getId(resource)}
                                            className="reader-toc__resource-list__item"
                                          >
                                            <div
                                              className={`reader-toc__dot color-${getCssType(
                                                type
                                              )}`}
                                            />
                                            <ShellLink
                                              type="resource"
                                              nodeId={getId(resource)}
                                            >
                                              <Span>
                                                {resource.alternateName}
                                              </Span>
                                            </ShellLink>
                                          </li>
                                        )
                                      )}
                                    </ul>
                                  )}
                                </li>
                              ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
          </ol>
        )}

        <ul className="reader-toc__share-list">
          <li className="reader-toc__share-list-item toc__share-list-item--social">
            <ShareMenu
              className="permalink__menu"
              portal={true}
              iconSize={18}
              align="left"
              title="Share"
              social={true}
              url={getPurl(graph) || graph.url}
              name={textify(mainEntity.name)}
              description={textify(mainEntity.description)}
            />
          </li>
          <li className="reader-toc__share-list-item toc__share-list-item--files">
            <Menu
              className="download__menu"
              portal={true}
              icon={'download'}
              iconSize={18}
              align="left"
              title="Download"
            >
              <PrintPdfMenuItem
                journal={journal}
                graph={graph}
                issue={issue}
                preview={preview}
                query={query}
              />
              <MenuItem
                icon={{ iconName: 'hypermedia', size: '24px' }}
                href={`/graph/${unprefix(getScopeId(graph))}?${
                  graph.version ? `version=${graph.version}&` : ''
                }nodes=true&potentialActions=bare`}
                download="graph.jsonld"
              >
                Download JSON-LD
              </MenuItem>
            </Menu>
          </li>
        </ul>

        {!preview && <GraphIssues graph={graph} issue={issue} query={query} />}
      </nav>
    );
  }
}
