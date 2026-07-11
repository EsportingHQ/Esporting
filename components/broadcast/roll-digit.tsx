'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface RollDigitProps {
  value: number | string;
  className?: string;
}

export function RollDigit({ value, className = '' }: RollDigitProps) {
  const [prevValue, setPrevValue] = useState(value);

  useEffect(() => {
    setPrevValue(value);
  }, [value]);

  const digits = String(value).split('');

  return (
    <div className={`inline-flex items-center font-data font-medium tabular-nums ${className}`}>
      {digits.map((char, index) => (
        <DigitSlot key={`${index}-${char}`} char={char} />
      ))}
    </div>
  );
}

function DigitSlot({ char }: { char: string }) {
  const [displayChar, setDisplayChar] = useState(char);
  const [direction, setDirection] = useState(1); // 1 = scroll up, -1 = scroll down

  useEffect(() => {
    if (char !== displayChar) {
      // Determine scroll direction based on numeric transition if possible
      const currentNum = parseInt(char, 10);
      const prevNum = parseInt(displayChar, 10);
      if (!isNaN(currentNum) && !isNaN(prevNum)) {
        setDirection(currentNum > prevNum ? 1 : -1);
      } else {
        setDirection(1);
      }
      setDisplayChar(char);
    }
  }, [char, displayChar]);

  // Framer Motion animation variants
  const variants = {
    initial: (dir: number) => ({
      y: dir * 16,
      opacity: 0,
    }),
    animate: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 25,
      },
    },
    exit: (dir: number) => ({
      y: -dir * 16,
      opacity: 0,
      transition: {
        duration: 0.15,
      },
    }),
  };

  return (
    <span className="relative inline-block overflow-hidden h-[1.25em] w-[0.65em] justify-center text-center">
      <AnimatePresence mode="popLayout" custom={direction}>
        <motion.span
          key={displayChar}
          custom={direction}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="absolute left-0 right-0 top-0 bottom-0 flex items-center justify-center font-data"
        >
          {displayChar}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
