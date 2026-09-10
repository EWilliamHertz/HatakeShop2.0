import React, { useEffect, useRef, useState } from 'react';
import { Download, Eraser, Pen } from 'lucide-react';
import { Socket } from 'socket.io-client';

interface WhiteboardProps {
  inquiryId: string;
  socket: Socket | null;
}

export function Whiteboard({ inquiryId, socket }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#4f46e5'); // indigo-600
  const [lineWidth, setLineWidth] = useState(3);
  const [mode, setMode] = useState<'draw' | 'erase'>('draw');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set initial size
    if (containerRef.current) {
       canvas.width = containerRef.current.clientWidth;
       canvas.height = containerRef.current.clientHeight;
    }

    // Set background to white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (socket) {
       socket.on('whiteboard_draw', (data: any) => {
          drawLine(data.x0, data.y0, data.x1, data.y1, data.color, data.lineWidth);
       });
       
       socket.on('whiteboard_clear', () => {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
       });
       
       socket.on('whiteboard_image', (data: { image: string }) => {
          const img = new Image();
          img.onload = () => {
             ctx.drawImage(img, 0, 0);
          };
          img.src = data.image;
       });
    }

    return () => {
       if (socket) {
          socket.off('whiteboard_draw');
          socket.off('whiteboard_clear');
          socket.off('whiteboard_image');
       }
    };
  }, [socket]);

  const drawLine = (x0: number, y0: number, x1: number, y1: number, color: string, lineWidth: number) => {
     const canvas = canvasRef.current;
     if (!canvas) return;
     const ctx = canvas.getContext('2d');
     if (!ctx) return;
     
     ctx.beginPath();
     ctx.moveTo(x0, y0);
     ctx.lineTo(x1, y1);
     ctx.strokeStyle = color;
     ctx.lineWidth = lineWidth;
     ctx.lineCap = 'round';
     ctx.stroke();
     ctx.closePath();
  };

  const getPos = (e: any) => {
     const canvas = canvasRef.current;
     if (!canvas) return { x: 0, y: 0 };
     const rect = canvas.getBoundingClientRect();
     if (e.touches) {
        return {
           x: e.touches[0].clientX - rect.left,
           y: e.touches[0].clientY - rect.top
        };
     }
     return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
     };
  };

  const currentPos = useRef({ x: 0, y: 0 });

  const onMouseDown = (e: any) => {
     setIsDrawing(true);
     currentPos.current = getPos(e);
  };

  const onMouseMove = (e: any) => {
     if (!isDrawing) return;
     const pos = getPos(e);
     const actualColor = mode === 'erase' ? '#ffffff' : color;
     const actualWidth = mode === 'erase' ? 20 : lineWidth;
     
     drawLine(currentPos.current.x, currentPos.current.y, pos.x, pos.y, actualColor, actualWidth);
     
     if (socket) {
        socket.emit('whiteboard_draw', {
           inquiryId,
           x0: currentPos.current.x,
           y0: currentPos.current.y,
           x1: pos.x,
           y1: pos.y,
           color: actualColor,
           lineWidth: actualWidth
        });
     }
     
     currentPos.current = pos;
  };

  const onMouseUp = () => {
     setIsDrawing(false);
  };
  
  const handleClear = () => {
     const canvas = canvasRef.current;
     if (!canvas) return;
     const ctx = canvas.getContext('2d');
     if (!ctx) return;
     ctx.fillStyle = '#ffffff';
     ctx.fillRect(0, 0, canvas.width, canvas.height);
     if (socket) {
        socket.emit('whiteboard_clear', { inquiryId });
     }
  };

  const downloadImage = () => {
     const canvas = canvasRef.current;
     if (!canvas) return;
     const url = canvas.toDataURL('image/png');
     const a = document.createElement('a');
     a.href = url;
     a.download = `whiteboard-${inquiryId}.png`;
     a.click();
  };

  // Image Upload Background
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;
     const reader = new FileReader();
     reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
           const canvas = canvasRef.current;
           if (!canvas) return;
           const ctx = canvas.getContext('2d');
           if (!ctx) return;
           
           // Scale image to fit canvas
           const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
           const x = (canvas.width / 2) - (img.width / 2) * scale;
           const y = (canvas.height / 2) - (img.height / 2) * scale;
           
           ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
           
           const dataUrl = canvas.toDataURL('image/png');
           if (socket) {
              socket.emit('whiteboard_image', { inquiryId, image: dataUrl });
           }
        };
        img.src = event.target?.result as string;
     };
     reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col h-full bg-slate-800 relative">
       <div className="flex items-center justify-between p-2 border-b border-slate-700 bg-slate-900">
          <div className="flex items-center gap-2">
             <button 
                onClick={() => setMode('draw')}
                 className={`p-2 rounded ${mode === 'draw' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:bg-slate-600'}`}
             >
                <Pen className="w-4 h-4" />
             </button>
             <button 
                onClick={() => setMode('erase')}
                className={`p-2 rounded ${mode === 'erase' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:bg-slate-600'}`}
             >
                <Eraser className="w-4 h-4" />
             </button>
             <input 
                type="color" 
                value={color} 
                onChange={e => setColor(e.target.value)} 
                className="w-8 h-8 rounded cursor-pointer"
             />
             <select 
                value={lineWidth} 
                onChange={e => setLineWidth(Number(e.target.value))}
                className="text-sm border border-slate-700 rounded p-1"
             >
                <option value={1}>Thin</option>
                <option value={3}>Normal</option>
                <option value={8}>Thick</option>
             </select>
          </div>
          <div className="flex items-center gap-2">
             <label className="text-xs font-medium cursor-pointer text-[#ffcc00] bg-slate-700 px-3 py-1.5 rounded hover:bg-slate-700 transition-colors">
                + Add Blueprint
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
             </label>
             <button 
                onClick={handleClear}
                className="text-xs font-medium text-rose-600 bg-rose-50 px-3 py-1.5 rounded hover:bg-rose-100 transition-colors"
             >
                Clear
             </button>
             <button 
                onClick={downloadImage}
                className="text-xs font-medium text-slate-400 bg-slate-700 px-3 py-1.5 rounded hover:bg-slate-600 transition-colors flex items-center gap-1"
             >
                <Download className="w-3 h-3" /> Save
             </button>
          </div>
       </div>
       <div ref={containerRef} className="flex-1 overflow-hidden cursor-crosshair">
          <canvas
             ref={canvasRef}
             onMouseDown={onMouseDown}
             onMouseMove={onMouseMove}
             onMouseUp={onMouseUp}
             onMouseOut={onMouseUp}
             onTouchStart={onMouseDown}
             onTouchMove={onMouseMove}
             onTouchEnd={onMouseUp}
             className="w-full h-full block touch-none"
          />
       </div>
    </div>
  );
}
