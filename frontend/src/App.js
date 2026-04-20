import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────
// API
// ─────────────────────────────────────────
const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const getToken = () => localStorage.getItem("omv_token");

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Erro na requisição");
  return data;
}

const apiRegister          = (body)                 => request("/auth/register", { method: "POST", body: JSON.stringify(body) });
const apiLogin             = (email, password)      => request("/auth/login",    { method: "POST", body: JSON.stringify({ email, password }) });
const apiGetMe             = ()                     => request("/auth/me");
const apiGetSpots          = ()                     => request("/spots");
const apiGetMyReservation  = ()                     => request("/reservations/mine");
const apiGetMyHistory      = ()                     => request("/reservations/history");
const apiCreateReservation = (spotId, str, placa, modelo) => request("/reservations", { method: "POST", body: JSON.stringify({ spotId, startTimeStr: str, placa, modelo }) });
const apiPayReservation    = (id)                   => request(`/reservations/${id}/pay`, { method: "POST" });
const apiCancelReservation = (id)                   => request(`/reservations/${id}/cancel`, { method: "POST" });
const apiAdminUsers        = ()                     => request("/admin/users");
const apiAdminLogs         = ()                     => request("/admin/logs");
const apiAdminReservations = ()                     => request("/admin/reservations");
const apiAdminDashboard    = ()                     => request("/admin/dashboard");
const apiToggleUser        = (id)                   => request(`/admin/users/${id}/toggle`, { method: "PATCH" });
const apiAdminCancelRes    = (id)                   => request(`/admin/reservations/${id}/cancel`, { method: "POST" });

// ─────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────
const GOOGLE_FONTS = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');`;

const GLOBAL_CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 100%; overflow-x: hidden; font-synthesis: none; -webkit-font-smoothing: antialiased; }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
.fade-in { animation: fadeIn 0.22s ease; }
@media (max-width: 768px) {
  .main-content { padding: 20px 14px !important; }
  .header-inner { padding: 0 14px !important; height: auto !important; flex-wrap: wrap; gap: 8px; padding-top: 10px !important; padding-bottom: 10px !important; }
  .header-logo { font-size: 14px !important; }
  .header-nav { gap: 2px !important; flex-wrap: wrap; justify-content: center; }
  .header-nav button { padding: 5px 10px !important; font-size: 11px !important; }
  .header-user { display: none !important; }
  .reserve-layout { flex-direction: column !important; }
  .reserve-panel { width: 100% !important; }
  .payment-layout { flex-direction: column !important; align-items: center !important; }
  .page-title { font-size: 20px !important; margin-bottom: 16px !important; }
  .stat-pills { gap: 8px !important; }
  .stat-pill .val { font-size: 22px !important; }
  .spot-grid-row { gap: 5px !important; }
  .spot-card { min-width: 52px !important; }
  .admin-inner-tabs { flex-wrap: wrap !important; }
  .login-card { padding: 26px 18px !important; }
  .timer-display { font-size: 32px !important; }
  .dash-grid { grid-template-columns: repeat(2,1fr) !important; }
}
@media (max-width: 480px) {
  .spot-card { min-width: 46px !important; }
  .page-title { font-size: 17px !important; }
  .timer-display { font-size: 26px !important; }
  .dash-grid { grid-template-columns: 1fr 1fr !important; }
}
`;

const C = {
  bg: "#F2EDE5", bgCard: "#FBF8F4", bgSoft: "#F7F2EB", bgDark: "#E8DFD1",
  border: "#DDD3C3", borderMid: "#C9BAA5",
  text: "#2A1F14", textMid: "#6B5744", textLight: "#A08B76",
  navy: "#3D2B1A", navyLight: "#F0E8DC", navyMid: "#6B4C30",
  green: "#4A8C5C", greenBg: "#E8F3EC", greenDark: "#2D6640",
  red: "#B05040", redBg: "#F5EAE8", redDark: "#8A3328",
  amber: "#A0700A", amberBg: "#F5EDD8", amberDark: "#7A5308",
  purple: "#7A5C9A", purpleBg: "#EDE5F5", purpleDark: "#4E3270",
  shadow: "0 2px 12px rgba(61,43,26,0.07)",
  shadowLg: "0 8px 36px rgba(61,43,26,0.10)",
};

const STATUS_META = {
  available:    { bg: C.greenBg,  border: C.green,  car: C.green,  text: C.greenDark,  label: "LIVRE"     },
  occupied:     { bg: C.redBg,    border: C.red,    car: C.red,    text: C.red,        label: "OCUPADA"   },
  preferential: { bg: C.amberBg,  border: C.amber,  car: C.amber,  text: C.amberDark,  label: "PREFER."   },
  reserved:     { bg: C.purpleBg, border: C.purple, car: C.purple, text: C.purpleDark, label: "RESERVADA" },
};

const PRICE_PER_HOUR = 80;

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
const fmtCPF  = v => v.replace(/\D/g,"").slice(0,11).replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d{1,2})$/,"$1-$2");
const fmtTel  = v => v.replace(/\D/g,"").slice(0,11).replace(/(\d{2})(\d)/,"($1) $2").replace(/(\d{5})(\d)/,"$1-$2");
const fmtTime = s => `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
const fmtMoney= v => `R$ ${Number(v).toFixed(2).replace(".",",")}`;
const fmtDate = d => new Date(d).toLocaleString("pt-BR");

// ─────────────────────────────────────────
// COMPONENTES BASE
// ─────────────────────────────────────────
function Spinner({ size=18, color=C.navy }) {
  return <div style={{ width:size, height:size, border:`2px solid ${C.border}`, borderTop:`2px solid ${color}`, borderRadius:"50%", animation:"spin 0.7s linear infinite", display:"inline-block", flexShrink:0 }} />;
}

function Card({ children, style={} }) {
  return <div style={{ background:C.bgCard, borderRadius:18, padding:"24px", boxShadow:C.shadowLg, border:`1px solid ${C.border}`, ...style }}>{children}</div>;
}

function Btn({ children, onClick, variant="primary", disabled=false, small=false, style={} }) {
  const v = {
    primary: { background:C.navy,    color:"#FBF5EE" },
    success: { background:C.green,   color:"white"   },
    ghost:   { background:C.bgDark,  color:C.textMid },
    amber:   { background:C.amber,   color:"white"   },
    danger:  { background:C.red,     color:"white"   },
  };
  return (
    <button onClick={!disabled?onClick:undefined} style={{ ...v[variant], border:"none", padding:small?"7px 14px":"11px 20px", borderRadius:9, fontSize:small?12:14, fontWeight:600, fontFamily:"DM Sans, sans-serif", cursor:disabled?"not-allowed":"pointer", opacity:disabled?0.55:1, transition:"opacity 0.15s", display:"inline-flex", alignItems:"center", justifyContent:"center", gap:7, ...style }}>
      {children}
    </button>
  );
}

function Field({ label, required=false, children }) {
  return (
    <div style={{ marginBottom:13 }}>
      <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.textMid, marginBottom:5, letterSpacing:0.8, textTransform:"uppercase", fontFamily:"DM Sans, sans-serif" }}>
        {label}{required && <span style={{ color:C.red, marginLeft:3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type="text", onKeyDown }) {
  return <input type={type} value={value} onChange={onChange} placeholder={placeholder} onKeyDown={onKeyDown} style={{ width:"100%", padding:"10px 13px", borderRadius:9, border:`1.5px solid ${C.border}`, fontSize:14, fontFamily:"DM Sans, sans-serif", background:C.bgSoft, outline:"none", color:C.text }} />;
}

function ErrBox({ msg }) {
  if (!msg) return null;
  return <div style={{ background:C.redBg, border:`1px solid ${C.red}30`, borderRadius:9, padding:"9px 13px", marginBottom:13, fontSize:12.5, color:C.red, fontWeight:500, lineHeight:1.5, fontFamily:"DM Sans, sans-serif" }}>{msg}</div>;
}

function Badge({ children, color, bg }) {
  return <span style={{ fontSize:11, background:bg, color, borderRadius:6, padding:"3px 9px", fontWeight:600, fontFamily:"DM Sans, sans-serif", whiteSpace:"nowrap" }}>{children}</span>;
}

function SectionTitle({ children }) {
  return <h3 style={{ fontFamily:"Syne, sans-serif", fontSize:15, fontWeight:700, color:C.navy, marginBottom:14 }}>{children}</h3>;
}

// ─────────────────────────────────────────
// CAR ICON
// ─────────────────────────────────────────
function CarIcon({ color="currentColor", size=34 }) {
  return (
    <svg width={size} height={size*1.4} viewBox="0 0 40 56" fill="none">
      <rect x="10" y="8"  width="20" height="38" rx="5" fill={color}/>
      <rect x="12" y="6"  width="16" height="7"  rx="3" fill={color}/>
      <rect x="12" y="44" width="16" height="7"  rx="3" fill={color}/>
      <rect x="3"  y="14" width="8"  height="10" rx="2" fill={color} opacity="0.72"/>
      <rect x="29" y="14" width="8"  height="10" rx="2" fill={color} opacity="0.72"/>
      <rect x="3"  y="30" width="8"  height="10" rx="2" fill={color} opacity="0.72"/>
      <rect x="29" y="30" width="8"  height="10" rx="2" fill={color} opacity="0.72"/>
      <rect x="14" y="19" width="12" height="8"  rx="2" fill="white" opacity="0.28"/>
    </svg>
  );
}

// ─────────────────────────────────────────
// SPOT CARD
// ─────────────────────────────────────────
function SpotCard({ spot, isSelected, onClick, clickable }) {
  const meta = STATUS_META[spot.status] || STATUS_META.available;
  const canClick = clickable && (spot.status==="available"||spot.status==="preferential");
  return (
    <div className="spot-card" onClick={canClick?()=>onClick(spot):undefined} style={{ background:isSelected?meta.border:meta.bg, border:`2px solid ${meta.border}`, borderRadius:11, padding:"8px 6px 6px", display:"flex", flexDirection:"column", alignItems:"center", gap:2, cursor:canClick?"pointer":"default", transition:"all 0.18s ease", boxShadow:isSelected?`0 4px 16px ${meta.border}55`:C.shadow, transform:isSelected?"scale(1.06)":"scale(1)", minWidth:66, userSelect:"none" }}>
      <span style={{ fontSize:9, fontWeight:700, color:isSelected?"white":meta.text, letterSpacing:1, fontFamily:"Syne, sans-serif" }}>{spot.row}{spot.spotNumber}</span>
      <CarIcon size={26} color={isSelected?"white":meta.car}/>
      <span style={{ fontSize:8, fontWeight:600, color:isSelected?"rgba(255,255,255,0.85)":meta.text, letterSpacing:0.4, textTransform:"uppercase", fontFamily:"DM Sans, sans-serif" }}>{meta.label}</span>
    </div>
  );
}

// ─────────────────────────────────────────
// PARKING GRID — layout físico corrigido
// Rua principal no topo, via central vertical com rua separando os dois blocos
// Bloco superior: A (esq) e C (dir) | Bloco inferior: B (esq) e D (dir)
// ─────────────────────────────────────────
function ParkingGrid({ spots, selectedSpotId, onSpotClick, clickable=false }) {
  const roadH = (label) => (
    <div style={{ height:28, background:C.bgDark, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden", width:"100%", flexShrink:0 }}>
      <div style={{ position:"absolute", top:"50%", left:0, right:0, height:2, background:`repeating-linear-gradient(to right,${C.bgSoft} 0,${C.bgSoft} 14px,transparent 14px,transparent 28px)`, transform:"translateY(-50%)" }}/>
      <span style={{ fontSize:9, fontWeight:700, color:C.textLight, letterSpacing:2.5, textTransform:"uppercase", position:"relative", fontFamily:"DM Sans, sans-serif" }}>{label}</span>
    </div>
  );

  const RowSpots = ({ row }) => (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:4 }}>
        <span style={{ fontSize:9, fontWeight:700, color:C.borderMid, letterSpacing:1.5, fontFamily:"Syne, sans-serif" }}>{row}</span>
        <div style={{ flex:1, height:1, background:C.border }}/>
      </div>
      <div className="spot-grid-row" style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
        {spots.filter(s=>s.row===row).map(spot=>(
          <SpotCard key={spot._id} spot={spot} isSelected={selectedSpotId===spot._id} onClick={onSpotClick} clickable={clickable}/>
        ))}
      </div>
    </div>
  );

  const CentralRoad = () => (
    <div style={{ width:44, background:C.bgDark, borderRadius:7, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", position:"relative", flexShrink:0 }}>
      <div style={{ position:"absolute", left:"50%", top:0, bottom:0, width:2, background:`repeating-linear-gradient(to bottom,${C.bgSoft} 0,${C.bgSoft} 14px,transparent 14px,transparent 28px)`, transform:"translateX(-50%)"}}/>
      <span style={{ fontSize:8, fontWeight:700, color:C.textLight, letterSpacing:1.5, textTransform:"uppercase", fontFamily:"DM Sans, sans-serif", writingMode:"vertical-rl", position:"relative" }}>Via Central</span>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      {/* Legenda */}
      <div style={{ display:"flex", gap:14, marginBottom:10, flexWrap:"wrap" }}>
        {Object.entries(STATUS_META).map(([k,m])=>(
          <div key={k} style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:8, height:8, borderRadius:2, background:m.border }}/>
            <span style={{ fontSize:11, color:C.textMid, fontWeight:500, fontFamily:"DM Sans, sans-serif" }}>
              {k==="available"?"Disponível":k==="occupied"?"Ocupada":k==="preferential"?"Preferencial":"Reservada"}
            </span>
          </div>
        ))}
      </div>

      {/* Entrada */}
      {roadH("Rua Principal — Entrada")}

      {/* Bloco superior: A (esq) | via central | C (dir) */}
      <div style={{ display:"flex", gap:0, alignItems:"stretch" }}>
        <div style={{ flex:1, background:C.bgSoft, borderRadius:10, padding:"10px 10px 10px 10px", border:`1px solid ${C.border}` }}>
          <div style={{ fontSize:9, fontWeight:700, color:C.amberDark, letterSpacing:1.5, textTransform:"uppercase", fontFamily:"DM Sans, sans-serif", marginBottom:6, textAlign:"center" }}>← Avenida A</div>
          <RowSpots row="A"/>
        </div>
        <CentralRoad/>
        <div style={{ flex:1, background:C.bgSoft, borderRadius:10, padding:"10px 10px 10px 10px", border:`1px solid ${C.border}` }}>
          <div style={{ fontSize:9, fontWeight:700, color:C.navyMid, letterSpacing:1.5, textTransform:"uppercase", fontFamily:"DM Sans, sans-serif", marginBottom:6, textAlign:"center" }}>Avenida C →</div>
          <RowSpots row="C"/>
        </div>
      </div>

      {/* Rua separadora central — CORREÇÃO 1 */}
      {roadH("Rua Separadora")}

      {/* Bloco inferior: B (esq) | via central | D (dir) */}
      <div style={{ display:"flex", gap:0, alignItems:"stretch" }}>
        <div style={{ flex:1, background:C.bgSoft, borderRadius:10, padding:"10px 10px 10px 10px", border:`1px solid ${C.border}` }}>
          <div style={{ fontSize:9, fontWeight:700, color:C.amberDark, letterSpacing:1.5, textTransform:"uppercase", fontFamily:"DM Sans, sans-serif", marginBottom:6, textAlign:"center" }}>← Avenida B</div>
          <RowSpots row="B"/>
        </div>
        <CentralRoad/>
        <div style={{ flex:1, background:C.bgSoft, borderRadius:10, padding:"10px 10px 10px 10px", border:`1px solid ${C.border}` }}>
          <div style={{ fontSize:9, fontWeight:700, color:C.navyMid, letterSpacing:1.5, textTransform:"uppercase", fontFamily:"DM Sans, sans-serif", marginBottom:6, textAlign:"center" }}>Avenida D →</div>
          <RowSpots row="D"/>
        </div>
      </div>

      {/* Saída */}
      {roadH("Saída")}
    </div>
  );
}

// ─────────────────────────────────────────
// LOGIN / REGISTRO
// ─────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ nomeCompleto:"", username:"", cpf:"", endereco:"", telefone:"", email:"", password:"" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = k => e => {
    let v = e.target.value;
    if (k==="cpf")     v = fmtCPF(v);
    if (k==="telefone") v = fmtTel(v);
    setForm(p=>({...p,[k]:v})); setError("");
  };

  const handleSubmit = async () => {
    setLoading(true); setError("");
    try {
      let token, user;
      if (mode==="login") {
        ({token,user} = await apiLogin(form.email.trim(), form.password));
      } else {
        if (!form.nomeCompleto||!form.username||!form.cpf||!form.endereco||!form.email||!form.password) {
          setError("Preencha todos os campos obrigatórios."); setLoading(false); return;
        }
        ({token,user} = await apiRegister({ ...form, email:form.email.trim(), username:form.username.trim() }));
      }
      localStorage.setItem("omv_token", token);
      onLogin(user);
    } catch(err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:"100vh", width:"100%", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"DM Sans, sans-serif", padding:"24px 16px" }}>
      <style>{GOOGLE_FONTS+GLOBAL_CSS}</style>
      <div style={{ textAlign:"center", marginBottom:28 }}>
        <div style={{ fontFamily:"Syne, sans-serif", fontSize:22, fontWeight:800, color:C.navy, marginBottom:4 }}>◈ Estacionamento OMV</div>
        <p style={{ fontSize:13, color:C.textLight }}>Sistema Inteligente de Estacionamento</p>
      </div>
      <div className="login-card" style={{ background:C.bgCard, borderRadius:20, padding:"34px 30px", boxShadow:C.shadowLg, border:`1px solid ${C.border}`, width:"100%", maxWidth:440 }}>
        <h1 style={{ fontFamily:"Syne, sans-serif", fontSize:21, fontWeight:700, color:C.navy, marginBottom:4 }}>{mode==="login"?"Bem-vindo de volta":"Criar conta"}</h1>
        <p style={{ color:C.textLight, fontSize:13, marginBottom:22 }}>{mode==="login"?"Acesse para reservar e monitorar sua vaga.":"Preencha seus dados cadastrais."}</p>

        {mode==="register" && <>
          <Field label="Nome Completo" required><Input value={form.nomeCompleto} onChange={set("nomeCompleto")} placeholder="João da Silva"/></Field>
          <Field label="Nome de Usuário" required><Input value={form.username} onChange={set("username")} placeholder="joaosilva"/></Field>
          <div style={{ display:"flex", gap:10 }}>
            <div style={{ flex:1 }}><Field label="CPF" required><Input value={form.cpf} onChange={set("cpf")} placeholder="000.000.000-00"/></Field></div>
            <div style={{ flex:1 }}><Field label="Telefone"><Input value={form.telefone} onChange={set("telefone")} placeholder="(11) 99999-0000"/></Field></div>
          </div>
          <Field label="Endereço" required><Input value={form.endereco} onChange={set("endereco")} placeholder="Rua das Flores, 123 — São Paulo"/></Field>
        </>}

        <Field label="Email" required><Input value={form.email} onChange={set("email")} placeholder="seu@email.com" onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/></Field>
        <Field label="Senha" required><Input type="password" value={form.password} onChange={set("password")} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/></Field>
        <ErrBox msg={error}/>
        <Btn onClick={handleSubmit} disabled={loading} style={{ width:"100%", padding:"12px", fontSize:15, marginTop:2 }}>
          {loading?<Spinner color="white"/>:(mode==="login"?"Entrar":"Cadastrar")}
        </Btn>
        <p style={{ textAlign:"center", marginTop:16, fontSize:13, color:C.textLight }}>
          {mode==="login"?"Ainda não tem conta? ":"Já tem conta? "}
          <span onClick={()=>{setMode(mode==="login"?"register":"login");setError("");}} style={{ color:C.navy, fontWeight:600, cursor:"pointer", textDecoration:"underline", textUnderlineOffset:2 }}>
            {mode==="login"?"Cadastre-se":"Entrar"}
          </span>
        </p>
        {mode==="login" && (
          <div style={{ marginTop:18, background:C.navyLight, borderRadius:10, padding:"12px 14px" }}>
            <p style={{ fontSize:11, color:C.navyMid, fontWeight:700, marginBottom:3, letterSpacing:0.8, textTransform:"uppercase" }}>Acesso Administrador</p>
            <p style={{ fontSize:12, color:C.textMid, lineHeight:1.8 }}>
              Email: <strong style={{ color:C.navy }}>admin@omv.com</strong><br/>
              Senha: <strong style={{ color:C.navy }}>admin123</strong>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// TAB 1 — VISÃO GERAL
// ─────────────────────────────────────────
function OverviewTab({ spots }) {
  const avail = spots.filter(s=>s.status==="available").length;
  const occ   = spots.filter(s=>s.status==="occupied"||s.status==="reserved").length;
  const pref  = spots.filter(s=>s.status==="preferential").length;
  const Pill = ({label,value,color,bg})=>(
    <div className="stat-pill" style={{ background:bg, borderRadius:12, padding:"13px 18px", border:`1px solid ${color}30` }}>
      <div className="val" style={{ fontSize:26, fontFamily:"Syne, sans-serif", fontWeight:700, color, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:10, color, fontWeight:600, marginTop:3, letterSpacing:0.5, textTransform:"uppercase" }}>{label}</div>
    </div>
  );
  return (
    <div>
      <div className="stat-pills" style={{ display:"flex", gap:10, marginBottom:24, flexWrap:"wrap" }}>
        <Pill label="Livres"        value={avail}        color={C.green}   bg={C.greenBg}/>
        <Pill label="Ocupadas"      value={occ}          color={C.red}     bg={C.redBg}/>
        <Pill label="Preferenciais" value={pref}         color={C.amber}   bg={C.amberBg}/>
        <Pill label="Total"         value={spots.length} color={C.navyMid} bg={C.navyLight}/>
      </div>
      <ParkingGrid spots={spots} selectedSpotId={null} onSpotClick={()=>{}} clickable={false}/>
    </div>
  );
}

// ─────────────────────────────────────────
// TAB 2 — RESERVAS
// ─────────────────────────────────────────
function ReserveTab({ spots, activeReservation, onReserved, setActiveTab }) {
  const [sel, setSel] = useState(null);
  const [time, setTime] = useState("");
  const [placa, setPlaca] = useState("");
  const [modelo, setModelo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState(false);

  const handleConfirm = async () => {
    if (!time) { setError("Selecione um horário."); return; }
    setLoading(true); setError("");
    try {
      await apiCreateReservation(sel._id, time, placa.toUpperCase(), modelo);
      setFlash(true);
      setTimeout(()=>{ setFlash(false); onReserved(); setActiveTab("payment"); }, 1400);
    } catch(err){ setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="reserve-layout" style={{ display:"flex", gap:32, alignItems:"flex-start", flexWrap:"wrap" }}>
      <div style={{ flex:1, minWidth:280 }}>
        <ParkingGrid spots={spots} selectedSpotId={sel?._id}
          onSpotClick={spot=>{ if(!activeReservation){setSel(p=>p?._id===spot._id?null:spot);setError("");} }}
          clickable={!activeReservation}
        />
      </div>
      <div className="reserve-panel" style={{ width:285, flexShrink:0 }}>
        {activeReservation ? (
          <div style={{ background:C.purpleBg, borderRadius:16, padding:"22px", border:`2px solid ${C.purple}` }}>
            <p style={{ fontFamily:"Syne, sans-serif", fontWeight:700, fontSize:18, color:C.purpleDark, marginBottom:10 }}>Reserva Ativa</p>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
              <CarIcon color={C.purple} size={34}/>
              <div>
                <p style={{ fontSize:20, fontFamily:"Syne, sans-serif", fontWeight:700, color:C.purpleDark, margin:0 }}>Vaga {activeReservation.spotNumber}</p>
                <p style={{ fontSize:12, color:C.purple, margin:0 }}>Às {activeReservation.startTimeStr}</p>
                {activeReservation.placa && <p style={{ fontSize:12, color:C.purple, margin:0 }}>Placa: <strong>{activeReservation.placa}</strong></p>}
              </div>
            </div>
            <p style={{ fontSize:12.5, color:C.purple, lineHeight:1.6 }}>Acesse a aba <strong>Pagamento</strong> para monitorar e encerrar.</p>
          </div>
        ) : (
          <Card>
            {!sel ? (
              <>
                <p style={{ fontFamily:"Syne, sans-serif", fontWeight:700, fontSize:20, color:C.navy, marginBottom:10 }}>Reserve sua Vaga</p>
                <p style={{ fontSize:13, color:C.textLight, lineHeight:1.7 }}>Clique em uma vaga <span style={{ color:C.green, fontWeight:600 }}>verde</span> ou <span style={{ color:C.amber, fontWeight:600 }}>amarela</span> no mapa ao lado.</p>
                <div style={{ marginTop:14, background:C.bg, borderRadius:9, padding:"11px 13px" }}>
                  <p style={{ fontSize:12, color:C.textLight, lineHeight:1.8 }}><strong style={{ color:C.textMid }}>Valor:</strong> {fmtMoney(PRICE_PER_HOUR)} / hora</p>
                </div>
              </>
            ) : (
              <>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
                  <CarIcon color={C.navy} size={30}/>
                  <div>
                    <p style={{ fontSize:10, fontWeight:600, color:C.textLight, letterSpacing:0.8, textTransform:"uppercase", margin:0 }}>Selecionada</p>
                    <p style={{ fontSize:20, fontFamily:"Syne, sans-serif", fontWeight:700, color:C.navy, margin:0 }}>
                      {sel.row}{sel.spotNumber}
                      {sel.status==="preferential" && <span style={{ fontSize:9, color:C.amberDark, fontWeight:600, marginLeft:7, background:C.amberBg, padding:"2px 6px", borderRadius:4 }}>PREFERENCIAL</span>}
                    </p>
                  </div>
                </div>
                <p style={{ fontFamily:"Syne, sans-serif", fontWeight:700, fontSize:15, color:C.navy, marginBottom:13 }}>Confirmar Reserva?</p>
                <Field label="Horário *"><input type="time" value={time} onChange={e=>{setTime(e.target.value);setError("");}} style={{ width:"100%", padding:"10px 13px", borderRadius:9, border:`1.5px solid ${C.border}`, fontSize:14, fontFamily:"DM Sans, sans-serif", background:C.bgSoft, color:C.text, outline:"none" }}/></Field>
                <div style={{ display:"flex", gap:8 }}>
                  <div style={{ flex:1 }}><Field label="Placa"><Input value={placa} onChange={e=>setPlaca(e.target.value)} placeholder="ABC-1234"/></Field></div>
                  <div style={{ flex:1 }}><Field label="Modelo"><Input value={modelo} onChange={e=>setModelo(e.target.value)} placeholder="HB20"/></Field></div>
                </div>
                <ErrBox msg={error}/>
                <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                  <Btn onClick={handleConfirm} disabled={loading} style={{ width:"100%" }}>{loading?<Spinner color="white"/>:"Confirmar"}</Btn>
                  <Btn variant="ghost" onClick={()=>{setSel(null);setTime("");setError("");}} style={{ width:"100%" }}>Cancelar</Btn>
                </div>
              </>
            )}
            {flash && <div style={{ marginTop:12, background:C.greenBg, borderRadius:8, padding:"9px 13px", fontSize:13, color:C.greenDark, fontWeight:600 }}>✓ Reserva confirmada!</div>}
          </Card>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// TAB 3 — PAGAMENTO
// ─────────────────────────────────────────
function PaymentTab({ activeReservation, onPaid, currentUser }) {
  const [secs, setSecs]             = useState(0);
  const [running, setRunning]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [paid, setPaid]             = useState(false);
  const [finalPrice, setFinalPrice] = useState(null);
  const [finalTime, setFinalTime]   = useState(null);
  const [loading, setLoading]       = useState(false);
  const [history, setHistory]       = useState([]);
  const ivRef = useRef(null);

  useEffect(()=>{
    apiGetMyHistory().then(setHistory).catch(()=>{});
  }, [paid]);

  useEffect(()=>{
    if (!activeReservation) return;
    const start   = new Date(activeReservation.startTime);
    const elapsed = Math.max(0, Math.floor((new Date()-start)/1000));
    setSecs(elapsed);
    if (new Date()>=start) setRunning(true);
    setShowConfirm(false);
  }, [activeReservation?._id]);

  useEffect(()=>{
    clearInterval(ivRef.current);
    if (running && !showConfirm) ivRef.current = setInterval(()=>setSecs(s=>s+1),1000);
    return ()=>clearInterval(ivRef.current);
  }, [running, showConfirm]);

  const price = ((secs/3600)*PRICE_PER_HOUR).toFixed(2);

  const handleRequestPay = ()=>{ clearInterval(ivRef.current); setShowConfirm(true); };

  const handlePay = async ()=>{
    setLoading(true);
    try {
      const { totalPrice } = await apiPayReservation(activeReservation._id);
      setRunning(false); setPaid(true);
      setFinalPrice(totalPrice.toFixed(2)); setFinalTime(fmtTime(secs));
      setTimeout(()=>{ setPaid(false); setFinalPrice(null); setFinalTime(null); setSecs(0); setShowConfirm(false); onPaid(); }, 5000);
    } catch(err){ alert(err.message); }
    finally { setLoading(false); }
  };

  if (paid) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:320, textAlign:"center", gap:14 }}>
      <div style={{ width:60, height:60, borderRadius:"50%", background:C.greenBg, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <p style={{ fontFamily:"Syne, sans-serif", fontSize:24, fontWeight:700, color:C.green, margin:0 }}>Pagamento Confirmado!</p>
      <p style={{ fontSize:20, fontWeight:700, color:C.greenDark, fontFamily:"Syne, sans-serif" }}>{fmtMoney(finalPrice)}</p>
      <p style={{ color:C.textLight, fontSize:13 }}>Duração: {finalTime} — Obrigado por usar o Estacionamento OMV!</p>
    </div>
  );

  return (
    <div style={{ display:"flex", gap:36, flexWrap:"wrap", alignItems:"flex-start" }}>
      {/* Lado esquerdo: monitoramento ativo */}
      <div className="payment-layout" style={{ flex:"0 0 420px", display:"flex", flexDirection:"column", gap:16 }}>
        {!activeReservation ? (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:240, textAlign:"center", gap:12 }}>
            <CarIcon color={C.borderMid} size={44}/>
            <p style={{ fontFamily:"Syne, sans-serif", fontSize:18, fontWeight:600, color:C.textLight }}>Reserve uma Vaga e Pague Aqui</p>
            <p style={{ fontSize:13, color:C.textLight, maxWidth:280, lineHeight:1.7 }}>Faça uma reserva na aba <strong style={{ color:C.textMid }}>Reservas</strong> para monitorar e pagar.</p>
          </div>
        ) : (
          <>
            {/* Identificação */}
            <div style={{ display:"flex", alignItems:"center", gap:16, background:C.purpleBg, borderRadius:14, padding:"14px 22px", border:`1.5px solid ${C.purple}` }}>
              <CarIcon color={C.purple} size={38}/>
              <div>
                <p style={{ fontSize:10, fontWeight:600, color:C.purple, letterSpacing:1.2, textTransform:"uppercase", margin:0 }}>Sua Vaga</p>
                <p style={{ fontFamily:"Syne, sans-serif", fontSize:24, fontWeight:700, color:C.purpleDark, margin:0, lineHeight:1.1 }}>
                  {activeReservation.spot?.row}{activeReservation.spotNumber}
                </p>
                <p style={{ fontSize:12, color:C.purple, margin:0 }}>
                  Reservado às {activeReservation.startTimeStr}
                  {activeReservation.placa && ` • Placa: ${activeReservation.placa}`}
                  {activeReservation.modelo && ` • ${activeReservation.modelo}`}
                </p>
              </div>
            </div>

            {/* Cronômetro */}
            <div style={{ background:C.navy, borderRadius:16, padding:"18px 24px", textAlign:"center" }}>
              <p style={{ color:"#A89880", fontSize:10, fontWeight:600, letterSpacing:2, textTransform:"uppercase", marginBottom:6 }}>
                {running?(showConfirm?"Tempo da Reserva":"Tempo Decorrido"):"Aguardando Horário"}
              </p>
              <p className="timer-display" style={{ fontFamily:"Syne, sans-serif", fontSize:40, fontWeight:700, color:"#FBF5EE", letterSpacing:2, lineHeight:1, margin:0 }}>
                {fmtTime(secs)}
              </p>
              {!running && <p style={{ color:"#A89880", fontSize:11, marginTop:6 }}>O cronômetro inicia no horário da reserva.</p>}
            </div>

            {/* Ações */}
            {running && !showConfirm && (
              <Btn variant="amber" onClick={handleRequestPay} style={{ width:"100%", padding:"12px", fontSize:14 }}>
                Pagar a Reserva
              </Btn>
            )}
            {showConfirm && (
              <Card style={{ padding:"18px 20px" }}>
                <p style={{ fontFamily:"Syne, sans-serif", fontSize:15, fontWeight:700, color:C.navy, marginBottom:12 }}>Resumo da Reserva</p>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ fontSize:13, color:C.textMid }}>Duração</span>
                  <span style={{ fontSize:13, fontWeight:600, color:C.navy }}>{fmtTime(secs)}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderTop:`1px solid ${C.border}`, marginBottom:14 }}>
                  <span style={{ fontSize:14, fontWeight:700, color:C.navy }}>Total</span>
                  <span style={{ fontSize:18, fontWeight:700, color:C.green, fontFamily:"Syne, sans-serif" }}>{fmtMoney(price)}</span>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <Btn variant="success" onClick={handlePay} disabled={loading} style={{ flex:1 }}>{loading?<Spinner color="white"/>:"Confirmar Pagamento"}</Btn>
                  <Btn variant="ghost" onClick={()=>{setShowConfirm(false);setRunning(true);}} style={{ flex:1 }}>Voltar</Btn>
                </div>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Lado direito: histórico do cliente */}
      <div style={{ flex:1, minWidth:240 }}>
        <SectionTitle>Seu Histórico</SectionTitle>
        {history.length===0 ? (
          <p style={{ fontSize:13, color:C.textLight }}>Nenhuma reserva paga ainda.</p>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {history.map(r=>(
              <div key={r._id} style={{ background:C.bgCard, borderRadius:11, padding:"12px 16px", border:`1px solid ${C.border}`, boxShadow:C.shadow }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                  <span style={{ fontFamily:"Syne, sans-serif", fontSize:15, fontWeight:700, color:C.navy }}>Vaga {r.spotNumber}</span>
                  <Badge color={C.greenDark} bg={C.greenBg}>{fmtMoney(r.totalPrice)}</Badge>
                </div>
                <p style={{ fontSize:11, color:C.textLight, margin:0 }}>
                  {fmtDate(r.createdAt)} • {fmtTime(r.totalSeconds||0)}
                  {r.placa && ` • ${r.placa}`}
                </p>
              </div>
            ))}
            <div style={{ background:C.navyLight, borderRadius:10, padding:"10px 14px", marginTop:4 }}>
              <p style={{ fontSize:12, color:C.navyMid, fontWeight:600 }}>
                Total gasto: <strong style={{ fontFamily:"Syne, sans-serif" }}>{fmtMoney(history.reduce((a,r)=>a+(r.totalPrice||0),0))}</strong>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// MODAL DETALHES USUÁRIO
// ─────────────────────────────────────────
function UserModal({ user, onClose, onToggle }) {
  if (!user) return null;
  const cpfFmt = user.cpf ? user.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,"$1.$2.$3-$4") : "—";
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(42,31,20,0.5)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={onClose}>
      <div className="fade-in" style={{ background:C.bgCard, borderRadius:20, padding:"28px", maxWidth:400, width:"100%", boxShadow:C.shadowLg }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
          <div style={{ width:46, height:46, borderRadius:"50%", background:C.navy, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, fontWeight:700, color:"#FBF5EE", fontFamily:"Syne, sans-serif", flexShrink:0 }}>
            {(user.nomeCompleto?.[0]||user.email[0]).toUpperCase()}
          </div>
          <div>
            <p style={{ fontSize:16, fontWeight:700, color:C.navy, margin:0, fontFamily:"Syne, sans-serif" }}>{user.nomeCompleto||"—"}</p>
            <p style={{ fontSize:12, color:C.textLight, margin:0 }}>@{user.username||"—"} • {user.isAdmin?"Administrador":"Usuário"}</p>
          </div>
        </div>
        {[
          ["Email",     user.email],
          ["CPF",       cpfFmt],
          ["Endereço",  user.endereco||"—"],
          ["Telefone",  user.telefone||"—"],
          ["Reservas",  user.totalReservas||0],
          ["Total Gasto", fmtMoney(user.totalGasto||0)],
          ["Cadastro",  new Date(user.createdAt).toLocaleDateString("pt-BR")],
          ["Status",    user.ativo?"Ativo":"Desativado"],
        ].map(([k,v])=>(
          <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
            <span style={{ fontSize:12, color:C.textLight }}>{k}</span>
            <span style={{ fontSize:13, fontWeight:600, color:k==="Status"?(user.ativo?C.green:C.red):C.navy, textAlign:"right", maxWidth:"65%" }}>{v}</span>
          </div>
        ))}
        <div style={{ display:"flex", gap:9, marginTop:18 }}>
          {!user.isAdmin && onToggle && (
            <Btn variant={user.ativo?"danger":"success"} small onClick={()=>onToggle(user._id)} style={{ flex:1 }}>
              {user.ativo?"Desativar conta":"Reativar conta"}
            </Btn>
          )}
          <Btn variant="ghost" onClick={onClose} style={{ flex:1 }}>Fechar</Btn>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// TAB 4 — ADMIN
// ─────────────────────────────────────────
function AdminTab() {
  const [view, setView]           = useState("dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [logs, setLogs]           = useState([]);
  const [reservations, setRes]    = useState([]);
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(false);
  const [selUser, setSelUser]     = useState(null);
  const [search, setSearch]       = useState("");

  const load = async (v) => {
    setLoading(true);
    try {
      if (v==="dashboard") setDashboard(await apiAdminDashboard());
      if (v==="logs")         setLogs(await apiAdminLogs());
      if (v==="reservations") setRes(await apiAdminReservations());
      if (v==="users")        setUsers(await apiAdminUsers());
    } catch {}
    setLoading(false);
  };

  useEffect(()=>{ load(view); }, [view]);

  const handleToggle = async (uid) => {
    await apiToggleUser(uid);
    const updated = await apiAdminUsers();
    setUsers(updated);
    if (selUser) setSelUser(updated.find(u=>u._id===selUser._id)||null);
  };

  const handleCancelRes = async (rid) => {
    if (!window.confirm("Cancelar esta reserva?")) return;
    await apiAdminCancelRes(rid);
    load("reservations");
  };

  const tabList = [["dashboard","Dashboard"],["reservations","Reservas"],["users","Usuários"],["logs","Logs"]];
  const rowStyle = { background:C.bgCard, borderRadius:11, padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:7, boxShadow:C.shadow, border:`1px solid ${C.border}` };

  const filteredUsers = users.filter(u =>
    !search || u.email.includes(search.toLowerCase()) || (u.nomeCompleto||"").toLowerCase().includes(search.toLowerCase()) || (u.username||"").toLowerCase().includes(search.toLowerCase())
  );
  const filteredRes = reservations.filter(r =>
    !search || (r.user?.email||"").includes(search.toLowerCase()) || (r.user?.nomeCompleto||"").toLowerCase().includes(search.toLowerCase()) || String(r.spotNumber).includes(search)
  );

  return (
    <div>
      <UserModal user={selUser} onClose={()=>setSelUser(null)} onToggle={handleToggle}/>

      <div className="admin-inner-tabs" style={{ display:"flex", gap:7, marginBottom:22, flexWrap:"wrap" }}>
        {tabList.map(([v,l])=>(
          <button key={v} onClick={()=>{setView(v);setSearch("");}} style={{ padding:"8px 18px", borderRadius:9, background:view===v?C.navy:C.border, color:view===v?"#FBF5EE":C.textMid, border:"none", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"DM Sans, sans-serif" }}>{l}</button>
        ))}
      </div>

      {/* Barra de busca */}
      {(view==="users"||view==="reservations") && (
        <div style={{ marginBottom:16 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={view==="users"?"Buscar por nome, email ou usuário...":"Buscar por nome, email ou vaga..."} style={{ width:"100%", maxWidth:360, padding:"9px 13px", borderRadius:9, border:`1.5px solid ${C.border}`, fontSize:13, fontFamily:"DM Sans, sans-serif", background:C.bgSoft, color:C.text, outline:"none" }}/>
        </div>
      )}

      {loading && <div style={{ display:"flex", justifyContent:"center", padding:"32px 0" }}><Spinner/></div>}

      {/* DASHBOARD */}
      {!loading && view==="dashboard" && dashboard && (
        <div>
          <div className="dash-grid" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:28 }}>
            {[
              { label:"Usuários",        value:dashboard.totalUsers,           color:C.navy,   bg:C.navyLight },
              { label:"Total Reservas",  value:dashboard.totalReservations,    color:C.purple, bg:C.purpleBg  },
              { label:"Reservas Pagas",  value:dashboard.paidReservations,     color:C.green,  bg:C.greenBg   },
              { label:"Receita Total",   value:fmtMoney(dashboard.totalRevenue), color:C.green, bg:C.greenBg  },
              { label:"Vagas Livres",    value:dashboard.spotsAvailable,       color:C.green,  bg:C.greenBg   },
              { label:"Vagas Ocupadas",  value:dashboard.spotsOccupied,        color:C.red,    bg:C.redBg     },
              { label:"Preferenciais",   value:dashboard.spotsPreferential,    color:C.amber,  bg:C.amberBg   },
              { label:"Reservas Ativas", value:dashboard.activeReservations,   color:C.purple, bg:C.purpleBg  },
            ].map(p=>(
              <div key={p.label} style={{ background:p.bg, borderRadius:12, padding:"13px 16px", border:`1px solid ${p.color}30` }}>
                <div style={{ fontSize:22, fontFamily:"Syne, sans-serif", fontWeight:700, color:p.color, lineHeight:1 }}>{p.value}</div>
                <div style={{ fontSize:10, color:p.color, fontWeight:600, marginTop:3, letterSpacing:0.5, textTransform:"uppercase" }}>{p.label}</div>
              </div>
            ))}
          </div>

          {dashboard.revenueWeek?.length > 0 && (
            <Card style={{ padding:"18px 20px" }}>
              <SectionTitle>Receita — Últimos 7 dias</SectionTitle>
              <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                {dashboard.revenueWeek.map(d=>(
                  <div key={d._id} style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <span style={{ fontSize:12, color:C.textMid, minWidth:42 }}>{d._id}</span>
                    <div style={{ flex:1, height:8, background:C.border, borderRadius:4, overflow:"hidden" }}>
                      <div style={{ height:"100%", background:C.green, borderRadius:4, width:`${Math.min(100,(d.total/500)*100)}%` }}/>
                    </div>
                    <span style={{ fontSize:12, fontWeight:600, color:C.green, minWidth:70, textAlign:"right" }}>{fmtMoney(d.total)}</span>
                    <span style={{ fontSize:11, color:C.textLight, minWidth:32, textAlign:"right" }}>{d.count}x</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* RESERVAS */}
      {!loading && view==="reservations" && (
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          {filteredRes.length===0 && <p style={{ color:C.textLight, fontSize:13 }}>Nenhuma reserva encontrada.</p>}
          {filteredRes.map(r=>(
            <div key={r._id} style={rowStyle}>
              <div style={{ display:"flex", alignItems:"center", gap:9, flexWrap:"wrap" }}>
                <button onClick={()=>setSelUser(r.user)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:13, fontWeight:600, color:C.navy, fontFamily:"DM Sans, sans-serif", textDecoration:"underline", textUnderlineOffset:2 }}>
                  {r.user?.nomeCompleto||r.user?.email}
                </button>
                <Badge color={C.purple} bg={C.purpleBg}>Vaga {r.spotNumber}</Badge>
                <span style={{ fontSize:12, color:C.textMid }}>às {r.startTimeStr}</span>
                {r.placa  && <Badge color={C.navyMid} bg={C.navyLight}>{r.placa}</Badge>}
                {r.modelo && <span style={{ fontSize:11, color:C.textLight }}>{r.modelo}</span>}
                {r.status==="paid"
                  ? <Badge color={C.greenDark} bg={C.greenBg}>Pago {fmtMoney(r.totalPrice)}</Badge>
                  : r.status==="cancelled"
                    ? <Badge color={C.red} bg={C.redBg}>Cancelada</Badge>
                    : <Badge color={C.amberDark} bg={C.amberBg}>Em uso</Badge>
                }
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:11, color:C.textLight }}>{fmtDate(r.createdAt)}</span>
                {r.status==="active" && (
                  <Btn variant="danger" small onClick={()=>handleCancelRes(r._id)}>Cancelar</Btn>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* USUÁRIOS */}
      {!loading && view==="users" && (
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          {filteredUsers.map(u=>(
            <div key={u._id} style={{ ...rowStyle, cursor:"pointer" }} onClick={()=>setSelUser(u)}>
              <div style={{ display:"flex", alignItems:"center", gap:11 }}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:u.isAdmin?C.navy:u.ativo?C.border:C.redBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:u.isAdmin?"#FBF5EE":u.ativo?C.textMid:C.red, fontFamily:"Syne, sans-serif", flexShrink:0 }}>
                  {(u.nomeCompleto?.[0]||u.email[0]).toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize:13, fontWeight:600, color:C.navy, margin:0 }}>{u.nomeCompleto||u.email} {u.username&&<span style={{ fontSize:11, color:C.textLight }}>@{u.username}</span>}</p>
                  <p style={{ fontSize:11, color:C.textLight, margin:0 }}>{u.email} • {u.totalReservas||0} reservas • {fmtMoney(u.totalGasto||0)}</p>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                {u.isAdmin && <Badge color={C.navyMid} bg={C.navyLight}>Admin</Badge>}
                {!u.ativo  && <Badge color={C.red} bg={C.redBg}>Desativado</Badge>}
                <span style={{ fontSize:11, color:C.textLight }}>{new Date(u.createdAt).toLocaleDateString("pt-BR")}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LOGS */}
      {!loading && view==="logs" && (
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {logs.length===0 && <p style={{ color:C.textLight, fontSize:13 }}>Nenhum log registrado.</p>}
          {logs.map(log=>(
            <div key={log._id} style={rowStyle}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:28, height:28, borderRadius:"50%", background:C.navyLight, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:C.navy, fontFamily:"Syne, sans-serif", flexShrink:0 }}>
                  {log.email[0].toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize:13, fontWeight:600, color:C.navy, margin:0 }}>{log.email}</p>
                  <p style={{ fontSize:12, color:C.textMid, margin:0 }}>{log.action}</p>
                </div>
              </div>
              <span style={{ fontSize:11, color:C.textLight }}>{fmtDate(log.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────
export default function App() {
  const [currentUser, setCurrentUser]             = useState(null);
  const [spots, setSpots]                         = useState([]);
  const [activeReservation, setActiveReservation] = useState(null);
  const [activeTab, setActiveTab]                 = useState("overview");
  const [appLoading, setAppLoading]               = useState(true);

  useEffect(()=>{
    const token = getToken();
    if (!token){ setAppLoading(false); return; }
    apiGetMe()
      .then(({user})=>setCurrentUser(user))
      .catch(()=>localStorage.removeItem("omv_token"))
      .finally(()=>setAppLoading(false));
  },[]);

  useEffect(()=>{
    if (!currentUser) return;
    loadSpots(); loadReservation();
    const iv = setInterval(loadSpots, 5000);
    return ()=>clearInterval(iv);
  },[currentUser]);

  const loadSpots       = async()=>{ try{ setSpots(await apiGetSpots()); }catch{} };
  const loadReservation = async()=>{ try{ setActiveReservation(await apiGetMyReservation()); }catch{} };
  const handleLogin     = user => setCurrentUser(user);
  const handleLogout    = ()=>{ localStorage.removeItem("omv_token"); setCurrentUser(null); setSpots([]); setActiveReservation(null); setActiveTab("overview"); };
  const handleReserved  = ()=>{ loadSpots(); loadReservation(); };
  const handlePaid      = ()=>{ loadSpots(); setActiveReservation(null); };

  if (appLoading) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{GOOGLE_FONTS+GLOBAL_CSS}</style>
      <div style={{ textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
        <Spinner size={26}/><p style={{ fontFamily:"Syne, sans-serif", fontSize:14, color:C.textLight }}>Carregando...</p>
      </div>
    </div>
  );

  if (!currentUser) return <LoginScreen onLogin={handleLogin}/>;

  const navTabs = [
    { id:"overview", label:"Visão Geral" },
    { id:"reserve",  label:"Reservas"    },
    { id:"payment",  label:"Pagamento"   },
    ...(currentUser.isAdmin?[{ id:"admin", label:"Admin" }]:[]),
  ];

  const TAB_TITLES = {
    overview:"Visão Geral do Estacionamento",
    reserve: "Reservar uma Vaga",
    payment: "Pagamento e Monitoramento",
    admin:   "Painel Administrativo",
  };

  return (
    <div style={{ minHeight:"100vh", width:"100%", background:C.bg, fontFamily:"DM Sans, sans-serif" }}>
      <style>{GOOGLE_FONTS+GLOBAL_CSS}</style>
      <header style={{ background:C.bgCard, borderBottom:`1px solid ${C.border}`, position:"sticky", top:0, zIndex:100, width:"100%" }}>
        <div className="header-inner" style={{ width:"100%", padding:"0 48px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 }}>
          <div className="header-logo" style={{ fontFamily:"Syne, sans-serif", fontSize:15, fontWeight:800, color:C.navy, whiteSpace:"nowrap" }}>◈ Estacionamento OMV</div>
          <nav className="header-nav" style={{ display:"flex", gap:3 }}>
            {navTabs.map(t=>(
              <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{ padding:"7px 15px", borderRadius:8, border:"none", background:activeTab===t.id?C.navy:"transparent", color:activeTab===t.id?"#FBF5EE":C.textMid, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"DM Sans, sans-serif", transition:"all 0.15s", whiteSpace:"nowrap" }}>{t.label}</button>
            ))}
          </nav>
          <div className="header-user" style={{ display:"flex", alignItems:"center", gap:11, flexShrink:0 }}>
            <div style={{ textAlign:"right" }}>
              <p style={{ fontSize:12, fontWeight:600, color:C.navy, margin:0 }}>{currentUser.nomeCompleto||currentUser.email}</p>
              <p style={{ fontSize:10, color:C.textLight, margin:0 }}>{currentUser.isAdmin?"Administrador":currentUser.email}</p>
            </div>
            <button onClick={handleLogout} style={{ padding:"6px 13px", borderRadius:8, background:C.bgDark, color:C.textMid, border:`1px solid ${C.border}`, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"DM Sans, sans-serif" }}>Sair</button>
          </div>
        </div>
      </header>
      <main className="main-content" style={{ width:"100%", padding:"34px 48px" }}>
        <h1 className="page-title" style={{ fontFamily:"Syne, sans-serif", fontSize:26, fontWeight:700, color:C.navy, marginBottom:24 }}>{TAB_TITLES[activeTab]}</h1>
        {activeTab==="overview" && <OverviewTab spots={spots}/>}
        {activeTab==="reserve"  && <ReserveTab spots={spots} activeReservation={activeReservation} onReserved={handleReserved} setActiveTab={setActiveTab}/>}
        {activeTab==="payment"  && <PaymentTab activeReservation={activeReservation} onPaid={handlePaid} currentUser={currentUser}/>}
        {activeTab==="admin" && currentUser.isAdmin && <AdminTab/>}
      </main>
    </div>
  );
}
