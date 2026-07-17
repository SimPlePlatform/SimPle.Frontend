import '@testing-library/jest-dom';

// jsdom does not implement scrollTo — components that scroll containers (e.g. ChatPanel) need a no-op.
if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {};
}
