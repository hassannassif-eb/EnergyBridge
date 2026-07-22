import SectionHost from '../engine/SectionHost.jsx';

/** Internal (Fake IP) Subnets — internal subnet table and management. */
export default function FakeIpSubnet({ subnet }) {
  return <SectionHost page="internal" param={subnet} />;
}
