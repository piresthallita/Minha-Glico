import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, Share, PlusSquare, X, CheckCircle } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'full' | 'banner' | 'sidebar';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'compact' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA on home screen
  if (isInstalled) {
    if (variant === 'sidebar') {
      return (
        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="min-w-0">
            <p className="font-bold text-[11px]">Versão PWA Instalada</p>
            <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">Rodando como app na tela inicial</p>
          </div>
        </div>
      );
    }
    return null;
  }

  // Handle click for installation
  const handleClick = () => {
    if (isInstallable) {
      install();
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // Fallback hint for desktop or other browsers
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      {variant === 'sidebar' ? (
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-orange-50/90 to-amber-50/50 dark:from-[#231A17] dark:to-[#1A181C] border border-orange-200/80 dark:border-orange-900/50 shadow-xs space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#FF5A36] text-white flex items-center justify-center shadow-xs shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs text-neutral-900 dark:text-white">Instalar App (PWA)</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#FF5A36] text-white">Offline</span>
                </div>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">Sem barras de navegador</p>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-neutral-600 dark:text-neutral-300 leading-snug">
            Acesse direto da tela inicial do seu celular ou PC com suporte offline e resposta imediata.
          </p>
          <button
            onClick={handleClick}
            className="w-full py-2 px-3 rounded-xl bg-[#FF5A36] hover:bg-[#e84c29] text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar Versão PWA</span>
          </button>
        </div>
      ) : variant === 'banner' ? (
        <div className="p-3 bg-gradient-to-r from-orange-600 to-amber-600 rounded-xl text-white flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-lg shrink-0">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div className="text-xs">
              <p className="font-bold text-white text-sm">Instalar Minha Glico no Celular</p>
              <p className="text-orange-100 text-[11px]">
                Acesse direto da sua tela de início sem barra de navegador e com acesso rápido offline.
              </p>
            </div>
          </div>
          <button
            onClick={handleClick}
            className="px-3.5 py-1.5 bg-white text-[#FF5A36] hover:bg-orange-50 font-bold text-xs rounded-xl shadow-xs shrink-0 transition flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            Instalar App
          </button>
        </div>
      ) : variant === 'full' ? (
        <button
          onClick={handleClick}
          className="w-full py-2.5 px-3 bg-[#FF5A36] hover:bg-[#e84c29] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          Instalar App no Celular / Computador
        </button>
      ) : (
        <button
          onClick={handleClick}
          className="px-2.5 py-1.5 rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/60 text-[#FF5A36] hover:bg-orange-100 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
          title="Instalar Minha Glico como aplicativo (PWA)"
        >
          <Download className="w-3.5 h-3.5 text-[#FF5A36]" />
          <span className="hidden sm:inline">Instalar App</span>
        </button>
      )}

      {/* Guided installation modal for iOS Safari / other browsers */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#161619] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-sm w-full p-5 shadow-2xl animate-in fade-in zoom-in duration-150 text-neutral-900 dark:text-neutral-100">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-[#FF5A36]">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm">Download da Versão PWA</h4>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <p className="text-neutral-600 dark:text-neutral-300">
                Você pode instalar o <strong>Minha Glico</strong> diretamente no seu celular ou computador sem precisar de loja de aplicativos:
              </p>

              {isIOS ? (
                <div className="space-y-2.5 bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-700/60">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#FF5A36] text-white font-bold text-[11px] flex items-center justify-center shrink-0">1</span>
                    <p className="leading-snug">
                      No Safari do iPhone/iPad, toque no botão <strong>Compartilhar</strong> (ícone de quadrado com seta para cima).
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#FF5A36] text-white font-bold text-[11px] flex items-center justify-center shrink-0">2</span>
                    <p className="leading-snug">
                      Role para baixo e selecione <strong>"Adicionar à Tela de Início"</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#FF5A36] text-white font-bold text-[11px] flex items-center justify-center shrink-0">3</span>
                    <p className="leading-snug">
                      Toque em <strong>Adicionar</strong> no canto superior direito.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-700/60">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#FF5A36] text-white font-bold text-[11px] flex items-center justify-center shrink-0">1</span>
                    <p className="leading-snug">
                      Toque nos <strong>3 pontinhos (Menu)</strong> do navegador no canto superior.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#FF5A36] text-white font-bold text-[11px] flex items-center justify-center shrink-0">2</span>
                    <p className="leading-snug">
                      Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à Tela Inicial"</strong>.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Funciona em tela cheia, offline e com acesso instantâneo.</span>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 bg-[#FF5A36] hover:bg-[#e84c29] text-white text-xs font-bold rounded-xl transition shadow-xs"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
