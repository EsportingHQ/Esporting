import type { CSSProperties } from 'react';
import type { GameProfile } from '@/lib/games';

// The logos are single-colour shapes. Using one as a CSS mask over `currentColor`
// means a single file follows the text colour: muted by default, white or pink
// when selected, and correct on both the dark and light themes.
export function GameIcon({ game, className = 'w-4 h-4' }: { game: GameProfile; className?: string }) {
  if (game.iconSrc) {
    const url = `url(${game.iconSrc})`;
    const style: CSSProperties = {
      WebkitMaskImage: url,
      maskImage: url,
      WebkitMaskRepeat: 'no-repeat',
      maskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center',
      maskPosition: 'center',
      WebkitMaskSize: 'contain',
      maskSize: 'contain',
    };
    return <span aria-hidden="true" className={`inline-block shrink-0 bg-current ${className}`} style={style} />;
  }
  const Fallback = game.icon;
  return Fallback ? <Fallback aria-hidden="true" className={`shrink-0 ${className}`} /> : null;
}
