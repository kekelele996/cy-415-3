<template>
  <section v-if="currentUser" class="page profile-page">
    <div class="page-heading">
      <div>
        <p class="eyebrow">个人中心</p>
        <h1>资料越完整，交换越容易达成</h1>
      </div>
    </div>

    <div class="profile-layout">
      <form class="profile-form" @submit.prevent="save">
        <label>
          本地模拟登录
          <select v-model="selectedUserId" @change="switchUser">
            <option v-for="user in users" :key="user.id" :value="user.id">
              {{ user.nickname }} · {{ user.location }}
            </option>
          </select>
        </label>
        <AvatarUploader v-model="form.avatar" />
        <label>
          昵称
          <input v-model="form.nickname" />
        </label>
        <label>
          电话
          <input v-model="form.phone" />
        </label>
        <label>
          常用地点
          <input v-model="form.location" />
        </label>
        <button class="primary-button" type="submit">保存资料</button>
      </form>

      <div class="profile-side">
        <UserBrief :user="{ ...currentUser, ...form }" />
        <div class="stats-row">
          <span>发布 {{ myItems.length }}</span>
          <span>可交换 {{ availableCount }}</span>
          <span>信用 {{ currentUser.credit_score }}</span>
        </div>
        <div class="review-summary">
          <div class="review-summary__title">信用评价</div>
          <div class="review-summary__stats">
            <span class="review-summary__pos">👍 好评 {{ reviewStats.positive }}</span>
            <span class="review-summary__neg">👎 差评 {{ reviewStats.negative }}</span>
            <span class="review-summary__total">共 {{ reviewStats.total }} 条</span>
          </div>
        </div>
      </div>
    </div>

    <section class="my-items">
      <h2>我发布的物品</h2>
      <div v-if="myItems.length" class="waterfall waterfall--compact">
        <ItemCard
          v-for="item in myItems"
          :key="item.id"
          :item="item"
          :owner="currentUser"
        />
      </div>
      <EmptyState v-else title="还没有发布物品" description="发布一件闲置后会出现在这里" mark="物" />
    </section>

    <section class="my-reviews">
      <h2>收到的评价</h2>
      <div v-if="reviewsReceived.length" class="review-list">
        <article
          v-for="review in reviewsReceived"
          :key="review.id"
          class="review-card"
          :class="review.type === 'positive' ? 'review-card--positive' : 'review-card--negative'"
        >
          <header class="review-card__header">
            <div class="review-card__reviewer">
              <div
                class="avatar avatar--small"
                :style="{ backgroundImage: getReviewer(review.reviewer_id)?.avatar ? `url(${getReviewer(review.reviewer_id)?.avatar})` : undefined }"
              >
                <span v-if="!getReviewer(review.reviewer_id)?.avatar">
                  {{ getReviewer(review.reviewer_id)?.nickname?.slice(0, 1) ?? '?' }}
                </span>
              </div>
              <div>
                <strong>{{ getReviewer(review.reviewer_id)?.nickname ?? '匿名用户' }}</strong>
                <small>{{ getReviewer(review.reviewer_id)?.location ?? '' }}</small>
              </div>
            </div>
            <div class="review-card__meta">
              <span class="review-card__type">
                {{ review.type === 'positive' ? '👍 好评' : '👎 差评' }}
              </span>
              <small>{{ formatDate(review.created_at) }}</small>
            </div>
          </header>
          <div v-if="review.content" class="review-card__content">
            {{ review.content }}
          </div>
          <footer class="review-card__footer">
            <small>相关物品：{{ getExchangeItemsText(review.exchange_id) }}</small>
          </footer>
        </article>
      </div>
      <EmptyState v-else title="还没有收到评价" description="完成几次交换后，这里会出现其他用户对您的评价" mark="评" />
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch, watchEffect } from 'vue';

import AvatarUploader from '@/components/common/AvatarUploader.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import ItemCard from '@/components/common/ItemCard.vue';
import UserBrief from '@/components/common/UserBrief.vue';
import { ItemStatus } from '@/constants/item';
import { useAuth } from '@/hooks/useAuth';
import { useItemStore } from '@/stores/itemStore';
import { useReviewStore } from '@/stores/reviewStore';
import { useExchangeStore } from '@/stores/exchangeStore';
import { formatDate } from '@/utils/formatters';
import type { User } from '@/models/user';

const { currentUser, users, login, updateProfile } = useAuth();
const itemStore = useItemStore();
const reviewStore = useReviewStore();
const exchangeStore = useExchangeStore();
const selectedUserId = ref('');

const form = reactive({
  nickname: '',
  avatar: '',
  phone: '',
  location: '',
});

watchEffect(() => {
  if (currentUser.value) {
    selectedUserId.value = currentUser.value.id;
    form.nickname = currentUser.value.nickname;
    form.avatar = currentUser.value.avatar;
    form.phone = currentUser.value.phone;
    form.location = currentUser.value.location;
  }
});

watch(
  () => users.value.length,
  () => {
    if (!selectedUserId.value && currentUser.value) {
      selectedUserId.value = currentUser.value.id;
    }
  },
);

onMounted(async () => {
  await reviewStore.hydrate();
});

const myItems = computed(() => (currentUser.value ? itemStore.myItems(currentUser.value.id) : []));
const availableCount = computed(() => myItems.value.filter((item) => item.status === ItemStatus.AVAILABLE).length);

const reviewsReceived = computed(() => {
  if (!currentUser.value) return [];
  return reviewStore.byReviewee(currentUser.value.id);
});

const reviewStats = computed(() => {
  const list = reviewsReceived.value;
  return {
    total: list.length,
    positive: list.filter((r) => r.type === 'positive').length,
    negative: list.filter((r) => r.type === 'negative').length,
  };
});

const getReviewer = (reviewerId: string): User | undefined => {
  return users.value.find((u) => u.id === reviewerId);
};

const getExchangeItemsText = (exchangeId: string): string => {
  const exchange = exchangeStore.exchanges.find((e) => e.id === exchangeId);
  if (!exchange) return '未知交换';
  const fromItem = itemStore.items.find((i) => i.id === exchange.from_item_id);
  const toItem = itemStore.items.find((i) => i.id === exchange.to_item_id);
  return `${fromItem?.title ?? '?'} ↔ ${toItem?.title ?? '?'}`;
};

const save = async () => {
  await updateProfile({ ...form });
};

const switchUser = async () => {
  if (selectedUserId.value) {
    await login(selectedUserId.value);
  }
};
</script>
