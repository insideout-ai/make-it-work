export function editorState(draft: {
  payoutDate: string;
  allowPayoutDateChange: boolean;
}) {
  return {
    checkboxChecked: draft.allowPayoutDateChange,
    payoutDateDisabled: !draft.allowPayoutDateChange,
    dateValue: draft.payoutDate,
  };
}
