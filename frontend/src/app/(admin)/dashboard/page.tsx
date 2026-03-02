'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import {
  Users,
  Clock,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  Building2,
  FileText,
} from 'lucide-react'

/* ── Brand palette ──────────────────────────────────── */
const RED = '#dc2626'
const GOLD = '#f59e0b'
const ORANGE = '#ea580c'

/* ── Types ──────────────────────────────────────────── */
interface EmpStats { total: number; active: number }
interface AttStats { present: number; late: number; absent: number; overtime: number; undertime: number }
interface DeptStat { name: string; total: number; rate: number }
interface WeeklyDay { day: string; present: number; late: number; absent: number }
interface ActivityRow {
  id: number
  employee: string
  department: string
  branch: string
  action: string
  time: string
  status: 'on-time' | 'late' | 'absent'
}

export default function Dashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [empStats, setEmpStats] = useState<EmpStats>({ total: 0, active: 0 })
  const [attStats, setAttStats] = useState<AttStats>({ present: 0, late: 0, absent: 0, overtime: 0, undertime: 0 })
  const [deptStats, setDeptStats] = useState<DeptStat[]>([])
  const [weekly, setWeekly] = useState<WeeklyDay[]>([])
  const [activity, setActivity] = useState<ActivityRow[]>([])
  const [rate, setRate] = useState(0)
  const [updatedAt, setUpdatedAt] = useState('')

  /* ── Data fetching (all our fixed logic intact) ───── */
  const load = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const today = new Date()
      const todayStr = today.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })

      // Start of current week (Monday) in PHT
      const phtDayOfWeek = new Date(todayStr + 'T00:00:00+08:00').getDay()
      const mondayOffset = phtDayOfWeek === 0 ? 6 : phtDayOfWeek - 1
      const monday = new Date(todayStr + 'T00:00:00+08:00')
      monday.setDate(monday.getDate() - mondayOffset)
      const mondayStr = monday.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })

      const [empRes, attRes, deptRes] = await Promise.all([
        fetch('/api/employees', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`/api/attendance?startDate=${mondayStr}&endDate=${todayStr}&limit=5000`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/departments', { headers: { 'Authorization': `Bearer ${token}` } })
      ])

      if (empRes.status === 401 || attRes.status === 401 || deptRes.status === 401) {
        localStorage.removeItem('token')
        window.location.href = '/login'
        return
      }

      const empData = await empRes.json()
      const attData = await attRes.json()
      const deptData = deptRes.ok ? await deptRes.json() : { success: false, departments: [] }

      const employeesRaw = empData.success ? (empData.employees || empData.data || []) : []
      const employees = employeesRaw.filter((e: any) => e.employmentStatus === 'ACTIVE' && e.role === 'USER')
      const attendance = attData.success ? (attData.data || []) : []
      const departments = deptData.success ? deptData.departments : []

      // ── Employee stats ──
      const totalEmp = employees.length
      const activeEmp = employees.filter((e: any) => e.employmentStatus === 'ACTIVE').length
      setEmpStats({ total: totalEmp, active: activeEmp })

      // ── Today's attendance stats ──
      const todayRecords = attendance.filter((r: any) => {
        const recDate = new Date(r.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
        return recDate === todayStr
      })

      let presentCount = 0
      let lateCount = 0
      let totalOT = 0
      let totalUT = 0
      const requiredHours = 8

      todayRecords.forEach((r: any) => {
        const checkIn = r.checkInTime ? new Date(r.checkInTime) : null
        const checkOut = r.checkOutTime ? new Date(r.checkOutTime) : null

        let isLate = r.status === 'late'
        if (!isLate && checkIn) {
          const ciHourPHT = parseInt(checkIn.toLocaleString('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', hour12: false }))
          const ciMinPHT = parseInt(checkIn.toLocaleString('en-US', { timeZone: 'Asia/Manila', minute: 'numeric' }))
          isLate = ciHourPHT > 8 || (ciHourPHT === 8 && ciMinPHT > 30)
        }

        if (isLate) lateCount++
        else if (checkIn) presentCount++

        if (checkIn && checkOut) {
          const hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)
          if (hours > requiredHours) totalOT += Math.round(hours - requiredHours)
          else if (hours < requiredHours) totalUT += Math.round(requiredHours - hours)
        }
      })

      const absentCount = Math.max(0, totalEmp - presentCount - lateCount)
      setAttStats({ present: presentCount, late: lateCount, absent: absentCount, overtime: totalOT, undertime: totalUT })
      setRate(totalEmp > 0 ? Math.round(((presentCount + lateCount) / totalEmp) * 100) : 0)

      // ── Department breakdown ──
      const deptMap = new Map<string, { count: number; present: number }>()
      if (departments && departments.length > 0) {
        departments.forEach((d: any) => { deptMap.set(d.name, { count: 0, present: 0 }) })
      }

      const getDeptName = (e: any) => e?.Department?.name || e?.department || null

      employees.forEach((e: any) => {
        const dept = getDeptName(e)
        if (dept) {
          if (!deptMap.has(dept)) deptMap.set(dept, { count: 0, present: 0 })
          deptMap.get(dept)!.count++
        }
      })

      todayRecords.forEach((r: any) => {
        const emp = r.employee || employees.find((e: any) => e.id === r.employeeId)
        const dept = getDeptName(emp)
        if (dept && deptMap.has(dept)) deptMap.get(dept)!.present++
      })

      const deptArr: DeptStat[] = []
      deptMap.forEach((val, dept) => {
        deptArr.push({ name: dept, total: val.count, rate: val.count > 0 ? Math.round((val.present / val.count) * 100) : 0 })
      })
      setDeptStats(deptArr)

      // ── Weekly trend ──
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      const weeklyData: WeeklyDay[] = []
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday)
        d.setDate(d.getDate() + i)
        const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
        if (dateStr > todayStr) break

        const dayRecords = attendance.filter((r: any) =>
          new Date(r.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }) === dateStr
        )

        let dayPresent = 0, dayLate = 0
        dayRecords.forEach((r: any) => {
          const ci = r.checkInTime ? new Date(r.checkInTime) : null
          let isLateDay = r.status === 'late'
          if (!isLateDay && ci) {
            const ciHour = parseInt(ci.toLocaleString('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', hour12: false }))
            const ciMin = parseInt(ci.toLocaleString('en-US', { timeZone: 'Asia/Manila', minute: 'numeric' }))
            isLateDay = ciHour > 8 || (ciHour === 8 && ciMin > 30)
          }
          if (isLateDay) dayLate++
          else if (ci) dayPresent++
        })

        weeklyData.push({ day: dayNames[i], present: dayPresent, late: dayLate, absent: Math.max(0, totalEmp - dayPresent - dayLate) })
      }
      setWeekly(weeklyData)

      // ── Recent activity (USER employees only, Today only) ──
      const recent: ActivityRow[] = [...todayRecords]
        .filter((r: any) => {
          const emp = r.employee || employees.find((e: any) => e.id === r.employeeId) || {}
          return emp.role === 'USER' || !emp.role
        })
        .sort((a: any, b: any) => {
          const timeA = a.checkOutTime ? new Date(a.checkOutTime).getTime() : new Date(a.checkInTime).getTime()
          const timeB = b.checkOutTime ? new Date(b.checkOutTime).getTime() : new Date(b.checkInTime).getTime()
          return timeB - timeA
        })
        .slice(0, 8)
        .map((r: any, idx: number) => {
          const emp = r.employee || employees.find((e: any) => e.id === r.employeeId) || {}
          const checkIn = r.checkInTime ? new Date(r.checkInTime) : null
          const checkOut = r.checkOutTime ? new Date(r.checkOutTime) : null
          let isLate = false
          if (checkIn) {
            const ciH = parseInt(checkIn.toLocaleString('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', hour12: false }))
            const ciM = parseInt(checkIn.toLocaleString('en-US', { timeZone: 'Asia/Manila', minute: 'numeric' }))
            isLate = ciH > 8 || (ciH === 8 && ciM > 30)
          }
          const displayTime = checkOut || checkIn
          return {
            id: r.id || idx,
            employee: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || `Employee #${r.employeeId}`,
            department: emp.Department?.name || emp.department || 'General',
            branch: emp.branch || 'Main Office',
            action: r.checkOutTime ? 'Out' : 'In',
            time: displayTime ? displayTime.toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '---',
            status: isLate ? 'late' as const : 'on-time' as const,
          }
        })
      setActivity(recent)

      // Update timestamp
      setUpdatedAt(new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' }))

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    const employee = localStorage.getItem('employee')
    if (!token || !employee) { router.replace('/login'); return }
    load()
    // auto-refresh every 30s
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load, router])

  /* ── Loading state ──────────────────────────────────── */
  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: `${RED} transparent ${RED} ${RED}` }} />
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      </div>
    </div>
  )

  /* ── Stat card data ─────────────────────────────────── */
  const statCards = [
    { label: 'Total Employees', value: empStats.total, sub: `${empStats.active} active`, icon: Users, color: '#6366f1', bg: '#6366f115' },
    { label: 'On Time', value: attStats.present, sub: `${rate}% rate`, icon: Clock, color: '#22c55e', bg: '#22c55e15' },
    { label: 'Late', value: attStats.late, sub: `+${attStats.overtime}h overtime`, icon: TrendingUp, color: GOLD, bg: `${GOLD}20` },
    { label: 'Absent', value: attStats.absent, sub: `${attStats.undertime}h undertime`, icon: AlertCircle, color: RED, bg: `${RED}15` },
  ]

  /* ── JSX ────────────────────────────────────────────── */
  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Welcome to BITS Admin Panel — here&apos;s today&apos;s overview
          </p>
        </div>
        <Button
          style={{ backgroundColor: RED }}
          className="gap-2 text-white hover:opacity-90"
          onClick={() => router.push('/admin/reports')}
        >
          <FileText className="w-4 h-4" />
          Generate Report
        </Button>
      </div>

      {/* ── 4 Stat Cards ───────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <Card key={label} className="bg-card border-border p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
                <p className="text-xs mt-1" style={{ color }}>{sub}</p>
              </div>
              <div className="p-2.5 rounded-lg" style={{ backgroundColor: bg }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Chart + Departments ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Weekly Attendance Chart */}
        <Card className="bg-card border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-foreground">Weekly Attendance</h3>
            <Badge variant="outline" className="text-xs" style={{ backgroundColor: `${RED}10`, color: RED, borderColor: `${RED}40` }}>
              This Week
            </Badge>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={weekly} barCategoryGap="35%" barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                labelStyle={{ color: '#374151', fontWeight: 600 }}
              />
              <Bar dataKey="present" name="Present" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="late" name="Late" fill={GOLD} radius={[4, 4, 0, 0]} />
              <Bar dataKey="absent" name="Absent" fill={RED} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Departments Breakdown */}
        <Card className="bg-card border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-foreground">Departments</h3>
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="space-y-4 overflow-y-auto" style={{ maxHeight: 280 }}>
            {deptStats.length > 0 ? deptStats.map((dept, i) => {
              const cols = [RED, ORANGE, GOLD, '#6366f1', '#22c55e']
              const col = cols[i % cols.length]
              return (
                <div key={dept.name}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-foreground">{dept.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{dept.total} emp</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: `${col}15`, color: col }}>
                        {dept.rate}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ width: `${dept.rate}%`, backgroundColor: col }}
                    />
                  </div>
                </div>
              )
            }) : (
              <p className="text-sm text-muted-foreground text-center py-10">No department data yet</p>
            )}
          </div>
        </Card>
      </div>

      {/* ── Today's Activity Table ──────────────────────── */}
      <Card className="bg-card border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">Today&apos;s Activity</h3>
            <span className="flex items-center gap-1 text-xs font-medium text-green-600">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Updated {updatedAt}</span>
            <button
              className="flex items-center gap-1 text-xs font-medium hover:opacity-80 transition-opacity"
              style={{ color: RED }}
              onClick={() => router.push('/attendance')}
            >
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {activity.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Employee</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Branch</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Action</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Time</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {activity.map((row) => (
                  <tr key={row.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ backgroundColor: row.status === 'late' ? RED : '#6366f1' }}>
                          {row.employee.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{row.employee}</p>
                          <p className="text-[11px] text-muted-foreground">{row.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-secondary text-muted-foreground">
                        {row.branch}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="flex items-center gap-1 text-sm font-medium"
                        style={{ color: row.action === 'In' ? '#22c55e' : '#6366f1' }}>
                        {row.action === 'In' ? '→' : '←'} {row.action}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-muted-foreground text-xs">{row.time}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{
                          backgroundColor: row.status === 'late' ? `${RED}15` :
                            row.status === 'absent' ? '#6b728015' :
                              '#22c55e15',
                          color: row.status === 'late' ? RED :
                            row.status === 'absent' ? '#6b7280' :
                              '#22c55e',
                        }}>
                        {row.status === 'on-time' ? 'On Time' : row.status === 'late' ? 'Late' : 'Absent'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No activity recorded today</p>
          </div>
        )}
      </Card>
    </div>
  )
}