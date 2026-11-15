import { useEffect, useRef } from 'react';
import {
  collectEnabledAdScripts,
  type AdConfigState,
} from './AdSettingsApp';

interface MultiAdRuntimeInjectorProps {
  config: AdConfigState;
}

export function MultiAdRuntimeInjector({ config }: MultiAdRuntimeInjectorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const signature = collectEnabledAdScripts({
    ...config,
    adsterraEnabled: true,
    hilltopEnabled: true,
    monetagEnabled: true,
    injectIntoMainApp: true,
  }).join('\n');

  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;
    host.innerHTML = '';
    if (!signature.trim()) return;

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(signature, 'text/html');
      const scripts = Array.from(doc.querySelectorAll('script'));

      for (const orig of scripts) {
        const script = document.createElement('script');
        for (const attr of Array.from(orig.attributes)) {
          script.setAttribute(attr.name, attr.value);
        }
        if (orig.textContent) {
          script.textContent = orig.textContent;
        }
        host.appendChild(script);
      }
    } catch {
      // Ignore malformed third-party snippet syntax
    }

    return () => {
      host.innerHTML = '';
    };
  }, [signature]);

  return <div ref={containerRef} className="hidden" aria-hidden="true" />;
}
