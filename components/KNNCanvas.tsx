
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { DataPoint, ClassLabel, CLASS_COLORS, VisualSettings } from '../types';

interface KNNCanvasProps {
  points: DataPoint[];
  onInteractStart: (x: number, y: number) => void;
  onInteractMove: (x: number, y: number) => void;
  onInteractEnd: () => void;
  onPointSelect: (id: string) => void;
  onPointDelete: (id: string) => void;
  interactionMode: 'view' | 'add_train' | 'add_test';
  theme: 'dark' | 'light';
  visualSettings: VisualSettings;
  fitViewTrigger: number;
  hiddenClasses: string[];
  selectedPointId?: string | null;
  onSelectionClear?: () => void;
}

const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const KNNCanvas: React.FC<KNNCanvasProps> = ({ 
  points, 
  onInteractStart, 
  onInteractMove, 
  onInteractEnd, 
  onPointSelect, 
  onPointDelete,
  interactionMode,
  theme,
  visualSettings,
  fitViewTrigger,
  hiddenClasses,
  selectedPointId,
  onSelectionClear
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const zoomBehavior = useRef<d3.ZoomBehavior<HTMLCanvasElement, unknown> | null>(null);

  const pointsRef = useRef(points);
  const interactionModeRef = useRef(interactionMode);
  const themeRef = useRef(theme);
  const visualsRef = useRef(visualSettings);
  const hiddenClassesRef = useRef(hiddenClasses);
  const selectedPointIdRef = useRef(selectedPointId);
  
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity.translate(0,0).scale(1));
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredPoint, setHoveredPoint] = useState<{ point: DataPoint, x: number, y: number } | null>(null);
  
  
  const clickStateRef = useRef<{
      lastClickTime: number;
      lastClickId: string | null;
      clickCount: number;
  }>({ lastClickTime: 0, lastClickId: null, clickCount: 0 });

  const dragStateRef = useRef<{
      isActive: boolean;
      isMoving: boolean;
      pointId: string | null;
      startX: number;
      startY: number;
  }>({ isActive: false, isMoving: false, pointId: null, startX: 0, startY: 0 });

  const isHoveringPointRef = useRef(false);

  useEffect(() => {
    pointsRef.current = points;
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  useEffect(() => {
    hiddenClassesRef.current = hiddenClasses;
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiddenClasses]);

  useEffect(() => {
    themeRef.current = theme;
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  useEffect(() => {
    visualsRef.current = visualSettings;
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visualSettings]);

  useEffect(() => {
    interactionModeRef.current = interactionMode;
  }, [interactionMode]);

  useEffect(() => {
    selectedPointIdRef.current = selectedPointId;
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPointId]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = d3.select(canvasRef.current);
    
    zoomBehavior.current = d3.zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.0001, 100000])
      .filter((event) => {
        if (event.type === 'wheel') return true;
        
        if (interactionModeRef.current === 'view' && isHoveringPointRef.current) return false;
        
        if (interactionModeRef.current !== 'view') return false;

        return true;
      })
      .on('zoom', (event) => {
        transformRef.current = event.transform;
        draw();
        setHoveredPoint(null);
      });

    canvas.call(zoomBehavior.current)
          .on("dblclick.zoom", null); 

    if (transformRef.current.k === 1 && transformRef.current.x === 0 && transformRef.current.y === 0) {
        const initialTransform = d3.zoomIdentity
            .translate(dimensions.width / 2, dimensions.height / 2)
            .scale(1);
        canvas.call(zoomBehavior.current.transform, initialTransform);
    } else {
        canvas.call(zoomBehavior.current.transform, transformRef.current);
    }
    
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimensions]); 

  useEffect(() => {
      if (!canvasRef.current || !zoomBehavior.current) return;
      if (points.length === 0) {
           const canvas = d3.select(canvasRef.current);
           const t = d3.zoomIdentity.translate(dimensions.width/2, dimensions.height/2).scale(1);
           canvas.call(zoomBehavior.current.transform, t);
           return;
      }

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      points.forEach(p => {
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
      });

      if (!isFinite(minX)) return;

      const padding = 60;
      const dataW = maxX - minX;
      const dataH = maxY - minY;
      const safeW = dataW <= 0 ? 1 : dataW;
      const safeH = dataH <= 0 ? 1 : dataH;

      const scaleX = (dimensions.width - padding * 2) / safeW;
      const scaleY = (dimensions.height - padding * 2) / safeH;
      const k = Math.min(scaleX, scaleY);
      
      const midX = (minX + maxX) / 2;
      const midY = (minY + maxY) / 2;
      
      const tx = dimensions.width / 2 - midX * k;
      const ty = dimensions.height / 2 - midY * k;

      const newTransform = d3.zoomIdentity.translate(tx, ty).scale(k);
      
      d3.select(canvasRef.current)
        .transition()
        .duration(750)
        .call(zoomBehavior.current.transform, newTransform);

  }, [fitViewTrigger, dimensions]);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    const { width, height } = dimensions;
    const transform = transformRef.current;
    const currentPoints = pointsRef.current;
    const currentTheme = themeRef.current;
    const visuals = visualsRef.current;
    const hidden = hiddenClassesRef.current;
    const selectedId = selectedPointIdRef.current;

    const bgColor = currentTheme === 'dark' ? '#0d1117' : '#ffffff';
    const gridColor = currentTheme === 'dark' ? '#1f2937' : '#e5e7eb';
    const axisColor = currentTheme === 'dark' ? '#4b5563' : '#9ca3af';
    const textColor = currentTheme === 'dark' ? '#6b7280' : '#4b5563';
    const testPointFill = currentTheme === 'dark' ? '#4b5563' : '#d1d5db';
    const testPointHalo = currentTheme === 'dark' ? '#ffffff' : '#000000';

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    const targetSpacing = 100;
    const dataSpacing = targetSpacing / transform.k;
    const power = Math.floor(Math.log10(dataSpacing));
    const base = Math.pow(10, power);
    const fraction = dataSpacing / base;
    
    let niceFraction = 1;
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;

    const gridSize = niceFraction * base;
    const precision = Math.max(0, Math.ceil(-Math.log10(gridSize)));

    const minX = -transform.x / transform.k;
    const maxX = (width - transform.x) / transform.k;
    const minY = -transform.y / transform.k;
    const maxY = (height - transform.y) / transform.k;

    const startXIndex = Math.floor(minX / gridSize);
    const endXIndex = Math.ceil(maxX / gridSize);
    const startYIndex = Math.floor(minY / gridSize);
    const endYIndex = Math.ceil(maxY / gridSize);

    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);

    ctx.lineWidth = 1 / transform.k;
    ctx.strokeStyle = gridColor;
    ctx.beginPath();

    for (let i = startXIndex; i <= endXIndex; i++) {
        const x = i * gridSize;
        ctx.moveTo(x, minY);
        ctx.lineTo(x, maxY);
    }
    for (let i = startYIndex; i <= endYIndex; i++) {
        const y = i * gridSize;
        ctx.moveTo(minX, y);
        ctx.lineTo(maxX, y);
    }
    ctx.stroke();

    ctx.lineWidth = 2 / transform.k;
    ctx.strokeStyle = axisColor;
    ctx.beginPath();
    if (minY < 0 && maxY > 0) {
        ctx.moveTo(minX, 0);
        ctx.lineTo(maxX, 0);
    }
    if (minX < 0 && maxX > 0) {
        ctx.moveTo(0, minY);
        ctx.lineTo(0, maxY);
    }
    ctx.stroke();

    const visiblePoints = currentPoints.filter(p => !hidden.includes(p.label));

    if (visuals.showLines) {
      const testPoints = visiblePoints.filter(p => p.type === 'test');
      testPoints.forEach(testPoint => {
          if (testPoint.neighbors && testPoint.neighbors.length > 0) {
              const maxRound = testPoint.neighbors.reduce((max, n) => Math.max(max, n.round), 0);

              testPoint.neighbors.forEach(link => {
                  const neighbor = link.point;
                  if (hidden.includes(neighbor.label)) return;

                  const isPast = link.round < maxRound;
                  const alpha = isPast ? 0.3 : 1.0; 
                  
                  ctx.beginPath();
                  ctx.strokeStyle = hexToRgba(CLASS_COLORS[neighbor.label], alpha);
                  ctx.lineWidth = visuals.lineWidth / transform.k;
                  
                  if (isPast) {
                      ctx.setLineDash([10 / transform.k, 10 / transform.k]); 
                  } else {
                      ctx.setLineDash([]);
                  }
                  
                  ctx.moveTo(testPoint.x, testPoint.y);
                  ctx.lineTo(neighbor.x, neighbor.y);
                  ctx.stroke();
              });
          }
      });
      ctx.setLineDash([]);
    }

    const trainPoints = visiblePoints.filter(p => p.type === 'train');
    const trainRadius = visuals.pointRadius / transform.k; 
    
    Object.values(ClassLabel).forEach(label => {
        if (hidden.includes(label)) return;

        const pointsOfLabel = trainPoints.filter(p => p.label === label);
        if (pointsOfLabel.length === 0) return;
        
        ctx.beginPath();
        pointsOfLabel.forEach(p => {
             ctx.moveTo(p.x + trainRadius, p.y);
             ctx.arc(p.x, p.y, trainRadius, 0, 2 * Math.PI);
        });
        ctx.fillStyle = CLASS_COLORS[label];
        ctx.fill();
    });
    
    if (currentTheme === 'light' && trainPoints.length > 0) {
        ctx.beginPath();
        trainPoints.forEach(p => {
             ctx.moveTo(p.x + trainRadius, p.y);
             ctx.arc(p.x, p.y, trainRadius, 0, 2 * Math.PI);
        });
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 0.5 / transform.k;
        ctx.stroke();
    }

    const testPointsToDraw = visiblePoints.filter(p => p.type === 'test');
    const testRadius = (visuals.pointRadius * 1.5) / transform.k;

    testPointsToDraw.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, testRadius + (2/transform.k), 0, 2 * Math.PI);
        ctx.strokeStyle = testPointHalo;
        ctx.lineWidth = 1.5 / transform.k;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(p.x, p.y, testRadius, 0, 2 * Math.PI);
        
        if (p.predictedLabel && p.predictedLabel !== 'Uncertain') {
            ctx.fillStyle = CLASS_COLORS[p.predictedLabel];
        } else {
            ctx.fillStyle = testPointFill; 
        }
        ctx.fill();
    });

    if (selectedId) {
        const selectedPoint = visiblePoints.find(p => p.id === selectedId);
        if (selectedPoint) {
             const r = selectedPoint.type === 'test' ? testRadius : trainRadius;
             ctx.beginPath();
             ctx.arc(selectedPoint.x, selectedPoint.y, r + (6 / transform.k), 0, 2 * Math.PI);
             ctx.strokeStyle = '#3b82f6'; 
             ctx.lineWidth = 3 / transform.k;
             ctx.stroke();
             
             ctx.beginPath();
             ctx.arc(selectedPoint.x, selectedPoint.y, r + (4 / transform.k), 0, 2 * Math.PI);
             ctx.strokeStyle = currentTheme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)';
             ctx.lineWidth = 1 / transform.k;
             ctx.stroke();
        }
    }

    ctx.restore();

    ctx.fillStyle = textColor;
    ctx.strokeStyle = axisColor;
    ctx.font = `11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
    ctx.lineWidth = 1;

    const stickyBottomY = height - 20;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.beginPath();
    ctx.strokeStyle = currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    ctx.moveTo(0, stickyBottomY);
    ctx.lineTo(width, stickyBottomY);
    ctx.stroke();

    ctx.strokeStyle = axisColor;
    for (let i = startXIndex; i <= endXIndex; i++) {
        const xVal = i * gridSize;
        const screenX = transform.x + xVal * transform.k;
        
        if (screenX < -20 || screenX > width + 20) continue;

        ctx.beginPath();
        ctx.moveTo(screenX, stickyBottomY);
        ctx.lineTo(screenX, stickyBottomY - 5);
        ctx.stroke();

        const text = xVal.toFixed(precision);
        ctx.fillText(text, screenX, stickyBottomY + 10);
    }

    const stickyLeftX = 30;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    ctx.beginPath();
    ctx.strokeStyle = currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    ctx.moveTo(stickyLeftX, 0);
    ctx.lineTo(stickyLeftX, height);
    ctx.stroke();

    ctx.strokeStyle = axisColor;
    for (let i = startYIndex; i <= endYIndex; i++) {
        const yVal = i * gridSize;
        const screenY = transform.y + yVal * transform.k;

        if (screenY < -20 || screenY > height + 20) continue;

        ctx.beginPath();
        ctx.moveTo(stickyLeftX, screenY);
        ctx.lineTo(stickyLeftX + 5, screenY);
        ctx.stroke();

        const text = (-yVal).toFixed(precision);
        ctx.fillText(text, stickyLeftX - 5, screenY);
    }
  };


  const getDataCoordinates = (e: React.MouseEvent) => {
      if (!canvasRef.current) return { x: 0, y: 0, mouseX: 0, mouseY: 0 };
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const t = transformRef.current;
      const dataX = (mouseX - t.x) / t.k;
      const dataY = (mouseY - t.y) / t.k;
      return { x: dataX, y: dataY, mouseX, mouseY };
  };

  const getPointUnderCursor = (mx: number, my: number) => {
      const thresholdSq = 15 * 15; 
      const t = transformRef.current;
      const currentPoints = pointsRef.current;
      const hidden = hiddenClassesRef.current;
      
      for (let i = currentPoints.length - 1; i >= 0; i--) {
          const p = currentPoints[i];
          if (hidden.includes(p.label)) continue;

          const px = p.x * t.k + t.x;
          const py = p.y * t.k + t.y;
          const dx = mx - px;
          const dy = my - py;
          
          if (dx*dx + dy*dy < thresholdSq) {
              return p;
          }
      }
      return null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y, mouseX, mouseY } = getDataCoordinates(e);
    const hitPoint = getPointUnderCursor(mouseX, mouseY);
    const now = Date.now();

    if (interactionMode === 'view') {
        if (hitPoint) {
            onPointSelect(hitPoint.id);
            const lastTime = clickStateRef.current.lastClickTime;
            const lastId = clickStateRef.current.lastClickId;
            const isDouble = (now - lastTime < 300) && (lastId === hitPoint.id);

            if (isDouble) {
                dragStateRef.current = {
                    isActive: true,
                    isMoving: false,
                    pointId: hitPoint.id,
                    startX: mouseX,
                    startY: mouseY
                };
                clickStateRef.current = { lastClickTime: now, lastClickId: hitPoint.id, clickCount: 2 };
            } else {
                clickStateRef.current = { lastClickTime: now, lastClickId: hitPoint.id, clickCount: 1 };
            }
        }
    } else {
        if (!hitPoint) {
            onInteractStart(x, y);
            dragStateRef.current = {
                isActive: true,
                isMoving: true, // Start moving immediately for add mode
                pointId: "NEW",
                startX: mouseX,
                startY: mouseY
            };
        } else {
            onPointSelect(hitPoint.id);
        }
    }
  };

  const handleClick = (e: React.MouseEvent) => {
      if (interactionMode === 'view') {
          const { mouseX, mouseY } = getDataCoordinates(e);
          const hitPoint = getPointUnderCursor(mouseX, mouseY);
          
          if (!hitPoint) {
              if (onSelectionClear) onSelectionClear();
          }
      }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const coords = getDataCoordinates(e);
    
    if (!dragStateRef.current.isActive) {
        const found = getPointUnderCursor(coords.mouseX, coords.mouseY);
        if (found) {
            setHoveredPoint({ point: found, x: coords.mouseX, y: coords.mouseY });
            isHoveringPointRef.current = true;
        } else {
            setHoveredPoint(null);
            isHoveringPointRef.current = false;
        }
    }

    if (dragStateRef.current.isActive) {
        if (interactionMode === 'view') {
            const dx = coords.mouseX - dragStateRef.current.startX;
            const dy = coords.mouseY - dragStateRef.current.startY;
            
            if (dragStateRef.current.isMoving || (dx * dx + dy * dy > 25)) {
                dragStateRef.current.isMoving = true;
                if (dragStateRef.current.pointId) {
                    onPointSelect(dragStateRef.current.pointId);
                    onInteractMove(coords.x, coords.y);
                }
            }
        } else {
            onInteractMove(coords.x, coords.y);
        }
    }
  };

  const handleMouseUp = () => {
      if (interactionMode === 'view') {
          if (dragStateRef.current.isActive) {
              if (!dragStateRef.current.isMoving && dragStateRef.current.pointId) {
                  onPointDelete(dragStateRef.current.pointId);
              }
          }
      } else {
          onInteractEnd();
      }
      dragStateRef.current = { isActive: false, isMoving: false, pointId: null, startX: 0, startY: 0 };
  };

  const handleMouseLeave = () => {
      setHoveredPoint(null);
      isHoveringPointRef.current = false;
      if (dragStateRef.current.isActive) {
          handleMouseUp();
      }
  };

  const tooltipClass = theme === 'dark' 
    ? 'bg-gray-800/95 border-gray-600 text-white' 
    : 'bg-white/95 border-gray-300 text-gray-800 shadow-xl';

  const getTooltipContent = (point: DataPoint) => {
      if (interactionMode === 'view') {
          return (
              <div className={`mt-1 pt-1 border-t ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'} text-[9px] leading-tight space-y-0.5 opacity-80`}>
                  <div><span className="font-bold">1-Клик:</span> Выбрать</div>
                  <div><span className="font-bold text-red-500">2-Клика:</span> Удалить</div>
                  <div><span className="font-bold text-blue-500">2-Клика+Удержание:</span> Переместить</div>
              </div>
          );
      }
      return null;
  };

  return (
    <div ref={containerRef} className="flex-1 relative h-full w-full overflow-hidden">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className={`block w-full h-full ${interactionMode === 'view' ? 'cursor-move' : 'cursor-crosshair'}`}
      />

      {hoveredPoint && !dragStateRef.current.isActive && (
        <div 
            className={`absolute pointer-events-none text-xs px-3 py-2 rounded border z-50 flex flex-col gap-1 min-w-[100px] backdrop-blur ${tooltipClass}`}
            style={{ 
                left: Math.min(hoveredPoint.x + 15, dimensions.width - 120), 
                top: Math.min(hoveredPoint.y - 10, dimensions.height - 80) 
            }}
        >
            <div className={`flex items-center gap-2 border-b pb-1 mb-1 ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
                 <div className="w-2 h-2 rounded-full" style={{ 
                     backgroundColor: hoveredPoint.point.predictedLabel 
                        ? CLASS_COLORS[hoveredPoint.point.predictedLabel as ClassLabel] 
                        : CLASS_COLORS[hoveredPoint.point.label] 
                 }}></div>
                 <span className="font-bold">
                   {hoveredPoint.point.type === 'test' ? 'Тестовая точка' : hoveredPoint.point.label}
                 </span>
            </div>
            <div className={`font-mono ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                X: {hoveredPoint.point.x.toFixed(2)}
            </div>
            <div className={`font-mono ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Y: {(-hoveredPoint.point.y).toFixed(2)}
            </div>
            {hoveredPoint.point.type === 'test' && (
                <div className="mt-1 pt-1 border-t border-gray-600 text-blue-500 font-semibold">
                    Прогноз: {hoveredPoint.point.predictedLabel}
                </div>
            )}
            {getTooltipContent(hoveredPoint.point)}
        </div>
      )}
    </div>
  );
};

export default KNNCanvas;
