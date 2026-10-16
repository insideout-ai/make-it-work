export interface UpdatePayload {
  payoutDate: string;
  allowPayoutDateChange: boolean;
}

export function updateBody(input: UpdatePayload) {
  return {
    payoutDate: input.payoutDate,
    allowPayoutDateChange: input.allowPayoutDateChange,
  };
}
