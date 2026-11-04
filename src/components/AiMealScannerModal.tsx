import React, { useState, useRef } from 'react';
import { Camera, Upload, Sparkles, Loader2, X, Plus, AlertCircle, Check, Info } from 'lucide-react';
import { MealPlateItem } from '../types';

interface AiMealScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyMealItems: (items: MealPlateItem[], title: string, aiNotes?: string, impact?: string) => void;
}

interface AnalyzedItem {
  name: string;
  portionDescription: string;
  estimatedGrams: number;
  carbsGrams: number;
  proteinGrams: number;
  fatGrams: number;
  caloriesKcal?: number;
}

export const AiMealScannerModal: React.FC<AiMealScannerModalProps> = ({
  isOpen,
  onClose,
  onApplyMealItems,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [userNotes, setUserNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{
    mealTitle: string;
    totalCarbsGrams: number;
    totalProteinGrams: number;
    totalFatGrams: number;
    totalCaloriesKcal: number;
    glycemicImpact: string;
    clinicalNotes: string;
    items: AnalyzedItem[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Preset sample meal images using clean SVGs/data URLs for instant test
  const sampleMeals = [
    {
      name: 'Prato Feito (Arroz, Feijão, Frango)',
      description: 'Almoço clássico com arroz, feijão carioca e filé de frango',
      svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="%23f8fafc"/><circle cx="200" cy="150" r="120" fill="%23ffffff" stroke="%23cbd5e1" stroke-width="4"/><circle cx="160" cy="130" r="45" fill="%23f1f5f9" stroke="%2394a3b8" stroke-dasharray="2,2"/><text x="160" y="135" font-family="sans-serif" font-size="12" text-anchor="middle" fill="%23475569">Arroz Branco</text><circle cx="230" cy="120" r="35" fill="%23854d0e" opacity="0.3"/><text x="230" y="125" font-family="sans-serif" font-size="12" text-anchor="middle" fill="%23713f12">Feijão</text><rect x="150" y="180" width="100" height="40" rx="10" fill="%23d97706" opacity="0.4"/><text x="200" y="205" font-family="sans-serif" font-size="12" text-anchor="middle" fill="%2378350f">Frango Grelhado</text><text x="200" y="280" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle" fill="%23334155">Prato Almoço Brasileiro</text></svg>`,
    },
    {
      name: 'Café com Tapioca e Ovos',
      description: 'Tapioca com recheio de ovos mexidos e café',
      svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="%23f8fafc"/><circle cx="200" cy="150" r="120" fill="%23ffffff" stroke="%23cbd5e1" stroke-width="4"/><path d="M 140 150 Q 200 110 260 150 Q 200 190 140 150" fill="%23fafaf9" stroke="%23d6d3d1" stroke-width="3"/><text x="200" y="145" font-family="sans-serif" font-size="13" text-anchor="middle" fill="%2344403c">Tapioca Recheada</text><circle cx="200" cy="170" r="14" fill="%23facc15" opacity="0.8"/><text x="200" y="280" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle" fill="%23334155">Café da Manhã</text></svg>`,
    },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setAnalysisResult(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectSample = (sampleSvg: string, defaultDesc: string) => {
    setImagePreview(sampleSvg);
    setUserNotes(defaultDesc);
    setErrorMsg(null);
    setAnalysisResult(null);
  };

  const handleAnalyze = async () => {
    if (!imagePreview) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/analyze-plate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imagePreview,
          mimeType: imagePreview.startsWith('data:image/png')
            ? 'image/png'
            : imagePreview.startsWith('data:image/svg')
            ? 'image/svg+xml'
            : 'image/jpeg',
          userNotes,
        }),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Falha na resposta do servidor.');
      }

      setAnalysisResult(resData.data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        'Não foi possível analisar a imagem automaticamente. Se você estiver offline ou sem chave configurada, verifique as configurações ou adicione os alimentos manualmente pela busca SBD/TACO.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAndAdd = () => {
    if (!analysisResult) return;

    const mappedItems: MealPlateItem[] = analysisResult.items.map((it, idx) => ({
      id: `ai_${Date.now()}_${idx}`,
      foodId: `custom_ai_${idx}`,
      name: it.name,
      portionCount: 1,
      servingDescription: it.portionDescription || `${it.estimatedGrams}g`,
      totalGrams: it.estimatedGrams,
      carbs: it.carbsGrams,
      protein: it.proteinGrams,
      fat: it.fatGrams,
      calories: it.caloriesKcal || Math.round(it.carbsGrams * 4 + it.proteinGrams * 4 + it.fatGrams * 9),
    }));

    onApplyMealItems(
      mappedItems,
      analysisResult.mealTitle,
      analysisResult.clinicalNotes,
      analysisResult.glycemicImpact
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base sm:text-lg">Reconhecimento de Prato com IA</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Fotografe seu prato para estimar porções e contagem de CHO segundo a SBD/TACO
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 p-1.5 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-3.5 space-y-3.5 pr-1">
          {/* Image Upload/Capture Area */}
          <div className="border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-2xl p-4 text-center hover:border-purple-400 dark:hover:border-purple-500 transition bg-gray-50/50 dark:bg-slate-800/40">
            {imagePreview ? (
              <div className="relative group">
                <img
                  src={imagePreview}
                  alt="Prévia do Prato"
                  className="max-h-56 mx-auto rounded-xl object-contain shadow-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <button
                  onClick={() => {
                    setImagePreview(null);
                    setAnalysisResult(null);
                  }}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="py-4 flex flex-col items-center">
                <div className="flex flex-wrap justify-center gap-2.5 mb-2.5">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs transition"
                  >
                    <Camera className="w-4 h-4" />
                    Tirar Foto
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-2 transition"
                  >
                    <Upload className="w-4 h-4" />
                    Galeria
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-slate-400">Tire a foto de cima (visão aérea) para melhor precisão</p>

                {/* Sample quick presets */}
                <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700 w-full">
                  <p className="text-[10px] font-medium text-gray-500 dark:text-slate-400 mb-1.5">Ou teste com exemplo:</p>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {sampleMeals.map((sm, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelectSample(sm.svg, sm.name)}
                        className="px-2 py-0.5 text-[11px] bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 transition"
                      >
                        {sm.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* User Notes Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Observações adicionais (opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: O arroz é integral, molho com açúcar..."
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Analyze CTA button */}
          {imagePreview && !analysisResult && (
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Nutricionista IA analisando alimentos e calculando CHO...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analisar Alimentos e Carboidratos com IA
                </>
              )}
            </button>
          )}

          {/* Analysis Results */}
          {analysisResult && (
            <div className="bg-purple-50/60 border border-purple-200 rounded-2xl p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">
                    Refeição Identificada
                  </span>
                  <h4 className="text-base font-bold text-gray-900">{analysisResult.mealTitle}</h4>
                </div>
                <div className="text-right">
                  <span className="font-mono text-2xl font-black text-purple-700">
                    {analysisResult.totalCarbsGrams}g
                  </span>
                  <span className="text-xs text-gray-500 block">CHO Líquido</span>
                </div>
              </div>

              {/* Macros quick bar */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-purple-100 dark:border-purple-900/50 shadow-2xs">
                  <span className="text-[10px] text-gray-500 dark:text-slate-400 block">Carboidratos</span>
                  <span className="font-mono font-bold text-sm text-purple-700 dark:text-purple-300">
                    {analysisResult.totalCarbsGrams}g
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-purple-100 dark:border-purple-900/50 shadow-2xs">
                  <span className="text-[10px] text-gray-500 dark:text-slate-400 block">Proteínas</span>
                  <span className="font-mono font-bold text-sm text-blue-700 dark:text-blue-300">
                    {analysisResult.totalProteinGrams}g
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-purple-100 dark:border-purple-900/50 shadow-2xs">
                  <span className="text-[10px] text-gray-500 dark:text-slate-400 block">Gorduras</span>
                  <span className="font-mono font-bold text-sm text-amber-700 dark:text-amber-300">
                    {analysisResult.totalFatGrams}g
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-purple-100 dark:border-purple-900/50 shadow-2xs">
                  <span className="text-[10px] text-gray-500 dark:text-slate-400 block">Calorias</span>
                  <span className="font-mono font-bold text-sm text-gray-800 dark:text-slate-200">
                    {analysisResult.totalCaloriesKcal} kcal
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-700 dark:text-slate-300">Alimentos e Porções Estimadas:</p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {analysisResult.items.map((it, idx) => (
                    <div
                      key={idx}
                      className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-gray-900 dark:text-white">{it.name}</span>
                        <span className="text-gray-500 dark:text-slate-400 block text-[11px]">
                          {it.portionDescription} ({it.estimatedGrams}g)
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-purple-700 dark:text-purple-300 font-mono">{it.carbsGrams}g CHO</span>
                        <span className="text-[10px] text-gray-400 dark:text-slate-500 block">
                          P: {it.proteinGrams}g | G: {it.fatGrams}g
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clinical note & impact */}
              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-purple-200 dark:border-purple-900/50 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-purple-800 dark:text-purple-300 font-bold">
                  <Info className="w-3.5 h-3.5" />
                  <span>Impacto Glicêmico: {analysisResult.glycemicImpact}</span>
                </div>
                <p className="text-gray-600 dark:text-slate-300 leading-relaxed text-[11px]">
                  {analysisResult.clinicalNotes}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            Cancelar
          </button>
          {analysisResult && (
            <button
              type="button"
              onClick={handleConfirmAndAdd}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs"
            >
              <Check className="w-4 h-4" />
              Adicionar ao Meu Prato
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
