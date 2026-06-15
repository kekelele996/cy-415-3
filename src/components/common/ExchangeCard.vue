<template>
  <article class="exchange-card" :class="{ 'exchange-card--needs-review': needsMyReview }">
    <header>
      <div class="exchange-card__status-group">
        <span class="status-pill" :class="statusToneClass(exchange.status)">
          {{ formatExchangeStatus(exchange.status) }}
        </span>
        <span v-if="needsMyReview" class="review-pill review-pill--urgent">
          <span class="review-pill__dot"></span>
          待评价
        </span>
        <span v-else-if="myReview" class="review-pill review-pill--done" :class="myReview.type === 'positive' ? 'review-positive' : 'review-negative'">
          {{ myReview.type === 'positive' ? '👍 已好评' : '👎 已差评' }}
        </span>
      </div>
      <small>{{ formatDate(exchange.updated_at) }}</small>
    </header>
    <div class="exchange-card__items">
      <div>
        <span>拿出</span>
        <strong>{{ fromItem?.title ?? '未知物品' }}</strong>
      </div>
      <div>
        <span>换取</span>
        <strong>{{ toItem?.title ?? '未知物品' }}</strong>
      </div>
    </div>
    <p>{{ exchange.message || formatStatusMessage(exchange.status) }}</p>

    <div v-if="needsMyReview" class="exchange-card__review-banner">
      <div>
        <strong>交换已完成，快去给对方一个评价吧！</strong>
        <p>好评 +3 信用分，差评 -5 信用分</p>
      </div>
      <button type="button" class="primary-button" @click="$emit('review', exchange.id)">
        立即评价
      </button>
    </div>

    <footer>
      <span v-if="fromUser && toUser">{{ fromUser.nickname }} → {{ toUser.nickname }}</span>
      <div class="exchange-card__actions">
        <button v-if="exchange.status === ExchangeStatus.PENDING && canOperate" type="button" @click="$emit('accept', exchange.id)">
          同意
        </button>
        <button v-if="exchange.status === ExchangeStatus.PENDING && canOperate" type="button" @click="$emit('reject', exchange.id)">
          拒绝
        </button>
        <button v-if="exchange.status === ExchangeStatus.ACCEPTED && canOperate" type="button" @click="$emit('complete', exchange.id)">
          完成
        </button>
        <button
          v-if="exchange.status === ExchangeStatus.COMPLETED && needsMyReview"
          type="button"
          class="secondary-button"
          @click="$emit('review', exchange.id)"
        >
          去评价
        </button>
      </div>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { ExchangeStatus } from '@/constants/exchange';
import type { Exchange } from '@/models/exchange';
import type { Item } from '@/models/item';
import type { User } from '@/models/user';
import { useAuthStore } from '@/stores/authStore';
import { useReviewStore } from '@/stores/reviewStore';
import { formatDate, formatExchangeStatus, formatStatusMessage, statusToneClass } from '@/utils/formatters';

const props = defineProps<{
  exchange: Exchange;
  items: Item[];
  users: User[];
}>();

defineEmits<{
  accept: [id: string];
  reject: [id: string];
  complete: [id: string];
  review: [id: string];
}>();

const authStore = useAuthStore();
const reviewStore = useReviewStore();

const fromItem = computed(() => props.items.find((item) => item.id === props.exchange.from_item_id));
const toItem = computed(() => props.items.find((item) => item.id === props.exchange.to_item_id));
const fromUser = computed(() => props.users.find((user) => user.id === props.exchange.from_user_id));
const toUser = computed(() => props.users.find((user) => user.id === props.exchange.to_user_id));
const canOperate = computed(
  () =>
    authStore.currentUser?.id === props.exchange.to_user_id ||
    (authStore.currentUser?.id === props.exchange.from_user_id && props.exchange.status === ExchangeStatus.ACCEPTED),
);

const myReview = computed(() => {
  if (!authStore.currentUser) return null;
  return reviewStore.getForExchangeAndReviewer(props.exchange.id, authStore.currentUser.id);
});

const needsMyReview = computed(() => {
  if (!authStore.currentUser) return false;
  if (props.exchange.status !== ExchangeStatus.COMPLETED) return false;
  return !myReview.value;
});
</script>
