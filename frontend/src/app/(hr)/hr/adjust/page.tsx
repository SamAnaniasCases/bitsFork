"use client"
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { History, FileEdit, Search, CalendarSearch, X, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AdjustmentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("All Branches");
  const [logDate, setLogDate] = useState("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const logDateRef = useRef<HTMLInputElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const branches = ["Main Office", "Makati Branch", "Tayud Branch"];

  const auditLogs = [
    {
      id: 1,
      user: "HR",
      role: "HR",
      branch: "Main Office",
      employee: "Mark Anthony",
      field: "Time-Out (PM)",
      oldVal: "05:00 PM",
      newVal: "07:00 PM",
      date: "2026-02-23",
      timestamp: "2026-02-23 08:56 PM",
      remarks: "Biometric machine lag."
    },
    {
      id: 2,
      user: "Admin 01",
      role: "Admin 1",
      branch: "Makati Branch",
      employee: "Sarah Jenkins",
      field: "Attendance Status",
      oldVal: "No Logs",
      newVal: "Present",
      date: "2026-02-23",
      timestamp: "2026-02-23 09:12 PM",
      remarks: "Forgot to scan."
    },
    {
      id: 3,
      user: "Admin 02",
      role: "Admin 2",
      branch: "Tayud Branch",
      employee: "Ariadne Arsolon",
      field: "Time-In (AM)",
      oldVal: "09:45 AM",
      newVal: "08:30 AM",
      date: "2026-02-24",
      timestamp: "2026-02-24 10:05 AM",
      remarks: "Scanner error."
    },
    {
      id: 4,
      user: "HR",
      role: "HR",
      branch: "Main Office",
      employee: "Mark Anthony",
      field: "Overtime (Hrs)",
      oldVal: "0",
      newVal: "3",
      date: "2026-02-24",
      timestamp: "2026-02-24 11:20 AM",
      remarks: "Forgot to scan."
    },
    {
      id: 5,
      user: "Admin 01",
      role: "Admin 1",
      branch: "Main Office",
      employee: "John Doe",
      field: "Time-In (AM)",
      oldVal: "10:00 AM",
      newVal: "08:00 AM",
      date: "2026-02-25",
      timestamp: "2026-02-25 09:00 AM",
      remarks: "Forgot to scan."
    },
    {
      id: 6,
      user: "HR",
      role: "HR",
      branch: "Makati Branch",
      employee: "James Wilson",
      field: "Time-Out (PM)",
      oldVal: "06:00 PM",
      newVal: "05:00 PM",
      date: "2026-02-25",
      timestamp: "2026-02-25 10:30 AM",
      remarks: "Incorrect checkout entry."
    },
    {
      id: 7,
      user: "Admin 02",
      role: "Admin 2",
      branch: "Tayud Branch",
      employee: "Elena Cruz",
      field: "Attendance Status",
      oldVal: "Absent",
      newVal: "Excused",
      date: "2026-02-26",
      timestamp: "2026-02-26 08:15 AM",
      remarks: "Medical certificate submitted."
    },
    {
      id: 8,
      user: "Admin 01",
      role: "Admin 1",
      branch: "Main Office",
      employee: "Robert Chen",
      field: "Time-In (AM)",
      oldVal: "09:15 AM",
      newVal: "08:45 AM",
      date: "2026-02-26",
      timestamp: "2026-02-26 09:45 AM",
      remarks: "System sync error."
    }
  ];

  const filteredLogs = useMemo(() => {
    return auditLogs
      .filter(log => {
        const matchesSearch = log.employee.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.user.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesBranch = branchFilter === "All Branches" || log.branch === branchFilter;
        const matchesDate = logDate === "" || log.date === logDate;

        return matchesSearch && matchesBranch && matchesDate;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [searchQuery, branchFilter, logDate]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, branchFilter, logDate]);

  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return "Select Date";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  const CustomSelect = ({ value, options, onChange, id }: any) => {
    const isOpen = openDropdown === id;
    return (
      <div className="relative min-w-[180px]">
        <button
          onClick={(e) => { e.stopPropagation(); setOpenDropdown(isOpen ? null : id); }}
          className={`w-full flex items-center justify-between px-5 py-3 bg-[#df0808] text-white rounded-lg text-xs font-bold transition-all ${isOpen ? 'rounded-b-none' : 'shadow-md'}`}
        >
          <span>{value}</span>
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {isOpen && (
          <div className="absolute top-full left-0 right-0 z-50 flex flex-col pt-1">
            <button
              className="w-full text-left px-5 py-3 bg-[#c21414] text-white hover:bg-red-500 transition-colors text-xs font-bold first:mt-0 mt-[1px] rounded-sm shadow-sm"
              onClick={() => {
                onChange("All Branches");
                setOpenDropdown(null);
              }}
            >
              All Branches
            </button>
            {options.map((opt: string) => (
              <button
                key={opt}
                className="w-full text-left px-5 py-3 bg-[#c21414] text-white hover:bg-red-500 transition-colors text-xs font-bold first:mt-0 mt-[1px] rounded-sm last:rounded-b-lg shadow-sm"
                onClick={() => {
                  onChange(opt);
                  setOpenDropdown(null);
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 relative" onClick={() => setOpenDropdown(null)}>
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Adjustment Logs</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Full audit trail of manual biometric data modifications</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center bg-white p-2 rounded-2xl border border-slate-200 shadow-sm gap-4" onClick={(e) => e.stopPropagation()}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employee or admin..."
            className="w-full md:w-64 pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-400/20 outline-none transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <div className="relative">
            <input
              type="date"
              ref={logDateRef}
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              className="absolute opacity-0 pointer-events-none"
            />
            <button
              onClick={() => logDateRef.current?.showPicker()}
              className="min-w-[180px] flex items-center justify-between px-5 py-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none shadow-sm hover:border-red-200 transition-all"
            >
              <div className="flex items-center gap-3">
                <CalendarSearch size={14} className="text-slate-400" />
                <span>{formatDateLabel(logDate)}</span>
              </div>
              {logDate && (
                <X
                  size={14}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                  onClick={(e) => { e.stopPropagation(); setLogDate(""); }}
                />
              )}
            </button>
          </div>
          <CustomSelect id="branch" value={branchFilter} options={branches} onChange={setBranchFilter} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse table-auto">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-4 py-3.5">Timestamp</th>
                <th className="px-4 py-3.5">Adjusted By</th>
                <th className="px-4 py-3.5">Branch</th>
                <th className="px-4 py-3.5">Target Employee</th>
                <th className="px-4 py-3.5">Modified Field</th>
                <th className="px-4 py-3.5">Changes Made</th>
                <th className="px-4 py-3.5 text-right pr-10">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedLogs.length > 0 ? paginatedLogs.map((log) => (
                <tr key={log.id} className="hover:bg-red-50 transition-colors duration-200 group cursor-default">
                  <td className="px-4 py-2.5 font-mono text-[10px] text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                  <td className="px-4 py-2.5 font-bold text-slate-700 underline decoration-red-100 underline-offset-4 decoration-2">{log.user}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-500 text-xs">{log.branch}</td>
                  <td className="px-4 py-2.5 font-bold text-slate-700">{log.employee}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-[10px] font-black uppercase tracking-tight text-slate-600">{log.field}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <span className="text-[10px] text-slate-400 line-through decoration-slate-300">{log.oldVal}</span>
                      <span className="text-xs font-black text-emerald-600">→ {log.newVal}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right pr-10">
                    <p className="text-[11px] font-medium text-slate-500 leading-relaxed max-w-[200px] ml-auto">
                      {log.remarks}
                    </p>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-24 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                    No biometric logs found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Showing <span className="text-slate-700">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="text-slate-700">{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</span> of <span className="text-slate-700">{filteredLogs.length}</span> records
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-red-600 disabled:opacity-50 disabled:hover:text-slate-400 transition-all shadow-sm"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${currentPage === i + 1 ? 'bg-red-600 text-white shadow-md shadow-red-200' : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-red-600 disabled:opacity-50 disabled:hover:text-slate-400 transition-all shadow-sm"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}