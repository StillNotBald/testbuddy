import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { STATUS_META, STATUS_ORDER, StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  it.each(STATUS_ORDER)('renders an icon and the word for %s, not colour alone', (key) => {
    const { container } = render(<StatusBadge status={key} />);
    expect(screen.getByText(STATUS_META[key].label)).toBeInTheDocument();
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('uses a distinct icon per status', () => {
    const shapes = STATUS_ORDER.map((k) => {
      const { container, unmount } = render(<StatusBadge status={k} />);
      const cls = container.querySelector('svg')?.getAttribute('class') ?? '';
      unmount();
      return cls.split(' ').find((c) => c.startsWith('lucide-') && c !== 'lucide') ?? cls;
    });
    expect(new Set(shapes).size).toBe(5);
  });

  it('keeps the word for screen readers when the label is hidden', () => {
    render(<StatusBadge status="failed" showLabel={false} />);
    expect(screen.getByText('Failed')).toHaveClass('sr-only');
  });

  it('renders a custom status with a diamond and its own name', () => {
    const { container } = render(<StatusBadge status={{ name: 'Deferred', color: '#7a5af8' }} />);
    expect(screen.getByText('Deferred')).toBeInTheDocument();
    expect(container.querySelector('[data-status="custom"] svg')).not.toBeNull();
  });
});
