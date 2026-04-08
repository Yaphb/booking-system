import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

interface CaptchaProps {
  onVerify: (isValid: boolean) => void;
}

const WORDS = ['apple', 'banana', 'orange', 'grape', 'mango', 'peach', 'cherry', 'lemon'];

export default function Captcha({ onVerify }: CaptchaProps) {
  const [targetWord, setTargetWord] = useState('');
  const [answer, setAnswer] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  const generateProblem = () => {
    const word = WORDS[Math.floor(Math.random() * WORDS.length)];
    setTargetWord(word);
    setAnswer('');
    setIsVerified(false);
    onVerify(false);
  };

  useEffect(() => {
    generateProblem();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAnswer(val);
    
    if (val.toLowerCase() === targetWord) {
      setIsVerified(true);
      onVerify(true);
    } else {
      setIsVerified(false);
      onVerify(false);
    }
  };

  return (
    <div className="bg-black/5 p-4 rounded-lg border border-black/10 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-black/80">
          Security Verification
        </label>
        <button 
          type="button" 
          onClick={generateProblem}
          className="text-black/40 hover:text-black transition-colors"
          title="Refresh word"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      <div className="flex flex-col gap-2">
        <div className="text-sm text-black/60">
          Please type the word <strong className="text-black font-mono tracking-wider select-none bg-black/10 px-2 py-0.5 rounded">{targetWord}</strong> below:
        </div>
        <input
          type="text"
          value={answer}
          onChange={handleChange}
          placeholder="Type the word here"
          className="w-full px-4 py-2 rounded-md border border-black/20 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all font-mono"
        />
      </div>
      {answer && !isVerified && (
        <p className="text-xs text-red-600">Incorrect word. Please try again.</p>
      )}
      {isVerified && (
        <p className="text-xs text-green-600 font-medium">✓ Verified successfully</p>
      )}
    </div>
  );
}
