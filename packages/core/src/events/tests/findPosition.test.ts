import { getDOMInfo } from '@craftjs/utils';

import { Node, NodeInfo } from '../../interfaces';
import findPosition from '../findPosition';

// left, top, width, height
type Rect = [number, number, number, number];

const baseStyle = {
  display: 'block',
  position: 'static',
  float: 'none',
  flexDirection: 'row',
  marginLeft: '0',
  marginRight: '0',
  marginTop: '0',
  marginBottom: '0',
  paddingLeft: '0',
  paddingRight: '0',
  paddingTop: '0',
  paddingBottom: '0',
};

// jsdom does no layout, so computed styles and rects are faked per element
const styles = new Map<Element, Record<string, string>>();

beforeEach(() => {
  styles.clear();
  jest.spyOn(window, 'getComputedStyle').mockImplementation(
    (el) =>
      (({
        ...baseStyle,
        ...styles.get(el),
      } as unknown) as CSSStyleDeclaration)
  );
});

afterEach(() => {
  jest.restoreAllMocks();
});

const layout = (
  parentStyle: Record<string, string>,
  children: Array<{ rect: Rect; style?: Record<string, string> }>
): NodeInfo[] => {
  const parent = document.createElement('div');
  styles.set(parent, parentStyle);

  return children.map(({ rect: [left, top, width, height], style }, i) => {
    const el = document.createElement('div');
    parent.appendChild(el);
    styles.set(el, style || {});
    el.getBoundingClientRect = () =>
      ({
        x: left,
        y: top,
        left,
        top,
        width,
        height,
        right: left + width,
        bottom: top + height,
      } as DOMRect);
    return { id: `node-${i}`, ...getDOMInfo(el) };
  });
};

const parent = ({ id: 'parent', data: { nodes: [] } } as unknown) as Node;

const find = (dims: NodeInfo[], x: number, y: number) => {
  const { index, where } = findPosition(parent, dims, x, y);
  return { index, where };
};

// Three 20px children laid out along an axis, in index order or reversed
const row: Rect[] = [
  [0, 0, 20, 20],
  [20, 0, 20, 20],
  [40, 0, 20, 20],
];
const column: Rect[] = [
  [0, 0, 100, 20],
  [0, 20, 100, 20],
  [0, 40, 100, 20],
];
const children = (rects: Rect[], style?: Record<string, string>) =>
  rects.map((rect) => ({ rect, style }));

describe('findPosition', () => {
  describe('flex column', () => {
    const dims = () =>
      layout({ display: 'flex', flexDirection: 'column' }, children(column));

    it('is on the vertical axis', () => {
      expect(dims().map((d) => [d.inFlow, d.reversed])).toEqual([
        [true, false],
        [true, false],
        [true, false],
      ]);
    });

    it('finds the position above, between and below every child', () => {
      expect(find(dims(), 50, -5)).toEqual({ index: 0, where: 'before' });
      expect(find(dims(), 50, 19)).toEqual({ index: 1, where: 'before' });
      expect(find(dims(), 50, 39)).toEqual({ index: 2, where: 'before' });
      expect(find(dims(), 50, 70)).toEqual({ index: 2, where: 'after' });
    });
  });

  describe.each(['flex', 'inline-flex'])('%s row', (display) => {
    // Flex items are blockified, so their own display would suggest the vertical axis
    const dims = () => layout({ display, flexDirection: 'row' }, children(row));

    it('is on the horizontal axis', () => {
      expect(dims().map((d) => [d.inFlow, d.reversed])).toEqual([
        [false, false],
        [false, false],
        [false, false],
      ]);
    });

    it('finds the position before, between and after every child', () => {
      expect(find(dims(), -5, 10)).toEqual({ index: 0, where: 'before' });
      expect(find(dims(), 19, 10)).toEqual({ index: 1, where: 'before' });
      expect(find(dims(), 39, 10)).toEqual({ index: 2, where: 'before' });
      expect(find(dims(), 70, 10)).toEqual({ index: 2, where: 'after' });
    });
  });

  describe('row-reverse', () => {
    // Index 0 is drawn rightmost
    const dims = () =>
      layout(
        { display: 'flex', flexDirection: 'row-reverse' },
        children([...row].reverse())
      );

    it('is on the horizontal axis, reversed', () => {
      expect(dims().map((d) => [d.inFlow, d.reversed])).toEqual([
        [false, true],
        [false, true],
        [false, true],
      ]);
    });

    it('finds the position in visual order', () => {
      // Left of every child: after the last index, which is drawn leftmost
      expect(find(dims(), -5, 10)).toEqual({ index: 2, where: 'after' });
      // Between the leftmost (2) and middle (1) children
      expect(find(dims(), 19, 10)).toEqual({ index: 1, where: 'after' });
      // Between the middle (1) and rightmost (0) children
      expect(find(dims(), 39, 10)).toEqual({ index: 0, where: 'after' });
      // Right of every child: before index 0
      expect(find(dims(), 70, 10)).toEqual({ index: 0, where: 'before' });
    });
  });

  describe('column-reverse', () => {
    // Index 0 is drawn at the bottom
    const dims = () =>
      layout(
        { display: 'flex', flexDirection: 'column-reverse' },
        children([...column].reverse())
      );

    it('is on the vertical axis, reversed', () => {
      expect(dims().map((d) => [d.inFlow, d.reversed])).toEqual([
        [true, true],
        [true, true],
        [true, true],
      ]);
    });

    it('finds the position in visual order', () => {
      // Above every child: after the last index, which is drawn at the top
      expect(find(dims(), 50, -5)).toEqual({ index: 2, where: 'after' });
      // Between the top (2) and middle (1) children
      expect(find(dims(), 50, 19)).toEqual({ index: 1, where: 'after' });
      // Between the middle (1) and bottom (0) children
      expect(find(dims(), 50, 39)).toEqual({ index: 0, where: 'after' });
      // Below every child: before index 0
      expect(find(dims(), 50, 70)).toEqual({ index: 0, where: 'before' });
    });
  });

  describe.each(['grid', 'inline-grid'])('%s', (display) => {
    const dims = () => layout({ display }, children(row));

    it('is on the horizontal axis', () => {
      expect(dims().map((d) => [d.inFlow, d.reversed])).toEqual([
        [false, false],
        [false, false],
        [false, false],
      ]);
    });

    it('finds the position between children', () => {
      expect(find(dims(), 19, 10)).toEqual({ index: 1, where: 'before' });
    });
  });

  describe('inline-block children of a block parent', () => {
    const dims = () =>
      layout({ display: 'block' }, children(row, { display: 'inline-block' }));

    it('is on the horizontal axis', () => {
      expect(dims().map((d) => d.inFlow)).toEqual([false, false, false]);
    });

    it('finds the position between children on the line', () => {
      expect(find(dims(), 19, 10)).toEqual({ index: 1, where: 'before' });
    });
  });

  describe('block children of a block parent', () => {
    it('is on the vertical axis', () => {
      const dims = layout({ display: 'block' }, children(column));
      expect(dims.map((d) => d.inFlow)).toEqual([true, true, true]);
    });
  });

  describe('inline-block child of a flex column', () => {
    it('is on the vertical axis', () => {
      const dims = layout(
        { display: 'flex', flexDirection: 'column' },
        children(column.slice(0, 1), { display: 'inline-block' })
      );
      expect(dims[0].inFlow).toBe(true);
    });
  });

  it('returns index 0 before when there are no children', () => {
    expect(find([], 10, 10)).toEqual({ index: 0, where: 'before' });
  });
});
