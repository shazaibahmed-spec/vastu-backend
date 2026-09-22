import { Injectable, Logger } from '@nestjs/common';
import {
  RemedyTypeEnum,
  SupportedLanguageEnum,
  VerdictEnum,
} from '../../../common/constants/index.js';
import {
  ExplanationInput,
  ExplanationResult,
  FindingExplanation,
  LLMProvider,
} from '../interfaces/llm-provider.interface.js';
import { EXPLANATION_PROMPT_VERSION } from '../prompts/explanation-prompt.template.js';
import { ExplanationResultSchema } from '../schemas/explanation.schema.js';

interface LanguageTemplate {
  compliant: (obj: string, zone: string) => string;
  compliantRemedy: string;
  defect: (obj: string, zone: string) => string;
  defectRemedy: string;
  summaryHarmonious: (room: string) => string;
  summaryImbalanced: (room: string) => string;
}

const MULTILINGUAL_TEMPLATES: Record<SupportedLanguageEnum, LanguageTemplate> = {
  [SupportedLanguageEnum.ENGLISH]: {
    compliant: (obj, zone) =>
      `Your ${obj} is favorably placed in the ${zone} zone, supporting positive energy and harmony in this space.`,
    compliantRemedy: 'Maintain current harmonious arrangement.',
    defect: (obj, zone) =>
      `The ${obj} position in the ${zone} area can be improved to optimize restorative energy flow and peace of mind.`,
    defectRemedy:
      'Consider adjusting orientation or placing gentle elemental stabilizers in this quadrant.',
    summaryHarmonious: (room) =>
      `Your ${room} demonstrates high energetic harmony with classical Vastu principles, fostering peaceful rest and well-being.`,
    summaryImbalanced: (room) =>
      `Your ${room} has good foundational elements, but exhibits key directional imbalances that can be easily remedied without structural demolition.`,
  },
  [SupportedLanguageEnum.HINDI]: {
    compliant: (obj, zone) =>
      `आपका ${obj} ${zone} क्षेत्र में अनुकूल रूप से स्थित है, जो इस स्थान में सकारात्मक ऊर्जा और शांति को बढ़ावा देता है।`,
    compliantRemedy: 'वर्तमान सामंजस्यपूर्ण व्यवस्था बनाए रखें।',
    defect: (obj, zone) =>
      `${zone} क्षेत्र में ${obj} की स्थिति में सुधार किया जा सकता है ताकि ऊर्जा प्रवाह और मानसिक शांति अनुकूलित हो सके।`,
    defectRemedy:
      'दिशा बदलने या इस क्षेत्र में सौम्य तत्वीय संतुलन उपाय स्थापित करने पर विचार करें।',
    summaryHarmonious: (room) =>
      `आपका ${room} शास्त्रीय वास्तु सिद्धांतों के साथ उच्च ऊर्जात्मक सामंजस्य प्रदर्शित करता है, जो सुख और शांति को बढ़ावा देता है।`,
    summaryImbalanced: (room) =>
      `आपके ${room} में अच्छे आधारभूत तत्व हैं, लेकिन कुछ दिशात्मक असंतुलन हैं जिन्हें बिना तोड़-फोड़ के आसानी से ठीक किया जा सकता है।`,
  },
  [SupportedLanguageEnum.TAMIL]: {
    compliant: (obj, zone) =>
      `உங்கள் ${obj} ${zone} பகுதியில் சாதகமாக அமைக்கப்பட்டுள்ளது, இது நேர்மறை ஆற்றலையும் அமைதியையும் ஆதரிக்கிறது.`,
    compliantRemedy: 'தற்போதைய இணக்கமான அமைப்பைப் பராமரிக்கவும்.',
    defect: (obj, zone) =>
      `${zone} பகுதியில் உள்ள ${obj} அமைப்பை மேம்படுத்தி அமைதியான ஆற்றல் ஓட்டத்தை அடையலாம்.`,
    defectRemedy:
      'திசையை மாற்றியமைக்க அல்லது எளிய தத்துவார்த்த பரிகாரங்களை வைக்க பரிந்துரைக்கப்படுகிறது.',
    summaryHarmonious: (room) =>
      `உங்கள் ${room} பாரம்பரிய வாஸ்து விதிகளுடன் சிறந்த ஆற்றல் இணக்கத்தைக் காட்டுகிறது.`,
    summaryImbalanced: (room) =>
      `உங்கள் ${room} இடத்தில் எளிய மாற்றங்கள் மூலம் சரிசெய்யக்கூடிய சில வாஸ்து குறைபாடுகள் உள்ளன.`,
  },
  [SupportedLanguageEnum.TELUGU]: {
    compliant: (obj, zone) =>
      `మీ ${obj} ${zone} ప్రాంతంలో అనుకూలంగా ఉంచబడింది, ఇది సానుకూల శక్తిని మరియు శాంతిని ప్రోత్సహిస్తుంది.`,
    compliantRemedy: 'ప్రస్తుత శ్రావ్యమైన అమరికను కొనసాగించండి.',
    defect: (obj, zone) =>
      `${zone} ప్రాంతంలో ${obj} స్థానాన్ని మెరుగుపరచడం ద్వారా ప్రశాంతమైన శక్తి ప్రవాహాన్ని పొందవచ్చు.`,
    defectRemedy:
      'దిశను సర్దుబాటు చేయడం లేదా సున్నితమైన వాస్తు పరిహారాలను ఉంచడం పరిగణించండి.',
    summaryHarmonious: (room) =>
      `మీ ${room} సాంప్రదాయ వాస్తు సూత్రాలతో ఉన్నతమైన శక్తి సమతుల్యతను ప్రదర్శిస్తుంది.`,
    summaryImbalanced: (room) =>
      `మీ ${room} నిర్మాణ మార్పులు లేకుండా సులభంగా పరిష్కరించగల కొన్ని దిశా లోపాలను కలిగి ఉంది.`,
  },
  [SupportedLanguageEnum.KANNADA]: {
    compliant: (obj, zone) =>
      `ನಿಮ್ಮ ${obj} ${zone} ವಲಯದಲ್ಲಿ ಅನುಕೂಲಕರವಾಗಿ ಇರಿಸಲ್ಪಟ್ಟಿದೆ, ಇದು ಧನಾತ್ಮಕ ಶಕ್ತಿಯನ್ನು ಹೆಚ್ಚಿಸುತ್ತದೆ.`,
    compliantRemedy: 'ಪ್ರಸ್ತುತ ಸಾಮರಸ್ಯದ ಜೋಡಣೆಯನ್ನು ಮುಂದುವರಿಸಿ.',
    defect: (obj, zone) =>
      `${zone} ವಲಯದಲ್ಲಿ ${obj} ನ ಸ್ಥಾನವನ್ನು ಸರಿಪಡಿಸುವುದರಿಂದ ಶಾಂತಿಯುತ ಶಕ್ತಿ ಹರಿವು ಸುಧಾರಿಸುತ್ತದೆ.`,
    defectRemedy:
      'ದೃಷ್ಟಿಕೋನವನ್ನು ಬದಲಾಯಿಸಲು ಅಥವಾ ಸೌಮ್ಯ ವಾಸ್ತು ಪರಿಹಾರಗಳನ್ನು ಬಳಸಲು ಶಿಫಾರಸು ಮಾಡಲಾಗಿದೆ.',
    summaryHarmonious: (room) =>
      `ನಿಮ್ಮ ${room} ಶಾಸ್ತ್ರೀಯ ವಾಸ್ತು ತತ್ವಗಳೊಂದಿಗೆ ಅತ್ಯುತ್ತಮ ಶಕ್ತಿ ಸಾಮರಸ್ಯವನ್ನು ತೋರಿಸುತ್ತದೆ.`,
    summaryImbalanced: (room) =>
      `ನಿಮ್ಮ ${room} ನಲ್ಲಿ ಕಟ್ಟಡ ಧ್ವಂಸವಿಲ್ಲದೆ ಸುಲಭವಾಗಿ ಸರಿಪಡಿಸಬಹುದಾದ ಕೆಲವು ದಿಕ್ಕಿನ ಅಸಮತೋಲನಗಳಿವೆ.`,
  },
  [SupportedLanguageEnum.MALAYALAM]: {
    compliant: (obj, zone) =>
      `നിങ്ങളുടെ ${obj} ${zone} മേഖലയിൽ അനുകൂലമായി സ്ഥാപിച്ചിരിക്കുന്നു, ഇത് പോസിറ്റീവ് ഊർജ്ജത്തെ പ്രോത്സാഹിപ്പിക്കുന്നു.`,
    compliantRemedy: 'നിലവിലെ ക്രമീകരണം നിലനിർത്തുക.',
    defect: (obj, zone) =>
      `${zone} മേഖലയിലെ ${obj} സ്ഥാനം മെച്ചപ്പെടുത്തുന്നത് മനസ്സിന് കൂടുതൽ ശാന്തി നൽകും.`,
    defectRemedy:
      'ദിശ മാറ്റുകയോ ലളിതമായ വാസ്തു പരിഹാരങ്ങൾ ചെയ്യുകയോ ചെയ്യുക.',
    summaryHarmonious: (room) =>
      `നിങ്ങളുടെ ${room} പരമ്പരാഗത വാസ്തു തത്വങ്ങളുമായി മികച്ച പൊരുത്തം കാണിക്കുന്നു.`,
    summaryImbalanced: (room) =>
      `നിങ്ങളുടെ ${room} ഭാഗത്ത് ഘടനാപരമായ മാറ്റങ്ങളില്ലാതെ പരിഹരിക്കാവുന്ന ചെറിയ വാസ്തു വ്യതിയാനങ്ങളുണ്ട്.`,
  },
  [SupportedLanguageEnum.BENGALI]: {
    compliant: (obj, zone) =>
      `আপনার ${obj} ${zone} অঞ্চলে অনুকূলভাবে স্থাপন করা হয়েছে, যা ইতিবাচক শক্তিকে উৎসাহিত করে।`,
    compliantRemedy: 'বর্তমান সামঞ্জস্যপূর্ণ ব্যবস্থা বজায় রাখুন।',
    defect: (obj, zone) =>
      `${zone} অঞ্চলে ${obj}-এর অবস্থানের উন্নতি করে আরও ভালো শক্তি প্রবাহ অর্জন করা যেতে পারে।`,
    defectRemedy:
      'দিক পরিবর্তন বা সহজ বাস্তু প্রতিকার প্রয়োগ করার কথা বিবেচনা করুন।',
    summaryHarmonious: (room) =>
      `আপনার ${room} শাস্ত্রীয় বাস্তু নীতির সাথে চমৎকার সুরেলা সামঞ্জস্য প্রদর্শন করে।`,
    summaryImbalanced: (room) =>
      `আপনার ${room}-এ কিছু দিকনির্দেশক ভারসাম্যহীনতা রয়েছে যা ভাঙচুর ছাড়াই সহজে নিরাময়যোগ্য।`,
  },
  [SupportedLanguageEnum.GUJARATI]: {
    compliant: (obj, zone) =>
      `તમારું ${obj} ${zone} ક્ષેત્રમાં અનુકૂળ રીતે ગોઠવાયેલ છે, જે સકારાત્મક ઊર્જા અને શાંતિ આપે છે.`,
    compliantRemedy: 'વર્તમાન સુમેળભરી ગોઠવણી જાળવી રાખો.',
    defect: (obj, zone) =>
      `${zone} વિસ્તારમાં ${obj} ની સ્થિતિમાં સુધારો કરવાથી સારો ઊર્જા પ્રવાહ મેળવી શકાય છે.`,
    defectRemedy:
      'દિશા બદલવા અથવા સરળ વાસ્તુ ઉપાયો અજમાવવા વિચારણા કરો.',
    summaryHarmonious: (room) =>
      `તમારો ${room} શાસ્ત્રીય વાસ્તુ સિદ્ધાંતો સાથે ઉત્કૃષ્ટ સુમેળ દર્શાવે છે.`,
    summaryImbalanced: (room) =>
      `તમારા ${room} માં કોઈ પણ પ્રકારની તોડફોડ વિના સુધારી શકાય તેવા વાસ્તુ દોષ છે.`,
  },
  [SupportedLanguageEnum.MARATHI]: {
    compliant: (obj, zone) =>
      `तुमचे ${obj} ${zone} भागात अनुकूल स्थितीत आहे, जे सकारात्मक ऊर्जा आणि शांतता वाढवते.`,
    compliantRemedy: 'सध्याची सुसंवादी व्यवस्था कायम ठेवा.',
    defect: (obj, zone) =>
      `${zone} भागात ${obj} च्या स्थितीत सुधारणा करून ऊर्जा प्रवाह अधिक अनुकूल करता येईल.`,
    defectRemedy:
      'दिशा बदलणे किंवा सौम्य वास्तु उपाय करणे उपयुक्त ठरेल.',
    summaryHarmonious: (room) =>
      `तुमची ${room} शास्त्रीय वास्तु तत्त्वांनुसार उत्तम ऊर्जात्मक सुसंवाद दर्शवते.`,
    summaryImbalanced: (room) =>
      `तुमच्या ${room} मध्ये विनातोडफोड सहजपणे दुरुस्त करता येतील असे काही वास्तु दोष आहेत.`,
  },
  [SupportedLanguageEnum.PUNJABI]: {
    compliant: (obj, zone) =>
      `ਤੁਹਾਡਾ ${obj} ${zone} ਖੇਤਰ ਵਿੱਚ ਅਨੁਕੂਲ ਢੰਗ ਨਾਲ ਸਥਿਤ ਹੈ, ਜੋ ਸਕਾਰਾਤਮਕ ਊਰਜਾ ਨੂੰ ਉਤਸ਼ਾਹਿਤ ਕਰਦਾ ਹੈ।`,
    compliantRemedy: 'ਮੌਜੂਦਾ ਸੁਮੇਲ ਵਾਲੀ ਵਿਵਸਥਾ ਨੂੰ ਬਣਾਈ ਰੱਖੋ।',
    defect: (obj, zone) =>
      `${zone} ਖੇਤਰ ਵਿੱਚ ${obj} ਦੀ ਸਥਿਤੀ ਨੂੰ ਸੁਧਾਰ ਕੇ ਸ਼ਾਂਤੀਪੂਰਨ ਊਰਜਾ ਪ੍ਰਵਾਹ ਪ੍ਰਾਪਤ ਕੀਤਾ ਜਾ ਸਕਦਾ ਹੈ।`,
    defectRemedy:
      "ਦਿਸ਼ਾ ਬਦਲਣ ਜਾਂ ਸਰਲ ਵਾਸਤੂ ਉਪਾਅ ਕਰਨ 'ਤੇ ਵਿਚਾਰ ਕਰੋ।",
    summaryHarmonious: (room) =>
      `ਤੁਹਾਡਾ ${room} ਪ੍ਰਾਚੀਨ ਵਾਸਤੂ ਸਿਧਾਂਤਾਂ ਨਾਲ ਉੱਚ ਊਰਜਾਤਮਕ ਇਕਸੁਰਤਾ ਦਰਸਾਉਂਦਾ ਹੈ।`,
    summaryImbalanced: (room) =>
      `ਤੁਹਾਡੇ ${room} ਵਿੱਚ ਬਿਨਾਂ ਭੰਨ-ਤੋੜ ਦੇ ਆਸਾਨੀ ਨਾਲ ਹੱਲ ਹੋਣ ਵਾਲੇ ਕੁਝ ਵਾਸਤੂ ਨੁਕਸ ਹਨ।`,
  },
};

const LOCALIZED_OBJECT_NAMES: Record<string, Record<string, string>> = {
  [SupportedLanguageEnum.HINDI]: {
    bed: 'बिस्तर',
    stove: 'चूल्हा',
    sink: 'सिंक',
    door: 'मुख्य द्वार',
    mirror: 'आईना',
    desk: 'कार्य मेज',
    window: 'खिड़की',
    wardrobe: 'भारी अलमारी',
    general: 'सामग्री',
  },
  [SupportedLanguageEnum.MARATHI]: {
    bed: 'खाट / पलंग',
    stove: 'शेगडी',
    sink: 'सिंक',
    door: 'मुख्य दरवाजा',
    mirror: 'आरसा',
    desk: 'टेबल',
    window: 'खिडकी',
    wardrobe: 'कपाट',
    general: 'वस्तू',
  },
};

const LOCALIZED_ZONE_NAMES: Record<string, Record<string, string>> = {
  [SupportedLanguageEnum.HINDI]: {
    NORTH: 'उत्तर',
    NORTH_EAST: 'ईशान (उत्तर-पूर्व)',
    EAST: 'पूर्व',
    SOUTH_EAST: 'आग्नेय (दक्षिण-पूर्व)',
    SOUTH: 'दक्षिण',
    SOUTH_WEST: 'नैऋत्य (दक्षिण-पश्चिम)',
    WEST: 'पश्चिम',
    NORTH_WEST: 'वायव्य (उत्तर-पश्चिम)',
    CENTER: 'ब्रह्मस्थान (केंद्र)',
  },
  [SupportedLanguageEnum.MARATHI]: {
    NORTH: 'उत्तर',
    NORTH_EAST: 'ईशान्य',
    EAST: 'पूर्व',
    SOUTH_EAST: 'आग्नेय',
    SOUTH: 'दक्षिण',
    SOUTH_WEST: 'नैऋत्य',
    WEST: 'पश्चिम',
    NORTH_WEST: 'वायव्य',
    CENTER: 'ब्रह्मस्थान (केंद्र)',
  },
};

const LOCALIZED_ROOM_NAMES: Record<string, Record<string, string>> = {
  [SupportedLanguageEnum.HINDI]: {
    bedroom: 'शयनकक्ष',
    kitchen: 'रसोईघर',
    living_room: 'बैठक कक्ष',
    main_entrance: 'मुख्य द्वार',
    office: 'अध्ययन कक्ष',
  },
  [SupportedLanguageEnum.MARATHI]: {
    bedroom: 'शयनकक्ष',
    kitchen: 'स्वयंपाकघर',
    living_room: 'बैठक खोली',
    main_entrance: 'मुख्य प्रवेशद्वार',
    office: 'कार्यालय',
  },
};

@Injectable()
export class MockLlmAdapter implements LLMProvider {
  private readonly logger = new Logger(MockLlmAdapter.name);

  async generateExplanation(
    input: ExplanationInput,
  ): Promise<ExplanationResult> {
    const lang = input.language || SupportedLanguageEnum.ENGLISH;
    const template =
      MULTILINGUAL_TEMPLATES[lang] ||
      MULTILINGUAL_TEMPLATES[SupportedLanguageEnum.ENGLISH];

    this.logger.debug(
      `MockLlmAdapter generating empathetic explanation for '${input.roomType}' in language '${lang}' (Score: ${input.overallScore}/100)...`,
    );

    const findingExplanations: FindingExplanation[] = input.findings.map(
      (finding) => {
        const rawObj = finding.targetObject || 'feature';
        const rawZone = finding.zone || 'designated';
        const objName =
          LOCALIZED_OBJECT_NAMES[lang]?.[rawObj.toLowerCase()] || rawObj;
        const zoneName =
          LOCALIZED_ZONE_NAMES[lang]?.[rawZone] || rawZone;

        if (finding.verdict === VerdictEnum.COMPLIANT) {
          return {
            ruleCode: finding.ruleCode,
            laymanExplanation: template.compliant(objName, zoneName),
            actionableRemedy:
              lang === SupportedLanguageEnum.ENGLISH && finding.defaultRemedyText
                ? finding.defaultRemedyText
                : template.compliantRemedy,
            remedyType: RemedyTypeEnum.DECORATIVE,
          };
        }

        return {
          ruleCode: finding.ruleCode,
          laymanExplanation: template.defect(objName, zoneName),
          actionableRemedy:
            lang === SupportedLanguageEnum.ENGLISH && finding.defaultRemedyText
              ? finding.defaultRemedyText
              : template.defectRemedy,
          remedyType: RemedyTypeEnum.ELEMENTAL,
        };
      },
    );

    const hasCriticalDefect = input.findings.some(
      (f) => f.verdict === VerdictEnum.DEFECT && f.severity === 'CRITICAL',
    );

    const rawRoom = input.roomType.toLowerCase();
    const roomLabel =
      LOCALIZED_ROOM_NAMES[lang]?.[rawRoom] || rawRoom.replace('_', ' ');
    const summary = hasCriticalDefect
      ? template.summaryImbalanced(roomLabel)
      : template.summaryHarmonious(roomLabel);

    const result: ExplanationResult = {
      summary,
      elementalBalance: {
        fire: input.roomType === 'KITCHEN' ? 'BALANCED' : 'NEUTRAL',
        water: 'BALANCED',
        earth: 'BALANCED',
        air: 'BALANCED',
        space: 'BALANCED',
      },
      findingExplanations,
      promptVersion: EXPLANATION_PROMPT_VERSION,
      modelVersion: 'mock-llm-multilingual-v2',
      tokenUsage: {
        promptTokens: 420,
        completionTokens: 180,
        totalTokens: 600,
      },
    };

    return ExplanationResultSchema.parse(result) as ExplanationResult;
  }
}
