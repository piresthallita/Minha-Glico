import React from 'react';
import {
  X,
  Home,
  Droplet,
  Utensils,
  CheckCircle2,
  FileText,
  Calculator,
  Activity,
  AlertTriangle,
  Scale,
  Settings,
  Bell,
  Sun,
  Moon,
  Radio,
  Download,
  LogIn,
  LogOut,
  ShieldCheck,
  ChevronRight,
  User as UserIcon,
  Trash2,
  Syringe,
} from 'lucide-react';
import { PatientProfile } from '../types';
import { User } from 'firebase/auth';
import { PWAInstallButton } from './PWAInstallButton';

export type AppPageId =
  | 'today'
  | 'glucose'
  | 'applications'
  | 'meals'
  | 'routine'
  | 'reports'
  | 'bolus'
  | 'rotation'
  | 'weight'
  | 'profile'
  | 'reminders';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: AppPageId;
  onNavigate: (page: AppPageId) => void;
  profile: PatientProfile;
  currentUser: User | null;
  onLoginGoogle: () => void;
  onLogout: () => void;
  onOpenAuth?: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenSos: () => void;
  onOpenBluetooth: () => void;
  onOpenReportModal: () => void;
  onOpenManualReading: () => void;
  onOpenResetAll: () => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  currentPage,
  onNavigate,
  profile,
  currentUser,
  onLoginGoogle,
  onLogout,
  onOpenAuth,
  isDark,
  onToggleTheme,
  onOpenSos,
  onOpenBluetooth,
  onOpenReportModal,
  onOpenResetAll,
}) => {
  if (!isOpen) return null;

  const handleItemClick = (page: AppPageId) => {
    onNavigate(page);
    onClose();
  };

  const diabetesTypeLabel =
    profile.diabetesType === 'dm1'
      ? 'Diabetes Tipo 1'
      : profile.diabetesType === 'dm2'
      ? 'Diabetes Tipo 2'
      : profile.diabetesType === 'gestacional'
      ? 'Diabetes Gestacional'
      : profile.diabetesType === 'lada'
      ? 'LADA'
      : 'MODY / Outro';

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Dimmed backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
      />

      {/* Slide-out Sidebar Drawer */}
      <div className="relative w-full max-w-[320px] sm:max-w-[360px] h-full bg-white dark:bg-[#161619] shadow-2xl flex flex-col z-10 transition-transform duration-200 animate-in slide-in-from-left">
        {/* Drawer Header: User Profile Card */}
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 bg-[#FAFAFB] dark:bg-[#19191D]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#1A1A1E] border border-neutral-200/80 dark:border-neutral-800 flex items-center justify-center p-1.5 shadow-xs shrink-0">
                <img
                  src="./logo.png"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = './assets/aistudio/image_573043af.png';
                  }}
                  alt="Minha Glico Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-[#111111] dark:text-white block leading-tight">
                  Minha Glico
                </span>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">
                  Controle Glicêmico & Bolus
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white dark:bg-[#222226] text-neutral-500 hover:text-[#111111] dark:hover:text-white flex items-center justify-center transition shadow-xs"
              title="Fechar menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* User profile avatar & details */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#FF5A36] to-[#FFA07A] p-0.5 shadow-sm shrink-0">
              <div className="w-full h-full rounded-full bg-white dark:bg-[#161619] flex items-center justify-center overflow-hidden">
                {currentUser?.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={profile.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-bold text-[#FF5A36] text-lg">
                    {profile.name ? profile.name[0].toUpperCase() : 'P'}
                  </span>
                )}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-sm text-[#111111] dark:text-white truncate">
                {currentUser?.displayName || profile.name}
              </h3>
              <p className="text-[11px] font-semibold text-[#FF5A36] truncate">
                {diabetesTypeLabel}
              </p>
              <p className="text-[10px] text-neutral-400 font-mono">
                Alvo: {profile.targetRangeLow}-{profile.targetRangeHigh} mg/dL
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* SEÇÃO 1: ESSENCIAIS DO DIA A DIA */}
          <div>
            <span className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider px-2 block mb-1.5">
              Rotina & Dia a Dia
            </span>
            <div className="space-y-1">
              <button
                onClick={() => handleItemClick('today')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition ${
                  currentPage === 'today'
                    ? 'bg-[#111111] text-white dark:bg-[#FF5A36]'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-[#F6F6F7] dark:hover:bg-[#222226]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Home className="w-4 h-4 text-[#FF5A36]" />
                  <span>Início / Hoje</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </button>

              <button
                onClick={() => handleItemClick('glucose')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition ${
                  currentPage === 'glucose'
                    ? 'bg-[#111111] text-white dark:bg-[#FF5A36]'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-[#F6F6F7] dark:hover:bg-[#222226]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Droplet className="w-4 h-4 text-[#FF5A36]" />
                  <span>Glicemia & Medições</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </button>

              <button
                onClick={() => handleItemClick('applications')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition ${
                  currentPage === 'applications'
                    ? 'bg-[#111111] text-white dark:bg-[#FF5A36]'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-[#F6F6F7] dark:hover:bg-[#222226]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Syringe className="w-4 h-4 text-[#FF5A36]" />
                  <span>Aplicações de Insulina</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FF5A36]/15 text-[#FF5A36]">
                  Doses (U)
                </span>
              </button>

              <button
                onClick={() => handleItemClick('meals')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition ${
                  currentPage === 'meals'
                    ? 'bg-[#111111] text-white dark:bg-[#FF5A36]'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-[#F6F6F7] dark:hover:bg-[#222226]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Utensils className="w-4 h-4 text-[#FF5A36]" />
                  <span>Refeições & Carbos</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </button>

              <button
                onClick={() => handleItemClick('routine')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition ${
                  currentPage === 'routine'
                    ? 'bg-[#111111] text-white dark:bg-[#FF5A36]'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-[#F6F6F7] dark:hover:bg-[#222226]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#FF5A36]" />
                  <span>Rotina & Metas Diárias</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FF5A36]/15 text-[#FF5A36]">
                  Água · Pés · Basal
                </span>
              </button>
            </div>
          </div>

          {/* SEÇÃO 2: CLÍNICO & ANÁLISES */}
          <div>
            <span className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider px-2 block mb-1.5">
              Clínico & Análise
            </span>
            <div className="space-y-1">
              <button
                onClick={() => handleItemClick('reports')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition ${
                  currentPage === 'reports'
                    ? 'bg-[#111111] text-white dark:bg-[#FF5A36]'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-[#F6F6F7] dark:hover:bg-[#222226]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-[#FF5A36]" />
                  <span>Relatórios Clínicos & AGP</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </button>

              <button
                onClick={() => handleItemClick('bolus')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition ${
                  currentPage === 'bolus'
                    ? 'bg-[#111111] text-white dark:bg-[#FF5A36]'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-[#F6F6F7] dark:hover:bg-[#222226]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Calculator className="w-4 h-4 text-[#FF5A36]" />
                  <span>Calculadora de Bolus (ISF)</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </button>

              <button
                onClick={() => handleItemClick('rotation')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition ${
                  currentPage === 'rotation'
                    ? 'bg-[#111111] text-white dark:bg-[#FF5A36]'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-[#F6F6F7] dark:hover:bg-[#222226]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-[#FF5A36]" />
                  <span>Mapa de Rodízio de Aplicação</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </button>

              <button
                onClick={() => handleItemClick('weight')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition ${
                  currentPage === 'weight'
                    ? 'bg-[#111111] text-white dark:bg-[#FF5A36]'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-[#F6F6F7] dark:hover:bg-[#222226]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Scale className="w-4 h-4 text-[#FF5A36]" />
                  <span>Controle de Peso & IMC</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </button>
            </div>
          </div>

          {/* SEÇÃO 3: SEGURANÇA & FERRAMENTAS */}
          <div>
            <span className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider px-2 block mb-1.5">
              Segurança & Ferramentas
            </span>
            <div className="space-y-1">
              <button
                onClick={() => {
                  onClose();
                  onOpenSos();
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-[#FF5A36]/10 text-[#FF5A36] hover:bg-[#FF5A36]/20 transition"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-[#FF5A36]" />
                  <span>SOS Hipoglicemia (Regra dos 15)</span>
                </div>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-[#FF5A36] text-white">
                  SOS
                </span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onOpenBluetooth();
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-[#F6F6F7] dark:hover:bg-[#222226] transition"
              >
                <div className="flex items-center gap-3">
                  <Radio className="w-4 h-4 text-[#FF5A36]" />
                  <span>Conectar Sensor (BLE/NFC)</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </button>

              <button
                onClick={() => {
                  onClose();
                  onOpenReportModal();
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-[#F6F6F7] dark:hover:bg-[#222226] transition"
              >
                <div className="flex items-center gap-3">
                  <Download className="w-4 h-4 text-[#FF5A36]" />
                  <span>Exportar Laudo Médico (PDF)</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </button>
            </div>
          </div>

          {/* SEÇÃO 4: CONFIGURAÇÕES & CONTA */}
          <div>
            <span className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider px-2 block mb-1.5">
              Configurações
            </span>
            <div className="space-y-1">
              <button
                onClick={() => handleItemClick('profile')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition ${
                  currentPage === 'profile'
                    ? 'bg-[#111111] text-white dark:bg-[#FF5A36]'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-[#F6F6F7] dark:hover:bg-[#222226]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-4 h-4 text-[#FF5A36]" />
                  <span>Configurações Gerais & Perfil</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </button>

              <button
                onClick={() => handleItemClick('reminders')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition ${
                  currentPage === 'reminders'
                    ? 'bg-[#111111] text-white dark:bg-[#FF5A36]'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-[#F6F6F7] dark:hover:bg-[#222226]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-[#FF5A36]" />
                  <span>Lembretes & Alarmes</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </button>

              <button
                onClick={onToggleTheme}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-[#F6F6F7] dark:hover:bg-[#222226] transition"
              >
                <div className="flex items-center gap-3">
                  {isDark ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-indigo-500" />
                  )}
                  <span>{isDark ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'}</span>
                </div>
                <span className="text-[10px] text-neutral-400">
                  {isDark ? 'Escuro' : 'Claro'}
                </span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onOpenResetAll();
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 transition"
              >
                <div className="flex items-center gap-3">
                  <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span>Zerar Tudo (Limpar Dados)</span>
                </div>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-red-600 text-white">
                  2 Etapas
                </span>
              </button>
            </div>
          </div>

          {/* SEÇÃO 5: DOWNLOAD DA VERSÃO PWA */}
          <div>
            <span className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider px-2 block mb-2">
              Versão App (PWA)
            </span>
            <PWAInstallButton variant="sidebar" />
          </div>
        </div>

        {/* Drawer Footer: Cloud Sync / Auth */}
        <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 bg-[#FAFAFB] dark:bg-[#19191D]">
          {currentUser ? (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                  ● Nuvem Sincronizada
                </span>
                <p className="text-[11px] text-neutral-500 truncate">{currentUser.email}</p>
              </div>
              <button
                onClick={onLogout}
                className="p-2 rounded-xl text-neutral-400 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                title="Sair da conta"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => {
                  if (onOpenAuth) onOpenAuth();
                  else onLoginGoogle();
                  onClose();
                }}
                className="w-full py-2.5 px-3 rounded-2xl bg-[#FF5A36] text-white text-xs font-bold flex items-center justify-center gap-2 transition hover:opacity-95 shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Cadastrar ou Entrar</span>
              </button>
              <button
                onClick={() => {
                  onLoginGoogle();
                  onClose();
                }}
                className="w-full py-2 px-3 rounded-2xl bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 text-xs font-semibold flex items-center justify-center gap-2 transition hover:bg-stone-50 dark:hover:bg-stone-700/60"
              >
                <span>Entrar com Google</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
