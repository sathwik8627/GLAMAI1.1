export interface ProductMatch {
  name: string;
  brand: string;
  priceRange: '$' | '$$' | '$$$';
  link?: string;
}

export interface QuickSuggestion {
  text: string;
  impact: 'high' | 'medium' | 'low';
}

export interface MakeupRecommendation {
  mode: 'static' | 'realtime';
  lookName?: string;
  intensity?: 1 | 2 | 3 | 4 | 5;
  analysis: {
    skinTone: string;
    undertone: 'warm' | 'cool' | 'neutral' | 'olive';
    faceShape: string;
    skinBehavior: string;
    eyeShape: string;
    outfit: string;
    occasion: string;
    lightingConditions: string;
  };
  recommendations?: {
    base: {
      productType: string;
      finish: string;
      shadeDirection: string;
      placement: string;
      products?: ProductMatch[];
    };
    eyes: {
      palette: string[];
      textures: string;
      linerStyle: string;
      mascara: string;
      products?: ProductMatch[];
    };
    lips: {
      shade: string;
      finish: string;
      linerLogic: string;
      products?: ProductMatch[];
    };
    sculpt: {
      blushShade: string;
      blushPlacement: string;
      contourLogic: string;
      highlightTone: string;
    };
    finishing: {
      settingStrategy: string;
      longevityHacks: string[];
    };
    variations: {
      safe: string;
      trendy: string;
    };
    proTips: string[];
  };
  quickSuggestions?: QuickSuggestion[];
}
