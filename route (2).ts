import { NextRequest, NextResponse } from "next/server";
import { gregorianToJalali, JALALI_MONTHS, WEEKDAY_NAMES, persianWeekdayIndex } from "@/lib/jalali";

export const runtime = "nodejs";

const MODEL = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free";

type SuggestedTask = {
  title: string;
  jalaliYear: number;
  jalaliMonth: number; // 1-12
  jalaliDay: number;
  hasTime: boolean;
  startMinutes: number | null; // minutes from midnight, null if no specific time mentioned
  durationMinutes: number;
  reminderMinutesBefore: number | null;
};

function buildSystemPrompt(now: Date) {
  const { jy, jm, jd } = gregorianToJalali(now);
  const weekday = WEEKDAY_NAMES[persianWeekdayIndex(now)];
  const todayStr = `${jd} ${JALALI_MONTHS[jm - 1]} ${jy} (${weekday})`;

  return `تو یک دستیار استخراج کار/رویداد از متن فارسی هستی. کاربر یک جمله یا چند جمله می‌نویسد که ممکن است شامل یک یا چند کار باشد (مثلاً «ساعت ۵ میرم گل‌فروشی» یا «فردا ساعت ۹ جلسه، بعدشم ساعت ۲ دندون‌پزشکی»).

امروز، تاریخ شمسی: ${todayStr}

وظیفه تو: هر کار را از متن استخراج کن و فقط یک شیء JSON خام برگردان (بدون توضیح، بدون Markdown، بدون تیک بک‌تیک) به این شکل دقیق:
{
  "tasks": [
    {
      "title": "عنوان کوتاه کار به فارسی",
      "jalaliYear": عدد سال شمسی,
      "jalaliMonth": عدد ماه شمسی (۱ تا ۱۲),
      "jalaliDay": عدد روز شمسی,
      "hasTime": true یا false (آیا ساعت مشخصی گفته شده),
      "startMinutes": اگر hasTime=true، دقیقه از نیمه‌شب (مثلاً ساعت ۵ عصر = 1020، ساعت ۹ صبح = 540)؛ اگر hasTime=false مقدار null,
      "durationMinutes": مدت تخمینی به دقیقه (پیش‌فرض 60 اگر مشخص نیست),
      "reminderMinutesBefore": اگر کاربر یادآور خواسته عدد دقیقه قبل از زمان کار، وگرنه null (پیش‌فرض وقتی ساعت مشخصه و کاربر چیزی نگفته، 30 بگذار)
    }
  ]
}

قوانین:
- اگر روزی مشخص نشده (نه امروز، نه فردا، نه اسم روز هفته)، همان امروز را در نظر بگیر.
- «فردا»، «پس‌فردا»، اسم روزهای هفته (نزدیک‌ترین occurrence آینده) و امثال آن را به تاریخ شمسی دقیق تبدیل کن.
- ساعت‌های فارسی رایج مثل "ساعت ۵" را با توجه به سیاق (صبح/عصر) به بهترین شکل حدس بزن؛ اگر سیاق نبود و عدد بین ۱ تا ۷ بود، عصر در نظر بگیر (چون بیشتر برنامه‌های روزمره بعدازظهر است) مگر اینکه کلمه‌ای مثل صبح باشد.
- اگر متن چند کار جدا از هم دارد، چند آیتم در آرایه tasks برگردان.
- فقط و فقط شیء JSON خام برگردان، هیچ متن اضافه‌ای قبل یا بعدش ننویس، و کل خروجی را داخل کلید "tasks" بگذار.`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "OPENROUTER_API_KEY تنظیم نشده است. آن را در متغیرهای محیطی اضافه کن (رایگان از https://openrouter.ai/keys بگیر).",
      },
      { status: 500 }
    );
  }

  const body = await req.json();
  const message: string = body?.message ?? "";
  if (!message.trim()) {
    return NextResponse.json({ error: "پیام خالی است" }, { status: 400 });
  }

  const now = new Date();

  try {
    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildSystemPrompt(now) },
          { role: "user", content: message },
        ],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return NextResponse.json(
        { error: `خطا از سرویس هوش مصنوعی: ${errText}` },
        { status: 502 }
      );
    }

    const data = await resp.json();
    const rawText: string = (data.choices?.[0]?.message?.content ?? "")
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "");

    let parsed: SuggestedTask[];
    try {
      const obj = JSON.parse(rawText);
      parsed = Array.isArray(obj) ? obj : obj.tasks ?? [];
    } catch {
      return NextResponse.json(
        { error: "پاسخ مدل قابل تفسیر نبود، دوباره امتحان کن." },
        { status: 502 }
      );
    }

    return NextResponse.json({ tasks: parsed });
  } catch (e) {
    return NextResponse.json(
      { error: `خطا در اتصال به سرویس هوش مصنوعی: ${String(e)}` },
      { status: 500 }
    );
  }
}
