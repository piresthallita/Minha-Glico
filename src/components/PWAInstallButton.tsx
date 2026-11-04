import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Download,
  Smartphone,
  Share2,
  X,
  CheckCircle,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'full' | 'banner' | 'sidebar';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'compact' }) => {
  const { isInstallable, isInstalled, isIOS, isInIframe, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // If already running as an installed PWA on home screen
  if (isInstalled) {
    if (variant === 'sidebar') {
      return (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 flex items-center gap-3 text-xs text-emerald-800 dark:text-emerald-300">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <CheckCircle className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <p className="font-extrabold text-xs">Minha Glico Instalado</p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Ativo como app na tela inicial</p>
          </div>
        </div>
      );
    }
    return null;
  }

  // Handle click for installation
  const handleClick = async () => {
    if (isInstallable && !isInIframe) {
      const outcome = await install();
      if (outcome === 'unsupported' || outcome === 'dismissed') {
        setShowGuide(true);
      }
    } else {
      // In iOS Safari, or in iframe, or when browser hasn't fired prompt yet
      setShowGuide(true);
    }
  };

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleOpenDirect = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <>
      {variant === 'sidebar' ? (
        <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-50/90 via-amber-50/40 to-stone-100/50 dark:from-[#231A17] dark:via-[#1E1919] dark:to-[#171518] border border-orange-200/80 dark:border-orange-900/60 shadow-xs space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#FF5A36] text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
                <Smartphone className="w-4.5 h-4.5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs text-neutral-900 dark:text-white">Instalar App (PWA)</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#FF5A36] text-white">
                    Offline
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                  Sem barra de navegador
                </p>
              </div>
            </div>

            {isInstallable && !isInIframe && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Direto
              </span>
            )}
          </div>

          <p className="text-[11px] text-neutral-600 dark:text-neutral-300 leading-snug">
            Acesse direto do seu celular ou PC com carregamento instantâneo e visual limpo em tela cheia.
          </p>

          <button
            onClick={handleClick}
            className="w-full py-2.5 px-3.5 rounded-xl bg-[#FF5A36] hover:bg-[#e84c29] text-white font-extrabold text-xs shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 transition active:scale-[0.98]"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>{isInstallable && !isInIframe ? 'Instalar Aplicativo Agora' : 'Como Instalar no Celular'}</span>
          </button>
        </div>
      ) : variant === 'banner' ? (
        <div className="p-3 bg-gradient-to-r from-orange-600 to-amber-600 rounded-2xl text-white flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl shrink-0">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div className="text-xs">
              <p className="font-bold text-white text-sm">Instalar Minha Glico no Celular</p>
              <p className="text-orange-100 text-[11px]">
                Acesse direto da sua tela de início sem barra de navegador e com suporte offline.
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

      {/* Guided installation modal for iOS Safari / iframe / other browsers */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#161619] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-sm w-full p-5 shadow-2xl animate-in fade-in zoom-in duration-150 text-neutral-900 dark:text-neutral-100">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-[#FF5A36]">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm">Instalar Minha Glico</h4>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              {/* Iframe Notice */}
              {isInIframe && (
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-2 text-amber-800 dark:text-amber-200 text-[11px] leading-snug">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <span className="font-bold">Atenção ao navegador:</span> Os navegadores bloqueiam
                    a instalação de aplicativos dentro de telas de teste ou iframes. Abra o link
                    direto no seu celular.
                  </div>
                </div>
              )}

              {/* Instructions by Platform */}
              {isIOS ? (
                <div>
                  <p className="text-neutral-600 dark:text-neutral-300 mb-2 font-medium">
                    No <strong>iPhone / iPad (Safari)</strong>:
                  </p>
                  <div className="space-y-2.5 bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-700/60">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#FF5A36] text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                        1
                      </span>
                      <p className="leading-snug">
                        Na barra do Safari, toque no ícone de <strong>Compartilhar</strong> (ícone de
                        quadrado com seta para cima).
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#FF5A36] text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                        2
                      </span>
                      <p className="leading-snug">
                        Role as opções para baixo e selecione <strong>"Adicionar à Tela de Início"</strong>.
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#FF5A36] text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                        3
                      </span>
                      <p className="leading-snug">
                        Toque em <strong>Adicionar</strong> no canto superior direito. O ícone aparecerá
                        junto aos seus outros apps!
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-neutral-600 dark:text-neutral-300 mb-2 font-medium">
                    No <strong>Android / Google Chrome / Edge</strong>:
                  </p>
                  <div className="space-y-2.5 bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-700/60">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#FF5A36] text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                        1
                      </span>
                      <p className="leading-snug">
                        Toque no menu de <strong>três pontinhos (⋮)</strong> no canto superior do navegador.
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#FF5A36] text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                        2
                      </span>
                      <p className="leading-snug">
                        Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à Tela Inicial"</strong>.
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#FF5A36] text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                        3
                      </span>
                      <p className="leading-snug">
                        Confirme em <strong>Instalar</strong> para criar o ícone na sua tela inicial.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleOpenDirect}
                  className="flex-1 py-2 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir em Nova Aba</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="py-2 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                  title="Copiar link do aplicativo"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600 text-[11px]">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="text-[11px]">Copiar Link</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] pt-1">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Funciona em tela cheia, offline e sem barras de navegador.</span>
              </div>
            </div>

            <button
              onClick={() => setShowGuide(false)}
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
