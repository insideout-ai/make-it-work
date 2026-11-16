// Deliberately static: never include project data, report contents or file paths.
export const FEEDBACK_EMAIL_RECIPIENT = 'insideoutaitech@gmail.com';
export const FEEDBACK_EMAIL_SUBJECT = 'make-it-work workflow feedback';
export const FEEDBACK_EMAIL_BODY = 'I would like to share my reviewed session feedback report.';
export const FEEDBACK_SHARING_REMINDER = 'Review and save the report, then attach it to the email. Sharing is optional.';
export const FEEDBACK_EMAIL_URL = `mailto:${FEEDBACK_EMAIL_RECIPIENT}?subject=${encodeURIComponent(FEEDBACK_EMAIL_SUBJECT)}&body=${encodeURIComponent(FEEDBACK_EMAIL_BODY)}`;
