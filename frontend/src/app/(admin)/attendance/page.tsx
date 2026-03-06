'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Fingerprint,
  Search,
  Download,
  MapPin,
  Users,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Building2,
  TrendingUp,
  TrendingDown,
  Timer,
  GitBranch,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface Branch {
  id: number
  name: string
  address?: string | null
}

interface Department {
  id: number
  name: string
}

export default function BiometricPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [activeBranchId, setActiveBranchId] = useState<'all' | number>('all')
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedDeptId, setSelectedDeptId] = useState('all')
  // Always use PHT (Asia/Manila) date so the filter is correct regardless of the client machine's timezone
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
  )

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const rowsPerPage = 10

  // Stats
  const [stats, setStats] = useState({
    totalPresent: 0,
    totalLate: 0,
    totalAbsent: 0,
    avgHours: '0',
    totalOvertime: '0',
    totalUndertime: '0',
  })

  /* ── Helpers ── */
  const getPHTTime = (date: Date) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila', hour: 'numeric', minute: 'numeric', hour12: false
    }).formatToParts(date)
    return {
      hour: parseInt(parts.find(p => p.type === 'hour')?.value || '0'),
      minute: parseInt(parts.find(p => p.type === 'minute')?.value || '0'),
    }
  }

  const formatLate = (mins: number | null | undefined): string => {
    if (!mins || mins <= 0) return '—'
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  /* ── Debounce search ── */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 400)
    return () => clearTimeout(t)
  }, [searchTerm])

  /* ── Reset page on filter change ── */
  useEffect(() => {
    setCurrentPage(1)
  }, [activeBranchId, selectedDate, selectedStatus, selectedDeptId, debouncedSearch])

  /* ── Fetch branches ── */
  useEffect(() => {
    const run = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch('/api/branches', { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        if (data.success && data.branches.length > 0) {
          setBranches(data.branches)
        }
      } catch { /* ignore */ }
    }
    run()
  }, [])

  /* ── Fetch departments ── */
  useEffect(() => {
    const run = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch('/api/departments', { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        if (data.success && data.departments) setDepartments(data.departments)
      } catch { /* ignore */ }
    }
    run()
  }, [])

  /* ── Fetch records ── */
  const fetchRecords = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      const params = new URLSearchParams({
        startDate: selectedDate,
        endDate: selectedDate,
        page: String(currentPage),
        limit: String(rowsPerPage),
      })
      // Branch tab uses the branch NAME (employee.branch is a plain string, not a relation)
      if (activeBranchId !== 'all') {
        const branchName = branches.find(b => b.id === activeBranchId)?.name
        if (branchName) params.append('branchName', branchName)
      }
      if (selectedStatus !== 'all') params.append('status', selectedStatus)
      if (selectedDeptId !== 'all') {
        params.append('departmentId', selectedDeptId)
        // Also send the name so the backend OR filter can match the legacy string field
        const deptName = departments.find(d => String(d.id) === selectedDeptId)?.name
        if (deptName) params.append('departmentName', deptName)
      }

      const res = await fetch(`/api/attendance?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.status === 401) {
        localStorage.removeItem('token')
        window.location.href = '/login'
        return
      }

      const data = await res.json()
      if (data.success) {
        const userRecords = data.data.filter((log: any) => {
          const emp = log.employee || log.Employee || {}
          return emp.role === 'USER' || !emp.role
        })

        const mapped = userRecords.map((log: any) => {
          const emp = log.employee || log.Employee || {}
          const checkIn = new Date(log.checkInTime)
          const checkOut = log.checkOutTime ? new Date(log.checkOutTime) : null
          let hours = 0
          if (checkOut) hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)
          const overtime = hours > 8 ? hours - 8 : 0
          const undertime = hours > 0 && hours < 8 ? 8 - hours : 0
          const { hour, minute } = getPHTTime(checkIn)
          // Consistent with dashboard: after 08:00 AM PHT = late
          const isLate = hour > 8 || (hour === 8 && minute > 0)

          return {
            id: log.id,
            employeeId: log.employeeId,
            employeeName: emp.firstName ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
            branchName: emp.branch || '—',  // employee.branch is a plain string, not a relation
            department: emp.Department?.name || emp.department || 'General',
            date: new Date(log.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }),
            checkIn: log.checkInTimePH || checkIn.toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' }),
            checkOut: log.checkOutTime
              ? log.checkOutTimePH || checkOut?.toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })
              : '—',
            lateMinutes: log.lateMinutes ?? (isLate ? (hour * 60 + minute) - (8 * 60) : null),
            status: log.lateMinutes != null ? (log.lateMinutes > 0 ? 'late' : log.status || 'present') : (isLate ? 'late' : log.status || 'present'),
            shiftType: log.shiftType || 'MORNING',
            hours,
            overtime,
            undertime,
          }
        })

        const filtered = debouncedSearch
          ? mapped.filter((r: any) => r.employeeName.toLowerCase().includes(debouncedSearch.toLowerCase()))
          : mapped

        setRecords(filtered)
        setTotalPages(data.meta?.totalPages || 1)
        setStats({
          totalPresent: filtered.filter((r: any) => r.status === 'present').length, totalLate: filtered.filter((r: any) => r.status === 'late').length,
          totalAbsent: filtered.filter((r: any) => r.status === 'absent').length,
          avgHours: filtered.length > 0
            ? (filtered.filter((r: any) => r.hours > 0).reduce((s: number, r: any) => s + r.hours, 0) /
              (filtered.filter((r: any) => r.hours > 0).length || 1)).toFixed(1)
            : '0',
          totalOvertime: filtered.reduce((s: number, r: any) => s + r.overtime, 0).toFixed(1),
          totalUndertime: filtered.reduce((s: number, r: any) => s + r.undertime, 0).toFixed(1),
        })
      } else {
        setError(data.message || 'Failed to fetch records')
      }
    } catch (e: any) {
      setError(e.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }, [activeBranchId, selectedDate, selectedStatus, selectedDeptId, currentPage, debouncedSearch, branches])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  /* ── Export ── */
  const handleExport = () => {
    const headers = ['Employee', 'Branch', 'Department', 'Date', 'Check In', 'Check Out', 'Late', 'Hours', 'OT', 'UT', 'Shift', 'Status']
    const rows = records.map(r => [
      r.employeeName, r.branchName, r.department, r.date, r.checkIn, r.checkOut,
      formatLate(r.lateMinutes),
      r.hours > 0 ? r.hours.toFixed(2) : '—',
      r.overtime > 0 ? r.overtime.toFixed(2) : '—',
      r.undertime > 0 ? r.undertime.toFixed(2) : '—',
      r.shiftType === 'NIGHT' ? 'Night' : 'Morning',
      r.status.charAt(0).toUpperCase() + r.status.slice(1),
    ])
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const branchLabel = activeBranchId === 'all' ? 'All-Branches' : (branches.find(b => b.id === activeBranchId)?.name || 'Branch').replace(/\s+/g, '-')
    a.download = `Attendance_${branchLabel}_${selectedDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const activeBranch = activeBranchId !== 'all' ? branches.find(b => b.id === activeBranchId) : null

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Fingerprint className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Biometric Attendance</h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="bg-secondary border-border text-foreground w-40"
          />
          <Button onClick={handleExport} className="bg-primary hover:bg-primary/90 gap-2 shrink-0">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Avg Hours', value: `${stats.avgHours}h`, icon: Timer, color: 'text-primary', bg: 'bg-primary/20' },
          { label: 'Overtime', value: `${stats.totalOvertime}h`, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/20' },
          { label: 'Undertime', value: `${stats.totalUndertime}h`, icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/20' },
        ].map(s => {
          const Icon = s.icon
          return (
            <Card key={s.label} className="bg-card border-border p-3 sm:p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">{s.label}</p>
                  <p className={`text-xl sm:text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
                </div>
                <div className={`${s.bg} p-2 rounded-lg shrink-0`}>
                  <Icon className={`w-4 h-4 ${s.color}`} />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* ── Branch Tab Bar ── */}
      <div className="flex items-end gap-1 overflow-x-auto scrollbar-none">
        {/* All Branches tab */}
        <button
          onClick={() => setActiveBranchId('all')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-sm font-bold transition-all duration-200 border-b-2 whitespace-nowrap ${activeBranchId === 'all'
            ? 'bg-card border-b-transparent text-primary shadow-sm border border-border border-b-card'
            : 'bg-secondary/40 border-b-transparent text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
        >
          <GitBranch className={`w-3.5 h-3.5 ${activeBranchId === 'all' ? 'text-primary' : 'text-muted-foreground'}`} />
          All Branches
        </button>

        {branches.length === 0 ? (
          <span className="px-4 py-2.5 text-xs text-muted-foreground italic">Loading branches...</span>
        ) : (
          branches.map(branch => {
            const isActive = activeBranchId === branch.id
            return (
              <button
                key={branch.id}
                onClick={() => setActiveBranchId(branch.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-sm font-bold transition-all duration-200 border-b-2 whitespace-nowrap ${isActive
                  ? 'bg-card border-b-transparent text-primary shadow-sm border border-border border-b-card'
                  : 'bg-secondary/40 border-b-transparent text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
              >
                <MapPin className={`w-3.5 h-3.5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                {branch.name}
              </button>
            )
          })
        )}
      </div>

      {/* ── Main Card ── */}
      <Card className="bg-card border-border rounded-2xl shadow-md overflow-hidden rounded-tl-none">

        {/* Card header with inline mini-stats */}
        <div className="px-6 py-4 border-b border-border bg-secondary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              {activeBranchId === 'all'
                ? <GitBranch className="w-4 h-4 text-primary" />
                : <Building2 className="w-4 h-4 text-primary" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground leading-tight">
                {activeBranchId === 'all' ? 'All Branches' : activeBranch?.name}
              </h3>
              {activeBranch?.address && (
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />{activeBranch.address}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Present</p>
              <p className="text-xl font-black text-foreground">{stats.totalPresent}</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Absent</p>
              <p className="text-xl font-black text-red-400">{stats.totalAbsent}</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total</p>
              <p className="text-xl font-black text-foreground">{records.length}</p>
            </div>
          </div>
        </div>

        {/* Filters row */}
        <div className="px-4 py-3 border-b border-border bg-secondary/10 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search employee..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
              <SelectTrigger className="w-40 bg-secondary border-border text-foreground text-sm">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent className="bg-secondary border-border">
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(d => (
                  <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-36 bg-secondary border-border text-foreground text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-secondary border-border">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border bg-secondary/50 backdrop-blur-sm">
                <th className="px-4 sm:px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Employee</th>
                <th className="px-4 sm:px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Branch</th>
                <th className="px-4 sm:px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Department</th>
                <th className="px-4 sm:px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Check In</th>
                <th className="px-4 sm:px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Check Out</th>
                <th className="px-4 sm:px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Shift</th>
                <th className="px-4 sm:px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Late</th>
                <th className="px-4 sm:px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Hours</th>
                <th className="px-4 sm:px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden md:table-cell">OT</th>
                <th className="px-4 sm:px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden md:table-cell">UT</th>
                <th className="px-4 sm:px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">Loading attendance data...</span>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-14 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Fingerprint className="w-10 h-10 text-muted-foreground/30" />
                      <div>
                        <p className="text-sm font-medium">No biometric records found</p>
                        <p className="text-xs mt-0.5">
                          No attendance for <strong>{activeBranchId === 'all' ? 'any branch' : activeBranch?.name}</strong> on this date.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((record, index) => (<tr
                  key={record.id}
                  className={`hover:bg-primary/5 transition-colors ${index % 2 === 0 ? 'bg-transparent' : 'bg-secondary/10'}`}
                >
                  <td className="px-4 sm:px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {record.employeeName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-foreground block truncate">{record.employeeName}</span>
                        <span className="text-xs text-muted-foreground sm:hidden">{record.department}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-xs text-muted-foreground hidden sm:table-cell">{record.branchName}</td>
                  <td className="px-4 sm:px-6 py-4 hidden sm:table-cell">
                    <Badge variant="outline" className="bg-secondary/50 text-foreground border-border text-xs">
                      {record.department}
                    </Badge>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-sm font-mono text-emerald-400 hidden sm:table-cell">{record.checkIn}</td>
                  <td className="px-4 sm:px-6 py-4 text-sm font-mono text-foreground hidden sm:table-cell">{record.checkOut}</td>
                  <td className="px-4 sm:px-6 py-4 hidden md:table-cell">
                    <Badge
                      variant="outline"
                      className={record.shiftType === 'NIGHT'
                        ? 'bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs'
                        : 'bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs'}
                    >
                      {record.shiftType === 'NIGHT' ? '🌙 Night' : '☀️ Morning'}
                    </Badge>
                  </td>
                  <td className="px-4 sm:px-6 py-4 hidden md:table-cell">
                    {record.lateMinutes && record.lateMinutes > 0 ? (
                      <span className="text-xs font-bold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                        {formatLate(record.lateMinutes)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-sm font-mono text-foreground">
                    {record.hours > 0 ? record.hours.toFixed(2) : '—'}
                  </td>
                  <td className="px-4 sm:px-6 py-4 hidden md:table-cell">
                    <span className={`text-sm font-medium ${record.overtime > 0 ? 'text-green-400' : 'text-muted-foreground'}`}>
                      {record.overtime > 0 ? `+${record.overtime.toFixed(2)}` : '—'}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 hidden md:table-cell">
                    <span className={`text-sm font-medium ${record.undertime > 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                      {record.undertime > 0 ? `-${record.undertime.toFixed(2)}` : '—'}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <Badge
                      variant="outline"
                      className={
                        record.status === 'present'
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : record.status === 'late'
                            ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                            : record.status === 'absent'
                              ? 'bg-red-500/20 text-red-400 border-red-500/30'
                              : 'bg-secondary/50 text-muted-foreground border-border'
                      }
                    >
                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </Badge>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 sm:px-6 py-4 bg-secondary/20 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline" size="sm"
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="h-8 px-2 border-border text-foreground hover:bg-secondary disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(page => (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className={`h-8 w-8 p-0 hidden sm:flex ${currentPage === page ? 'bg-primary text-white' : 'border-border text-foreground hover:bg-secondary'}`}
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline" size="sm"
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage >= totalPages}
                className="h-8 px-2 border-border text-foreground hover:bg-secondary disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}