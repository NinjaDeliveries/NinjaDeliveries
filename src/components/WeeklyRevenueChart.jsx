import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const WeeklyRevenueChart = ({ weeklyData }) => {
  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'white',
          padding: '12px 16px',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <p style={{ 
            margin: 0, 
            fontWeight: '600', 
            color: '#0f172a',
            marginBottom: '4px'
          }}>
            {payload[0].payload.day}
          </p>
          <p style={{ 
            margin: 0, 
            color: '#059669',
            fontWeight: '600'
          }}>
            Revenue: ₹{payload[0].value.toLocaleString()}
          </p>
          <p style={{ 
            margin: 0, 
            color: '#64748b',
            fontSize: '12px',
            marginTop: '2px'
          }}>
            {payload[0].payload.bookings} bookings
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      {/* Line Chart Card */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#0f172a',
            margin: '0 0 4px 0'
          }}>
            Weekly Revenue Trend
          </h3>
          <p style={{
            fontSize: '14px',
            color: '#64748b',
            margin: 0
          }}>
            Revenue breakdown by day of the week
          </p>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart 
            data={weeklyData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="day" 
              stroke="#64748b"
              style={{ fontSize: '14px' }}
            />
            <YAxis 
              stroke="#64748b"
              style={{ fontSize: '14px' }}
              tickFormatter={(value) => `₹${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="hsl(262.1, 83.3%, 57.8%)" 
              strokeWidth={2}
              dot={{ fill: 'hsl(262.1, 83.3%, 57.8%)', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>


      {/* Daily Breakdown Card */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#0f172a',
            margin: '0 0 4px 0'
          }}>
            Daily Breakdown
          </h3>
          <p style={{
            fontSize: '14px',
            color: '#64748b',
            margin: 0
          }}>
            Detailed revenue by each day
          </p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {weeklyData.map((day) => {
            const maxRevenue = Math.max(...weeklyData.map(d => d.revenue));
            const percentage = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
            const isHighest = day.revenue === maxRevenue;
            
            return (
              <div key={day.day} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '12px',
                background: isHighest ? '#f0fdf4' : 'transparent',
                borderRadius: '8px',
                border: isHighest ? '1px solid #86efac' : '1px solid transparent',
                transition: 'all 0.2s ease'
              }}>
                <div style={{
                  width: '48px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: isHighest ? '#059669' : '#64748b'
                }}>
                  {day.day}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{
                    height: '10px',
                    background: '#e2e8f0',
                    borderRadius: '9999px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <div style={{
                      height: '100%',
                      background: isHighest 
                        ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                        : 'hsl(262.1, 83.3%, 57.8%)',
                      borderRadius: '9999px',
                      width: `${percentage}%`,
                      transition: 'width 0.5s ease',
                      boxShadow: isHighest ? '0 0 8px rgba(16, 185, 129, 0.4)' : 'none'
                    }} />
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: '#94a3b8',
                    marginTop: '4px'
                  }}>
                    {day.bookings || 0} bookings
                  </div>
                </div>
                
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: isHighest ? '#059669' : '#0f172a',
                  minWidth: '100px',
                  textAlign: 'right',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '6px'
                }}>
                  {isHighest && (
                    <span style={{
                      background: '#10b981',
                      color: 'white',
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: '600'
                    }}>
                      TOP
                    </span>
                  )}
                  ₹{day.revenue.toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WeeklyRevenueChart;
