<template>
  <Teleport to="body">
    <div v-if="visible" class="review-dialog__overlay" @click.self="close">
      <div class="review-dialog">
        <header class="review-dialog__header">
          <h3>评价这次交换</h3>
          <button type="button" class="review-dialog__close" @click="close">&times;</button>
        </header>

        <div v-if="reviewee" class="review-dialog__reviewee">
          <div class="avatar" :style="{ backgroundImage: reviewee.avatar ? `url(${reviewee.avatar})` : undefined }">
            <span v-if="!reviewee.avatar">{{ reviewee.nickname.slice(0, 1) }}</span>
          </div>
          <div>
            <strong>{{ reviewee.nickname }}</strong>
            <p>{{ reviewee.location }} · 信用分 {{ reviewee.credit_score }}</p>
          </div>
        </div>

        <div class="review-dialog__types">
          <button
            v-for="option in REVIEW_TYPE_OPTIONS"
            :key="option.value"
            type="button"
            :class="['review-dialog__type', { active: selectedType === option.value }]"
            @click="selectedType = option.value"
          >
            <span class="review-dialog__emoji">{{ option.emoji }}</span>
            <div>
              <strong>{{ option.label }}</strong>
              <small>信用分 {{ option.value === 'positive' ? '+3' : '-5' }}</small>
            </div>
          </button>
        </div>

        <label class="review-dialog__content">
          评价内容（选填）
          <textarea
            v-model="content"
            placeholder="说点什么吧，这次交换体验如何？"
            rows="4"
            maxlength="200"
          />
          <small class="form-note">{{ content.length }}/200</small>
        </label>

        <footer class="review-dialog__actions">
          <button type="button" class="secondary-button" @click="close">取消</button>
          <button
            type="button"
            class="primary-button"
            :disabled="!selectedType || submitting"
            @click="submit"
          >
            {{ submitting ? '提交中...' : '提交评价' }}
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { REVIEW_TYPE_OPTIONS } from '@/constants/review';
import { ReviewType } from '@/models/review';
import type { Exchange } from '@/models/exchange';
import type { Item } from '@/models/item';
import type { User } from '@/models/user';
import { useReviewStore } from '@/stores/reviewStore';
import { useAuthStore } from '@/stores/authStore';
import { message } from '@/utils/message';

interface Props {
  visible: boolean;
  exchange: Exchange | null;
  users: User[];
  items: Item[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  submitted: [];
}>();

const reviewStore = useReviewStore();
const authStore = useAuthStore();

const selectedType = ref<ReviewType | null>(null);
const content = ref('');
const submitting = ref(false);

const reviewee = computed(() => {
  if (!props.exchange || !authStore.currentUser) return null;
  const revieweeId = authStore.currentUser.id === props.exchange.from_user_id
    ? props.exchange.to_user_id
    : props.exchange.from_user_id;
  return props.users.find((u) => u.id === revieweeId) ?? null;
});

watch(
  () => props.visible,
  (val) => {
    if (val) {
      selectedType.value = null;
      content.value = '';
      submitting.value = false;
    }
  },
);

const close = () => {
  if (!submitting.value) {
    emit('close');
  }
};

const submit = async () => {
  if (!props.exchange || !selectedType.value || !authStore.currentUser || !reviewee.value) return;
  submitting.value = true;
  try {
    await reviewStore.create({
      exchange_id: props.exchange.id,
      reviewer_id: authStore.currentUser.id,
      reviewee_id: reviewee.value.id,
      type: selectedType.value,
      content: content.value.trim(),
    });
    emit('submitted');
    emit('close');
  } catch (err) {
    message(err instanceof Error ? err.message : '评价失败', 'error');
  } finally {
    submitting.value = false;
  }
};
</script>
