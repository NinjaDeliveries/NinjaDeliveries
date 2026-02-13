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
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)'
        }}>
          <p style={{ 
            margin: 0, 
            fontWeight: '600', 
            color: '#0f172a',
            marginBottom: '4px',
            fontSize: '14px'
          }}>
            {payload[0].payload.day}
          </p>
          <p style={{ 
            margin: 0, 
            color: '#059669',
            fontWeight: '600',
            fontSize: '15px'
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
    <div style={{ display: 'grid', gap: '20px' }}>
      {/* Line Chart Card - Enhanced */}
      <div style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        borderRadius: '16px',
        padding: '28px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
        transition: 'all 0.3s ease'
      }}>
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#0f172a',
              margin: '0 0 6px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '24px' }}>📈</span>
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
          <div style={{
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
          }}>
            Last 7 Days
          </div>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <LineChart 
            data={weeklyData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(262.1, 83.3%, 57.8%)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(262.1, 83.3%, 57.8%)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="day" 
              stroke="#64748b"
              style={{ fontSize: '13px', fontWeight: '500' }}
            />
            <YAxis 
              stroke="#64748b"
              style={{ fontSize: '13px', fontWeight: '500' }}
              tickFormatter={(value) => `₹${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="hsl(262.1, 83.3%, 57.8%)" 
              strokeWidth={3}
              dot={{ fill: 'hsl(262.1, 83.3%, 57.8%)', r: 5, strokeWidth: 2, stroke: 'white' }}
              activeDot={{ r: 7, strokeWidth: 2, stroke: 'white' }}
              fill="url(#colorRevenue)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>


      {/* Daily Breakdown Card - Compact Version */}
      <div style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '700',
              color: '#0f172a',
              margin: '0 0 4px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '20px' }}>📊</span>
              Daily Breakdown
            </h3>
            <p style={{
              fontSize: '13px',
              color: '#64748b',
              margin: 0
            }}>
              Detailed revenue by each day
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {weeklyData.map((day) => {
            const maxRevenue = Math.max(...weeklyData.map(d => d.revenue));
            const percentage = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
            const isHighest = day.revenue === maxRevenue && day.revenue > 0;
            
            return (
              <div key={day.day} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                background: isHighest ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : '#f9fafb',
                borderRadius: '10px',
                border: isHighest ? '2px solid #86efac' : '1px solid #e5e7eb',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(4px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              >
                <div style={{
                  width: '42px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: isHighest ? '#059669' : '#64748b'
                }}>
                  {day.day}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{
                    height: '8px',
                    background: '#e2e8f0',
                    borderRadius: '9999px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <div style={{
                      height: '100%',
                      background: isHighest 
                        ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                        : 'linear-gradient(90deg, hsl(262.1, 83.3%, 57.8%) 0%, hsl(262.1, 83.3%, 47.8%) 100%)',
                      borderRadius: '9999px',
                      width: `${percentage}%`,
                      transition: 'width 0.5s ease',
                      boxShadow: isHighest ? '0 0 8px rgba(16, 185, 129, 0.4)' : 'none'
                    }} />
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: '#94a3b8',
                    marginTop: '3px',
                    fontWeight: '500'
                  }}>
                    {day.bookings || 0} bookings
                  </div>
                </div>
                
                <div style={{
                  fontSize: '14px',
                  fontWeight: '700',
                  color: isHighest ? '#059669' : '#0f172a',
                  minWidth: '90px',
                  textAlign: 'right',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '6px'
                }}>
                  {isHighest && (
                    <span style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      fontSize: '9px',
                      padding: '3px 7px',
                      borderRadius: '6px',
                      fontWeight: '700',
                      letterSpacing: '0.5px',
                      boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
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
