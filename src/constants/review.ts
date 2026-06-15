import { ReviewType } from '@/models/review';

export const REVIEW_TYPE_OPTIONS = [
  { label: '好评', value: ReviewType.POSITIVE, emoji: '👍', tone: 'positive' },
  { label: '差评', value: ReviewType.NEGATIVE, emoji: '👎', tone: 'negative' },
];

export const CREDIT_SCORE_CHANGE = {
  [ReviewType.POSITIVE]: 3,
  [ReviewType.NEGATIVE]: -5,
};

export const REVIEW_STORAGE_HINTS = {
  statusKey: 'reswap:reviews',
  statusTouchedBy: ['models/review.ts', 'stores/reviewStore.ts', 'api/reviewApi.ts'],
};
