import type { QueryClient } from '@tanstack/react-query';
import { createBranch, updateBranch } from '@/src/api/branches';
import { changeMemberPlan, enrollMember, renewMember, transferMember, updateMember } from '@/src/api/members';
import type { UpdateMemberPayload } from '@/src/types/api';
import { createPayment } from '@/src/api/payments';
import type { PlanPayload } from '@/src/api/plans';
import { createPlan, updatePlan } from '@/src/api/plans';
import { updateGymProfile } from '@/src/api/profile';
import type { UpdateProfilePayload } from '@/src/types/api';
import type { BranchPayload, UpdateBranchPayload } from '@/src/api/branches';
import type { ChangePlanPayload, EnrollPayload, RenewPayload } from '@/src/types/api';
import { readOfflineQueue, removeOfflineJob } from '@/src/offline/queue';
import type { OfflineJob } from '@/src/offline/types';

let processing = false;

async function executeJob(token: string, job: OfflineJob): Promise<void> {
  switch (job.type) {
    case 'enroll':
      await enrollMember(token, job.payload as unknown as EnrollPayload);
      break;
    case 'renew':
      if (!job.memberId) throw new Error('Missing member id for renew job.');
      await renewMember(token, job.memberId, job.payload as unknown as RenewPayload);
      break;
    case 'payment':
      await createPayment(token, job.payload as { member_id: number; amount: number; date?: string; method?: string });
      break;
    case 'change-plan':
      if (!job.memberId) throw new Error('Missing member id for change-plan job.');
      await changeMemberPlan(token, job.memberId, job.payload as unknown as ChangePlanPayload);
      break;
    case 'transfer':
      if (!job.memberId) throw new Error('Missing member id for transfer job.');
      await transferMember(token, job.memberId, Number(job.payload.branch_id));
      break;
    case 'update-member':
      if (!job.memberId) throw new Error('Missing member id for update-member job.');
      await updateMember(token, job.memberId, job.payload as unknown as UpdateMemberPayload);
      break;
    case 'create-plan':
      await createPlan(token, job.payload as unknown as PlanPayload);
      break;
    case 'update-plan':
      if (!job.entityId) throw new Error('Missing plan id for update-plan job.');
      await updatePlan(token, job.entityId, job.payload as Partial<PlanPayload>);
      break;
    case 'create-branch':
      await createBranch(token, job.payload as unknown as BranchPayload);
      break;
    case 'update-branch':
      if (!job.entityId) throw new Error('Missing branch id for update-branch job.');
      await updateBranch(token, job.entityId, job.payload as UpdateBranchPayload);
      break;
    case 'update-profile':
      await updateGymProfile(token, job.payload as unknown as UpdateProfilePayload);
      break;
    default:
      throw new Error(`Unknown offline job type: ${(job as OfflineJob).type}`);
  }
}

export async function processOfflineQueue(token: string, queryClient: QueryClient): Promise<number> {
  if (processing) return 0;
  processing = true;

  let synced = 0;
  try {
    const jobs = await readOfflineQueue();
    for (const job of jobs) {
      try {
        await executeJob(token, job);
        await removeOfflineJob(job.id);
        synced += 1;
      } catch {
        // Keep failed jobs for a later retry.
      }
    }

    if (synced > 0) {
      await queryClient.invalidateQueries();
    }
  } finally {
    processing = false;
  }

  return synced;
}

export async function getPendingOfflineCount(): Promise<number> {
  const jobs = await readOfflineQueue();
  return jobs.length;
}
