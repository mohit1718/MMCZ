import BUYERS from '../data/buyers.json';
import GROUPS from '../data/personaGroups.json';
import PERSONAS from '../data/personas.json';
import PRODUCERS from '../data/producers.json';
import ROUTES from '../data/routes.json';

export const routeLabel = (r) => ROUTES[r].nodes.join(' → ');

export const groupOf = (role) =>
  GROUPS.find((g) => g.roles.includes(role)) || {
    k: 'admin',
    label: 'Administration',
    icon: 'gear',
    roles: ['admin'],
  };

export const orgName = (s) => {
  const P = PERSONAS[s.persona];
  if (s.persona === 'customer') return BUYERS[s.org].name;
  if (P.ext) return PRODUCERS[s.org].name;
  return P.org;
};

export const userOf = (s) => {
  const P = PERSONAS[s.persona];
  if (s.persona === 'producer' && s.org !== 'PRD-0031') return PRODUCERS[s.org].contact;
  if (s.persona === 'checker' && s.org !== 'PRD-0031') return PRODUCERS[s.org].checker;
  return P.user;
};
