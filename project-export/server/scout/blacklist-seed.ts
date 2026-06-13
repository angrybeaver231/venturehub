/**
 * Initial brand blacklist for the Pre-Revenue Discovery Engine.
 *
 * These are well-known mature companies that the openai-web-discovery
 * collector keeps surfacing as "edtech / fintech startups" because gpt-4o-mini
 * recognises the brands strongly. Hard-blocking them here is the cheapest
 * fix: any signal whose domain or canonical name normalises into one of
 * these entries never gets a proto_startup row.
 *
 * Domains are stored as eTLD+1 (lower-cased, no `www.`). Company names are
 * stored lower-cased with juridic prefixes/suffixes (ООО / OOO / ИП / ПАО /
 * LLC / Inc / Ltd) and quotes stripped. Matching is performed by
 * `isBlacklisted()` in `./blacklist.ts` after applying the same
 * normalisation to candidate inputs.
 */

export const INITIAL_BLACKLIST: Array<{
  matchType: "domain" | "company_name" | "inn" | "tg_channel";
  value: string;
  reason: string;
}> = [
  // Edtech (most common false-positive bucket)
  { matchType: "domain", value: "skyeng.ru", reason: "established edtech, 10+ years" },
  { matchType: "company_name", value: "skyeng", reason: "established edtech" },
  { matchType: "domain", value: "getcourse.ru", reason: "established LMS" },
  { matchType: "domain", value: "getcourse.io", reason: "established LMS" },
  { matchType: "company_name", value: "getcourse", reason: "established LMS" },
  { matchType: "domain", value: "puzzle-english.com", reason: "established edtech" },
  { matchType: "domain", value: "lingualeo.com", reason: "established edtech" },
  { matchType: "domain", value: "netology.ru", reason: "established edtech" },
  { matchType: "company_name", value: "netology", reason: "established edtech" },
  { matchType: "domain", value: "geekbrains.ru", reason: "established edtech" },
  { matchType: "company_name", value: "geekbrains", reason: "established edtech" },
  { matchType: "domain", value: "skillbox.ru", reason: "established edtech" },
  { matchType: "company_name", value: "skillbox", reason: "established edtech" },
  { matchType: "domain", value: "skillfactory.ru", reason: "established edtech" },
  { matchType: "domain", value: "yandex-praktikum.ru", reason: "established edtech" },
  { matchType: "domain", value: "practicum.yandex.ru", reason: "established edtech" },
  { matchType: "company_name", value: "yandex praktikum", reason: "established edtech" },
  { matchType: "company_name", value: "яндекс практикум", reason: "established edtech" },
  { matchType: "domain", value: "stepik.org", reason: "established edtech" },
  { matchType: "domain", value: "coursera.org", reason: "global edtech giant" },
  { matchType: "domain", value: "uchi.ru", reason: "established edtech" },
  { matchType: "domain", value: "foxford.ru", reason: "established edtech" },
  // Big tech / marketplaces / banks / telecom
  { matchType: "domain", value: "yandex.ru", reason: "big tech" },
  { matchType: "domain", value: "ya.ru", reason: "big tech" },
  { matchType: "domain", value: "yandex.com", reason: "big tech" },
  { matchType: "company_name", value: "yandex", reason: "big tech" },
  { matchType: "company_name", value: "яндекс", reason: "big tech" },
  { matchType: "domain", value: "vk.com", reason: "big tech" },
  { matchType: "domain", value: "vk.ru", reason: "big tech" },
  { matchType: "company_name", value: "vk", reason: "big tech" },
  { matchType: "company_name", value: "вконтакте", reason: "big tech" },
  { matchType: "domain", value: "mail.ru", reason: "big tech" },
  { matchType: "domain", value: "ok.ru", reason: "big tech" },
  { matchType: "domain", value: "dzen.ru", reason: "big tech" },
  { matchType: "domain", value: "rutube.ru", reason: "big tech" },
  { matchType: "domain", value: "ozon.ru", reason: "marketplace" },
  { matchType: "company_name", value: "ozon", reason: "marketplace" },
  { matchType: "domain", value: "wildberries.ru", reason: "marketplace" },
  { matchType: "company_name", value: "wildberries", reason: "marketplace" },
  { matchType: "company_name", value: "вайлдберриз", reason: "marketplace" },
  { matchType: "domain", value: "avito.ru", reason: "marketplace" },
  { matchType: "company_name", value: "avito", reason: "marketplace" },
  { matchType: "domain", value: "lamoda.ru", reason: "marketplace" },
  { matchType: "domain", value: "kazanexpress.ru", reason: "marketplace" },
  { matchType: "domain", value: "sbermegamarket.ru", reason: "marketplace" },
  { matchType: "domain", value: "tinkoff.ru", reason: "bank" },
  { matchType: "domain", value: "tbank.ru", reason: "bank" },
  { matchType: "company_name", value: "tinkoff", reason: "bank" },
  { matchType: "company_name", value: "тинькофф", reason: "bank" },
  { matchType: "domain", value: "sber.ru", reason: "bank" },
  { matchType: "domain", value: "sberbank.ru", reason: "bank" },
  { matchType: "company_name", value: "sber", reason: "bank" },
  { matchType: "company_name", value: "сбер", reason: "bank" },
  { matchType: "company_name", value: "сбербанк", reason: "bank" },
  { matchType: "domain", value: "vtb.ru", reason: "bank" },
  { matchType: "domain", value: "alfabank.ru", reason: "bank" },
  { matchType: "domain", value: "raiffeisen.ru", reason: "bank" },
  { matchType: "domain", value: "mts.ru", reason: "telecom" },
  { matchType: "domain", value: "mtsbank.ru", reason: "telecom-bank" },
  { matchType: "domain", value: "beeline.ru", reason: "telecom" },
  { matchType: "domain", value: "megafon.ru", reason: "telecom" },
  { matchType: "domain", value: "tele2.ru", reason: "telecom" },
  { matchType: "domain", value: "rt.ru", reason: "telecom" },
  { matchType: "domain", value: "rostelecom.ru", reason: "telecom" },
  // Food / delivery / retail
  { matchType: "domain", value: "samokat.ru", reason: "established delivery" },
  { matchType: "domain", value: "delivery-club.ru", reason: "established delivery" },
  { matchType: "domain", value: "yandex.eda", reason: "established delivery" },
  { matchType: "domain", value: "kuper.ru", reason: "established delivery (ex-sbermarket)" },
  { matchType: "domain", value: "vkusvill.ru", reason: "retail" },
  { matchType: "domain", value: "pyaterochka.ru", reason: "retail" },
  { matchType: "domain", value: "magnit.ru", reason: "retail" },
  { matchType: "domain", value: "lenta.com", reason: "retail" },
  // Media / entertainment
  { matchType: "domain", value: "kinopoisk.ru", reason: "established media" },
  { matchType: "domain", value: "ivi.ru", reason: "established media" },
  { matchType: "domain", value: "okko.tv", reason: "established media" },
  { matchType: "domain", value: "wink.ru", reason: "established media" },
  { matchType: "domain", value: "litres.ru", reason: "established media" },
  { matchType: "domain", value: "mts-music.ru", reason: "established media" },
  // Software giants
  { matchType: "domain", value: "1c.ru", reason: "enterprise software giant" },
  { matchType: "company_name", value: "1c", reason: "enterprise software giant" },
  { matchType: "domain", value: "kaspersky.ru", reason: "enterprise software giant" },
  { matchType: "domain", value: "kaspersky.com", reason: "enterprise software giant" },
  { matchType: "company_name", value: "kaspersky", reason: "enterprise software giant" },
  { matchType: "domain", value: "abbyy.com", reason: "enterprise software giant" },
  { matchType: "domain", value: "jetbrains.com", reason: "enterprise software giant" },
  { matchType: "domain", value: "veeam.com", reason: "enterprise software giant" },
  // Electronics / sport retail
  { matchType: "domain", value: "mvideo.ru", reason: "retail" },
  { matchType: "domain", value: "eldorado.ru", reason: "retail" },
  { matchType: "domain", value: "dns-shop.ru", reason: "retail" },
  { matchType: "domain", value: "citilink.ru", reason: "retail" },
  { matchType: "domain", value: "sportmaster.ru", reason: "retail" },
];
