export enum ReviewType {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
}

export interface Review {
  id: string;
  exchange_id: string;
  reviewer_id: string;
  reviewee_id: string;
  type: ReviewType;
  content: string;
  created_at: string;
}

export type ReviewDraft = Omit<Review, 'id' | 'created_at'>;
