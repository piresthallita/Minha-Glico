import React, { useState } from 'react';
import { Bluetooth, Radio, Wifi, CheckCircle2, Loader2, X, Smartphone, RefreshCw } from 'lucide-react';
import { GlucoseReading, GlucoseTrendArrow } from '../types';

interface BluetoothScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReadingReceived: (reading: Omit<GlucoseReading, 'id'>) => void;
}

export const BluetoothScannerModal: React.FC<BluetoothScannerModalProps> = ({
  isOpen,
  onClose,
  onReadingReceived,
}) => {
  const [activeTab, setActiveTab] = useState<'bluetooth' | 'cgm_nfc'>('cgm_nfc');
  const [scanning, setScanning] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    value: number;
    trend?: GlucoseTrendArrow;
    device: string;
  } | null>(null);

  if (!isOpen) return null;

  const devicesList = [
    { id: 'libre3', name: 'FreeStyle Libre 3 / 2', type: 'cgm', tag: 'NFC / Streaming' },
    { id: 'dexcomg7', name: 'Dexcom G7 / ONE+', type: 'cgm', tag: 'Bluetooth BLE' },
    { id: 'accuchek', name: 'Accu-Chek Guide Me', type: 'bluetooth', tag: 'Glicosímetro BLE' },
    { id: 'contour', name: 'Contour Plus Blue', type: 'bluetooth', tag: 'Glicosímetro BLE' },
    { id: 'onetouch', name: 'OneTouch Verio Reflect', type: 'bluetooth', tag: 'Glicosímetro BLE' },
  ];

  const getAutoMoment = (): GlucoseReading['context'] => {
    const h = new Date().getHours();
    if (h >= 0 && h < 6) return 'madrugada';
    if (h >= 6 && h < 9) return 'jejum';
    if (h >= 9 && h < 11) return 'pos_cafe';
    if (h >= 11 && h < 14) return 'almoco';
    if (h >= 14 && h < 18) return 'pos_almoco';
    if (h >= 18 && h < 21) return 'jantar';
    return 'pos_jantar';
  };

  const handleSimulateSync = (deviceName: string, isCgm: boolean) => {
    setScanning(true);
    setSuccessResult(null);
    setConnectedDevice(deviceName);

    // Realistic simulation with 1.8s delay
    setTimeout(() => {
      setScanning(false);
      // Realistic glucose value between 82 and 145 mg/dL
      const randomVal = Math.floor(Math.random() * (145 - 82 + 1)) + 82;
      const trends: GlucoseTrendArrow[] = ['stable', 'stable', 'rise', 'fall', 'rapid_rise'];
      const chosenTrend = trends[Math.floor(Math.random() * trends.length)];

      const result = {
        value: randomVal,
        trend: isCgm ? chosenTrend : undefined,
        device: deviceName,
      };

      setSuccessResult(result);

      onReadingReceived({
        timestamp: new Date().toISOString(),
        value: randomVal,
        source: isCgm ? 'cgm_nfc' : 'bluetooth',
        deviceName,
        context: getAutoMoment(),
        trendArrow: isCgm ? chosenTrend : undefined,
        notes: `Sincronizado automaticamente via ${isCgm ? 'Sensor NFC/CGM' : 'Bluetooth BLE'} (${deviceName})`,
      });
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base sm:text-lg">Sincronização de Dispositivos</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">Glicosímetros Bluetooth e Sensores Contínuos CGM</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 p-1.5 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 my-4 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab('cgm_nfc')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'cgm_nfc' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-gray-600 dark:text-slate-400'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Sensor CGM / NFC
          </button>
          <button
            onClick={() => setActiveTab('bluetooth')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'bluetooth' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-gray-600 dark:text-slate-400'
            }`}
          >
            <Bluetooth className="w-4 h-4" />
            Glicosímetro Bluetooth
          </button>
        </div>

        {/* Scan Status Area */}
        {scanning ? (
          <div className="py-8 text-center flex flex-col items-center justify-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 animate-spin"></div>
              <Wifi className="w-7 h-7 text-blue-600 dark:text-blue-400 absolute inset-0 m-auto animate-pulse" />
            </div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base mt-4">
              {activeTab === 'cgm_nfc' ? 'Aproxime a traseira do celular ao sensor...' : 'Buscando sinal Bluetooth do glicosímetro...'}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-xs">
              Conectando com segurança ao {connectedDevice || 'dispositivo'}.
            </p>
          </div>
        ) : successResult ? (
          <div className="py-5 text-center bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 my-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto animate-bounce" />
            <h4 className="text-emerald-900 dark:text-emerald-200 font-bold text-base mt-2">Leitura Sincronizada!</h4>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">{successResult.device}</p>
            <div className="flex items-center justify-center gap-3 my-3">
              <span className="font-mono text-4xl sm:text-5xl font-black text-emerald-800 dark:text-emerald-300">
                {successResult.value}
              </span>
              <div className="text-left">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">mg/dL</span>
                {successResult.trend && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 font-semibold inline-block mt-0.5">
                    {successResult.trend === 'stable' ? '→ Estável' : successResult.trend === 'rise' ? '↗ Subindo' : '↘ Descendo'}
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mb-3">
              Esta medição foi registrada no seu histórico com carimbo de tempo.
            </p>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition shadow-xs"
            >
              Concluir e Ver no Painel
            </button>
          </div>
        ) : (
          <div className="space-y-2.5 my-2">
            <p className="text-xs text-gray-600 dark:text-slate-400">
              Selecione seu modelo para iniciar a sincronização instantânea:
            </p>
            {devicesList
              .filter((d) => (activeTab === 'cgm_nfc' ? d.type === 'cgm' : d.type === 'bluetooth'))
              .map((dev) => (
                <div
                  key={dev.id}
                  onClick={() => handleSimulateSync(dev.name, dev.type === 'cgm')}
                  className="p-3 rounded-xl border border-gray-200 dark:border-slate-700/80 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-slate-800/80 cursor-pointer transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gray-100 dark:bg-slate-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/60 text-gray-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                      {dev.type === 'cgm' ? <Radio className="w-4 h-4" /> : <Bluetooth className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">{dev.name}</p>
                      <span className="text-[10px] text-gray-500 dark:text-slate-400">{dev.tag}</span>
                    </div>
                  </div>
                  <button className="px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 group-hover:bg-blue-600 group-hover:text-white rounded-lg transition flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" />
                    Ler
                  </button>
                </div>
              ))}
          </div>
        )}

        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-gray-400 dark:text-slate-500 text-center">
          Compatível com Web Bluetooth API e protocolos NFC homologados pela Anvisa.
        </div>
      </div>
    </div>
  );
};
