/**
 * Static Letter Content
 * Flexible structure untuk multi-page newspaper letter
 */

export interface LetterSection {
  type:
    | "headline"
    | "subheading"
    | "body"
    | "quote"
    | "image"
    | "section-title"
    | "carousel";
  content: string;
  alignment?: "left" | "center" | "right";
  size?: "sm" | "md" | "lg" | "xl";
  images?: string[]; // For carousel type
}

export interface LetterPage {
  pageNumber: number;
  title?: string; // Newspaper title (e.g., "THE LOVE TIMES")
  date?: string; // Newspaper date (e.g., "SUNDAY, FEBRUARY 14, 2030")
  location?: string; // Location header (e.g., "CITY, STREET, COUNTRY")
  subtitle?: string; // Edition subtitle (e.g., "LOVE EDITION")
  sections: LetterSection[];
  imageUrl?: string; // Main featured image
}

/**
 * Letter pages configuration
 * Modify sections array untuk tambah/kurang konten per halaman
 */
export const letterPages: LetterPage[] = [
  {
    pageNumber: 1,
    title: "HAPPY BIRTHDAY SAYANGKU🎊🎊",
    date: "MONDAY, MAY 25, 2026",
    location: "💝💖💕❤️💘",
    subtitle: "DARI FINFUN", // Replace dengan actual image
    sections: [
      {
        type: "headline",
        content:
          "HAPPY BIRTHDAY YAA SAYANGKU CINTAKU MANISKU CANTIKU DUNIAKU REZEKINYA AKU XIXIXI",
        alignment: "center",
        size: "xl",
      },
      {
        type: "subheading",
        content: "",
        alignment: "center",
        size: "md",
      },
      {
        type: "image",
        content: "/images/letter-main.jpg",
      },
      {
        type: "body",
        content:
          "Haiii, makasih yaa udah percaya dan sabar menemaniku aku mwehehe gak sadar juga aku udah nemenin 3 kali ultah kamu awww, aku seneng dan bersyukur banget karena aku dipertemukan sama wanita cangtiipp baik hati lemah lembut dan suaaabbbarr pooolll mweheheh loplop sekebon❤️, 3 kali ulang tahun dan kali ini gabisa ketemu langsung makanya bikin ginian biar rada senyum-senyum sikit nti baca nya xixixi, dah kebayang sih ekspresi kamu ngook aku kan visioner hebat<3",
        alignment: "left",
      },
    ],
  },
  {
    pageNumber: 2,
    title: "HAPPY BIRTHDAY SAYANGKU🎊🎊",
    date: "MONDAY, MAY 25, 2026",
    location: "💝💖💕❤️💘",
    subtitle: "DARI FINFUN",
    sections: [
      {
        type: "section-title",
        content: "THE DAY I CHOOSE YOU",
        alignment: "left",
        size: "lg",
      },
      {
        type: "body",
        content:
          "Judulnya doang itumah aku gak inget hari apa wkwkwk, tapi satu hal yang aku inget kenapa aku yakin buat sama kamu karena gak lama kita deket aku dicoba Tuhan mulai ditinggal omah, kerjaan, smpe nganggur yang lama banget tuh dri awal tahun smpe akhir tahun yang aku kiranya kamu bakalan cabut buat pilih dokter-dokter disana tpi ternyata ttp milih si ganteng kalem baik hati ini xixixi awww. Dari aku yang pertama kali ketemu aku ngerokok di depan kamu aww gelo kurasa waktu itu mwehehee smpe akhirnya aku bisa berhenti ngerokok at least di depan kamu ngoook maap, tapi aku beneran gak nyangka aja kenapa Tuhan bisa pertemukan aku sama kamu yang baiiiikk banget dan canggtiip bangeeet ini huhuhu.",
        alignment: "left",
      },
      {
        type: "quote",
        content:
          '"Semoga semua kebahagiaan di dunia ini bisa awaaa dapatkan yaa sayaang" - Forever & Ameen',
        alignment: "center",
        size: "md",
      },
      {
        type: "carousel",
        content: "Foto yang KATA AKU kamu cantiiik xixix",
        images: [
          "/images/img1.jpg",
          "/images/img1.jpg",
          "/images/img1.jpg",
          "/images/img1.jpg",
          "/images/img1.jpg",
          "/images/img1.jpg",
        ],
      },
      {
        type: "image",
        content: "/images/letter-memory.jpg",
      },
    ],
  },
  {
    pageNumber: 3,
    title: "THE LOVE TIMES",
    date: "SUNDAY, FEBRUARY 14, 2030",
    location: "PAGE 3",
    subtitle: "FOREVER PROMISE",
    sections: [
      {
        type: "section-title",
        content: "TO THE END OF TIME",
        alignment: "center",
        size: "lg",
      },
      {
        type: "body",
        content:
          "I promise to love you through every season, every challenge, and every joy. You are my greatest adventure, my sweetest dream, and my forever home.",
        alignment: "center",
      },
      {
        type: "quote",
        content:
          '"I choose you. Today, tomorrow, and every day after." - Forever Yours',
        alignment: "center",
        size: "md",
      },
      {
        type: "body",
        content: "With all my heart,\n\nFinnn",
        alignment: "right",
      },
    ],
  },
];

/**
 * Audio effects untuk letter experience
 */
export const letterAudio = {
  pageFlip: "/audio/page-flip.mp3", // Suara kertas flip
  letterOpen: "/audio/letter-open.mp3", // Suara bukaan awal
  ambience: "/audio/letter-ambience.mp3", // Background ambience (optional)
};
