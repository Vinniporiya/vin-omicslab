import type { ReactNode } from 'react';
import { Link } from '../../app/router';

interface Props {
  to?: string; onClick?: () => void; variant?: 'primary' | 'secondary' | 'quiet'; disabled?: boolean;
  title?: string; children: ReactNode; type?: 'button' | 'submit';
}
export function Button({ to, onClick, variant = 'secondary', disabled, title, children, type = 'button' }: Props) {
  const cls = `btn btn-${variant}`;
  if (to && !disabled) return <Link to={to} className={cls} title={title}>{children}</Link>;
  return <button type={type} className={cls} onClick={onClick} disabled={disabled} title={title}>{children}</button>;
}
