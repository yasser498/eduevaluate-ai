import { GoogleGenAI, Type } from "@google/genai";
import { EVALUATION_CRITERIA } from '../constants';
import { AnalysisResult, TeacherScore } from '../types';

// Key for local storage
export const API_KEY_STORAGE_KEY = 'user_gemini_api_key';

interface FilePart {
  inlineData: {
    mimeType: string;
    data: string;
  };
}

export const analyzeTeacherPortfolio = async (
  teacherName: string,
  filePaths: string[],
  evidenceFiles: FilePart[]
): Promise<AnalysisResult> => {
  
  // Retrieve Key from Local Storage
  const apiKey = localStorage.getItem(API_KEY_STORAGE_KEY);

  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }

  // Initialize Gemini with the user's key
  const ai = new GoogleGenAI({ apiKey: apiKey });
  
  const model = "gemini-2.5-flash"; // Flash supports multimodal input (PDFs, Images)
  
  const criteriaList = EVALUATION_CRITERIA.map(c => 
    `- ID: ${c.id}
     Name (AR): ${c.nameAr}
     Description: ${c.description}
     Target Evidence: ${c.evidenceExamples}`
  ).join('\n');

  // We limit the context to a reasonable amount for the prompt
  const fileStructure = filePaths.slice(0, 5000).join('\n');

  const systemInstruction = `
    أنت مشرف تربوي خبير ومدقق لملفات الإنجاز الإلكترونية.
    مهمتك هي تحليل هيكل ملف الإنجاز الرقمي للمعلم "${teacherName}" وأيضاً قراءة محتوى العينات المرفقة.
    
    لديك مصدران للمعلومات:
    1. **قائمة الملفات**: تخبرك بما هو "موجود" وهل المعلم منظم أم لا.
    2. **محتوى العينات المرفقة**: (إن وجدت) تخبرك بـ "جودة" العمل (هل هو حقيقي، هل هو معبأ بشكل صحيح، أم فارغ).

    المطلوب: تقييم المعلم وفقاً للمعايير الـ 11 بدقة.
    
    دليل الدرجات (0-10):
    - 0-2: الملفات مفقودة تماماً في القائمة.
    - 3-5: الملفات موجودة كاسم ولكن المحتوى (إذا تم ارفاقه) ضعيف أو غير مكتمل، أو التنظيم عشوائي.
    - 6-8: الملفات موجودة ومنظمة، والمحتوى المقروء جيد.
    - 9-10: الملفات شاملة، والمحتوى المقروء احترافي جداً ومتميز.

    **مهم جداً**:
    - في خانة "justification" (المبررات)، يجب أن تذكر دليلاً ملموساً. إذا قرأت محتوى ملف مرفق، اذكر ذلك (مثال: "اطلعت على محتوى الخطة العلاجية ووجدتها تفصيلية..."). إذا حكمت بناءً على اسم الملف فقط، اذكر ذلك.
    - كن حازماً ولكن عادلاً.
    - يجب أن تكون اللغة عربية فصحى ورسمية.
  `;

  const promptText = `
    بيانات التحليل:
    
    1. هيكل المجلدات (قائمة الملفات):
    ---
    ${fileStructure}
    ---

    2. المعايير المطلوبة:
    ${criteriaList}

    قم بإرجاع النتيجة بتنسيق JSON حصراً.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          { text: promptText },
          ...evidenceFiles // Attach the actual file contents here
        ]
      },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scores: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  criteriaId: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                  justification: { type: Type.STRING },
                }
              }
            },
            summary: { type: Type.STRING }
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("No response from AI");

    const parsedData = JSON.parse(resultText) as AnalysisResult;
    return parsedData;

  } catch (error: any) {
    console.error("Error analyzing teacher:", error);
    
    // Propagate API Key errors specifically
    if (error.message === "API_KEY_MISSING" || error.status === 403 || error.message?.includes('API key')) {
      throw new Error("API_KEY_INVALID");
    }

    return {
      scores: EVALUATION_CRITERIA.map(c => ({
        criteriaId: c.id,
        score: 0,
        justification: "فشل التحليل بسبب خطأ تقني أو حجم الملفات."
      })),
      summary: "لم يتم استكمال التحليل بشكل صحيح."
    };
  }
};