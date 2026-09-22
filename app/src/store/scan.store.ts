import { create } from 'zustand';
import { AnalysisReport, CompassDirection, DirectionSource, RoomType } from '../api/types';

interface ScanState {
  roomType: RoomType;
  imageUri: string | null;
  imageBase64: string | null;
  heading: number | null;
  direction: CompassDirection | null;
  directionSource: DirectionSource;
  notes: string;
  isCalibrated: boolean;
  currentReport: AnalysisReport | null;

  setRoomType: (roomType: RoomType) => void;
  setCapturedImage: (uri: string, base64?: string) => void;
  setHeadingAndDirection: (
    heading: number,
    direction: CompassDirection,
    isManual?: boolean,
  ) => void;
  setNotes: (notes: string) => void;
  setCurrentReport: (report: AnalysisReport | null) => void;
  resetScan: () => void;
}

export const useScanStore = create<ScanState>((set) => ({
  roomType: 'BEDROOM',
  imageUri: null,
  imageBase64: null,
  heading: 180,
  direction: 'SOUTH',
  directionSource: 'DEVICE_COMPASS',
  notes: '',
  isCalibrated: true,
  currentReport: null,

  setRoomType: (roomType) => set({ roomType }),
  setCapturedImage: (imageUri, imageBase64) =>
    set({ imageUri, imageBase64: imageBase64 || null }),
  setHeadingAndDirection: (heading, direction, isManual = false) =>
    set({
      heading,
      direction,
      directionSource: isManual ? 'USER_SELECTED' : 'DEVICE_COMPASS',
      isCalibrated: true,
    }),
  setNotes: (notes) => set({ notes }),
  setCurrentReport: (currentReport) => set({ currentReport }),
  resetScan: () =>
    set({
      roomType: 'BEDROOM',
      imageUri: null,
      imageBase64: null,
      heading: 180,
      direction: 'SOUTH',
      directionSource: 'DEVICE_COMPASS',
      notes: '',
      isCalibrated: true,
      currentReport: null,
    }),
}));
