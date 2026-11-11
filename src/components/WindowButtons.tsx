import { useEffect, useState } from 'react';
import { Copy, Minus, Square, X } from 'lucide-react';
import { hf } from '../lib/bridge';

export function WindowButtons({ className = '' }: { className?: string }) {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let alive = true;
    void hf.window.isMaximized().then((value) => alive && setMaximized(value));
    const off = hf.window.onState(({ maximized: next }) => setMaximized(next));
    return () => {
      alive = false;
      off();
    };
  }, []);

  return (
    <div className={`window-controls no-drag ${className}`.trim()}>
      <button type="button" aria-label="Minimize" onClick={() => void hf.window.minimize()}>
        <Minus size={15} />
      </button>
      <button
        type="button"
        aria-label={maximized ? 'Restore' : 'Maximize'}
        onClick={() => void hf.window.toggleMaximize()}
      >
        {maximized ? <Copy size={13} style={{ transform: 'scaleX(-1)' }} /> : <Square size={12} />}
      </button>
      <button
        type="button"
        className="window-close"
        aria-label="Close"
        onClick={() => void hf.window.close()}
      >
        <X size={16} />
      </button>
    </div>
  );
}
