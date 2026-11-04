import React, { useState } from 'react';
import {
  Activity,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  HeartPulse,
  Syringe,
  Pill,
  ChevronRight,
  KeyRound,
  RotateCcw,
} from 'lucide-react';
import {
  loginWithGoogle,
  registerWithEmailPassword,
  loginWithEmailPassword,
  resetPassword,
} from '../firebase';
import { PatientProfile } from '../types';
import { DEFAULT_PATIENT_PROFILE } from '../data/initialData';
import { saveProfileToFirestore } from '../services/firebaseSync';

interface AuthScreenProps {
  onAuthSuccess: (userProfile?: Partial<PatientProfile>) => void;
  onContinueAsGuest: () => void;
}

type AuthMode = 'register' | 'login' | 'forgot_password';

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onAuthSuccess,
  onContinueAsGuest,
}) => {
  const [mode, setMode] = useState<AuthMode>('register');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Diabetes profile for registration
  const [diabetesType, setDiabetesType] = useState<PatientProfile['diabetesType']>('dm1');
  const [treatmentStyle, setTreatmentStyle] = useState<'basal_bolus' | 'basal_only' | 'oral' | 'diet'>('basal_bolus');
  const [targetRangeLow, setTargetRangeLow] = useState<number>(70);
  const [targetRangeHigh, setTargetRangeHigh] = useState<number>(180);
  const [showAdvancedSetup, setShowAdvancedSetup] = useState(false);

  // UI status
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Password strength helper
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { label: '', color: 'bg-stone-200 dark:bg-stone-800', width: '0%' };
    if (pwd.length < 6) return { label: 'Fraca (mínimo 6 caracteres)', color: 'bg-rose-500', width: '33%' };
    if (pwd.length < 10) return { label: 'Média', color: 'bg-amber-500', width: '66%' };
    return { label: 'Forte e segura', color: 'bg-emerald-500', width: '100%' };
  };

  const strength = getPasswordStrength(password);

  // Translate Firebase errors
  const parseFirebaseError = (err: any): string => {
    const code = err?.code || '';
    const message = err?.message || '';

    if (code === 'auth/email-already-in-use') {
      return 'Este e-mail já está cadastrado. Toque em "Entrar" para acessar ou use a recuperação de senha.';
    }
    if (code === 'auth/invalid-email') {
      return 'O endereço de e-mail informado não é válido.';
    }
    if (code === 'auth/weak-password') {
      return 'A senha é muito fraca. Digite pelo menos 6 caracteres.';
    }
    if (code === 'auth/wrong-password' || code === 'auth/invalid-credential' || code === 'auth/user-not-found') {
      return 'E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.';
    }
    if (code === 'auth/too-many-requests') {
      return 'Muitas tentativas malsucedidas. Aguarde alguns instantes antes de tentar novamente.';
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'A janela de autenticação foi fechada antes de concluir.';
    }
    return message || 'Ocorreu um erro inesperado. Tente novamente.';
  };

  // Submit Handler for Email/Password
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    // Basic Validations
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Por favor, informe um e-mail válido.');
      return;
    }

    if (mode === 'forgot_password') {
      setLoading(true);
      try {
        await resetPassword(email);
        setSuccessNotice('Link de redefinição enviado com sucesso para o seu e-mail! Verifique sua caixa de entrada.');
      } catch (err: any) {
        setErrorMessage(parseFirebaseError(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password) {
      setErrorMessage('Por favor, informe a senha.');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setErrorMessage('Por favor, informe seu nome para personalizar o seu diário.');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('A senha deve ter pelo menos 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('As senhas digitadas não coincidem.');
        return;
      }

      setLoading(true);
      try {
        // Clear all local data first so the new account starts 100% zeroed
        [
          'mg_readings',
          'mg_meals',
          'mg_doses',
          'mg_weights',
          'mg_favorites',
          'mg_reminders',
          'mg_fitness',
          'mg_routine_v2',
        ].forEach((k) => localStorage.removeItem(k));

        const newUser = await registerWithEmailPassword(name, email, password);

        // Build personalized initial profile for this new account
        const newProfile: PatientProfile = {
          ...DEFAULT_PATIENT_PROFILE,
          name: name.trim(),
          diabetesType,
          targetRangeLow: Number(targetRangeLow) || 70,
          targetRangeHigh: Number(targetRangeHigh) || 180,
          targetBg: Math.round(((Number(targetRangeLow) || 70) + (Number(targetRangeHigh) || 180)) / 2),
        };

        // If treatment style doesn't use rapid insulin, adjust limits
        if (treatmentStyle === 'oral' || treatmentStyle === 'diet') {
          newProfile.rapidInsulinName = 'Nenhuma (Apenas medicação/dieta)';
          newProfile.basalInsulinName = 'Nenhuma';
        }

        // Save fresh profile to Firestore
        await saveProfileToFirestore(newUser.uid, newProfile);
        localStorage.setItem('mg_profile', JSON.stringify(newProfile));

        onAuthSuccess(newProfile);
      } catch (err: any) {
        setErrorMessage(parseFirebaseError(err));
      } finally {
        setLoading(false);
      }
    } else {
      // Login mode
      setLoading(true);
      try {
        await loginWithEmailPassword(email, password);
        onAuthSuccess();
      } catch (err: any) {
        setErrorMessage(parseFirebaseError(err));
      } finally {
        setLoading(false);
      }
    }
  };

  // Google Login Handler
  const handleGoogleAuth = async () => {
    setErrorMessage(null);
    setLoading(true);
    try {
      const user = await loginWithGoogle();
      onAuthSuccess({ name: user.displayName || 'Usuário' });
    } catch (err: any) {
      setErrorMessage(parseFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Brand Bar */}
      <div className="max-w-md w-full mx-auto pt-2 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex items-center justify-center p-1.5 shadow-md shadow-orange-500/10 shrink-0">
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
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg tracking-tight">Minha Glico</span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-950/60 text-[#FF5722] border border-orange-200 dark:border-orange-900/50">
                PRO
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">Controle Glicêmico & Nutrição</p>
          </div>
        </div>

        <button
          onClick={onContinueAsGuest}
          className="text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 transition-colors"
        >
          Explorar Demo
        </button>
      </div>

      {/* Main Card Container */}
      <div className="max-w-md w-full mx-auto my-auto">
        <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-7 shadow-xl shadow-stone-200/50 dark:shadow-black/40 border border-stone-200/80 dark:border-stone-800">
          {/* Header Title */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 dark:bg-orange-950/40 text-[#FF5722] text-xs font-semibold mb-2 border border-orange-200/60 dark:border-orange-900/40">
              <Sparkles className="w-3.5 h-3.5" />
              {mode === 'register' ? 'Comece com sua Conta Própria' : mode === 'login' ? 'Área Segura do Paciente' : 'Recuperação de Acesso'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
              {mode === 'register' && 'Cadastre sua conta'}
              {mode === 'login' && 'Bem-vindo(a) de volta'}
              {mode === 'forgot_password' && 'Redefinir senha'}
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
              {mode === 'register' && 'Seus dados de glicemia, refeições e doses salvos com segurança na nuvem.'}
              {mode === 'login' && 'Digite seu e-mail e senha para carregar seus registros sincronizados.'}
              {mode === 'forgot_password' && 'Enviaremos as instruções de recuperação para seu e-mail cadastrado.'}
            </p>
          </div>

          {/* Toggle between Register and Login */}
          {mode !== 'forgot_password' && (
            <div className="grid grid-cols-2 p-1 bg-stone-100 dark:bg-stone-800/80 rounded-xl mb-5">
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMessage(null);
                  setSuccessNotice(null);
                }}
                className={`py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                  mode === 'register'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                Cadastrar do Zero
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                  setSuccessNotice(null);
                }}
                className={`py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                  mode === 'login'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                Já Tenho Conta
              </button>
            </div>
          )}

          {/* Error & Success Alerts */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successNotice && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Name Field (Only in Register mode) */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Nome Completo *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Dra. Mariana Costa"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5722] focus:border-transparent transition-all"
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                E-mail *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5722] focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password Field (Not in forgot_password mode) */}
            {mode !== 'forgot_password' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Senha *
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot_password');
                        setErrorMessage(null);
                        setSuccessNotice(null);
                      }}
                      className="text-xs text-[#FF5722] hover:underline font-medium"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'register' ? 'Crie uma senha (mínimo 6 dígitos)' : 'Digite sua senha'}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5722] focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Indicator during registration */}
                {mode === 'register' && password.length > 0 && (
                  <div className="mt-1.5 space-y-1">
                    <div className="h-1.5 w-full bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${strength.color} transition-all duration-300`}
                        style={{ width: strength.width }}
                      />
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center justify-between">
                      <span>Força: {strength.label}</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Confirm Password Field (Only in register mode) */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Confirmar Senha *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha digitada"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5722] focus:border-transparent transition-all"
                  />
                </div>
              </div>
            )}

            {/* Optional Diabetes Profile Setup during Register */}
            {mode === 'register' && (
              <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowAdvancedSetup(!showAdvancedSetup)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-stone-700 dark:text-stone-300 py-1.5 hover:text-[#FF5722] transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <HeartPulse className="w-3.5 h-3.5 text-[#FF5722]" />
                    Configurar Perfil de Diabetes (Opcional)
                  </span>
                  <ChevronRight
                    className={`w-4 h-4 text-stone-400 transition-transform ${
                      showAdvancedSetup ? 'rotate-90' : ''
                    }`}
                  />
                </button>

                {showAdvancedSetup && (
                  <div className="mt-2.5 p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60 space-y-3 animate-fadeIn">
                    {/* Diabetes Type */}
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                        Tipo de Diabetes
                      </label>
                      <select
                        value={diabetesType}
                        onChange={(e) => setDiabetesType(e.target.value as PatientProfile['diabetesType'])}
                        className="w-full px-2.5 py-2 rounded-xl text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-[#FF5722]"
                      >
                        <option value="dm1">Diabetes Tipo 1 (DM1)</option>
                        <option value="dm2">Diabetes Tipo 2 (DM2)</option>
                        <option value="lada">LADA (Autoimune do Adulto)</option>
                        <option value="gestacional">Diabetes Gestacional</option>
                        <option value="outro">Pré-diabetes / Outro</option>
                      </select>
                    </div>

                    {/* Treatment Style */}
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                        Tratamento Principal
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setTreatmentStyle('basal_bolus')}
                          className={`p-2 rounded-xl border text-left text-xs font-medium transition-all ${
                            treatmentStyle === 'basal_bolus'
                              ? 'border-[#FF5722] bg-orange-50 dark:bg-orange-950/30 text-[#FF5722]'
                              : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                          }`}
                        >
                          <div className="flex items-center gap-1 font-semibold">
                            <Syringe className="w-3 h-3" /> Basal + Bolus
                          </div>
                          <span className="text-[10px] opacity-80">MDI ou Bomba</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTreatmentStyle('oral')}
                          className={`p-2 rounded-xl border text-left text-xs font-medium transition-all ${
                            treatmentStyle === 'oral'
                              ? 'border-[#FF5722] bg-orange-50 dark:bg-orange-950/30 text-[#FF5722]'
                              : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                          }`}
                        >
                          <div className="flex items-center gap-1 font-semibold">
                            <Pill className="w-3 h-3" /> Medicamentos
                          </div>
                          <span className="text-[10px] opacity-80">Orais / GLP-1</span>
                        </button>
                      </div>
                    </div>

                    {/* Target range */}
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                        Faixa Alvo Glicêmica (mg/dL)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-stone-400">Mínimo:</span>
                          <input
                            type="number"
                            value={targetRangeLow}
                            onChange={(e) => setTargetRangeLow(Number(e.target.value))}
                            className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400">Máximo:</span>
                          <input
                            type="number"
                            value={targetRangeHigh}
                            onChange={(e) => setTargetRangeHigh(Number(e.target.value))}
                            className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-[#FF5722] hover:bg-[#E64A19] text-white font-semibold text-sm shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : mode === 'register' ? (
                <>
                  <span>Criar Conta e Começar</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : mode === 'login' ? (
                <>
                  <span>Entrar no Diário</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Enviar E-mail de Recuperação</span>
                  <KeyRound className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Back button for Forgot Password */}
          {mode === 'forgot_password' && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                  setSuccessNotice(null);
                }}
                className="text-xs text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 font-semibold inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Voltar para o Login
              </button>
            </div>
          )}

          {/* Divider */}
          {mode !== 'forgot_password' && (
            <>
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                  Ou continue com
                </span>
                <div className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />
              </div>

              {/* Google Auth Button */}
              <button
                type="button"
                disabled={loading}
                onClick={handleGoogleAuth}
                className="w-full py-2.5 px-4 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Google</span>
              </button>
            </>
          )}

          {/* Guest Mode Callout */}
          <div className="mt-5 pt-4 border-t border-stone-100 dark:border-stone-800 text-center">
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-2">
              Quer apenas conhecer a plataforma antes de se cadastrar?
            </p>
            <button
              type="button"
              onClick={onContinueAsGuest}
              className="text-xs font-semibold text-stone-700 dark:text-stone-300 hover:text-[#FF5722] dark:hover:text-[#FF5722] underline underline-offset-2 transition-colors"
            >
              Navegar como Visitante (Modo Demonstração)
            </button>
          </div>
        </div>

        {/* Security & Compliance Footer */}
        <div className="mt-4 text-center flex items-center justify-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Sincronização Segura via Google Firebase Cloud Firestore</span>
        </div>
      </div>

      {/* Bottom disclaimer */}
      <div className="max-w-md w-full mx-auto pb-2 text-center text-[10px] text-stone-400 dark:text-stone-500">
        Desenvolvido em conformidade com as diretrizes da Sociedade Brasileira de Diabetes (SBD) e ADA.
      </div>
    </div>
  );
};
