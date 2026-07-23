import { useState, useEffect } from 'react';
import { useLang } from '../context/LanguageContext';

const goalLabels = { bulk: 'עלייה במסה', cut: 'חיטוב', maintain: 'שמירה', recomp: 'Recomp' };
const goalLabelsEn = { bulk: 'Bulk', cut: 'Cut', maintain: 'Maintain', recomp: 'Recomp' };

// Line-icon set matching the app's nav-icon style, used across the stat
// cards and per-user rows below instead of default emoji.
function AIc({ type, size = 16, color = 'currentColor' }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (type === 'shield')    return <svg {...p}><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /></svg>;
  if (type === 'users')     return <svg {...p}><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3 3 0 0 1 0 6M20 20c0-2.8-2-5.1-4.7-5.8" /></svg>;
  if (type === 'check')     return <svg {...p}><path d="M5 12.5l4.5 4.5L19 7" /></svg>;
  if (type === 'sparkle')   return <svg {...p}><path d="M12 4l1.7 4.6 4.8 1.7-4.8 1.7L12 16.6l-1.7-4.6-4.8-1.7 4.8-1.7z" /></svg>;
  if (type === 'dumbbell')  return <svg {...p}><path d="M6.5 8v8M3.5 10v4M17.5 8v8M20.5 10v4M6.5 12h11" /></svg>;
  if (type === 'calendar')  return <svg {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>;
  if (type === 'salad')     return <svg {...p}><path d="M12 8c-1.8-1.8-4.5-2-6-.3-2 2.2-1.8 6.5.5 9.8C8.3 20 10.2 21 12 21s3.7-1 5.5-3.5c2.3-3.3 2.5-7.6.5-9.8-1.5-1.7-4.2-1.5-6 .3z" /><path d="M12 8V5.5" /><path d="M12 6c0-1.5 1-2.5 2.5-2.8" /></svg>;
  if (type === 'person')    return <svg {...p}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" /></svg>;
  return null;
}

export default function AdminPanel({ api }) {
  const { t, lang } = useLang();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdmin();
  }, []);

  async function loadAdmin() {
    try {
      const [statsData, usersData] = await Promise.all([
        api('/admin/stats'),
        api('/admin/users'),
      ]);
      setStats(statsData);
      setUsers(usersData.users);
    } catch (err) {
      console.error('Admin load error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="loading"><div className="spinner" /></div>;
  }

  const goals = lang === 'he' ? goalLabels : goalLabelsEn;

  return (
    <>
      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><AIc type="shield" size={20} /> {t.adminDashboard}</h1>
        <p>{t.totalUsers}: {stats?.totalUsers || 0}</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card calories">
          <div className="stat-icon"><AIc type="users" size={20} /></div>
          <div className="stat-value">{stats?.totalUsers || 0}</div>
          <div className="stat-label">{t.totalUsers}</div>
        </div>
        <div className="stat-card protein">
          <div className="stat-icon"><AIc type="check" size={20} /></div>
          <div className="stat-value">{stats?.activeUsers || 0}</div>
          <div className="stat-label">{t.activeUsersLabel}</div>
        </div>
        <div className="stat-card streak">
          <div className="stat-icon"><AIc type="sparkle" size={20} /></div>
          <div className="stat-value">{stats?.newUsersThisWeek || 0}</div>
          <div className="stat-label">{t.newThisWeek}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><AIc type="dumbbell" size={20} /></div>
          <div className="stat-value">{stats?.totalWorkouts || 0}</div>
          <div className="stat-label">{t.totalWorkoutsAdmin}</div>
        </div>
        <div className="stat-card calories">
          <div className="stat-icon"><AIc type="calendar" size={20} /></div>
          <div className="stat-value">{stats?.workoutsThisWeek || 0}</div>
          <div className="stat-label">{t.workoutsThisWeekAdmin}</div>
        </div>
        <div className="stat-card protein">
          <div className="stat-icon"><AIc type="salad" size={20} /></div>
          <div className="stat-value">{stats?.totalMeals || 0}</div>
          <div className="stat-label">{t.totalMealsAdmin}</div>
        </div>
      </div>

      {/* User List */}
      <div className="card">
        <div className="card-header">
          <h3>{t.userList}</h3>
          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            {users.length} {t.totalUsers}
          </span>
        </div>
        <div className="meal-log">
          {users.map((u) => (
            <div
              key={u._id}
              className="meal-item"
              style={{
                flexDirection: 'column',
                alignItems: 'stretch',
                gap: '8px',
                padding: '14px 16px',
              }}
            >
              {/* Row 1: Email + badges */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>
                    {u.email}
                  </span>
                  {u.isAdmin && (
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: 'rgba(108, 92, 231, 0.15)',
                      color: 'var(--primary-light)',
                      fontWeight: 600,
                    }}>
                      {t.admin}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {t.joinDate}: {new Date(u.createdAt).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US')}
                </span>
              </div>

              {/* Row 2: Profile info */}
              {u.profile && u.onboardingComplete ? (
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  flexWrap: 'wrap',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                }}>
                  <span style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <AIc type="person" size={13} /> {u.profile.age} {lang === 'he' ? 'שנים' : 'y/o'}
                  </span>
                  <span>{u.profile.weight} {t.kg} | {u.profile.height} {lang === 'he' ? 'ס"מ' : 'cm'}</span>
                  <span style={{
                    padding: '1px 8px',
                    borderRadius: '8px',
                    background: 'rgba(0, 206, 201, 0.1)',
                    color: 'var(--accent)',
                  }}>
                    {goals[u.profile.goal] || u.profile.goal}
                  </span>
                  <span>{u.profile.workoutsPerWeek}x/{lang === 'he' ? 'שבוע' : 'week'}</span>
                </div>
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  {lang === 'he' ? 'לא השלים הרשמה' : 'Onboarding incomplete'}
                </span>
              )}

              {/* Row 3: Activity stats */}
              <div style={{
                display: 'flex',
                gap: '16px',
                fontSize: '12px',
              }}>
                <span>
                  <span style={{ color: 'var(--warning)', display: 'inline-flex', alignItems: 'center', gap: 3 }}><AIc type="dumbbell" size={13} color="var(--warning)" /> {u.workouts}</span> {lang === 'he' ? 'אימונים' : 'workouts'}
                </span>
                <span>
                  <span style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 3 }}><AIc type="salad" size={13} color="var(--accent)" /> {u.meals}</span> {lang === 'he' ? 'ארוחות' : 'meals'}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {t.lastWorkoutDate}: {u.lastWorkout
                    ? new Date(u.lastWorkout).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US')
                    : t.noWorkoutsYet}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
