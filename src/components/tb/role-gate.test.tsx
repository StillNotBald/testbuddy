import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { ProjectRole } from '@/services/types';
import { ProjectRoleProvider } from './project-context';
import { RoleGate } from './role-gate';

function setup(role: ProjectRole | null, ui: React.ReactNode, archived = false) {
  return render(<TooltipProvider><ProjectRoleProvider value={{ projectId: 'p', role, archived }}>{ui}</ProjectRoleProvider></TooltipProvider>);
}

describe('RoleGate', () => {
  it('hides the control for roles that can never use it', () => {
    setup('viewer', <RoleGate action="milestones.write"><button>New milestone</button></RoleGate>);
    expect(screen.queryByRole('button', { name: 'New milestone' })).toBeNull();
  });

  it('disables with a reason when mode is disable', () => {
    setup('tester', <RoleGate action="runs.attach" mode="disable" reason="Managers attach runs to plans"><button>Attach to plan</button></RoleGate>);
    expect(screen.getByRole('button', { name: 'Attach to plan' })).toBeDisabled();
    expect(screen.getByLabelText('Managers attach runs to plans')).toBeInTheDocument();
  });

  it('renders the control for allowed roles', () => {
    setup('manager', <RoleGate action="milestones.write"><button>New milestone</button></RoleGate>);
    expect(screen.getByRole('button', { name: 'New milestone' })).toBeEnabled();
  });

  it('disables writes in archived projects and for state blocks', () => {
    const { unmount } = setup('admin', <RoleGate action="runs.write"><button>New run</button></RoleGate>, true);
    expect(screen.getByRole('button', { name: 'New run' })).toBeDisabled();
    unmount();
    setup('admin', <RoleGate action="runs.close" blockedReason="This run is closed."><button>Close run</button></RoleGate>);
    expect(screen.getByRole('button', { name: 'Close run' })).toBeDisabled();
  });

  it('works with an explicit allow list and role override', () => {
    render(<RoleGate allow={['admin']} role="admin"><span>secret</span></RoleGate>);
    expect(screen.getByText('secret')).toBeInTheDocument();
  });
});
