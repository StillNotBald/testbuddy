import { act, fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setSingleKeyShortcuts, useHotkeys } from './hotkeys';

function Screen({ onP, onSave, onGo }: { onP: () => void; onSave: () => void; onGo: () => void }) {
  useHotkeys('Test', { p: onP, 'mod+s': onSave, 'g o': onGo });
  return (<div><input aria-label="comment" /><textarea aria-label="notes" /><div role="dialog"><button>in dialog</button></div></div>);
}

describe('useHotkeys', () => {
  const p = vi.fn(); const save = vi.fn(); const go = vi.fn();
  beforeEach(() => { p.mockClear(); save.mockClear(); go.mockClear(); act(() => setSingleKeyShortcuts(true)); });

  it('fires single-key shortcuts on the page', () => {
    render(<Screen onP={p} onSave={save} onGo={go} />);
    fireEvent.keyDown(document.body, { key: 'p' });
    expect(p).toHaveBeenCalledTimes(1);
  });

  it('ignores single-key shortcuts while typing in inputs and textareas, and inside dialogs', () => {
    const { getByLabelText, getByText } = render(<Screen onP={p} onSave={save} onGo={go} />);
    fireEvent.keyDown(getByLabelText('comment'), { key: 'p' });
    fireEvent.keyDown(getByLabelText('notes'), { key: 'p' });
    fireEvent.keyDown(getByText('in dialog'), { key: 'p' });
    expect(p).not.toHaveBeenCalled();
  });

  it('still fires modifier combos from inputs', () => {
    const { getByLabelText } = render(<Screen onP={p} onSave={save} onGo={go} />);
    fireEvent.keyDown(getByLabelText('comment'), { key: 's', ctrlKey: true });
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('respects the single-key toggle but keeps modifier combos', () => {
    render(<Screen onP={p} onSave={save} onGo={go} />);
    act(() => setSingleKeyShortcuts(false));
    fireEvent.keyDown(document.body, { key: 'p' });
    fireEvent.keyDown(document.body, { key: 's', metaKey: true });
    expect(p).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('supports two-key sequences', () => {
    render(<Screen onP={p} onSave={save} onGo={go} />);
    fireEvent.keyDown(document.body, { key: 'g' });
    fireEvent.keyDown(document.body, { key: 'o' });
    expect(go).toHaveBeenCalledTimes(1);
  });
});
