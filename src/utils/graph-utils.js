import romanize from 'romanize';
import { normalizeText } from 'web-verse';
import { arrayify, getId } from '@scipe/jsonld';

export function getOrderedAffiliationMap(
  resource, // hydrated
  start = 1
) {
  const map = new Map();
  // We create a Map (as it preserve order) and be sure to have good insertion
  // ordered so that it can be iterated by insertion order
  let i = start;
  arrayify(resource.author)
    .concat(arrayify(resource.contributor))
    .forEach(role => {
      const affiliations = arrayify(role.roleAffiliation);
      affiliations.forEach(affiliation => {
        const affiliationId = getId(affiliation);
        if (affiliationId) {
          if (!map.has(affiliationId)) {
            map.set(affiliationId, {
              label: romanize(i++).toLowerCase(),
              affiliation
            });
          }
        }
      });
    });

  return map;
}

// TODO improve
export function isEditorInChief(title = '') {
  title = normalizeText(title)
    .toLowerCase()
    .trim();

  return (
    title === 'ed. in chief' ||
    title === 'ed in chief' ||
    title === 'editor in chief' ||
    title === 'editor-in-chief' ||
    title === 'eic'
  );
}

/**
 * Remove the "pre" part of semver (-0 in 2.0.0-0)
 */
export function getDisplayVersion(version = '', { semverLight = false } = {}) {
  const unpre = version.split('-')[0];

  return semverLight
    ? unpre
        .split('.')
        .slice(0, 2)
        .join('.')
    : unpre;
}
