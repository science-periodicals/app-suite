import flatten from 'lodash/flatten';
import { createKey, createHash, normalizeText } from 'web-verse';
import { prefix, unprefix, textify, arrayify, getId } from '@scipe/jsonld';
import { getTableObjectFromNode } from './table-object';
import groupBy from 'lodash/groupBy';
import slug from 'slug';
import { compareAbstracts } from './sort';

export const reDocumentObjectContentType = /^text\/html/;

/**
 * Returns the canonical `DocumentObject` (encoding) associated with a
 * `ScholarlyArticle` resource
 */
export function getCanonicalDocumentObject(
  resource,
  nodeMap // optional only needed if `resource` is flat
) {
  const encoding = arrayify(resource.encoding).find(encoding => {
    if (nodeMap) {
      encoding = nodeMap[getId(encoding)] || encoding;
    }

    return reDocumentObjectContentType.test(encoding.fileFormat);
  });

  return nodeMap ? nodeMap[getId(encoding)] || encoding : encoding;
}

function _getNodeMap(articleBody = [], $nodeMap) {
  $nodeMap = $nodeMap || {};
  articleBody.forEach(node => {
    $nodeMap[node.id] = node;
    if (node.children) {
      _getNodeMap(node.children, $nodeMap);
    }
  });
  return $nodeMap;
}

export function getArticleDataFromDocument(document, encodingId) {
  // TODO articleFrontMatter
  let extracted = _extractNodes(
    { encodingId, cnt: 0, annotableIndex: 0 },
    document.querySelector(`[property="${prefix('articleBody')}"]`)
  );
  const articleBody = extracted.$nodes.filter(Boolean);
  const articleBodyNodeMap = _getNodeMap(articleBody);

  // back matter:
  const $backMatter = document.querySelector(
    `[property="${prefix('articleBackMatter')}"]`
  );

  // we remove the supporting info so that they are indexed on a separate counter
  let $supportingInformation;
  if ($backMatter) {
    $supportingInformation = $backMatter.querySelector(
      `[typeof="${prefix('WPSupportingInformation')}"]`
    );

    // remove SI from back matter
    if ($supportingInformation) {
      $supportingInformation = $supportingInformation.parentNode.removeChild(
        $supportingInformation
      );
    }
  }

  // extract back matter
  // Note that we treat SI as not part of back matter
  extracted = _extractNodes(
    {
      encodingId,
      cnt: extracted.ctx.cnt, // We keep using the same counter (`extracted.ctx.ctn`)
      annotableIndex: 0
    },
    $backMatter
  );

  const articleBackMatter = extracted.$nodes.filter(Boolean);
  const articleBackMatterNodeMap = _getNodeMap(articleBackMatter);

  let articleSupportingInformation, articleSupportingInformationNodeMap;
  if ($supportingInformation) {
    // extract SI but reset annotableIndex
    // we wrap SI in an section so that _extractNodes does the right thing
    const $siWrapper = document.createElement('section');
    $siWrapper.appendChild($supportingInformation);

    extracted = _extractNodes(
      {
        encodingId,
        cnt: extracted.ctx.cnt, // We keep using the same counter (`extracted.ctx.ctn`)
        annotableIndex: 0
      },
      $siWrapper
    );
    articleSupportingInformation = extracted.$nodes.filter(Boolean);
    articleSupportingInformationNodeMap = _getNodeMap(
      articleSupportingInformation
    );
  } else {
    articleSupportingInformation = [];
    articleSupportingInformationNodeMap = {};
  }

  const byLocationId = [
    {
      prefix: 'B',
      nodes: Object.values(articleBodyNodeMap)
    },
    {
      prefix: 'C',
      nodes: Object.values(articleBackMatterNodeMap)
    },
    {
      prefix: 'D',
      nodes: Object.values(articleSupportingInformationNodeMap)
    }
  ].reduce((map, { prefix, nodes }) => {
    nodes.forEach(node => {
      if (node.annotableIndex != null) {
        map[`${prefix}.${node.annotableIndex}`] = node;
      }
    });

    return map;
  }, {});

  return {
    articleBody,
    articleBackMatter,
    articleSupportingInformation,
    $nodeMap: Object.assign(
      {},
      articleBodyNodeMap,
      articleBackMatterNodeMap,
      articleSupportingInformationNodeMap
    ),
    byLocationId,
    stats: wordCount(document.body),
    document
  };
}

export function wordCount($el, _stats) {
  _stats = _stats || { words: 0, characters: 0 };

  for (let i = 0; i < $el.childNodes.length; i++) {
    let node = $el.childNodes[i];
    if (node.nodeType === Node.TEXT_NODE) {
      let text = node.nodeValue.trim();
      _stats.words += (
        text.replace(/['";:,.?¿\-!¡]+/g, '').match(/\S+/g) || []
      ).length;
      _stats.characters += normalizeText(text).length;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      wordCount(node, _stats);
    }
  }

  return _stats;
}

function _extractNodes(ctx, $body) {
  let $nodes = [];

  if (!$body) {
    return {
      ctx,
      $nodes
    };
  }

  const treeWalker = document.createTreeWalker(
    $body,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, // eslint-disable-line no-bitwise
    { acceptNode: node => NodeFilter.FILTER_ACCEPT },
    false
  );

  const displayableElements = new Set([
    'ADDRESS',
    'ASIDE',
    'DT',
    'DD',
    'FOOTER',
    'FORM',
    'HEADER',
    'H1',
    'H2',
    'H3',
    'H4',
    'H5',
    'H6',
    'P',
    'PRE',
    'FIGURE',
    'TABLE',
    'MATH',
    'math',
    'SPAN',
    'A',
    'ABBR',
    'CODE',
    'BLOCKQUOTE'
  ]);

  // skip globally encompassing <section> or <article>
  // <body><section>...</section></body>
  if (treeWalker.currentNode.tagName === 'BODY') {
    //skip empty text node
    while (
      treeWalker.currentNode.nodeType === Node.TEXT_NODE &&
      !treeWalker.currentNode.textContent.replace(/\s+/, '')
    ) {
      treeWalker.nextNode();
    }

    if (treeWalker.currentNode.nodeType === Node.ELEMENT_NODE) {
      let wsfreeChildren = Array.prototype.filter.call(
        treeWalker.currentNode.children,
        $el => {
          return !(
            $el.nodeType === Node.TEXT_NODE &&
            !$el.textContent.replace(/\s+/, '')
          );
        }
      );

      //skip body
      treeWalker.nextNode();
      if (
        wsfreeChildren.length === 1 &&
        (wsfreeChildren[0].tagName === 'SECTION' ||
          wsfreeChildren[0].tagName === 'ARTICLE')
      ) {
        //get to the section (pass empty text node)
        while (
          treeWalker.currentNode.nodeType === Node.TEXT_NODE &&
          !treeWalker.currentNode.textContent.replace(/\s+/, '')
        ) {
          treeWalker.nextNode();
        }
        //skip section
        treeWalker.nextNode();
      }
    }
  } else {
    treeWalker.nextNode();
  }

  while (true) {
    if (treeWalker.currentNode.nodeType === Node.TEXT_NODE) {
      if (treeWalker.currentNode.textContent.replace(/\s+/, '')) {
        $nodes.push(_wrapNode(ctx, treeWalker.currentNode));
      }
      if (!_fastForward(treeWalker)) {
        break;
      }
    } else if (
      treeWalker.currentNode.tagName === 'UL' ||
      treeWalker.currentNode.tagName === 'OL'
    ) {
      $nodes.push(
        _wrapNode(
          ctx,
          treeWalker.currentNode,
          Array.prototype.map.call(treeWalker.currentNode.children, $li => {
            return _wrapNode(ctx, $li);
          })
        )
      );

      if (!_fastForward(treeWalker)) {
        break;
      }
    } else if (treeWalker.currentNode.tagName === 'SECTION') {
      if (
        Array.prototype.some.call(treeWalker.currentNode.children, $el => {
          return (
            ($el.nodeType === Node.TEXT_NODE &&
              $el.textContent.replace(/\s+/, '')) ||
            ($el.nodeType !== Node.TEXT_NODE && $el.tagName !== 'SECTION')
          );
        })
      ) {
        $nodes.push(
          _wrapNode(
            ctx,
            treeWalker.currentNode,
            _extractNodes(ctx, treeWalker.currentNode).$nodes
          )
        );
      }

      if (!_fastForward(treeWalker)) {
        break;
      }
    } else if (displayableElements.has(treeWalker.currentNode.tagName)) {
      $nodes.push(_wrapNode(ctx, treeWalker.currentNode));
      if (!_fastForward(treeWalker)) {
        break;
      }
    } else {
      if (!treeWalker.nextNode()) {
        //move to nextNode, if no next node, we are done
        break;
      }
    }
  }

  return { ctx, $nodes };
}

function _fastForward(treeWalker) {
  if (treeWalker.nextSibling()) {
    return treeWalker.currentNode;
  } else {
    let $parent;
    //find the first parentNode with siblings and move to the next sibling
    while (($parent = treeWalker.parentNode() && $parent !== treeWalker.root)) {
      if (treeWalker.nextSibling()) {
        return treeWalker.currentNode;
      }
    }
    return null;
  }
}

function _wrapNode(ctx, $node, children) {
  if (!$node) return;
  let id;
  if ($node.nodeType === Node.ELEMENT_NODE && $node.hasAttribute('id')) {
    id = $node.getAttribute('id');
    $node.removeAttribute('id'); // we will put the id back in the wrapper (`node`)
    ctx.cnt++;
  } else {
    // we enforce deterministic ids
    id = `${ctx.encodingId}::${ctx.cnt++}`;
  }

  let node = {
    id: id,
    $node: $node,
    key: createKey($node),
    hash: createHash($node)
  };

  if ($node.tagName === 'SECTION') {
    node.stats = wordCount($node);
    if ($node.hasAttribute('typeof')) {
      node.type = unprefix($node.getAttribute('typeof'));
    }
  } else if ($node.tagName === 'TABLE') {
    node.tableObject = getTableObjectFromNode($node);
  }

  if (children) {
    node.children = children;
  }

  if (
    $node.tagName !== 'SECTION' &&
    $node.tagName !== 'OL' &&
    $node.tagName !== 'UL'
  ) {
    node.annotableIndex = ctx.annotableIndex;
    ctx.annotableIndex++;
  }

  return node;
}

export function getLocationOptions(
  { articleBody = [], articleSupportingInformation = [] } = {},
  nodeMap // from the Graph (or release)
) {
  const opts = [];

  articleBody.forEach(node => {
    const indexedNode = indexAnnotableNode(node, nodeMap, 'B.');
    if (indexedNode) {
      if (Array.isArray(indexedNode)) {
        opts.push(...indexedNode);
      } else {
        opts.push(indexedNode);
      }
    }
  });

  articleSupportingInformation.forEach(node => {
    const indexedNode = indexAnnotableNode(node, nodeMap, 'D.');
    if (indexedNode) {
      if (Array.isArray(indexedNode)) {
        opts.push(...indexedNode);
      } else {
        opts.push(indexedNode);
      }
    }
  });

  return opts;
}

function indexAnnotableNode(node, nodeMap, prefix) {
  if (node.annotableIndex == null) {
    if (node.children) {
      if (node.$node.tagName === 'SECTION') {
        // we need re root to the title (if any)
        const hx = node.children.find(node =>
          /^H[1-6]$/.test(node.$node.tagName)
        );
        if (hx) {
          const indexedNode = {
            text: `${prefix}${hx.annotableIndex}`,
            description: normalizeText(hx.$node.textContent)
          };
          const children = flatten(
            node.children
              .filter(node => node !== hx)
              .map(node => indexAnnotableNode(node, nodeMap, prefix))
              .filter(Boolean)
          );
          if (children.length) {
            indexedNode.children = children;
          }
          return indexedNode;
        }
      } else if (node.$node.tagName === 'UL' || node.$node.tagName === 'OL') {
        // we don't recurse (only top level LI are annotable / referencable)
        const indexedItems = node.children
          .filter(node => node.annotableIndex != null)
          .map(node => {
            return {
              text: `${prefix}${node.annotableIndex}`,
              description: normalizeText(node.$node.textContent)
            };
          });
        if (indexedItems.length) {
          return indexedItems;
        }
      }
    }
  } else {
    if (
      (node.$node.tagName === 'FIGURE' ||
        node.$node.tagName === 'ASIDE' ||
        node.$node.tagName === 'TABLE') &&
      node.$node.hasAttribute('typeof') &&
      (node.$node.hasAttribute('resource') || node.$node.hasAttribute('about'))
    ) {
      const resourceId =
        node.$node.getAttribute('resource') || node.$node.getAttribute('about');
      if (resourceId && resourceId in nodeMap) {
        const resource = nodeMap[resourceId];
        if (resource) {
          return {
            text: `${prefix}${node.annotableIndex}`,
            description: normalizeText(
              resource.alternateName ||
                resource.name ||
                textify(resource.caption)
            )
          };
        }
      }
    } else {
      const indexedNode = {
        text: `${prefix}${node.annotableIndex}`,
        description: normalizeText(node.$node.textContent)
      };
      if (node.children) {
        const children = flatten(
          node.children
            .map(node => indexAnnotableNode(node, nodeMap, prefix))
            .filter(Boolean)
        );
        if (children.length) {
          indexedNode.children = children;
        }
      }
      return indexedNode;
    }
  }
}

export function getTocData(
  graph = {},
  nodeMap = {},
  contentMap = {},
  { includeNotes = false } = {}
) {
  let tocData;
  const mainEntity = nodeMap[getId(graph.mainEntity)];
  if (mainEntity) {
    let content;
    const encodings = arrayify(mainEntity.encoding);
    for (const encoding of encodings) {
      const _content = contentMap[getId(encoding)];
      if (_content && _content.articleBody) {
        content = _content;
        break;
      }
    }

    if (content) {
      const abstracts = arrayify(mainEntity.detailedDescription)
        .map(detailedDescription => nodeMap[getId(detailedDescription)])
        .filter(abstract => abstract && abstract.text && abstract.name)
        .sort(compareAbstracts);

      const frontMatterEntries = [];
      if (mainEntity.author) {
        frontMatterEntries.push({
          h2: {
            id: 'authors',
            $node: { textContent: 'Authors' }
          }
        });
      }
      if (mainEntity.contributor) {
        frontMatterEntries.push({
          h2: {
            id: 'contributors',
            $node: { textContent: 'Contributors' }
          }
        });
      }
      if (abstracts.length) {
        frontMatterEntries.push(
          ...abstracts.map(abstract => {
            const name = textify(abstract.name);
            return {
              h2: {
                id: slug(name, { lower: true }),
                $node: { textContent: name }
              }
            };
          })
        );
      }

      tocData = [
        {
          id: 'articleFrontMatter',
          title: 'Front Matter',
          entries: frontMatterEntries
        }
      ].concat(
        [
          { id: 'articleBody', title: 'Article Body' },
          { id: 'articleBackMatter', title: 'Back Matter' }
        ].map(({ id, title }) => {
          return {
            id,
            title,
            entries: (id === 'articleBackMatter'
              ? content[id].concat(
                  arrayify(content.articleSupportingInformation)
                )
              : content[id]
            )
              .map(section => {
                const h2 = arrayify(section.children).find(
                  child => child.$node.localName === 'h2'
                );
                if (h2) {
                  return {
                    section,
                    h2,
                    resourcesByType: groupBy(
                      getResources(section)
                        .map(resource => {
                          const id =
                            resource.$node.getAttribute('resource') ||
                            resource.$node.getAttribute('about');

                          return nodeMap[id];
                        })
                        .filter(Boolean),
                      r => r['@type']
                    )
                  };
                }
              })
              .filter(Boolean)
              .concat(
                id === 'articleBackMatter' && includeNotes
                  ? {
                      h2: {
                        id: 'notes',
                        $node: { textContent: 'Notes' }
                      }
                    }
                  : []
              )
          };
        })
      );
    }
  }

  return tocData;
}

function getResources(section, _resources = []) {
  if (section.children) {
    section.children.forEach(child => {
      if (
        (child.$node.hasAttribute('resource') ||
          child.$node.hasAttribute('about')) &&
        child.$node.hasAttribute('typeof') &&
        (child.$node.localName === 'figure' ||
          child.$node.localName === 'table' ||
          child.$node.localName === 'aside')
      ) {
        _resources.push(child);
      }

      if (child.children) {
        getResources(child, _resources);
      }
    });
  }

  return _resources;
}
