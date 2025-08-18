'use client';

import React, {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

interface SignaturePadProps extends React.CanvasHTMLAttributes<HTMLCanvasElement> {}

export interface SignaturePadRef {
  clear: () => void;
  getSignature: () => string | null;
}

const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
  ({ className, ...props }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);

    const getContext = () => {
      const canvas = canvasRef.current;
      return canvas ? canvas.getContext('2d') : null;
    };
    
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = getContext();
      if (!ctx) return;
      
      ctx.strokeStyle = '#374151'; // gray-700
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const getPos = (e: MouseEvent | TouchEvent) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        return {
          x: clientX - rect.left,
          y: clientY - rect.top,
        };
      };

      const startDrawing = (e: MouseEvent | TouchEvent) => {
        e.preventDefault();
        isDrawing.current = true;
        const { x, y } = getPos(e);
        const ctx = getContext();
        if(ctx) {
            ctx.beginPath();
            ctx.moveTo(x, y);
        }
      };

      const draw = (e: MouseEvent | TouchEvent) => {
        if (!isDrawing.current) return;
        e.preventDefault();
        const { x, y } = getPos(e);
        const ctx = getContext();
        if(ctx) {
            ctx.lineTo(x, y);
            ctx.stroke();
        }
      };

      const stopDrawing = () => {
        isDrawing.current = false;
        const ctx = getContext();
        if(ctx) ctx.closePath();
      };
      
      canvas.addEventListener('mousedown', startDrawing);
      canvas.addEventListener('mousemove', draw);
      canvas.addEventListener('mouseup', stopDrawing);
      canvas.addEventListener('mouseleave', stopDrawing);

      canvas.addEventListener('touchstart', startDrawing, { passive: false });
      canvas.addEventListener('touchmove', draw, { passive: false });
      canvas.addEventListener('touchend', stopDrawing);
      
      return () => {
        canvas.removeEventListener('mousedown', startDrawing);
        canvas.removeEventListener('mousemove', draw);
        canvas.removeEventListener('mouseup', stopDrawing);
        canvas.removeEventListener('mouseleave', stopDrawing);

        canvas.removeEventListener('touchstart', startDrawing);
        canvas.removeEventListener('touchmove', draw);
        canvas.removeEventListener('touchend', stopDrawing);
      };
    }, []);

    useImperativeHandle(ref, () => ({
      clear: () => {
        const canvas = canvasRef.current;
        const ctx = getContext();
        if (canvas && ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      },
      getSignature: () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const blank = document.createElement('canvas');
            blank.width = canvas.width;
            blank.height = canvas.height;
            return canvas.toDataURL() === blank.toDataURL() ? null : canvas.toDataURL('image/png');
        }
        return null;
      }
    }));

    return (
      <canvas
        ref={canvasRef}
        className={cn('w-full h-40 bg-white rounded-md border cursor-crosshair', className)}
        {...props}
      />
    );
  }
);

SignaturePad.displayName = 'SignaturePad';

export default SignaturePad;
