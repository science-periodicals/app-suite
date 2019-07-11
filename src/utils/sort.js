import { arrayify, textify, getId } from '@scipe/jsonld';
import { schema, getAgent } from '@scipe/librarian';

/**
 * sort by name alphabetical order and put objects with undefined names last
 */
export function compareDefinedNames(a, b) {
  if (a.name && b.name) {
    return textify(a.name).localeCompare(textify(b.name));
  }
  if (a.name && !b.name) {
    return -1;
  }
  if (!a.name && b.name) {
    return 1;
  }

  return 0;
}

/**
 * Compare selector identifiers
 * `a` and `b` are annotation or commentAction
 */
export function compareCommentsByIdentifiersAndDateCreated(a, b) {
  const re = /^(v)?(\d+)\.(\d+):([a-zA-Z]+)\.(\d+)\.?(\d+)?$/;

  const ca = a.annotationBody || a.resultComment;
  const cb = b.annotationBody || b.resultComment;

  a =
    (a.annotationTarget && a.annotationTarget.identifier) ||
    (a.object && a.object.identifier) ||
    '';

  b =
    (b.annotationTarget && b.annotationTarget.identifier) ||
    (b.object && b.object.identifier) ||
    '';

  function compareByDateCreated(a = {}, b = {}) {
    if (a.dateCreated && b.dateCreated) {
      return (
        new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime()
      );
    }

    if (a.dateCreated && !b.dateCreated) {
      return -1;
    }
    if (!a.dateCreated && b.dateCreated) {
      return 1;
    }

    // fallback: if there is a thread, put parent first
    if (getId(a.parentItem) && !getId(b.parentItem)) {
      return 1;
    }
    if (!getId(a.parentItem) && getId(b.parentItem)) {
      return -1;
    }

    return 0;
  }

  if (!re.test(a) || !re.test(b)) {
    return compareByDateCreated(ca, cb);
  }

  let [, av, a1, a2, a3, a4 = 0, a5 = 0] = a.match(re);
  let [, bv, b1, b2, b3, b4 = 0, b5 = 0] = b.match(re);

  a1 = parseInt(a1, 10);
  b1 = parseInt(b1, 10);
  a2 = parseInt(a2, 10);
  b2 = parseInt(b2, 10);
  a4 = parseInt(a4, 10);
  b4 = parseInt(b4, 10);
  a5 = parseInt(a5, 10);
  b5 = parseInt(b5, 10);

  if (av && !bv) {
    return 1;
  }

  if (!av && bv) {
    return -1;
  }

  if (a1 !== b1) {
    return a1 - b1;
  }

  if (a2 !== b2) {
    return a2 - b2;
  }

  if (a3 !== b3) {
    return a3.localeCompare(b3);
  }

  if (a4 !== b4) {
    return a4 - b4;
  }

  if (a5 !== b5) {
    return a5 - b5;
  }

  return compareByDateCreated(ca, cb);
}

export function compareAbstracts(a, b) {
  // impact statement first
  if (
    a['@type'] === 'WPImpactStatement' &&
    b['@type'] !== 'WPImpactStatement'
  ) {
    return -1;
  }
  if (a['@type'] !== 'WPImpactStatement' && b['@type'] == 'WPImpactStatement') {
    return 1;
  }

  // shorter content first
  const aValue = textify(a.text);
  const bValue = textify(b.text);
  if (aValue && bValue && aValue.length !== bValue.length) {
    return aValue.length - bValue.length;
  }

  // abstract title by alphabetical order
  const aName = textify(a.name);
  const bName = textify(b.name);
  if (aName && bName) {
    return getId(aName).localeCompare(bName);
  }

  // fallback to make it deterministic
  return getId(a).localeCompare(getId(b));
}

/**
 * This assumes that the citations have been unroled upstream
 */
export function compareCitations(a, b) {
  // first author family name or name (if organization)
  if (a.author && b.author) {
    const aAgent = getAgent(arrayify(a.author)[0]);
    const bAgent = getAgent(arrayify(b.author)[0]);

    if (aAgent && bAgent) {
      if (schema.is(aAgent, 'Person') && schema.is(bAgent, 'Person')) {
        const aFamily = getFamilyName(aAgent);
        const bFamily = getFamilyName(bAgent);

        if (aFamily && !bFamily) {
          return -1;
        }
        if (!aFamily && bFamily) {
          return 1;
        }
        if (aFamily && bFamily) {
          return aFamily.localeCompare(bFamily);
        }
      }

      if (schema.is(aAgent, 'Person') && schema.is(bAgent, 'Organization')) {
        return -1;
      }
      if (schema.is(aAgent, 'Organization') && schema.is(bAgent, 'Person')) {
        return 1;
      }

      const aName = textify(aAgent.name);
      const bName = textify(bAgent.name);
      if (
        schema.is(aAgent, 'Organization') &&
        schema.is(bAgent, 'Organization')
      ) {
        if (aName && !bName) {
          return -1;
        }
        if (!aName && bName) {
          return 1;
        }
        if (aName && bName) {
          return aName.localeCompare(bName);
        }
      }
    }
  }
  if (a.author && !b.author) {
    return -1;
  }
  if (!a.author && b.author) {
    return 1;
  }

  // title
  const aName = textify(a.name);
  const bName = textify(b.name);
  if (aName && bName) {
    return aName.localeCompare(bName);
  }

  // fallback to make it deterministic
  return getId(a).localeCompare(getId(b));
}

function getFamilyName(person) {
  let familyName = textify(person.familyName);
  if (!familyName && person.name) {
    const name = textify(person.name);
    if (name) {
      // TODO handle honnorific suffix
      const splt = name.split(/\s+/);
      familyName = splt[splt.length - 1];
    }
  }
  return familyName;
}

// TODO compareEditors using isEditorInChief util from utils/graph-utils.js
