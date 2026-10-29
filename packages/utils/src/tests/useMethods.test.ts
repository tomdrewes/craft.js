import { renderHook } from '@testing-library/react';

import { ERROR_BATCH_ASYNC } from '../constants';
import { useMethods } from '../useMethods';

const methods = (state: { count: number }) => ({
  increment: () => {
    state.count++;
  },
});

describe('useMethods batch', () => {
  let store, onChange;

  beforeEach(() => {
    store = renderHook(() => useMethods(methods, { count: 0 })).result.current;
    onChange = jest.fn();
    store.subscribe((state) => state.count, onChange);
  });

  it('notifies once with the final state', () => {
    store.batch(() => {
      store.actions.increment();
      store.actions.increment();
      store.actions.increment();
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('does not notify when nothing was dispatched', () => {
    store.batch(() => {});

    expect(onChange).not.toHaveBeenCalled();
  });

  it('notifies once, on leaving the outermost batch', () => {
    store.batch(() => {
      store.actions.increment();
      store.batch(() => store.actions.increment());
      expect(onChange).not.toHaveBeenCalled();
      store.actions.increment();
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('notifies after a throw and resumes normal notification', () => {
    expect(() =>
      store.batch(() => {
        store.actions.increment();
        throw new Error('boom');
      })
    ).toThrow('boom');
    expect(onChange).toHaveBeenCalledTimes(1);

    store.actions.increment();
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith(2);
  });

  it('rejects an async function, notifying for what it dispatched', () => {
    expect(() =>
      store.batch(async () => {
        store.actions.increment();
      })
    ).toThrow(ERROR_BATCH_ASYNC);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('keeps state current inside a batch', () => {
    const seen = [];
    store.batch(() => {
      store.actions.increment();
      seen.push(store.getState().count);
      store.actions.increment();
      seen.push(store.getState().count);
    });

    expect(seen).toEqual([1, 2]);
  });
});
