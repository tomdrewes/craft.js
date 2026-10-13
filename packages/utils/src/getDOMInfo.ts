export const getDOMInfo = (el: HTMLElement) => {
  const {
    x,
    y,
    top,
    left,
    bottom,
    right,
    width,
    height,
  } = el.getBoundingClientRect() as DOMRect;

  const style = window.getComputedStyle(el);

  const margin = {
    left: parseInt(style.marginLeft),
    right: parseInt(style.marginRight),
    bottom: parseInt(style.marginBottom),
    top: parseInt(style.marginTop),
  };

  const padding = {
    left: parseInt(style.paddingLeft),
    right: parseInt(style.paddingRight),
    bottom: parseInt(style.paddingBottom),
    top: parseInt(style.paddingTop),
  };

  // The axis children are laid out on: inFlow is the vertical (block) axis, otherwise horizontal.
  // reversed means the visual order runs against the index order along that axis.
  const layoutAxis = (parent: HTMLElement) => {
    const parentStyle = getComputedStyle(parent);

    switch (parentStyle.display) {
      case 'flex':
      case 'inline-flex': {
        const direction = parentStyle.flexDirection;
        return {
          inFlow: direction.startsWith('column'),
          reversed: direction.endsWith('-reverse'),
        };
      }
      case 'grid':
      case 'inline-grid':
        return { inFlow: false, reversed: false };
    }

    return { inFlow: !!styleInFlow(parentStyle), reversed: false };
  };

  const styleInFlow = (parentStyle: CSSStyleDeclaration) => {
    if (parentStyle.float !== 'none') {
      return;
    }

    switch (style.position) {
      case 'static':
      case 'relative':
        break;
      default:
        return;
    }

    switch (el.tagName) {
      case 'TR':
      case 'TBODY':
      case 'THEAD':
      case 'TFOOT':
        return true;
    }

    switch (style.display) {
      case 'block':
      case 'list-item':
      case 'table':
      case 'flex':
      case 'grid':
        return true;
    }

    return;
  };

  const axis = el.parentElement
    ? layoutAxis(el.parentElement)
    : { inFlow: false, reversed: false };

  return {
    x,
    y,
    top,
    left,
    bottom,
    right,
    width,
    height,
    outerWidth: Math.round(width + margin.left + margin.right),
    outerHeight: Math.round(height + margin.top + margin.bottom),
    margin,
    padding,
    inFlow: axis.inFlow,
    reversed: axis.reversed,
  };
};
