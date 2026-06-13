import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export async function sendChatMessage(
  messages: ChatMessage[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<ChatResponse> {
  const response = await openai.chat.completions.create({
    model: options?.model || 'gpt-4o-mini',
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 1024,
  });

  return {
    content: response.choices[0]?.message?.content || '',
    usage: response.usage ? {
      promptTokens: response.usage.prompt_tokens,
      completionTokens: response.usage.completion_tokens,
      totalTokens: response.usage.total_tokens,
    } : undefined,
  };
}

const EVENT_REGISTRATION_SYSTEM_PROMPT = `Ты — дружелюбный ассистент Предпринимательского Клуба Финансового Университета. Твоя задача — помочь пользователю зарегистрироваться на мероприятие, собрав необходимую информацию в формате приятной беседы.

Правила общения:
1. Будь дружелюбным и профессиональным
2. Задавай по одному вопросу за раз
3. Если пользователь что-то не понял — объясни проще
4. Подтверждай полученную информацию
5. В конце подведи итог и попроси подтвердить регистрацию
6. Если пользователь пишет на английском — отвечай на английском

Информация для сбора будет указана в контексте мероприятия.`;

const ONBOARDING_SYSTEM_PROMPT = `Ты — помощник по навигации на платформе Предпринимательского Клуба Финансового Университета. Помогай новым пользователям:

1. Объясняй функции платформы (мероприятия, видео, курсы, стримы)
2. Помогай с регистрацией на мероприятия
3. Рассказывай о курсах и как их проходить
4. Отвечай на вопросы о Клубе

Будь дружелюбным, кратким и полезным. Отвечай на русском языке, если пользователь не пишет на английском.`;

export interface AIChatQuestion {
  id: string;
  question: string;
  questionEn?: string;
  description?: string;
  descriptionEn?: string;
  required: boolean;
  order: number;
}

export function getEventRegistrationPrompt(
  eventName: string, 
  eventDescription: string, 
  questions: AIChatQuestion[]
): string {
  const questionsText = questions.length > 0 
    ? `\n\nНеобходимо собрать следующую информацию, задавая вопросы по одному:
${questions.map((q, i) => `${i + 1}. ${q.question}${q.description ? ` (${q.description})` : ''}${q.required ? ' [обязательно]' : ' [опционально]'}`).join('\n')}`
    : '\n\nДополнительная информация не требуется, просто подтверди регистрацию.';
  
  return `${EVENT_REGISTRATION_SYSTEM_PROMPT}

Мероприятие: ${eventName}
Описание: ${eventDescription}${questionsText}

Начни с приветствия и краткого описания мероприятия, затем задай первый вопрос.`;
}

export function getOnboardingPrompt(): string {
  return ONBOARDING_SYSTEM_PROMPT;
}

export async function extractRegistrationData(
  conversationHistory: ChatMessage[],
  questions: AIChatQuestion[]
): Promise<Record<string, string>> {
  if (questions.length === 0) {
    return {};
  }

  const extractionPrompt = `Проанализируй диалог и извлеки следующую информацию в формате JSON:
{
${questions.map(q => `  "${q.question}": "значение из диалога или null если не указано"`).join(',\n')}
}

Верни ТОЛЬКО валидный JSON объект без дополнительного текста или форматирования markdown.`;

  const messages: ChatMessage[] = [
    ...conversationHistory,
    { role: 'user', content: extractionPrompt }
  ];

  const response = await sendChatMessage(messages, { temperature: 0.1 });
  
  try {
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse extraction response:', e);
  }
  
  return {};
}

export async function generateChallengeThumbnail(
  title: string,
  topic: string,
  difficulty: string
): Promise<string | null> {
  try {
    const prompt = `Create a professional, modern thumbnail for an AI debate challenge. Theme: "${topic}". The image should be abstract, futuristic, with a tech/AI aesthetic. Use bold colors like deep blue, purple, and cyan gradients. Include subtle geometric patterns and neural network visualizations. The style should be clean, minimalist, and suitable for a business/educational platform. No text, no people, no faces.`;
    
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1792x1024",
      quality: "standard",
    });

    return response.data?.[0]?.url || null;
  } catch (error) {
    console.error('Failed to generate thumbnail:', error);
    return null;
  }
}
