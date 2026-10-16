export interface EditableDatePayload {
  allowPayoutDateChange: boolean;
  payoutDate: string;
}

export function canEditDate(payload: EditableDatePayload) {
  return payload.allowPayoutDateChange;
}
