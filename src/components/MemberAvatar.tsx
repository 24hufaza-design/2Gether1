import { useState } from 'react';
import type { TeamMember } from '../shared/types';

interface MemberAvatarProps {
  member?: TeamMember;
  size?: 'sm' | 'md';
}

export function MemberAvatar({ member, size = 'sm' }: MemberAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const dims = size === 'md' ? 'h-9 w-9 text-xs' : 'h-7 w-7 text-[11px]';
  const initials = member?.initials ?? '2G';
  const name = member?.name ?? 'Teammedlem';

  if (!member?.avatarUrl || imgFailed) {
    return (
      <span
        aria-label={name}
        className={`${dims} inline-flex shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200`}
      >
        {initials}
      </span>
    );
  }

  return (
    <img
      src={member.avatarUrl}
      alt={name}
      referrerPolicy="no-referrer"
      onError={() => setImgFailed(true)}
      className={`${dims} shrink-0 rounded-full border border-slate-200 object-cover dark:border-slate-700`}
    />
  );
}
