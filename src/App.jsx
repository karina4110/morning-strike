import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
  Calendar as CalendarIcon,
  Settings as SettingsIcon,
  CheckCircle2,
  Flame,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Trophy,
  Share2,
  Clock,
  Target,
  TrendingUp
} from 'lucide-react';

// ─── translations ────────────────────────────────────────────────────────────
const translations = {
  en: {
    today: "Today", calendar: "Calendar", settings: "Settings", challenge: "Challenge",
    todaysGoal: "Today's Goal", checkedIn: "Checked In ✓", awake: "I'm Awake ☀️",
    daysStreak: "days", consistency: "Consistency is Key",
    routine: "Morning Routine", current: "Current", best: "Best",
    badges: "Badges Earned", dismiss: "See My Progress →",
    streak3: "3 Day Streak", streak7: "7 Day Streak", mastery14: "14 Day Mastery",
    keptItUp: "You've kept it up for", morningsThisMonth: "mornings this month.",
    yourChallenge: "Your Challenge", currentTarget: "Current", ultimateGoal: "Goal",
    shiftMessage: "Morning Streak shifts your target 10 minutes earlier each successful day.",
    reminders: "Gentle Reminders", nudge: "Morning nudge",
    nudgeDesc: "A soft reminder near your current target time.",
    streakRules: "Streak Rules", compassionate: "Compassionate mode",
    compDesc: "Streaks never fully reset. Missing a day pauses, not breaks.",
    saveBtn: "Save My Challenge", saved: "Saved ✓", language: "Language",
    // Challenge screen
    challengeTitle: "My Challenge",
    stepsCompleted: "steps completed",
    stepsRemaining: "steps remaining",
    tomorrowTarget: "Tomorrow's Target",
    wakeEarlier: "Wake 10 minutes earlier than today",
    motto: '"Each morning counts. You\'re getting there."',
    daysActive: "Days Active", timeShifted: "Time Shifted", streakLabel: "Streak",
    goalReached: "🎉 Goal Reached!",
    goalReachedDesc: "You've reached your target wake time!",
    months: ["January","February","March","April","May","June","July","August","September","October","November","December"],
    daysShort: ["S","M","T","W","T","F","S"]
  },
  ko: {
    today: "오늘", calendar: "캘린더", settings: "설정", challenge: "챌린지",
    todaysGoal: "오늘의 목표", checkedIn: "체크인 완료 ✓", awake: "일어났어요 ☀️",
    daysStreak: "일 연속", consistency: "꾸준함이 핵심입니다",
    routine: "모닝 루틴", current: "현재", best: "최고",
    badges: "획득한 배지", dismiss: "진행상황 보기 →",
    streak3: "3일 스트릭", streak7: "7일 스트릭", mastery14: "14일 마스터",
    keptItUp: "이번 달에 총", morningsThisMonth: "번의 아침을 지켜냈어요.",
    yourChallenge: "나의 챌린지", currentTarget: "현재 목표", ultimateGoal: "최종 목표",
    shiftMessage: "성공할 때마다 목표 기상 시간이 10분씩 자동으로 앞당겨집니다.",
    reminders: "알림 설정", nudge: "기상 넛지",
    nudgeDesc: "목표 시간 즈음에 부드러운 알림을 보냅니다.",
    streakRules: "스트릭 규칙", compassionate: "컴패셔네이트 모드",
    compDesc: "스트릭이 완전히 초기화되지 않습니다. 하루를 놓쳐도 끊기지 않고 멈춥니다.",
    saveBtn: "나의 챌린지 저장하기", saved: "저장됨 ✓", language: "언어 설정",
    challengeTitle: "나의 챌린지",
    stepsCompleted: "단계 완료",
    stepsRemaining: "단계 남음",
    tomorrowTarget: "내일의 목표",
    wakeEarlier: "오늘보다 10분 일찍 일어나기",
    motto: '"매일 아침이 쌓입니다. 잘 하고 있어요."',
    daysActive: "활성 일수", timeShifted: "앞당긴 시간", streakLabel: "스트릭",
    goalReached: "🎉 목표 달성!",
    goalReachedDesc: "목표 기상 시간에 도달했습니다!",
    months: ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"],
    daysShort: ["일","월","화","수","목","금","토"]
  }
};

// ─── constants & helpers ─────────────────────────────────────────────────────
const STORAGE_KEY = 'morning_streak_data_v2';
const SHIFT_MINUTES = 10;
const MINUTES_PER_DAY = 24 * 60;
const SUPPORTED_LANGUAGES = ['en', 'ko'];

function getDefaultAppState() {
  return {
    streak: 5, bestStreak: 14,
    checkedDays: ['2023-10-02','2023-10-03','2023-10-04','2023-10-05'],
    currentTargetTime: 480,   // 8:00 AM
    ultimateGoalTime: 420,    // 7:00 AM
    startingWakeTime: 660,    // 11:00 AM — initial baseline for challenge timeline
    nudgeEnabled: true,
    compassionateMode: true,  // always true, locked
    lastShiftDate: null,
    language: 'en'
  };
}

function coerceLanguage(lang) { return lang === 'ko' ? 'ko' : 'en'; }

function clampMinutes(raw, fallback) {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return fallback;
  return Math.max(0, Math.min(MINUTES_PER_DAY - 1, Math.round(raw)));
}

function normalizePersistedState(raw) {
  const d = getDefaultAppState();
  if (!raw || typeof raw !== 'object') return d;
  return {
    ...d, ...raw,
    streak: typeof raw.streak === 'number' ? Math.max(0, Math.floor(raw.streak)) : d.streak,
    bestStreak: typeof raw.bestStreak === 'number' ? Math.max(0, Math.floor(raw.bestStreak)) : d.bestStreak,
    checkedDays: Array.isArray(raw.checkedDays) ? raw.checkedDays.filter(x => typeof x === 'string') : d.checkedDays,
    currentTargetTime: clampMinutes(raw.currentTargetTime, d.currentTargetTime),
    ultimateGoalTime: clampMinutes(raw.ultimateGoalTime, d.ultimateGoalTime),
    startingWakeTime: clampMinutes(raw.startingWakeTime, d.startingWakeTime),
    nudgeEnabled: typeof raw.nudgeEnabled === 'boolean' ? raw.nudgeEnabled : d.nudgeEnabled,
    compassionateMode: true, // 🔒 always locked ON
    lastShiftDate: typeof raw.lastShiftDate === 'string' ? raw.lastShiftDate : null,
    language: SUPPORTED_LANGUAGES.includes(raw.language) ? raw.language : 'en'
  };
}

function loadPersistedState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return normalizePersistedState(JSON.parse(saved));
  } catch { /* ignore */ }
  return getDefaultAppState();
}

function formatTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${ampm}`;
}

function toLocalDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
function getTodayKey() { return toLocalDateKey(new Date()); }
function getYesterdayKey() { const d = new Date(); d.setDate(d.getDate()-1); return toLocalDateKey(d); }

function formatMonthHeading(t, lang, year, monthIndex) {
  return lang === 'ko' ? `${year}년 ${t.months[monthIndex]}` : `${t.months[monthIndex]} ${year}`;
}

function computeCheckInPatch(prev, todayKey, yesterdayKey) {
  if (prev.checkedDays.includes(todayKey)) return null;
  const lastCheckIn = prev.checkedDays.at(-1);
  let streak = prev.streak + 1;
  // compassionate mode is always on — streak never resets fully
  if (lastCheckIn !== yesterdayKey && !prev.compassionateMode) streak = 1;
  const checkedDays = [...prev.checkedDays, todayKey];
  const bestStreak = Math.max(streak, prev.bestStreak);
  const currentTargetTime = prev.currentTargetTime > prev.ultimateGoalTime
    ? Math.max(prev.ultimateGoalTime, prev.currentTargetTime - SHIFT_MINUTES)
    : prev.currentTargetTime;
  return { checkedDays, streak, bestStreak, currentTargetTime, lastShiftDate: todayKey };
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState('today');
  const [showCelebration, setShowCelebration] = useState(false);
  const [state, setState] = useState(loadPersistedState);
  const [vh, setVh] = useState(window.innerHeight);

  useEffect(() => {
    const updateVh = () => setVh(window.innerHeight);
    window.addEventListener('resize', updateVh);
    updateVh();
    return () => window.removeEventListener('resize', updateVh);
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state]);

  const lang = coerceLanguage(state.language);
  const t = useMemo(() => translations[lang], [lang]);
  const isCheckedToday = useMemo(() => state.checkedDays.includes(getTodayKey()), [state.checkedDays]);

  const handleCheckIn = useCallback(() => {
    const patch = computeCheckInPatch(state, getTodayKey(), getYesterdayKey());
    if (!patch) return;
    setState(prev => ({ ...prev, ...patch }));
    setShowCelebration(true);
  }, [state]);

  const updateSettings = useCallback((patch) => {
    setState(prev => {
      const delta = typeof patch === 'function' ? patch(prev) : patch;
      if (!delta || typeof delta !== 'object') return prev;
      const next = { ...prev, ...delta };
      next.compassionateMode = true; // 🔒 always locked
      if ('currentTargetTime' in delta) next.currentTargetTime = clampMinutes(delta.currentTargetTime, prev.currentTargetTime);
      if ('ultimateGoalTime' in delta) next.ultimateGoalTime = clampMinutes(delta.ultimateGoalTime, prev.ultimateGoalTime);
      if ('language' in delta) next.language = coerceLanguage(delta.language);
      return next;
    });
  }, []);

  const closeCelebration = useCallback(() => {
    setShowCelebration(false);
    setActiveTab('challenge'); // → Screen 4 후 이동
  }, []);

  const renderMain = () => {
    if (showCelebration) return <CelebrationView t={t} lang={lang} streak={state.streak} best={state.bestStreak} checkedDays={state.checkedDays} onClose={closeCelebration} />;
    if (activeTab === 'calendar') return <CalendarView t={t} lang={lang} checkedDays={state.checkedDays} streak={state.streak} bestStreak={state.bestStreak} />;
    if (activeTab === 'challenge') return <ChallengeView t={t} state={state} />;
    if (activeTab === 'settings') return <SettingsView t={t} state={state} updateSettings={updateSettings} />;
    return <HomeView t={t} currentTargetTime={state.currentTargetTime} streak={state.streak} onCheckIn={handleCheckIn} isCheckedToday={isCheckedToday} />;
  };

  const NAV_H = 65;
  const CONTENT_H = vh - (showCelebration ? 0 : NAV_H);

  return (
    <div style={{width:'100%', background:'#0F172A', display:'flex', justifyContent:'center'}}>
      <div style={{
        width:'100%', maxWidth:'430px',
        background:'#1A1A2E', color:'white',
        position:'relative'
      }}>
        {/* 콘텐츠 — JS로 측정한 실제 높이 사용 */}
        <div style={{
          height: CONTENT_H,
          overflowY:'auto',
          overflowX:'hidden',
          WebkitOverflowScrolling:'touch'
        }}>
          {renderMain()}
        </div>

        {/* nav — JS 높이 기준으로 정확히 배치 */}
        {!showCelebration && (
          <nav style={{
            height: NAV_H,
            background:'#1A1A2E',
            borderTop:'1px solid rgba(255,255,255,0.08)',
            display:'flex',
            justifyContent:'space-around',
            alignItems:'center',
            padding:'0 8px',
            width:'100%',
            boxSizing:'border-box'
          }}>
            <NavBtn label={t.today} icon={<CheckCircle2 size={22}/>} active={activeTab==='today'} onClick={() => setActiveTab('today')}/>
            <NavBtn label={t.calendar} icon={<CalendarIcon size={22}/>} active={activeTab==='calendar'} onClick={() => setActiveTab('calendar')}/>
            <NavBtn label={t.challenge} icon={<TrendingUp size={22}/>} active={activeTab==='challenge'} onClick={() => setActiveTab('challenge')}/>
            <NavBtn label={t.settings} icon={<SettingsIcon size={22}/>} active={activeTab==='settings'} onClick={() => setActiveTab('settings')}/>
          </nav>
        )}
      </div>
    </div>
  );
}

// ─── NavBtn ──────────────────────────────────────────────────────────────────
const NavBtn = memo(function NavBtn({ label, icon, active, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-[#3A7BD5] scale-110' : 'text-gray-500 hover:text-gray-400'}`}>
      {icon}
      <span className="text-[9px] font-bold tracking-tight">{label}</span>
    </button>
  );
});

// ─── HomeView ────────────────────────────────────────────────────────────────
const HomeView = memo(function HomeView({ t, currentTargetTime, streak, onCheckIn, isCheckedToday }) {
  return (
    <div className="px-8 pt-16 pb-8 flex flex-col items-center animate-in fade-in duration-700">
      <h2 className="text-xl font-bold mb-14 text-white/90 tracking-tight">
        {t.todaysGoal}: <span className="text-[#98C1FF]">{formatTime(currentTargetTime)}</span>
      </h2>
      <div className="relative mb-14">
        {!isCheckedToday && (
          <div className="absolute inset-0 bg-[#3A7BD5] rounded-full blur-[40px] opacity-20 animate-pulse"/>
        )}
        <button type="button" onClick={onCheckIn} disabled={isCheckedToday}
          className={`w-52 h-52 rounded-full flex flex-col items-center justify-center gap-2 transition-all duration-500 z-10 relative
            ${isCheckedToday
              ? 'bg-gray-800/50 border border-white/10 opacity-60 cursor-not-allowed'
              : 'bg-gradient-to-br from-[#98C1FF] to-[#3A7BD5] hover:scale-105 active:scale-95 shadow-[0_20px_50px_rgba(58,123,213,0.4)]'}`}>
          <span className={`${isCheckedToday ? 'text-white/40' : 'text-[#1A1A2E]'} font-black text-xl tracking-tight`}>
            {isCheckedToday ? t.checkedIn : t.awake}
          </span>
        </button>
      </div>
      <div className="flex items-center gap-3 mb-14 bg-white/5 px-6 py-3 rounded-full border border-white/5">
        <Flame className="text-[#F5A623]" size={32} fill="#F5A623"/>
        <span className="text-3xl font-black italic">
          {streak} <span className="text-lg not-italic font-bold text-white/60 ml-1">{t.daysStreak}</span>
        </span>
      </div>
      <div className="w-full rounded-[32px] overflow-hidden shadow-2xl aspect-[4/3] relative border border-white/10">
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A2E] via-transparent to-transparent z-10 opacity-80"/>
        <img src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=600"
          alt="Sunrise" className="w-full h-full object-cover"/>
        <p className="absolute bottom-6 left-0 right-0 text-center z-20 text-white/60 uppercase tracking-[0.3em] text-[10px] font-black">
          {t.consistency}
        </p>
      </div>
    </div>
  );
});

// ─── CelebrationView ─────────────────────────────────────────────────────────
const CelebrationView = memo(function CelebrationView({ t, lang, streak, best, checkedDays, onClose }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayKey = getTodayKey();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const checkedSet = useMemo(() => new Set(checkedDays), [checkedDays]);
  const heading = useMemo(() => formatMonthHeading(t, lang, year, month), [t, lang, year, month]);

  return (
    <div className="px-6 pt-10 pb-12 flex flex-col animate-in slide-in-from-bottom-10 duration-500">
      <div className="flex justify-between items-center mb-8">
        <button type="button" onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <ChevronLeft size={24}/>
        </button>
        <h1 className="text-lg font-black tracking-tighter uppercase opacity-60">{t.routine}</h1>
        <button type="button" className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <Share2 size={24}/>
        </button>
      </div>

      {/* ✅ FIX: streak에 단위 텍스트 추가 */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white/5 p-6 rounded-[24px] border border-white/5 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-1">
            <Flame size={24} className="text-[#F5A623]" fill="#F5A623"/>
            <span className="text-2xl font-black">{streak}</span>
          </div>
          <span className="text-[10px] text-white/40 font-bold">{t.daysStreak}</span>
          <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold mt-0.5">{t.current}</span>
        </div>
        <div className="bg-white/5 p-6 rounded-[24px] border border-white/5 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-1">
            <Trophy size={24} className="text-[#3A7BD5]"/>
            <span className="text-2xl font-black">{best}</span>
          </div>
          <span className="text-[10px] text-white/40 font-bold">{t.daysStreak}</span>
          <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold mt-0.5">{t.best}</span>
        </div>
      </div>

      {/* ✅ FIX: 실제 checkedDays 연동 캘린더 */}
      <div className="mb-8">
        <h2 className="text-2xl font-black mb-5 tracking-tighter">{heading}</h2>
        <div className="grid grid-cols-7 text-center text-[10px] text-white/30 font-black mb-3 tracking-widest">
          {t.daysShort.map((d,i) => <span key={i}>{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-y-3">
          {Array.from({length: firstDay}).map((_,i) => <div key={`pad${i}`}/>)}
          {Array.from({length: daysInMonth}, (_,i) => {
            const day = i+1;
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const checked = checkedSet.has(dateStr);
            const isToday = dateStr === todayKey;
            return (
              <div key={dateStr} className="flex justify-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black transition-all
                  ${checked ? 'bg-[#3A7BD5] text-white shadow-lg shadow-blue-500/30'
                    : isToday ? 'border-2 border-[#F5A623] text-[#F5A623]'
                    : 'text-white/25'}`}>
                  {checked ? <CheckCircle2 size={16}/> : day}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Badges */}
      <div className="mb-8">
        <h3 className="text-xl font-black mb-5 tracking-tight">{t.badges}</h3>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          <BadgeCard days={3} label={t.streak3} active={streak >= 3}/>
          <BadgeCard days={7} label={t.streak7} active={streak >= 7}/>
          <BadgeCard days={14} label={t.mastery14} active={streak >= 14}/>
        </div>
      </div>

      {/* ✅ FIX: dismiss → "See My Progress" 로 변경 */}
      <button type="button" onClick={onClose}
        className="w-full py-5 bg-[#3A7BD5] hover:bg-[#4A8BE5] text-white font-black rounded-2xl transition-all active:scale-[0.98] uppercase tracking-widest text-xs mt-auto">
        {t.dismiss}
      </button>
    </div>
  );
});

const BadgeCard = memo(function BadgeCard({ days, label, active }) {
  return (
    <div className={`min-w-[130px] p-6 rounded-[24px] flex flex-col items-center gap-4 transition-all
      ${active ? 'bg-white/5 border border-white/10 shadow-xl' : 'opacity-20 grayscale bg-black/20'}`}>
      <div className={`w-14 h-14 rounded-full flex items-center justify-center
        ${active ? 'bg-[#3A7BD5]/20 text-[#3A7BD5]' : 'bg-gray-800'}`}>
        <div className="border-2 border-current rounded-lg w-7 h-7 flex items-center justify-center text-[10px] font-black">{days}</div>
      </div>
      <span className="text-[10px] font-black text-center leading-tight uppercase tracking-tighter">{label}</span>
    </div>
  );
});

// ─── CalendarView ─────────────────────────────────────────────────────────────
const CalendarView = memo(function CalendarView({ t, lang, checkedDays, streak, bestStreak }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayKey = getTodayKey();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const checkedSet = useMemo(() => new Set(checkedDays), [checkedDays]);
  const heading = useMemo(() => formatMonthHeading(t, lang, year, month), [t, lang, year, month]);

  const successCount = useMemo(() => {
    const prefix = `${year}-${String(month+1).padStart(2,'0')}`;
    return checkedDays.filter(d => d.startsWith(prefix)).length;
  }, [checkedDays, year, month]);

  return (
    <div className="px-6 pt-10 pb-12 flex flex-col animate-in fade-in duration-500">
      <div className="mb-8 opacity-60">
        <h1 className="text-lg font-black tracking-tighter uppercase">{t.routine}</h1>
      </div>

      {/* ✅ FIX: streak 요약카드 추가 */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white/5 p-5 rounded-[20px] border border-white/5 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-1">
            <Flame size={20} className="text-[#F5A623]" fill="#F5A623"/>
            <span className="text-xl font-black">{streak}</span>
          </div>
          <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold">{t.current}</span>
        </div>
        <div className="bg-white/5 p-5 rounded-[20px] border border-white/5 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-1">
            <Trophy size={20} className="text-[#3A7BD5]"/>
            <span className="text-xl font-black">{bestStreak}</span>
          </div>
          <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold">{t.best}</span>
        </div>
      </div>

      <h2 className="text-4xl font-black text-center mb-8 tracking-tighter">{heading}</h2>

      <div className="bg-white/5 p-6 rounded-[32px] border border-white/5 mb-8 shadow-2xl">
        <div className="grid grid-cols-7 text-center text-[10px] text-white/30 font-black mb-6 tracking-widest">
          {t.daysShort.map((d,i) => <span key={i}>{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-y-4">
          {Array.from({length: firstDay}).map((_,i) => <div key={`pad${i}`}/>)}
          {Array.from({length: daysInMonth}, (_,i) => {
            const day = i+1;
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const checked = checkedSet.has(dateStr);
            const isToday = dateStr === todayKey;
            return (
              <div key={dateStr} className="flex justify-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black transition-all
                  ${checked ? 'bg-[#3A7BD5] text-white shadow-xl shadow-blue-500/20'
                    : isToday ? 'border-2 border-[#3A7BD5] text-[#3A7BD5]'
                    : 'text-white/60 hover:bg-white/5'}`}>
                  {checked ? <CheckCircle2 size={17}/> : day}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-center text-lg font-bold text-white/50 mb-8 px-4 leading-snug">
        {t.keptItUp} <span className="text-white font-black text-xl">{successCount}</span> {t.morningsThisMonth}
      </p>

      <div className="rounded-[32px] overflow-hidden aspect-video shadow-2xl relative border border-white/5">
        <img src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=600"
          alt="Landscape" className="w-full h-full object-cover grayscale opacity-40"/>
      </div>
    </div>
  );
});

// ─── ChallengeView (NEW — Screen 4) ──────────────────────────────────────────
const ChallengeView = memo(function ChallengeView({ t, state }) {
  const { currentTargetTime, ultimateGoalTime, startingWakeTime, streak, checkedDays } = state;

  const totalSteps = Math.round((startingWakeTime - ultimateGoalTime) / SHIFT_MINUTES);
  const completedSteps = Math.round((startingWakeTime - currentTargetTime) / SHIFT_MINUTES);
  const remainingSteps = Math.max(0, totalSteps - completedSteps);
  const progressPct = totalSteps > 0 ? Math.min(1, completedSteps / totalSteps) : 1;
  const goalReached = currentTargetTime <= ultimateGoalTime;
  const tomorrowTarget = goalReached ? ultimateGoalTime : currentTargetTime - SHIFT_MINUTES;
  const minutesShifted = completedSteps * SHIFT_MINUTES;
  const daysActive = checkedDays.length;

  // Build dot stops for timeline
  const dotCount = Math.min(totalSteps, 12); // max 12 dots displayed
  const dots = Array.from({ length: dotCount }, (_, i) => {
    const pct = i / (dotCount - 1 || 1);
    return { pct, done: pct <= progressPct };
  });

  return (
    <div className="px-6 pt-10 pb-12 flex flex-col animate-in fade-in duration-500">
      <div className="mb-10 opacity-60">
        <h1 className="text-lg font-black tracking-tighter uppercase">{t.challengeTitle}</h1>
      </div>

      {/* ── Timeline ── */}
      <div className="mb-10">
        <div className="flex justify-between text-sm font-black mb-3">
          <span className="text-white/40">{formatTime(startingWakeTime)}</span>
          <span className="text-[#F5A623] text-base">{formatTime(currentTargetTime)}</span>
          <span className="text-white/40">{formatTime(ultimateGoalTime)}</span>
        </div>

        {/* Progress bar */}
        <div className="relative h-3 bg-white/10 rounded-full mb-2">
          <div
            className="h-full bg-gradient-to-r from-[#F5A623] to-[#3A7BD5] rounded-full transition-all duration-700"
            style={{ width: `${progressPct * 100}%` }}
          />
          {/* Current position dot */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-[#F5A623] rounded-full border-2 border-[#1A1A2E] shadow-lg shadow-amber-500/50 transition-all duration-700"
            style={{ left: `calc(${progressPct * 100}% - 10px)` }}
          />
        </div>

        {/* milestone dots */}
        <div className="flex justify-between px-1 mt-2">
          {dots.map((dot, i) => (
            <div key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all ${dot.done ? 'bg-[#3A7BD5]' : 'bg-white/10'}`}
            />
          ))}
        </div>

        <p className="text-center text-sm text-white/40 font-bold mt-4">
          {completedSteps} {t.stepsCompleted} · {remainingSteps} {t.stepsRemaining}
        </p>
      </div>

      {/* ── Tomorrow's Target Card ── */}
      {goalReached ? (
        <div className="bg-gradient-to-br from-[#3A7BD5]/20 to-[#F5A623]/10 p-7 rounded-[28px] border border-[#3A7BD5]/30 mb-8 text-center">
          <p className="text-3xl font-black mb-2">{t.goalReached}</p>
          <p className="text-white/60 text-sm">{t.goalReachedDesc}</p>
        </div>
      ) : (
        <div className="bg-white/5 p-7 rounded-[28px] border border-white/5 mb-8 relative overflow-hidden">
          <div className="absolute top-4 right-4 opacity-10">
            <Target size={48}/>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-3">{t.tomorrowTarget}</p>
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-4xl font-black text-[#98C1FF]">{formatTime(tomorrowTarget)}</span>
            <span className="text-sm text-white/40 font-bold">-10 min</span>
          </div>
          <p className="text-sm text-white/50 mb-3">{t.wakeEarlier}</p>
          <p className="text-xs text-white/30 italic">{t.motto}</p>
        </div>
      )}

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: t.daysActive, value: daysActive, unit: '' },
          { label: t.timeShifted, value: minutesShifted, unit: ' min' },
          { label: t.streakLabel, value: streak, unit: '' },
        ].map(({ label, value, unit }) => (
          <div key={label} className="bg-white/5 p-4 rounded-[20px] border border-white/5 text-center">
            <p className="text-[9px] uppercase tracking-widest text-white/30 font-black mb-2">{label}</p>
            <p className="text-xl font-black text-white">{value}<span className="text-xs text-white/40">{unit}</span></p>
          </div>
        ))}
      </div>

      {/* ── Motivational footer ── */}
      <div className="bg-white/3 p-5 rounded-[20px] border border-white/5 flex gap-4 items-center">
        <div className="p-3 bg-[#3A7BD5]/10 rounded-2xl text-[#3A7BD5] shrink-0">
          <TrendingUp size={20}/>
        </div>
        <p className="text-xs text-white/40 leading-relaxed">
          {lang === 'ko'
            ? `꾸준함이 핵심입니다. ${daysActive}일 동안 리듬을 유지했어요.`
            : `Consistent progress is key. You've successfully adjusted your rhythm for ${daysActive} days.`}
        </p>
      </div>
    </div>
  );
});

// ─── SettingsView ─────────────────────────────────────────────────────────────
const SettingsView = memo(function SettingsView({ t, state, updateSettings }) {
  const [isSaved, setIsSaved] = useState(false);
  const lang = coerceLanguage(state.language);

  useEffect(() => {
    if (!isSaved) return;
    const id = setTimeout(() => setIsSaved(false), 2000);
    return () => clearTimeout(id);
  }, [isSaved]);

  const handleSave = useCallback(() => setIsSaved(true), []);
  const toggleNudge = useCallback(() => updateSettings(prev => ({ nudgeEnabled: !prev.nudgeEnabled })), [updateSettings]);

  // ✅ FIX: Goal time validation — goal must be earlier than current
  const handleCurrentChange = useCallback((val) => {
    updateSettings(prev => ({
      currentTargetTime: val,
      // if current becomes earlier than goal, clamp goal
      ultimateGoalTime: Math.min(prev.ultimateGoalTime, val - SHIFT_MINUTES)
    }));
  }, [updateSettings]);

  const handleGoalChange = useCallback((val) => {
    updateSettings(prev => ({
      // goal must always be earlier than current
      ultimateGoalTime: Math.min(val, prev.currentTargetTime - SHIFT_MINUTES)
    }));
  }, [updateSettings]);

  return (
    <div className="px-6 pt-10 pb-12 flex flex-col animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-xl font-black tracking-tight">{t.settings}</h1>
        <div role="radiogroup" aria-label={t.language}
          className="flex bg-white/5 p-1.5 rounded-xl border border-white/5">
          {['en','ko'].map(l => (
            <button key={l} type="button" role="radio" aria-checked={lang===l}
              onClick={() => updateSettings({ language: l })}
              className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all
                ${lang===l ? 'bg-[#3A7BD5] text-white shadow-lg' : 'text-gray-500'}`}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Challenge config */}
      <section className="mb-8">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-5 px-1">{t.yourChallenge}</h3>
        <div className="grid grid-cols-2 gap-4">
          {/* ✅ FIX: ±10분 단위로 변경 (앱 핵심 로직과 일치) */}
          <TimePicker label={t.currentTarget} value={state.currentTargetTime} onChange={handleCurrentChange} step={10}/>
          <TimePicker label={t.ultimateGoal} value={state.ultimateGoalTime} onChange={handleGoalChange} step={10}/>
        </div>
        <p className="text-xs text-white/30 mt-5 px-2 leading-relaxed italic">{t.shiftMessage}</p>
      </section>

      {/* Reminders */}
      <section className="mb-8">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-5 px-1">{t.reminders}</h3>
        <div className="bg-white/5 p-6 rounded-[28px] border border-white/5 flex items-center justify-between">
          <div className="flex gap-4 items-start">
            <div className="p-3 bg-[#3A7BD5]/10 rounded-2xl text-[#3A7BD5]"><Clock size={20}/></div>
            <div>
              <p className="font-black mb-1">{t.nudge}</p>
              <p className="text-[11px] text-white/30 max-w-[180px] leading-tight">{t.nudgeDesc}</p>
            </div>
          </div>
          <Toggle enabled={state.nudgeEnabled} onToggle={toggleNudge}/>
        </div>
      </section>

      {/* ✅ FIX: Compassionate mode — locked ON, toggle disabled, visual indicates locked */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-5 px-1">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">{t.streakRules}</h3>
          <ShieldCheck size={12} className="text-white/20"/>
        </div>
        <div className="bg-white/5 p-6 rounded-[28px] border border-[#3A7BD5]/20 flex items-center justify-between">
          <div className="flex gap-4 items-start">
            <div className="p-3 bg-[#3A7BD5]/10 rounded-2xl text-[#3A7BD5]">
              <ShieldCheck size={20}/>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-black">{t.compassionate}</span>
                <span className="text-[9px] bg-[#3A7BD5]/20 text-[#3A7BD5] px-2 py-0.5 rounded-full font-black">LOCKED</span>
              </div>
              <p className="text-[11px] text-white/30 max-w-[180px] leading-tight">{t.compDesc}</p>
            </div>
          </div>
          {/* 🔒 disabled — always ON */}
          <Toggle enabled={true} disabled={true}/>
        </div>
      </section>

      <button type="button" onClick={handleSave}
        className={`w-full py-6 font-black rounded-2xl shadow-2xl transition-all active:scale-[0.97] flex items-center justify-center gap-3 uppercase tracking-widest text-xs
          ${isSaved ? 'bg-emerald-500 text-white' : 'bg-[#3A7BD5] text-white hover:bg-[#4A8BE5]'}`}>
        {isSaved ? <><CheckCircle2 size={18}/>{t.saved}</> : t.saveBtn}
      </button>
    </div>
  );
});

// ─── TimePicker ───────────────────────────────────────────────────────────────
// ✅ FIX: step prop 추가 (기본 10분 — 앱 핵심 로직과 일치)
const TimePicker = memo(function TimePicker({ label, value, onChange, step = 10 }) {
  const adjust = useCallback(
    (delta) => onChange(Math.max(0, Math.min(MINUTES_PER_DAY - 1, value + delta))),
    [value, onChange]
  );
  return (
    <div className="bg-white/5 p-6 rounded-[28px] border border-white/5 flex flex-col items-center gap-3 hover:bg-white/[0.07] transition-all">
      <span className="text-[10px] font-black uppercase tracking-widest text-white/30">{label}</span>
      <button type="button" onClick={() => adjust(-step)} className="text-white/20 hover:text-[#3A7BD5] p-1 transition-colors">
        <ChevronRight size={22} className="-rotate-90"/>
      </button>
      <div className="text-xl font-black tabular-nums text-[#98C1FF]">{formatTime(value)}</div>
      <button type="button" onClick={() => adjust(step)} className="text-white/20 hover:text-[#3A7BD5] p-1 transition-colors">
        <ChevronRight size={22} className="rotate-90"/>
      </button>
    </div>
  );
});

// ─── Toggle ───────────────────────────────────────────────────────────────────
const Toggle = memo(function Toggle({ enabled, onToggle, disabled }) {
  return (
    <button type="button" onClick={onToggle} disabled={disabled}
      className={`w-14 h-7 rounded-full relative transition-all duration-500
        ${enabled ? 'bg-[#3A7BD5] shadow-lg shadow-blue-500/30' : 'bg-gray-800'}
        ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}>
      <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-500 ${enabled ? 'translate-x-7' : ''}`}/>
    </button>
  );
});
