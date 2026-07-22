import SectionHost from '../engine/SectionHost.jsx';

/** Real IP Subnets — one /24 subnet table (block grouping, assign, filters). */
export default function RealIpSubnet({ subnet }) {
  return <SectionHost page="subnet" param={subnet} />;
}
