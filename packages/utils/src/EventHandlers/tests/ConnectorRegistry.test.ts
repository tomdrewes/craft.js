import { ConnectorRegistry } from '../ConnectorRegistry';

describe('ConnectorRegistry', () => {
  let registry: ConnectorRegistry;
  let el: HTMLElement;
  let cleanup: jest.Mock;
  let connector: jest.Mock;

  beforeEach(() => {
    registry = new ConnectorRegistry();
    el = document.createElement('div');
    cleanup = jest.fn();
    connector = jest.fn(() => cleanup);
  });

  const payload = () => ({ name: 'drag', required: 'node-a', connector });

  it('attaches the connector on first register', () => {
    registry.register(el, payload());
    expect(connector).toHaveBeenCalledTimes(1);
  });

  // Ordinary re-renders re-invoke the connector ref with the same element and
  // requirements. That must stay a no-op so we don't churn listeners every
  // render.
  it('does not re-attach an already-attached connector', () => {
    registry.register(el, payload());
    registry.register(el, payload());
    expect(connector).toHaveBeenCalledTimes(1);
  });

  // A `required` shaped like a React element (nested `props` object) counts as
  // UNCHANGED only when its identity is stable: shallowequal compares the nested
  // `props` by reference. This is the toolbox scenario — a create connector whose
  // `required` is the userElement.
  //
  // Stable identity across re-renders → no-op (no churn).
  it('does not re-attach when a react-element-shaped required keeps its identity', () => {
    const required = { type: 'div', props: { is: 'Button' } };
    registry.register(el, { name: 'create', required, connector });
    registry.register(el, { name: 'create', required, connector });
    expect(connector).toHaveBeenCalledTimes(1);
  });

  // Fresh identity each render (a new element with an equal-but-distinct `props`)
  // → treated as changed → the connector is torn down and re-added every render.
  // Under <Activity>'s concurrent re-renders that churn can drop the drag
  // listener at the moment a drag begins.
  it('re-attaches when a react-element-shaped required is a fresh object each render', () => {
    const makeRequired = () => ({ type: 'div', props: { is: 'Button' } });
    registry.register(el, {
      name: 'create',
      required: makeRequired(),
      connector,
    });
    registry.register(el, {
      name: 'create',
      required: makeRequired(),
      connector,
    });
    expect(connector).toHaveBeenCalledTimes(2);
  });

  // Reproduces the reveal hazard from the Activity plan: a hide can tear down a
  // connector's listeners while leaving its registry entry in place. Replaying
  // the connector with unchanged `required` must re-attach rather than no-op.
  it('re-enables a stale entry when re-registered with unchanged required', () => {
    registry.register(el, payload());
    expect(connector).toHaveBeenCalledTimes(1);

    // Simulate the out-of-band teardown: listeners removed, entry survives.
    registry.getByElement(el, 'drag').disable();
    expect(cleanup).toHaveBeenCalledTimes(1);

    registry.register(el, payload());
    expect(connector).toHaveBeenCalledTimes(2);
  });

  it('does not re-attach while the registry is disabled', () => {
    registry.register(el, payload());
    registry.disable();
    connector.mockClear();

    registry.register(el, payload());
    expect(connector).not.toHaveBeenCalled();
  });
});
