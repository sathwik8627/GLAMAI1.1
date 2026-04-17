/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Shirt, RefreshCcw, Tag, Upload, X, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MakeupRecommendation, ProductMatch } from './types';
import { useCamera } from './hooks/useCamera';
import { ai, SYSTEM_INSTRUCTION } from './lib/gemini';

export default function App() {
  const { stream, error: cameraError } = useCamera();
  const [activeMode, setActiveMode] = useState<'camera' | 'static'>('camera');
  const [recommendation, setRecommendation] = useState<MakeupRecommendation | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysisTime, setLastAnalysisTime] = useState(0);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeMode === 'camera' && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, activeMode]);

  const performAnalysis = useCallback(async (imageSource?: string) => {
    if (isAnalyzing) return;
    
    // Throttle real-time updates (5s), but allow immediate static analysis
    if (activeMode === 'camera' && Date.now() - lastAnalysisTime < 5000) return;

    let base64Image = '';
    if (imageSource) {
      base64Image = imageSource.split(',')[1];
    } else if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        base64Image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      }
    }

    if (!base64Image) return;

    setIsAnalyzing(true);
    try {
      const modePrompt = activeMode === 'static' ? 'STATIC_MODE' : 'REALTIME_MODE';
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
            { text: `Analyze this image in ${modePrompt} and provide suggestions.` }
          ]
        },
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
        }
      });

      const data = JSON.parse(response.text || '{}');
      setRecommendation(data);
      setLastAnalysisTime(Date.now());
    } catch (err) {
      console.error("Analysis failed:", err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [activeMode, isAnalyzing, lastAnalysisTime]);

  useEffect(() => {
    if (activeMode === 'camera') {
      const interval = setInterval(() => {
        performAnalysis();
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeMode, performAnalysis]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setUploadedImage(result);
        setActiveMode('static');
        performAnalysis(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearUpload = () => {
    setUploadedImage(null);
    setActiveMode('camera');
    setRecommendation(null);
  };

  return (
    <div className="w-full lg:max-w-[1240px] h-screen lg:h-[840px] bg-white lg:rounded-[40px] theme-shadow flex flex-col lg:grid lg:grid-cols-[1fr_440px] overflow-hidden relative border border-[#f0f0f5]">
      {/* Main Analysis View */}
      <main className="relative flex-[1.4] lg:flex-1 bg-[#1a1a1a] overflow-hidden">
        {activeMode === 'camera' ? (
          <>
            <video 
              ref={videoRef}
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover scale-x-[-1] opacity-95"
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[240px] h-[340px] sm:w-[380px] sm:h-[520px] border-2 border-dashed border-white/20 rounded-[160px_160px_120px_120px] pointer-events-none" />
          </>
        ) : (
          <div className="w-full h-full relative p-12 flex items-center justify-center">
            {uploadedImage && (
              <img src={uploadedImage} alt="Uploaded" className="max-w-full max-h-full object-contain rounded-3xl" referrerPolicy="no-referrer" />
            )}
            <button 
              onClick={clearUpload}
              className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all pointer-events-auto"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />

        <div className="absolute inset-0 p-6 sm:p-10 flex flex-col justify-between pointer-events-none">
          <div className="flex items-center justify-between pointer-events-auto">
            <div className="flex gap-2">
              <div className="glass-pill flex items-center gap-3">
                <div className={`w-2 h-2 ${activeMode === 'camera' ? 'bg-green-400' : 'bg-blue-400'} rounded-full shadow-[0_0_12px_currentColor]`} />
                <span className="text-[11px] sm:text-[13px] tracking-widest uppercase">
                  {activeMode === 'camera' ? (recommendation?.lookName || 'REAL-TIME') : 'PRECISION MODE'}
                </span>
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="glass-pill flex items-center gap-2 hover:bg-white/20 transition-all"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="text-[10px] hidden sm:inline">UPLOAD PHOTO</span>
              </button>
            </div>
            
            {isAnalyzing && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-[11px] font-bold text-white flex items-center gap-2 border border-white/5"
              >
                <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                {activeMode === 'static' ? 'DEEP ANALYSIS...' : 'ADAPTING...'}
              </motion.div>
            )}
          </div>

          <AnimatePresence>
            {recommendation && (
              <motion.div 
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex gap-3 overflow-x-auto pb-4 no-scrollbar pointer-events-auto mask-fade-right"
              >
                <AnalysisPill label="MODE" value={recommendation.mode} />
                <AnalysisPill label="TONE" value={recommendation.analysis.skinTone} />
                <AnalysisPill label="SHAPE" value={recommendation.analysis.faceShape} />
                <AnalysisPill label="UNDERTONE" value={recommendation.analysis.undertone} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          accept="image/*" 
          onChange={handleFileUpload} 
          className="hidden" 
        />

        {activeMode === 'camera' && cameraError && (
          <div className="absolute inset-0 flex items-center justify-center p-8 bg-black/80 backdrop-blur-xl pointer-events-auto">
            <div className="bg-white p-10 rounded-[40px] text-center max-w-sm shadow-2xl">
              <Camera className="w-16 h-16 text-neutral-900 mx-auto mb-6" />
              <h2 className="text-2xl font-bold mb-3">Camera Access</h2>
              <p className="text-neutral-500 text-sm mb-8 leading-relaxed">Please enable camera to use real-time features, or upload a photo.</p>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => window.location.reload()}
                  className="bg-neutral-900 text-white py-3 rounded-2xl font-bold text-sm"
                >
                  Retry
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-neutral-100 text-neutral-900 py-3 rounded-2xl font-bold text-sm"
                >
                  Upload
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Sidebar Recommendations */}
      <aside className="bg-white border-t lg:border-t-0 lg:border-l border-[#f0f0f5] flex flex-col flex-1 lg:h-full overflow-hidden">
        <div className="p-8 border-b border-[#f0f0f5] bg-[#fdfdfe] shrink-0">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-[11px] uppercase font-bold tracking-[0.2em] text-[#86868b]">
              {activeMode === 'static' ? 'Deep Analysis Result' : 'Real-time Adaptation'}
            </h1>
            {recommendation && (
              <div className="flex items-center gap-1.5 bg-neutral-100 px-2.5 py-1 rounded-full">
                <div className={`w-1.5 h-1.5 ${recommendation.mode === 'static' ? 'bg-blue-500' : 'bg-red-500 animate-pulse'} rounded-full`} />
                <span className="text-[10px] font-bold text-neutral-600 uppercase">
                  {recommendation.mode === 'static' ? 'PRO' : 'LIVE'}
                </span>
              </div>
            )}
          </div>
          {recommendation ? (
            <div className="bg-[#1d1d1f] text-white p-6 rounded-[30px] shadow-xl shadow-black/5">
              <div className="flex gap-4 mb-4">
                <div className={`w-2 h-2 ${recommendation.mode === 'static' ? 'bg-blue-400' : 'bg-[#ff3b30]'} rounded-full mt-2 ring-4 ring-white/10`} />
                <div className="min-w-0">
                  <div className="text-[14px] font-bold mb-0.5 truncate">{recommendation.analysis.outfit}</div>
                  <div className="text-[10px] opacity-40 font-bold tracking-[0.15em] uppercase">{recommendation.analysis.occasion}</div>
                </div>
              </div>
              <p className="text-[11px] leading-relaxed opacity-60 font-medium italic">
                {recommendation.mode === 'static' 
                  ? `Comprehensive evaluation successful. Optimized for ${recommendation.analysis.lightingConditions}.`
                  : `Quick sensors detecting ${recommendation.analysis.undertone} palette.`}
              </p>
            </div>
          ) : (
            <div className="bg-[#f9f9fb] p-8 rounded-[30px] border border-[#f0f0f5] text-center border-dashed">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-[#f0f0f5] shadow-sm">
                <RefreshCcw className="w-5 h-5 text-neutral-300 animate-pulse" />
              </div>
              <p className="text-[12px] text-[#86868b] font-medium tracking-wide">Syncing Session...</p>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar">
          <div className="flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md py-4 z-10 -mx-8 px-8">
            <h2 className="text-[11px] uppercase font-bold tracking-[0.2em] text-[#1d1d1f]">
              {recommendation?.mode === 'static' ? 'Full Prescription' : 'Dynamic Suggestions'}
            </h2>
            <div className="h-[1px] flex-1 ml-4 bg-[#f0f0f5]" />
          </div>
          
          {recommendation ? (
            <div className="space-y-10">
              {recommendation.mode === 'realtime' && recommendation.quickSuggestions ? (
                <div className="space-y-4">
                  {recommendation.quickSuggestions.map((suggestion, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-[#f9f9fb] border border-neutral-100 p-5 rounded-[24px] flex gap-4 items-start group"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-white border border-neutral-100 flex items-center justify-center shrink-0 group-hover:bg-pink-50 transition-colors">
                        <Zap className={`w-5 h-5 ${suggestion.impact === 'high' ? 'text-pink-500' : 'text-neutral-400'}`} />
                      </div>
                      <div>
                        <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">{suggestion.impact} Impact</div>
                        <p className="text-[13px] text-neutral-700 font-semibold leading-relaxed">{suggestion.text}</p>
                      </div>
                    </motion.div>
                  ))}
                  <p className="text-[11px] text-neutral-400 text-center pt-4">Updates dynamically as scene shifts.</p>
                </div>
              ) : recommendation.recommendations ? (
                <div className="space-y-10">
                  <RecGroup 
                    label="BASE & SKIN" 
                    value={recommendation.recommendations.base.productType} 
                    details={`${recommendation.recommendations.base.finish} • ${recommendation.recommendations.base.shadeDirection}`}
                    products={recommendation.recommendations.base.products}
                    subInfo={recommendation.recommendations.base.placement}
                  />
                  <RecGroup 
                    label="SCULPT & COLOR" 
                    value={recommendation.recommendations.sculpt.blushShade} 
                    details={recommendation.recommendations.sculpt.blushPlacement}
                    subInfo={recommendation.recommendations.sculpt.contourLogic}
                  />
                  <RecGroup 
                    label="EYES & DEFINITION" 
                    value={recommendation.recommendations.eyes.palette.join(', ')} 
                    details={recommendation.recommendations.eyes.textures}
                    products={recommendation.recommendations.eyes.products}
                    subInfo={recommendation.recommendations.eyes.linerStyle}
                  />
                  <RecGroup 
                    label="LIPS" 
                    value={recommendation.recommendations.lips.shade} 
                    details={`${recommendation.recommendations.lips.finish} finish`}
                    products={recommendation.recommendations.lips.products}
                    subInfo={recommendation.recommendations.lips.linerLogic}
                  />

                  <div className="pt-10 border-t border-[#f0f0f5] space-y-8">
                    <div>
                      <h3 className="text-[10px] font-bold text-[#b0b0b5] uppercase tracking-widest mb-5">Tech Tips</h3>
                      <div className="space-y-4">
                        {recommendation.recommendations.proTips.map((tip, i) => (
                          <div key={i} className="flex gap-4 group">
                            <div className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-1.5 shrink-0" />
                            <p className="text-[12px] text-neutral-600 font-medium">{tip}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-12 opacity-30">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="space-y-4">
                   <div className="h-2 w-20 bg-neutral-200 rounded-full" />
                   <div className="h-12 w-full bg-neutral-100 rounded-2xl" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-8 mt-auto border-t border-[#f0f0f5] bg-white sticky bottom-0">
          <button className="w-full bg-[#1d1d1f] text-white py-4 sm:py-5 rounded-[24px] font-bold text-[14px] shadow-xl hover:shadow-black/10 active:scale-[0.98] transition-all">
            Apply Virtual Preview Look
          </button>
        </div>
      </aside>
    </div>
  );
}

function AnalysisPill({ label, value }: { label: string, value: string }) {
  return (
    <div className="bg-black/40 backdrop-blur-xl px-5 py-4 rounded-[24px] border border-white/10 text-white min-w-[130px] shrink-0 shadow-2xl">
      <span className="block text-[9px] uppercase font-bold opacity-40 mb-1.5 tracking-[0.15em]">{label}</span>
      <strong className="block text-[12px] font-bold truncate uppercase">{value || '...'}</strong>
    </div>
  );
}

function RecGroup({ label, value, details, products, subInfo }: { label: string, value: string, details: string, products?: ProductMatch[], subInfo?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative"
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="text-[10px] uppercase font-bold text-[#b0b0b5] tracking-[0.2em]">{label}</span>
        <div className="h-[1px] flex-1 bg-neutral-100" />
      </div>
      <div className="text-[17px] font-extrabold text-neutral-900 group-hover:text-pink-600 transition-colors leading-tight">{value}</div>
      <div className="text-[12px] font-bold text-neutral-500 mt-1.5">{details}</div>
      
      {subInfo && (
        <p className="mt-3 text-[11px] text-neutral-400 leading-relaxed font-medium">
          {subInfo}
        </p>
      )}
      
      {products && products.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-5">
          {products.map((p, i) => (
            <div key={i} className="bg-white border border-neutral-100 shadow-sm rounded-2xl p-3 flex items-center gap-2.5">
              <Tag className="w-3.5 h-3.5 text-neutral-300" />
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-neutral-800 truncate">{p.name}</div>
                <div className="text-[8px] text-neutral-500 uppercase font-black opacity-60">{p.brand} • {p.priceRange}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
