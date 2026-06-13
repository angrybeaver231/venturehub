import { GigaChat } from 'gigachat-node';

let gigaChatClient: GigaChat | null = null;
let tokenExpiry: Date | null = null;

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

async function getClient(): Promise<GigaChat> {
  const rawApiKey = process.env.GIGACHAT_API_KEY;
  
  if (!rawApiKey) {
    console.error('GIGACHAT_API_KEY is not set in environment variables');
    throw new Error('GIGACHAT_API_KEY environment variable is not set');
  }

  const apiKey = rawApiKey.trim().replace(/[\r\n\t ]/g, '');

  if (!gigaChatClient || !tokenExpiry || new Date() >= tokenExpiry) {
    try {
      gigaChatClient = new GigaChat({
        clientSecretKey: apiKey,
        isIgnoreTSL: true,
        isPersonal: true,
        autoRefreshToken: true,
      });

      await gigaChatClient.createToken();
      tokenExpiry = new Date(Date.now() + 25 * 60 * 1000);
      console.log('GigaChat client created successfully, token expires at:', tokenExpiry);
    } catch (error) {
      console.error('Failed to create GigaChat client or token:', error);
      gigaChatClient = null;
      tokenExpiry = null;
      throw error;
    }
  }

  return gigaChatClient;
}

export async function sendChatMessage(
  messages: ChatMessage[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<ChatResponse> {
  console.log('Sending chat message to GigaChat...');
  const client = await getClient();
  
  try {
    const response = await client.completion({
      model: options?.model || 'GigaChat:latest',
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 1024,
    });

    console.log('GigaChat response received successfully');
    return {
      content: response.choices[0]?.message?.content || '',
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      } : undefined,
    };
  } catch (error: any) {
    console.error('GigaChat completion error:', error?.message || error);
    if (error?.response) {
      console.error('GigaChat response data:', error.response.data);
    }
    throw error;
  }
}

export async function streamChatMessage(
  messages: ChatMessage[],
  onChunk: (chunk: string) => void,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const client = await getClient();
  
  const response = await client.completionStream({
    model: options?.model || 'GigaChat:latest',
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 1024,
  });

  let fullContent = '';
  
  for await (const chunk of response) {
    const content = chunk.choices[0]?.delta?.content || '';
    if (content) {
      fullContent += content;
      onChunk(content);
    }
  }

  return fullContent;
}

const EVENT_REGISTRATION_SYSTEM_PROMPT = `Ты — дружелюбный ассистент Предпринимательского Клуба Финансового Университета. Твоя задача — помочь пользователю зарегистрироваться на мероприятие, собрав необходимую информацию в формате приятной беседы.

Правила общения:
1. Будь дружелюбным и профессиональным
2. Задавай по одному вопросу за раз
3. Если пользователь что-то не понял — объясни проще
4. Подтверждай полученную информацию
5. В конце подведи итог и попроси подтвердить регистрацию

Информация для сбора будет указана в контексте мероприятия.`;

// Platform context interface for grounding AI responses
export interface PlatformContext {
  events?: Array<{ name: string; date: string; location: string; description?: string }>;
  courses?: Array<{ title: string; description?: string }>;
  videos?: Array<{ title: string; description?: string }>;
  livestreams?: Array<{ title: string; scheduledDate?: string }>;
}

function buildPlatformContextText(context: PlatformContext): string {
  let contextText = '';
  
  if (context.events && context.events.length > 0) {
    contextText += '\n\n=== АКТУАЛЬНЫЕ МЕРОПРИЯТИЯ ===\n';
    context.events.slice(0, 5).forEach((e, i) => {
      contextText += `${i + 1}. "${e.name}" - ${e.date}, ${e.location}${e.description ? ` - ${e.description.substring(0, 100)}` : ''}\n`;
    });
  }
  
  if (context.courses && context.courses.length > 0) {
    contextText += '\n\n=== ДОСТУПНЫЕ КУРСЫ ===\n';
    context.courses.slice(0, 5).forEach((c, i) => {
      contextText += `${i + 1}. "${c.title}"${c.description ? ` - ${c.description.substring(0, 100)}` : ''}\n`;
    });
  }
  
  if (context.videos && context.videos.length > 0) {
    contextText += '\n\n=== ВИДЕОМАТЕРИАЛЫ ===\n';
    context.videos.slice(0, 5).forEach((v, i) => {
      contextText += `${i + 1}. "${v.title}"${v.description ? ` - ${v.description.substring(0, 100)}` : ''}\n`;
    });
  }
  
  if (context.livestreams && context.livestreams.length > 0) {
    contextText += '\n\n=== ПРЕДСТОЯЩИЕ ТРАНСЛЯЦИИ ===\n';
    context.livestreams.slice(0, 3).forEach((l, i) => {
      contextText += `${i + 1}. "${l.title}"${l.scheduledDate ? ` - ${l.scheduledDate}` : ''}\n`;
    });
  }
  
  return contextText;
}

const ONBOARDING_SYSTEM_PROMPT_BASE = `Ты — официальный помощник по навигации на платформе Предпринимательского Клуба Финансового Университета.

ВАЖНЫЕ ПРАВИЛА:
1. Отвечай ТОЛЬКО на основе предоставленных данных о платформе ниже
2. Если информации нет в контексте — честно скажи "К сожалению, у меня нет информации об этом. Обратитесь к администратору."
3. НЕ выдумывай информацию о мероприятиях, курсах или видео
4. Будь дружелюбным и кратким
5. Отвечай на русском языке

Функции платформы:
- Мероприятия: регистрация на события, просмотр расписания
- Курсы: образовательные программы с видеоуроками и заданиями  
- Видео: записи прошедших мероприятий и обучающие материалы
- Стримы: прямые трансляции событий`;

export function getEventRegistrationPrompt(
  eventName: string, 
  eventDescription: string, 
  formFields: Array<{ label: string; type: string; required: boolean; options?: string[] | null }>
): string {
  let fieldsText = '';
  
  if (formFields.length > 0) {
    fieldsText = '\n\n=== ОБЯЗАТЕЛЬНЫЕ ВОПРОСЫ ДЛЯ РЕГИСТРАЦИИ ===\n';
    fieldsText += 'Ты ДОЛЖЕН задать каждый из этих вопросов и получить ответ:\n\n';
    
    formFields.forEach((f, i) => {
      const reqMark = f.required ? ' (ОБЯЗАТЕЛЬНО)' : ' (необязательно)';
      let fieldDesc = `${i + 1}. ${f.label}${reqMark}`;
      
      if (f.type === 'single_choice' && f.options) {
        fieldDesc += `\n   Варианты ответа: ${f.options.join(', ')}`;
      } else if (f.type === 'multiple_choice' && f.options) {
        fieldDesc += `\n   Можно выбрать несколько: ${f.options.join(', ')}`;
      }
      
      fieldsText += fieldDesc + '\n';
    });
    
    fieldsText += '\nПОРЯДОК РАБОТЫ:\n';
    fieldsText += '1. Приветствуй и кратко опиши мероприятие\n';
    fieldsText += '2. Задавай вопросы ПО ОДНОМУ в указанном порядке\n';
    fieldsText += '3. Дожидайся ответа на каждый вопрос\n';
    fieldsText += '4. Если вопрос обязательный и пользователь не ответил — переспроси\n';
    fieldsText += '5. После всех вопросов подведи итог и попроси подтвердить\n';
  } else {
    fieldsText = '\n\nДополнительных вопросов нет. Просто поприветствуй и предложи подтвердить регистрацию.';
  }
  
  return `${EVENT_REGISTRATION_SYSTEM_PROMPT}

=== ИНФОРМАЦИЯ О МЕРОПРИЯТИИ ===
Название: ${eventName}
Описание: ${eventDescription || 'Описание не указано'}
${fieldsText}`;
}

export function getOnboardingPrompt(platformContext?: PlatformContext): string {
  const contextText = platformContext ? buildPlatformContextText(platformContext) : '';
  
  return `${ONBOARDING_SYSTEM_PROMPT_BASE}${contextText}

Начни с приветствия и кратко расскажи, чем можешь помочь.`;
}

export async function extractRegistrationData(
  conversationHistory: ChatMessage[],
  requiredFields: string[]
): Promise<Record<string, string>> {
  const extractionPrompt = `Проанализируй диалог и извлеки следующую информацию в формате JSON:
${requiredFields.map(f => `"${f}": "значение или null если не указано"`).join(',\n')}

Верни ТОЛЬКО валидный JSON объект без дополнительного текста.`;

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
