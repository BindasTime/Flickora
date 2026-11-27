import type { ThemeId } from '../lib/types';

/** Five app-wide accent themes. The CSS for each lives in styles/polish.css. */
export const THEMES: { id: ThemeId; label: string; color: string; meta: string }[] = [
  { id: 'coral', label: 'Coral', color: '#ff795f', meta: '#07070b' },
  { id: 'ocean', label: 'Ocean', color: '#4ea8ff', meta: '#060b14' },
  { id: 'violet', label: 'Violet', color: '#a78bfa', meta: '#0a0716' },
  { id: 'emerald', label: 'Emerald', color: '#3ddc97', meta: '#06100c' },
  { id: 'amber', label: 'Amber', color: '#ffb84d', meta: '#120d05' },
];

export function themeMetaColor(id: ThemeId): string {
  return THEMES.find((theme) => theme.id === id)?.meta || '#07070b';
}
