import { GoogleGenAI, Type } from "@google/genai";
import { EVALUATION_CRITERIA } from '../constants';
import { AnalysisResult, TeacherScore } from '../types';

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
  
  // Key must be obtained exclusively from environment variable
  const apiKey = process.env.API_KEY;

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

    المطلوب: 
    1. تقييم المعلم وفقاً للمعايير الـ 11 بدقة (0-10).
    2. كتابة ملخص شامل لنقاط القوة والضعف.
    3. **استنتاج 3-5 توقعات مستقبلية** لأداء المعلم (مثلاً: احتمالية الترشح لجائزة تميز، الحاجة لتدريب مكثف، تطور في استخدام التقنية) مع تحديد نسبة الثقة في هذا التوقع ومستوى تأثيره.

    **مهم جداً**:
    - في خانة "justification" (المبررات)، يجب أن تذكر دليلاً ملموساً.
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
            summary: { type: Type.STRING },
            predictions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING, description: "مجال التوقع (مثلاً: التطوير المهني، نواتج التعلم)" },
                  description: { type: Type.STRING },
                  impact: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                  confidence: { type: Type.NUMBER, description: "Confidence percentage 0-100" },
                  timeframe: { type: Type.STRING, description: "مثلاً: خلال الفصل القادم، نهاية العام" }
                }
              }
            }
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
    
    if (error.message === "API_KEY_MISSING" || error.status === 403 || error.message?.includes('API key')) {
      throw new Error("API_KEY_INVALID");
    }

    return {
      scores: EVALUATION_CRITERIA.map(c => ({
        criteriaId: c.id,
        score: 0,
        justification: "فشل التحليل بسبب خطأ تقني أو حجم الملفات."
      })),
      summary: "لم يتم استكمال التحليل بشكل صحيح.",
      predictions: []
    };
  }
};