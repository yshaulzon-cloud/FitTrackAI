import { useState, useEffect } from 'react';
import { useLang } from '../context/LanguageContext';

const goalLabels = { bulk: 'עלייה במסה', cut: 'חיטוב', maintain: 'שמירה', recomp: 'Recomp' };
const goalLabelsEn = { bulk: 'Bulk', cut: 'Cut', maintain: 'Maintain', recomp: 'Recomp' };

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
        <h1>{t.adminDashboard} 🛡️</h1>
        <p>{t.totalUsers}: {stats?.totalUsers || 0}</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card calories">
          <div className="stat-icon">👥</div>
          <div className="stat-value">{stats?.totalUsers || 0}</div>
          <div className="stat-label">{t.totalUsers}</div>
        </div>
        <div className="stat-card protein">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{stats?.activeUsers || 0}</div>
          <div className="stat-label">{t.activeUsersLabel}</div>
        </div>
        <div className="stat-card streak">
          <div className="stat-icon">🆕</div>
          <div className="stat-value">{stats?.newUsersThisWeek || 0}</div>
          <div className="stat-label">{t.newThisWeek}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏋️</div>
          <div className="stat-value">{stats?.totalWorkouts || 0}</div>
          <div className="stat-label">{t.totalWorkoutsAdmin}</div>
        </div>
        <div className="stat-card calories">
          <div className="stat-icon">📅</div>
          <div className="stat-value">{stats?.workoutsThisWeek || 0}</div>
          <div className="stat-label">{t.workoutsThisWeekAdmin}</div>
        </div>
        <div className="stat-card protein">
          <div className="stat-icon">🍽️</div>
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
                  <span style={{ color: 'var(--accent)' }}>
                    {u.profile.gender === 'male' ? '👨' : '👩'} {u.profile.age} {lang === 'he' ? 'שנים' : 'y/o'}
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
                  <span style={{ color: 'var(--warning)' }}>🏋️ {u.workouts}</span> {lang === 'he' ? 'אימונים' : 'workouts'}
                </span>
                <span>
                  <span style={{ color: 'var(--accent)' }}>🍽️ {u.meals}</span> {lang === 'he' ? 'ארוחות' : 'meals'}
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
