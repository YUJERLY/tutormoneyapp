import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Users,
  Pencil,
  Trash2,
  Wallet,
  CalendarDays,
  Clock3,
  TrendingUp,
  BookOpen,
  Save,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const STUDENTS_KEY = "tutor-tracker-students";
const LESSONS_KEY = "tutor-tracker-lessons";

const todayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const currency = (value) =>
  new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(value || 0);

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const getWeekStart = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
};

const getMonthStart = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d;
};

const getQuarterStart = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const month = d.getMonth();
  const quarterMonth = Math.floor(month / 3) * 3;
  d.setMonth(quarterMonth, 1);
  return d;
};

const parseSafe = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const seedStudents = [
  { id: uid(), name: "王小明", hourlyRate: 700 },
  { id: uid(), name: "陳小華", hourlyRate: 850 },
];

export default function App() {
  const [students, setStudents] = useState(() => parseSafe(STUDENTS_KEY, seedStudents));
  const [lessons, setLessons] = useState(() => parseSafe(LESSONS_KEY, []));

  const [studentForm, setStudentForm] = useState({
    id: null,
    name: "",
    hourlyRate: "",
  });

  const [lessonForm, setLessonForm] = useState({
    studentId: "",
    date: todayString(),
    hours: "2",
    hourlyRate: "",
  });

  const [showAllLessons, setShowAllLessons] = useState(false);
  const [showSaveActions, setShowSaveActions] = useState(false);

  useEffect(() => {
    localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem(LESSONS_KEY, JSON.stringify(lessons));
  }, [lessons]);

  useEffect(() => {
    if (!lessonForm.studentId && students.length > 0) {
      setLessonForm((prev) => ({
        ...prev,
        studentId: students[0].id,
        hourlyRate: String(students[0].hourlyRate),
      }));
      return;
    }

    const selected = students.find((s) => s.id === lessonForm.studentId);
    if (selected && !lessonForm.hourlyRate) {
      setLessonForm((prev) => ({ ...prev, hourlyRate: String(selected.hourlyRate) }));
    }
  }, [students, lessonForm.studentId, lessonForm.hourlyRate]);

  const handleStudentSubmit = (e) => {
    e.preventDefault();
    const name = studentForm.name.trim();
    const hourlyRate = Number(studentForm.hourlyRate);

    if (!name || Number.isNaN(hourlyRate) || hourlyRate <= 0) return;

    if (studentForm.id) {
      setStudents((prev) =>
        prev.map((student) =>
          student.id === studentForm.id ? { ...student, name, hourlyRate } : student
        )
      );

      setLessons((prev) =>
        prev.map((lesson) =>
          lesson.studentId === studentForm.id && lesson.usedDefaultRate
            ? { ...lesson, studentName: name, hourlyRate }
            : lesson.studentId === studentForm.id
            ? { ...lesson, studentName: name }
            : lesson
        )
      );
    } else {
      const newStudent = { id: uid(), name, hourlyRate };
      setStudents((prev) => [...prev, newStudent]);
      setLessonForm((prev) => ({
        ...prev,
        studentId: newStudent.id,
        hourlyRate: String(newStudent.hourlyRate),
      }));
    }

    setStudentForm({ id: null, name: "", hourlyRate: "" });
  };

  const handleEditStudent = (student) => {
    setStudentForm({
      id: student.id,
      name: student.name,
      hourlyRate: String(student.hourlyRate),
    });
  };

  const handleDeleteStudent = (id) => {
    const target = students.find((s) => s.id === id);
    const confirmed = window.confirm(
      `確定刪除學生「${target?.name || ""}」嗎？\n已建立的課程紀錄也會一併刪除。`
    );
    if (!confirmed) return;

    const nextStudents = students.filter((s) => s.id !== id);
    setStudents(nextStudents);
    setLessons((prev) => prev.filter((lesson) => lesson.studentId !== id));

    if (studentForm.id === id) {
      setStudentForm({ id: null, name: "", hourlyRate: "" });
    }

    setLessonForm((prev) => {
      if (prev.studentId !== id) return prev;
      const fallbackStudent = nextStudents[0];
      return {
        ...prev,
        studentId: fallbackStudent?.id || "",
        hourlyRate: fallbackStudent ? String(fallbackStudent.hourlyRate) : "",
      };
    });
  };

  const handleLessonStudentChange = (studentId) => {
    const selected = students.find((s) => s.id === studentId);
    setLessonForm((prev) => ({
      ...prev,
      studentId,
      hourlyRate: selected ? String(selected.hourlyRate) : "",
    }));
  };

  const saveLesson = ({ keepStudent = true } = {}) => {
    const selectedStudent = students.find((s) => s.id === lessonForm.studentId);
    const hours = Number(lessonForm.hours);
    const hourlyRate = Number(lessonForm.hourlyRate);

    if (!selectedStudent || !lessonForm.date) return;
    if (Number.isNaN(hours) || hours <= 0) return;
    if (Number.isNaN(hourlyRate) || hourlyRate <= 0) return;

    const newLesson = {
      id: uid(),
      studentId: selectedStudent.id,
      studentName: selectedStudent.name,
      date: lessonForm.date,
      hours,
      hourlyRate,
      amount: hours * hourlyRate,
      usedDefaultRate: hourlyRate === Number(selectedStudent.hourlyRate),
      createdAt: new Date().toISOString(),
    };

    setLessons((prev) => [newLesson, ...prev]);
    setLessonForm({
      studentId: keepStudent ? selectedStudent.id : students[0]?.id || "",
      date: todayString(),
      hours: "2",
      hourlyRate: String((keepStudent ? selectedStudent.hourlyRate : students[0]?.hourlyRate) || ""),
    });
    setShowSaveActions(false);
  };

  const handleLessonSubmit = (e) => {
    e.preventDefault();
    setShowSaveActions(true);
  };

  const handleClearLessonForm = () => {
    const selectedStudent = students.find((s) => s.id === lessonForm.studentId) || students[0];
    setLessonForm({
      studentId: selectedStudent?.id || "",
      date: todayString(),
      hours: "2",
      hourlyRate: String(selectedStudent?.hourlyRate || ""),
    });
    setShowSaveActions(false);
  };

  const handleDeleteLatestLesson = () => {
    if (sortedLessons.length === 0) return;

    const latestLesson = sortedLessons[0];
    const confirmed = window.confirm(
      `確定刪除最新一筆紀錄嗎？
${latestLesson.studentName}｜${latestLesson.date}｜${latestLesson.hours} 小時`
    );

    if (!confirmed) return;

    setLessons((prev) => prev.filter((lesson) => lesson.id !== latestLesson.id));
  };

  const sortedLessons = useMemo(() => {
    return [...lessons].sort((a, b) => {
      const dateDiff = new Date(b.date) - new Date(a.date);
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [lessons]);

  const now = new Date();
  const weekStart = getWeekStart(now);
  const monthStart = getMonthStart(now);
  const quarterStart = getQuarterStart(now);

  const sumIncomeFrom = (startDate) =>
    lessons
      .filter((lesson) => {
        const lessonDate = new Date(`${lesson.date}T00:00:00`);
        return lessonDate >= startDate;
      })
      .reduce((sum, lesson) => sum + lesson.amount, 0);

  const stats = {
    total: lessons.reduce((sum, lesson) => sum + lesson.amount, 0),
    week: sumIncomeFrom(weekStart),
    month: sumIncomeFrom(monthStart),
    quarter: sumIncomeFrom(quarterStart),
  };

  const recentLessons = sortedLessons.slice(0, 5);

  const groupedLessons = useMemo(() => {
    return sortedLessons.reduce((acc, lesson) => {
      const lessonDate = new Date(`${lesson.date}T00:00:00`);
      const monthKey = `${lessonDate.getFullYear()}年${String(lessonDate.getMonth() + 1).padStart(2, "0")}月`;

      if (!acc[monthKey]) {
        acc[monthKey] = [];
      }

      acc[monthKey].push(lesson);
      return acc;
    }, {});
  }, [sortedLessons]);

  const cardBase =
    "rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60";
  const inputBase =
    "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200";
  const labelBase = "mb-1.5 block text-sm font-medium text-slate-700";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-5 text-white shadow-lg shadow-slate-300/40">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-100 backdrop-blur">
                <BookOpen className="h-3.5 w-3.5" />
                家教收入追蹤器
              </p>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">掌握每一堂課的收入</h1>
              <p className="mt-2 text-sm text-slate-200 sm:text-base">
                管理學生、記錄課程、查看本週、本月與本季度收入。
              </p>
            </div>
            <div className="hidden rounded-2xl bg-white/10 p-3 backdrop-blur sm:block">
              <Wallet className="h-8 w-8 text-slate-100" />
            </div>
          </div>
        </header>

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: "總累積收入",
              value: currency(stats.total),
              icon: Wallet,
            },
            {
              title: "本週收入",
              value: currency(stats.week),
              icon: CalendarDays,
            },
            {
              title: "本月收入",
              value: currency(stats.month),
              icon: TrendingUp,
            },
            {
              title: "本季度收入",
              value: currency(stats.quarter),
              icon: Clock3,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className={`${cardBase} p-4`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{item.title}</p>
                    <p className="mt-2 text-2xl font-bold tracking-tight">{item.value}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <section className={`${cardBase} p-4 sm:p-5`}>
              <div className="mb-4 flex items-center gap-2">
                <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                  <Plus className="h-4 w-4" />
                </div>
                <h2 className="text-lg font-semibold">新增課程紀錄</h2>
              </div>

              <form onSubmit={handleLessonSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelBase}>學生</label>
                  <select
                    className={inputBase}
                    value={lessonForm.studentId}
                    onChange={(e) => handleLessonStudentChange(e.target.value)}
                    disabled={students.length === 0}
                  >
                    {students.length === 0 ? (
                      <option value="">請先新增學生</option>
                    ) : (
                      students.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className={labelBase}>上課日期</label>
                  <input
                    type="date"
                    className={inputBase}
                    value={lessonForm.date}
                    onChange={(e) => setLessonForm((prev) => ({ ...prev, date: e.target.value }))}
                  />
                </div>

                <div>
                  <label className={labelBase}>上課時數</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setLessonForm((prev) => ({
                          ...prev,
                          hours: String(Math.max(0, (Number(prev.hours) || 0) - 1)),
                        }))
                      }
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      -1
                    </button>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      className={inputBase}
                      placeholder="例如 2"
                      value={lessonForm.hours}
                      onChange={(e) => setLessonForm((prev) => ({ ...prev, hours: e.target.value }))}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setLessonForm((prev) => ({
                          ...prev,
                          hours: String((Number(prev.hours) || 0) + 1),
                        }))
                      }
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      +1
                    </button>
                  </div>
                </div>

                <div>
                  <label className={labelBase}>時薪</label>
                  <input
                    type="number"
                    min="0"
                    className={inputBase}
                    placeholder="例如 800"
                    value={lessonForm.hourlyRate}
                    onChange={(e) =>
                      setLessonForm((prev) => ({ ...prev, hourlyRate: e.target.value }))
                    }
                  />
                </div>

                <div className="flex items-end">
                  <div className="w-full rounded-2xl bg-slate-100 px-4 py-3">
                    <p className="text-xs text-slate-500">本次預估收入</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">
                      {currency(Number(lessonForm.hours || 0) * Number(lessonForm.hourlyRate || 0))}
                    </p>
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-3">
                  <button
                    type="submit"
                    disabled={students.length === 0}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <Save className="h-4 w-4" />
                    儲存課程紀錄
                  </button>

                  {showSaveActions && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="mb-3 text-sm font-medium text-slate-700">請確認要執行的操作</p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <button
                          type="button"
                          onClick={() => saveLesson({ keepStudent: true })}
                          className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          確認儲存
                        </button>
                        <button
                          type="button"
                          onClick={() => saveLesson({ keepStudent: false })}
                          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          儲存並切回預設
                        </button>
                        <button
                          type="button"
                          onClick={handleClearLessonForm}
                          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          取消並重設
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </section>

            <section className={`${cardBase} p-4 sm:p-5`}>
              <div className="mb-4 flex items-center gap-2">
                <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                  <Users className="h-4 w-4" />
                </div>
                <h2 className="text-lg font-semibold">學生管理</h2>
              </div>

              <form onSubmit={handleStudentSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-[1.5fr_1fr_auto] sm:items-end">
                <div>
                  <label className={labelBase}>學生姓名</label>
                  <input
                    type="text"
                    className={inputBase}
                    placeholder="例如 林同學"
                    value={studentForm.name}
                    onChange={(e) => setStudentForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div>
                  <label className={labelBase}>預設時薪</label>
                  <input
                    type="number"
                    min="0"
                    className={inputBase}
                    placeholder="例如 800"
                    value={studentForm.hourlyRate}
                    onChange={(e) =>
                      setStudentForm((prev) => ({ ...prev, hourlyRate: e.target.value }))
                    }
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />
                  {studentForm.id ? "更新" : "新增"}
                </button>
              </form>

              <div className="mt-5 space-y-3">
                {students.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                    目前還沒有學生，先新增第一位學生吧。
                  </div>
                ) : (
                  students.map((student) => (
                    <div
                      key={student.id}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{student.name}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          預設時薪：{currency(student.hourlyRate)} / 小時
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditStudent(student)}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          <Pencil className="h-4 w-4" />
                          編輯
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStudent(student.id)}
                          className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          刪除
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className={`${cardBase} p-4 sm:p-5`}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                    <CalendarDays className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg font-semibold">最近 5 筆紀錄</h2>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteLatestLesson}
                  disabled={sortedLessons.length === 0}
                  className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-white"
                >
                  <Trash2 className="h-4 w-4" />
                  刪最新
                </button>
              </div>

              <div className="space-y-3">
                {recentLessons.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                    尚未建立課程紀錄。
                  </div>
                ) : (
                  recentLessons.map((lesson) => (
                    <div key={lesson.id} className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{lesson.studentName}</p>
                          <p className="mt-1 text-sm text-slate-500">{lesson.date}</p>
                        </div>
                        <p className="text-sm font-semibold text-slate-700">{currency(lesson.amount)}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                        <span className="rounded-full bg-white px-2.5 py-1">
                          {lesson.hours} 小時
                        </span>
                        <span className="rounded-full bg-white px-2.5 py-1">
                          時薪 {currency(lesson.hourlyRate)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className={`${cardBase} p-4 sm:p-5`}>
              <button
                type="button"
                onClick={() => setShowAllLessons((prev) => !prev)}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <div>
                  <h2 className="text-lg font-semibold">所有課程紀錄</h2>
                  <p className="mt-1 text-sm text-slate-500">點開後可依月份查看完整紀錄</p>
                </div>
                <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                  {showAllLessons ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </button>

              {showAllLessons && (
                <div className="mt-4 space-y-4">
                  {sortedLessons.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                      尚未建立課程紀錄。
                    </div>
                  ) : (
                    Object.entries(groupedLessons).map(([month, monthLessons]) => {
                      const monthTotal = monthLessons.reduce((sum, lesson) => sum + lesson.amount, 0);

                      return (
                        <div key={month} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                            <div>
                              <h3 className="font-semibold text-slate-900">{month}</h3>
                              <p className="mt-1 text-xs text-slate-500">{monthLessons.length} 筆紀錄</p>
                            </div>
                            <p className="text-sm font-semibold text-slate-700">{currency(monthTotal)}</p>
                          </div>

                          <div className="mt-3 space-y-3">
                            {monthLessons.map((lesson) => (
                              <div key={lesson.id} className="rounded-xl bg-white p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-medium text-slate-900">{lesson.studentName}</p>
                                    <p className="mt-1 text-sm text-slate-500">{lesson.date}</p>
                                  </div>
                                  <p className="text-sm font-semibold text-slate-700">{currency(lesson.amount)}</p>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                                  <span className="rounded-full bg-slate-100 px-2.5 py-1">{lesson.hours} 小時</span>
                                  <span className="rounded-full bg-slate-100 px-2.5 py-1">時薪 {currency(lesson.hourlyRate)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </section>

            <section className={`${cardBase} p-4 sm:p-5`}>
              <h2 className="text-lg font-semibold">使用說明</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                <li>1. 先在「學生管理」新增學生與預設時薪。</li>
                <li>2. 在「新增課程紀錄」選學生、填日期與時數。</li>
                <li>3. 時薪會自動帶入，也可以針對單次課程手動修改。</li>
                <li>4. 所有資料都會自動儲存在瀏覽器 localStorage。</li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
