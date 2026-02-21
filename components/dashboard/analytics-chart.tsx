"use client"

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface GradeTrendData {
  date: string
  grade: number
}

interface AttendanceData {
  month: string
  present: number
  absent: number
}

interface AnalyticsChartProps {
  gradeData?: GradeTrendData[]
  attendanceData?: AttendanceData[]
  type: "grades" | "attendance"
}

export function AnalyticsChart({ gradeData, attendanceData, type }: AnalyticsChartProps) {
  if (type === "grades" && gradeData && gradeData.length > 0) {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={gradeData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="grade" stroke="#8884d8" name="Grade" />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  if (type === "attendance" && attendanceData && attendanceData.length > 0) {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={attendanceData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="present" fill="#22c55e" name="Present" />
          <Bar dataKey="absent" fill="#ef4444" name="Absent" />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
      <p>No data available for chart</p>
    </div>
  )
}









