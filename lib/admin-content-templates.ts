export type TemplateContentType = "quest" | "message" | "minigame";
export type TemplateCategory =
  | "reflection"
  | "gratitude"
  | "romantic"
  | "memory"
  | "challenge"
  | "motivation";

export type ContentTemplate = {
  id: string;
  category: TemplateCategory;
  contentType: TemplateContentType;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
};

export const CONTENT_TEMPLATES: ContentTemplate[] = [
  {
    id: "reflection-best-thing-today",
    category: "reflection",
    contentType: "quest",
    title: "Daily Reflection: Best Thing",
    summary: "Prompt refleksi ringan untuk menutup hari.",
    payload: {
      title: "Apa hal terbaik hari ini?",
      description: "Ajak user menyadari satu momen baik hari ini.",
      type: "reflection",
      difficulty: "easy",
      xp_reward: 20,
      hearts_reward: 2,
      prompt: "Apa hal terbaik yang terjadi hari ini, sekecil apa pun itu?",
    },
  },
  {
    id: "reflection-tomorrow-improvement",
    category: "reflection",
    contentType: "quest",
    title: "Daily Reflection: Tomorrow",
    summary: "Prompt untuk merencanakan satu perbaikan kecil.",
    payload: {
      title: "Apa yang ingin diperbaiki besok?",
      description: "Bantu user membuat niat sederhana untuk besok.",
      type: "reflection",
      difficulty: "easy",
      xp_reward: 20,
      hearts_reward: 2,
      prompt: "Sebutkan satu hal kecil yang ingin kamu perbaiki besok.",
    },
  },
  {
    id: "gratitude-three-things",
    category: "gratitude",
    contentType: "quest",
    title: "Gratitude: Three Things",
    summary: "Template gratitude sederhana dan berulang.",
    payload: {
      title: "Sebutkan tiga hal yang kamu syukuri hari ini",
      description: "Latihan gratitude harian.",
      type: "text_answer",
      difficulty: "easy",
      xp_reward: 25,
      hearts_reward: 3,
      prompt: "Tulis tiga hal yang kamu syukuri hari ini.",
    },
  },
  {
    id: "romantic-loved-today",
    category: "romantic",
    contentType: "quest",
    title: "Romantic Check-In",
    summary: "Prompt untuk mengenali rasa dicintai.",
    payload: {
      title: "Apa yang membuatmu merasa dicintai hari ini?",
      description: "Romantic reflection untuk menjaga emotional closeness.",
      type: "reflection",
      difficulty: "easy",
      xp_reward: 30,
      hearts_reward: 4,
      prompt: "Apa satu hal hari ini yang membuatmu merasa dicintai atau diperhatikan?",
    },
  },
  {
    id: "memory-favorite-week",
    category: "memory",
    contentType: "quest",
    title: "Memory: Favorite Week",
    summary: "Prompt untuk mengumpulkan kenangan mingguan.",
    payload: {
      title: "Ceritakan kenangan favorit minggu ini",
      description: "Bahan memory vault dari cerita user.",
      type: "text_answer",
      difficulty: "medium",
      xp_reward: 35,
      hearts_reward: 4,
      prompt: "Ceritakan satu kenangan favoritmu minggu ini. Apa yang membuatnya spesial?",
    },
  },
  {
    id: "challenge-photo-reminder",
    category: "challenge",
    contentType: "minigame",
    title: "Photo Challenge: Tiny Reminder",
    summary: "Mini game challenge ringan berbasis prompt foto.",
    payload: {
      title: "Kirim foto sesuatu yang mengingatkanmu pada pasanganmu",
      description: "Small challenge untuk memantik cerita visual.",
      type: "Small Challenge",
      difficulty: "Easy",
      xp_reward: 35,
      hearts_reward: 5,
      prompt: "Ambil atau pilih satu foto benda/tempat yang mengingatkanmu pada pasanganmu.",
      options_json: [],
    },
  },
  {
    id: "motivation-week-goal",
    category: "motivation",
    contentType: "quest",
    title: "Motivation: Weekly Goal",
    summary: "Prompt untuk satu target realistis.",
    payload: {
      title: "Sebutkan satu hal yang ingin kamu capai minggu ini",
      description: "Motivational planning quest.",
      type: "text_answer",
      difficulty: "easy",
      xp_reward: 25,
      hearts_reward: 3,
      prompt: "Apa satu hal yang ingin kamu capai minggu ini, dan langkah kecil pertamanya apa?",
    },
  },
  {
    id: "hero-mood-soft-boost",
    category: "motivation",
    contentType: "message",
    title: "Hero Message: Morning Boost",
    summary: "Hero copy lembut untuk mood rendah atau pagi hari.",
    payload: {
      title: "Pelan-pelan juga tetap maju",
      body: "Hari ini tidak perlu sempurna. Cukup mulai dari satu hal kecil yang bikin hatimu sedikit lebih ringan.",
      tone: "soft",
    },
  },
  {
    id: "hero-romantic-reminder",
    category: "romantic",
    contentType: "message",
    title: "Hero Message: Romantic Reminder",
    summary: "Hero copy hangat untuk menjaga rasa dekat.",
    payload: {
      title: "Ada yang selalu sayang kamu",
      body: "Di tengah hari yang ramai, semoga kamu ingat: kamu dicintai, dipilih, dan dirayakan dengan cara yang pelan tapi tulus.",
      tone: "romantic",
    },
  },
];

export function getContentTemplate(id: string) {
  return CONTENT_TEMPLATES.find((template) => template.id === id) ?? null;
}
