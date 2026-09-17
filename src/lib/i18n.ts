import i18next from "@i18next/i18next";

import enTranslation from "../locales/en/translation.json" with {
  type: "json",
};
import ptTranslation from "../locales/pt/translation.json" with {
  type: "json",
};

const systemLocale = Intl.DateTimeFormat().resolvedOptions().locale;

i18next
  //   .use(Backend)
  .init({
    // debug: true,
    fallbackLng: "en",
    resources: {
      en: {
        translation: enTranslation,
      },
      pt: {
        translation: ptTranslation,
      },
    },
  });

export default i18next.getFixedT(systemLocale);
