import { toast as sonner } from 'sonner';

/** Toast wrappers (sonner). `undo` stays 10 s per DESIGN.md. */
export const toast = {
  success: (message: string) => sonner.success(message),
  error: (message: string) => sonner.error(message),
  info: (message: string) => sonner(message),
  undo: ({ message, onUndo, duration = 10_000 }: { message: string; onUndo: () => void; duration?: number }) =>
    sonner(message, { duration, action: { label: 'Undo', onClick: onUndo } }),
};
