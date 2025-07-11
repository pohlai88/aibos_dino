import React, { memo, useState } from 'react';

export const Calculator: React.FC = memo(() => {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (display.indexOf('.') === -1) {
      setDisplay(display + '.');
    }
  };

  const clear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const performOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);
      setDisplay(String(newValue));
      setPreviousValue(newValue);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = (firstValue: number, secondValue: number, op: string): number => {
    switch (op) {
      case '+': return firstValue + secondValue;
      case '-': return firstValue - secondValue;
      case '*': return firstValue * secondValue;
      case '/': return firstValue / secondValue;
      default: return secondValue;
    }
  };

  const buttons = [
    ['7', '8', '9', '/'],
    ['4', '5', '6', '*'],
    ['1', '2', '3', '-'],
    ['0', '.', '=', '+']
  ];

  return (
    <div className="p-4 bg-white text-gray-800 h-full dark:bg-gray-800 dark:text-gray-200 flex flex-col">
      <h2 className="text-lg font-semibold mb-4">Calculator</h2>
      
      {/* Display */}
      <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded text-right text-2xl font-mono">
        {display}
      </div>
      
      {/* Buttons */}
      <div className="grid grid-cols-4 gap-2 flex-1">
        {/* Clear button */}
        <button
          type="button"
          className="col-span-4 p-3 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          onClick={clear}
        >
          Clear
        </button>
        
        {/* Number and operation buttons */}
        {buttons.map((row, rowIndex) => (
          row.map((btn, colIndex) => (
            <button
              key={`${rowIndex}-${colIndex}`}
              type="button"
              className={`p-3 rounded transition-colors ${
                btn === '=' 
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : btn === '+' || btn === '-' || btn === '*' || btn === '/'
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'
              }`}
              onClick={() => {
                if (btn === '=') {
                  performOperation('=');
                } else if (btn === '.') {
                  inputDecimal();
                } else if (['+', '-', '*', '/'].includes(btn)) {
                  performOperation(btn);
                } else {
                  inputDigit(btn);
                }
              }}
            >
              {btn}
            </button>
          ))
        ))}
      </div>
    </div>
  );
});

Calculator.displayName = 'Calculator'; 