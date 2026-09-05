import type { IdleControl } from './idle-motion';
export type SceneMode = 'idle' | 'spread' | 'revealing' | 'result' | 'sealed' | 'burst';

export interface SceneCard {
  id: string;
  name: string;
  image: string;
  color: string;
}

export interface TarotSceneProps {
  mode: SceneMode;
  cards: SceneCard[];
  activeIndex: number;
  drawnIds: string[];
  onSelect: (index: number) => void;
  onBrowse: (delta: number) => void;
  idleControl?: { current: IdleControl };
  handOffset?: { current: number };
  quality?: 'auto' | 'high' | 'low';
}
