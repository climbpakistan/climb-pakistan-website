import { useMemo, useState } from 'react';
import { useData } from 'vike-react/useData';
import AthleteCard from '../../src/components/AthleteCard';
import { AnimatedSection, StaggeredGrid } from '../../src/hooks/animations';
import Seo from '../../src/components/Seo';

export { Page };

const GENDER_FILTERS = ['All Genders', 'Male', 'Female'];
const DISCIPLINE_FILTERS = ['All Disciplines', 'Speed Climbing', 'Lead Climbing', 'Boulder'];

function Page() {
  const { athletes } = useData();
  const [gender, setGender] = useState('All Genders');
  const [discipline, setDiscipline] = useState('All Disciplines');

  const filtered = useMemo(() => {
    if (!athletes) return [];
    return athletes
      .filter((a) => {
        const genderMatch = gender === 'All Genders' || a.gender === gender;
        const disciplineMatch = discipline === 'All Disciplines' || a.disciplines?.includes(discipline);
        return genderMatch && disciplineMatch;
      })
      .sort((a, b) => a.rank - b.rank);
  }, [athletes, gender, discipline]);

  return (
    <>
      <Seo
        title="Athlete Profiles"
        description="The climbers representing Pakistan across speed, lead and boulder — their stats, achievements and stories."
        keywords="Pakistani sport climbers, Pakistan climbing athletes, sport climbing athletes Pakistan, Pakistan climbing champions, speed climbing Pakistan, lead climbing Pakistan, bouldering Pakistan, Pakistani speed climbers, Pakistan climbing team, best climbers Pakistan, national champions Pakistan climbing"
        path="/athletes"
      />

      <section className="page-header">
        <div className="container">
          <div className="hero-entrance">
            <h1 className="page-title">Athlete Profiles</h1>
            <p className="page-sub">
              The climbers representing Pakistan across speed, lead and boulder — their stats, achievements and stories.
            </p>
          </div>
        </div>
      </section>

      <AnimatedSection className="section-tight">
        <div className="container">
          <div className="filter-bar" role="tablist" aria-label="Filter athletes by gender">
            {GENDER_FILTERS.map((g) => (
              <button
                key={g}
                className={`filter-chip${gender === g ? ' is-active' : ''}`}
                role="tab"
                aria-selected={gender === g}
                onClick={() => setGender(g)}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="filter-bar" role="tablist" aria-label="Filter athletes by discipline" style={{ marginTop: 0 }}>
            {DISCIPLINE_FILTERS.map((d) => (
              <button
                key={d}
                className={`filter-chip${discipline === d ? ' is-active' : ''}`}
                role="tab"
                aria-selected={discipline === d}
                onClick={() => setDiscipline(d)}
              >
                {d}
              </button>
            ))}
          </div>

          <StaggeredGrid className="athlete-grid" baseDelay={0.04} stepDelay={0.07}>
            {filtered.length === 0 && (
              <p style={{ color: 'var(--cp-text-muted)', padding: 'var(--sp-8)', textAlign: 'center', gridColumn: '1 / -1' }}>
                No athletes match those filters.
              </p>
            )}
            {filtered.map((athlete) => (
              <AthleteCard athlete={athlete} key={athlete.slug} />
            ))}
          </StaggeredGrid>
        </div>
      </AnimatedSection>
    </>
  );
}
