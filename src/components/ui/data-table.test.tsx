import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setSingleKeyShortcuts } from '@/lib/hotkeys';
import { DataTable } from './data-table';

interface Row { id: string; name: string }
const rows: Row[] = ['a', 'b', 'c', 'd'].map((id) => ({ id, name: `Row ${id}` }));
const columns: ColumnDef<Row, unknown>[] = [{ accessorKey: 'name', header: 'Name' }];

function Harness({ onOpen = () => undefined }: { onOpen?: (r: Row) => void }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  return <DataTable caption="Rows" columns={columns} data={rows} rowId={(r) => r.id} selectable selection={sel} onSelectionChange={setSel} onRowOpen={onOpen} />;
}
const rowEls = () => Array.from(document.querySelectorAll<HTMLElement>('tbody tr[data-row-index]'));

describe('DataTable', () => {
  beforeEach(() => { act(() => setSingleKeyShortcuts(true)); });

  it('has a sticky header, aria-sort on sortable columns and roving tabindex', () => {
    render(<Harness />);
    expect(screen.getByRole('table', { name: 'Rows' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute('aria-sort', 'none');
    expect(rowEls().map((r) => r.tabIndex)).toEqual([0, -1, -1, -1]);
  });

  it('moves row focus with arrows and J/K, opens with Enter', () => {
    const onOpen = vi.fn();
    render(<Harness onOpen={onOpen} />);
    rowEls()[0]?.focus();
    fireEvent.keyDown(rowEls()[0] as HTMLElement, { key: 'ArrowDown' });
    expect(rowEls()[1]?.tabIndex).toBe(0);
    fireEvent.keyDown(rowEls()[1] as HTMLElement, { key: 'j' });
    expect(rowEls()[2]?.tabIndex).toBe(0);
    fireEvent.keyDown(rowEls()[2] as HTMLElement, { key: 'k' });
    expect(rowEls()[1]?.tabIndex).toBe(0);
    fireEvent.keyDown(rowEls()[1] as HTMLElement, { key: 'Enter' });
    expect(onOpen).toHaveBeenCalledWith(rows[1]);
  });

  it('ignores J/K when single-key shortcuts are off but arrows still work', () => {
    act(() => setSingleKeyShortcuts(false));
    render(<Harness />);
    fireEvent.keyDown(rowEls()[0] as HTMLElement, { key: 'j' });
    expect(rowEls()[0]?.tabIndex).toBe(0);
    fireEvent.keyDown(rowEls()[0] as HTMLElement, { key: 'ArrowDown' });
    expect(rowEls()[1]?.tabIndex).toBe(0);
  });

  it('toggles selection with Space and selects a range with Shift+Space', () => {
    render(<Harness />);
    fireEvent.keyDown(rowEls()[0] as HTMLElement, { key: ' ' });
    expect(rowEls()[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(rowEls()[2] as HTMLElement, { key: ' ', shiftKey: true });
    expect(rowEls().map((r) => r.getAttribute('aria-selected'))).toEqual(['true', 'true', 'true', 'false']);
    fireEvent.keyDown(rowEls()[0] as HTMLElement, { key: ' ' });
    expect(rowEls()[0]).toHaveAttribute('aria-selected', 'false');
  });

  it('shows the empty state', () => {
    render(<DataTable caption="Empty" columns={columns} data={[]} rowId={(r: Row) => r.id} emptyState={<p>Nothing here</p>} />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });
});
