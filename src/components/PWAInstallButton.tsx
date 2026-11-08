import React, { useState } from 'react';
import { Download, Monitor, Share2, PlusSquare, X, CheckCircle, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // If already installed and running standalone
  if (isInstalled) {
    return (
      <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 rounded">
        <CheckCircle className="w-3 h-3 text-emerald-400" />
        <span>MT5 App Mode</span>
      </div>
    );
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-sky-300 hover:text-white bg-sky-950/60 hover:bg-sky-900/80 border border-sky-800/60 rounded-md transition-colors shadow-sm whitespace-nowrap shrink-0"
        title="Install MT5 Institutional Terminal as desktop or mobile app"
      >
        <Download className="w-3.5 h-3.5 text-sky-400" />
        <span>Install MT5 App</span>
      </button>

      {/* Installation Instruction Modal */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setShowGuide(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-sky-950 text-sky-400 border border-sky-800/60 rounded-lg">
                <Monitor className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-100">Install MT5 Terminal App</h3>
                <p className="text-xs text-neutral-400">Run as a standalone desktop or mobile workstation</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs text-neutral-300">
              {isIOS ? (
                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-sky-400 font-semibold">
                    <Smartphone className="w-4 h-4" />
                    <span>Apple iOS / Safari:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-neutral-400">
                    <li>
                      Tap the <strong className="text-neutral-200">Share</strong> icon (<Share2 className="w-3 h-3 inline mx-0.5" />) in the Safari toolbar.
                    </li>
                    <li>
                      Scroll down and select <strong className="text-neutral-200">Add to Home Screen</strong> (<PlusSquare className="w-3 h-3 inline mx-0.5" />).
                    </li>
                    <li>Launch MT5 directly from your iPhone/iPad home screen.</li>
                  </ol>
                </div>
              ) : (
                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-sky-400 font-semibold">
                    <Monitor className="w-4 h-4" />
                    <span>Chrome / Edge / Desktop:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-neutral-400">
                    <li>
                      Look for the <strong className="text-neutral-200">Install icon</strong> in your browser address bar (top right).
                    </li>
                    <li>
                      Or click your browser's <strong className="text-neutral-200">Settings menu (&vellip;) &rarr; Save and share &rarr; Install MCLLC MT5 Terminal</strong>.
                    </li>
                    <li>Enjoy fullscreen high-frequency algorithmic execution with zero browser chrome!</li>
                  </ol>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium rounded text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
