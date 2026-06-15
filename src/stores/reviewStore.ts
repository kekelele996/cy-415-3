import { defineStore } from 'pinia';

import { reviewApi } from '@/api/reviewApi';
import { authStore } from '@/stores/authStore';
import type { Review, ReviewDraft } from '@/models/review';
import { message } from '@/utils/message';
import { useAuthStore } from '@/stores/authStore';

export const useReviewStore = defineStore('reviews', {
  state: () => ({
    reviews: [] as Review[],
    loading: false,
  }),
  getters: {
    byReviewee: (state) => (revieweeId: string) =>
      state.reviews.filter((item) => item.reviewee_id === revieweeId),
    byReviewer: (state) => (reviewerId: string) =>
      state.reviews.filter((item) => item.reviewer_id === reviewerId),
    byExchange: (state) => (exchangeId: string) =>
      state.reviews.filter((item) => item.exchange_id === exchangeId),
    getForExchangeAndReviewer: (state) => (exchangeId: string, reviewerId: string) =>
      state.reviews.find((item) => item.exchange_id === exchangeId && item.reviewer_id === reviewerId),
  },
  actions: {
    async hydrate() {
      this.loading = true;
      try {
        this.reviews = await reviewApi.list();
      } finally {
        this.loading = false;
      }
    },
    async create(draft: ReviewDraft) {
      const review = await reviewApi.create(draft);
      this.reviews = await reviewApi.list();
      const auth = useAuthStore();
      await auth.hydrate();
      message(draft.type === 'positive' ? '好评已提交，对方信用分 +3' : '差评已提交，对方信用分 -5', 'success');
      return review;
    },
    hasReviewed(exchangeId: string, reviewerId: string): boolean {
      return this.reviews.some(
        (item) => item.exchange_id === exchangeId && item.reviewer_id === reviewerId,
      );
    },
  },
});
