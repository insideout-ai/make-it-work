export function dateControl(draft: { payoutDate: string; allowPayoutDateChange: boolean }) {
  return {
    checkboxLabel: 'Allow payout date changes',
    checkboxChecked: draft.allowPayoutDateChange,
    dateDisabled: !draft.allowPayoutDateChange,
    dateValue: draft.payoutDate,
  };
}
