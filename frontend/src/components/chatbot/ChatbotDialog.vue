<template>
  <Dialog
    :visible="visible"
    modal
    :style="{ width: '560px', maxWidth: '95vw' }"
    class="chatbot-dialog"
    @update:visible="$emit('update:visible', $event)"
  >
    <template #header>
      <div class="flex align-items-center gap-2">
        <div class="ai-header-icon flex align-items-center justify-content-center border-round">
          <i class="pi pi-sparkles text-navy font-bold"></i>
        </div>
        <div>
          <span class="font-bold text-lg text-navy-dark">Lead AI Assistant</span>
          <div class="text-xs text-color-secondary">Quickly query lead statistics with Gemini</div>
        </div>
      </div>
    </template>

    <div class="chatbot-container flex flex-column">
      <!-- Quick Prompt Suggestions -->
      <div v-if="messages.length <= 1" class="quick-prompts mb-3">
        <span class="text-xs font-semibold text-color-secondary mb-2 block">Suggested questions:</span>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="(prompt, idx) in quickPrompts"
            :key="idx"
            type="button"
            class="prompt-chip"
            :disabled="loading"
            @click="handleSend(prompt)"
          >
            <i class="pi pi-question-circle text-xs mr-1 text-navy"></i>
            {{ prompt }}
          </button>
        </div>
      </div>

      <!-- Messages Box -->
      <div ref="messagesBoxRef" class="chat-messages surface-ground p-3 border-round">
        <div
          v-for="(msg, index) in messages"
          :key="index"
          :class="['message-row flex mb-3', msg.role === 'user' ? 'justify-content-end' : 'justify-content-start']"
        >
          <div v-if="msg.role === 'assistant'" class="bot-avatar mr-2">
            <i class="pi pi-sparkles text-xs"></i>
          </div>

          <div :class="['message-bubble p-2 border-round shadow-1', msg.role === 'user' ? 'user-bubble' : 'bot-bubble']">
            <div
              v-if="msg.role === 'assistant'"
              v-html="renderMarkdown(msg.text)"
              class="markdown-content text-sm"
            />
            <div v-else class="text-sm user-text">
              {{ msg.text }}
            </div>
          </div>
        </div>

        <!-- Loading indicator -->
        <div v-if="loading" class="flex align-items-center gap-2 text-color-secondary text-sm p-2">
          <i class="pi pi-spin pi-spinner text-navy"></i>
          <span>AI is analyzing and retrieving data...</span>
        </div>
      </div>
    </div>

    <!-- Footer Input Bar -->
    <template #footer>
      <div class="flex align-items-center gap-2 w-full pt-2">
        <InputText
          v-model="inputQuery"
          placeholder="Ask about lead metrics (e.g. how many leads submitted last week?)..."
          class="flex-1 text-sm chatbot-input"
          :disabled="loading"
          @keyup.enter="handleSend()"
        />
        <Button
          icon="pi pi-send"
          class="navy-send-btn"
          :loading="loading"
          :disabled="!inputQuery.trim() || loading"
          @click="handleSend()"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { sendChatMessage } from '@/services/chatbotService'

defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

defineEmits(['update:visible'])

const inputQuery = ref('')
const loading = ref(false)
const messagesBoxRef = ref(null)

const quickPrompts = [
  'How many leads are assigned to me?',
  'How many leads were submitted in last week?',
  'How many leads were submitted today?'
]

const messages = ref([
  {
    role: 'assistant',
    text: 'Hello! I can help you quickly look up Lead data, such as your assigned leads, newly submitted leads today, this week, or in the past week.'
  }
])

const renderMarkdown = (text) => {
  if (!text) return ''
  const rawHtml = marked.parse(text)
  return DOMPurify.sanitize(rawHtml)
}

const scrollToBottom = async () => {
  await nextTick()
  if (messagesBoxRef.value) {
    messagesBoxRef.value.scrollTop = messagesBoxRef.value.scrollHeight
  }
}

const handleSend = async (customMessage) => {
  const query = (customMessage || inputQuery.value || '').trim()
  if (!query || loading.value) return

  messages.value.push({ role: 'user', text: query })
  if (!customMessage) inputQuery.value = ''
  scrollToBottom()

  loading.value = true
  try {
    const reply = await sendChatMessage(query)
    messages.value.push({
      role: 'assistant',
      text: reply || 'Data retrieved successfully.'
    })
  } catch (error) {
    messages.value.push({
      role: 'assistant',
      text: error.response?.data?.error || error.message || 'Unable to connect to the AI server.'
    })
  } finally {
    loading.value = false
    scrollToBottom()
  }
}

watch(messages, () => scrollToBottom(), { deep: true })
</script>

<style scoped>
/* Navy Color Variables */
:deep(.chatbot-dialog) {
  --navy-primary: #1e3a8a;
  --navy-dark: #0f172a;
  --navy-hover: #1d4ed8;
  --navy-light: #eff6ff;
  --navy-border: #bfdbfe;
}

.text-navy {
  color: #1e3a8a;
}

.text-navy-dark {
  color: #0f172a;
}

.chatbot-dialog :deep(.p-dialog-content) {
  padding: 0.5rem 1.25rem 0.5rem 1.25rem;
}

.ai-header-icon {
  width: 32px;
  height: 32px;
  background-color: #eff6ff;
  border: 1px solid #dbeafe;
}

.prompt-chip {
  background: var(--surface-card, #ffffff);
  border: 1px solid var(--surface-border, #e2e8f0);
  border-radius: 16px;
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  color: #334155;
  cursor: pointer;
  transition: all 0.2s ease;
}

.prompt-chip:hover:not(:disabled) {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1e3a8a;
}

.prompt-chip:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.chat-messages {
  height: 380px;
  overflow-y: auto;
  border: 1px solid var(--surface-border, #e2e8f0);
}

.bot-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #2755d6;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.message-bubble {
  max-width: 85%;
  line-height: 1.5;
}

.user-bubble {
  background: #235dfa;
  color: #ffffff;
  border-bottom-right-radius: 2px;
}

.bot-bubble {
  background: var(--surface-card, #ffffff);
  color: var(--text-color, #1e293b);
  border: 1px solid var(--surface-border, #e2e8f0);
  border-bottom-left-radius: 2px;
}

.user-text {
  white-space: pre-wrap;
  word-break: break-word;
}

/* Markdown styling inside assistant response */
.markdown-content :deep(p) {
  margin: 0 0 0.5rem 0;
}

.markdown-content :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 0.25rem 0 0.5rem 0;
  padding-left: 1.25rem;
}

.markdown-content :deep(li) {
  margin-bottom: 0.25rem;
}

.markdown-content :deep(strong) {
  font-weight: 600;
  color: #2755d6;
}
</style>
