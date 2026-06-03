import { useRef } from 'react';

export default function OTPInput({ value, onChange, length = 6 }) {
  const inputsRef = useRef([]);

  const handleChange = (e, idx) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) return;
    const char = val[val.length - 1];
    const arr = value.split('');
    arr[idx] = char;
    const next = arr.join('');
    onChange(next);
    if (idx < length - 1 && char) {
      inputsRef.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === 'Backspace') {
      const arr = value.split('');
      if (arr[idx]) {
        arr[idx] = '';
        onChange(arr.join(''));
      } else if (idx > 0) {
        const prev = inputsRef.current[idx - 1];
        if (prev) {
          arr[idx - 1] = '';
          onChange(arr.join(''));
          prev.focus();
        }
      }
    }
    if (e.key === 'ArrowLeft' && idx > 0) inputsRef.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < length - 1) inputsRef.current[idx + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(pasted.padEnd(length, '').slice(0, length));
    const focusIdx = Math.min(pasted.length, length - 1);
    inputsRef.current[focusIdx]?.focus();
  };

  const digits = value.padEnd(length, '').split('');

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => (inputsRef.current[idx] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          placeholder="·"
          className="otp-input"
          onChange={(e) => handleChange(e, idx)}
          onKeyDown={(e) => handleKeyDown(e, idx)}
          onPaste={handlePaste}
        />
      ))}
    </div>
  );
}
