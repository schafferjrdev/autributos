import React, { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  PawPrint,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Filter,
  Layers,
  Users2,
} from "lucide-react";
import PETS from "../pets.json";

// =============================
// 🎨 Paleta & Design System
// =============================
// Paleta pensada no seu gosto: roxo + mistura de rosa com azul.
// Usamos CSS variables para facilitar ajustes rápidos.
const PALETTE = {
  primary: "#7C3AED", // roxo (indigo/violeta)
  secondary: "#DB2777", // rosa (fúcsia)
  tertiary: "#0EA5E9", // azul (sky)
  surface: "#ffffff",
  surfaceAlt: "#F8FAFC", // slate-50
  text: "#0F172A", // slate-900
  textMuted: "#475569", // slate-600
  ring: "#C7D2FE", // indigo-200
};

// Ordem fixa dos eixos
const ATTR_ORDER = [
  "sociavel",
  "barulhento",
  "teimoso",
  "curioso",
  "carente",
  "drama",
  "energetico",
  "territorial",
];

const LABELS = {
  sociavel: "Sociável",
  barulhento: "Barulhento",
  teimoso: "Teimoso",
  curioso: "Curioso",
  carente: "Carente",
  drama: "Drama",
  energetico: "Energético",
  territorial: "Territorial",
};

const ATTR_COLORS = {
  sociavel: "#6366F1", // roxo
  barulhento: "#F43F5E", // rosa
  teimoso: "#0EA5E9", // azul
  curioso: "#F59E0B", // amarelo
  carente: "#10B981", // verde
  drama: "#A855F7", // lilás
  energetico: "#E11D48", // vermelho
  territorial: "#14B8A6", // ciano
};

// =============================
// 🔧 Helpers
// =============================

function formatIdade(valor) {
  const n = Number(valor);
  if (Number.isNaN(n)) return valor;
  if (n < 1) {
    const meses = Math.round(n * 12);
    return `${meses} ${meses === 1 ? "mês" : "meses"}`;
  }
  return `${n} ano${n === 1 ? "" : "s"}`;
}

function useRadarData(pet) {
  return useMemo(
    () =>
      ATTR_ORDER.map((key) => ({
        eixo: LABELS[key],
        valor: pet.atributos[key],
        fill: ATTR_COLORS[key],
        stroke: ATTR_COLORS[key],
      })),
    [pet]
  );
}

// Dark mode removido

// =============================
// 🧩 UI Pieces
// =============================
function Avatar({ src, alt, size = 128 }) {
  const [error, setError] = useState(false);
  return (
    <div
      className='rounded-2xl overflow-hidden ring-2 ring-white shadow-md bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center'
      style={{ width: size, height: size }}
    >
      {error ? (
        <PawPrint className='w-10 h-10 opacity-60' />
      ) : (
        <img
          src={src}
          alt={alt}
          className='w-full h-full object-cover'
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}

function Chip({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer px-3 py-1.5 rounded-full border text-sm transition ${active
        ? "bg-white border-indigo-300 ring-2 ring-indigo-100 text-slate-800"
        : "bg-white/70 hover:bg-white border-slate-200 text-slate-700"
        }`}
    >
      {children}
    </button>
  );
}

function SoftCard({ children, className = "" }) {
  return (
    <div
      className={`rounded-3xl p-6 bg-white border border-slate-200 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }) {
  return (
    <div className='flex items-center gap-3'>
      {Icon && (
        <div className='p-2 rounded-xl bg-gradient-to-br from-indigo-100 to-sky-100 '>
          <Icon className='w-5 h-5 text-indigo-600' />
        </div>
      )}
      <div>
        <h2 className='text-xl font-semibold'>{title}</h2>
        {subtitle && <p className='text-sm text-slate-700'>{subtitle}</p>}
      </div>
    </div>
  );
}

// =============================
// 📊 Radar Card
// =============================
// function RadarLegend() {
//   return (
//     <div className='flex flex-wrap gap-2 text-xs text-slate-700 mt-2'>
//       {ATTR_ORDER.map((k) => (
//         <span
//           style={{ color: ATTR_COLORS[k] }}
//           key={k}
//           className='inline-flex items-center gap-1 px-2 py-1 rounded-full border border-slate-200 bg-white'
//         >
//           <span
//             style={{ backgroundColor: ATTR_COLORS[k] }}
//             className='w-1.5 h-1.5 rounded-full bg-slate-500/70'
//           />{" "}
//           {LABELS[k]}
//         </span>
//       ))}
//     </div>
//   );
// }

function PetRadarCard({ pet, emphasis = false }) {
  const data = useRadarData(pet);
  return (
    <SoftCard className={`${emphasis ? "ring-2 ring-indigo-200" : ""}`}>
      {/* Header */}
      <div className='flex items-center gap-5'>
        <Avatar src={pet.foto} alt={pet.nome} size={148} />
        <div className='flex-1'>
          <p className='text-2xl text-slate-700'>{pet.nome}</p>
          <p className='text-sm text-slate-700'>
            Idade: {formatIdade(pet.idade)}
          </p>
          <div className='mt-2 inline-flex items-center gap-1 text-xs text-slate-600'>
            <Sparkles className='w-3.5 h-3.5' /> Perfil de atributos (0–5)
          </div>
        </div>
      </div>

      {/* Radar + lista curta */}
      <div className='mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='col-span-2 h-90 w-full flex flex-col'>
          <ResponsiveContainer width='100%' height='100%'>
            <RadarChart data={data} outerRadius='80%'>
              <PolarGrid />
              <PolarAngleAxis dataKey='eixo' tick={{ fontSize: 12 }} />
              <PolarRadiusAxis domain={[0, 5]} tickCount={6} />
              <Radar name='Perfil' dataKey='valor' fillOpacity={0.25} />

              <Tooltip formatter={(v) => [v, "Valor"]} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className='grid grid-cols-2 md:grid-cols-3 gap-3 content-start'>
          {ATTR_ORDER.map((k) => (
            <div
              className='rounded-xl border p-2  backdrop-blur bg-white flex flex-col items-center justify-between'
              style={{ borderColor: ATTR_COLORS[k], color: ATTR_COLORS[k] }}
            >
              <span className='text-xs font-medium'>{LABELS[k]}</span>
              <span className='px-2 py-1 rounded-full text-xs'>
                {pet.atributos[k]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </SoftCard>
  );
}

// =============================
// 🧭 Tela Final (Layout)
// =============================
export default function Autributos() {
  const [current, setCurrent] = useState(0);
  const [filtro, setFiltro] = useState("Todos");

  const especies = [
    "Todos",
    ...Array.from(new Set(PETS.map((p) => p.especie))),
  ];
  const filtrados = PETS.filter((p) =>
    filtro === "Todos" ? true : p.especie === filtro
  );
  const pet =
    filtrados[current % Math.max(filtrados.length, 1)] ||
    filtrados[0] ||
    PETS[0];

  const prev = () =>
    setCurrent((i) => (i - 1 + filtrados.length) % filtrados.length);
  const next = () => setCurrent((i) => (i + 1) % filtrados.length);

  // CSS vars no root da tela
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--color-primary", PALETTE.primary);
    root.style.setProperty("--color-secondary", PALETTE.secondary);
    root.style.setProperty("--color-tertiary", PALETTE.tertiary);
  }, []);

  return (
    <div
      className='min-h-screen text-slate-900'
      style={{
        backgroundImage:
          "radial-gradient(1200px 600px at -10% -10%, rgba(124,58,237,0.15), transparent 60%), radial-gradient(1200px 600px at 110% -10%, rgba(14,165,233,0.15), transparent 60%), linear-gradient(180deg, #ffffff, #F8FAFC)",
      }}
    >
      {/* Topbar */}
      <header className='sticky top-0 z-10 backdrop-blur bg-white/60 border-b border-slate-200'>
        <div className='max-w-6xl mx-auto px-6 py-3 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-400 grid place-items-center text-white shadow'>
              <PawPrint className='w-5 h-5' />
            </div>
            <div>
              <h1 className='text-lg font-semibold leading-tight'>
                Autributos
              </h1>
              <p className='text-xs text-slate-700'>
                Ficha de atributos dos pets
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className='max-w-6xl mx-auto px-6 py-6 flex flex-col-reverse lg:flex-row gap-6'>
        {/* Sidebar: Filtros e contexto */}
        <aside className='lg:flex-1 space-y-6'>
          <SoftCard>
            <SectionTitle
              icon={Filter}
              title='Filtros'
              subtitle='Refine por espécie'
            />
            <div className='mt-4 flex flex-wrap gap-2'>
              {especies.map((e) => (
                <Chip
                  key={e}
                  active={filtro === e}
                  onClick={() => {
                    setFiltro(e);
                    setCurrent(0);
                  }}
                >
                  {e}
                </Chip>
              ))}
            </div>
          </SoftCard>

          <SoftCard>
            <SectionTitle
              icon={Layers}
              title='Sobre os atributos'
              subtitle='Escala 0–5 (eixos fixos)'
            />
            <ul className='mt-3 space-y-1 text-sm text-slate-700'>
              {ATTR_ORDER.map((k) => (
                <li key={k} className='flex items-center gap-2'>
                  <span className='w-1.5 h-1.5 rounded-full bg-slate-500/70' />{" "}
                  {LABELS[k]}
                </li>
              ))}
            </ul>
          </SoftCard>

          <SoftCard>
            <SectionTitle
              icon={Users2}
              title='Dica'
              subtitle='Compare perfis'
            />
            <p className='mt-2 text-sm text-slate-700'>
              Para comparar, selecione um pet no mosaico abaixo e use os botões
              Anterior/Próximo ou filtre por espécie.
            </p>
            <p className='mt-2 text-sm text-slate-700'>
              Você também pode visualizar o simulador do Reality
            </p>
            <Link
              to="/reality"
              className='cursor-pointer inline-flex items-center gap-2 rounded-2xl px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 shadow-sm'
            >
              Reality <ChevronRight className='w-4 h-4' />
            </Link>
          </SoftCard>
        </aside>

        {/* Área principal */}
        <section className='lg:col-span-3 space-y-6'>
          <PetRadarCard pet={pet} emphasis />

          {/* Navegação */}
          <div className='flex items-center justify-between gap-3'>
            <button
              onClick={prev}
              className='cursor-pointer inline-flex items-center gap-2 rounded-2xl px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 shadow-sm'
            >
              <ChevronLeft className='w-4 h-4' /> Anterior
            </button>
            <div className='text-sm text-slate-700'>
              {filtrados.indexOf(pet) + 1 || 1} /{" "}
              {filtrados.length || PETS.length}
            </div>
            <button
              onClick={next}
              className='cursor-pointer inline-flex items-center gap-2 rounded-2xl px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 shadow-sm'
            >
              Próximo <ChevronRight className='w-4 h-4' />
            </button>
          </div>

          {/* Mosaico/Galeria */}
          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3'>
            {filtrados.map((p, i) => (
              <button
                key={p.nome}
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: "smooth" })
                  setCurrent(i)
                }}
                className={`cursor-pointer group rounded-2xl border p-3 bg-white text-left hover:bg-white transition ${p === pet
                  ? "border-indigo-400 ring-2 ring-indigo-100"
                  : "border-slate-200"
                  }`}
              >
                <div className='flex items-center gap-3'>
                  <div className='relative w-12 h-12 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center'>
                    <img
                      src={p.foto}
                      alt={p.nome}
                      onError={(e) => (e.currentTarget.style.display = "none")}
                      className='w-full h-full object-cover'
                    />
                    {p === pet ? (
                      <div className='w-full h-full bg-slate-800 backdrop-blur opacity-70 absolute' />
                    ) : null}
                    {p === pet ? (
                      <PawPrint className='w-5 h-5 text-slate-100 absolute' />
                    ) : null}
                  </div>
                  <div>
                    <div className='text-sm font-medium leading-tight'>
                      {p.nome}
                    </div>
                    <div className='text-xs text-slate-600'>{p.especie}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
