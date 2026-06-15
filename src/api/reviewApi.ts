import { CREDIT_SCORE_CHANGE } from '@/constants/review';
import { ExchangeStatus } from '@/constants/exchange';
import type { Review, ReviewDraft } from '@/models/review';

import { storage, STORAGE_KEYS } from '@/utils/storage';
import { userApi } from './userApi';
import { exchangeApi } from './exchangeApi';

export const reviewApi = {
  async list(): Promise<Review[]> {
    return storage.get<Review[]>(STORAGE_KEYS.reviews, []);
  },

  async listByReviewee(revieweeId: string): Promise<Review[]> {
    const reviews = await this.list();
    return reviews.filter((item) => item.reviewee_id === revieweeId);
  },

  async listByReviewer(reviewerId: string): Promise<Review[]> {
    const reviews = await this.list();
    return reviews.filter((item) => item.reviewer_id === reviewerId);
  },

  async listByExchange(exchangeId: string): Promise<Review[]> {
    const reviews = await this.list();
    return reviews.filter((item) => item.exchange_id === exchangeId);
  },

  async getByExchangeAndReviewer(exchangeId: string, reviewerId: string): Promise<Review | undefined> {
    const reviews = await this.list();
    return reviews.find((item) => item.exchange_id === exchangeId && item.reviewer_id === reviewerId);
  },

  async create(draft: ReviewDraft): Promise<Review> {
    const reviews = await this.list();
    const exchange = (await exchangeApi.list()).find((item) => item.id === draft.exchange_id);
    if (!exchange) throw new Error('交换记录不存在');
    if (exchange.status !== ExchangeStatus.COMPLETED) throw new Error('交换未完成，无法评价');

    const existing = reviews.find(
      (item) => item.exchange_id === draft.exchange_id && item.reviewer_id === draft.reviewer_id,
    );
    if (existing) throw new Error('您已评价过此次交换');

    if (draft.reviewer_id === draft.reviewee_id) throw new Error('不能评价自己');

    const nextReview: Review = {
      ...draft,
      id: storage.createId('review'),
      created_at: new Date().toISOString(),
    };

    const delta = CREDIT_SCORE_CHANGE[draft.type];
    await userApi.adjustCreditScore(draft.reviewee_id, delta);

    await storage.set(STORAGE_KEYS.reviews, [nextReview, ...reviews]);
    return nextReview;
  },
};
