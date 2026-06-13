export type LegalDoc = "terms" | "privacy" | "data" | "marketing";

export interface LegalSection {
  heading?: string;
  body: string;
}

export interface LegalDocument {
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
}

type LegalContent = Record<"en" | "ru", Record<LegalDoc, LegalDocument>>;

export const legalContent: LegalContent = {
  en: {
    terms: {
      lastUpdated: "Last updated: 1 May 2026",
      intro:
        "These Terms of Service govern your use of the Business Club platform operated by the Financial University under the Government of the Russian Federation together with Ventorix (the \"Platform\"). By creating an account or otherwise using the Platform you agree to these Terms.",
      sections: [
        {
          heading: "1. Eligibility and accounts",
          body:
            "The Platform is intended for students, alumni, faculty, partners and guests of the Financial University and its corporate and academic partners. You must provide accurate information when registering and keep your account credentials confidential. You are responsible for all activity that occurs under your account.",
        },
        {
          heading: "2. Acceptable use",
          body:
            "You agree not to upload unlawful, infringing, harassing or misleading content, attempt to access other users' accounts, interfere with the operation of the Platform, scrape data without permission, or use the Platform to send unsolicited communications. We may suspend or remove content and accounts that violate these rules.",
        },
        {
          heading: "3. Events, courses and learning materials",
          body:
            "Some events and courses require separate registration, prerequisites or attendance verification (including QR scans). Certificates are issued only when stated requirements are met. Learning materials are provided for personal, non-commercial study unless we explicitly state otherwise.",
        },
        {
          heading: "4. Content you submit",
          body:
            "You retain ownership of content you submit (such as profile information, posts, applications and uploaded files). You grant the Platform a non-exclusive, royalty-free licence to host, display and process your content for the purpose of operating the Platform and the services you have requested.",
        },
        {
          heading: "5. Intellectual property",
          body:
            "The Platform, its design, source code, logos and the materials produced by the Financial University and Ventorix are protected by intellectual property laws. You may not copy, modify or redistribute them without prior written permission.",
        },
        {
          heading: "6. Third-party services",
          body:
            "The Platform integrates with third-party services such as RuTube for video playback, GigaChat for AI assistance, and email delivery providers. Your use of those services is also governed by their own terms. We are not responsible for the availability or content of third-party services.",
        },
        {
          heading: "7. Disclaimers and liability",
          body:
            "The Platform is provided on an \"as is\" basis. To the maximum extent permitted by law we disclaim all warranties and limit our liability for indirect, incidental or consequential damages. Nothing in these Terms limits liability that cannot be excluded under applicable law.",
        },
        {
          heading: "8. Termination",
          body:
            "You may stop using the Platform and request deletion of your account at any time. We may suspend or terminate access if you breach these Terms or if we are required to do so by law or by our partner institutions.",
        },
        {
          heading: "9. Changes and contact",
          body:
            "We may update these Terms from time to time and will notify active users of material changes. For questions about these Terms please contact support@businessclub.fa.ru.",
        },
      ],
    },
    privacy: {
      lastUpdated: "Last updated: 1 May 2026",
      intro:
        "This Privacy Policy explains how the Business Club platform collects, uses and protects personal data. We act as the data controller for personal data processed through the Platform.",
      sections: [
        {
          heading: "1. Data we collect",
          body:
            "We collect data you provide directly (name, email, organization, faculty, profile details, registration answers, files you upload), data generated as you use the Platform (events attended, courses enrolled, lessons completed, messages, application history), and limited technical data (IP address, device, browser, language preference).",
        },
        {
          heading: "2. How we use your data",
          body:
            "We use personal data to operate your account, deliver events and courses, issue certificates, process job and program applications, send service communications, secure the Platform, and improve our services. Where required by Russian Federal Law No. 152-FZ \"On Personal Data\" we obtain a separate consent for processing.",
        },
        {
          heading: "3. Legal bases",
          body:
            "We process personal data on the basis of (a) the contract formed by your acceptance of these Terms, (b) your explicit consent for specific processing such as marketing or sensitive data, (c) compliance with legal obligations applicable to the Financial University, and (d) our legitimate interests in operating and securing the Platform.",
        },
        {
          heading: "4. Sharing",
          body:
            "We share data with our hosting and infrastructure providers, integrated services (Neon, Google Cloud Storage, Resend, RuTube, GigaChat) strictly to deliver the Platform, with the Financial University and partner institutions for authorised academic and corporate programs you join, and with public authorities when legally required.",
        },
        {
          heading: "5. Storage and retention",
          body:
            "Data is stored on servers located in jurisdictions appropriate for the relevant service provider. We retain personal data only for as long as needed for the purposes described above or as required by law. Inactive accounts may be deleted after a reasonable retention period.",
        },
        {
          heading: "6. Security",
          body:
            "We use industry-standard measures including encrypted transport (TLS), access controls, hashed passwords and audit logging. No system is fully secure; please use a strong password and keep your verification codes private.",
        },
        {
          heading: "7. Your rights",
          body:
            "Subject to applicable law you may request access, correction, deletion or restriction of your personal data, withdraw consent, object to certain processing and request data portability. You can exercise most rights from your profile page or by contacting privacy@businessclub.fa.ru.",
        },
        {
          heading: "8. Cookies and similar technologies",
          body:
            "We use a minimum set of cookies and local storage required to keep you signed in, remember your language and theme preferences, and protect against abuse. Analytics, where used, is aggregated and does not identify individual users.",
        },
        {
          heading: "9. Contact",
          body:
            "For privacy questions or to exercise your rights please email privacy@businessclub.fa.ru. You also have the right to lodge a complaint with Roskomnadzor.",
        },
      ],
    },
    data: {
      lastUpdated: "Last updated: 1 May 2026",
      intro:
        "By accepting this Data Processing Consent you authorise the Financial University and Ventorix, acting as joint operators of the Business Club platform, to process your personal data in accordance with Federal Law No. 152-FZ \"On Personal Data\" and the Privacy Policy.",
      sections: [
        {
          heading: "1. Operator",
          body:
            "Operator: Federal State Educational Budgetary Institution of Higher Education \"Financial University under the Government of the Russian Federation\" together with the Ventorix product team. Address and full contact details are listed on the official Financial University website.",
        },
        {
          heading: "2. Categories of personal data",
          body:
            "Surname, first name and patronymic; email address and phone number; organization, faculty, study group, role and academic status; profile photo; event registration answers and uploaded files; course progress, grades and submissions; chat and application history; technical identifiers needed to operate the Platform.",
        },
        {
          heading: "3. Purposes of processing",
          body:
            "Account creation and authentication; participation in events, courses, programs and innovation activities; issuing certificates and access tickets; recruitment and job application handling; communications related to your participation; statistics and reporting in aggregated form; ensuring information security and fulfilling legal obligations.",
        },
        {
          heading: "4. Actions performed",
          body:
            "Collection, recording, systematisation, accumulation, storage, clarification (update, change), extraction, use, transfer (provision, access), depersonalisation, blocking, deletion and destruction, performed both with and without the use of automation tools.",
        },
        {
          heading: "5. Recipients",
          body:
            "Authorised employees of the Financial University and Ventorix, contracted infrastructure and communication providers listed in the Privacy Policy, and partner organisations for the specific programs you join. Cross-border transfer is performed only to providers ensuring an adequate level of protection.",
        },
        {
          heading: "6. Term and withdrawal",
          body:
            "This consent is valid for the duration of your account and for the additional retention period required by law or by the Operator's internal regulations. You may withdraw consent at any time by submitting a written request to privacy@businessclub.fa.ru. Withdrawal does not affect the lawfulness of processing carried out before withdrawal.",
        },
        {
          heading: "7. Rights of the data subject",
          body:
            "You confirm that you have been informed of your rights under Federal Law No. 152-FZ, including the right to access information about processing, request correction or deletion, and lodge a complaint with the supervisory authority (Roskomnadzor).",
        },
      ],
    },
    marketing: {
      lastUpdated: "Last updated: 1 May 2026",
      intro:
        "This consent is optional. By opting in you agree to receive marketing and informational communications from the Business Club platform. You can change your preference at any time in your profile settings.",
      sections: [
        {
          heading: "1. What you will receive",
          body:
            "Announcements about upcoming events, new courses and livestreams, club news, partner opportunities, scholarships and grants, surveys, and occasional product updates from Ventorix related to the Platform.",
        },
        {
          heading: "2. Channels",
          body:
            "Communications may be delivered by email, in-app notifications and, where you have provided a phone number and explicitly opted in, by messengers. We do not place automated voice calls and we do not use SMS for marketing purposes.",
        },
        {
          heading: "3. Frequency and content",
          body:
            "We aim to send no more than a few messages per month. Each message clearly identifies the sender, the purpose of the message and an unsubscribe link or instruction.",
        },
        {
          heading: "4. Personalisation",
          body:
            "We may use information about your faculty, role and previously attended events to make recommendations more relevant. We do not sell your personal data to third parties for their own marketing.",
        },
        {
          heading: "5. Opting out",
          body:
            "You can withdraw this marketing consent at any time by toggling the option in your profile, by clicking the unsubscribe link in any message, or by writing to privacy@businessclub.fa.ru. Service messages required to operate your account (such as security alerts) will continue to be sent.",
        },
      ],
    },
  },
  ru: {
    terms: {
      lastUpdated: "Дата обновления: 1 мая 2026 г.",
      intro:
        "Настоящие Условия использования регулируют использование платформы «Бизнес-клуб», оператором которой является Финансовый университет при Правительстве Российской Федерации совместно с командой Ventorix («Платформа»). Создавая учётную запись или иным образом используя Платформу, вы соглашаетесь с этими Условиями.",
      sections: [
        {
          heading: "1. Право на использование и аккаунт",
          body:
            "Платформа предназначена для студентов, выпускников, преподавателей, партнёров и гостей Финансового университета и его академических и корпоративных партнёров. При регистрации вы обязуетесь предоставлять достоверные данные и обеспечивать конфиденциальность учётных данных. Вы несёте ответственность за все действия, совершённые под вашей учётной записью.",
        },
        {
          heading: "2. Допустимое использование",
          body:
            "Вы обязуетесь не размещать незаконный, нарушающий чужие права, оскорбительный или вводящий в заблуждение контент, не получать доступ к чужим аккаунтам, не нарушать работу Платформы, не собирать данные без разрешения и не использовать Платформу для рассылки нежелательных сообщений. Мы вправе приостанавливать или удалять контент и учётные записи, нарушающие эти правила.",
        },
        {
          heading: "3. Мероприятия, курсы и учебные материалы",
          body:
            "Часть мероприятий и курсов требует отдельной регистрации, выполнения требований или подтверждения присутствия (в том числе через QR-код). Сертификаты выдаются только при выполнении заявленных условий. Учебные материалы предоставляются для личного некоммерческого использования, если прямо не указано иное.",
        },
        {
          heading: "4. Размещаемый вами контент",
          body:
            "Вы сохраняете права на размещаемый контент (профиль, публикации, заявки, загружаемые файлы). Вы предоставляете Платформе неисключительную безвозмездную лицензию на хранение, отображение и обработку этого контента в целях работы Платформы и оказания запрошенных вами сервисов.",
        },
        {
          heading: "5. Интеллектуальная собственность",
          body:
            "Платформа, её дизайн, исходный код, логотипы и материалы, созданные Финансовым университетом и Ventorix, охраняются законодательством об интеллектуальной собственности. Их копирование, изменение и распространение без письменного согласия не допускается.",
        },
        {
          heading: "6. Сторонние сервисы",
          body:
            "Платформа интегрируется со сторонними сервисами, в том числе RuTube для воспроизведения видео, GigaChat для ИИ-ассистента и провайдерами доставки писем. Использование таких сервисов также регулируется их условиями. Мы не несём ответственность за доступность и содержание сторонних сервисов.",
        },
        {
          heading: "7. Отказ от гарантий и ограничение ответственности",
          body:
            "Платформа предоставляется по принципу «как есть». В максимально допустимой законом степени мы отказываемся от каких-либо гарантий и ограничиваем ответственность за косвенные или сопутствующие убытки. Это положение не ограничивает ответственность, которая не может быть исключена по применимому законодательству.",
        },
        {
          heading: "8. Прекращение использования",
          body:
            "Вы можете в любой момент прекратить использование Платформы и запросить удаление аккаунта. Мы вправе приостановить или прекратить доступ при нарушении этих Условий, а также если этого требует закон или наши партнёрские организации.",
        },
        {
          heading: "9. Изменения и контакты",
          body:
            "Мы можем периодически обновлять эти Условия и уведомим активных пользователей о существенных изменениях. По вопросам Условий пишите на support@businessclub.fa.ru.",
        },
      ],
    },
    privacy: {
      lastUpdated: "Дата обновления: 1 мая 2026 г.",
      intro:
        "Настоящая Политика конфиденциальности описывает, как платформа «Бизнес-клуб» собирает, использует и защищает персональные данные. Мы выступаем оператором персональных данных, обрабатываемых через Платформу.",
      sections: [
        {
          heading: "1. Какие данные мы собираем",
          body:
            "Данные, которые вы предоставляете напрямую (ФИО, email, организация, факультет, профиль, ответы при регистрации, загружаемые файлы); данные, формируемые при использовании Платформы (посещённые мероприятия, курсы, прогресс, сообщения, история заявок); ограниченные технические данные (IP-адрес, устройство, браузер, язык интерфейса).",
        },
        {
          heading: "2. Как мы используем данные",
          body:
            "Для работы аккаунта, проведения мероприятий и курсов, выдачи сертификатов, обработки заявок на программы и вакансии, направления сервисных уведомлений, обеспечения безопасности и улучшения сервисов. В случаях, предусмотренных Федеральным законом № 152-ФЗ «О персональных данных», мы получаем отдельное согласие на обработку.",
        },
        {
          heading: "3. Правовые основания",
          body:
            "Обработка осуществляется на основании (а) договора, заключённого при принятии Условий, (б) явного согласия на отдельные виды обработки (например, маркетинг или специальные категории данных), (в) выполнения обязанностей, возложенных на Финансовый университет законом, и (г) законных интересов в обеспечении работы и безопасности Платформы.",
        },
        {
          heading: "4. Передача данных",
          body:
            "Мы передаём данные хостинг- и инфраструктурным провайдерам и интегрированным сервисам (Neon, Google Cloud Storage, Resend, RuTube, GigaChat) исключительно для работы Платформы, Финансовому университету и партнёрским организациям в рамках программ, в которых вы участвуете, а также государственным органам в случаях, предусмотренных законом.",
        },
        {
          heading: "5. Хранение и сроки",
          body:
            "Данные хранятся на серверах в юрисдикциях, соответствующих выбранным провайдерам. Мы храним персональные данные только в течение срока, необходимого для указанных целей или предусмотренного законом. Неактивные аккаунты могут быть удалены по истечении разумного срока хранения.",
        },
        {
          heading: "6. Безопасность",
          body:
            "Мы применяем общепринятые меры защиты: шифрование при передаче (TLS), разграничение доступа, хеширование паролей и журналирование. Ни одна система не является абсолютно защищённой; используйте надёжный пароль и не передавайте коды подтверждения третьим лицам.",
        },
        {
          heading: "7. Ваши права",
          body:
            "В соответствии с применимым законодательством вы можете запрашивать доступ, исправление, удаление или ограничение обработки своих данных, отзывать согласие, возражать против отдельных видов обработки и требовать переносимости данных. Большинство прав можно реализовать в личном кабинете или через privacy@businessclub.fa.ru.",
        },
        {
          heading: "8. Файлы cookie и аналогичные технологии",
          body:
            "Мы используем минимальный набор cookie и локального хранилища, необходимый для поддержания сессии, запоминания языка и темы интерфейса, а также для защиты от злоупотреблений. Если используется аналитика, она агрегирована и не идентифицирует отдельных пользователей.",
        },
        {
          heading: "9. Контакты",
          body:
            "По вопросам конфиденциальности и для реализации прав пишите на privacy@businessclub.fa.ru. Вы также имеете право обратиться с жалобой в Роскомнадзор.",
        },
      ],
    },
    data: {
      lastUpdated: "Дата обновления: 1 мая 2026 г.",
      intro:
        "Принимая настоящее Согласие на обработку персональных данных, вы поручаете Финансовому университету и команде Ventorix, выступающим совместными операторами платформы «Бизнес-клуб», обрабатывать ваши персональные данные в соответствии с Федеральным законом № 152-ФЗ «О персональных данных» и Политикой конфиденциальности.",
      sections: [
        {
          heading: "1. Оператор",
          body:
            "Оператор: Федеральное государственное образовательное бюджетное учреждение высшего образования «Финансовый университет при Правительстве Российской Федерации» совместно с продуктовой командой Ventorix. Полные реквизиты и адрес указаны на официальном сайте Финансового университета.",
        },
        {
          heading: "2. Категории персональных данных",
          body:
            "Фамилия, имя, отчество; адрес электронной почты и номер телефона; организация, факультет, учебная группа, роль и академический статус; фото профиля; ответы при регистрации на мероприятия и загружаемые файлы; прогресс по курсам, оценки и работы; история чатов и заявок; технические идентификаторы, необходимые для работы Платформы.",
        },
        {
          heading: "3. Цели обработки",
          body:
            "Создание и аутентификация аккаунта; участие в мероприятиях, курсах, программах и инновационных активностях; выдача сертификатов и билетов; обработка заявок на вакансии; коммуникации, связанные с вашим участием; формирование статистики и отчётности в обезличенном виде; обеспечение информационной безопасности и выполнение требований закона.",
        },
        {
          heading: "4. Перечень действий",
          body:
            "Сбор, запись, систематизация, накопление, хранение, уточнение (обновление, изменение), извлечение, использование, передача (предоставление, доступ), обезличивание, блокирование, удаление и уничтожение, осуществляемые как с использованием средств автоматизации, так и без них.",
        },
        {
          heading: "5. Получатели данных",
          body:
            "Уполномоченные сотрудники Финансового университета и Ventorix, привлекаемые инфраструктурные и коммуникационные провайдеры, перечисленные в Политике конфиденциальности, а также партнёрские организации в рамках конкретных программ, в которых вы участвуете. Трансграничная передача осуществляется только в адрес провайдеров, обеспечивающих надлежащий уровень защиты.",
        },
        {
          heading: "6. Срок действия и отзыв",
          body:
            "Согласие действует в течение срока существования аккаунта и дополнительного срока хранения, предусмотренного законом или внутренними регламентами Оператора. Вы вправе отозвать согласие в любое время, направив письменный запрос на privacy@businessclub.fa.ru. Отзыв не влияет на правомерность обработки, осуществлённой до его получения.",
        },
        {
          heading: "7. Права субъекта данных",
          body:
            "Вы подтверждаете, что ознакомлены со своими правами, предусмотренными Федеральным законом № 152-ФЗ, в том числе с правом на получение информации об обработке, требование уточнения или удаления данных и обращение с жалобой в надзорный орган (Роскомнадзор).",
        },
      ],
    },
    marketing: {
      lastUpdated: "Дата обновления: 1 мая 2026 г.",
      intro:
        "Это согласие необязательное. Подписавшись, вы соглашаетесь получать маркетинговые и информационные сообщения от платформы «Бизнес-клуб». Изменить настройку можно в любой момент в профиле.",
      sections: [
        {
          heading: "1. Что вы будете получать",
          body:
            "Анонсы предстоящих мероприятий, новых курсов и прямых эфиров, новости клуба, возможности от партнёров, информацию о стипендиях и грантах, опросы и редкие продуктовые обновления от Ventorix, относящиеся к Платформе.",
        },
        {
          heading: "2. Каналы",
          body:
            "Сообщения могут направляться по электронной почте, через уведомления в приложении и, если вы указали номер телефона и явно согласились, через мессенджеры. Мы не используем автоматические голосовые звонки и не отправляем маркетинговые SMS.",
        },
        {
          heading: "3. Частота и содержание",
          body:
            "Мы стараемся отправлять не более нескольких сообщений в месяц. В каждом сообщении указан отправитель, цель сообщения и ссылка либо инструкция для отписки.",
        },
        {
          heading: "4. Персонализация",
          body:
            "Мы можем использовать сведения о факультете, роли и ранее посещённых мероприятиях, чтобы делать рекомендации более релевантными. Мы не передаём ваши персональные данные третьим лицам для их собственного маркетинга.",
        },
        {
          heading: "5. Отзыв согласия",
          body:
            "Вы можете отозвать это маркетинговое согласие в любой момент: переключив опцию в профиле, перейдя по ссылке отписки в любом письме или написав на privacy@businessclub.fa.ru. Сервисные сообщения, необходимые для работы аккаунта (например, уведомления безопасности), будут продолжать приходить.",
        },
      ],
    },
  },
};
