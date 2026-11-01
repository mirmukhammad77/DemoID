import type { Profile } from '../../shared/api/client';
export function ProfileDetails({ profile }: { profile: Profile }) {
  return <dl className="profile">{Object.entries({ ID: profile.id, Email: profile.email, 'First name': profile.firstName, 'Last name': profile.lastName, 'Birth date': profile.birthDate }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}
