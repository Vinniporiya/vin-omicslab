import { useEffect, useState, type AnchorHTMLAttributes, type ReactNode } from 'react';

export interface Route { path: string; segments: string[]; query: URLSearchParams }
function parse(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path, qs] = raw.split('?');
  return { path, segments: path.split('/').filter(Boolean), query: new URLSearchParams(qs ?? '') };
}
export function useRoute(): Route {
  const [r, setR] = useState<Route>(parse);
  useEffect(() => {
    const on = () => setR(parse());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return r;
}
export const navigate = (to: string): void => { window.location.hash = to; };

export function Link({ to, children, ...rest }: { to: string; children: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a href={`#${to}`} {...rest}>{children}</a>;
}
