import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { arrayify, getId, unprefix } from '@scipe/jsonld';
import { Hyperlink, Span, BemTags } from '@scipe/ui';
import Droplet from '../droplet';
import Iconoclass from '@scipe/iconoclass';

export default class GraphIssues extends React.Component {
  static propTypes = {
    query: PropTypes.object,
    graph: PropTypes.object,
    issue: PropTypes.object // the issue being viewed (if any)
  };

  static defaultProps = {
    graph: {}
  };

  render() {
    const { graph, issue, query } = this.props;

    const potentialIssues = arrayify(graph.isPartOf).filter(part => {
      const issueId = getId(part);
      return issueId && issueId.startsWith('issue:');
    });

    const bem = BemTags();

    return (
      <div className={bem`graph-issues`}>
        <header className={bem`__header`}>Issues</header>

        <ul className={bem`__list`}>
          {potentialIssues.map(potentialIssue => (
            <li key={getId(potentialIssue)} className={bem`__list-item`}>
              <div className={bem`__list-item-contents`}>
                <Iconoclass
                  iconName={
                    getId(potentialIssue) === getId(issue) ? 'eye' : 'journal'
                  }
                  size="18px"
                  className={bem`__viewing-icon`}
                />

                <Droplet node={potentialIssue}>
                  {potentialIssue => (
                    <Fragment>
                      <Hyperlink
                        page="article"
                        graph={graph}
                        issue={potentialIssue}
                        query={query}
                      >
                        {potentialIssue['@type'] === 'PublicationIssue' ? (
                          <span className={bem`__issue-name`}>
                            Issue {potentialIssue.issueNumber}
                          </span>
                        ) : (
                          <Span className={bem`__issue-name`}>
                            {potentialIssue.name ||
                              (unprefix(getId(potentialIssue)) || '').split(
                                '/',
                                2
                              )[1]}
                          </Span>
                        )}
                      </Hyperlink>
                    </Fragment>
                  )}
                </Droplet>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }
}
