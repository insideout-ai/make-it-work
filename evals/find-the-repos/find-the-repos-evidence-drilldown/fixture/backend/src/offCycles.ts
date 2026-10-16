export const updateRoute = 'PATCH /off-cycles/:id';

export interface OffCycleUpdate {
  payoutDate: string;
  allowPayoutDateChange: boolean;
}

export function toUpdatePayload(input: OffCycleUpdate) {
  return {
    payoutDate: input.payoutDate,
    allowPayoutDateChange: input.allowPayoutDateChange,
  };
}
