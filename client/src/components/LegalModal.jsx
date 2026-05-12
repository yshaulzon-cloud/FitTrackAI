import { useEffect } from 'react';
import { useLang } from '../context/LanguageContext';

/* ===========================================================
   Privacy Policy + Terms of Service.
   Both are intentionally short, honest, and specific to Areto.
   They are not a substitute for review by an Israeli attorney
   before public launch — but they correctly describe what the
   app actually does today.
   =========================================================== */

const PRIVACY_HE = {
  title: 'מדיניות פרטיות',
  updated: 'עודכן: מאי 2026',
  sections: [
    {
      h: '1. איזה מידע אנחנו אוספים',
      p: [
        'כדי שהאפליקציה תוכל לבנות לך תוכנית אישית, אנחנו אוספים את הפרטים הבאים:',
      ],
      list: [
        'פרטי חשבון: כתובת אימייל וסיסמה (מוצפנת בעזרת bcrypt).',
        'פרופיל אישי: שם, גיל, מין, גובה, משקל, אחוזי שומן (אופציונלי), רמת ניסיון.',
        'מטרות וכושר: מטרת אימון ומספר אימונים בשבוע.',
        'תיעוד פעילות: ארוחות שרשמת, אימונים שביצעת, רישומי שינה ומדידות גוף.',
        'מטא-נתוני שימוש בסיסיים: תאריכי כניסה, פעולות שביצעת באפליקציה.',
      ],
    },
    {
      h: '2. למה אנחנו משתמשים במידע',
      p: ['המידע משמש אך ורק כדי:'],
      list: [
        'לחשב יעדי קלוריות, מאקרו ותחזית משקל מותאמים אליך.',
        'לבנות תוכנית אימון ותפריט יומי מומלץ.',
        'להציג לך גרפים והתקדמות לאורך זמן.',
        'לאפשר לך להתחבר ולשמור על המידע מאובטח.',
      ],
    },
    {
      h: '3. הערכת ארוחות',
      p: [
        'הזנת ארוחות מתבצעת מול מאגר מזון מקומי שמותקן בשרת. כל מאכל שאתה מזין מחושב לפי הערכים השמורים במאגר. לא נשלחות שאילתות לשירות AI חיצוני להערכת ערכי תזונה.',
      ],
    },
    {
      h: '4. שמירה ואבטחה',
      p: [
        'המידע שלך מאוחסן ב-MongoDB עם תקשורת מוצפנת. הסיסמה לא נשמרת בטקסט גלוי — רק hash. גישה לשרת מוגבלת באמצעות JWT.',
      ],
    },
    {
      h: '5. שיתוף עם צד שלישי',
      p: [
        'אנחנו לא מוכרים את המידע שלך. שירותים חיצוניים שאיתם יש לנו אינטראקציה הם:',
      ],
      list: [
        'Gmail SMTP — לשליחת קוד איפוס סיסמה.',
        'MongoDB Atlas — אחסון בענן.',
      ],
    },
    {
      h: '6. הזכויות שלך',
      p: ['בכל רגע אתה יכול:'],
      list: [
        'לערוך או לעדכן את הפרטים שלך דרך מסך ההגדרות.',
        'לאפס את כל ההיסטוריה שלך דרך "איפוס נתונים".',
        'למחוק את החשבון לחלוטין דרך "מחיקת חשבון" — פעולה זו בלתי הפיכה ומסירה את כל המידע מהשרת.',
      ],
    },
    {
      h: '7. עוגיות ואחסון מקומי',
      p: [
        'אנחנו משתמשים ב-localStorage של הדפדפן כדי לשמור את ה-token של הכניסה ואת ההעדפות שלך (שפה, ערכת צבעים, התראות). לא נעשה שימוש ב-cookies לצרכי tracking.',
      ],
    },
    {
      h: '8. גיל מינימלי',
      p: [
        'השירות מיועד למשתמשים בגיל 13 ומעלה. אנחנו לא אוספים מידע ביודעין ממשתמשים מתחת לגיל 13.',
      ],
    },
    {
      h: '9. שינויים במדיניות',
      p: [
        'נעדכן מסמך זה במקרה של שינויים מהותיים. תאריך העדכון האחרון מופיע בראש הדף.',
      ],
    },
    {
      h: '10. צור קשר',
      p: [
        'שאלות לגבי פרטיות? כתבו אלינו ל-bodysync11@gmail.com.',
      ],
    },
  ],
};

const PRIVACY_EN = {
  title: 'Privacy Policy',
  updated: 'Last updated: May 2026',
  sections: [
    {
      h: '1. What we collect',
      p: ['To build a personalized plan, we collect:'],
      list: [
        'Account: email and password (bcrypt-hashed).',
        'Profile: name, age, gender, height, weight, body-fat % (optional), experience level.',
        'Goals: training goal and weekly workout count.',
        'Activity logs: meals you record, workouts, sleep entries, and body measurements.',
        'Basic usage metadata: sign-in timestamps and in-app actions.',
      ],
    },
    {
      h: '2. How we use it',
      p: ['Your data is used only to:'],
      list: [
        'Calculate calorie targets, macros, and weight forecasts personalized to you.',
        'Generate a workout plan and a recommended daily menu.',
        'Show your progress over time.',
        'Authenticate you and keep your data secure.',
      ],
    },
    {
      h: '3. Meal estimation',
      p: [
        'Meal logging is performed against a local food database stored on the server. Every meal you enter is matched and computed using the values held in that database. No queries are sent to an external AI service for nutrition estimation.',
      ],
    },
    {
      h: '4. Storage and security',
      p: [
        'Data is stored in MongoDB over encrypted connections. Passwords are never stored in plaintext — only hashed. Server access is gated by JWT.',
      ],
    },
    {
      h: '5. Third-party services',
      p: ['We do not sell your data. The external services we interact with are:'],
      list: [
        'Gmail SMTP — to send password reset codes.',
        'MongoDB Atlas — cloud storage.',
      ],
    },
    {
      h: '6. Your rights',
      p: ['At any time you can:'],
      list: [
        'Edit your profile through Settings.',
        'Reset your activity history via "Reset all data".',
        'Permanently delete your account via "Delete account" — this is irreversible and removes all data.',
      ],
    },
    {
      h: '7. Cookies and local storage',
      p: [
        'We use the browser\'s localStorage to keep your auth token and preferences (language, theme, notifications). No tracking cookies.',
      ],
    },
    {
      h: '8. Minimum age',
      p: [
        'The service is intended for users 13 and older. We do not knowingly collect data from users under 13.',
      ],
    },
    {
      h: '9. Changes to this policy',
      p: [
        'We will update this document if anything material changes. The "last updated" date is shown at the top.',
      ],
    },
    {
      h: '10. Contact',
      p: [
        'Privacy questions? Email us at bodysync11@gmail.com.',
      ],
    },
  ],
};

const TERMS_HE = {
  title: 'תנאי שימוש',
  updated: 'עודכן: מאי 2026',
  sections: [
    {
      h: '1. קבלת התנאים',
      p: [
        'בעצם השימוש ב-Areto, אתה מסכים לתנאים האלה. אם אינך מסכים — אל תשתמש בשירות.',
      ],
    },
    {
      h: '2. השירות',
      p: [
        'Areto היא אפליקציית מעקב כושר אישית שמחשבת יעדי תזונה וכושר על בסיס נתונים שאתה מזין. השירות ניתן "כפי שהוא" (As-Is).',
      ],
    },
    {
      h: '3. המידע אינו ייעוץ רפואי',
      p: [
        'התוכניות, ההמלצות והחישובים באפליקציה הם להמחשה ולהדרכה אישית בלבד. הם אינם מהווים ייעוץ רפואי, תזונתי או רפואת ספורט. לפני שינויים מהותיים בפעילות הגופנית או בתזונה — התייעץ עם רופא, דיאטנית קלינית או מאמן מוסמך.',
      ],
    },
    {
      h: '4. החשבון שלך',
      p: [
        'אתה אחראי לדיוק המידע שאתה מזין (גובה, משקל, גיל, מטרות וכו\'). חישובי הקלוריות והמאקרו תלויים בנתונים שלך — אם הם לא מדויקים, גם היעדים לא יהיו מדויקים. אתה אחראי לשמור את הסיסמה שלך מאובטחת.',
      ],
    },
    {
      h: '5. שימוש מותר',
      p: [
        'מותר להשתמש ב-Areto לצרכים אישיים. אסור:',
      ],
      list: [
        'לנסות לעקוף, לתקוף או לפרוץ את השרת או שרת ה-AI.',
        'לרשום חשבונות מזויפים אוטומטית.',
        'לאסוף נתונים של משתמשים אחרים.',
        'להפעיל סקרייפינג מסחרי של התוכן.',
      ],
    },
    {
      h: '6. תוכן AI',
      p: [
        'הערכות התזונה של ארוחות שאתה רושם נוצרות באמצעות מודל AI. הן מוערכות ולא מדויקות במאה אחוזים. הסתמך עליהן כעל קירוב — לא כעל מדידה במעבדה.',
      ],
    },
    {
      h: '7. שינויים ופסיקת השירות',
      p: [
        'אנחנו עשויים לעדכן או לשנות את התכונות בכל זמן. אם נסגור את השירות, נודיע מראש ונאפשר לך להוריד את המידע שלך.',
      ],
    },
    {
      h: '8. הגבלת אחריות',
      p: [
        'Areto, היזמים והמשתפים לא יישאו באחריות לכל נזק ישיר או עקיף שייגרם משימוש בשירות, לרבות שינויים במצב הבריאותי או הגופני שלך כתוצאה מהמלצות באפליקציה.',
      ],
    },
    {
      h: '9. סיום',
      p: [
        'אתה יכול למחוק את החשבון שלך בכל זמן דרך מסך ההגדרות. אנחנו רשאים לסגור חשבון שמפר את התנאים האלה.',
      ],
    },
    {
      h: '10. דין חל',
      p: [
        'התנאים האלה כפופים לדיני מדינת ישראל. סמכות שיפוט בלעדית נתונה לבתי המשפט המוסמכים בתל אביב.',
      ],
    },
  ],
};

const TERMS_EN = {
  title: 'Terms of Service',
  updated: 'Last updated: May 2026',
  sections: [
    {
      h: '1. Acceptance',
      p: ['By using Areto, you agree to these terms. If you do not agree, do not use the service.'],
    },
    {
      h: '2. The service',
      p: [
        'Areto is a personal fitness-tracking app that computes nutrition and training targets based on data you provide. The service is provided "as is".',
      ],
    },
    {
      h: '3. Not medical advice',
      p: [
        'The plans, recommendations, and calculations in the app are for illustrative and personal-guidance purposes only. They are not medical, nutritional, or sports-medicine advice. Consult a qualified physician, dietitian, or coach before making material changes to your training or diet.',
      ],
    },
    {
      h: '4. Your account',
      p: [
        'You are responsible for the accuracy of the data you enter (height, weight, age, goals, etc.). The calorie and macro calculations depend on this data — inaccurate inputs produce inaccurate targets. You are responsible for keeping your password secure.',
      ],
    },
    {
      h: '5. Acceptable use',
      p: ['Areto is for personal use. You may not:'],
      list: [
        'Attempt to bypass, attack, or breach our servers or the AI provider.',
        'Create fake accounts in bulk.',
        'Harvest data from other users.',
        'Run commercial scraping against the content.',
      ],
    },
    {
      h: '6. AI content',
      p: [
        'Meal nutrition estimates are produced by an AI model. They are estimates, not lab measurements. Treat them as approximations.',
      ],
    },
    {
      h: '7. Changes and discontinuation',
      p: [
        'We may update or modify features at any time. If we discontinue the service, we will give you notice and let you download your data.',
      ],
    },
    {
      h: '8. Limitation of liability',
      p: [
        'Areto, its founders, and contributors are not liable for any direct or indirect damage resulting from your use of the service, including changes to your physical or health condition based on in-app recommendations.',
      ],
    },
    {
      h: '9. Termination',
      p: [
        'You may delete your account at any time through Settings. We may suspend accounts that violate these terms.',
      ],
    },
    {
      h: '10. Governing law',
      p: [
        'These terms are governed by the laws of the State of Israel. Exclusive jurisdiction lies with the competent courts of Tel Aviv.',
      ],
    },
  ],
};

export default function LegalModal({ doc, onClose }) {
  const { lang } = useLang();
  const isHe = lang === 'he';

  // Pick content
  let data;
  if (doc === 'privacy') data = isHe ? PRIVACY_HE : PRIVACY_EN;
  else if (doc === 'terms') data = isHe ? TERMS_HE : TERMS_EN;
  else return null;

  // Close on ESC + lock body scroll while open
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={data.title}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10, 14, 26, 0.78)',
        backdropFilter: 'blur(4px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        animation: 'fadeIn 0.18s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-xl)',
          width: '100%',
          maxWidth: 720,
          maxHeight: 'calc(100vh - 48px)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-3)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '24px 28px',
          borderBottom: '1px solid var(--border-subtle)',
          gap: 16,
        }}>
          <div>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              margin: 0,
              color: 'var(--text-1)',
            }}>{data.title}</h2>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{data.updated}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isHe ? 'סגור' : 'Close'}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              color: 'var(--text-2)',
              width: 36,
              height: 36,
              fontSize: 18,
              cursor: 'pointer',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{
          padding: '20px 28px 28px',
          overflowY: 'auto',
          color: 'var(--text-2)',
          lineHeight: 1.65,
          fontSize: 15,
        }}>
          {data.sections.map((s, i) => (
            <section key={i} style={{ marginBottom: 24 }}>
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--text-1)',
                margin: '0 0 8px',
                letterSpacing: '-0.01em',
              }}>{s.h}</h3>
              {s.p && s.p.map((para, j) => (
                <p key={j} style={{ margin: '0 0 8px' }}>{para}</p>
              ))}
              {s.list && (
                <ul style={{
                  paddingInlineStart: 0,
                  paddingInlineEnd: 22,
                  margin: '6px 0 0',
                }}>
                  {s.list.map((item, j) => (
                    <li key={j} style={{ marginBottom: 6 }}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 28px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary"
            style={{ width: 'auto', padding: '10px 22px' }}
          >
            {isHe ? 'הבנתי' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
}
