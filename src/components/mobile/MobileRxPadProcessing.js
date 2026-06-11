import React, { useState, useEffect, useRef } from 'react';
import GradientProgressBar from '../GradientProgressbar';

import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import LoopingVideo from '../common/LoopingVideo';
import './MobileRxPadProcessing.scss';
import { ASSETS } from "../../assets";
const genRxInputProcessing = ASSETS.lotties.genrxinputprocessing;
const genRxConvertingData = ASSETS.lotties.genrxconvertingdata;
const genRxStructuringData = ASSETS.lotties.genrxstructuringdata;
const genRxFinalizingRx = ASSETS.lotties.genrxfinalizingrx;
const {
  genRxBg_2: genRxBgWebm,
  genRxBg: genRxBgMp4,
} = ASSETS.images;

const CREEP_START = 60;
const CREEP_RATE = 1;
const CREEP_MS = 1000;
const CREEP_CAP = 95;

const MobileRxPadProcessing = ({ isProcessing = true }) => {
  const STEP_PROGRESS = [0, 30, 45, 60];
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const creepTimerRef = useRef(null);

  useEffect(() => {
    if (!isProcessing) return;

    setCurrentStep(0);

    const stepDuration = 2000;
    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < 3) {
          return prev + 1;
        }
        return prev;
      });
    }, stepDuration);

    return () => clearInterval(timer);
  }, [isProcessing]);

  useEffect(() => {
    if (!isProcessing) return;
    const target = STEP_PROGRESS[Math.min(currentStep, STEP_PROGRESS.length - 1)];
    setProgress((p) => (p < target ? target : p));
  }, [currentStep, isProcessing]);

  useEffect(() => {
    if (creepTimerRef.current) {
      clearInterval(creepTimerRef.current);
      creepTimerRef.current = null;
    }
    if (!isProcessing) return;

    if (progress >= CREEP_START && progress < CREEP_CAP) {
      creepTimerRef.current = setInterval(() => {
        setProgress((p) => {
          if (p < CREEP_START) return p;
          if (p >= CREEP_CAP) return p;
          const next = Math.min(CREEP_CAP, p + CREEP_RATE);
          return next;
        });
      }, CREEP_MS);
    }

    return () => {
      if (creepTimerRef.current) {
        clearInterval(creepTimerRef.current);
        creepTimerRef.current = null;
      }
    };
  }, [isProcessing, progress]);

  useEffect(() => {
    if (isProcessing) return;
    setProgress(100);
  }, [isProcessing]);

  // If not processing, don't render (parent handles this, but safety check)
  if (!isProcessing) {
    return null;
  }

  return (
    <div className="mobile-rx-pad-processing">
      <div className="processing-background">
        <LoopingVideo
          className="processing-background-video"
          webm={genRxBgWebm}
          mp4={genRxBgMp4}
          ariaLabel="Processing background animation"
        />
      </div>
      <div className="processing-content">
        {currentStep === 0 && (
          <div className="processing-step">
            <DotLottieReact
              src={genRxInputProcessing}
              loop
              autoplay
              style={{ width: 168, height: 140 }}
            />
        <div className="processing-text">
          Your input is being processed in the backend...
        </div>
          </div>
        )}
        {currentStep === 1 && (
          <div className="processing-step">
            <DotLottieReact
              src={genRxConvertingData}
              loop
              autoplay
              style={{ width: 168, height: 140 }}
            />
            <div className="processing-text">
              Converting your input data...
            </div>
          </div>
        )}
        {currentStep === 2 && (
          <div className="processing-step">
            <DotLottieReact
              src={genRxStructuringData}
              loop
              autoplay
              style={{ width: 168, height: 140 }}
            />
            <div className="processing-text">
              Structuring your input data...
            </div>
          </div>
        )}
        {currentStep === 3 && (
          <div className="processing-step">
            <DotLottieReact
              src={genRxFinalizingRx}
              loop
              autoplay
              style={{ width: 168, height: 140 }}
            />
            <div className="processing-text">
              Finalizing your structured prescription...
            </div>
          </div>
        )}

        <GradientProgressBar height="11px" value={progress} />
      </div>
    </div>
  );
};

export default MobileRxPadProcessing;
