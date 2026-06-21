import { Radio, FileText, Newspaper } from "lucide-react";

export const MODES = {
  en: [
    {
      id: "radio",
      name: "Full Bulletin",
      icon: Radio,
      description: "Full Telugu news articles read aloud",
      gradient: "from-amber-500 to-orange-600",
    },
    {
      id: "brief",
      name: "Brief Bulletin",
      icon: FileText,
      description: "Headline and 2-sentence quick summary",
      gradient: "from-orange-500 to-amber-500",
    },
    {
      id: "top-news",
      name: "Headlines",
      icon: Newspaper,
      description: "Title + First sentence checklist",
      gradient: "from-amber-600 to-orange-500",
    },
  ],
  te: [
    {
      id: "radio",
      name: "పూర్తి బులెటిన్",
      icon: Radio,
      description: "పూర్తి వార్తా కథనాలు - రేడియోలా వినండి",
      gradient: "from-amber-500 to-orange-600",
    },
    {
      id: "brief",
      name: "సంక్షిప్త బులెటిన్",
      icon: FileText,
      description: "శీర్షిక + కొన్ని పంక్తులు - త్వరగా తెలుసుకోండి",
      gradient: "from-orange-500 to-amber-500",
    },
    {
      id: "top-news",
      name: "ప్రధాన వార్తలు",
      icon: Newspaper,
      description: "శీర్షిక + మొదటి పంక్తి మాత్రమే",
      gradient: "from-amber-600 to-orange-500",
    },
  ],
};

export const TRANSLATIONS = {
  en: {
    title: "Saaram Radio",
    subtitle: "Voice-powered Telugu bulletins instantly spoken",
    voiceCommandsOn: "Voice Commands: ON",
    voiceCommandsOff: "Voice Commands: OFF",
    voiceCommandsTitle: "Voice Commands Quick Guide:",
    chooseMode: "Choose Spoken Mode",
    loadedNews: "Ingested Telugu Bulletins",
    loading: "Fetching latest news feeds...",
    noNews: "No Bulletins Ingested",
    noNewsDesc: "Click play or refresh to fetch latest headlines",
    playStatus: "narrating...",
    playPrompt: "Press play to start the spoken bulletin",
    fetchPrompt: "Fetch news feed to begin",
    commands: {
      start: '"news" or "start" - Start narration',
      stop: '"stop" or "pause" - Stop narration',
      next: '"next" - Skip to next news',
      previous: '"previous" - Back to previous news',
    },
    commandRecognized: "Voice Command Recognized!",
  },
  te: {
    title: "సారం రేడియో",
    subtitle: "తెలుగు వార్తలు స్వరంతో వినండి",
    voiceCommandsOn: "వాయిస్ కమాండ్స్ ఆన్",
    voiceCommandsOff: "వాయిస్ కమాండ్స్ ఆఫ్",
    voiceCommandsTitle: "వాయిస్ కమాండ్స్:",
    chooseMode: "వినే మోడ్ ఎంచుకోండి",
    loadedNews: "లోడ్ చేసిన వార్తలు",
    loading: "తాజా వార్తలు లోడ్ అవుతున్నాయి...",
    noNews: "వార్తలు లేవు",
    noNewsDesc: "తాజా వార్తలు పొందడానికి రిఫ్రెష్ క్లిక్ చేయండి",
    playStatus: "ప్లే అవుతోంది...",
    playPrompt: "ప్లే క్లిక్ చేసి వినడం ప్రారంభించండి",
    fetchPrompt: "వార్తలు పొందడానికి రిఫ్రెష్ చేయండి",
    commands: {
      start: '"న్యూస్" లేదా "వార్తలు" - వార్తలు ప్రారంభించు',
      stop: '"స్టాప్" లేదా "ఆపు" - వార్తలు ఆపు',
      next: '"తర్వాత" - తర్వాత వార్త',
      previous: '"మునుపటి" - మునుపటి వార్త',
    },
    commandRecognized: "కమాండ్ గుర్తించబడింది!",
  },
};

export const VOICE_COMMANDS = {
  START: ["news", "న్యూస్", "వార్తలు", "start"],
  STOP: ["stop", "స్టాప్", "ఆపు", "pause"],
  NEXT: ["next", "తర్వాత", "నెక్స్ట్"],
  PREVIOUS: ["previous", "మునుపటి", "back"],
};

export const FALLBACK_NEWS = {
  te: [
    { headline: "టెక్నాలజీ రంగంలో కొత్త పురోగతి", firstLine: "కృత్రిమ మేధస్సు రంగంలో భారతీయ కంపెనీలు కొత్త విజయాలు సాధించాయి", brief: "టెక్నాలజీ రంగంలో భారతీయ కంపెనీలు కృత్రిమ మేధస్సు సాంకేతికతలో కొత్త విజయాలు సాధించాయి. ఈ పురోగతి ఆరోగ్య, విద్య రంగాలను మార్చగలదు. నిపుణులు ఈ అభివృద్ధిని స్వాగతించారు.", fullText: "టెక్నాలజీ రంగంలో ప్రధాన భారతీయ కంపెనీలు కృత్రిమ మేధస్సు పరిశోధనలో గణనీయమైన పురోగతిని ప్రకటించాయి. ఈ కొత్త వ్యవస్థలు అసాధారణమైన తార్కిక సామర్థ్యాలను ప్రదర్శిస్తున్నాయి.", source: "టెక్ న్యూస్" },
    { headline: "వాతావరణ శిఖరాగ్ర సమావేశంలో ముఖ్యమైన నిర్ణయాలు", firstLine: "ప్రపంచ నేతలు వాతావరణ మార్పులపై కొత్త లక్ష్యాలను నిర్ణయించారు", brief: "అంతర్జాతీయ వాతావరణ శిఖరాగ్ర సమావేశంలో 190 దేశాల ప్రతినిధులు భాగస్వామ్యం అయ్యారు. కొత్త ఉద్గార తగ్గింపు లక్ష్యాలు నిర్ణయించబడ్డాయి.", fullText: "ఈ వారం జరిగిన ప్రపంచ వాతావరణ శిఖరాగ్ర సమావేశంలో 190 కంటే ఎక్కువ దేశాల ప్రతినిధులు వాతావరణ చర్యపై చారిత్రాత్మక ఒప్పందాన్ని కుదుర్చుకున్నారు.", source: "ప్రపంచ వార్తలు" },
    { headline: "క్రికెట్ టోర్నమెంట్‌లో భారత్ గెలుపు", firstLine: "భారత క్రికెట్ జట్టు అంతర్జాతీయ టోర్నమెంట్‌లో విజయం సాధించింది", brief: "భారత క్రికెట్ జట్టు ఉత్తేజకరమైన ఫైనల్‌లో గెలుపొందింది. కెప్టెన్ అద్భుతమైన ఆట ప్రదర్శించారు.", fullText: "అంతర్జాతీయ క్రికెట్ టోర్నమెంట్ ఫైనల్‌లో భారత జట్టు అద్భుతమైన విజయం సాధించింది.", source: "క్రీడా వార్తలు" },
    { headline: "విద్యా రంగంలో కొత్త పథకం ప్రారంభం", firstLine: "ప్రభుత్వం విద్యార్థుల కోసం కొత్త డిజిటల్ విద్యా కార్యక్రమం ప్రారంభించింది", brief: "కేంద్ర ప్రభుత్వం డిజిటల్ విద్య కోసం కొత్త పథకాన్ని ప్రారంభించింది. గ్రామీణ విద్యార్థులకు ఉచిత ఇంటర్నెట్ అందుబాటులో ఉంటుంది.", fullText: "విద్యా మంత్రిత్వ శాఖ భారతదేశం అంతటా డిజిటల్ అభ్యాసాన్ని ప్రోత్సహించడానికి కొత్త కార్యక్రమాన్ని ప్రారంభించింది.", source: "విద్యా వార్తలు" },
    { headline: "తెలంగాణలో కొత్త పారిశ్రామిక పార్క్ ప్రారంభం", firstLine: "తెలంగాణ ప్రభుత్వం హైదరాబాద్ సమీపంలో కొత్త టెక్ పార్క్‌ను ప్రారంభించింది", brief: "తెలంగాణలో కొత్త సాంకేతిక పారిశ్రామిక పార్క్ ప్రారంభమైంది. ఇది వేలాది మందికి ఉద్యోగాలను సృష్టిస్తుంది.", fullText: "హైదరాబాద్ సమీపంలో తెలంగాణ ప్రభుత్వం కొత్త అత్యాధునిక సాంకేతిక పారిశ్రామిక పార్క్‌ను ప్రారంభించింది.", source: "హైదరాబాద్ న్యూస్" },
  ],
  en: [
    { headline: "Tech Giants Announce AI Breakthrough", firstLine: "Major technology companies unveiled groundbreaking artificial intelligence capabilities", brief: "Leading tech companies announced major breakthroughs in AI research. The new systems demonstrate unprecedented reasoning abilities.", fullText: "Major technology companies have announced significant breakthroughs in artificial intelligence research. These new AI systems showcase remarkable improvements in reasoning and real-world problem solving.", source: "Tech News Daily" },
    { headline: "Global Climate Summit Reaches Historic Agreement", firstLine: "World leaders agreed on ambitious climate targets at the international summit", brief: "Representatives from 190 countries reached a historic climate agreement. New emission reduction targets were established.", fullText: "At the global climate summit, representatives from over 190 countries reached a historic agreement on climate action. The accord establishes new targets for emissions reduction.", source: "World News Network" },
    { headline: "India Wins International Cricket Tournament", firstLine: "Indian cricket team secured victory in the international championship", brief: "India won the cricket tournament in a thrilling final match. The captain played an outstanding innings.", fullText: "The Indian cricket team achieved a stunning victory in the international tournament final. The match went down to the final over in an exciting contest.", source: "Sports News" },
    { headline: "New Digital Education Initiative Launched", firstLine: "Government introduces new digital learning program for students", brief: "The central government launched a new digital education scheme. Free internet will be available to rural students.", fullText: "The Ministry of Education has launched a new initiative to promote digital learning across India. This scheme provides free internet and digital content to students in rural areas.", source: "Education Today" },
    { headline: "New Tech Park Opens in Telangana", firstLine: "Telangana government inaugurated new technology park near Hyderabad", brief: "A new tech industrial park was inaugurated in Telangana. It will create thousands of jobs.", fullText: "The Telangana government has inaugurated a state-of-the-art technology industrial park near Hyderabad. This development is expected to create over 50,000 job opportunities.", source: "Hyderabad Times" },
  ],
};
