import { ROOT_NODE } from '@craftjs/utils';

import { LayerHandlers } from '../LayerHandlers';

describe('LayerHandlers', () => {
  // The root layer's element spans the panel: 200 wide and 300 high at the origin
  const panel = document.createElement('div');
  panel.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width: 200,
      height: 300,
      right: 200,
      bottom: 300,
    } as DOMRect);

  let move: jest.Mock;
  let layerEl: HTMLElement;
  let unbindDrag: () => void;
  let dropOnLayersOnly: boolean;

  const startDrag = () => {
    move = jest.fn();
    const editorStore = { actions: { move } };
    const derived = {
      options: { store: editorStore },
      listen: () => () => {},
    };
    const layerStore = {
      getState: () => ({
        layers: { [ROOT_NODE]: { dom: panel } },
        options: { dropOnLayersOnly },
      }),
      actions: { setIndicator: jest.fn() },
    };

    const handlers = new LayerHandlers(derived as any, {
      layerStore,
    }).handlers();

    layerEl = document.createElement('div');
    panel.appendChild(layerEl);
    unbindDrag = handlers.drag(layerEl, 'dragged-node');

    layerEl.dispatchEvent(new Event('dragstart'));
    // As a dragenter over another layer would leave it
    LayerHandlers.events.indicator = {
      placement: {
        parent: { id: ROOT_NODE } as any,
        index: 1,
        where: 'before',
        currentNode: null,
      },
      error: null,
      onCanvas: false,
    };
  };

  beforeEach(() => {
    dropOnLayersOnly = true;
    startDrag();
  });

  afterEach(() => {
    unbindDrag();
    LayerHandlers.events.indicator = null;
  });

  const dragOver = (clientX: number, clientY: number) =>
    window.dispatchEvent(new MouseEvent('dragover', { clientX, clientY }));

  it('commits nothing when released after leaving the panel', () => {
    dragOver(500, 50);
    layerEl.dispatchEvent(new Event('dragend'));

    expect(move).not.toHaveBeenCalled();
  });

  it('commits the last indicator when released over the panel below the last layer', () => {
    dragOver(100, 290);
    layerEl.dispatchEvent(new Event('dragend'));

    expect(move).toHaveBeenCalledWith('dragged-node', ROOT_NODE, 1);
  });

  it('stops watching the pointer after the drag ends', () => {
    layerEl.dispatchEvent(new Event('dragend'));
    LayerHandlers.events.indicator = {
      placement: {
        parent: { id: ROOT_NODE } as any,
        index: 0,
        where: 'before',
        currentNode: null,
      },
      error: null,
      onCanvas: false,
    };
    dragOver(500, 50);

    expect(LayerHandlers.events.indicator).not.toBeNull();
  });

  it('commits the last indicator when released outside the panel without dropOnLayersOnly', () => {
    unbindDrag();
    dropOnLayersOnly = false;
    startDrag();
    dragOver(500, 50);
    layerEl.dispatchEvent(new Event('dragend'));

    expect(move).toHaveBeenCalledWith('dragged-node', ROOT_NODE, 1);
  });
});
