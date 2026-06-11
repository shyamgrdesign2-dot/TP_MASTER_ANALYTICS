import React, { useState, useEffect } from "react";
import styles from "./CustomStepper.module.css";

const CustomStepper = ({ steps, currentStep, onStepClick }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  // const [maxStepReached, setMaxStepReached] = useState(currentStep);

  // Add window resize listener
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Track the maximum step reached
  // useEffect(() => {
  //   if (currentStep > maxStepReached) {
  //     setMaxStepReached(currentStep);
  //   }
  // }, [currentStep, maxStepReached]);

  // Handler for step clicks
  // const handleStepClick = (stepIndex) => {
  //   // Allow clicking on completed steps (based on max step reached)
  //   if (stepIndex < maxStepReached && onStepClick) {
  //     onStepClick(stepIndex);
  //   }
  // };

  // Different rendering for mobile vs desktop
  if (isMobile) {
    return (
      <div className={styles.stepperOuter}>
        <div className={styles.mobileStepsContainer}>
          {steps.map((step, idx) => {
            const isCompleted = idx < currentStep;
            const isActive = idx === currentStep;
            const isClickable = isCompleted && onStepClick;
            const isLastStep = idx === steps.length - 1;

            return (
              <div
                key={step.label}
                className={`${styles.mobileStepWithLabel} ${
                  isClickable ? styles.clickableStep : ""
                }`}
                // onClick={() => handleStepClick(idx)}
                style={{ cursor: isClickable ? "pointer" : "default" }}
              >
                <div className={styles.mobileCircleContainer}>
                  {/* Circle */}
                  <div
                    className={
                      isActive
                        ? styles.circleActive
                        : isCompleted
                        ? styles.circleCompleted
                        : styles.circleUpcoming
                    }
                  >
                    {isCompleted && !isActive ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 31 31"
                        fill="none"
                      >
                        <path
                          d="M11.6471 20.2158L24.025 7.83789L25.6686 9.48141L11.6471 23.5028L5.12793 16.9856L6.77145 15.3421L11.6471 20.2158Z"
                          fill="white"
                        />
                      </svg>
                    ) : isActive ? (
                      <div className={styles.innerDot} />
                    ) : null}
                  </div>
                </div>

                {/* Connector line as separate element for better positioning */}
                {!isLastStep && (
                  <div className={styles.mobileConnectorWrapper}>
                    <div
                      className={styles.mobileConnector}
                      style={{
                        background:
                          idx < currentStep ? "#4f46e5" : "#d1d5db",
                      }}
                    />
                  </div>
                )}

                {/* Label */}
                <div className={styles.labelContainer}>
                  <span
                    className={
                      isCompleted || isActive
                        ? styles.labelActive
                        : styles.labelUpcoming
                    }
                  >
                    {step.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Desktop version (original)
  return (
    <div className={styles.stepperOuter}>
      <div className={styles.stepsContainer}>
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isActive = idx === currentStep;
          const isClickable = isCompleted && onStepClick;

          // Calculate label position to align with circle
          return (
            <div
              key={step.label}
              className={`${styles.stepWithLabel} ${
                isClickable ? styles.clickableStep : ""
              }`}
              // onClick={() => handleStepClick(idx)}
              style={{ cursor: isClickable ? "pointer" : "default" }}
            >
              <div className={styles.stepCircleWrapper}>
                <div
                  className={
                    isActive
                      ? styles.circleActive
                      : isCompleted
                      ? styles.circleCompleted
                      : styles.circleUpcoming
                  }
                >
                  {isCompleted && !isActive ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="31"
                      height="31"
                      viewBox="0 0 31 31"
                      fill="none"
                    >
                      <path
                        d="M11.6471 20.2158L24.025 7.83789L25.6686 9.48141L11.6471 23.5028L5.12793 16.9856L6.77145 15.3421L11.6471 20.2158Z"
                        fill="white"
                      />
                    </svg>
                  ) : isActive ? (
                    <div className={styles.innerDot} />
                  ) : null}
                </div>

                {/* Only show connector if not the last step */}
                {idx < steps.length - 1 && (
                  <div
                    className={styles.connector}
                    style={{
                      background: idx < currentStep ? "#4f46e5" : "#d1d5db",
                    }}
                  />
                )}
              </div>

              <div className={styles.labelContainer}>
                <span
                  className={
                    isCompleted || isActive
                      ? styles.labelActive
                      : styles.labelUpcoming
                  }
                >
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CustomStepper;
