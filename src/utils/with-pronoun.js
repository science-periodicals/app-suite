export default function withPronoun(str) {
  return str.match(/^[a|e|i|o|u]/) ? `an ${str}` : `a ${str}`;
}
