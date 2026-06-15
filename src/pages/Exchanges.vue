<template>
  <section class="page exchanges-page">
    <div class="page-heading">
      <div>
        <p class="eyebrow">交换管理</p>
        <h1>让每一次交换都有状态</h1>
      </div>
    </div>

    <div class="stats-row">
      <span>全部 {{ stats.total }}</span>
      <span>待确认 {{ stats.pending }}</span>
      <span>已同意 {{ stats.accepted }}</span>
      <span>已完成 {{ stats.completed }}</span>
      <span v-if="stats.needsReview > 0" class="stats-row__alert">
        <span class="stats-row__dot"></span>
        待评价 {{ stats.needsReview }}
      </span>
    </div>

    <div v-if="stats.needsReview > 0" class="exchanges-urgent-banner">
      <div>
        <strong>您有 {{ stats.needsReview }} 次交换待评价</strong>
        <p>完成评价可以帮助其他用户了解交换伙伴的信誉</p>
      </div>
      <button type="button" class="primary-button" @click="showOnlyNeedsReview = !showOnlyNeedsReview">
        {{ showOnlyNeedsReview ? '显示全部' : '只看待评价' }}
      </button>
    </div>

    <div class="segmented">
      <button :class="{ active: tab === 'sent' }" type="button" @click="tab = 'sent'">我发起的</button>
      <button :class="{ active: tab === 'received' }" type="button" @click="tab = 'received'">我收到的</button>
      <select v-model="exchangeStore.statusFilter">
        <option value="all">全部状态</option>
        <option v-for="option in EXCHANGE_STATUS_OPTIONS" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </div>

    <div v-if="visibleExchanges.length" class="exchange-list">
      <ExchangeCard
        v-for="exchange in visibleExchanges"
        :key="exchange.id"
        :exchange="exchange"
        :items="itemStore.items"
        :users="authStore.users"
        @accept="exchangeStore.accept"
        @reject="exchangeStore.reject"
        @complete="completeExchange"
        @review="openReview"
      />
    </div>
    <EmptyState
      v-else
      :title="showOnlyNeedsReview ? '没有待评价的交换了' : '暂无交换请求'"
      :description="showOnlyNeedsReview ? '您已完成所有评价，做得好！' : PAGE_MESSAGES.exchangeEmpty"
      mark="换"
    />

    <ReviewDialog
      :visible="reviewDialogVisible"
      :exchange="targetExchange"
      :users="authStore.users"
      :items="itemStore.items"
      @close="reviewDialogVisible = false"
      @submitted="onReviewSubmitted"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import EmptyState from '@/components/common/EmptyState.vue';
import ExchangeCard from '@/components/common/ExchangeCard.vue';
import ReviewDialog from '@/components/common/ReviewDialog.vue';
import { EXCHANGE_STATUS_OPTIONS, ExchangeStatus } from '@/constants/exchange';
import { PAGE_MESSAGES } from '@/constants/messages';
import { useExchangeStats } from '@/hooks/useExchangeStats';
import { useAuthStore } from '@/stores/authStore';
import { useExchangeStore } from '@/stores/exchangeStore';
import { useItemStore } from '@/stores/itemStore';
import { useReviewStore } from '@/stores/reviewStore';
import type { Exchange } from '@/models/exchange';

const authStore = useAuthStore();
const itemStore = useItemStore();
const exchangeStore = useExchangeStore();
const reviewStore = useReviewStore();
const tab = ref<'sent' | 'received'>('sent');
const showOnlyNeedsReview = ref(false);
const reviewDialogVisible = ref(false);
const targetExchange = ref<Exchange | null>(null);

const mine = computed(() => {
  if (!authStore.currentUser) return [];
  const list = tab.value === 'sent' ? exchangeStore.sent(authStore.currentUser.id) : exchangeStore.received(authStore.currentUser.id);
  return exchangeStore.statusFilter === 'all'
    ? list
    : list.filter((item) => item.status === exchangeStore.statusFilter);
});

const visibleExchanges = computed(() => {
  let list = mine.value;
  if (showOnlyNeedsReview.value && authStore.currentUser) {
    list = list.filter((item) => {
      if (item.status !== ExchangeStatus.COMPLETED) return false;
      return !reviewStore.hasReviewed(item.id, authStore.currentUser!.id);
    });
  }
  return list;
});

const stats = computed(() => {
  const base = useExchangeStats(() => exchangeStore.exchanges).value;
  let needsReview = 0;
  if (authStore.currentUser) {
    const allMine = [
      ...exchangeStore.sent(authStore.currentUser.id),
      ...exchangeStore.received(authStore.currentUser.id),
    ];
    needsReview = allMine.filter((item) => {
      if (item.status !== ExchangeStatus.COMPLETED) return false;
      return !reviewStore.hasReviewed(item.id, authStore.currentUser!.id);
    }).length;
  }
  return { ...base, needsReview };
});

const completeExchange = async (id: string) => {
  await exchangeStore.complete(id);
  itemStore.items = itemStore.items.map((item) => item);
};

const openReview = (id: string) => {
  targetExchange.value = exchangeStore.exchanges.find((e) => e.id === id) ?? null;
  reviewDialogVisible.value = true;
};

const onReviewSubmitted = () => {
  targetExchange.value = null;
};

onMounted(async () => {
  await reviewStore.hydrate();
});

void ExchangeStatus.PENDING;
</script>
