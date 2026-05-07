'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  price: number;
  change: number;
  changePct: number;
  size?: 'sm' | 'md';
  className?: string;
}

function fmtVND(n: number): string {
  return n.toLocaleString('vi-VN');
}

export default function PriceCell({ price, change, changePct, size = 'md', className = '' }: Props) {
  const prevPrice = useRef(price);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (prevPrice.current === price) return;
    setFlash(price > prevPrice.current ? 'up' : 'down');
    prevPrice.current = price;
    const t = setTimeout(() => setFlash(null), 600);
    return () => clearTimeout(t);
  }, [price]);

  const isUp   = changePct > 0;
  const isDown = changePct < 0;

  const flashClass =
    flash === 'up'   ? 'animate-flash-green' :
    flash === 'down' ? 'animate-flash-red'   : '';

  const priceSize  = size === 'md' ? 'text-lg font-bold'     : 'text-sm font-semibold';
  const changeSize = size === 'md' ? 'text-xs mt-0.5'        : 'text-xs';
  const changeColor = isUp ? 'text-green-400' : isDown ? 'text-red-400' : 'text-gray-400';

  return (
    <div className={`rounded ${flashClass} ${className}`}>
      <p className={`${priceSize} text-gray-900 dark:text-white`}>{fmtVND(price)}</p>
      <p className={`${changeSize} ${changeColor}`}>
        {isUp ? '▲ +' : isDown ? '▼ ' : ''}
        {fmtVND(change)} ({isUp ? '+' : ''}{changePct.toFixed(2)}%)
      </p>
    </div>
  );
}
