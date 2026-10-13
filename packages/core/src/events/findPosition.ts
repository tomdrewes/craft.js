import { Node, NodeInfo, DropPosition } from '../interfaces';

// Returns the index into childDims of the child the position is relative to.
// A reversed axis is searched in visual order, which is reverse index order.
export default function findPosition(
  parent: Node,
  childDims: NodeInfo[],
  posX: number,
  posY: number
) {
  const reversed = childDims.length > 0 && childDims[0].reversed;
  const dims = reversed ? [...childDims].reverse() : childDims;

  let result: DropPosition = {
    parent,
    index: 0,
    where: 'before',
  };

  let leftLimit = 0,
    xLimit = 0,
    dimRight = 0,
    yLimit = 0,
    xCenter = 0,
    yCenter = 0,
    dimDown = 0;

  // Each dim is: Top, Left, Height, Width
  for (let i = 0, len = dims.length; i < len; i++) {
    const dim = dims[i];

    // Right position of the element. Left + Width
    dimRight = dim.left + dim.outerWidth;
    // Bottom position of the element. Top + Height
    dimDown = dim.top + dim.outerHeight;
    // X center position of the element. Left + (Width / 2)
    xCenter = dim.left + dim.outerWidth / 2;
    // Y center position of the element. Top + (Height / 2)
    yCenter = dim.top + dim.outerHeight / 2;
    // Skip if over the limits
    if (
      (xLimit && dim.left > xLimit) ||
      (yLimit && yCenter >= yLimit) || // >= avoid issue with clearfixes
      (leftLimit && dimRight < leftLimit)
    )
      continue;

    result.index = i;
    // If it's not in flow (like 'float' element)
    if (!dim.inFlow) {
      if (posY < dimDown) yLimit = dimDown;
      //If x lefter than center
      if (posX < xCenter) {
        xLimit = xCenter;
        result.where = 'before';
      } else {
        leftLimit = xCenter;
        result.where = 'after';
      }
    } else {
      // If y upper than center
      if (posY < yCenter) {
        result.where = 'before';
        break;
      } else result.where = 'after'; // After last element
    }
  }

  if (reversed) {
    result.index = dims.length - 1 - result.index;
    result.where = result.where === 'before' ? 'after' : 'before';
  }

  return result;
}
