import { create } from 'zustand';
import { ALL_HARVESTERS } from '@wh/shared';

/**
 * The harvester currently selected in the dashboard header. `ALL` means the
 * consolidated view across every harvester. Screens read this to scope their
 * data and to pre-fill the harvester on new records.
 */
interface HarvesterState {
  /** Selected harvester id, or ALL for consolidated. */
  selectedId: string;
  setSelected: (id: string) => void;
}

export const useSelectedHarvester = create<HarvesterState>((set) => ({
  selectedId: ALL_HARVESTERS,
  setSelected: (id) => set({ selectedId: id }),
}));

/** Helper: the harvester id to send to the API, or undefined for "all". */
export function scopedHarvesterId(selectedId: string): string | undefined {
  return selectedId === ALL_HARVESTERS ? undefined : selectedId;
}
