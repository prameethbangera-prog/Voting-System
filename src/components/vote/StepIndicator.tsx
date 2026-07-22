
import React from 'react';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  steps: Array<{
    id: number;
    label: string;
  }>;
}

const StepIndicator = ({ currentStep, steps }: StepIndicatorProps) => {
  return (
    <div className="flex justify-between mb-8">
      {steps.map((step) => (
        <div 
          key={step.id} 
          className={`step-item ${step.id === currentStep ? 'active' : ''} ${step.id < currentStep ? 'complete' : ''}`}
        >
          <div className={`step ${step.id === currentStep ? 'active' : ''} ${step.id < currentStep ? 'complete' : ''}`}>
            {step.id < currentStep ? (
              <Check className="w-5 h-5" />
            ) : (
              step.id
            )}
          </div>
          <p className="text-xs mt-1">
            {step.label}
          </p>
        </div>
      ))}
    </div>
  );
};

export default StepIndicator;
