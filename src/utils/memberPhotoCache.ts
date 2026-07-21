import type { QueryClient } from '@tanstack/react-query';
import { invalidateMemberPhotoMemory } from '@/src/utils/memberPhoto';

export const MEMBER_PHOTO_BUST_KEY = 'member-photo-bust';

export function memberPhotoBustQueryKey(memberId: number) {
  return [MEMBER_PHOTO_BUST_KEY, memberId] as const;
}

/** Force MemberPhoto to refetch after upload, replace, or remove. */
export function bumpMemberPhotoCache(queryClient: QueryClient, memberId: number) {
  invalidateMemberPhotoMemory(memberId);
  queryClient.setQueryData(memberPhotoBustQueryKey(memberId), Date.now());
  void queryClient.invalidateQueries({ queryKey: ['member-photo', memberId] });
}
