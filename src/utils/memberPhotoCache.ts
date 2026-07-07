import type { QueryClient } from '@tanstack/react-query';

export const MEMBER_PHOTO_BUST_KEY = 'member-photo-bust';

export function memberPhotoBustQueryKey(memberId: number) {
  return [MEMBER_PHOTO_BUST_KEY, memberId] as const;
}

/** Force MemberPhoto to refetch after upload, replace, or remove. */
export function bumpMemberPhotoCache(queryClient: QueryClient, memberId: number) {
  queryClient.setQueryData(memberPhotoBustQueryKey(memberId), Date.now());
}
