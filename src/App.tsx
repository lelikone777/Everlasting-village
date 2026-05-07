
import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { BuildingType, BUILDINGS, GRID_SIZE, TILE_SIZE, TerrainType } from './constants';
import { House, TreePine, Pickaxe, Wheat, Coins, Hammer, User, Settings2, Info, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
interface BuildingInstance {
  id: string;
  type: BuildingType;
  x: number;
  y: number;
}

interface Villager {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
}

// --- Main App Component ---
export default function App() {
  const [resources, setResources] = useState({ wood: 100, stone: 50, gold: 100 });
  const [buildings, setBuildings] = useState<BuildingInstance[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>(null);
  const [dayTime, setDayTime] = useState(0);
  
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const worldRef = useRef<PIXI.Container | null>(null);
  const terrainContainerRef = useRef<PIXI.Container | null>(null);
  const buildingSpritesRef = useRef<Record<string, PIXI.Container>>({});
  const villagerSpritesRef = useRef<Record<string, PIXI.Graphics>>({});
  const villagersRef = useRef<Villager[]>([]);
  const overlayRef = useRef<PIXI.Graphics | null>(null);
  const terrainMapRef = useRef<TerrainType[][]>([]);

  // Dragging state
  const isDraggingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  // Initialize Pixi App
  useEffect(() => {
    const initPixi = async () => {
      const app = new PIXI.Application();
      const container = canvasContainerRef.current;
      if (!container) return;

      await app.init({
        width: container.clientWidth,
        height: container.clientHeight,
        backgroundColor: 0x1c1917,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
      });
      
      container.appendChild(app.canvas);
      appRef.current = app;

      // Camera Container
      const world = new PIXI.Container();
      app.stage.addChild(world);
      worldRef.current = world;

      // Drag Implementation
      app.stage.eventMode = 'static';
      app.stage.hitArea = app.screen;
      
      app.stage.on('pointerdown', (e) => {
        isDraggingRef.current = true;
        lastPosRef.current = { x: e.global.x, y: e.global.y };
      });
      
      app.stage.on('pointerup', () => isDraggingRef.current = false);
      app.stage.on('pointerupoutside', () => isDraggingRef.current = false);
      
      app.stage.on('pointermove', (e) => {
        if (!isDraggingRef.current || !worldRef.current) return;
        const dx = e.global.x - lastPosRef.current.x;
        const dy = e.global.y - lastPosRef.current.y;
        
        worldRef.current.x += dx;
        worldRef.current.y += dy;
        
        // Clamp camera
        const minX = -GRID_SIZE * TILE_SIZE + app.screen.width;
        const minY = -GRID_SIZE * TILE_SIZE + app.screen.height;
        worldRef.current.x = Math.max(minX, Math.min(0, worldRef.current.x));
        worldRef.current.y = Math.max(minY, Math.min(0, worldRef.current.y));
        
        lastPosRef.current = { x: e.global.x, y: e.global.y };
      });

      // Generate Terrain Map
      const map: TerrainType[][] = [];
      const terrainContainer = new PIXI.Container();
      world.addChild(terrainContainer);
      terrainContainerRef.current = terrainContainer;

      const g = new PIXI.Graphics();
      terrainContainer.addChild(g);

      for (let i = 0; i < GRID_SIZE; i++) {
        map[i] = [];
        for (let j = 0; j < GRID_SIZE; j++) {
          // Simple procedural generation for water (a "river" or lakes)
          const distFromCenter = Math.sqrt(Math.pow(i - GRID_SIZE / 2, 2) + Math.pow(j - GRID_SIZE / 2, 2));
          const noise = Math.sin(i * 0.2) * Math.cos(j * 0.2) * 5;
          
          let type = TerrainType.GRASS;
          if (distFromCenter > 20 + noise) type = TerrainType.WATER;
          else if (distFromCenter > 18 + noise) type = TerrainType.DIRT;

          map[i][j] = type;

          // Draw Tile
          g.rect(i * TILE_SIZE, j * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          if (type === TerrainType.WATER) g.fill(0x1e3a8a);
          else if (type === TerrainType.DIRT) g.fill(0x451a03);
          else g.fill(0x1a2e05);

          // Subtle grass/water detail
          if (Math.random() > 0.9) {
            g.rect(i * TILE_SIZE + 20, j * TILE_SIZE + 20, 8, 8);
            g.fill(type === TerrainType.WATER ? 0x1d4ed8 : 0x365314);
          }
        }
      }
      terrainMapRef.current = map;

      // Add natural trees
      const treeLayer = new PIXI.Graphics();
      world.addChild(treeLayer);
      for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
          if (map[i][j] === TerrainType.GRASS && Math.random() > 0.95) {
            // Trunk
            treeLayer.rect(i * TILE_SIZE + 28, j * TILE_SIZE + 40, 8, 12);
            treeLayer.fill(0x451a03);
            // Foliage
            treeLayer.circle(i * TILE_SIZE + 32, j * TILE_SIZE + 28, 16);
            treeLayer.fill(0x064e3b);
          }
        }
      }

      // Interactive layer
      const interactionLayer = new PIXI.Graphics();
      interactionLayer.rect(0, 0, GRID_SIZE * TILE_SIZE, GRID_SIZE * TILE_SIZE);
      interactionLayer.fill({ color: 0x000000, alpha: 0 });
      interactionLayer.eventMode = 'static';
      interactionLayer.on('pointertap', (e) => {
        // Skip clicks if we were dragging
        if (isDraggingRef.current) return;
        
        const localPos = world.toLocal(e.global);
        const gx = Math.floor(localPos.x / TILE_SIZE);
        const gy = Math.floor(localPos.y / TILE_SIZE);
        if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE) {
          window.dispatchEvent(new CustomEvent('tile-click', { detail: { gx, gy } }));
        }
      });
      world.addChild(interactionLayer);

      // Night Overlay
      const overlay = new PIXI.Graphics();
      overlay.rect(0, 0, GRID_SIZE * TILE_SIZE, GRID_SIZE * TILE_SIZE);
      overlay.fill({ color: 0x2e1065, alpha: 0 });
      world.addChild(overlay); // Add to world so it moves with camera
      overlayRef.current = overlay;

      // Villagers
      villagersRef.current = Array.from({ length: 5 }).map((_, i) => ({
        id: `v-${i}`,
        x: Math.random() * GRID_SIZE * TILE_SIZE,
        y: Math.random() * GRID_SIZE * TILE_SIZE,
        targetX: Math.random() * GRID_SIZE * TILE_SIZE,
        targetY: Math.random() * GRID_SIZE * TILE_SIZE,
        speed: 0.5 + Math.random()
      }));

      villagersRef.current.forEach(v => {
        const g = new PIXI.Graphics();
        g.circle(0, 0, 6);
        g.fill(0xe0d8c0);
        g.x = v.x;
        g.y = v.y;
        world.addChild(g);
        villagerSpritesRef.current[v.id] = g;
      });

      app.ticker.add(() => {
        villagersRef.current.forEach(v => {
          const sprite = villagerSpritesRef.current[v.id];
          const dx = v.targetX - v.x;
          const dy = v.targetY - v.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Check for road speed boost
          const gx = Math.floor(v.x / TILE_SIZE);
          const gy = Math.floor(v.y / TILE_SIZE);
          const onRoad = buildings.some(b => b.type === BuildingType.ROAD && b.x === gx && b.y === gy);
          const currentSpeed = v.speed * (onRoad ? 2.5 : 1);

          if (dist < 5) {
            v.targetX = Math.random() * GRID_SIZE * TILE_SIZE;
            v.targetY = Math.random() * GRID_SIZE * TILE_SIZE;
          } else {
            v.x += (dx / dist) * currentSpeed;
            v.y += (dy / dist) * currentSpeed;
            sprite.x = v.x;
            sprite.y = v.y;
          }
        });
      });
    };

    initPixi();

    const handleResize = () => {
      if (appRef.current && canvasContainerRef.current) {
        const { clientWidth, clientHeight } = canvasContainerRef.current;
        appRef.current.renderer.resize(clientWidth, clientHeight);
        if (overlayRef.current) {
          overlayRef.current.clear();
          overlayRef.current.rect(0, 0, clientWidth, clientHeight);
          overlayRef.current.fill({ color: 0x2e1065, alpha: 0 });
        }
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (appRef.current) {
        appRef.current.destroy(true, { children: true, texture: true });
        appRef.current = null;
      }
    };
  }, []);

  // Sync buildings
  useEffect(() => {
    if (!worldRef.current) return;
    buildings.forEach(b => {
      if (!buildingSpritesRef.current[b.id]) {
        const container = new PIXI.Container();
        container.x = b.x * TILE_SIZE;
        container.y = b.y * TILE_SIZE;
        const g = new PIXI.Graphics();
        const color = getBuildingColor(b.type);
        
        if (b.type === BuildingType.ROAD) {
          // Flat Road design
          g.rect(2, 2, TILE_SIZE - 4, TILE_SIZE - 4);
          g.fill(color);
          g.rect(TILE_SIZE * 0.3, TILE_SIZE * 0.3, TILE_SIZE * 0.4, TILE_SIZE * 0.4);
          g.stroke({ color: 0x000000, width: 1, alpha: 0.3 });
        } else {
          // 3D Building design
          g.ellipse(TILE_SIZE/2, TILE_SIZE/2 + 5, TILE_SIZE/3, TILE_SIZE/4);
          g.fill({ color: 0x000000, alpha: 0.2 });
          g.roundRect(10, 10, TILE_SIZE - 20, TILE_SIZE - 20, 4);
          g.fill(color);
          g.stroke({ color: 0x000000, width: 2 });
          g.poly([TILE_SIZE/2, 2, 8, 15, TILE_SIZE-8, 15]);
          g.fill(0x2a1a0a);
        }
        
        container.addChild(g);
        worldRef.current!.addChild(container);
        buildingSpritesRef.current[b.id] = container;
      }
    });
  }, [buildings]);

  // Sync Overlay
  useEffect(() => {
    if (!overlayRef.current) return;
    const hour = dayTime / 100;
    let alpha = 0;
    let color = 0x2e1065;
    if (hour < 5 || hour > 19) { alpha = 0.5; }
    else if (hour < 7) { alpha = 0.5 * (1 - (hour - 5) / 2); color = 0xf59e0b; }
    else if (hour > 17) { alpha = 0.5 * ((hour - 17) / 2); color = 0xf59e0b; }
    overlayRef.current.clear();
    overlayRef.current.rect(0, 0, GRID_SIZE * TILE_SIZE, GRID_SIZE * TILE_SIZE);
    overlayRef.current.fill({ color, alpha });
  }, [dayTime]);

  const handlePlaceBuilding = (gx: number, gy: number) => {
    if (!selectedBuilding) return;
    const data = BUILDINGS[selectedBuilding];
    if (resources.wood >= data.cost.wood && resources.stone >= data.cost.stone && resources.gold >= data.cost.gold) {
      if (buildings.some(b => b.x === gx && b.y === gy)) return;
      // Check terrain
      if (terrainMapRef.current[gx]?.[gy] === TerrainType.WATER) return;

      setResources(prev => ({ wood: prev.wood - data.cost.wood, stone: prev.stone - data.cost.stone, gold: prev.gold - data.cost.gold }));
      setBuildings(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), type: selectedBuilding, x: gx, y: gy }]);
    }
  };

  useEffect(() => {
    const handler = (e: any) => handlePlaceBuilding(e.detail.gx, e.detail.gy);
    window.addEventListener('tile-click', handler);
    return () => window.removeEventListener('tile-click', handler);
  }, [selectedBuilding, resources, buildings]);

  useEffect(() => {
    const timer = setInterval(() => {
      setDayTime(prev => {
        const next = (prev + 1) % 2400;
        if (next % 100 === 0) {
          setResources(r => {
            let nw = r.wood, ns = r.stone, ng = r.gold;
            buildings.forEach(b => {
              const p = BUILDINGS[b.type].production;
              nw += p.wood; ns += p.stone; ng += p.gold;
            });
            return { wood: nw, stone: ns, gold: ng };
          });
        }
        return next;
      });
    }, 50);
    return () => clearInterval(timer);
  }, [buildings]);

  const getBuildingColor = (type: BuildingType) => {
    switch (type) {
      case BuildingType.HOUSE: return 0x4a3a2a;
      case BuildingType.LUMBER_MILL: return 0x2a2319;
      case BuildingType.QUARRY: return 0x5c4d36;
      case BuildingType.FARM: return 0x3d4d2e;
      case BuildingType.ROAD: return 0x44403c;
      default: return 0xffffff;
    }
  };

  return (
    <div className="w-full h-full bg-theme-bg text-theme-text font-serif overflow-hidden flex flex-col relative select-none uppercase tracking-wider">
      {/* Visual Overlays */}
      <div className="ambient-glow-top" />
      <div className="ambient-glow-bottom" />
      <div className="texture-overlay" />

      {/* Top HUD */}
      <header className="h-24 w-full flex items-center justify-between px-10 z-30 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center space-x-6">
          <StatBox icon={<div className="w-5 h-5 bg-[#8b4513] border border-white/20" />} val={resources.wood} label="Wood" />
          <StatBox icon={<div className="w-5 h-5 bg-[#a0a0a0] border border-white/20 rounded-full" />} val={resources.stone} label="Stone" />
          <StatBox icon={<div className="w-5 h-5 bg-[#ffd700] border border-white/20 rotate-45" />} val={resources.gold} label="Gold" color="text-theme-accent" />
        </div>

        <div className="text-center">
          <div className="text-theme-accent text-xs tracking-[0.2em] mb-1 font-bold">Everlasting Village - Late Autumn</div>
          <div className="text-4xl font-black font-mono bg-clip-text text-transparent bg-gradient-to-b from-white to-[#a0a0a0]">
            {Math.floor(dayTime / 100).toString().padStart(2, '0')}:{(dayTime % 100).toString().padStart(2, '0')}
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="text-right">
            <div className="text-[10px] opacity-60 font-bold">Pop</div>
            <div className="text-xl font-black">5 / 20</div>
          </div>
          <div className="w-12 h-12 rounded-full border-4 border-theme-accent bg-[#2a2a2a] flex items-center justify-center text-xl shadow-lg ring-4 ring-black/20">?</div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex px-10 py-4 gap-8 relative z-20">
        {/* Left Sidebar: Journal */}
        <aside className="w-72 sidebar-panel">
          <h2 className="text-theme-accent uppercase text-[10px] tracking-widest border-b border-theme-accent/30 pb-2 mb-5 font-black">Settlement Log</h2>
          <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <LogEntry title="Expanding" desc="Place more Cottages to increase population limit." active progress={20} />
            <LogEntry title="Storage" desc="Gather 500 wood to build a proper Granary." />
            <LogEntry title="Autumn Chill" desc="The nights are getting longer..." dimmed />
          </div>
          <button className="mt-4 w-full py-3 bg-theme-button hover:bg-theme-button/80 text-[10px] font-bold tracking-widest border-t-2 border-white/10 transition-colors">
            Open Ledger [L]
          </button>
        </aside>

        {/* Center Game View */}
        <section className="flex-1 bg-[#2d3a1e] rounded-lg border-[12px] border-[#3d3326] shadow-[0_0_80px_rgba(0,0,0,0.9)] relative overflow-hidden group">
           <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
           <div className="w-full h-full" ref={canvasContainerRef} />
           
           {/* Floating Info */}
           {!selectedBuilding && buildings.length === 0 && (
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 px-8 py-5 border border-theme-accent/50 backdrop-blur-md rounded-md pointer-events-none text-center">
                <p className="text-theme-accent font-black text-lg mb-1 italic">Welcome, Elder</p>
                <p className="text-[10px] uppercase tracking-widest text-white/60">Choose a blueprints below to begin building</p>
             </div>
           )}
        </section>

        {/* Right Sidebar: Status */}
        <aside className="w-24 flex flex-col gap-3">
          <StatusBlock val="92" label="Morale" color="text-theme-accent" />
          <StatusBlock val="12°C" label="Temp" color="text-blue-400" />
          <div className="flex-1 flex flex-col gap-3 items-center justify-start pt-4">
            <VillagerAvatar color="from-gray-400 to-gray-700" />
            <VillagerAvatar color="from-amber-600 to-amber-900" />
            <VillagerAvatar color="from-stone-800 to-stone-900" empty />
          </div>
        </aside>
      </main>

      {/* Bottom Action Bar */}
      <footer className="h-32 w-full bg-[#3d3326] border-t-8 border-[#251e16] px-10 flex items-center justify-between gap-6 z-30 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
        {/* Quick Menu */}
        <div className="flex gap-3 bg-black/40 p-2.5 rounded-sm border-2 border-theme-border shadow-inner">
          {(Object.keys(BUILDINGS) as BuildingType[]).map((type) => {
            const b = BUILDINGS[type];
            return (
              <BuildSlot 
                key={type}
                type={type}
                active={selectedBuilding === type}
                onClick={() => setSelectedBuilding(selectedBuilding === type ? null : type)}
              />
            );
          })}
          <div className="w-16 h-16 bg-theme-panel/50 border border-white/5 opacity-30 shadow-inner"></div>
        </div>

        {/* Selected Info */}
        <div className="flex-1 flex flex-col justify-center min-w-0 max-w-md">
          {selectedBuilding ? (
            <>
              <div className="flex items-center gap-3 mb-2 animate-in fade-in slide-in-from-left-4 duration-300">
                <span className="px-3 py-1 bg-theme-accent text-theme-bg text-[10px] font-black uppercase">Planning</span>
                <span className="text-lg font-black uppercase tracking-tight text-white">{BUILDINGS[selectedBuilding].name}</span>
              </div>
              <div className="text-[10px] text-white/50 italic leading-snug flex items-center gap-3">
                <span>{BUILDINGS[selectedBuilding].description}</span>
                <div className="h-3 w-[2px] bg-white/10" />
                <span className="flex gap-3 text-white/70">
                  <span className={resources.wood < BUILDINGS[selectedBuilding].cost.wood ? 'text-red-500' : ''}>{BUILDINGS[selectedBuilding].cost.wood}W</span>
                  <span className={resources.stone < BUILDINGS[selectedBuilding].cost.stone ? 'text-red-500' : ''}>{BUILDINGS[selectedBuilding].cost.stone}S</span>
                </span>
              </div>
            </>
          ) : (
            <div className="opacity-30 flex items-center gap-3">
              <Settings2 className="w-5 h-5" />
              <span className="text-xs font-bold italic tracking-widest">Awaiting Command...</span>
            </div>
          )}
        </div>

        {/* Final Actions */}
        <div className="flex gap-4 items-center">
           <div className="w-20 h-20 rounded-full bg-[#1a1a1a] border-2 border-theme-accent flex items-center justify-center shadow-[0_0_20px_rgba(255,215,0,0.3)] cursor-pointer hover:scale-105 active:scale-95 transition-all outline-8 outline-black/20">
             <Hammer className="w-8 h-8 text-theme-accent" />
           </div>
           <div className="w-14 h-14 rounded-full bg-[#1a1a1a] border-2 border-white/20 flex items-center justify-center opacity-70 hover:opacity-100 cursor-pointer transition-all">
             <Settings2 className="w-6 h-6" />
           </div>
        </div>
      </footer>
    </div>
  );
}

// --- Immersive UI Components ---

function StatBox({ icon, val, label, color = "text-white" }: { icon: React.ReactNode, val: number, label: string, color?: string }) {
  return (
    <div className="hud-panel flex items-center min-w-[140px] hover:border-theme-accent/50 transition-colors">
      <div className="mr-4">{icon}</div>
      <div className="flex flex-col">
        <span className="text-[9px] font-black text-theme-accent/60 uppercase racking-tighter mb-0.5">{label}</span>
        <span className={`text-2xl font-black font-mono leading-none ${color}`}>{val}</span>
      </div>
    </div>
  );
}

function LogEntry({ title, desc, progress, active, dimmed }: { title: string, desc: string, progress?: number, active?: boolean, dimmed?: boolean }) {
  return (
    <div className={`p-4 rounded-sm transition-all border-l-4 ${active ? 'bg-black/40 border-theme-accent' : 'bg-black/20 border-[#5c4d36]'} ${dimmed ? 'opacity-40 grayscale' : ''}`}>
      <p className="text-xs font-black text-white mb-1 uppercase tracking-tight">{title}</p>
      <p className="text-[10px] text-theme-text/80 leading-normal mb-2 italic lowercase">{desc}</p>
      {progress !== undefined && (
        <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden border border-white/5">
          <div className="bg-theme-accent h-full rounded-full shadow-[0_0_8px_rgba(255,215,0,0.5)]" style={{ width: `${progress}%` }}></div>
        </div>
      )}
    </div>
  );
}

function StatusBlock({ val, label, color }: { val: string, label: string, color: string }) {
  return (
    <div className="h-24 bg-theme-panel border-2 border-theme-border rounded-sm flex flex-col items-center justify-center shadow-lg hover:border-theme-accent/30 transition-colors">
      <div className={`${color} font-black text-2xl font-mono`}>{val}</div>
      <div className="text-[9px] font-bold uppercase tracking-widest text-[#e0d8c0]/60 mt-1">{label}</div>
    </div>
  );
}

function VillagerAvatar({ color, empty }: { color: string, empty?: boolean }) {
  return (
    <div className={`w-16 h-16 rounded-full border-2 border-theme-border overflow-hidden p-1 bg-theme-panel shadow-lg ${empty ? 'opacity-20' : 'hover:scale-110 transition-transform cursor-help'}`}>
      <div className={`w-full h-full rounded-full bg-gradient-to-br ${color} ${empty ? 'bg-black' : ''}`}></div>
    </div>
  );
}

function BuildSlot({ type, active, onClick }: { type: BuildingType, active: boolean, onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`w-18 h-18 bg-theme-button border-2 flex flex-col items-center justify-center cursor-pointer transition-all ${
        active ? 'bg-theme-accent border-white shadow-[0_0_15px_rgba(255,215,0,0.4)] -translate-y-1' : 'border-white/10 hover:bg-theme-button/80'
      }`}
    >
      <div className={`mb-1 ${active ? 'text-theme-bg' : 'text-white'}`}>
        <BuildingIcon type={type} size={24} />
      </div>
      <span className={`text-[8px] font-black tracking-tight ${active ? 'text-theme-bg' : 'text-white/80'}`}>{type.substring(0, 5)}</span>
    </div>
  );
}

function BuildingIcon({ type, size = 16 }: { type: BuildingType, size?: number }) {
  switch (type) {
    case BuildingType.HOUSE: return <House size={size} />;
    case BuildingType.LUMBER_MILL: return <TreePine size={size} />;
    case BuildingType.QUARRY: return <Pickaxe size={size} />;
    case BuildingType.FARM: return <Wheat size={size} />;
    case BuildingType.ROAD: return <Navigation size={size} className="rotate-45" />;
  }
}
